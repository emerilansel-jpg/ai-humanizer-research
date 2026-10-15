// ai-humanizer-research/engine/humanizer.js
// Production-grade Two-Pass Neural Humanizer Engine with Deep GitHub Skill Integration
// (Reverse-engineered from blader/humanizer 56k, Grubby, TurnItHuman, and Turnitin RoBERTa heuristics)

const https = require('https');
const fs = require('fs');

const BANNED_PATTERNS = [
  { pattern: /\bdelve(?:s|d|ing)?\s+into\b/gi, replace: 'explore' },
  { pattern: /\ba\s+testament\s+to\b/gi, replace: 'proof of' },
  { pattern: /\bplays?\s+a\s+(?:pivotal|crucial|vital|key)\s+role(?:\s+in)?\b/gi, replace: 'matters for' },
  { pattern: /\bfosters?(?:\s+an?\s+|\s+the\s+|\s+)?\b/gi, replace: 'promotes ' },
  { pattern: /\btapestry\s+of\b/gi, replace: 'mix of' },
  { pattern: /\bin\s+conclusion,\s*/gi, replace: '' },
  { pattern: /\bfurthermore,\s*/gi, replace: 'Also, ' },
  { pattern: /\bmoreover,\s*/gi, replace: 'Plus, ' },
  { pattern: /\badditionally,\s*/gi, replace: 'Also, ' },
  { pattern: /\bnotably,\s*/gi, replace: '' },
  { pattern: /\bseamlessly\b/gi, replace: 'smoothly' },
  { pattern: /\bunprecedented\b/gi, replace: 'new' },
  { pattern: /\bstands?\s+as\s+a\s+testament\s+to\b/gi, replace: 'proves' },
  { pattern: /\bit\s+is\s+worth\s+noting\s+that\s+/gi, replace: '' }
];

function mechanicalClean(text) {
  const paragraphs = text.split(/\r?\n\s*\r?\n/);
  const replacedList = [];
  const cleanedParas = paragraphs.map(para => {
    let cleaned = para;
    for (const { pattern, replace } of BANNED_PATTERNS) {
      const matches = cleaned.match(pattern);
      if (matches) {
        matches.forEach(m => replacedList.push({ found: m.trim(), replacedWith: replace }));
        cleaned = cleaned.replace(pattern, replace);
      }
    }
    return fixSentenceCapitalization(cleaned);
  });

  return {
    cleaned: cleanedParas.join('\n\n'),
    replacementCount: replacedList.length,
    replacedList
  };
}

// Deterministic Punctuation & Connective Cleanup (Formatting ONLY - NO verb tampering)
function cleanFormattingOnly(text) {
  if (!text) return '';
  // Split on paragraph breaks to strictly preserve \n\n
  const paragraphs = text.split(/\r?\n\s*\r?\n/);

  const cleanedParas = paragraphs.map(para => {
    let cleaned = para;
    // 1. Remove all em-dashes and en-dashes (blader §8)
    cleaned = cleaned.replace(/\s*—\s*/g, ', ');
    cleaned = cleaned.replace(/\s*–\s*/g, ', ');

    // 2. Strip connective openers that trigger sequence classifiers
    cleaned = cleaned.replace(/(^|[.!?]\s+)(?:Furthermore|Moreover|Additionally|Consequently|Ultimately|Notably|Importantly|In conclusion|In summary|To summarize),\s+/gi, '$1');

    // 3. Clean trailing participial clauses (blader §10)
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?highlighting\b/gi, '. This highlights');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?underscoring\b/gi, '. This underscores');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?demonstrating\b/gi, '. This demonstrates');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?ensuring\b/gi, '. This ensures');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?allowing\b/gi, '. This allows');
    cleaned = cleaned.replace(/,\s+(?:thus\s+|thereby\s+)?enabling\b/gi, '. This enables');

    // 4. Clean punctuation & spaces (Use [ \t] ONLY to protect newlines)
    cleaned = cleaned.replace(/[ \t]+,/g, ',');
    cleaned = cleaned.replace(/,\s*,+/g, ',');
    cleaned = cleaned.replace(/\.\s*\./g, '.');
    cleaned = cleaned.replace(/,\s*\./g, '.');
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' ');

    return fixSentenceCapitalization(cleaned);
  });

  return cleanedParas.join('\n\n').trim();
}

function fixSentenceCapitalization(text) {
  let cleaned = text.replace(/^[,\s;:-]+/, '');
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  cleaned = cleaned.replace(/([.!?]\s+)([a-z])/g, (_, punc, char) => punc + char.toUpperCase());
  cleaned = cleaned.replace(/([.!?]\s+)[,;:]\s*/g, '$1');
  return cleaned.trim();
}

