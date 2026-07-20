// @ts-check
// Dev-only Vite middleware. Serves samples/<folder>/ at /local-samples/ so the
// project viewer can offer a "view locally" link (the GitHub link only works
// once the branch is pushed). Directories render as a styled listing; files as
// Shiki-highlighted pages (?raw for plain text). A runnable sample folder also
// gets a "run" wizard: edit .env, set the task, then docker build + run with
// the output streamed back. Never active in `astro build` output.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const CLIENT_JS = readFileSync(new URL('./local-samples-client.js', import.meta.url), 'utf8');

// Shared page chrome (theme tokens + breadcrumb), reused by every rendered page.
const BASE_CSS = `
  :root { --bg:#f8f8f7; --panel:#fff; --border:#e4e4e2; --text:#1c1c1a; --muted:#78786f; --tint:#f0f0ee; --accent:#5b57e0; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#121212; --panel:#1c1c1c; --border:#2e2e2e; --text:#edede8; --muted:#9a9a90; --tint:#242424; --accent:#8f8bf5; }
  }
  * { box-sizing: border-box; margin: 0 }
  body { background: var(--bg); color: var(--text); min-height: 100vh; padding: 3rem 1.25rem;
         font-family: ui-sans-serif, system-ui, sans-serif; }
  main { max-width: 40rem; margin: 0 auto }
  .crumbs { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .95rem;
            color: var(--muted); display: flex; flex-wrap: wrap; gap: .4rem; align-items: center }
  .crumbs a { color: var(--muted); text-decoration: none }
  .crumbs a:hover { color: var(--text); text-decoration: underline }
  .crumbs b { color: var(--text) }
  .badge { font-size: .7rem; letter-spacing: .05em; text-transform: uppercase; color: var(--muted);
           border: 1px dashed var(--border); border-radius: .4rem; padding: .15rem .5rem }
  .spacer { margin-left: auto }
  .runbtn { display: inline-block; font: inherit; font-size: .85rem; cursor: pointer; color: #fff;
            background: var(--accent); border: 0; border-radius: .5rem; padding: .45rem .85rem; text-decoration: none }
  .runbtn:hover { filter: brightness(1.08) }`;

// The run wizard, rendered as a full page (own URL) rather than a modal.
const WIZARD_CSS = `
  .runbar { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap }
  .runbar-lbl { font-size: .8rem; color: var(--muted) }
  .runbar select { font: inherit; font-size: .85rem; padding: .4rem .6rem; border: 1px solid var(--border);
                   border-radius: .5rem; background: var(--panel); color: var(--text) }
  .runbar select:disabled { opacity: .55; cursor: default }
  .recipe-desc { margin-top: .45rem; font-size: .8rem; color: var(--muted) }
  .wizard { margin-top: 1.1rem; border: 1px solid var(--border); border-radius: .9rem; padding: 1.25rem; background: var(--panel) }
  .stepper { display: flex; gap: .5rem; font-size: .78rem; color: var(--muted); margin-bottom: 1rem; flex-wrap: wrap }
  .stepper span { border: 1px solid var(--border); border-radius: 999px; padding: .2rem .7rem }
  .stepper span.active { color: #fff; background: var(--accent); border-color: var(--accent) }
  .desc, .lbl { font-size: .85rem; color: var(--muted) }
  .lbl { display: block; margin: .85rem 0 .35rem }
  .field { margin-top: .8rem }
  .field label { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .82rem; font-weight: 600 }
  .field .hint { font-size: .74rem; color: var(--muted); white-space: pre-line; margin-top: .15rem }
  .inrow { display: flex; gap: .4rem; margin-top: .3rem }
  .inrow input { flex: 1; min-width: 0; font: inherit; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
                 font-size: .85rem; padding: .45rem .6rem; border: 1px solid var(--border); border-radius: .45rem;
                 background: var(--bg); color: var(--text) }
  .reveal { font: inherit; font-size: .72rem; cursor: pointer; color: var(--muted); background: var(--tint);
            border: 1px solid var(--border); border-radius: .45rem; padding: 0 .6rem }
  #task { width: 100%; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .85rem;
          line-height: 1.5; padding: .5rem .6rem; border: 1px solid var(--border); border-radius: .45rem;
          background: var(--bg); color: var(--text); resize: none; overflow: hidden; min-height: 2.6rem }
  .run-status { font-size: .8rem; margin-bottom: .5rem; min-height: 1.15em; color: var(--muted) }
  .run-status.busy { color: var(--accent); animation: aas-pulse 1.1s ease-in-out infinite }
  @keyframes aas-pulse { 0%, 100% { opacity: 1 } 50% { opacity: .4 } }
  .cmd { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .8rem; line-height: 1.5;
         background: var(--tint); border: 1px solid var(--border); border-radius: .5rem; padding: .7rem .8rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all }
  .terminal { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .8rem; line-height: 1.5;
              background: #0d1117; color: #d1d5da; border-radius: .5rem; padding: .9rem 1rem; min-height: 16rem; max-height: 55vh; overflow: auto; white-space: pre-wrap; word-break: break-word }
  .actions { display: flex; gap: .5rem; justify-content: flex-end; margin-top: 1.1rem }
  .actions .primary { font: inherit; font-size: .85rem; cursor: pointer; color: #fff; background: var(--accent); border: 0; border-radius: .5rem; padding: .45rem .9rem }
  .actions .ghost { font: inherit; font-size: .85rem; cursor: pointer; color: var(--text); background: transparent; border: 1px solid var(--border); border-radius: .5rem; padding: .45rem .9rem }
  .actions button:disabled { opacity: .5; cursor: default }`;

