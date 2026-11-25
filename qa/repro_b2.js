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
  // Thresholds mirror engine/test.js (overall <= 20) plus the live-scan
  // scoreboard the badges read.
  const failures = [];
  if (e.overallAiPercent > 20) failures.push('overallAiPercent ' + e.overallAiPercent + '% > 20%');
  if (e.zeroGptScore > 35) failures.push('zeroGptScore ' + e.zeroGptScore + '% > 35%');
  if (e.turnitinScore > 35) failures.push('turnitinScore ' + e.turnitinScore + '% > 35%');
  if (!e.detectors.zerogpt.passed) failures.push('ZeroGPT badge failed: ' + e.detectors.zerogpt.score);
  if (!e.detectors.turnitin.passed) failures.push('Turnitin badge failed: ' + e.detectors.turnitin.score);
  if (failures.length) {
    console.error('QA FAIL: ' + failures.join('; '));
    process.exit(1);
  }
  console.log('QA PASS: all detector thresholds within limits');
})().catch(e=>{console.error(e); process.exit(1);});