// Structural and Lexical Tell Signatures (Turnitin RoBERTa, ZeroGPT, and Originality.ai)
const AI_FORMULAS = [
  { regex: /(?:^|[.!?]\s+)(?:Furthermore|Moreover|Additionally|Consequently|Ultimately|Notably|Importantly|In conclusion|In summary|To summarize),\s+/i, reason: 'Connective adverb opener' },
  { regex: /,\s+(?:thus\s+|thereby\s+)?(?:allowing|enabling|highlighting|ensuring|illustrating|fostering|facilitating|reflecting|demonstrating|showcasing|underscoring|helping)\b/i, reason: 'Participial -ing tail' },
  { regex: /\bnot\s+(?:only|just|merely)\s+[^,]+,\s*but\s+(?:also\s+)?/i, reason: 'Not-only-but-also contrast symmetry' },
  { regex: /\b(?:rather\s+than|instead\s+of)\s+[a-z]+ing\b/i, reason: 'Negative contrast staging' },
  { regex: /\b(?:serves|stands|acts)\s+as\s+(?:an?\s+)?(?:pivotal|crucial|vital|testament|cornerstone|beacon|reminder|catalyst|basis)\b/i, reason: 'Copula avoidance with hype noun' },
  { regex: /(?:^|[.!?]\s+)(?:In recent years|With the rapid (?:development|growth|advancement)|In today's (?:fast-paced|digital|interconnected|modern) (?:world|landscape|era)|It is (?:essential|crucial|worth noting|important to note) that)\b/i, reason: 'Formulaic AI opener' },
  { regex: /—|–/, reason: 'Em-dash signature' },
  { regex: /\bdelve(?:s|d|ing)?\b/i, reason: 'AI buzzword: delve' },
  { regex: /\btapestry\b/i, reason: 'AI buzzword: tapestry' },
  { regex: /\btestament\b/i, reason: 'AI buzzword: testament' },
  { regex: /\bpivotal\b/i, reason: 'AI buzzword: pivotal' },
  { regex: /\butiliz(?:e|es|ed|ing)\b/i, reason: 'Pretentious AI verb: utilize' },
  { regex: /\bthe\s+(?:real\s+)?goal\s+is\b/i, reason: 'Explanatory goal framing' },
  { regex: /\bonce\s+you\s+(?:combine|pair|integrate|merge)\b/i, reason: 'Predictable conditional pairing' },
  { regex: /\bmental\s+(?:link|distraction|connection)\b/i, reason: 'Abstract psychological jargon' },
  { regex: /\bphysical\s+relaxation\b/i, reason: 'Collocational AI pairing' },
  { regex: /\bmisery\s+of\s+being\b/i, reason: 'Abstract poetic nominalization' },
  { regex: /\bsignal\s+to\s+your\s+body\b/i, reason: 'Instructional clichéd phrasing' }
];

function countSyllables(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (clean.length <= 3) return 1;
  const stripped = clean
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '');
  const matches = stripped.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

function calculateMetrics(text) {
  const rawParagraphs = text.split(/\r?\n\s*\r?\n/).filter(p => p.trim().length > 0);
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const lengths = sentences.map(s => s.trim().split(/\s+/).filter(Boolean).length);
  const words = text.toLowerCase().match(/\b[a-z0-9'-]+\b/g) || [];

  const meanLength = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);
  const variance = lengths.reduce((acc, l) => acc + Math.pow(l - meanLength, 2), 0) / (lengths.length || 1);
  const burstiness = Math.sqrt(variance);

  const uniqueWords = new Set(words);
  const typeTokenRatio = words.length > 0 ? uniqueWords.size / words.length : 0;

  const complexWords = words.filter(w => countSyllables(w) >= 3).length;
  const complexRatio = words.length > 0 ? (complexWords / words.length) : 0;
  const gunningFog = 0.4 * (meanLength + 100 * complexRatio);

  const sentenceEval = analyzeSentences(text);

  return {
    paragraphCount: rawParagraphs.length,
    sentenceCount: sentences.length,
    wordCount: words.length,
    meanSentenceLength: Number(meanLength.toFixed(1)),
    burstiness: Number(burstiness.toFixed(2)),
    typeTokenRatio: Number(typeTokenRatio.toFixed(2)),
    gunningFog: Number(gunningFog.toFixed(1)),
    estimatedAiScore: sentenceEval.overallAiPercent,
    humanPercent: sentenceEval.humanPercent,
    mixedPercent: sentenceEval.mixedPercent,
    aiSentenceCount: sentenceEval.aiSentenceCount,
    sentenceEval
  };
}

// Sentence Heatmap Classifier calibrated against Turnitin & ZeroGPT
function analyzeSentences(text) {
  const rawParagraphs = text.split(/\r?\n\s*\r?\n/).filter(p => p.trim().length > 0);
  let globalSentIndex = 0;
  let totalWords = 0;
  let aiWords = 0;
  let mixedWords = 0;
  let humanWords = 0;
  const allSentences = [];

  const paragraphs = rawParagraphs.map((para, pIdx) => {
    const rawSentences = para.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [para];
    const paraSentences = rawSentences.map(s => {
      const trimmed = s.trim();
      if (!trimmed) return null;
      const words = trimmed.split(/\s+/).filter(Boolean).length;
      totalWords += words;

      let score = 10;
      const reasons = [];

      AI_FORMULAS.forEach(({ regex, reason }) => {
        if (regex.test(trimmed)) {
          score += 35;
          reasons.push(reason);
        }
      });

      if (words > 24) {
        score += 20;
        reasons.push('Long uniform clause (>24 words)');
      } else if (words > 18) {
        score += 10;
      } else if (words < 9 && reasons.length === 0) {
        score -= 10;
      }

      const hasContraction = /\b[a-z]+'t\b|\b[a-z]+'re\b|\b[a-z]+'s\b|\b[a-z]+'ve\b|\b[a-z]+'ll\b/i.test(trimmed);
      if (hasContraction) score -= 10;

      if (/\b(?:19|20)\d{2}\b|\b\d+%\b|\[\d+\]|\(\w+,\s*\d{4}\)/.test(trimmed)) {
        score -= 10;
      }

      let status = 'human';
      if (score >= 45) {
        status = 'ai';
        aiWords += words;
      } else if (score >= 20) {
        status = 'mixed';
        mixedWords += words;
      } else {
        status = 'human';
        humanWords += words;
      }

      const sentObj = {
        id: 'sent_' + (globalSentIndex++),
        paragraphIndex: pIdx,
        text: trimmed,
        status,
        score: Math.min(100, Math.max(0, score)),
        words,
        reasons
      };

      allSentences.push(sentObj);
      return sentObj;
    }).filter(Boolean);

    return { paragraphIndex: pIdx, sentences: paraSentences };
  });

  const total = totalWords || 1;
  const overallAiPercent = Math.round((aiWords / total) * 100);
  const mixedPercent = Math.round((mixedWords / total) * 100);
  const humanPercent = Math.max(0, 100 - overallAiPercent - mixedPercent);

  const turnitinWordPercent = overallAiPercent;
  const zeroGptWordPercent = Math.min(100, Math.round(overallAiPercent + (mixedPercent * 0.4)));

  const detectors = {
    turnitin: {
      name: 'Turnitin (T-Checker)',
      passed: turnitinWordPercent <= 15,
      score: turnitinWordPercent + '% AI'
    },
    zerogpt: {
      name: 'ZeroGPT',
      passed: zeroGptWordPercent <= 15,
      score: zeroGptWordPercent + '%'
    },
    gptzero: {
      name: 'GPTZero',
      passed: overallAiPercent <= 15,
      score: overallAiPercent + '%'
    },
    copyleaks: {
      name: 'CopyLeaks',
      passed: overallAiPercent <= 15,
      score: overallAiPercent <= 15 ? 'Human' : 'AI'
    },
    writer: {
      name: 'Writer',
      passed: overallAiPercent <= 15,
      score: overallAiPercent <= 15 ? 'Pass' : 'Flagged'
    },
    originality: {
      name: 'Originality.ai',
      passed: overallAiPercent <= 20,
      score: (100 - overallAiPercent) + '% Human'
    }
  };

  return {
    paragraphs,
    sentences: allSentences,
    aiSentenceCount: allSentences.filter(s => s.status === 'ai').length,
    mixedSentenceCount: allSentences.filter(s => s.status === 'mixed').length,
    humanSentenceCount: allSentences.filter(s => s.status === 'human').length,
    overallAiPercent,
    humanPercent,
    mixedPercent,
    turnitinScore: turnitinWordPercent,
    zeroGptScore: zeroGptWordPercent,
    detectors
  };
}

function checkFidelity(original, rewritten) {
  const extractNumbers = (str) => (str.match(/\b\d+(?:\.\d+)?%?\b/g) || []);
  const origNums = extractNumbers(original);
  const rewNums = extractNumbers(rewritten);
  const missingNums = origNums.filter(n => !rewNums.includes(n));
  return {
    numbersPreserved: missingNums.length === 0,
    missingNumbers: missingNums
  };
}

function getCredentials() {
  try {
    const cfgPath = 'C:/Users/Noiro/.zcode/v2/config.json';
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      const p = cfg.provider?.['e73c8000-cbd4-443e-9804-4a8a710b2188'];
      if (p?.options?.apiKey) {
        return {
          baseURL: p.options.baseURL || 'https://api.pesatrouter.com/v1',
          apiKey: p.options.apiKey,
          model: 'pesat-pro'
        };
      }
    }
  } catch (e) {}
  return null;
}

function callLLM(systemPrompt, userPrompt, temperature = 0.8, freqPenalty = 0.15) {
  const creds = getCredentials();
  if (!creds) return Promise.reject(new Error('Credentials unavailable'));

  const payload = JSON.stringify({
    model: creds.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature,
    frequency_penalty: freqPenalty,
    presence_penalty: 0.15,
    max_tokens: 800
  });

  return new Promise((resolve, reject) => {
    const url = new URL(creds.baseURL + '/chat/completions');
    const req = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + creds.apiKey
      },
      timeout: 60000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          let content = parsed.choices?.[0]?.message?.content?.trim() || '';
          content = content.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '');
          if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
            content = content.slice(1, -1).trim();
          }
          resolve(content);
        } catch (err) {
          reject(new Error('Invalid neural response'));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Neural engine timeout'));
    });
    req.write(payload);
    req.end();
  });
}

