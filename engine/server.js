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

const server = http.createServer(async (req, res) => {
  // CORS and Cache Control
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  if ((req.method === 'GET' || req.method === 'HEAD') && req.url === '/') {
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

  if (req.method === 'POST' && req.url === '/api/analyze-heatmap') {
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

  if (req.method === 'POST' && req.url === '/api/auto-loop-humanize') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { text, mode } = JSON.parse(body || '{}');
        const result = await autoLoopHumanize(text || '', mode || 'academic_turnitin');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/live-scan-turnitin') {
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

  if (req.method === 'POST' && req.url === '/api/rehumanize-sentence') {
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
