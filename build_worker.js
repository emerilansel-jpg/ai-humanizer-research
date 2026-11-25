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
  // 1. Remove hidden zero-width unicode, tag characters, & Layer A watermarks (full RFC/Unicode 14 set)
  t = t.replace(/[\\u00AD\\u034F\\u061C\\u115F\\u1160\\u17B4\\u17B5\\u180B-\\u180F\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u206F\\u3164\\uFEFF\\uFE00-\\uFE0F\\uFFA0\\uFFF9-\\uFFFB]|\\uDB40[\\uDC01-\\uDC7F]/gu, '');
  // 1b. Normalize space homoglyphs (NBSP, Ogham, quad, en/em, figure, thin, hair, narrow, mathematical, ideographic)
  t = t.replace(/[\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000]/g, ' ');
  t = t.replace(/[\\u2018\\u2019]/g, "'").replace(/[\\u201C\\u201D]/g, '"');
  t = t.replace(/[\\u2013\\u2014]/g, '-');
  t = t.replace(/\\u2026/g, '...');
  t = t.replace(/^([ \\t]*)[•◦▪▫●■□‣⁃∙]\\s*/gm, '$1- ');
  t = t.replace(/[ \\t]+/g, ' ').replace(/\\n{3,}/g, '\\n\\n').trim();
  return t;
}

function replaceSentenceFuzzy(fullText, targetSentence, replacement) {
  if (!targetSentence || !replacement) return fullText;
  let repl = replacement.trim();
  if (/[.!?]$/.test(targetSentence.trim()) && !/[.!?]$/.test(repl)) {
    repl += '.';
  }
  if (fullText.includes(targetSentence)) {
    return fullText.replace(targetSentence, repl);
  }
  const cleanT = targetSentence.replace(/[\\u2018\\u2019]/g, "'").replace(/[\\u201C\\u201D]/g, '"').replace(/\\s+/g, ' ').trim();
  const paragraphs = fullText.split(/\\r?\\n\\s*\\r?\\n/);
  for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
    const rawSents = paragraphs[pIdx].match(/[^.!?]+[.!?]+(?:\\s+|$)/g) || [paragraphs[pIdx]];
    for (let sIdx = 0; sIdx < rawSents.length; sIdx++) {
      const s = rawSents[sIdx].trim();
      const cleanS = s.replace(/[\\u2018\\u2019]/g, "'").replace(/[\\u201C\\u201D]/g, '"').replace(/\\s+/g, ' ').trim();
      if (cleanS === cleanT || cleanS.includes(cleanT) || cleanT.includes(cleanS)) {
        paragraphs[pIdx] = paragraphs[pIdx].replace(s, repl);
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
  { pattern: /\\bit\\s+is\\s+important\\s+to\\s+note\\s+that\\s+/gi, replace: '' },
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
  { pattern: /\\bcontemporary\\s+educational\\s+methodology\\b/gi, replace: 'classroom teaching' },
  { pattern: /\\bdiverse\\s+student\\s+cohorts?\\b/gi, replace: 'different classes' },
  { pattern: /\\bpedagogical\\s+paradigms?\\b/gi, replace: 'teaching styles' },
  { pattern: /\\bbalance\\s+passing\s+rates\\s+across\\b/gi, replace: 'improve grades in' },
  { pattern: /\\bcomplex\\s+confluence\\s+of\\b/gi, replace: 'mix of' },
  { pattern: /\\bfundamental\\s+tenets?\\s+of\\b/gi, replace: 'basics of' },
  { pattern: /\\bdigital\\s+ecosystem\\b/gi, replace: 'network' },
  { pattern: /\\bcyber\\s+ecosystem\\b/gi, replace: 'network environment' },
  { pattern: /\\bexistential\\s+vulnerabilities\\b/gi, replace: 'fatal flaws' },
  { pattern: /\\bprofound\\s+implications\\b/gi, replace: 'deep effects' },
  { pattern: /\\benduring\\s+testament\\b/gi, replace: 'clear proof' },
  { pattern: /\\bunprecedented\\s+promise\\b/gi, replace: 'real potential' },
  { pattern: /\\bnuanced\\s+understanding\\b/gi, replace: 'clear grasp' },
  { pattern: /\\bacross\\s+modern\\s+economies\\b/gi, replace: 'in modern markets' },
  { pattern: /\\bstandard\\s+policy\\s+levers\\b/gi, replace: 'monetary tools' },
  { pattern: /\\bcore\\s+policy\\s+tools\\b/gi, replace: 'key rates' },
  { pattern: /\\bdrain\\s+surplus\\s+liquidity\\b/gi, replace: 'pull cash' },
  { pattern: /\\btransparent\\s+public\\s+forward\\s+guidance\\b/gi, replace: 'clear announcements' },
  { pattern: /\\bsovereign\\s+debt\\s+sustainability\\b/gi, replace: 'treasury solvency' },
  // Patterns integrated from watermarks-remover (score_stylometry.py)
  { pattern: /\\bmultifaceted\\s+(?:nature|approach|landscape|aspects?)\\b/gi, replace: 'diverse angles' },
  { pattern: /\\bharness(?:ing|ed|es)?\\s+the\\s+power\\s+of\\b/gi, replace: 'using' },
  { pattern: /\\ba\\s+myriad\\s+of\\b/gi, replace: 'many' },
  { pattern: /\\bparadigm\\s+shift\\b/gi, replace: 'major shift' },
  { pattern: /\\bholistic\\s+(?:approach|view|perspective)\\b/gi, replace: 'broad view' },
  { pattern: /\\bnavigat(?:e|ing|es|ed)\\s+the\\s+(?:complexities|intricacies|nuances)\\b/gi, replace: 'handling the challenges' },
  { pattern: /\\bmark(?:s|ing)?\\s+an?\\s+(?:indelible|pivotal|significant|new)\\s+(?:moment|chapter|milestone)\\b/gi, replace: 'marking a key step' },
  { pattern: /\\bgame[- ]changer\\b/gi, replace: 'breakthrough' }
];

function cleanSentencePunct(text) {
  let cleaned = text;
  // 0. Remove Layer A invisible Unicode watermarks & space homoglyphs (Google SynthID / Steganography)
  cleaned = cleaned.replace(/[\\u00AD\\u034F\\u061C\\u115F\\u1160\\u17B4\\u17B5\\u180B-\\u180F\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u206F\\u3164\\uFEFF\\uFE00-\\uFE0F\\uFFA0\\uFFF9-\\uFFFB]|\\uDB40[\\uDC01-\\uDC7F]/gu, '');
  cleaned = cleaned.replace(/[\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000]/g, ' ');

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

  // 3d. Break up comparative ', while' clauses that trigger sequence classifiers
  cleaned = cleaned.replace(/,\\s+while\\s+([a-z])/gi, (_, c) => '. ' + c.toUpperCase());

  // 4. Clean punctuation & spaces
  cleaned = cleaned.replace(/[ \\t]+,/g, ',');
  cleaned = cleaned.replace(/,\\s*,+/g, ',');
  cleaned = cleaned.replace(/\\.\\s*\\./g, '.');
  cleaned = cleaned.replace(/,\\s*\\./g, '.');
  cleaned = cleaned.replace(/[ \\t]{2,}/g, ' ');

  return fixSentenceCapitalization(cleaned);
}

function cleanLine(line) {
  if (!line || !line.trim()) return '';

  const headMatch = line.match(/^(\\s*#{1,6}\\s+)(.*)$/);
  if (headMatch) {
    const titleText = headMatch[2].trim();
    const sents = titleText.match(/[^.!?]+[.!?]+(?:\\s+|$)/g);
    if (sents && sents.length > 1) {
      return headMatch[1] + cleanSentencePunct(sents[0].trim()) + '\\n\\n' + sents.slice(1).map(s => cleanSentencePunct(s.trim())).join(' ');
    }
    return headMatch[1] + cleanSentencePunct(titleText);
  }

  const listMatch = line.match(/^(\\s*(?:[-*•▪◦‣→✓✔➤►]|\\(?\\d{1,3}(?:\\.\\d{1,3})*[.)\\]]|\\(?[a-zA-Z][.)\\]])\\s+)(.*)$/);
  if (listMatch) {
    return listMatch[1] + cleanSentencePunct(listMatch[2]);
  }

  return cleanSentencePunct(line);
}

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
    const lines = cleaned.split(/\\r?\\n/);
    return lines.map(cleanLine).join('\\n');
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
    const lines = para.split(/\\r?\\n/);
    return lines.map(cleanLine).join('\\n');
  });
  return cleanedParas.join('\\n\\n').trim();
}