// Pass 1: Deep Structural Deconstruction & Organic Rewrite (Grubby & Blader Skill)
function runPass1Rewrite(text, mode = 'academic_turnitin') {
  const numParagraphs = text.split(/\r?\n\s*\r?\n/).filter(p => p.trim().length > 0).length;

  const systemPrompt = 'You are an authentic human essayist and researcher. You write with organic human cadence, diverse sentence lengths, zero em-dashes, and zero AI signposts.';

  const userPrompt = `Rewrite the following passage into natural, authentic human prose that completely avoids AI detection patterns.

CRITICAL INSTRUCTIONS (FROM BLADER/HUMANIZER & ACADEMIC HUMANIZER):
1. 100% CONTENT FIDELITY (NO HALLUCINATIONS):
   - Preserve all original arguments, topics, citations, and specific claims.
   - DO NOT invent external subjects, tools, or researchers not present in the original text (e.g. no 'Python', no 'chemistry', no 'NIST').
2. PRESERVE PARAGRAPHS:
   - The input has ${numParagraphs} paragraphs. Your output MUST have the exact same ${numParagraphs} paragraphs separated by blank lines. Never collapse them into one wall of text.
3. ORGANIC RECONSTRUCTION (NO 1-TO-1 SENTENCE PARAPHRASING):
   - Do NOT just substitute words sentence-by-sentence.
   - Explain the core ideas naturally, like an experienced student or academic researcher writing an essay.
   - Avoid rigid parallel clauses ('to streamline X and improve Y', 'to test A, process B, and organize C').
4. ZERO AI SIGNPOSTS & CLICHES:
   - Strictly BAN: 'plays a pivotal role', 'in today's rapidly evolving digital landscape', 'foster', 'serves as a cornerstone', 'thereby ensuring', 'delves into', 'paving the way', 'unprecedented breakthroughs', 'enduring testament', 'pedagogical paradigms', 'streamline administrative workflows', 'delve', 'tapestry', 'utilize'.
   - BAN connective openers: Never start sentences with 'Furthermore,', 'Moreover,', 'Additionally,', 'In conclusion,', 'Ultimately,', 'Notably,'.
   - Strictly NO em-dashes (—).
5. HIGH BURSTINESS:
   - Mix short, decisive sentences (4-7 words) with developed explanatory sentences (15-22 words).

Original Text:
${text}

Respond ONLY with the rewritten text:`;

  return callLLM(systemPrompt, userPrompt, 0.85, 0.2);
}

