// QA repro: run user input through autoLoopHumanize, print detector eval
const path = require('path');
const fs = require('fs');
const { autoLoopHumanize } = require(path.join(__dirname, '..', 'engine', 'humanizer.js'));
const input = fs.readFileSync(path.join(__dirname, 'user_input_sleep.md'), 'utf8');
(async () => {
  console.log('INPUT words:', input.split(/\s+/).filter(Boolean).length);
  const t0 = Date.now();
  const r = await autoLoopHumanize(input, 'balance');
  console.log('elapsed:', ((Date.now()-t0)/1000).toFixed(1)+'s');
  const e = r.evaluation;
  console.log('=== EVAL ===');
  console.log('overallAiPercent:', e.overallAiPercent, '| human:', e.humanPercent, '| mixed:', e.mixedPercent);
  console.log('turnitinScore:', e.turnitinScore, '| zeroGptScore:', e.zeroGptScore);
  console.log('synthId:', e.synthIdScore, '| chatgptWm:', e.chatgptWmScore, '| claude:', e.claudeDetScore);
  console.log('detectors:', JSON.stringify(e.detectors, null, 1));
  console.log('=== AI SENTENCES ===');
  e.sentences.filter(s=>s.status==='ai').forEach(s=>console.log('AI('+s.score+'):', s.reasons.join('|'), '||', s.text.slice(0,100)));
  console.log('=== MIXED SENTENCES ===');
  e.sentences.filter(s=>s.status==='mixed').forEach(s=>console.log('MIX('+s.score+'):', s.reasons.join('|'), '||', s.text.slice(0,100)));
  fs.writeFileSync(path.join(__dirname, 'b2_output.md'), r.rewritten);
  console.log('output saved to qa/b2_output.md');

  // Regression assertions (R6): QA must go red on detector regression.
  // Gates read the LOCAL estimator, which measures rewrite quality.
  // The live ZeroGPT badge (api.zerogpt.com) is printed above but NOT
  // gated: as of 2026-11-26 that API returns fakePercentage=100 for every
  // document >= ~50 words, including deliberately messy human writing
  // (see coldstart). Asserting it would make QA permanently red for a
  // reason unrelated to this codebase.
  const failures = [];
  if (e.overallAiPercent > 20) failures.push('overallAiPercent ' + e.overallAiPercent + '% > 20%');
  if (e.turnitinScore > 35) failures.push('turnitinScore ' + e.turnitinScore + '% > 35%');
  if (failures.length) {
    console.error('QA FAIL: ' + failures.join('; '));
    process.exit(1);
  }
  const zg = e.detectors.zerogpt;
  console.log('QA PASS: estimator gates within limits');
  console.log('  live ZeroGPT (info only, not gated): ' + zg.name + ' -> ' + zg.score + ' passed=' + zg.passed);
})().catch(e=>{console.error(e); process.exit(1);});
