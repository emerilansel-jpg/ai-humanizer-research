const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, 'engine', 'index.html'), 'utf8');

const workerCode = `// AI Humanizer Cloudflare Worker
// Production deployment for jdpwriter.com/humanizer*
// Calibrated for University Student Essays & Turnitin RoBERTa Bypass

const HTML_CONTENT = ${JSON.stringify(html)};

function sanitizeInputSuperhumanizer(text) {
  if (!text) return '';
  let t = text;
  t = t.replace(/[\\u200B-\\u200D\\uFEFF]/g, '');
  t = t.replace(/[\\u2018\\u2019]/g, "'").replace(/[\\u201C\\u201D]/g, '"');
  t = t.replace(/[\\u2013\\u2014]/g, '-');
  t = t.replace(/\\u2026/g, '...');
  t = t.replace(/^([ \\t]*)[•◦▪▫●■□‣⁃∙]\\s*/gm, '$1- ');
  t = t.replace(/[ \\t]+/g, ' ').replace(/\\n{3,}/g, '\\n\\n').trim();
  return t;
}

function replaceSentenceFuzzy(fullText, targetSentence, replacement) {
  if (!targetSentence || !replacement) return fullText;
  if (fullText.includes(targetSentence)) {
    return fullText.replace(targetSentence, replacement);
  }
  const cleanT = targetSentence.replace(/[\\u2018\\u2019]/g, "'").replace(/[\\u201C\\u201D]/g, '"').replace(/\\s+/g, ' ').trim();
  const paragraphs = fullText.split(/\\r?\\n\\s*\\r?\\n/);
  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const rawSents = paragraphs[pIdx].match(/[^.!?]+[.!?]+(?:\\s+|$)/g) || [paragraphs[pIdx]];
    for (let sIdx = 0; sIdx < rawSents.length; sIdx++) {
      const s = rawSents[sIdx].trim();
      const cleanS = s.replace(/[\\u2018\\u2019]/g, "'").replace(/[\\u201C\\u201D]/g, '"').replace(/\\s+/g, ' ').trim();
      if (cleanS === cleanT || cleanS.includes(cleanT) || cleanT.includes(cleanS)) {
        paragraphs[pIdx] = paragraphs[pIdx].replace(s, replacement);
        return paragraphs.join('\\n\\n');
      }
    }
  }
  return fullText;
}

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
  { pattern: /\\bit\\s+is\\s+worth\\s+noting\\s+that\\s+/gi, replace: '' },
  { pattern: /\\bit\\s+is\\s+important\s+to\s+note\s+that\s+/gi, replace: '' },
  { pattern: /\\bserves?\\s+as\\s+a\\s+(?:cornerstone|foundation|beacon|catalyst)\\s+for\\b/gi, replace: 'underpins' },
  { pattern: /\\bmisery\\s+of\\s+(?:being|nighttime)\\s+wakefulness\\b/gi, replace: 'frustration of staying awake' },
  { pattern: /\\bthe\\s+misery\\s+of\\b/gi, replace: 'the frustration of' },
  { pattern: /\\bphysical\\s+relaxation\\b/gi, replace: 'easing physical tension' },
  { pattern: /\\bmental\\s+(?:distraction|link|connection)\\b/gi, replace: 'focus shift' },
  { pattern: /\\bconditioned\\s+link\\b/gi, replace: 'mental habit' },
  { pattern: /\\bsignal\\s+to\\s+your\\s+body\\b/gi, replace: 'cue for the body' },
  { pattern: /\\bleverage(?:s|d|ing)?\\b/gi, replace: 'use' },
  { pattern: /\\brobust\\b/gi, replace: 'solid' },
  { pattern: /\\brealm\\s+of\\b/gi, replace: 'field of' },
  { pattern: /\\bnavigate(?:\\s+the)?\\b/gi, replace: 'handle' },
  { pattern: /\\bvibrant\\b/gi, replace: 'active' },
  { pattern: /\\bshowcase(?:s|d|ing)?\\b/gi, replace: 'show' },
  { pattern: /\\bemerged\\s+as\\b/gi, replace: 'became' },
  { pattern: /\\bat\\s+its\\s+core,?\\s*/gi, replace: 'basically, ' },
  { pattern: /\\bwhen\\s+it\\s+comes\\s+to\\b/gi, replace: 'for' },
  { pattern: /\\bevolving\\s+landscape\\b/gi, replace: 'current trends' },
  { pattern: /\\bfast-paced\\s+world\\b/gi, replace: 'modern society' },
  { pattern: /\\bcomes\\s+with\\s+trade-offs\\b/gi, replace: 'has drawbacks' },
  { pattern: /\\bwide\\s+range\\s+of\\b/gi, replace: 'many' },
  { pattern: /\\binterplay\\s+between\\b/gi, replace: 'link between' },
  { pattern: /\\bopen(?:s|ed|ing)?\\s+fresh\\s+paths\\s+for\\s+critical\\s+inquiry\\b/gi, replace: 'help research' },
  { pattern: /\\bspark(?:s|ed|ing)?\\s+(?:major|unprecedented)?\\s*intellectual\\s+breakthroughs\\b/gi, replace: 'assist discovery' },
  { pattern: /\\bpaving\\s+the\\s+way\\s+for\\b/gi, replace: 'enabling' },
  { pattern: /\\breshaping\\s+university\\s+campuses\\b/gi, replace: 'changing classrooms' },
  { pattern: /\\balgorithms\\b/gi, replace: 'software' },
  { pattern: /\\badministrative\\s+workflows?\\b/gi, replace: 'office records' },
  { pattern: /\\bindividual\\s+learners\\b/gi, replace: 'each student' },
  { pattern: /\\bpedagogical\\s+(?:outcomes?|methodolog(?:y|ies))\\b/gi, replace: 'course grades' },
  { pattern: /\\bpedagogical\\s+transformation\\b/gi, replace: 'changes in teaching' },
  { pattern: /\\bhuman\\s+ingenuity\\b/gi, replace: 'human effort' },
  { pattern: /\\bcritical\\s+inquiry\\b/gi, replace: 'research' },
  { pattern: /\\bintellectual\\s+breakthroughs\\b/gi, replace: 'discoveries' },
  { pattern: /\\bdelve(?:s|d|ing)?\\s+into\\s+novel\\s+paradigms\\b/gi, replace: 'explore new methods' },
  { pattern: /\\bcontemporary\\s+educational\\s+methodology\\b/gi, replace: 'classroom teaching' }
];

function mechanicalClean(text) {
  const paragraphs = text.split(/\\r?\\n\\s*\\r?\\n/);
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
    cleaned: cleanedParas.join('\\n\\n'),
    replacementCount: replacedList.length,
    replacedList
  };
}

function cleanFormattingOnly(text) {
  if (!text) return '';
  const paragraphs = text.split(/\\r?\\n\\s*\\r?\\n/);
  const cleanedParas = paragraphs.map(para => {
    let cleaned = para;
    // 1. Remove em-dashes and en-dashes
    cleaned = cleaned.replace(/\\s*—\\s*/g, ', ');
    cleaned = cleaned.replace(/\\s*–\\s*/g, ', ');

    // 2. Strip connective openers
    cleaned = cleaned.replace(/(^|[.!?]\\s+)(?:Furthermore|Moreover|Additionally|Consequently|Ultimately|Notably|Importantly|In conclusion|In summary|To summarize),\\s+/gi, '$1');

    // 3. Clean trailing participial clauses
    cleaned = cleaned.replace(/,\\s+(?:thus\\s+|thereby\\s+)?highlighting\\b/gi, '. This highlights');
    cleaned = cleaned.replace(/,\\s+(?:thus\\s+|thereby\\s+)?underscoring\\b/gi, '. This underscores');
    cleaned = cleaned.replace(/,\\s+(?:thus\\s+|thereby\\s+)?demonstrating\\b/gi, '. This demonstrates');
    cleaned = cleaned.replace(/,\\s+(?:thus\\s+|thereby\\s+)?ensuring\\b/gi, '. This ensures');
    cleaned = cleaned.replace(/,\\s+(?:thus\\s+|thereby\\s+)?allowing\\b/gi, '. This allows');
    cleaned = cleaned.replace(/,\\s+(?:thus\\s+|thereby\\s+)?enabling\\b/gi, '. This enables');
    cleaned = cleaned.replace(/,\\s+(?:thus\\s+|thereby\\s+)?fostering\\b/gi, '. This promotes');

    // 3b. Strip dramatic AI one-line closers and puffery conclusions (§2, §20)
    cleaned = cleaned.replace(/(?:^|[.!?]\\s+)(?:This|Such)\\s+[\\w\\s]+\\s+shows?\\s+what\\s+(?:human\\s+ingenuity|technology|modern\\s+tools?)\\s+can\\s+achieve\\.?,?/gi, '');
    cleaned = cleaned.replace(/(?:^|[.!?]\\s+)The\\s+future\\s+of\\s+[\\w\\s]+\\s+remains?\\s+[\\w\\s]+\\.?/gi, '');
    cleaned = cleaned.replace(/(?:^|[.!?]\\s+)As\\s+technology\\s+continues\\s+to\\s+evolve,\\s*[\\w\\s]+\\.?/gi, '');

    // 3c. Strip infinitive staging openers (§1)
    cleaned = cleaned.replace(/(^|[.!?]\\s+)To\\s+(?:speed\\s+up|optimize|enhance|boost|improve|streamline)\\s+[^,]+,\\s*/gi, '$1');

    // 4. Clean punctuation & spaces
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
      passed: turnitinWordPercent <= 20,
      score: turnitinWordPercent + '% AI'
    },
    zerogpt: {
      name: 'ZeroGPT',
      passed: zeroGptWordPercent <= 20,
      score: zeroGptWordPercent + '%'
    },
    gptzero: {
      name: 'GPTZero',
      passed: overallAiPercent <= 20,
      score: overallAiPercent + '%'
    },
    copyleaks: {
      name: 'CopyLeaks',
      passed: overallAiPercent <= 20,
      score: overallAiPercent <= 20 ? 'Human' : 'AI'
    },
    writer: {
      name: 'Writer',
      passed: overallAiPercent <= 20,
      score: overallAiPercent <= 20 ? 'Pass' : 'Flagged'
    },
    originality: {
      name: 'Originality.ai',
      passed: overallAiPercent <= 25,
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

async function callLLM(systemPrompt, userPrompt, temperature = 0.85, freqPenalty = 0.22, env = {}) {
  const apiKey = env.PESATROUTER_API_KEY || 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';
  const url = env.PESATROUTER_URL || 'https://api.pesatrouter.com/v1/chat/completions';
  const models = [env.PESATROUTER_MODEL || 'pesat-flash', 'pesat-lite', 'pesat-pro'];

  let lastErr = null;
  for (const model of models) {
    try {
      const payload = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        frequency_penalty: freqPenalty,
        presence_penalty: 0.15,
        max_tokens: 550
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
      if (content) return content;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error('All neural models failed');
}

async function runPass1Rewrite(text, mode = 'universal', env = {}) {
  const numParagraphs = text.split(/\\r?\\n\\s*\\r?\\n/).filter(p => p.trim().length > 0).length || 1;

  let systemPrompt = '';
  let userPrompt = '';

  if (mode === 'academic_turnitin' || mode === 'academic' || mode === 'turnitin') {
    systemPrompt = 'You are an authentic university undergraduate student and researcher. You write natural, direct prose with short declarative clauses, diverse sentence lengths, zero em-dashes, and zero AI signposts.';
    userPrompt = \`Decompose and rewrite the following academic passage into direct, clean prose as an undergraduate student writing a research term paper. Your goal is to explain the core concepts completely while breaking transformer sequence detection patterns (Turnitin / RoBERTa) and sliding-window perplexity (ZeroGPT).

FEW-SHOT GOLD STANDARD EXAMPLE:
Original:
"Artificial intelligence plays a pivotal role in the transformation of modern higher education. In today’s rapidly evolving digital landscape, universities are increasingly adopting automated machine learning systems to optimize administrative workflows and enhance pedagogical outcomes. Furthermore, adaptive algorithms foster personalized learning by continuously tracking individual student metrics and dynamically tailoring curricular materials. It is important to note that these computational frameworks serve as a cornerstone for contemporary educational methodology, thereby ensuring that students receive targeted feedback in real time. Moreover, the integration of generative AI delves into novel paradigms of research and critical inquiry, paving the way for unprecedented intellectual breakthroughs. In conclusion, while algorithmic assessment presents certain ethical dilemmas regarding data privacy and academic integrity, its capacity to enhance pedagogical equity remains undeniable."

Target Paratactic Human Rewrite:
"Universities now depend on automation. College registrars use software to process student records and track grades. Software flags difficult problem sets and updates reading lists automatically. The software responds to individual needs.

Generative tools help researchers summarize journal articles. Automated grading still worries privacy advocates. University guidelines lag behind new releases."

MANDATORY RULES:
1. PRESERVE 100% CONTENT & CONCEPTS:
   - Keep all technical mechanisms, numbers, dates, and facts accurate. Do NOT invent external authors or citations.
   - Maintain the exact \${numParagraphs} paragraph(s) separated by a blank line.
2. DE-NOMINALIZE & CONCRETIZE:
   - Use concrete human or organizational actors (e.g. 'College registrars', 'Network engineers', 'Biologists', 'Bank governors', 'Generals', 'Doctors').
   - NEVER use abstract nominalizations as sentence subjects (do NOT write 'Transformation occurs', 'Lattice primitives evaluate', 'Monetary policy tools foster').
   - State one clear action per sentence: [Specific Actor] [Direct Active Verb] [Concrete Object].
3. SHORT DECLARATIVE CLAUSES & BURSTINESS (5 to 14 words per sentence):
   - Every paragraph MUST include at least one very short sentence (3 to 6 words).
   - Mix short punchy statements with clear explanations.
4. ABSOLUTE BANS:
   - Strictly NO concluding moral reflections. Stop immediately once the final concrete point is made.
   - Strictly NO infinitive purpose tails (never end sentences with 'to steady the economy', 'to enhance outcomes', 'to optimize workflows'). State the direct action instead.
   - BAN AI buzzwords: pivotal, cornerstone, foster, delve, tapestry, testament, seamlessly, unprecedented, utilize, landscape, interplay, vibrant, leverage, robust, at its core.
   - BAN staged syntax: NO infinitive openers ('To speed up X...'), NO 'not only X but also Y', NO 'rather than X, Y', NO forced triads.
   - NO em-dashes (—). NO connective openers (Furthermore, Moreover, Additionally, Consequently, In conclusion, Notably).
   - Exactly 3 to 4 short sentences per paragraph. Maximum 8 sentences total.

Original Text:
\${text}

Respond ONLY with the rewritten text:\`;
  } else if (mode === 'conversational_zerogpt' || mode === 'zerogpt') {
    systemPrompt = 'You are an authentic writer sharing a grounded experiential observation. You write with natural human cadence, high burstiness, and zero robotic advice templates.';
    userPrompt = \`Rewrite the following text into natural, grounded prose that evades ZeroGPT and transformer sequence classifiers.

CRITICAL RULES FOR ZEROGPT BYPASS:
1. BAN GENERIC CHATGPT ADVICE TEMPLATES:
   - Do NOT write second-person commands ('You have to...', 'You should...', 'Do X until you feel...', 'Stand up...', 'Get up...').
   - Do NOT write clichéd psychological summaries ('The goal is to break the mental link...', 'Once you combine X with Y, it signals your body to...').
2. USE GROUNDED SITUATIONAL OR FIRST-PERSON CADENCE:
   - Use either first-person experience ('I tossed and turned for twenty minutes before climbing out of bed...') or direct situational description ('Clinical sleep rules enforce a strict twenty-minute cutoff. Sleepers get out of bed immediately...').
   - Anchor to concrete nouns: alarm clock, mattress, living room chair, dim lamp, paperback.
3. HIGH BURSTINESS:
   - Mix punchy 3-5 word sentences with natural 12-18 word sentences.
4. ABSOLUTE BANS:
   - ZERO em-dashes (—). ZERO participial -ing tails (', highlighting...', ', allowing...').
   - Keep all facts, numbers (20 minutes), and core logic 100% accurate.
   - Maintain the exact \${numParagraphs} paragraph(s) separated by a blank line.

Text to rewrite:
\${text}

Respond ONLY with the rewritten text:\`;
  } else {
    systemPrompt = 'You are an expert human writer and editor. You write natural, grounded, practical English that sounds completely human, carries high burstiness, and evades transformer sequence classifiers (Turnitin, ZeroGPT, GPTZero).';
    userPrompt = \`Humanize and rewrite the following text completely into direct, natural prose.

TONE & SYNTACTIC ARCHITECTURE:
- Natural, practical human voice with high burstiness: mix punchy short statements (3 to 6 words) with fluid, natural compound sentences (14 to 22 words).
- AVOID ROBOTIC MONOTONY: Never start consecutive sentences with generic plural actors (do NOT repeat 'Residents...', 'Adults...', 'Occupants...', 'Cooks...', 'Homeowners...', 'Families...').
- Use direct situational statements ('A blackout always hits when you least expect it.'), practical imperatives ('Skip candles.', 'Unplug desktop computers and television sets.'), and natural causal clauses ('because a tipped candle easily sets rugs on fire').
- Preserve 100% of the facts, numbers, timeframes (e.g. 1 gallon, 3 days, 48 hours, 40°F, 2 hours, 30 seconds), and safety rules.
- Maintain the exact \${numParagraphs} paragraph(s) separated by a blank line. If headings are present, preserve them on their own line.

ABSOLUTE BANS (Wikipedia Signs of AI & Blader Humanizer Rules):
- ZERO em-dashes (—) or en-dashes (–). Use commas, periods, or parentheses.
- ZERO participial -ing riders at sentence ends (never end with ', highlighting...', ', allowing...', ', thereby ensuring...').
- ZERO symmetrical contrasts ('not only X, but also Y', 'rather than X, Y').
- ZERO forced triads (lists of exactly 3 items). Use 1 or 2 items.
- ZERO connective openers (Never start a sentence with Furthermore, Moreover, Additionally, Consequently, In conclusion, Notably).
- ZERO ChatGPT ending clichés (Never write 'It just takes a little preparation...', 'With a little planning, you will ride it out...', 'This proves what human ingenuity...'). End directly on the final practical fact.
- ZERO AI buzzwords (pivotal, testament, tapestry, delve, foster, navigate, landscape, utilize, crucial role, realm of).

Text to humanize:
\${text}

Respond ONLY with the rewritten text:\`;
  }

  return callLLM(systemPrompt, userPrompt, 0.82, 0.22, env);
}

async function runPass2Polish(draft, numParagraphs, env) {
  const systemPrompt = 'You are an expert human copy editor refining a draft for maximum natural flow and zero AI detection patterns.';
  const userPrompt = \`Review and polish the draft below.
- Ensure at least one punchy 3-6 word sentence in every paragraph to enforce high burstiness.
- Break up any sentence longer than 22 words into two natural sentences.
- Check that no consecutive sentences start with the same noun or pronoun.
- Remove any remaining em-dashes (—), participial -ing riders, or connective openers (Furthermore, Moreover, Additionally).
- Remove any moralizing concluding summary sentence. Stop cleanly on the final concrete instruction.
- Preserve the exact \${numParagraphs} paragraph(s) separated by a blank line.

Draft:
\${draft}

Respond ONLY with the polished text:\`;

  return callLLM(systemPrompt, userPrompt, 0.72, 0.16, env);
}

async function rehumanizeSentence(sentence, contextBefore = '', contextAfter = '', mode = 'universal', env = {}) {
  const systemPrompt = 'You are an expert sentence copy editor. Return only the replacement sentence written in natural human prose with zero AI tells.';
  const userPrompt = \`Rewrite ONLY the target sentence to sound completely human, organic, and bypass transformer sequence classifiers (Turnitin / RoBERTa).
Maintain seamless narrative flow with surrounding context.

CONTEXT BEFORE: "\${contextBefore}"
TARGET SENTENCE TO REWRITE: "\${sentence}"
CONTEXT AFTER: "\${contextAfter}"

RULES:
- Return ONLY the rewritten replacement sentence without quotes or introductory text.
- Write a direct, natural 6-12 word statement: [Actor/Action] [Direct Verb] [Object].
- NO participial -ing tails (never end with ', highlighting...', ', thereby ensuring...').
- NO connective openers ('Furthermore,', 'Moreover,', 'Additionally,').
- NO 'not only X, but also Y' or 'rather than X, Y'.
- NO em-dashes (—).
- Do NOT repeat the context before or after.\`;

  return callLLM(systemPrompt, userPrompt, 0.82, 0.20, env);
}

async function scanTurnitinLive(text) {
  const cleanText = text.replace(/^##\\s+/gm, '');
  const res = await fetch('https://www.turnitindetector.ai/bff/detect', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://www.turnitindetector.ai',
      'Referer': 'https://www.turnitindetector.ai/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
    },
    body: JSON.stringify({ text: cleanText })
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

async function scanZeroGptLive(text) {
  const res = await fetch('https://api.zerogpt.com/api/detect/detectText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'https://www.zerogpt.com',
      'Referer': 'https://www.zerogpt.com/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    },
    body: JSON.stringify({ input_text: text })
  });

  if (!res.ok) {
    throw new Error('ZeroGPT detector responded with status ' + res.status);
  }
  const parsed = await res.json();
  if (parsed.success && parsed.data) {
    return parsed.data;
  }
  throw new Error(parsed.message || 'ZeroGPT live scan failed');
}

async function autoLoopHumanize(rawInput, mode = 'universal', env = {}) {
  const text = sanitizeInputSuperhumanizer(rawInput);
  const numParagraphs = text.split(/\\r?\\n\\s*\\r?\\n/).filter(p => p.trim().length > 0).length || 1;

  // Pass 1: High-Speed Mode-Adaptive Neural Reconstruction
  const rawPass1 = await runPass1Rewrite(text, mode, env);

  // Fast Formatting & Punctuation Sanitize (Preserves \\n\\n)
  let currentText = cleanFormattingOnly(rawPass1);
  currentText = mechanicalClean(currentText).cleaned;
  currentText = cleanFormattingOnly(currentText);

  let retries = 0;
  let liveScanResult = null;
  let zeroGptScanResult = null;

  // Live Closed-Loop Verification: Targeted polish for flagged sentences (Turnitin + ZeroGPT + Local Heuristics)
  for (let loop = 0; loop < 2; loop++) {
    const localEval = analyzeSentences(currentText);
    let turnitinFlagged = [];
    let zeroGptFlagged = [];

    const [tRes, zRes] = await Promise.allSettled([
      scanTurnitinLive(currentText),
      scanZeroGptLive(currentText)
    ]);

    if (tRes.status === 'fulfilled' && tRes.value) {
      liveScanResult = tRes.value;
      const turnitinRate = liveScanResult?.aiRateResult?.Turnitin || 0;
      if (liveScanResult.class === 'ai' || turnitinRate > 0.20) {
        turnitinFlagged = (liveScanResult.sentences || [])
          .filter(s => (s.generated_prob > 0.15 || s.class === 'ai') && s.sentence.trim().length > 10)
          .map(s => s.sentence);
      }
    }

    if (zRes.status === 'fulfilled' && zRes.value) {
      zeroGptScanResult = zRes.value;
      if (zeroGptScanResult.fakePercentage > 15 && Array.isArray(zeroGptScanResult.h)) {
        zeroGptFlagged = zeroGptScanResult.h.filter(s => typeof s === 'string' && s.trim().length > 10);
      }
    }

    const localFlagged = localEval.sentences
      .filter(s => s.status === 'ai' && s.text.length > 10)
      .map(s => s.text);

    const allFlaggedSet = new Set([...turnitinFlagged, ...zeroGptFlagged, ...localFlagged]);
    const flaggedList = Array.from(allFlaggedSet).slice(0, 2);

    if (flaggedList.length === 0) {
      break;
    }

    retries += flaggedList.length;

    for (const sentence of flaggedList) {
      try {
        const rawFixed = await rehumanizeSentence(sentence, '', '', mode, env);
        const fixed = rawFixed.replace(/^["'\\s]+|["'\\s]+$/g, '').split('\\n').filter(l => l.trim().length > 0).pop()?.trim() || '';
        if (fixed && fixed.length > 5) {
          currentText = replaceSentenceFuzzy(currentText, sentence, cleanFormattingOnly(fixed));
        }
      } catch (err) {}
    }

    currentText = cleanFormattingOnly(currentText);
    currentText = mechanicalClean(currentText).cleaned;
    break;
  }

  // Rescan final output if modifications occurred
  if (retries > 0) {
    try {
      const [tFinal, zFinal] = await Promise.allSettled([
        scanTurnitinLive(currentText),
        scanZeroGptLive(currentText)
      ]);
      if (tFinal.status === 'fulfilled' && tFinal.value) liveScanResult = tFinal.value;
      if (zFinal.status === 'fulfilled' && zFinal.value) zeroGptScanResult = zFinal.value;
    } catch (e) {}
  }

  const metrics = calculateMetrics(currentText);
  const evaluation = analyzeSentences(currentText);
  const fidelity = checkFidelity(text, currentText);

  if (zeroGptScanResult) {
    evaluation.detectors.zerogpt = {
      name: 'ZeroGPT (Official Live)',
      passed: zeroGptScanResult.fakePercentage <= 20,
      score: zeroGptScanResult.fakePercentage + '% AI',
      feedback: zeroGptScanResult.feedback
    };
    evaluation.zeroGptScore = zeroGptScanResult.fakePercentage;
  }

  return {
    rewritten: currentText,
    metrics,
    evaluation,
    fidelity,
    retryTries: retries,
    liveScanResult,
    zeroGptScanResult
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
