/**
 * Browser half of private content: login (PBKDF2 → unwrap the site key),
 * session caching in localStorage, AES-GCM decryption and DOM injection.
 * Crypto parameters must match src/lib/private.ts. Loaded only by PrivateGate.
 */
import { PRIVATE_DECRYPTED_EVENT } from './reinit';

const KDF_ITERATIONS = 600_000;
const STORE = 'aas:pk';

interface GateData {
  iv: string;
  ct: string;
  users: { h: string; s: string; iv: string; w: string }[];
  salt: string; // build salt for id hashing, base64
  days: number; // session lifetime (0 = never expires)
}

const dec = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const enc = (b: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(b)));

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function deriveKek(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: KDF_ITERATIONS },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

async function aesDecrypt(keyBytes: Uint8Array | CryptoKey, iv: Uint8Array, data: Uint8Array): Promise<ArrayBuffer> {
  const key =
    keyBytes instanceof CryptoKey
      ? keyBytes
      : await crypto.subtle.importKey('raw', keyBytes as BufferSource, 'AES-GCM', false, ['decrypt']);
  return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, data as BufferSource);
}

function storedKey(days: number): Uint8Array | null {
  try {
    const raw = localStorage.getItem(STORE);
    if (!raw) return null;
    const { k, t } = JSON.parse(raw) as { k: string; t: number };
    if (days > 0 && Date.now() - t > days * 86_400_000) {
      localStorage.removeItem(STORE);
      return null;
    }
    return dec(k);
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORE);
  } catch {
    /* ignore */
  }
}

/** The user table a login form needs — a GateData without the content. */
export interface AuthData {
  users: { h: string; s: string; iv: string; w: string }[];
  salt: string;
  days: number;
}

/** Whether this device holds a live session key. */
export function hasSession(days: number): boolean {
  return storedKey(days) !== null;
}

/**
 * Verify credentials by unwrapping the site key (AES-GCM authentication
 * fails on a wrong password) and store the session on success. Shared by
 * the per-page gate form and the header login control.
 */
export async function loginWithCredentials(
  data: AuthData,
  id: string,
  password: string,
): Promise<boolean> {
  const salt = dec(data.salt);
  const idBytes = new TextEncoder().encode(id.trim().toLowerCase());
  const joined = new Uint8Array(salt.length + idBytes.length);
  joined.set(salt);
  joined.set(idBytes, salt.length);
  const h = await sha256Hex(joined);
  const user = data.users.find((u) => u.h === h);
  if (!user) return false;
  try {
    const kek = await deriveKek(password, dec(user.s));
    const k = new Uint8Array(await aesDecrypt(kek, dec(user.iv), dec(user.w)));
    try {
      localStorage.setItem(STORE, JSON.stringify({ k: enc(k), t: Date.now() }));
    } catch {
      /* private browsing — session just won't persist */
    }
    return true;
  } catch {
    return false; // wrong password (unwrap failed)
  }
}

/** Swap the gate for the decrypted HTML; re-run inline scripts; notify re-init hooks. */
function inject(gate: HTMLElement, html: string, logoutLabel: string): void {
  const host = document.createElement('div');
  host.innerHTML = html;
  // innerHTML-injected <script> tags don't execute — recreate each one so
  // classic/inline scripts run (hoisted module scripts re-init via the event).
  host.querySelectorAll('script').forEach((old) => {
    const s = document.createElement('script');
    for (const a of old.attributes) s.setAttribute(a.name, a.value);
    s.textContent = old.textContent;
    old.replaceWith(s);
  });
  // A discreet logout control above the content.
  const bar = document.createElement('div');
  bar.className = 'aas-private-bar';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'aas-private-logout';
  btn.textContent = `\u{1F513} ${logoutLabel}`;
  btn.addEventListener('click', () => {
    clearSession();
    location.reload();
  });
  bar.appendChild(btn);
  gate.replaceWith(bar, ...host.childNodes);
  document.dispatchEvent(new CustomEvent(PRIVATE_DECRYPTED_EVENT));
}

async function tryDecrypt(gate: HTMLElement, data: GateData, keyBytes: Uint8Array, logoutLabel: string): Promise<boolean> {
  try {
    const html = new TextDecoder().decode(await aesDecrypt(keyBytes, dec(data.iv), dec(data.ct)));
    inject(gate, html, logoutLabel);
    return true;
  } catch {
    return false;
  }
}

/** Wire one gate element (PrivateGate renders exactly one per page). */
export async function mountGate(gate: HTMLElement): Promise<void> {
  const data = JSON.parse(gate.querySelector('[data-private-data]')!.textContent!) as GateData;
  const logoutLabel = gate.dataset.logoutLabel ?? 'Log out';

  // Already logged in on this device → decrypt with no form flash. A failure
  // means the master secret rotated: drop the stale key and show the form.
  const cachedK = storedKey(data.days);
  if (cachedK && (await tryDecrypt(gate, data, cachedK, logoutLabel))) return;
  if (cachedK) clearSession();
  gate.querySelector<HTMLElement>('[data-private-form]')!.hidden = false;

  const form = gate.querySelector('form')!;
  const error = gate.querySelector<HTMLElement>('[data-private-error]')!;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    const idInput = form.querySelector<HTMLInputElement>('input[name="id"]')!;
    const pwInput = form.querySelector<HTMLInputElement>('input[name="password"]')!;
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    button.disabled = true;
    try {
      const id = idInput.value.trim().toLowerCase();
      const salt = dec(data.salt);
      const idBytes = new TextEncoder().encode(id);
      const joined = new Uint8Array(salt.length + idBytes.length);
      joined.set(salt);
      joined.set(idBytes, salt.length);
      const h = await sha256Hex(joined);
      const user = data.users.find((u) => u.h === h);
      if (user) {
        const kek = await deriveKek(pwInput.value, dec(user.s));
        try {
          const k = new Uint8Array(await aesDecrypt(kek, dec(user.iv), dec(user.w)));
          if (await tryDecrypt(gate, data, k, logoutLabel)) {
            try {
              localStorage.setItem(STORE, JSON.stringify({ k: enc(k), t: Date.now() }));
            } catch {
              /* private browsing — session just won't persist */
            }
            return;
          }
        } catch {
          /* wrong password (unwrap failed) — fall through to the error */
        }
      }
      error.hidden = false;
    } finally {
      button.disabled = false;
    }
  });
}
