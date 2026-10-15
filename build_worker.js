const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'engine', 'index.html'), 'utf8');

const workerCode = `// AI Humanizer Cloudflare Worker
// Production deployment for jdpwriter.com/humanizer*

const HTML_CONTENT = ${JSON.stringify(html)};

const BANNED_PATTERNS = [
  { pattern: /\\bdelve(?:s|d|ing)?\\s+into\\b/gi, replace: 'explore' },
  { pattern: /\\ba\\s+testament\\s+to\\b/gi, replace: 'proof of' },
  { pattern: /\\bplays?\\s+a\\s+(?:pivotal|crucial|vital|key)\\s+role(?:\\s+in)?\\b/gi, replace: 'matters for' },
  { pattern: /\\bfosters?(?:\\s+an?\\s+|\\s+the\\s+|\\s+)?\\b/gi, replace: 'promotes ' },
  { pattern: /\\btapestry\\s+of\\b/gi, replace: 'mix of' },
  { pattern: /\\bin\\s+conclusion,\\s*/gi, replace: '' },
  { pattern: /\\bfurthermore,\\s*/gi, replace: 'Also, ' },
  { pattern: /\\bmoreover,\\s*/gi, replace: 'Plus, ' },
  { pattern: /\\badditionally,\\s*/gi, replace: 'Also, ' },
  { pattern: /\\bnotably,\\s*/gi, replace: '' },
  { pattern: /\\bseamlessly\\b/gi, replace: 'smoothly' },
  { pattern: /\\bunprecedented\\b/gi, replace: 'new' },
  { pattern: /\\bstands?\\s+as\\s+a\\s+testament\\s+to\\b/gi, replace: 'proves' },
  { pattern: /\\bit\\s+is\\s+worth\\s+noting\\s+that\\s+/gi, replace: '' }
];

function cleanFormattingOnly(text) {
  if (!text) return '';
  const paragraphs = text.split(/\\r?\\n\\s*\\r?\\n/);
  const cleanedParas = paragraphs.map(para => {
    let cleaned = para;
    cleaned = cleaned.replace(/\\s*—\\s*/g, ', ');
    cleaned = cleaned.replace(/\\s*–\\s*/g, ', ');
    cleaned = cleaned.replace(/(^|[.!?]\\s+)(?:Furthermore|Moreover|Additionally|Consequently|Ultimately|Notably|Importantly|In conclusion|In summary|To summarize),\\s+/gi, '$1');
    cleaned = cleaned.replace(/,\\s+(?:thus\\s+|thereby\\s+)?highlighting\\b/gi, '. This highlights');
    cleaned = cleaned.replace(/,\\s+(?:thus\\s+|thereby\\s+)?underscoring\\b/gi, '. This underscores');
    cleaned = cleaned.replace(/,\\s+(?:thus\\s+|thereby\\s+)?demonstrating\\b/gi, '. This demonstrates');
    cleaned = cleaned.replace(/,\\s+(?:thus\\s+|thereby\\s+)?ensuring\\b/gi, '. This ensures');
    cleaned = cleaned.replace(/,\\s+(?:thus\\s+|thereby\\s+)?allowing\\b/gi, '. This allows');
    cleaned = cleaned.replace(/,\\s+(?:thus\\s+|thereby\\s+)?enabling\\b/gi, '. This enables');
    cleaned = cleaned.replace(/[ \\t]+,/g, ',');
    cleaned = cleaned.replace(/,\\s*,+/g, ',');
    cleaned = cleaned.replace(/\\.\\s*\\./g, '.');
    cleaned = cleaned.replace(/,\\s*\\./g, '.');
    cleaned = cleaned.replace(/[ \\t]{2,}/g, ' ');
    return fixSentenceCapitalization(cleaned);
  });
  return cleanedParas.join('\\n\\n').trim();
}

function fixSentenceCapitalization(text) {
  let cleaned = text.replace(/^[,\\s;:-]+/, '');
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  cleaned = cleaned.replace(/([.!?]\\s+)([a-z])/g, (_, punc, char) => punc + char.toUpperCase());
  cleaned = cleaned.replace(/([.!?]\\s+)[,;:]\\s*/g, '$1');
  return cleaned.trim();
}

const AI_FORMULAS = [
  { regex: /(?:^|[.!?]\\s+)(?:Furthermore|Moreover|Additionally|Consequently|Ultimately|Notably|Importantly|In conclusion|In summary|To summarize),\\s+/i, reason: 'Connective adverb opener' },
  { regex: /,\\s+(?:thus\\s+|thereby\\s+)?(?:allowing|enabling|highlighting|ensuring|illustrating|fostering|facilitating|reflecting|demonstrating|showcasing|underscoring|helping)\\b/i, reason: 'Participial -ing tail' },
  { regex: /\\bnot\\s+(?:only|just|merely)\\s+[^,]+,\\s*but\\s+(?:also\\s+)?/i, reason: 'Not-only-but-also contrast symmetry' },
  { regex: /\\b(?:rather\\s+than|instead\\s+of)\\s+[a-z]+ing\\b/i, reason: 'Negative contrast staging' },
  { regex: /\\b(?:serves|stands|acts)\\s+as\\s+(?:an?\\s+)?(?:pivotal|crucial|vital|testament|cornerstone|beacon|reminder|catalyst|basis)\\b/i, reason: 'Copula avoidance with hype noun' },
  { regex: /(?:^|[.!?]\\s+)(?:In recent years|With the rapid (?:development|growth|advancement)|In today's (?:fast-paced|digital|interconnected|modern) (?:world|landscape|era)|It is (?:essential|crucial|worth noting|important to note) that)\\b/i, reason: 'Formulaic AI opener' },
  { regex: /—|–/, reason: 'Em-dash signature' },
  { regex: /\\bdelve(?:s|d|ing)?\\b/i, reason: 'AI buzzword: delve' },
  { regex: /\\btapestry\\b/i, reason: 'AI buzzword: tapestry' },
  { regex: /\\btestament\\b/i, reason: 'AI buzzword: testament' },
  { regex: /\\bpivotal\\b/i, reason: 'AI buzzword: pivotal' },
  { regex: /\\butiliz(?:e|es|ed|ing)\\b/i, reason: 'Pretentious AI verb: utilize' },
  { regex: /\\bthe\\s+(?:real\\s+)?goal\\s+is\\b/i, reason: 'Explanatory goal framing' },
  { regex: /\\bonce\\s+you\\s+(?:combine|pair|integrate|merge)\\b/i, reason: 'Predictable conditional pairing' },
  { regex: /\\bmental\\s+(?:link|distraction|connection)\\b/i, reason: 'Abstract psychological jargon' },
  { regex: /\\bphysical\\s+relaxation\\b/i, reason: 'Collocational AI pairing' },
  { regex: /\\bmisery\\s+of\\s+being\\b/i, reason: 'Abstract poetic nominalization' },
  { regex: /\\bsignal\\s+to\\s+your\\s+body\\b/i, reason: 'Instructional clichéd phrasing' }
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
  const rawParagraphs = text.split(/\\r?\\n\\s*\\r?\\n/).filter(p => p.trim().length > 0);
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const lengths = sentences.map(s => s.trim().split(/\\s+/).filter(Boolean).length);
  const words = text.toLowerCase().match(/\\b[a-z0-9'-]+\\b/g) || [];

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

function analyzeSentences(text) {
  const rawParagraphs = text.split(/\\r?\\n\\s*\\r?\\n/).filter(p => p.trim().length > 0);
  let globalSentIndex = 0;
  let totalWords = 0;
  let aiWords = 0;
  let mixedWords = 0;
  let humanWords = 0;
  const allSentences = [];

  const paragraphs = rawParagraphs.map((para, pIdx) => {
    const rawSentences = para.match(/[^.!?]+[.!?]+(?:\\s+|$)/g) || [para];
    const paraSentences = rawSentences.map(s => {
      const trimmed = s.trim();
      if (!trimmed) return null;
      const words = trimmed.split(/\\s+/).filter(Boolean).length;
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

      const hasContraction = /\\b[a-z]+'t\\b|\\b[a-z]+'re\\b|\\b[a-z]+'s\\b|\\b[a-z]+'ve\\b|\\b[a-z]+'ll\\b/i.test(trimmed);
      if (hasContraction) score -= 10;

      if (/\\b(?:19|20)\\d{2}\\b|\\b\\d+%\\b|\\[\\d+\\]|\\(\\w+,\\s*\\d{4}\\)/.test(trimmed)) {
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
  const extractNumbers = (str) => (str.match(/\\b\\d+(?:\\.\\d+)?%?\\b/g) || []);
  const origNums = extractNumbers(original);
  const rewNums = extractNumbers(rewritten);
  const missingNums = origNums.filter(n => !rewNums.includes(n));
  return {
    numbersPreserved: missingNums.length === 0,
    missingNumbers: missingNums
  };
}

async function callLLM(systemPrompt, userPrompt, temperature = 0.8, freqPenalty = 0.15, env = {}) {
  const apiKey = env.PESATROUTER_API_KEY || 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';
  const url = env.PESATROUTER_URL || 'https://api.pesatrouter.com/v1/chat/completions';
  const model = env.PESATROUTER_MODEL || 'pesat-pro';

  const payload = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature,
    frequency_penalty: freqPenalty,
    presence_penalty: 0.15,
    max_tokens: 800
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error('LLM call failed (' + res.status + '): ' + errText);
  }

  const parsed = await res.json();
  let content = parsed.choices?.[0]?.message?.content?.trim() || '';
  content = content.replace(/^\\\`\\\`\\\`[a-z]*\\n/i, '').replace(/\\n\\\`\\\`\\\`$/, '');
  if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith("'") && content.endsWith("'"))) {
    content = content.slice(1, -1).trim();
  }
  return content;
}

async function runPass1Rewrite(text, mode, env) {
  const numParagraphs = text.split(/\\r?\\n\\s*\\r?\\n/).filter(p => p.trim().length > 0).length;
  const systemPrompt = 'You are an authentic human essayist and researcher. You write with organic human cadence, diverse sentence lengths, zero em-dashes, and zero AI signposts.';
  const userPrompt = \`Rewrite the following passage into natural, authentic human prose that completely avoids AI detection patterns.

CRITICAL INSTRUCTIONS (FROM BLADER/HUMANIZER & ACADEMIC HUMANIZER):
1. 100% CONTENT FIDELITY (NO HALLUCINATIONS):
   - Preserve all original arguments, topics, citations, and specific claims.
   - DO NOT invent external subjects, tools, or researchers not present in the original text.
2. PRESERVE PARAGRAPHS:
   - The input has \${numParagraphs} paragraphs. Your output MUST have the exact same \${numParagraphs} paragraphs separated by blank lines. Never collapse them into one wall of text.
3. ORGANIC RECONSTRUCTION (NO 1-TO-1 SENTENCE PARAPHRASING):
   - Do NOT just substitute words sentence-by-sentence.
   - Explain the core ideas naturally, like an experienced student or academic researcher writing an essay.
   - Avoid rigid parallel clauses ('to streamline X and improve Y', 'to test A, process B, and organize C').
4. ZERO AI SIGNPOSTS & CLICHES:
   - Strictly BAN: 'plays a pivotal role', 'in today\\'s rapidly evolving digital landscape', 'foster', 'serves as a cornerstone', 'thereby ensuring', 'delves into', 'paving the way', 'unprecedented breakthroughs', 'enduring testament', 'pedagogical paradigms', 'streamline administrative workflows', 'delve', 'tapestry', 'utilize'.
   - BAN connective openers: Never start sentences with 'Furthermore,', 'Moreover,', 'Additionally,', 'In conclusion,', 'Ultimately,', 'Notably,'.
   - Strictly NO em-dashes (—).
5. HIGH BURSTINESS:
   - Mix short, decisive sentences (4-7 words) with developed explanatory sentences (15-22 words).

Original Text:
\${text}

Respond ONLY with the rewritten text:\`;

  return callLLM(systemPrompt, userPrompt, 0.85, 0.2, env);
}

async function runPass2Polish(draft, numParagraphs, env) {
  const systemPrompt = 'You are a meticulous human copy editor refining prose for natural cadence, zero AI tells, and grammatical perfection.';
  const userPrompt = \`Polish the following draft to read like an authentic student essay.
- Break up any remaining parallel structures ('to X and to Y') or textbook clichés.
- Ensure perfect English grammar and subject-verb agreement.
- Strictly NO em-dashes (—), NO 'rather than', NO 'not only... but also'.
- Vary sentence rhythms: make sure there is at least one concise 4-6 word sentence per paragraph.
- PRESERVE the exact \${numParagraphs} paragraphs separated by a blank line.

Draft:
\${draft}

Respond ONLY with the polished text:\`;

  return callLLM(systemPrompt, userPrompt, 0.7, 0.15, env);
}

async function rehumanizeSentence(sentence, contextBefore = '', contextAfter = '', mode = 'turnitin', env = {}) {
  const systemPrompt = 'You are a sentence copy editor. Return only the rewritten sentence with zero AI tells and natural human cadence.';
  const userPrompt = \`Rewrite ONLY the target sentence to sound completely human, organic, and bypass AI detection.
Maintain seamless flow with surrounding context.

CONTEXT BEFORE: "\${contextBefore}"
TARGET SENTENCE TO REWRITE: "\${sentence}"
CONTEXT AFTER: "\${contextAfter}"

RULES:
- Return ONLY the rewritten replacement sentence.
- NO participial -ing tails (never end with ', highlighting...', ', thereby ensuring...').
- NO connective openers ('Furthermore,', 'Moreover,', 'Additionally,').
- NO 'not only X, but also Y' or 'rather than X, Y'.
- NO em-dashes (—).
- Do NOT repeat the context before or after.\`;

  return callLLM(systemPrompt, userPrompt, 0.85, 0.2, env);
}

async function scanTurnitinLive(text) {
  const res = await fetch('https://www.turnitindetector.ai/bff/detect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://www.turnitindetector.ai',
      'Referer': 'https://www.turnitindetector.ai/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
    },
    body: JSON.stringify({ text })
  });

  if (!res.ok) {
    throw new Error('Turnitin detector responded with status ' + res.status);
  }
  const parsed = await res.json();
  if (parsed.success && parsed.data) {
    return parsed.data;
  }
  throw new Error(parsed.message || 'Turnitin live scan failed');
}

async function autoLoopHumanize(text, mode = 'academic_turnitin', env = {}) {
  const numParagraphs = text.split(/\\r?\\n\\s*\\r?\\n/).filter(p => p.trim().length > 0).length || 1;

  const rawPass1 = await runPass1Rewrite(text, mode, env);
  const rawPass2 = await runPass2Polish(rawPass1, numParagraphs, env);
  let currentText = cleanFormattingOnly(rawPass2);
  let evaluation = analyzeSentences(currentText);

  let liveScanResult = null;
  let retries = 0;
  try {
    liveScanResult = await scanTurnitinLive(currentText);
    if (liveScanResult && (liveScanResult.class === 'ai' || liveScanResult.aiRateResult?.Turnitin > 0.40)) {
      const flagged = liveScanResult.sentences?.filter(s => s.generated_prob > 0.45) || [];
      for (const f of flagged.slice(0, 2)) {
        try {
          retries++;
          const fixed = await rehumanizeSentence(f.sentence, '', '', mode, env);
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
  } catch (e) {}

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

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Health check
    if (pathname === '/api/health' || pathname === '/api/humanizer/health' || pathname === '/humanizer/health') {
      return new Response(JSON.stringify({ status: 'ok', server: 'ai-humanizer-worker', time: new Date().toISOString() }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // SPA UI
    if ((request.method === 'GET' || request.method === 'HEAD') &&
        (pathname === '/humanizer' || pathname === '/humanizer/' || pathname === '/humanizer/index.html' || pathname === '/')) {
      if (request.method === 'HEAD') {
        return new Response(null, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders } });
      }
      return new Response(HTML_CONTENT, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          ...corsHeaders
        }
      });
    }

    // API: Analyze Heatmap
    if (request.method === 'POST' && (pathname === '/api/analyze-heatmap' || pathname === '/api/humanizer/analyze-heatmap')) {
      try {
        const { text } = await request.json();
        const evaluation = analyzeSentences(text || '');
        return new Response(JSON.stringify({ evaluation }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // API: Auto Loop Humanize
    if (request.method === 'POST' && (pathname === '/api/auto-loop-humanize' || pathname === '/api/humanizer/auto-loop-humanize')) {
      try {
        const { text, mode } = await request.json();
        const result = await autoLoopHumanize(text || '', mode || 'academic_turnitin', env);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // API: Live Scan Turnitin
    if (request.method === 'POST' && (pathname === '/api/live-scan-turnitin' || pathname === '/api/humanizer/live-scan-turnitin')) {
      try {
        const { text } = await request.json();
        const liveData = await scanTurnitinLive(text || '');
        return new Response(JSON.stringify({ liveData }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // API: Rehumanize Sentence
    if (request.method === 'POST' && (pathname === '/api/rehumanize-sentence' || pathname === '/api/humanizer/rehumanize-sentence')) {
      try {
        const { sentence, contextBefore, contextAfter, mode } = await request.json();
        const rewritten = await rehumanizeSentence(sentence, contextBefore, contextAfter, mode || 'academic_turnitin', env);
        return new Response(JSON.stringify({ rewritten }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
};
`;

fs.writeFileSync(path.join(__dirname, 'worker.js'), workerCode, 'utf8');
console.log('worker.js generated successfully (' + workerCode.length + ' bytes)');
