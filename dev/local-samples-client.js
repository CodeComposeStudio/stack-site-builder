// Browser IIFE for the dev-only /local-samples run page (__run-ui). Read
// verbatim by dev/local-samples.mjs and injected into that page, so it must
// avoid template literals and ${...} (it lives inside a template literal there).
(function () {
  var dataEl = document.getElementById('run-data');
  if (!dataEl) return;
  var data = JSON.parse(dataEl.textContent);
  var fields = document.getElementById('env-fields');
  var taskEl = document.getElementById('task');
  var cmdEl = document.getElementById('cmd-preview');
  var logEl = document.getElementById('run-log');
  var statusEl = document.getElementById('run-status');
  var recipeEl = document.getElementById('recipe');
  var recipeDescEl = document.getElementById('recipe-desc');
  var panels = document.querySelectorAll('[data-panel]');
  var stepEls = document.querySelectorAll('[data-step]');

  function recipeById(id) {
    for (var i = 0; i < data.recipes.length; i++) if (data.recipes[i].id === id) return data.recipes[i];
    return data.recipes[0];
  }
  var recipe = recipeEl.value; // server pre-selects from ?recipe

  // Per-sample persistence so a refresh keeps the step, log, and the job id
  // (for live reconnect). The URL recipe is authoritative: if the saved run was
  // for a different recipe, start fresh.
  var KEY = 'aas-run:' + data.folder;
  var state;
  try {
    state = JSON.parse(sessionStorage.getItem(KEY) || 'null');
  } catch (e) {}
  if (!state || state.recipe !== recipe) state = { recipe: recipe, step: 1, task: '', log: '', status: '', job: '' };
  var lastSave = 0;
  function persist(force) {
    var now = Date.now();
    if (!force && now - lastSave < 400) return;
    lastSave = now;
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function syncRecipeDesc() {
    recipeDescEl.textContent = recipeById(recipe).desc || '';
  }

  // Step 1 — env form from the .env.sample schema, prefilled from the current
  // .env values; secret fields render masked with a show/hide toggle.
  data.env.forEach(function (f) {
    var wrap = document.createElement('div');
    wrap.className = 'field';
    var lab = document.createElement('label');
    lab.textContent = f.key;
    wrap.appendChild(lab);
    if (f.comment) {
      var hint = document.createElement('p');
      hint.className = 'hint';
      hint.textContent = f.comment;
      wrap.appendChild(hint);
    }
    var row = document.createElement('div');
    row.className = 'inrow';
    var inp = document.createElement('input');
    inp.name = f.key;
    inp.autocomplete = 'off';
    inp.spellcheck = false;
    var cur = data.values[f.key];
    inp.value = (cur != null ? cur : f.value) || '';
    inp.type = f.secret ? 'password' : 'text';
    row.appendChild(inp);
    if (f.secret) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'reveal';
      btn.textContent = 'show';
      btn.onclick = function () {
        var masked = inp.type === 'password';
        inp.type = masked ? 'text' : 'password';
        btn.textContent = masked ? 'hide' : 'show';
      };
      row.appendChild(btn);
    }
    wrap.appendChild(row);
    fields.appendChild(wrap);
  });

  // Step 2 — command preview, live as the task is edited, reflecting the recipe.
  function buildCmd(task) {
    // Escape inner quotes so the preview matches what actually runs (shellish).
    var q = task ? ' "' + task.replace(/"/g, '\\"') + '"' : '';
    if (recipe !== '__default') {
      return 'bash run/' + recipe + '.sh' + q;
    }
    var build = 'docker build -t ' + data.image + ' .';
    // Always detached + logs (a foreground run loses its output under this
    // repo's nested Docker); DooD samples also mount the host socket.
    var sock = data.dood ? ' -v /var/run/docker.sock:/var/run/docker.sock' : '';
    return build + '\ndocker logs -f "$(docker run -d --env-file .env' + sock + ' ' + data.image + q + ')"';
  }
  function autoGrow() {
    taskEl.style.height = 'auto';
    taskEl.style.height = taskEl.scrollHeight + 'px';
  }
  function refreshCmd() {
    cmdEl.textContent = buildCmd(taskEl.value.trim());
  }
  taskEl.addEventListener('input', function () {
    autoGrow();
    refreshCmd();
    state.task = taskEl.value;
    persist();
  });

  function showStep(n) {
    for (var i = 0; i < panels.length; i++) {
      panels[i].hidden = panels[i].getAttribute('data-panel') !== String(n);
    }
    for (var j = 0; j < stepEls.length; j++) {
      stepEls[j].className = Number(stepEls[j].getAttribute('data-step')) <= n ? 'active' : '';
    }
    // The recipe is a pre-flow choice: lock it once you leave step 1 (the
    // command + run depend on it). Going back to step 1 re-enables it.
    recipeEl.disabled = n !== 1;
    if (n === 2) autoGrow(); // measurable only once the panel is visible
    state.step = n;
    persist(true);
  }

  async function saveEnv(btn) {
    var values = {};
    var inputs = fields.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) values[inputs[i].name] = inputs[i].value;
    btn.disabled = true;
    try {
      var r = await fetch('__env', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (r.ok) showStep(2);
      else alert('저장에 실패했습니다.');
    } finally {
      btn.disabled = false;
    }
  }

  var running = false;
  var sleep = function (ms) {
    return new Promise(function (r) {
      setTimeout(r, ms);
    });
  };
  // Poll a job's output with an offset until it's done. Short requests survive a
  // flaky proxy / port forward far better than one long-open stream, and this is
  // the same path for a fresh run and a reconnect after refresh.
  async function poll(jobId) {
    var startedAt = state.startedAt || Date.now();
    logEl.textContent = '';
    statusEl.className = 'run-status busy';
    statusEl.textContent = '● 실행 중… 0s';
    var timer = setInterval(function () {
      statusEl.textContent = '● 실행 중… ' + Math.round((Date.now() - startedAt) / 1000) + 's';
    }, 1000);
    var have = 0;
    try {
      for (;;) {
        var resp = await fetch('__run-log?job=' + encodeURIComponent(jobId) + '&from=' + have);
        if (resp.status === 404) {
          clearInterval(timer);
          logEl.textContent = state.log || '(실행 기록을 가져올 수 없습니다)';
          statusEl.className = 'run-status';
          statusEl.textContent = '만료됨 — [다시 실행]으로 재실행하세요';
          state.status = 'done';
          state.job = '';
          persist(true);
          running = false;
          return;
        }
        var d = await resp.json();
        if (d.text) {
          logEl.textContent += d.text;
          logEl.scrollTop = logEl.scrollHeight;
          state.log = logEl.textContent;
          persist();
        }
        have = d.len;
        if (d.done) break;
        await sleep(600);
      }
    } catch (e) {
      logEl.textContent += '\n[client error] ' + e.message;
    }
    clearInterval(timer);
    var secs = Math.round((Date.now() - startedAt) / 1000);
    statusEl.className = 'run-status';
    statusEl.textContent = '완료 · ' + secs + 's';
    state.status = 'done';
    state.elapsed = secs;
    state.log = logEl.textContent;
    persist(true);
    running = false;
  }

  async function run() {
    if (running) return;
    running = true;
    showStep(3);
    state.status = 'running';
    state.startedAt = Date.now();
    state.log = '';
    state.job = '';
    persist(true);
    try {
      var resp = await fetch('__run', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ task: taskEl.value.trim(), recipe: recipe }),
      });
      var d = await resp.json();
      state.job = d.job;
      persist(true);
      await poll(d.job);
      return;
    } catch (e) {
      logEl.textContent += '\n[client error] ' + e.message;
    }
    running = false;
  }

  // Render the current step from state (restores after a refresh). A run that
  // was still going resumes by polling its job (replays from offset 0).
  function renderFromState() {
    if (state.step === 3) {
      if (state.status === 'running' && state.job) {
        running = true;
        showStep(3);
        poll(state.job);
        return;
      }
      logEl.textContent = state.log || '';
      statusEl.className = 'run-status';
      statusEl.textContent =
        state.status === 'done'
          ? '완료 (지난 실행 기록)' + (state.elapsed != null ? ' · ' + state.elapsed + 's' : '')
          : '';
      showStep(3);
      logEl.scrollTop = logEl.scrollHeight;
    } else {
      showStep(state.step || 1);
    }
  }

  // Switching recipe (only possible on step 1): reflect it in the URL
  // (refresh-safe), start that recipe fresh, and keep the typed task.
  recipeEl.addEventListener('change', function () {
    recipe = recipeEl.value;
    var u = new URL(location.href);
    u.searchParams.set('recipe', recipe);
    history.replaceState(null, '', u);
    state = { recipe: recipe, step: 1, task: taskEl.value, log: '', status: '', job: '' };
    persist(true);
    syncRecipeDesc();
    refreshCmd();
    showStep(1);
  });

  var nexts = document.querySelectorAll('[data-next]');
  for (var n1 = 0; n1 < nexts.length; n1++)
    nexts[n1].onclick = function (ev) {
      saveEnv(ev.currentTarget);
    };
  var backs1 = document.querySelectorAll('[data-back1]');
  for (var b1 = 0; b1 < backs1.length; b1++) backs1[b1].onclick = function () { showStep(1); };
  var backs2 = document.querySelectorAll('[data-back2]');
  for (var b2 = 0; b2 < backs2.length; b2++) backs2[b2].onclick = function () { showStep(2); };
  var runs = document.querySelectorAll('[data-run]');
  for (var r2 = 0; r2 < runs.length; r2++) runs[r2].onclick = run;

  // Init.
  syncRecipeDesc();
  taskEl.value = state.task || (data.defaultTask || '');
  refreshCmd();
  renderFromState();
})();
