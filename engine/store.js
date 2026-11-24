// ai-humanizer-research/engine/store.js
// Node-side store + auth helpers for the local dev server.
// The edge worker embeds its own copy of the pure helpers (see build_worker.js).
// Crypto uses WebCrypto (globalThis.crypto) so hashing/token logic matches Workers.
const fs = require('fs');
const path = require('path');

const LOCAL_DIR = path.join(__dirname, 'data');
const LOCAL_FILE = path.join(LOCAL_DIR, 'store.json');

function loadLocal() {
  try { return JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8')); }
  catch (e) { return {}; }
}
function saveLocal(obj) {
  try {
    if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
    fs.writeFileSync(LOCAL_FILE, JSON.stringify(obj, null, 2));
  } catch (e) {}
}

// kv: null => local JSON file store; a KV namespace => Workers KV.
function createStore(kv) {
  if (kv) {
    return {
      mode: 'kv',
      async get(key, fallback) {
        const raw = await kv.get(key, 'json');
        return raw === null || raw === undefined ? fallback : raw;
      },
      async put(key, value) { await kv.put(key, JSON.stringify(value)); },
      async del(key) { await kv.delete(key); }
    };
  }
  return {
    mode: 'local',
    async get(key, fallback) {
      const obj = loadLocal();
      return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : fallback;
    },
    async put(key, value) {
      const obj = loadLocal();
      obj[key] = value;
      saveLocal(obj);
    },
    async del(key) {
      const obj = loadLocal();
      delete obj[key];
      saveLocal(obj);
    }
  };
}

function hex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// SHA-256(salt + ':' + pw) as hex. Async: WebCrypto only (parity with Workers).
async function hashPassword(pw, salt) {
  const data = new TextEncoder().encode(salt + ':' + pw);
  return hex(await crypto.subtle.digest('SHA-256', data));
}

// 2*bytes hex string from CSPRNG.
function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return hex(arr);
}

// Pull the session token out of a raw Cookie header string (or Bearer header).
function tokenFromRequest(cookieHeader, authHeader) {
  if (cookieHeader) {
    const m = String(cookieHeader).match(/(?:^|;\s*)humanizer_token=([a-f0-9]{64})/);
    if (m) return m[1];
  }
  if (authHeader && /^Bearer\s+[a-f0-9]{64}$/.test(authHeader)) return authHeader.slice(7).trim();
  return null;
}

async function currentUser(store, cookieHeader, authHeader) {
  const token = tokenFromRequest(cookieHeader, authHeader);
  if (!token) return null;
  const sess = await store.get('sess:' + token, null);
  if (!sess || typeof sess !== 'object' || !sess.user) return null;
  const user = await store.get('user:' + sess.user, null);
  return user || null;
}

async function ensureCredits(store, userId) {
  const c = await store.get('credit:' + userId, null);
  if (c && typeof c === 'object' && typeof c.balance === 'number') return c;
  const fresh = { balance: 50, history: [] };
  await store.put('credit:' + userId, fresh);
  return fresh;
}

async function addCredits(store, userId, amount, reason) {
  const c = await ensureCredits(store, userId);
  c.balance += amount;
  c.history.push({ at: new Date().toISOString(), delta: amount, reason: reason || 'topup' });
  if (c.history.length > 100) c.history = c.history.slice(-100);
  await store.put('credit:' + userId, c);
  return c;
}

// Version history for the humanizer (shown in UI modal).
const VERSION_LOG = [
  { version: 'v25', date: '2024-01-10', note: 'Initial public release — multi-detector studio (Turnitin, ZeroGPT, GPTZero, Copyleaks, SynthID)' },
  { version: 'v26', date: '2024-01-20', note: 'Added Balance Mode, Google SynthID + ChatGPT Watermark + Claude Detector suites' },
  { version: 'v27', date: '2024-01-28', note: 'Live Turnitin + ZeroGPT dual closed-loop rehumanization' },
  { version: 'v28', date: '2024-02-05', note: 'Calibrated detection baselines, reverse-engineered watermark logic' },
  { version: 'v29', date: '2024-02-14', note: 'Long-doc chunked rewrite, dynamic completion budget, heading preservation' },
  { version: 'v30', date: '2024-02-20', note: 'Language guard on all modes, format validation, chunk retry, heading dedup' },
  { version: 'v31', date: '2024-02-25', note: 'Progress poll endpoint (live phase updates during auto-loop)' },
  { version: 'v32', date: '2024-03-01', note: 'Parallel chunk rewrite (bounded concurrency), sync closed-loop thresholds 20/20/20' },
  { version: 'v33', date: '2024-03-05', note: 'Account system: register/login, credits meter, coupon redemption, bug-report intake, email capture' },
  { version: 'v34', date: '2024-03-10', note: 'KV-backed persistence (Cloudflare KV binding DATA), session cookie auth, free credit grant on register' }
];

// Single starter coupon; extend to a KV-backed table when more are needed.
const COUPONS = {
  'AIHUMAN-FREE100': { credits: 100, label: 'Free 100 credits' }
};

// Cost of one full auto-loop humanize run.
const RUN_COST = 10;
const FREE_CREDITS = 50;

module.exports = {
  createStore,
  hashPassword,
  randomToken,
  tokenFromRequest,
  currentUser,
  ensureCredits,
  addCredits,
  VERSION_LOG,
  COUPONS,
  RUN_COST,
  FREE_CREDITS
};
