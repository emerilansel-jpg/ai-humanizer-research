// ai-humanizer-research/engine/test.js
const assert = require('assert');
const { 
  mechanicalClean, 
  calculateMetrics, 
  checkFidelity, 
  buildHumanizerPrompt, 
  countSyllables,
  analyzeSentences,
  autoLoopHumanize
} = require('./humanizer.js');

const rawAiSample = `In today's fast-paced digital landscape, artificial intelligence plays a pivotal role in modern industries. Furthermore, the technology fosters unprecedented innovation across multiple sectors. It is worth noting that this rapid evolution stands as a testament to human ingenuity. Moreover, researchers delve into novel architectures to seamlessly optimize performance. In conclusion, adoption surged by 42% in 2025.`;

console.log('--- Test 1: Mechanical Cleaning & Capitalization ---');
const { cleaned, replacementCount } = mechanicalClean(rawAiSample);
assert(replacementCount >= 6, 'Should replace at least 6 AI clichés');
assert(!cleaned.includes('pivotal role'), 'Should eliminate pivotal role');
assert(!cleaned.includes('delve into'), 'Should eliminate delve into');
assert(cleaned.charAt(0) === cleaned.charAt(0).toUpperCase(), 'Text must start with capital letter');
console.log('Test 1 PASSED.');

console.log('\n--- Test 2: Gunning Fog & Syllable Counting ---');
assert(countSyllables('innovation') >= 3, 'innovation has >= 3 syllables');
assert(countSyllables('the') === 1, 'the has 1 syllable');
const aiMetrics = calculateMetrics(rawAiSample);
assert(aiMetrics.gunningFog > 0, 'Gunning fog must be computed');
console.log('Test 2 PASSED.');

console.log('\n--- Test 3: Fidelity Verification ---');
const humanSample = `AI exploded in 2025. Surged by 42%, in fact. While engineers build faster pipelines and ditch old models, real-world adoption is mostly messy, practical, and fast-moving. It just works.`;
const fidelityCheck = checkFidelity(rawAiSample, humanSample);
assert(fidelityCheck.numbersPreserved === true, '42% and 2025 must be preserved');
console.log('Test 3 PASSED.');

console.log('\n--- Test 4: Sentence Heatmap Classification (User Screenshot Case) ---');
const userScreenshotSample = `Still awake after 20 minutes? Get up. Go do something boring under dim light until you feel drowsy again. The real goal is breaking that frustrating mental link between your mattress and the misery of being stuck awake. Once you combine mental distraction with physical relaxation, you finally signal to your body that it is safe to let go.`;

const evalBefore = analyzeSentences(userScreenshotSample);
console.log('Eval Before AI %:', evalBefore.overallAiPercent + '%');
assert(evalBefore.aiSentenceCount >= 2, 'Should detect at least 2 AI-flagged sentences in user screenshot text');
assert(evalBefore.overallAiPercent > 50, 'Overall AI percent should be high before rewrite');
console.log('Test 4 PASSED.');

