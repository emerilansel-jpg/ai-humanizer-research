// benchmark/prototype_pipeline.js
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

async function callLLM(systemPrompt, userPrompt, temperature = 0.85, freqPenalty = 0.2) {
  const models = ['pesat-pro', 'pesat-flash'];
  let lastErr = null;

  for (const model of models) {
    try {
      return await new Promise((resolve, reject) => {
        const payload = JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature,
          frequency_penalty: freqPenalty,
          presence_penalty: 0.15,
          max_tokens: 550
        });

        const req = https.request(PESAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + API_KEY
          },
          lookup: safeLookup('104.21.80.151'),
          timeout: 25000
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
              if (content) resolve(content);
              else reject(new Error('Empty content from ' + model));
            } catch (e) {
              reject(new Error('Parse failed on ' + model + ': ' + data.slice(0, 100)));
            }
          });
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Timeout on ' + model));
        });
        req.write(payload);
        req.end();
      });
    } catch (err) {
      lastErr = err;
      // try next model
    }
  }
  throw lastErr || new Error('All models failed');
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

function sanitizeFormatting(text) {
  if (!text) return '';
  const paragraphs = text.split(/\r?\n\s*\r?\n/);
  const cleanedParas = paragraphs.map(para => {
    let cleaned = para;
    // Strip em-dashes and en-dashes
    cleaned = cleaned.replace(/\s*—\s*/g, ', ');
    cleaned = cleaned.replace(/\s*–\s*/g, ', ');
    // Strip connective openers
    cleaned = cleaned.replace(/(^|[.!?]\s+)(?:Furthermore|Moreover|Additionally|Consequently|Ultimately|Notably|Importantly|In conclusion|In summary|To summarize),\s+/gi, '$1');
    // Strip participial tails
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?highlighting\b/gi, '. This highlights');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?underscoring\b/gi, '. This underscores');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?demonstrating\b/gi, '. This demonstrates');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?ensuring\b/gi, '. This ensures');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?allowing\b/gi, '. This allows');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?enabling\b/gi, '. This enables');
    // Normalize spacing while preserving newlines
    cleaned = cleaned.replace(/[ \t]+,/g, ',');
    cleaned = cleaned.replace(/,\s*,+/g, ',');
    cleaned = cleaned.replace(/\.\s*\./g, '.');
    cleaned = cleaned.replace(/,\s*\./g, '.');
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');
    // Fix sentence starts
    cleaned = cleaned.replace(/([.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase());
    return cleaned.trim();
  });
  return cleanedParas.join('\n\n').trim();
}

async function runOptimizedPipeline(text, subject = 'Academic Essay') {
  const numParagraphs = text.split(/\r?\n\s*\r?\n/).filter(p => p.trim().length > 0).length || 1;

  // Pass 1: Authentic Student Reconstruction Prompt
  const pass1System = `You are an authentic university student writing an academic research paper or essay. Your writing sounds natural, smart, and direct, with zero AI clichés or robotic symmetry.`;
  const pass1User = `Rewrite the following academic passage into clear, natural prose as an authentic student researcher would write.

CRITICAL INSTRUCTIONS (Wikipedia Signs of AI & Blader Humanizer Rules):
1. PRESERVE 100% CONTENT & CONCEPTS:
   - Keep all scientific facts, specific terminology, and key claims accurate.
   - Do NOT invent external tools, authors, or facts.
   - Output exactly ${numParagraphs} paragraph(s) separated by a blank line.
2. RECONSTRUCT NARRATIVE FLOW (DO NOT PARAPHRASE SENTENCE-BY-SENTENCE):
   - Synthesize the ideas naturally. Break monotonous subject-first sentence patterns.
   - Mix short, decisive sentences (4-7 words) with developed explanatory sentences (15-22 words).
   - Use active, direct verbs (is, has, shows, cuts, guides, speeds up) instead of empty nominalizations (plays a pivotal role, serves as a cornerstone, fosters).
3. ABSOLUTE BANS:
   - Strictly NO em-dashes (—) or en-dashes (–).
   - Strictly NO participial -ing riders at sentence ends (never end with ', highlighting...', ', thereby ensuring...', ', underscoring...').
   - Strictly NO symmetrical contrasts ('not only X, but also Y', 'rather than X, Y').
   - Strictly NO forced triads (lists of exactly three parallel items).
   - BAN AI signpost words: pivotal, cornerstone, foster, delve, tapestry, testament, seamlessly, unprecedented, utilize, landscape, interplay.
   - BAN connective openers: Never begin a sentence with Furthermore, Moreover, Additionally, Consequently, Notably, Ultimately, or In conclusion.

Passage to rewrite:
${text}

Respond ONLY with the rewritten text:`;

  const pass1Draft = await callLLM(pass1System, pass1User, 0.88, 0.22);

  // Pass 2: Academic Cadence & Slop Filter
  const pass2System = `You are a university writing tutor helping a student refine their essay. You ensure natural rhythm, varied sentence lengths, and zero AI signposts.`;
  const pass2User = `Polish the student draft below.
- Keep all technical terms, mechanisms, and factual claims intact.
- Enforce high burstiness: make sure there is at least one concise 4-6 word sentence in each paragraph.
- Eliminate any remaining textbook clichés or stiff phrases.
- Strictly NO em-dashes (—). NO participial appendages. NO connective openers.
- Preserve exactly ${numParagraphs} paragraph(s).

Student Draft:
${pass1Draft}

Respond ONLY with the polished text:`;

  const pass2Draft = await callLLM(pass2System, pass2User, 0.72, 0.18);
  let currentText = sanitizeFormatting(pass2Draft);

  // Pass 3: Closed-Loop Detector Verification & Targeted Sentence Refinement
  let retries = 0;
  let liveResult = null;
  try {
    liveResult = await scanTurnitin(currentText);
    if (liveResult && (liveResult.class === 'ai' || (liveResult.aiRateResult?.Turnitin || 0) > 0.30)) {
      // Find top flagged sentences
      const flagged = (liveResult.sentences || []).filter(s => s.generated_prob > 0.25 || s.class === 'ai');
      for (const item of flagged.slice(0, 3)) {
        try {
          retries++;
          const fixPrompt = `Rewrite ONLY this one sentence to read like authentic student prose with zero AI detection patterns. Return ONLY the replacement sentence without quotes.

Original sentence: "${item.sentence}"`;
          const fixed = await callLLM('You are a sentence copy editor. Return only the rewritten sentence.', fixPrompt, 0.85, 0.2);
          if (fixed && fixed.length > 5 && !fixed.includes('\n')) {
            currentText = currentText.replace(item.sentence, fixed.trim());
          }
        } catch (e) {}
      }
      currentText = sanitizeFormatting(currentText);
      liveResult = await scanTurnitin(currentText);
    }
  } catch (err) {
    // Graceful fallback
  }

  return {
    rewritten: currentText,
    retries,
    liveResult
  };
}

module.exports = { runOptimizedPipeline, scanTurnitin, callLLM };
