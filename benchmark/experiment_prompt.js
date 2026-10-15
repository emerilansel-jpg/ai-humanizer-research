// benchmark/experiment_prompt.js
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const https = require('https');

const API_KEY = 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';
const PESAT_URL = 'https://api.pesatrouter.com/v1/chat/completions';

function safeLookup(targetIp) {
  return (hostname, options, callback) => {
    let cb = typeof options === 'function' ? options : callback;
    let opts = typeof options === 'object' ? options : {};
    if (opts && opts.all) {
      cb(null, [{ address: targetIp, family: 4 }]);
    } else {
      cb(null, targetIp, 4);
    }
  };
}

function callLLM(systemPrompt, userPrompt, temperature = 0.85, freqPenalty = 0.2) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: 'pesat-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature,
      frequency_penalty: freqPenalty,
      presence_penalty: 0.15,
      max_tokens: 1000
    });

    const req = https.request(PESAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY
      },
      lookup: safeLookup('104.21.80.151'),
      timeout: 45000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          let content = parsed.choices?.[0]?.message?.content?.trim() || '';
          content = content.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '');
          if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
            content = content.slice(1, -1).trim();
          }
          resolve(content);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function scanTurnitin(text) {
  return new Promise((resolve, reject) => {
    const req = https.request('https://www.turnitindetector.ai/bff/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.turnitindetector.ai',
        'Referer': 'https://www.turnitindetector.ai/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      },
      lookup: safeLookup('172.66.40.246'),
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.success && parsed.data) {
            resolve(parsed.data);
          } else {
            reject(new Error(parsed.message || 'Scan failed'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ text }));
    req.end();
  });
}

module.exports = { callLLM, scanTurnitin };
