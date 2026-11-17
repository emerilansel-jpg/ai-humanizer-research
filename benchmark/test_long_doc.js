// Regression: long documents must be fully humanized, not truncated at ~300 words.
// Usage: node benchmark/test_long_doc.js
const fs = require('fs');
const path = require('path');
const { autoLoopHumanize } = require('../engine/humanizer.js');

const input = fs.readFileSync(path.join(__dirname, 'sleep_article_input.md'), 'utf8');
const inWords = input.split(/\s+/).filter(Boolean).length;

if (inWords < 1200) {
  console.error('FAIL: test input too short (' + inWords + ' words). Fixture corrupted.');
  process.exit(1);
}

(async () => {
  const t0 = Date.now();
  const r = await autoLoopHumanize(input, 'balance');
  const out = r.rewritten;
  const outWords = out.split(/\s+/).filter(Boolean).length;
  const latency = ((Date.now() - t0) / 1000).toFixed(1);

  const inHeads = (input.match(/^#{1,6}\s.+$/gm) || []).length;
  const outHeads = (out.match(/^#{1,6}\s.+$/gm) || []).length;
  const inNums = (input.match(/\b\d+(\.\d+)?%?\b/g) || []);
  const missingNums = (r.fidelity && r.fidelity.missingNumbers) || [];
  const coverage = outWords / inWords;

  console.log('Input words:   ', inWords);
  console.log('Output words:  ', outWords, '(coverage ' + (coverage * 100).toFixed(1) + '%)');
  console.log('Headings:      ', outHeads + '/' + inHeads);
  console.log('Missing numbers:', missingNums.length ? missingNums.join(',') : 'none');
  console.log('Latency:       ', latency + 's');
  console.log('Overall AI %:  ', r.evaluation.overallAiPercent);

  const fails = [];
  if (coverage < 0.9) fails.push('coverage ' + (coverage * 100).toFixed(1) + '% < 90% (truncation bug)');
  if (outHeads < inHeads) fails.push('lost headings ' + outHeads + '/' + inHeads);
  if (missingNums.length > 0) fails.push('lost numbers: ' + missingNums.join(','));

  if (fails.length) {
    console.error('FAIL: ' + fails.join('; '));
    process.exit(1);
  }
  console.log('LONG-DOC TEST PASSED (full coverage, headings + numbers preserved).');
  process.exit(0);
})().catch(e => {
  console.error('FAIL:', e && e.message ? e.message : e);
  process.exit(1);
});
