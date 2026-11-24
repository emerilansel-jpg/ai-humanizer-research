// ai-humanizer-research/engine/server.js
// Production-grade Neural Humanizer Studio Server
// Serves engine/index.html and provides API endpoints for analysis, live Turnitin scan, and re-humanization.

const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  analyzeSentences,
  autoLoopHumanize,
  scanTurnitinLive,
  rehumanizeSentence
} = require('./humanizer.js');
const {
  createStore,
  hashPassword,
  randomToken,
  currentUser,
  ensureCredits,
  addCredits,
  VERSION_LOG,
  COUPONS,
  RUN_COST,
  FREE_CREDITS
} = require('./store.js');

const PORT = 3000;
const HTML_PATH = path.join(__dirname, 'index.html');

// Local dev uses the JSON-file store; swap in a KV namespace for Workers parity.
const store = createStore(null);

// In-memory progress store keyed by job id. One entry per auto-loop run;
// readers poll GET /api/progress?id=... — no SSE (event-stream support on
// Cloudflare Workers is unreliable and would need a Durable Object).
const progressJobs = new Map();

function json(res, status, obj, extraHeaders) {
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json' }, extraHeaders || {}));
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function cookieOf(req) { return req.headers.cookie || ''; }
function authOf(req) { return req.headers.authorization || ''; }

// Strip PII before a report/record is stored or returned.
function publicUser(u) { return u ? { id: u.id, email: u.email, createdAt: u.createdAt } : null; }

const server = http.createServer(async (req, res) => {
  // CORS and Cache Control
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if ((req.method === 'GET' || req.method === 'HEAD') && (req.url === '/' || req.url === '/humanizer' || req.url === '/humanizer/')) {
    try {
      const htmlContent = fs.readFileSync(HTML_PATH, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (req.method === 'HEAD') return res.end();
      return res.end(htmlContent);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      return res.end('Error loading index.html: ' + err.message);
    }
  }

  // ---- Auth: register / login / logout / me ----
  if (req.method === 'POST' && (req.url === '/api/register' || req.url === '/api/humanizer/register')) {
    try {
      const { email, password } = JSON.parse((await readBody(req)) || '{}');
      const em = String(email || '').trim().toLowerCase();
      const pw = String(password || '');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return json(res, 400, { error: 'Invalid email' });
      if (pw.length < 8) return json(res, 400, { error: 'Password must be at least 8 characters' });
      const existing = await store.get('user-email:' + em, null);
      if (existing) return json(res, 409, { error: 'Email already registered' });
      const id = 'u_' + randomToken(8);
      const salt = randomToken(16);
      const user = { id, email: em, salt, hash: await hashPassword(pw, salt), createdAt: new Date().toISOString() };
      await store.put('user:' + id, user);
      await store.put('user-email:' + em, id);
      await ensureCredits(store, id);
      await addCredits(store, id, FREE_CREDITS, 'register');
      const token = randomToken(32);
      await store.put('sess:' + token, { user: id, createdAt: new Date().toISOString() });
      return json(res, 200, { user: publicUser(user), token }, { 'Set-Cookie': 'humanizer_token=' + token + '; Path=/; HttpOnly; Max-Age=2592000' });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  if (req.method === 'POST' && (req.url === '/api/login' || req.url === '/api/humanizer/login')) {
    try {
      const { email, password } = JSON.parse((await readBody(req)) || '{}');
      const em = String(email || '').trim().toLowerCase();
      const pw = String(password || '');
      const id = await store.get('user-email:' + em, null);
      const user = id && await store.get('user:' + id, null);
      if (!user || await hashPassword(pw, user.salt) !== user.hash) {
        return json(res, 401, { error: 'Invalid email or password' });
      }
      const token = randomToken(32);
      await store.put('sess:' + token, { user: user.id, createdAt: new Date().toISOString() });
      return json(res, 200, { user: publicUser(user), token }, { 'Set-Cookie': 'humanizer_token=' + token + '; Path=/; HttpOnly; Max-Age=2592000' });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  if (req.method === 'POST' && (req.url === '/api/logout' || req.url === '/api/humanizer/logout')) {
    const token = (cookieOf(req).match(/(?:^|;\s*)humanizer_token=([a-f0-9]{64})/) || [])[1];
    if (token) await store.del('sess:' + token);
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'humanizer_token=; Path=/; HttpOnly; Max-Age=0' });
  }

  if (req.method === 'GET' && (req.url === '/api/me' || req.url === '/api/humanizer/me')) {
    const user = await currentUser(store, cookieOf(req), authOf(req));
    if (!user) return json(res, 401, { error: 'Not logged in' });
    const credits = await ensureCredits(store, user.id);
    return json(res, 200, { user: publicUser(user), credits: credits.balance, history: credits.history });
  }

  // ---- Credits ----
  if (req.method === 'GET' && (req.url === '/api/credits' || req.url === '/api/humanizer/credits')) {
    const user = await currentUser(store, cookieOf(req), authOf(req));
    if (!user) return json(res, 401, { error: 'Not logged in' });
    const credits = await ensureCredits(store, user.id);
    return json(res, 200, { credits: credits.balance, history: credits.history });
  }

  // ---- Coupon redemption ----
  if (req.method === 'POST' && (req.url === '/api/apply-coupon' || req.url === '/api/humanizer/apply-coupon')) {
    try {
      const user = await currentUser(store, cookieOf(req), authOf(req));
      if (!user) return json(res, 401, { error: 'Not logged in' });
      const { code } = JSON.parse((await readBody(req)) || '{}');
      const coupon = COUPONS[String(code || '').trim().toUpperCase()];
      if (!coupon) return json(res, 404, { error: 'Invalid coupon code' });
      const credits = await addCredits(store, user.id, coupon.credits, 'coupon:' + code);
      return json(res, 200, { ok: true, added: coupon.credits, credits: credits.balance, label: coupon.label });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  // ---- Version log (public) ----
  if (req.method === 'GET' && (req.url === '/api/version-log' || req.url === '/api/humanizer/version-log')) {
    return json(res, 200, { versions: VERSION_LOG });
  }

  // ---- Email capture (stored to KV; no SMTP yet) ----
  if (req.method === 'POST' && (req.url === '/api/notify-email' || req.url === '/api/humanizer/notify-email')) {
    try {
      const { email, source } = JSON.parse((await readBody(req)) || '{}');
      const em = String(email || '').trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return json(res, 400, { error: 'Invalid email' });
      const list = (await store.get('email-list', [])) || [];
      if (!list.some(e => e.email === em)) {
        list.push({ email: em, source: source || 'unknown', at: new Date().toISOString() });
        await store.put('email-list', list);
      }
      return json(res, 200, { ok: true });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  // ---- Bug reports ----
  if (req.method === 'POST' && (req.url === '/api/reports' || req.url === '/api/humanizer/reports')) {
    try {
      const { title, description, email } = JSON.parse((await readBody(req)) || '{}');
      const t = String(title || '').trim();
      const d = String(description || '').trim();
      if (t.length < 3 || d.length < 10) return json(res, 400, { error: 'Title (min 3) and description (min 10) required' });
      const id = 'r_' + randomToken(8);
      const user = await currentUser(store, cookieOf(req), authOf(req));
      const report = {
        id, title: t.slice(0, 200), description: d.slice(0, 4000),
        email: String(email || '').trim().toLowerCase().slice(0, 200) || null,
        userId: user ? user.id : null,
        createdAt: new Date().toISOString()
      };
      await store.put('report:' + id, report);
      const idx = (await store.get('report-idx', [])) || [];
      idx.push(id);
      if (idx.length > 500) idx.splice(0, idx.length - 500);
      await store.put('report-idx', idx);
      return json(res, 200, { ok: true, id });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  if (req.method === 'GET' && (req.url.startsWith('/api/reports') || req.url.startsWith('/api/humanizer/reports'))) {
    if ((req.headers['x-admin-key'] || '') !== 'ADMIN') return json(res, 401, { error: 'Admin key required' });
    const u = new URL(req.url, 'http://localhost');
    const limit = Math.min(parseInt(u.searchParams.get('limit') || '100', 10) || 100, 100);
    const idx = (await store.get('report-idx', [])) || [];
    const ids = idx.slice(-limit).reverse();
    const reports = [];
    for (const id of ids) {
      const r = await store.get('report:' + id, null);
      if (r) reports.push(r);
    }
    return json(res, 200, { reports, total: idx.length });
  }

  if (req.method === 'POST' && (req.url === '/api/analyze-heatmap' || req.url === '/api/humanizer/analyze-heatmap')) {
    try {
      const { text } = JSON.parse((await readBody(req)) || '{}');
      const evaluation = analyzeSentences(text || '');
      return json(res, 200, { evaluation });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  if (req.method === 'POST' && (req.url === '/api/auto-loop-humanize' || req.url === '/api/humanizer/auto-loop-humanize')) {
    let id = null;
    try {
      const { text, mode, jobId } = JSON.parse((await readBody(req)) || '{}');
      id = typeof jobId === 'string' && jobId ? jobId : 'job_' + Date.now();
      const job = { phase: 'sanitize', done: 0, total: 0, doneFlag: false, error: null };
      progressJobs.set(id, job);
      // Bound the map: a runaway poller must not leak entries forever.
      if (progressJobs.size > 200) {
        const oldest = progressJobs.keys().next().value;
        if (oldest !== id) progressJobs.delete(oldest);
      }

      // Charge logged-in users before the run; refuse when out of credits.
      const user = await currentUser(store, cookieOf(req), authOf(req));
      if (user) {
        const credits = await ensureCredits(store, user.id);
        if (credits.balance < RUN_COST) return json(res, 402, { error: 'Insufficient credits' });
        credits.balance -= RUN_COST;
        credits.history.push({ at: new Date().toISOString(), delta: -RUN_COST, reason: 'auto-loop' });
        await store.put('credit:' + user.id, credits);
      }

      const result = await autoLoopHumanize(text || '', mode || 'academic_turnitin', (p) => {
        job.phase = p.phase;
        job.done = p.done;
        job.total = p.total;
      });
      job.doneFlag = true;
      const credits = user ? await ensureCredits(store, user.id) : null;
      return json(res, 200, Object.assign({}, result, credits ? { credits: credits.balance } : {}));
    } catch (err) {
      const job = id && progressJobs.get(id);
      if (job) { job.error = err.message; job.doneFlag = true; }
      return json(res, 500, { error: err.message });
    }
  }

  // Progress poll endpoint for the auto-loop (long docs take minutes).
  if (req.method === 'GET' && (req.url.startsWith('/api/progress') || req.url.startsWith('/api/humanizer/progress'))) {
    const id = new URL(req.url, 'http://localhost').searchParams.get('id');
    const job = id && progressJobs.get(id);
    if (!job) return json(res, 404, { error: 'unknown job' });
    return json(res, 200, {
      phase: job.phase,
      done: job.done,
      total: job.total,
      complete: job.doneFlag,
      error: job.error
    });
  }

  if (req.method === 'POST' && (req.url === '/api/live-scan-turnitin' || req.url === '/api/humanizer/live-scan-turnitin')) {
    try {
      const { text } = JSON.parse((await readBody(req)) || '{}');
      const liveData = await scanTurnitinLive(text || '');
      return json(res, 200, { liveData });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  if (req.method === 'POST' && (req.url === '/api/rehumanize-sentence' || req.url === '/api/humanizer/rehumanize-sentence')) {
    try {
      const { sentence, contextBefore, contextAfter, mode } = JSON.parse((await readBody(req)) || '{}');
      const rewritten = await rehumanizeSentence(sentence, contextBefore, contextAfter, mode || 'academic_turnitin');
      return json(res, 200, { rewritten });
    } catch (err) {
      return json(res, 500, { error: err.message });
    }
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`AI Humanizer Studio running at: http://localhost:${PORT}`);
});