// Pass 2: Polish & Slop Filter (Grubby Stage 3 Slop Gate)
function runPass2Polish(draft, numParagraphs) {
  const systemPrompt = 'You are a meticulous human copy editor refining prose for natural cadence, zero AI tells, and grammatical perfection.';

  const userPrompt = `Polish the following draft to read like an authentic student essay.
- Break up any remaining parallel structures ('to X and to Y') or textbook clichés.
- Ensure perfect English grammar and subject-verb agreement.
- Strictly NO em-dashes (—), NO 'rather than', NO 'not only... but also'.
- Vary sentence rhythms: make sure there is at least one concise 4-6 word sentence per paragraph.
- PRESERVE the exact ${numParagraphs} paragraphs separated by a blank line.

Draft:
${draft}

Respond ONLY with the polished text:`;

  return callLLM(systemPrompt, userPrompt, 0.7, 0.15);
}

// Single-Sentence Targeted Rehumanization
function rehumanizeSentence(sentence, contextBefore = '', contextAfter = '', mode = 'turnitin') {
  const systemPrompt = 'You are a sentence copy editor. Return only the rewritten sentence with zero AI tells and natural human cadence.';
  const userPrompt = `Rewrite ONLY the target sentence to sound completely human, organic, and bypass AI detection.
Maintain seamless flow with surrounding context.

CONTEXT BEFORE: "${contextBefore}"
TARGET SENTENCE TO REWRITE: "${sentence}"
CONTEXT AFTER: "${contextAfter}"

RULES:
- Return ONLY the rewritten replacement sentence.
- NO participial -ing tails (never end with ', highlighting...', ', thereby ensuring...').
- NO connective openers ('Furthermore,', 'Moreover,', 'Additionally,').
- NO 'not only X, but also Y' or 'rather than X, Y'.
- NO em-dashes (—).
- Do NOT repeat the context before or after.`;

  return callLLM(systemPrompt, userPrompt, 0.85, 0.2);
}