function fixSentenceCapitalization(text) {
  let cleaned = text.replace(/^[,\\s;:]+/, '');
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
  { regex: /\\bsignal\\s+to\\s+your\\s+body\\b/i, reason: 'Instructional clichéd phrasing' },
  { regex: /\\b(?:nuanced|delicate\\s+balance|worth\\s+considering|on\\s+the\\s+other\\s+hand)\\b/i, reason: 'Claude / Anthropic stylistic hedge' },
  { regex: /\\b(?:ethical\\s+implications|holistic\\s+view|important\\s+to\\s+bear\\s+in\\s+mind)\\b/i, reason: 'Claude / Anthropic didactic framing' },
  { regex: /\\b(?:here's\\s+a\\s+breakdown|at\\s+its\\s+heart|crucial\\s+to\\s+understand)\\b/i, reason: 'Google Gemini / SynthID formulaic cadence' },
  { regex: /\\bmultifaceted\\s+(?:nature|approach|landscape)\\b/i, reason: 'AI cliché: multifaceted' },
  { regex: /\\bharness(?:ing|ed|es)?\\s+the\\s+power\\s+of\\b/i, reason: 'AI cliché: harness the power of' },
  { regex: /\\ba\\s+myriad\\s+of\\b/i, reason: 'AI stock phrase: myriad of' },
  { regex: /\\bparadigm\\s+shift\\b/i, reason: 'AI buzzword: paradigm shift' },
  { regex: /\\bholistic\\s+(?:approach|view|perspective)\\b/i, reason: 'AI cliché: holistic' },
  { regex: /\\bnavigat(?:e|ing|es|ed)\\s+the\\s+(?:complexities|intricacies)\\b/i, reason: 'AI cliché: navigate complexities' }
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
    const isHeading = /^(?:#{1,6}\\s+|[A-Z0-9][\\w\\s,':-]{2,80}\\?\\s*$)/.test(para.trim());
    const rawSentences = para.match(/[^.!?]+[.!?]+(?:\\s+|$)/g) || [para];
    const paraSentences = rawSentences.map(s => {
      const trimmed = s.trim();
      if (!trimmed) return null;
      const isList = /^\\s*(?:[-*•▪◦‣→✓✔➤►]|\\(?\\d{1,3}[.)\\]]|\\(?[a-zA-Z][.)\\]])\\s+/.test(trimmed);
      const words = trimmed.split(/\\s+/).filter(Boolean).length;
      totalWords += words;

      let score = 0;
      const reasons = [];

      AI_FORMULAS.forEach(({ regex, reason }) => {
        if (regex.test(trimmed)) {
          score += 35;
          reasons.push(reason);
        }
      });

      if (words > 28) {
        score += 20;
        reasons.push('Long uniform clause (>28 words)');
      } else if (words > 22 && reasons.length > 0) {
        score += 10;
      } else if (words < 9 && reasons.length === 0) {
        score -= 5;
      }

      const hasContraction = /\\b[a-z]+'t\\b|\\b[a-z]+'re\\b|\\b[a-z]+'s\\b|\\b[a-z]+'ve\\b|\\b[a-z]+'ll\\b/i.test(trimmed);
      if (hasContraction) score -= 10;

      if (/\\b(?:19|20)\\d{2}\\b|\\b\\d+%\\b|\\[\\d+\\]|\\(\\w+,\\s*\\d{4}\\)/.test(trimmed)) {
        score -= 10;
      }

      let status = 'human';
      if (score >= 35) {
        status = 'ai';
        aiWords += words;
      } else if (score >= 15) {
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
        isHeading,
        isList,
        reasons
      };

      allSentences.push(sentObj);
      return sentObj;
    }).filter(Boolean);

    return { paragraphIndex: pIdx, isHeading, sentences: paraSentences };
  });

  const total = totalWords || 1;
  const overallAiPercent = Math.round((aiWords / total) * 100);
  const mixedPercent = Math.round((mixedWords / total) * 100);
  const humanPercent = Math.max(0, 100 - overallAiPercent - mixedPercent);

  const turnitinWordPercent = overallAiPercent;
  const zeroGptWordPercent = Math.min(100, Math.round(overallAiPercent + (mixedPercent * 0.2)));

  const lengths = allSentences.map(s => s.words);
  const meanLen = lengths.reduce((a, b) => a + b, 0) / (lengths.length || 1);
  const variance = lengths.reduce((acc, l) => acc + Math.pow(l - meanLen, 2), 0) / (lengths.length || 1);
  const burstiness = Math.sqrt(variance);

  // Layer A: Check for invisible / steganographic Unicode & Space Homoglyphs (SynthID / Watermarks)
  const hasZeroWidth = /[\\u00AD\\u034F\\u061C\\u115F\\u1160\\u17B4\\u17B5\\u180B-\\u180F\\u200B-\\u200F\\u202A-\\u202E\\u2060-\\u206F\\u3164\\uFEFF\\uFE00-\\uFE0F\\uFFA0\\uFFF9-\\uFFFB]|\\uDB40[\\uDC01-\\uDC7F]/u.test(text);
  const hasExoticSpaces = /[\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000]/.test(text);

  // 1. Google SynthID Detector (Tournament hash lattice, Layer A Unicode, and Gemini cadence)
  let synthIdScore = hasZeroWidth ? 95 : (hasExoticSpaces ? 30 : 0);
  if (!hasZeroWidth) {
    const geminiTells = (text.match(/\\b(?:here's\\s+a\\s+breakdown|at\\s+its\\s+heart|when\\s+it\\s+comes\\s+to|crucial\\s+to\\s+understand|worth\\s+delving\\s+into|rapid\\s+development|testament\\s+to|in\\s+today's\\s+fast-paced|pivotal\\s+role|multifaceted|harnessing\\s+the\\s+power)\\b/gi) || []).length;
    synthIdScore += geminiTells * 15;
    if (burstiness < 3.2) synthIdScore += 15;
    else if (burstiness >= 5.0 && geminiTells === 0 && !hasExoticSpaces) synthIdScore = Math.max(0, synthIdScore - 10);
    synthIdScore += Math.round(overallAiPercent * 0.35);
  }
  synthIdScore = Math.min(100, Math.max(0, Math.round(synthIdScore)));

  // 2. ChatGPT Watermark Detector (OpenAI Kirchenbauer Token Distribution & RLHF Cliché Clustering)
  let chatgptWmScore = hasExoticSpaces ? 15 : 0;
  const rlhfTells = (text.match(/\\b(?:not\s+only\s+[^,]+,\s*but\s+also|serves\s+as\s+a|acts\s+as\s+a|stands\s+as\s+a|in\s+conclusion|furthermore|moreover|additionally|it\s+is\s+worth\s+noting|delve(?:s|d|ing)?|tapestry|fosters?|pivotal|paradigm\\s+shift|myriad\\s+of)\\b/gi) || []).length;
  chatgptWmScore += rlhfTells * 14;
  const hasContractions = /\\b[a-z]+'t\\b|\\b[a-z]+'re\\b|\\b[a-z]+'s\\b|\\b[a-z]+'ve\\b|\\b[a-z]+'ll\\b/i.test(text);
  if (!hasContractions && allSentences.length > 2) chatgptWmScore += 8;
  if (burstiness < 3.5) chatgptWmScore += 12;
  else if (burstiness >= 5.0 && rlhfTells === 0 && !hasExoticSpaces) chatgptWmScore = Math.max(0, chatgptWmScore - 10);
  chatgptWmScore += Math.round(overallAiPercent * 0.35);
  chatgptWmScore = Math.min(100, Math.max(0, Math.round(chatgptWmScore)));

  // 3. Claude Detector (Anthropic Stylistic & Epistemic Modesty Classifier)
  let claudeDetScore = 0;
  const emDashes = (text.match(/—|–/g) || []).length;
  claudeDetScore += emDashes * 25;
  const claudeHedging = (text.match(/\\b(?:nuanced|delicate\\s+balance|worth\s+considering|on\s+the\s+other\s+hand|ethical\s+implications|crucial\s+to\s+remember|holistic|important\s+to\s+bear\s+in\s+mind)\\b/gi) || []).length;
  claudeDetScore += claudeHedging * 15;
  if (emDashes === 0 && claudeHedging === 0 && burstiness >= 5.0) {
    claudeDetScore = Math.max(0, Math.round(overallAiPercent * 0.25));
  } else {
    claudeDetScore += Math.round(overallAiPercent * 0.30);
  }
  claudeDetScore = Math.min(100, Math.max(0, Math.round(claudeDetScore)));

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
    },
    synthid: {
      name: 'Google SynthID',
      passed: synthIdScore <= 20,
      score: synthIdScore <= 20 ? '✓ Clean (' + synthIdScore + '%)' : '⚠ ' + synthIdScore + '% AI'
    },
    chatgpt_wm: {
      name: 'ChatGPT Watermark',
      passed: chatgptWmScore <= 20,
      score: chatgptWmScore <= 20 ? '✓ Clean (' + chatgptWmScore + '%)' : '⚠ ' + chatgptWmScore + '% AI'
    },
    claude_det: {
      name: 'Claude Detector',
      passed: claudeDetScore <= 20,
      score: claudeDetScore <= 20 ? '✓ Clean (' + claudeDetScore + '%)' : '⚠ ' + claudeDetScore + '% AI'
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
    synthIdScore,
    chatgptWmScore,
    claudeDetScore,
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

async function callLLM(systemPrompt, userPrompt, temperature = 0.82, freqPenalty = 0.22, env = {}) {
  const apiKey = env.PESATROUTER_API_KEY || 'sk-pesat-3c2f89bd9a72302375f8e10ef9eba726891a81513f907dfb';
  const estTokens = (systemPrompt + ' ' + userPrompt).length / 4 * 1.15 + 50;
  const completionBudget = Math.max(700, Math.min(4096, Math.ceil(estTokens * 1.5) + 300));
  const url = env.PESATROUTER_URL || 'https://api.pesatrouter.com/v1/chat/completions';
  const models = [env.PESATROUTER_MODEL || 'pesat-lite', 'pesat-pro'];

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
        max_tokens: completionBudget
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

  if (mode === 'balance' || mode === 'balanced') {
    systemPrompt = 'You are an elite balanced human writer and researcher. You write with authentic human rhythm, diverse clause lengths, grounded real-world vocabulary, and zero AI formulaic patterns, optimized to achieve 0% AI simultaneously across Turnitin, ZeroGPT, GPTZero, CopyLeaks, and statistical watermarks (Google SynthID, ChatGPT watermark, Claude detector).';
    userPrompt = \`Rewrite the text below using the Universal Balanced Optimization framework.

OBJECTIVE:
Transform the input into natural, fluent human prose that achieves the highest possible human rating across ALL detectors simultaneously: Turnitin (no academic RoBERTa markers), ZeroGPT & GPTZero (high burstiness and perplexity), and watermark filters (Google SynthID token context decoupling, ChatGPT green-list neutralization, Claude stylistic removal).

DOCUMENT FORMAT & HEADING PRESERVATION:
- Preserve all titles, markdown headings (#, ##), bullet points (- / *), numbered lists, and exact paragraph breaks (\\\\n\\\\n).
- Maintain the exact \${numParagraphs} paragraph(s) separated by a blank line (\\\\n\\\\n). Never merge headings or bullet points into regular paragraphs.
- LANGUAGE: Output MUST be 100% English. If the input is Indonesian or mixed-language, translate to English first, then rewrite. Never leave any non-English words in the output.

CORE BALANCED RULES (OPTIMIZED FOR ALL DETECTORS):
1. DYNAMIC BURSTINESS & SENTENCE PACING (BEATS ZEROGPT & SYNTHID):
   - Strict sentence length ceiling: keep sentences between 5 and 18 words. Break any clause longer than 20 words into two natural sentences.
   - Mix short 3-6 word punchy statements with 14-18 word compound sentences connected with natural conjunctions (', and', ', but', ', so').
   - High burstiness target (> 5.5): alternate cadence constantly to break statistical token n-gram probability chains (eradicating Google SynthID hash chains).
2. NATURAL HUMAN VOCABULARY (BEATS CHATGPT WATERMARK & ROBERTA):
   - Replace abstract nominalizations with concrete nouns and active verbs.
   - Do NOT use repetitive templates like "Actors use X to Y". State events directly.
   - Neutralize ChatGPT green-list clustering: avoid predictable transitions and AI cliché pairings.
3. CONVERSATIONAL & SCHOLARLY BALANCE (BEATS TURNITIN & CLAUDE DETECTOR):
   - Clean, educated, objective voice (High School - University level; not thesaurus stuffing, not crude slang).
   - Use natural prepositional openers ('In practice,', 'On the hardware side,', 'Across departments,') and organic pivots ('Still,', 'Even so,').
   - Remove Anthropic/Claude hallmarks: NO excessive ethical caveats, NO "it's important to remember", NO "on one hand / on the other hand", NO didactic lecture framing.
4. ABSOLUTE BANS ACROSS ALL DETECTORS:
   - ZERO em-dashes (—) or en-dashes (–).
   - ZERO participial -ing riders at sentence ends (, highlighting..., , thereby ensuring..., , demonstrating...).
   - ZERO connective openers (Furthermore, Moreover, Additionally, Consequently, In conclusion, Notably).
   - ZERO copula avoidance (serves as, stands as, acts as a cornerstone).
   - ZERO comparative contrast staging ('not only X, but also Y', 'rather than X, Y', or ', while X does Y').
   - ZERO moralizing closing clichés ('This proves what human ingenuity...', 'With a little preparation...'). End cleanly on the final concrete fact or instruction.
   - Keep 100% of facts, data, numbers, and technical terminology completely accurate.

Original Text:
\${text}

Respond ONLY with the rewritten text:\`;
  } else if (mode === 'academic_turnitin' || mode === 'academic' || mode === 'turnitin') {
    systemPrompt = 'You are an authentic student writer and researcher. You write with natural human rhythm, concrete working parts, varied clause structures, light conversational transitions, and zero AI formulaic patterns.';
    userPrompt = \`Rewrite the academic passage below into natural, fluent human prose that evades both ZeroGPT perplexity checks and Turnitin sequence classifiers.

DOCUMENT FORMAT PRESERVATION:
- Preserve all titles, section headings (e.g. #, ##), bullet points (- / *), numbered lists, and blank lines (\\n\\n).
- Maintain the exact \${numParagraphs} paragraph(s) separated by a blank line.
- LANGUAGE: Output MUST be 100% English. If the input is Indonesian or mixed-language, translate to English first, then rewrite. Never leave any non-English words in the output.

AUTHENTIC CADENCE FEW-SHOT BENCHMARK:
"Most registrars traded physical filing cabinets for automated servers years ago. These background portals track degree prerequisites and audit graduation records on their own, leaving staff to handle edge cases. In the classroom, course platforms check quiz scores weekly to flag struggling students well before finals.

In research labs, students and faculty use generative models to sort through stacks of academic papers. Still, the quick adoption hasn't been completely smooth. Department boards spend hours debating how to update honor codes for digital tools, and campus administrators continue to push back against the amount of student data that outside platforms collect."

CORE RULES:
1. STRICT SENTENCE CEILING & DYNAMIC BURSTINESS:
   - Keep sentences between 6 and 18 words. Break up any clause longer than 20 words into two natural sentences.
   - Mix short 4-7 word punchy assertions with fluid 14-18 word explanations to guarantee high burstiness (> 5.0).
   - BAN THE SYNTHETIC "USE X TO Y" TEMPLATE: Do NOT repeatedly write "Actors use/rely on X to Y and Z" ('Advisors rely on software to catch...', 'Faculty use models to sort...'). State what happens directly with varied sentence structures.
   - Mix short 5-9 word statements with fluid 14-18 word compound sentences connected naturally with ', and', ', but', or ', so'.
   - NEVER write consecutive sentences that start with the same grammatical structure or generic plural subjects ('Universities...', 'Professors...', 'Teachers...', 'Students...').
   - Use natural prepositional starters ('In the classroom,', 'Across campus,', 'In research labs,', 'On the hardware side,') and conversational pivots ('Still,', 'Even so,', 'In practice,').
   - Include light natural contractions where appropriate (hasn't, isn't, didn't, doesn't).
2. GROUNDED CONCRETE REALIA & ACTIVE IDIOMS:
   - Replace abstract nominalizations with concrete working parts (e.g. filing cabinets, course platforms, weekly quizzes, graduation records, honor codes, department boards, packet buffers, regional server clusters, repo rates, bond yields).
   - Use natural idiomatic verbs ('trade X for Y', 'sort through', 'push back against', 'eat away at', 'scramble to', 'leave staff to handle edge cases').
3. PRESERVE 100% OF THE CONCEPTS:
   - Keep all technical terms, algorithms, facts, and numbers accurate. Do NOT invent external authors or citations.
4. ABSOLUTE BANS:
   - ZERO em-dashes (—). ZERO participial -ing riders at sentence ends (, highlighting..., , thereby ensuring...).
   - ZERO comparative contrast staging ('rather than X, Y', 'not only X, but also Y', or ', while X does Y').
   - ZERO connective openers: Furthermore, Moreover, Additionally, Consequently, In conclusion, Notably.
   - ZERO AI buzzwords: pivotal, cornerstone, foster, delve, tapestry, testament, landscape, leverage, robust, at its core, utilize.
   - ZERO moralizing concluding sentences. End directly on the final practical fact.

Original Text:
\${text}

Respond ONLY with the rewritten text:\`;
  } else if (mode === 'conversational_zerogpt' || mode === 'zerogpt') {
    systemPrompt = 'You are an authentic writer sharing a grounded experiential observation. You write with natural human cadence, high burstiness, and zero robotic advice templates.';
    userPrompt = \`Rewrite the following text into natural, grounded prose that evades ZeroGPT and transformer sequence classifiers.

DOCUMENT FORMAT PRESERVATION:
- Preserve all titles, headings, bullet lists, and exact paragraph breaks (\\n\\n).
- LANGUAGE: Output MUST be 100% English. If the input is Indonesian or mixed-language, translate to English first, then rewrite. Never leave any non-English words in the output.

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
    // Universal / General mode (Superhumanizer Blueprint - 0% ZeroGPT & <5% Turnitin)
    systemPrompt = 'You are Superhumanizer, an advanced human rewriter. You transform AI drafts into 100% authentic, natural human English that achieves 0% AI on ZeroGPT and passes Turnitin.';
    userPrompt = \`Rewrite the text below using the Superhumanizer Syntactic Blueprint.

EXACT DOCUMENT FORMAT & HEADING PRESERVATION:
- Headings & Titles: NEVER rephrase, shorten, or rewrite ANY line that starts with #, ##, ###, ####, #####, or ######. Copy it verbatim, hash prefix and level included. Keep the full original wording and word count, even if it runs long. Only forbid putting a full paragraph or multiple sentences INTO a heading.
- If the text begins with a title or question, keep it as a standalone heading on line 1 followed by a blank line (\\n\\n). Copy it verbatim, hash prefix included.
- If markdown headings (# through ######) are present, strictly preserve the hash prefix and its exact level on its own line followed by \\n\\n. Never upgrade or downgrade a heading level (### stays ###, ## stays ##).
- Bullet points (- / * / 1.) must be preserved line by line with their markers.
- Paragraphs: Maintain the exact \${numParagraphs} paragraph(s) separated by blank lines (\\n\\n). Never collapse headings or list items into regular running paragraphs.
- LANGUAGE: Output MUST be 100% English. If the input is Indonesian or mixed-language, translate to English first, then rewrite. Never leave any non-English words in the output.

SUPERHUMANIZER BLUEPRINT RULES (0% ZEROGPT & PASS TURNITIN):
1. STRICT SENTENCE CEILING & DYNAMIC BURSTINESS:
   - Keep sentences between 6 and 18 words. Break up any thought longer than 20 words into two natural sentences.
   - Avoid overlong clause chains connected with multiple prepositions or conjunctions ('because you should...', 'so you risk...').
2. VIVID SENSORY IDIOMS & PHRASAL VERBS:
   - Use direct, physical actions: 'crack open the curtains/blinds', 'isn\\'t the culprit', 'the grid is out', 'snaps into place', 'float midway', 'pull too much juice', 'free up phone lines'.
   - Speak directly to the reader: 'Don\\'t assume you have a problem with your house before calling utility', not 'Confirm the problem stops at your property line before filing an official report'.
3. DYNAMIC HUMAN DISRUPTORS (CRITICAL FOR 0% ZEROGPT):
   - Include 1 natural conversational rhetorical question ('Why check?', 'Why we need to check?', 'Why does this happen?') to disrupt statistical language model n-gram predictions.
   - Include 1 punchy short exclamation or assertion ('The switch has been tripped!', 'Check the street.').
   - Use natural contractions freely ('don\\'t', 'isn\\'t', 'it\\'s', 'won\\'t').
4. ACTIVE CITATIONS & PRACTICAL FACTS:
   - Rewrite academic citations into conversational active attribution (e.g. 'Transmission studies reported in ScienceDirect (Stankovski, 2023) shows heavy storms often caused distributed cascading faults affecting over 100,000 customers.').
   - Keep 100% of facts, numbers, and safety rules completely accurate.
5. ABSOLUTE BANS:
   - ZERO em-dashes (—). ZERO participial -ing riders at sentence ends (, highlighting..., , thereby ensuring...).
   - ZERO connective openers (Furthermore, Moreover, Additionally, Consequently, In conclusion, Notably).
   - ZERO moralizing closing clichés (Never write 'With a little preparation...', 'This proves what human ingenuity...'). End directly on the final practical fact.

Text to humanize:
\${text}

Respond ONLY with the rewritten text:\`;
  }

  return callLLM(systemPrompt, userPrompt, 0.78, 0.18, env);
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
  const systemPrompt = 'You are an authentic student writer and copy editor. Return only the replacement sentence written in natural human prose with zero AI tells.';
  const userPrompt = \`Rewrite ONLY the target sentence to sound completely human, natural, and grounded, bypassing ZeroGPT perplexity checks and Turnitin sequence classifiers.
Maintain seamless narrative flow with surrounding context.

CONTEXT BEFORE: "\${contextBefore}"
TARGET SENTENCE TO REWRITE: "\${sentence}"
CONTEXT AFTER: "\${contextAfter}"

RULES:
- Return ONLY the rewritten replacement sentence without quotes or introductory text.
- Use natural human phrasing, concrete real-world vocabulary, and active verbs.
- Connect naturally with ', and', ', but', or ', so' where appropriate, or use a natural prepositional starter.
- NO participial -ing riders at sentence ends (never end with ', highlighting...', ', thereby ensuring...').
- NO connective openers ('Furthermore,', 'Moreover,', 'Additionally,').
- NO 'not only X, but also Y' or 'rather than X, Y' or ', while X does Y'.
- NO em-dashes (—).
- Do NOT repeat the context before or after.\`;

  return callLLM(systemPrompt, userPrompt, 0.82, 0.20, env);
}

async function scanTurnitinLive(text) {
  const cleanText = text.replace(/^##?\\s+/gm, '');
  try {
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
    if (!res.ok) return { class: 'human', aiRateResult: { Turnitin: 0.05 }, scanFailed: true };
    const parsed = await res.json();
    return parsed.data || { class: 'human', aiRateResult: { Turnitin: 0.05 }, scanFailed: true };
  } catch (e) {
    return { class: 'human', aiRateResult: { Turnitin: 0.05 }, scanFailed: true };
  }
}

async function scanZeroGptLive(text) {
  try {
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
    if (!res.ok) return { fakePercentage: 0, isHuman: true, h: [], scanFailed: true };
    const parsed = await res.json();
    return parsed.data || { fakePercentage: 0, isHuman: true, h: [], scanFailed: true };
  } catch (e) {
    return { fakePercentage: 0, isHuman: true, h: [], scanFailed: true };
  }
}

function splitBlocksForRewrite(blocks, maxWords = 380) {
  const out = [];
  for (const b of blocks) {
    const words = b.trim().split(/\\s+/).filter(Boolean).length;
    if (words <= maxWords || /^#{1,6}\\s/.test(b.trim())) { out.push(b); continue; }
    const paras = b.split(/\\n\\s*\\n/);
    if (paras.length > 1) {
      out.push(...splitBlocksForRewrite(paras, maxWords));
      continue;
    }
    const sentences = b.match(/[^.!?]+[.!?]*/g) || [b];
    let cur = '';
    for (const s of sentences) {
      const cand = (cur + ' ' + s).trim();
      if (cur && cand.split(/\\s+/).length > maxWords) { out.push(cur.trim()); cur = s; }
      else cur = cand;
    }
    if (cur.trim()) out.push(cur.trim());
  }
  return out;
}

// Detect non-English words that commonly leak when the input is Indonesian
// or mixed-language. Returns the matched words (empty array = clean).
function detectNonEnglish(text) {
  // Only markers that have no English reading. The old list carried common
  // Indonesian words that are also ordinary English (dan, di, jauh, terang,
  // gelap, ...), so a perfectly English rewrite got flagged as "non-English
  // words leaked" whenever three or more of them appeared anywhere.
  const ID_COMMON = /\\b(?:yang|untuk|dengan|adalah|pada|dalam|akan|bisa|juga|sangat|lebih|ketika|saat|karena|seperti|harus|sudah|belum|banyak|sedikit|tidur|malam|tidak|bukan|telah|sedang|perlu|ingin|mau|boleh|jangan|silakan|tolong|terima|kasih|selamat|pagi|siang|sore|besok|kemarin|minggu|bulan|tahun|menit|detik|belajar|makan|minum|bangun|berdiri|senang|sedih|marah|takut|kenyang|lapar|haus|dingin|panas|besar|kecil|panjang|pendek|tinggi|rendah|cepat|lambat|jelek|salah|mudah|sulit|murah|mahal|dekat|penuh|kosong|kotor|bersih|keras|pelan)\\b/gi;
  const matches = text.match(ID_COMMON) || [];
  return Array.from(new Set(matches.map(m => m.toLowerCase())));
}

// Structural validation: verify the rewrite preserved the source's headings
// (count + levels) and list-item count. Returns { ok, issues[] }.
function validateFormat(original, rewritten) {
  const issues = [];
  const origHeads = (original.match(/^#{1,6}\\s.+$/gm) || []);
  const outHeads = (rewritten.match(/^#{1,6}\\s.+$/gm) || []);
  if (outHeads.length < origHeads.length) {
    issues.push('lost headings: ' + outHeads.length + '/' + origHeads.length);
  }
  const origLists = (original.match(/^[-*]\\s|^\\d+\\.\\s/gm) || []).length;
  const outLists = (rewritten.match(/^[-*]\\s|^\\d+\\.\\s/gm) || []).length;
  if (origLists > 0 && outLists < Math.floor(origLists * 0.5)) {
    issues.push('lost list items: ' + outLists + '/' + origLists);
  }
  const idLeak = detectNonEnglish(rewritten);
  if (idLeak.length > 3) {
    issues.push('non-English words leaked: ' + idLeak.slice(0, 5).join(','));
  }
  return { ok: issues.length === 0, issues };
}

function restoreHeadings(original, rewritten) {
  const origHeads = (original.match(/^#{1,6}\\s.+$/gm) || []).map(h => h.trim());
  if (!origHeads.length) return rewritten;
  const outHeads = (rewritten.match(/^#{1,6}\\s.+$/gm) || []).map(h => h.trim());

  // Align headings: an output heading that exactly matches some original
  // is intact and must never be treated as a rephrase of a DIFFERENT
  // original (positional-only alignment misfires when a heading is dropped
  // mid-document: out[i] looks like a rephrase of orig[i] when it is really
  // orig[i+1] surviving while orig[i] vanished).
  const replaced = [];
  const missing = [];
  const remaining = origHeads.slice();
  for (const oh of outHeads) {
    const exact = remaining.indexOf(oh);
    if (exact !== -1) { remaining.splice(exact, 1); continue; }
    replaced.push(oh);
  }
  const outSet = new Set(outHeads);
  const candidates = replaced.slice();
  replaced.length = 0;
  for (const cand of candidates) {
    if (outSet.has(cand) && origHeads.includes(cand)) continue;
    const lvl = cand.match(/^#+/)[0];
    const idx = remaining.findIndex(h => h.match(/^#+/)[0] === lvl);
    if (idx !== -1) {
      replaced.push({ from: cand, to: remaining[idx] });
      remaining.splice(idx, 1);
    }
  }
  for (const h of remaining) missing.push(h);

  for (const { from, to } of replaced) {
    const esc = from.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&');
    rewritten = rewritten.replace(new RegExp('^' + esc + '$', 'm'), to);
  }

  if (missing.length === 0) return rewritten;

  // Never reinsert a heading that already exists in the output verbatim
  // -- that would duplicate it.
  const trulyMissing = missing.filter(h => !outSet.has(h));

  if (trulyMissing.length === 0) return rewritten;

  const outLines = rewritten.split(/\\r?\\n/);
  const origBlocks = original.split(/\\r?\\n\\s*\\r?\\n/).filter(b => b.trim());
  for (const head of trulyMissing) {
    const idx = origBlocks.findIndex(b => b.trim().split(/\\r?\\n/)[0].trim() === head);
    if (idx === -1) continue;
    const nextHeading = origBlocks.slice(idx + 1)
      .map(b => b.trim().split(/\\r?\\n/)[0].trim())
      .find(l => /^#{1,6}\\s/.test(l));
    let insertAt = -1;
    if (nextHeading) {
      const ni = outLines.findIndex(l => l.trim() === nextHeading);
      if (ni !== -1) insertAt = ni;
    }
    if (insertAt === -1) {
      while (outLines.length && !outLines[outLines.length - 1].trim()) outLines.pop();
      insertAt = outLines.length;
    }
    outLines.splice(insertAt, 0, '', head, '');
  }
  return outLines.join('\\n').replace(/\\n{3,}/g, '\\n\\n').trim() + '\\n';
}

async function autoLoopHumanize(rawInput, mode = 'universal', env = {}, onProgress) {
  const text = sanitizeInputSuperhumanizer(rawInput);

  // Progress reporting: a long doc takes minutes of opaque wall-clock time.
  // The caller gets {phase, done, total} updates; no-op when unregistered.
  const progress = { phase: 'sanitize', done: 0, total: 0 };
  const report = (phase, done, total) => {
    progress.phase = phase;
    if (typeof done === 'number') progress.done = done;
    if (typeof total === 'number') progress.total = total;
    if (typeof onProgress === 'function') {
      try { onProgress(Object.assign({}, progress)); } catch (e) {}
    }
  };
  report('sanitize');

  // Rewrite in bounded chunks so long documents are never truncated.
  const rawBlocks = text.split(/\\r?\\n\\s*\\r?\\n/).filter(p => p.trim().length > 0);
  const inputWords = text.split(/\\s+/).filter(Boolean).length;
  let rawPass1;
  if (inputWords <= 450) {
    report('rewrite', 0, 1);
    rawPass1 = await runPass1Rewrite(text, mode, env);
    report('rewrite', 1, 1);
  } else {
    const chunks = splitBlocksForRewrite(rawBlocks);
    const rewrittenChunks = [];
    // Parallel chunk rewrite (bounded concurrency): each chunk is an
    // independent LLM call. Running them sequentially made a 2.2k-word doc
    // take 8-10 minutes; bounded parallelism cuts that to ~2 rounds of
    // wall-clock time without exhausting sockets (max 3 in flight).
    const CONCURRENCY = 3;
    report('rewrite', 0, chunks.length);
    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
      const batch = chunks.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(async (chunk) => {
        // One retry before giving up: transient LLM/socket errors must not
        // silently leave an unhumanized original block in the output.
        try {
          return cleanFormattingOnly(await runPass1Rewrite(chunk, mode, env));
        } catch (err1) {
          try {
            return cleanFormattingOnly(await runPass1Rewrite(chunk, mode, env));
          } catch (err2) {
            return chunk;
          }
        }
      }));
      rewrittenChunks.push(...results);
      report('rewrite', rewrittenChunks.length, chunks.length);
    }
    rawPass1 = rewrittenChunks.join('\\n\\n');
  }

  // Fast Formatting & Punctuation Sanitize (Strictly Preserves \\n\\n, Headings, Lists)
  let currentText = cleanFormattingOnly(rawPass1);
  currentText = mechanicalClean(currentText).cleaned;
  currentText = cleanFormattingOnly(currentText);
  currentText = restoreHeadings(text, currentText);

  let retries = 0;
  let liveScanResult = null;
  let zeroGptScanResult = null;

  // Concurrent fast live detector scan
  report('scan');
  const [tRes, zRes] = await Promise.allSettled([
    scanTurnitinLive(currentText),
    scanZeroGptLive(currentText)
  ]);

  if (tRes.status === 'fulfilled' && tRes.value) liveScanResult = tRes.value;
  if (zRes.status === 'fulfilled' && zRes.value) zeroGptScanResult = zRes.value;

  const turnitinRate = (!liveScanResult || liveScanResult.scanFailed) ? 100 : ((liveScanResult.aiRateResult && liveScanResult.aiRateResult.Turnitin) || 0) * 100;
  const zeroGptRate = (!zeroGptScanResult || zeroGptScanResult.scanFailed) ? 100 : (zeroGptScanResult.fakePercentage || 0);

    // Targeted parallel closed-loop ONLY if detectors flag the text (> 20% AI).
    // Thresholds synced with engine/humanizer.js (both were once 20/20/20; the
    // builder had drifted to 28/25/25 since Stage 18, so edge and local
    // humanized different sentences).
    if (turnitinRate > 20 || zeroGptRate > 20) {
    let turnitinFlagged = [];
    let zeroGptFlagged = [];

    if (liveScanResult?.class === 'ai' || turnitinRate > 20) {
      turnitinFlagged = (liveScanResult.sentences || [])
        .filter(s => (s.generated_prob > 0.18 || s.class === 'ai') && s.sentence.trim().length > 10)
        .map(s => s.sentence);
    }

    if (zeroGptRate > 20 && Array.isArray(zeroGptScanResult.h)) {
      zeroGptFlagged = zeroGptScanResult.h.filter(s => typeof s === 'string' && s.trim().length > 10);
    }

    const allFlagged = Array.from(new Set([...turnitinFlagged, ...zeroGptFlagged]));

    // Fix flagged sentences in batches of 4 (max 3 batches) so long documents
    // don't get stuck with only the first 2 sentences cleaned.
    const BATCH_SIZE = 4;
    const MAX_BATCHES = 3;
    const batches = [];
    for (let i = 0; i < allFlagged.length && batches.length < MAX_BATCHES; i += BATCH_SIZE) {
      batches.push(allFlagged.slice(i, i + BATCH_SIZE));
    }

    for (const batch of batches) {
      retries += batch.length;
      report('fix', retries, allFlagged.length);
      const fixPromises = batch.map(async (sentence) => {
        try {
          const rawFixed = await rehumanizeSentence(sentence, '', '', mode, env);
          const fixed = rawFixed.replace(/^["'\\s]+|["'\\s]+$/g, '').split('\\n').filter(l => l.trim().length > 0).pop()?.trim() || '';
          return { sentence, fixed };
        } catch (err) {
          return { sentence, fixed: null };
        }
      });

      const fixResults = await Promise.all(fixPromises);
      for (const { sentence, fixed } of fixResults) {
        if (fixed && fixed.length > 5) {
          currentText = replaceSentenceFuzzy(currentText, sentence, cleanFormattingOnly(fixed));
        }
      }
      currentText = cleanFormattingOnly(currentText);
      currentText = mechanicalClean(currentText).cleaned;

      // Re-scan after each batch to refresh the flagged list for the next one.
      report('verify');
      try {
        const [tFinal, zFinal] = await Promise.allSettled([
          scanTurnitinLive(currentText),
          scanZeroGptLive(currentText)
        ]);
        if (tFinal.status === 'fulfilled' && tFinal.value) liveScanResult = tFinal.value;
        if (zFinal.status === 'fulfilled' && zFinal.value) zeroGptScanResult = zFinal.value;
      } catch (e) {}

      const tRate = (!liveScanResult || liveScanResult.scanFailed) ? 100 : ((liveScanResult.aiRateResult && liveScanResult.aiRateResult.Turnitin) || 0) * 100;
      const zRate = (!zeroGptScanResult || zeroGptScanResult.scanFailed) ? 100 : (zeroGptScanResult.fakePercentage || 0);
      if (tRate <= 20 && zRate <= 20) break;

      const nextTurnitin = (liveScanResult?.class === 'ai' || tRate > 20)
        ? (liveScanResult.sentences || [])
            .filter(s => (s.generated_prob > 0.18 || s.class === 'ai') && s.sentence.trim().length > 10)
            .map(s => s.sentence)
        : [];
      const nextZeroGpt = (zRate > 20 && Array.isArray(zeroGptScanResult.h))
        ? zeroGptScanResult.h.filter(s => typeof s === 'string' && s.trim().length > 10)
        : [];
      const nextFlagged = Array.from(new Set([...nextTurnitin, ...nextZeroGpt]));
      const remaining = nextFlagged.filter(s => !allFlagged.includes(s));
      if (remaining.length === 0) break;
      allFlagged.push(...remaining);
    }
  }

  const evaluation = analyzeSentences(currentText);
  const metrics = calculateMetrics(currentText);
  const fidelity = checkFidelity(text, currentText);

  // If real ZeroGPT was scanned, update detector scoreboard with authentic ZeroGPT data
  if (zeroGptScanResult && !zeroGptScanResult.scanFailed) {
    const zgPass = (zeroGptScanResult.fakePercentage <= 35) ||
      (typeof zeroGptScanResult.isHuman === 'number' && zeroGptScanResult.isHuman >= 40) ||
      (zeroGptScanResult.feedback && /human/i.test(zeroGptScanResult.feedback)) ||
      (evaluation.zeroGptScore <= 20);
    evaluation.detectors.zerogpt = {
      name: 'ZeroGPT (Official Live)',
      passed: Boolean(zgPass),
      score: zeroGptScanResult.fakePercentage + '% AI',
      feedback: zeroGptScanResult.feedback
    };
    evaluation.zeroGptScore = zeroGptScanResult.fakePercentage;
  }

  // If live Turnitin was scanned, calibrate Turnitin detector accurately
  if (liveScanResult && !liveScanResult.scanFailed && liveScanResult.aiRateResult && typeof liveScanResult.aiRateResult.Turnitin === 'number') {
    // NOTE: turnitindetector.ai is a proven fake-metric proxy (Stage 19
    // forensic audit: Turnitin = aiConfidence * 0.910 via hardcoded
    // multiplier, not a real Turnitin query). Its live number must never
    // overwrite the local estimator's score display — only the pass/fail
    // gate may consult it as a secondary signal.
    const turnitinPct = Math.round(liveScanResult.aiRateResult.Turnitin * 100);
    const isPassed = evaluation.turnitinScore <= 20 || turnitinPct <= 35;
    evaluation.detectors.turnitin = {
      name: 'Turnitin (T-Checker)',
      passed: Boolean(isPassed),
      score: evaluation.turnitinScore + '% AI'
    };
  }

  // Final safety net: headings restored after every rewrite step.
  report('finalize');
  currentText = restoreHeadings(text, currentText);

  // Structural + language validation (headings, list items, non-English leak).
  // Informational: never rejects the rewrite, surfaces issues to the caller.
  const formatCheck = validateFormat(text, currentText);
  if (!formatCheck.ok) {
    console.warn('[autoLoop] format validation issues: ' + formatCheck.issues.join('; '));
  }

  return {
    rewritten: currentText,
    metrics,
    evaluation,
    fidelity,
    retryTries: retries,
    formatIssues: formatCheck.issues,
    liveScanResult,
    zeroGptScanResult
  };
}

// In-memory progress store keyed by job id. Each Worker isolate holds its own
// Map, so a poll that lands on a different isolate returns "unknown job" and
// the UI just keeps its last known phase — no SSE, no Durable Object needed.
const progressJobs = new Map();

// ---- Store + auth helpers (mirror of engine/store.js, KV-backed) ----
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
const COUPONS = { 'AIHUMAN-FREE100': { credits: 100, label: 'Free 100 credits' } };
const RUN_COST = 10;
const FREE_CREDITS = 50;

function hex(buf) {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function hashPassword(pw, salt) {
  const data = new TextEncoder().encode(salt + ':' + pw);
  return hex(await crypto.subtle.digest('SHA-256', data));
}
function randomToken(bytes) {
  const arr = new Uint8Array(bytes || 32);
  crypto.getRandomValues(arr);
  return hex(arr);
}
function tokenFromRequest(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const m = cookieHeader.match(/(?:^|;\\s*)humanizer_token=([a-f0-9]{64})/);
  if (m) return m[1];
  const auth = request.headers.get('Authorization') || '';
  if (/^Bearer\\s+[a-f0-9]{64}$/.test(auth)) return auth.slice(7).trim();
  return null;
}
async function currentUser(env, request) {
  const token = tokenFromRequest(request);
  if (!token || !env.DATA) return null;
  const sess = await env.DATA.get('sess:' + token, 'json');
  if (!sess || !sess.user) return null;
  return await env.DATA.get('user:' + sess.user, 'json');
}
async function ensureCredits(env, userId) {
  const c = await env.DATA.get('credit:' + userId, 'json');
  if (c && typeof c.balance === 'number') return c;
  const fresh = { balance: FREE_CREDITS, history: [] };
  await env.DATA.put('credit:' + userId, JSON.stringify(fresh));
  return fresh;
}
async function addCredits(env, userId, amount, reason) {
  const c = await ensureCredits(env, userId);
  c.balance += amount;
  c.history.push({ at: new Date().toISOString(), delta: amount, reason: reason || 'topup' });
  if (c.history.length > 100) c.history = c.history.slice(-100);
  await env.DATA.put('credit:' + userId, JSON.stringify(c));
  return c;
}
function publicUser(u) { return u ? { id: u.id, email: u.email, createdAt: u.createdAt } : null; }

function jsonRes(obj, status, extraHeaders) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...extraHeaders }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Key'
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

    // ---- Auth: register / login / logout / me ----
    if (request.method === 'POST' && (pathname === '/api/register' || pathname === '/api/humanizer/register')) {
      try {
        const { email, password } = await request.json();
        const em = String(email || '').trim().toLowerCase();
        const pw = String(password || '');
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(em)) return jsonRes({ error: 'Invalid email' }, 400, corsHeaders);
        if (pw.length < 8) return jsonRes({ error: 'Password must be at least 8 characters' }, 400, corsHeaders);
        const existing = await env.DATA.get('user-email:' + em, 'json');
        if (existing) return jsonRes({ error: 'Email already registered' }, 409, corsHeaders);
        const id = 'u_' + randomToken(8);
        const salt = randomToken(16);
        const user = { id, email: em, salt, hash: await hashPassword(pw, salt), createdAt: new Date().toISOString() };
        await env.DATA.put('user:' + id, JSON.stringify(user));
        await env.DATA.put('user-email:' + em, JSON.stringify(id));
        await ensureCredits(env, id);
        await addCredits(env, id, FREE_CREDITS, 'register');
        const token = randomToken(32);
        await env.DATA.put('sess:' + token, JSON.stringify({ user: id, createdAt: new Date().toISOString() }));
        return jsonRes({ user: publicUser(user), token }, 200, { ...corsHeaders, 'Set-Cookie': 'humanizer_token=' + token + '; Path=/; HttpOnly; Max-Age=2592000' });
      } catch (err) {
        return jsonRes({ error: err.message }, 500, corsHeaders);
      }
    }

    if (request.method === 'POST' && (pathname === '/api/login' || pathname === '/api/humanizer/login')) {
      try {
        const { email, password } = await request.json();
        const em = String(email || '').trim().toLowerCase();
        const pw = String(password || '');
        const id = await env.DATA.get('user-email:' + em, 'json');
        const user = id && await env.DATA.get('user:' + id, 'json');
        if (!user || await hashPassword(pw, user.salt) !== user.hash) {
          return jsonRes({ error: 'Invalid email or password' }, 401, corsHeaders);
        }
        const token = randomToken(32);
        await env.DATA.put('sess:' + token, JSON.stringify({ user: user.id, createdAt: new Date().toISOString() }));
        return jsonRes({ user: publicUser(user), token }, 200, { ...corsHeaders, 'Set-Cookie': 'humanizer_token=' + token + '; Path=/; HttpOnly; Max-Age=2592000' });
      } catch (err) {
        return jsonRes({ error: err.message }, 500, corsHeaders);
      }
    }

    if (request.method === 'POST' && (pathname === '/api/logout' || pathname === '/api/humanizer/logout')) {
      const token = tokenFromRequest(request);
      if (token && env.DATA) await env.DATA.delete('sess:' + token);
      return jsonRes({ ok: true }, 200, { ...corsHeaders, 'Set-Cookie': 'humanizer_token=; Path=/; HttpOnly; Max-Age=0' });
    }

    if (request.method === 'GET' && (pathname === '/api/me' || pathname === '/api/humanizer/me')) {
      const user = await currentUser(env, request);
      if (!user) return jsonRes({ error: 'Not logged in' }, 401, corsHeaders);
      const credits = await ensureCredits(env, user.id);
      return jsonRes({ user: publicUser(user), credits: credits.balance, history: credits.history }, 200, corsHeaders);
    }

    // ---- Credits ----
    if (request.method === 'GET' && (pathname === '/api/credits' || pathname === '/api/humanizer/credits')) {
      const user = await currentUser(env, request);
      if (!user) return jsonRes({ error: 'Not logged in' }, 401, corsHeaders);
      const credits = await ensureCredits(env, user.id);
      return jsonRes({ credits: credits.balance, history: credits.history }, 200, corsHeaders);
    }

    // ---- Coupon redemption ----
    if (request.method === 'POST' && (pathname === '/api/apply-coupon' || pathname === '/api/humanizer/apply-coupon')) {
      try {
        const user = await currentUser(env, request);
        if (!user) return jsonRes({ error: 'Not logged in' }, 401, corsHeaders);
        const { code } = await request.json();
        const coupon = COUPONS[String(code || '').trim().toUpperCase()];
        if (!coupon) return jsonRes({ error: 'Invalid coupon code' }, 404, corsHeaders);
        const credits = await addCredits(env, user.id, coupon.credits, 'coupon:' + code);
        return jsonRes({ ok: true, added: coupon.credits, credits: credits.balance, label: coupon.label }, 200, corsHeaders);
      } catch (err) {
        return jsonRes({ error: err.message }, 500, corsHeaders);
      }
    }

    // ---- Version log (public) ----
    if (request.method === 'GET' && (pathname === '/api/version-log' || pathname === '/api/humanizer/version-log')) {
      return jsonRes({ versions: VERSION_LOG }, 200, corsHeaders);
    }

    // ---- Email capture (stored to KV; no SMTP yet) ----
    if (request.method === 'POST' && (pathname === '/api/notify-email' || pathname === '/api/humanizer/notify-email')) {
      try {
        const { email, source } = await request.json();
        const em = String(email || '').trim().toLowerCase();
        if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(em)) return jsonRes({ error: 'Invalid email' }, 400, corsHeaders);
        const list = (await env.DATA.get('email-list', 'json')) || [];
        if (!list.some(e => e.email === em)) {
          list.push({ email: em, source: source || 'unknown', at: new Date().toISOString() });
          await env.DATA.put('email-list', JSON.stringify(list));
        }
        return jsonRes({ ok: true }, 200, corsHeaders);
      } catch (err) {
        return jsonRes({ error: err.message }, 500, corsHeaders);
      }
    }

    // ---- Bug reports ----
    if (request.method === 'POST' && (pathname === '/api/reports' || pathname === '/api/humanizer/reports')) {
      try {
        const { title, description, email } = await request.json();
        const t = String(title || '').trim();
        const d = String(description || '').trim();
        if (t.length < 3 || d.length < 10) return jsonRes({ error: 'Title (min 3) and description (min 10) required' }, 400, corsHeaders);
        const id = 'r_' + randomToken(8);
        const user = await currentUser(env, request);
        const report = {
          id, title: t.slice(0, 200), description: d.slice(0, 4000),
          email: String(email || '').trim().toLowerCase().slice(0, 200) || null,
          userId: user ? user.id : null,
          createdAt: new Date().toISOString()
        };
        await env.DATA.put('report:' + id, JSON.stringify(report));
        const idx = (await env.DATA.get('report-idx', 'json')) || [];
        idx.push(id);
        if (idx.length > 500) idx.splice(0, idx.length - 500);
        await env.DATA.put('report-idx', JSON.stringify(idx));
        return jsonRes({ ok: true, id }, 200, corsHeaders);
      } catch (err) {
        return jsonRes({ error: err.message }, 500, corsHeaders);
      }
    }

    if (request.method === 'GET' && (pathname === '/api/reports' || pathname === '/api/humanizer/reports')) {
      if ((request.headers.get('X-Admin-Key') || '') !== 'ADMIN') return jsonRes({ error: 'Admin key required' }, 401, corsHeaders);
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 100);
      const idx = (await env.DATA.get('report-idx', 'json')) || [];
      const ids = idx.slice(-limit).reverse();
      const reports = [];
      for (const id of ids) {
        const r = await env.DATA.get('report:' + id, 'json');
        if (r) reports.push(r);
      }
      return jsonRes({ reports, total: idx.length }, 200, corsHeaders);
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
      let job = null;
      try {
        const body = await request.json();
        const text = body.text;
        const mode = body.mode;
        const jobId = typeof body.jobId === 'string' && body.jobId ? body.jobId : 'job_' + Date.now();
        job = { phase: 'sanitize', done: 0, total: 0, doneFlag: false, error: null };
        progressJobs.set(jobId, job);
        if (progressJobs.size > 200) {
          const oldest = progressJobs.keys().next().value;
          if (oldest !== jobId) progressJobs.delete(oldest);
        }
        // Charge logged-in users before the run; refuse when out of credits.
        const user = await currentUser(env, request);
        if (user) {
          const credits = await ensureCredits(env, user.id);
          if (credits.balance < RUN_COST) return jsonRes({ error: 'Insufficient credits' }, 402, corsHeaders);
          credits.balance -= RUN_COST;
          credits.history.push({ at: new Date().toISOString(), delta: -RUN_COST, reason: 'auto-loop' });
          await env.DATA.put('credit:' + user.id, JSON.stringify(credits));
        }
        const result = await autoLoopHumanize(text || '', mode || 'academic_turnitin', env, (p) => {
          job.phase = p.phase;
          job.done = p.done;
          job.total = p.total;
        });
        job.doneFlag = true;
        const creditsAfter = user ? await ensureCredits(env, user.id) : null;
        return new Response(JSON.stringify(Object.assign({}, result, creditsAfter ? { credits: creditsAfter.balance } : {})), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (err) {
        if (job) { job.error = err.message; job.doneFlag = true; }
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // API: Auto Loop Progress (poll)
    if (request.method === 'GET' && (pathname === '/api/progress' || pathname === '/api/humanizer/progress')) {
      const id = url.searchParams.get('id');
      const job = id && progressJobs.get(id);
      if (!job) {
        return new Response(JSON.stringify({ error: 'unknown job' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
      return new Response(JSON.stringify({
        phase: job.phase,
        done: job.done,
        total: job.total,
        complete: job.doneFlag,
        error: job.error
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
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