const FILE_ICON =
  '<svg viewBox="0 0 24 24"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>';
const DIR_ICON =
  '<svg viewBox="0 0 24 24"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';

export function localSamples() {
  const root = resolve('samples');

  /** @param {string} name */
  const hidden = (name) =>
    name === '.env' || name === '__pycache__' || name === '.venv' || name.endsWith('.pyc');

  /** @type {Promise<import('shiki').Highlighter> | null} */
  let hlPromise = null;
  const getHighlighter = async () => {
    const { createHighlighter } = await import('shiki');
    if (!hlPromise)
      hlPromise = createHighlighter({
        themes: ['github-dark'],
        langs: ['python', 'typescript', 'javascript', 'bash', 'docker', 'markdown', 'json', 'yaml', 'toml'],
      });
    return hlPromise;
  };
  /** @param {string} name */
  const langFor = (name) => {
    if (name === 'Dockerfile' || name.endsWith('.dockerfile')) return 'docker';
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    return (
      { py: 'python', ts: 'typescript', js: 'javascript', md: 'markdown', yml: 'yaml', yaml: 'yaml', json: 'json', toml: 'toml', sh: 'bash', bash: 'bash', env: 'bash', sample: 'bash', gitignore: 'bash', txt: 'text' }[ext] ?? 'text'
    );
  };

  // Run recipes offered for a sample: the built-in "default" (docker build +
  // run) when there's a Dockerfile, plus one per run/<id>.sh — each script
  // declaring its own display name/description via `# @name` / `# @desc` header
  // comments. A script recipe can do anything (compose, multi-step, …).
  /** @param {string} dir */
  const listRecipes = (dir) => {
    /** @type {{id:string,name:string,desc:string}[]} */
    const recipes = [];
    if (existsSync(join(dir, 'Dockerfile')))
      recipes.push({ id: '__default', name: '기본 · docker build + run', desc: 'Dockerfile을 빌드해 detached로 실행하고 로그를 따라갑니다.' });
    const runDir = join(dir, 'run');
    if (existsSync(runDir) && statSync(runDir).isDirectory()) {
      for (const f of readdirSync(runDir).filter((n) => n.endsWith('.sh')).sort()) {
        const src = readFileSync(join(runDir, f), 'utf8');
        const id = f.replace(/\.sh$/, '');
        recipes.push({
          id,
          name: (src.match(/^#\s*@name\s+(.+)$/m)?.[1] ?? id).trim(),
          desc: (src.match(/^#\s*@desc\s+(.+)$/m)?.[1] ?? '').trim(),
        });
      }
    }
    return recipes;
  };
  // A runnable sample offers at least one recipe.
  /** @param {string} dir */
  const runnable = (dir) => listRecipes(dir).length > 0;
  // Docker-out-of-Docker samples mount the host socket (the agent spawns sibling
  // containers); detected from their own committed files, not hard-coded.
  /** @param {string} dir */
  const isDooD = (dir) =>
    ['Dockerfile', 'README.md'].some(
      (f) => existsSync(join(dir, f)) && readFileSync(join(dir, f), 'utf8').includes('docker.sock'),
    );
  // A valid Docker image tag: lowercase, alphanumerics separated by single '-'
  // (collapse any other run and trim edges, so odd folder names can't produce
  // an invalid reference like a component starting with '_').
  /** @param {string} folder */
  const imageName = (folder) =>
    ('aas-sample-' + folder).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  // The .env.sample as an editable schema: one entry per KEY=value line, with
  // the preceding comment block as a hint and secret keys flagged for masking.
  /** @param {string} dir */
  const parseEnvSample = (dir) => {
    const p = join(dir, '.env.sample');
    if (!existsSync(p)) return [];
    /** @type {{key:string,value:string,comment:string,secret:boolean}[]} */
    const out = [];
    let comment = [];
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (t.startsWith('#')) {
        comment.push(t.replace(/^#\s?/, ''));
        continue;
      }
      const eq = t.indexOf('=');
      if (!t || eq === -1) {
        comment = [];
        continue;
      }
      const key = t.slice(0, eq).trim();
      out.push({
        key,
        value: t.slice(eq + 1).trim(),
        comment: comment.join('\n'),
        secret: /(_KEY|TOKEN|SECRET|PASSWORD)$/i.test(key),
      });
      comment = [];
    }
    return out;
  };
  // Current .env values (for prefilling the form). {} when there's no .env yet.
  /** @param {string} dir */
  const readEnv = (dir) => {
    const p = join(dir, '.env');
    /** @type {Record<string,string>} */
    const out = {};
    if (!existsSync(p)) return out;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      const eq = t.indexOf('=');
      if (!t || t.startsWith('#') || eq === -1) continue;
      out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
    }
    return out;
  };
  // Write .env by filling the .env.sample template with submitted values, so the
  // sample's comments and structure carry over.
  /** @param {string} dir @param {Record<string,string>} values */
  const writeEnv = (dir, values) => {
    const sample = join(dir, '.env.sample');
    const src = existsSync(sample)
      ? readFileSync(sample, 'utf8')
      : Object.keys(values).map((k) => k + '=').join('\n');
    const out = src
      .split('\n')
      .map((line) => {
        const t = line.trim();
        const eq = t.indexOf('=');
        if (!t || t.startsWith('#') || eq === -1) return line;
        const key = t.slice(0, eq).trim();
        return key in values ? key + '=' + (values[key] ?? '') : line;
      })
      .join('\n');
    writeFileSync(join(dir, '.env'), out);
  };
  // The example task from the README's `docker run … <image> "<task>"` line.
  /** @param {string} dir */
  const defaultTask = (dir) => {
    const p = join(dir, 'README.md');
    if (!existsSync(p)) return '';
    const m = readFileSync(p, 'utf8').match(/aas-[a-z0-9-]+\s*\\?\s*"([^"]+)"/);
    return m ? m[1] : '';
  };

  /** @param {any} req */
  const readBody = (req) =>
    new Promise((res) => {
      let d = '';
      req.on('data', (/** @type {any} */ c) => (d += c));
      req.on('end', () => res(d));
    });

  // Stream one child process's command line + output to the response.
  // The task/args are passed to spawn as an argv array (no shell), so the
  // command line we echo is display-only. Quote args with spaces so the echoed
  // line matches the preview and is copy-paste-safe into a shell.
  /** @param {string} a */
  const shellish = (a) => (a === '' || /[\s"]/.test(a) ? '"' + a.replace(/"/g, '\\"') + '"' : a);
  // A run job: the process output accumulates in a buffer that outlives any
  // single HTTP request. The client polls __run-log?job=<id>&from=<offset> for
  // new output — the child keeps running regardless of who's polling, so a page
  // refresh just resumes polling.
  /** @type {Map<string, { id:string, buffer:string, done:boolean, write:(d:any)=>void, finish:()=>void }>} */
  const jobs = new Map();
  const createJob = () => {
    const id = randomUUID().slice(0, 12);
    const job = {
      id,
      buffer: '',
      done: false,
      /** @param {any} d */
      write(d) {
        job.buffer += typeof d === 'string' ? d : d.toString();
      },
      finish() {
        job.done = true;
        // Keep the finished job around briefly so a client coming back can still
        // fetch the full log, then evict.
        setTimeout(() => {
          if (jobs.get(id) === job) jobs.delete(id);
        }, 5 * 60 * 1000);
      },
    };
    jobs.set(id, job);
    return job;
  };

  /** @param {{write:(d:any)=>void}} sink @param {string} cmd @param {string[]} args @param {{cwd?:string}} [opts] */
  const runStep = (sink, cmd, args, opts = {}) =>
    new Promise((resolve) => {
      sink.write('$ ' + cmd + ' ' + args.map(shellish).join(' ') + '\n');
      let child;
      try {
        child = spawn(cmd, args, opts);
      } catch (e) {
        sink.write('[spawn error] ' + (/** @type {Error} */ (e)).message + '\n');
        return resolve(1);
      }
      child.stdout.on('data', (d) => sink.write(d));
      child.stderr.on('data', (d) => sink.write(d));
      child.on('error', (e) => {
        sink.write('\n[error] ' + e.message + '\n');
        resolve(1);
      });
      child.on('close', (code) => {
        sink.write('\n[exit ' + code + ']\n\n');
        resolve(code);
      });
    });

  // Detached run: under nested Docker-outside-of-Docker (this repo's
  // devcontainer) a foreground `docker run` often prints nothing and still
  // exits 0 — the attach stream drops the output at the VM boundary. So, as the
  // sample READMEs prescribe, run every sample detached, follow `docker logs
  // -f`, then remove the container. `--rm` is dropped so the log survives to be
  // read. DooD samples additionally mount the host Docker socket so the agent
  // can spawn sibling containers.
  /** @param {{write:(d:any)=>void}} sink @param {string} image @param {string} envPath @param {string} task @param {boolean} mountSock */
  const runDetached = (sink, image, envPath, task, mountSock) =>
    new Promise((resolve) => {
      const args = ['run', '-d', '--env-file', envPath];
      if (mountSock) args.push('-v', '/var/run/docker.sock:/var/run/docker.sock');
      args.push(image);
      if (task) args.push(task);
      sink.write('$ ' + ['docker', ...args].map(shellish).join(' ') + '\n');
      let id = '';
      const run = spawn('docker', args);
      run.stdout.on('data', (d) => (id += d.toString()));
      run.stderr.on('data', (d) => sink.write(d));
      run.on('error', (e) => {
        sink.write('\n[error] ' + e.message + '\n');
        resolve(1);
      });
      run.on('close', (code) => {
        id = id.trim();
        if (code !== 0 || !id) {
          sink.write('\n[exit ' + code + ']\n\n');
          return resolve(code || 1);
        }
        sink.write('컨테이너 ' + id.slice(0, 12) + ' — 로그를 따라갑니다\n\n');
        runStep(sink, 'docker', ['logs', '-f', id]).then((lc) => {
          const rm = spawn('docker', ['rm', '-f', id]);
          rm.on('close', () => resolve(lc));
          rm.on('error', () => resolve(lc));
        });
      });
    });

  /** @param {number} n */
  const fmtSize = (n) =>
    n < 1024 ? n + ' B' : n < 1024 * 1024 ? (n / 1024).toFixed(1) + ' KB' : (n / 1024 / 1024).toFixed(1) + ' MB';

  return {
    name: 'aas-local-samples',
    apply: /** @type {const} */ ('serve'),
    /** @param {any} server */
    configureServer(server) {
      server.middlewares.use(async (/** @type {any} */ req, /** @type {any} */ res, /** @type {any} */ next) => {
        const m = (req.url || '').match(/\/local-samples\/(.*)$/);
        if (!m) return next();
        const rel = decodeURIComponent(m[1].split('?')[0]);

        // Dedicated run page: /local-samples/<folder>/__run-ui (own URL, so a
        // refresh naturally reloads the wizard and it can open in a new tab).
        const uiMatch = rel.match(/^(.+)\/__run-ui$/);
        if (uiMatch) {
          const dir = resolve(root, uiMatch[1]);
          if (
            (dir !== root && !dir.startsWith(root + sep)) ||
            !existsSync(dir) ||
            !statSync(dir).isDirectory() ||
            !runnable(dir)
          ) {
            res.statusCode = 404;
            return res.end('not found');
          }
          const folder = uiMatch[1].split('/').pop() || uiMatch[1];
          const uiParts = uiMatch[1].split('/').filter(Boolean);
          const recipes = listRecipes(dir);
          const params = new URLSearchParams((req.url || '').split('?')[1] || '');
          const wantRecipe = params.get('recipe');
          const selected = recipes.some((r) => r.id === wantRecipe) ? wantRecipe : recipes[0].id;
          const runData = {
            folder,
            image: imageName(folder),
            dood: isDooD(dir),
            defaultTask: defaultTask(dir),
            env: parseEnvSample(dir),
            values: readEnv(dir),
            recipes,
          };
          const dataJson = JSON.stringify(runData).replace(/</g, '\\u003c');
          const esc = (/** @type {string} */ s) =>
            s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
          const options = recipes
            .map((r) => `<option value="${esc(r.id)}"${r.id === selected ? ' selected' : ''}>${esc(r.name)}</option>`)
            .join('');
          const crumbs = [
            `<a href="${'../'.repeat(uiParts.length)}">samples</a>`,
            ...uiParts.map((p, i) => {
              const up = uiParts.length - 1 - i;
              return `<a href="${up === 0 ? './' : '../'.repeat(up)}">${p}</a>`;
            }),
            `<b>실행</b>`,
          ].join('<span>/</span>');
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.end(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>samples/${folder} · 실행</title>
<style>${BASE_CSS}${WIZARD_CSS}
  main { max-width: 48rem }
</style></head><body><main>
<div class="crumbs">${crumbs}<span class="spacer"></span><a href="./">← 목록</a><span class="badge">dev only</span></div>
<div class="runbar"><label class="runbar-lbl">레시피</label><select id="recipe">${options}</select></div>
<p id="recipe-desc" class="recipe-desc"></p>
<div class="wizard">
  <div class="stepper"><span data-step="1" class="active">1 · 환경 변수</span><span data-step="2">2 · 실행 인자</span><span data-step="3">3 · 실행 · 결과</span></div>
  <section data-panel="1"><p class="desc">컨테이너에 넘길 <code>.env</code> 값입니다. 저장하면 <code>samples/${folder}/.env</code> 에 기록됩니다.</p><div id="env-fields"></div><div class="actions"><button data-next class="primary">저장하고 다음</button></div></section>
  <section data-panel="2" hidden><label class="lbl">실행 인자 (task)</label><textarea id="task" rows="2"></textarea><label class="lbl">실행될 명령</label><pre id="cmd-preview" class="cmd"></pre><div class="actions"><button data-back1 class="ghost">이전</button><button data-run class="primary">실행 ▶</button></div></section>
  <section data-panel="3" hidden><div id="run-status" class="run-status"></div><pre id="run-log" class="terminal"></pre><div class="actions"><button data-back2 class="ghost">이전</button><button data-run class="primary">다시 실행</button></div></section>
</div>
<script type="application/json" id="run-data">${dataJson}</script><script>${CLIENT_JS}</script>
</main></body></html>`);
        }

        // Run-wizard endpoints: /local-samples/<folder>/__env|__run (POST).
        const action = rel.match(/^(.+)\/__(env|run)$/);
        if (action) {
          const dir = resolve(root, action[1]);
          if (
            (dir !== root && !dir.startsWith(root + sep)) ||
            !existsSync(dir) ||
            !statSync(dir).isDirectory() ||
            req.method !== 'POST'
          ) {
            res.statusCode = 404;
            return res.end('not found');
          }
          const body = await readBody(req);
          if (action[2] === 'env') {
            try {
              writeEnv(dir, JSON.parse(String(body) || '{}'));
              res.setHeader('Content-Type', 'application/json');
              return res.end('{"ok":true}');
            } catch {
              res.statusCode = 400;
              return res.end('{"ok":false}');
            }
          }
          // __run: start the chosen recipe as a background job and return its id.
          // The client then POLLS __run-log for output. Polling (short requests)
          // survives a flaky proxy / port forward far better than one long-open
          // streaming response, and makes reconnect-after-refresh trivial.
          let task = '';
          let recipe = '__default';
          try {
            const b = JSON.parse(String(body) || '{}');
            task = String(b.task || '');
            recipe = String(b.recipe || '__default');
          } catch {}

          const job = createJob();
          const folder = action[1].split('/').pop() || action[1];
          // Run in the background; the handler returns immediately with the id.
          (async () => {
            try {
              if (recipe !== '__default') {
                // Custom recipe run/<id>.sh, cwd = sample dir so relative paths
                // (.env, compose.yml, …) resolve. Id validated — no traversal.
                if (!/^[a-z0-9_-]+$/i.test(recipe) || !existsSync(join(dir, 'run', recipe + '.sh'))) {
                  job.write('[error] 알 수 없는 레시피: ' + recipe + '\n');
                } else {
                  const args = ['run/' + recipe + '.sh'];
                  if (task) args.push(task);
                  await runStep(job, 'bash', args, { cwd: dir });
                }
              } else if (!existsSync(join(dir, '.env'))) {
                job.write('[error] .env가 없습니다. 먼저 환경 변수를 저장하세요.\n');
              } else {
                const image = imageName(folder);
                const envPath = join(dir, '.env');
                const buildCode = await runStep(job, 'docker', ['build', '-t', image, dir]);
                // Always run detached + `docker logs -f`: a foreground run loses
                // its output under this repo's nested Docker (see runDetached).
                // Only DooD samples also mount the host socket.
                if (buildCode === 0) await runDetached(job, image, envPath, task, isDooD(dir));
              }
            } catch (e) {
              job.write('\n[error] ' + (/** @type {Error} */ (e)).message + '\n');
            }
            job.finish();
          })();

          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('X-Run-Job', job.id);
          return res.end(JSON.stringify({ job: job.id }));
        }

        // Poll a job's output: returns the buffer from ?from=<offset> plus the
        // total length and done flag. Short requests → robust through a proxy.
        const logMatch = rel.match(/^(.+)\/__run-log$/);
        if (logMatch) {
          const params = new URLSearchParams((req.url || '').split('?')[1] || '');
          const id = params.get('job') || '';
          const from = Number.parseInt(params.get('from') || '0', 10) || 0;
          const job = jobs.get(id);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-cache');
          if (!job) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: 'gone' }));
          }
          return res.end(
            JSON.stringify({ text: job.buffer.slice(from), len: job.buffer.length, done: job.done }),
          );
        }

        const target = resolve(root, rel);
        if (target !== root && !target.startsWith(root + sep)) {
          res.statusCode = 403;
          return res.end('forbidden');
        }
        if (rel.split('/').some((part) => part && hidden(part)) || !existsSync(target)) {
          res.statusCode = 404;
          return res.end('not found');
        }

        const parts = rel.split('/').filter(Boolean);

        if (statSync(target).isDirectory()) {
          if (!req.url?.split('?')[0].endsWith('/')) {
            res.statusCode = 301;
            res.setHeader('Location', req.url?.split('?')[0] + '/');
            return res.end();
          }
          const entries = readdirSync(target, { withFileTypes: true })
            .filter((e) => !hidden(e.name))
            .sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name));
          const rows = entries
            .map((e) => {
              const dir = e.isDirectory();
              const href = encodeURIComponent(e.name) + (dir ? '/' : '');
              const size = dir ? '' : fmtSize(statSync(resolve(target, e.name)).size);
              return `<li><a href="${href}">${dir ? DIR_ICON : FILE_ICON}<span class="name">${e.name}${dir ? '/' : ''}</span><span class="size">${size}</span></a></li>`;
            })
            .join('');
          const crumbs = [
            `<a href="${'../'.repeat(parts.length)}">samples</a>`,
            ...parts.map((p, i) =>
              i === parts.length - 1 ? `<b>${p}</b>` : `<a href="${'../'.repeat(parts.length - 1 - i)}">${p}</a>`,
            ),
          ].join('<span>/</span>');

          // A runnable sample folder gets a link to its dedicated run page,
          // opened in a new tab (rel=noopener → fresh sessionStorage, so each
          // run starts clean and doesn't inherit a prior tab's finished state).
          const runLink = runnable(target)
            ? `<div style="margin-top:1rem"><a class="runbtn" href="__run-ui" target="_blank" rel="noopener">▶ 실행 ↗</a></div>`
            : '';

          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.end(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>samples/${rel}</title>
<style>${BASE_CSS}
  ul { list-style: none; margin-top: 1rem; border: 1px solid var(--border); border-radius: .75rem; background: var(--panel); overflow: hidden; padding: .3rem }
  li + li { margin-top: 2px }
  li a { display: flex; align-items: center; gap: .65rem; padding: .55rem .75rem; border-radius: .5rem; color: var(--text); text-decoration: none; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .9rem }
  li a:hover { background: var(--tint) }
  li svg { width: 15px; height: 15px; flex: none; fill: none; stroke: var(--muted); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round }
  .name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }
  .size { margin-left: auto; flex: none; font-size: .75rem; color: var(--muted) }
</style></head><body><main>
<div class="crumbs">${crumbs}<span class="spacer"></span><span class="badge">dev only</span></div>
${runLink}
<ul>${rows}</ul>
</main></body></html>`);
        }

        // File view: ?raw serves the bytes, otherwise a Shiki-highlighted page.
        if ((req.url || '').includes('?raw')) {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.end(readFileSync(target));
        }
        const name = parts[parts.length - 1] ?? rel;
        const hl = await getHighlighter();
        const lang = langFor(name);
        const safeLang = hl.getLoadedLanguages().includes(lang) ? lang : 'text';
        const codeHtml = hl.codeToHtml(readFileSync(target, 'utf8'), { lang: safeLang, theme: 'github-dark' });
        // File URLs have no trailing slash, so hrefs resolve against the parent.
        const up = (/** @type {number} */ n) => (n <= 0 ? './' : '../'.repeat(n));
        const crumbs = [
          `<a href="${up(parts.length - 1)}">samples</a>`,
          ...parts.map((p, i) =>
            i === parts.length - 1 ? `<b>${p}</b>` : `<a href="${up(parts.length - 2 - i)}">${p}</a>`,
          ),
        ].join('<span>/</span>');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end(`<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>samples/${rel}</title>
<style>${BASE_CSS}
  main { max-width: 56rem }
  .panel { margin-top: 1rem; border: 1px solid var(--border); border-radius: .75rem; background: var(--panel); overflow: hidden }
  .head { display: flex; align-items: center; gap: .75rem; padding: .6rem .9rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .8rem; color: var(--muted) }
  .head a { margin-left: auto; color: var(--muted); text-decoration: none; border: 1px solid var(--border); border-radius: .4rem; padding: .1rem .5rem }
  .head a:hover { color: var(--text) }
  pre.shiki { margin: 0; padding: 1rem 1.1rem; overflow-x: auto; font-size: .875rem; line-height: 1.6 }
</style></head><body><main>
<div class="crumbs">${crumbs}<span class="spacer"></span><span class="badge">dev only</span></div>
<div class="panel"><div class="head">${name}<a href="?raw">raw</a></div>${codeHtml}</div>
</main></body></html>`);
      });
    },
  };
}