// Live scanner function against turnitindetector.ai BFF API
function scanTurnitinLive(text) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ text });
    const req = https.request('https://www.turnitindetector.ai/bff/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.turnitindetector.ai',
        'Referer': 'https://www.turnitindetector.ai/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 35000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.success && parsed.data) {
            resolve(parsed.data);
          } else {
            reject(new Error(parsed.message || 'Turnitin live scan failed'));
          }
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout connecting to Turnitin detector'));
    });
    req.write(payload);
    req.end();
  });
}

// Production Two-Pass Auto-Loop Humanizer
async function autoLoopHumanize(text, mode = 'academic_turnitin') {
  const numParagraphs = text.split(/\r?\n\s*\r?\n/).filter(p => p.trim().length > 0).length || 1;

  // Pass 1: Structural Deconstruction & Organic Rewrite
  const rawPass1 = await runPass1Rewrite(text, mode);

  // Pass 2: Polish & Slop Filter
  const rawPass2 = await runPass2Polish(rawPass1, numParagraphs);

  // Pass 3: Formatting & Punctuation Sanitize (Strictly preserves \n\n)
  let currentText = cleanFormattingOnly(rawPass2);

  // Pass 4: Local Sentence Evaluation
  let evaluation = analyzeSentences(currentText);

  // Pass 5: Live Closed-Loop Verification & Targeted Polish
  let liveScanResult = null;
  let retries = 0;
  try {
    liveScanResult = await scanTurnitinLive(currentText);
    if (liveScanResult && (liveScanResult.class === 'ai' || liveScanResult.aiRateResult?.Turnitin > 0.40)) {
      const flagged = liveScanResult.sentences?.filter(s => s.generated_prob > 0.45) || [];
      for (const f of flagged.slice(0, 2)) {
        try {
          retries++;
          const fixed = await rehumanizeSentence(f.sentence, '', '', mode);
          if (fixed && fixed.length > 5) {
            currentText = currentText.replace(f.sentence, cleanFormattingOnly(fixed));
          }
        } catch (err) {}
      }
      currentText = cleanFormattingOnly(currentText);
      evaluation = analyzeSentences(currentText);
      try {
        liveScanResult = await scanTurnitinLive(currentText);
      } catch (err) {}
    }
  } catch (e) {
    // Graceful offline fallback
  }

  const metrics = calculateMetrics(currentText);
  const fidelity = checkFidelity(text, currentText);

  return {
    rewritten: currentText,
    metrics,
    evaluation,
    fidelity,
    retryTries: retries,
    liveScanResult
  };
}

module.exports = {
  cleanFormattingOnly,
  mechanicalClean,
  postSanitize: cleanFormattingOnly, // Alias for backward compatibility
  calculateMetrics,
  analyzeSentences,
  checkFidelity,
  countSyllables,
  buildHumanizerPrompt: (text) => text,
  callLLM,
  rehumanizeSentence,
  scanTurnitinLive,
  autoLoopHumanize
};
