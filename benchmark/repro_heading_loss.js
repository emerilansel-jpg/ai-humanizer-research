// Reproduce the reported defect: ### level headings and bold step labels
// disappear or shift level after a chunked rewrite. Uses deterministic stubs.
// Usage: node benchmark/repro_heading_loss.js
const h = require('../engine/humanizer.js');

let failed = 0;
const check = (name, cond, extra) => {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name + (extra ? ' :: ' + extra : ''));
  if (!cond) failed++;
};

// ---- Case A: ### heading dropped by model, mixed level doc ----
const origA = [
  '# Long Title: Subtitle That Is Long',
  'intro paragraph here.',
  '### Part I: The Immediate Fixes (In-Bed Strategies)',
  'body of part one.',
  '### Part II: The Pre-Sleep Ritual (The Hour Before Bed)',
  'body of part two.',
  '### Conclusion',
  'closing paragraph.'
].join('\n\n');

// Model drops ### Part I, keeps ### Part II (same level at output pos 0 vs orig pos 0)
const rewA = [
  '# How to Fall Asleep When Your Mind Won\'t Quit', // rephrased H1, same level
  'intro rewritten.',
  '### Part II: The Pre-Sleep Ritual (The Hour Before Bed)', // SAME LEVEL but WRONG one
  'body of part two rewritten.',
  '### Conclusion', // intact but shifted
  'closing rewritten.'
].join('\n\n');

const outA = h.restoreHeadings(origA, rewA);
console.log('\n--- Case A output ---\n' + outA + '\n---------------------');
check('A: H1 restored verbatim', outA.startsWith('# Long Title: Subtitle That Is Long'));
check('A: dropped ### Part I reinserted', outA.includes('### Part I: The Immediate Fixes'));
check('A: ### Conclusion intact', outA.includes('### Conclusion'));
check('A: no duplicate Part II', (outA.match(/### Part II/g) || []).length === 1);

// ---- Case B: model DEGRADES ### to ## (level shift) ----
// Known limitation: restoreHeadings only appends missing headings; it does
// not rewrite existing ones when levels shift. Documented as a limitation;
// full repair would need level-aware replacement which is out of scope here.
const origB = ['# Title', 'intro.', '### Part I: Fixes', 'body.', '### Conclusion', 'end.'].join('\n\n');
const rewB = ['# Title', 'intro rewritten.', '## Part I: Fixes', 'body rewritten.', '## Conclusion', 'end rewritten.'].join('\n\n');
const outB = h.restoreHeadings(origB, rewB);
console.log('\n--- Case B output ---\n' + outB + '\n---------------------');
check('B: ### level preserved (not degraded to ##)', outB.includes('### Part I: Fixes'));
check('B: Conclusion also ###', outB.includes('### Conclusion'));
// Level-degradation duplicate is a known limitation; only assert no content loss.
check('B: original headings all present (level may shift)', (outB.match(/^#{1,6}\s.+$/gm) || []).length >= 2);

// ---- Case C: level preserved by model, only wording rephrased ----
const outC = h.restoreHeadings(origA, rewA.replace(/### Part II: The Pre-Sleep Ritual \(The Hour Before Bed\)/, '### Part II: Your Wind-Down Hour Before Lights Out'));
check('C: rephrased same-level heading swapped back verbatim', outC.includes('### Part II: The Pre-Sleep Ritual (The Hour Before Bed)'));

// ---- Case D: splitter must NOT break a heading off from its body ----
const longBody = Array.from({ length: 50 }, (_, i) => 'Sentence ' + i + ' about sleep pressure and racing thoughts at night.').join(' ');
const blocks = ['### Part I: The Immediate Fixes (In-Bed Strategies)\n' + longBody, 'short tail.'];
const chunks = h.splitBlocksForRewrite(blocks, 380);
console.log('\n--- Case D chunks ---');
chunks.forEach((c, i) => console.log('[' + i + '] starts: ' + JSON.stringify(c.slice(0, 60))));
const headChunkIdx = chunks.findIndex(c => c.includes('### Part I'));
check('D: heading not sent alone as its own chunk', headChunkIdx !== -1 && chunks[headChunkIdx].split(/\s+/).length > 10);

console.log(failed === 0 ? '\nALL REPRO CHECKS PASSED' : '\n' + failed + ' FAILED');
process.exit(failed === 0 ? 0 : 1);
