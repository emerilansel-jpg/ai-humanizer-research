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

const PORT = 3000;
const HTML_PATH = path.join(__dirname, 'index.html');

// In-memory progress store keyed by job id. One entry per auto-loop run;
// readers poll GET /api/progress?id=... — no SSE (event-stream support on
// Cloudflare Workers is unreliable and would need a Durable Object).
const progressJobs = new Map();

const server = http.createServer(async (req, res) => {
  // CORS and Cache Control
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

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

  if (req.method === 'POST' && (req.url === '/api/analyze-heatmap' || req.url === '/api/humanizer/analyze-heatmap')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { text } = JSON.parse(body || '{}');
        const evaluation = analyzeSentences(text || '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ evaluation }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && (req.url === '/api/auto-loop-humanize' || req.url === '/api/humanizer/auto-loop-humanize')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { text, mode, jobId } = JSON.parse(body || '{}');
        const id = typeof jobId === 'string' && jobId ? jobId : 'job_' + Date.now();
        const job = { phase: 'sanitize', done: 0, total: 0, doneFlag: false, error: null };
        progressJobs.set(id, job);
        // Bound the map: a runaway poller must not leak entries forever.
        if (progressJobs.size > 200) {
          const oldest = progressJobs.keys().next().value;
          if (oldest !== id) progressJobs.delete(oldest);
        }

        const result = await autoLoopHumanize(text || '', mode || 'academic_turnitin', (p) => {
          job.phase = p.phase;
          job.done = p.done;
          job.total = p.total;
        });
        job.doneFlag = true;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        const { jobId } = (() => { try { return JSON.parse(body || '{}'); } catch (e) { return {}; } })();
        const job = jobId && progressJobs.get(jobId);
        if (job) { job.error = err.message; job.doneFlag = true; }
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Progress poll endpoint for the auto-loop (long docs take minutes).
  if (req.method === 'GET' && (req.url.startsWith('/api/progress') || req.url.startsWith('/api/humanizer/progress'))) {
    const id = new URL(req.url, 'http://localhost').searchParams.get('id');
    const job = id && progressJobs.get(id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (!job) {
      return res.end(JSON.stringify({ error: 'unknown job' }));
    }
    return res.end(JSON.stringify({
      phase: job.phase,
      done: job.done,
      total: job.total,
      complete: job.doneFlag,
      error: job.error
    }));
  }

  if (req.method === 'POST' && (req.url === '/api/live-scan-turnitin' || req.url === '/api/humanizer/live-scan-turnitin')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { text } = JSON.parse(body || '{}');
        const liveData = await scanTurnitinLive(text || '');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ liveData }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && (req.url === '/api/rehumanize-sentence' || req.url === '/api/humanizer/rehumanize-sentence')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { sentence, contextBefore, contextAfter, mode } = JSON.parse(body || '{}');
        const rewritten = await rehumanizeSentence(sentence, contextBefore, contextAfter, mode || 'academic_turnitin');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ rewritten }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`AI Humanizer Studio running at: http://localhost:${PORT}`);
});