console.log('\n--- Test 5: End-to-End Auto-Loop Humanize Verification (ZeroGPT mode) ---');
autoLoopHumanize(userScreenshotSample, 'zerogpt')
  .then(async res => {
    console.log('Rewritten Output:\n', res.rewritten);
    console.log('Final AI %:', res.evaluation.overallAiPercent + '%');
    console.log('Final AI Sentences Count:', res.evaluation.aiSentenceCount);
	    assert(res.evaluation.aiSentenceCount === 0, 'Auto-loop must eliminate all red AI sentences');
	    assert(res.evaluation.overallAiPercent <= 20, 'Final AI score must be <= 20%');
	    assert(res.evaluation.detectors.zerogpt.passed === true, 'ZeroGPT check must pass');
    assert(res.evaluation.detectors.writer.passed === true, 'Writer check must pass');
    assert(!res.rewritten.includes('—'), 'Rewritten text must not contain em-dashes');
    console.log('Test 5 PASSED.');

	    console.log('\n--- Test 6: Academic Essay / Turnitin RoBERTa Bypass Verification ---');
	    const academicSample = 'Artificial intelligence plays a pivotal role in higher education. Furthermore, adaptive learning algorithms foster personalized instruction by analyzing individual student performance metrics. In addition, these computational frameworks serve as a cornerstone for modern pedagogical methodologies, thereby ensuring equitable learning outcomes for diverse cohorts.';
	    const acadRes = await autoLoopHumanize(academicSample, 'academic_turnitin');
	    console.log('Academic Rewritten:\n', acadRes.rewritten);
	    console.log('Turnitin AI Score:', acadRes.evaluation.turnitinScore + '%');
	    console.log('ZeroGPT Score:', acadRes.evaluation.zeroGptScore + '%');
	    assert(acadRes.evaluation.turnitinScore <= 10, 'Turnitin score must be <= 10%');
	    assert(acadRes.evaluation.detectors.turnitin.passed === true, 'Turnitin check must pass');
	    assert(!acadRes.rewritten.includes('—'), 'Must not contain em-dashes');
	    assert(!acadRes.rewritten.toLowerCase().includes('furthermore,'), 'Must not contain Furthermore,');
	    assert(!acadRes.rewritten.toLowerCase().includes('serves as'), 'Must not contain serves as');
	    console.log('Test 6 PASSED.');

	    console.log('\n--- Test 7: Balance Mode & Watermark Detectors (SynthID, ChatGPT, Claude) ---');
	    const rawDetection = analyzeSentences(rawAiSample);
	    console.log('Raw SynthID Score:', rawDetection.detectors.synthid.score);
	    console.log('Raw ChatGPT WM Score:', rawDetection.detectors.chatgpt_wm.score);
	    console.log('Raw Claude Detector Score:', rawDetection.detectors.claude_det.score);
	    assert(rawDetection.synthIdScore > 40, 'Raw AI text must be flagged by SynthID detector');
	    assert(rawDetection.chatgptWmScore > 40, 'Raw AI text must be flagged by ChatGPT watermark detector');

	    const balanceRes = await autoLoopHumanize(rawAiSample, 'balance');
	    console.log('Balance Mode Rewritten:\n', balanceRes.rewritten);
	    console.log('Balance Overall AI %:', balanceRes.evaluation.overallAiPercent + '%');
	    console.log('Balance SynthID Score:', balanceRes.evaluation.detectors.synthid.score);
	    console.log('Balance ChatGPT WM Score:', balanceRes.evaluation.detectors.chatgpt_wm.score);
	    console.log('Balance Claude Detector Score:', balanceRes.evaluation.detectors.claude_det.score);
	    assert(balanceRes.evaluation.overallAiPercent <= 15, 'Balance mode AI % must be <= 15%');
	    assert(balanceRes.evaluation.detectors.synthid.passed === true, 'Google SynthID check must pass');
	    assert(balanceRes.evaluation.detectors.chatgpt_wm.passed === true, 'ChatGPT watermark check must pass');
	    assert(balanceRes.evaluation.detectors.claude_det.passed === true, 'Claude detector check must pass');
	    assert(balanceRes.evaluation.detectors.turnitin.passed === true, 'Turnitin check must pass in balance mode');
	    assert(balanceRes.evaluation.detectors.zerogpt.passed === true, 'ZeroGPT check must pass in balance mode');
		    assert(balanceRes.fidelity.numbersPreserved === true || balanceRes.rewritten.includes('42%'), 'Key statistics (42%) must be preserved in balance mode');
	    console.log('Test 7 PASSED.');

	    console.log('\nALL AUDIT & END-TO-END VERIFICATIONS PASSED (7/7).');
	  })
	  .catch(err => {
	    console.error('Test Failed:', err);
	    process.exit(1);
	  });
