// Unit test for restoreHeadings + splitBlocksForRewrite.
// Usage: node benchmark/test_restore_headings.js
const { restoreHeadings, splitBlocksForRewrite } = require('../engine/humanizer.js');

let failed = 0;
const check = (name, cond) => {
  console.log((cond ? 'PASS' : 'FAIL') + ' - ' + name);
  if (!cond) failed++;
};

// Case 1: LLM rephrases the H1 and drops an H2 -> both restored, no duplicates.
const orig1 = [
  '# Long Title Here', 'para one',
  '## Part 7: The 20-Minute Rule (The "Reset")', 'body text',
  '## Conclusion: The 10-Point Checklist', 'end'
].join('\n\n');
const rew1 = [
  "# How to Fall Asleep When Your Mind Won't Quit", 'para one rewritten',
  '## Conclusion: The 10-Point Checklist', 'end rewritten'
].join('\n\n');
const out1 = restoreHeadings(orig1, rew1);
check('H1 replaced in place', out1.startsWith('# Long Title Here'));
check('no duplicate H1', (out1.match(/^# /gm) || []).length === 1);
check('dropped H2 reinserted', out1.includes('## Part 7: The 20-Minute Rule'));
check('intact H2 kept', out1.includes('## Conclusion'));
check('no heading swallowed at end', /end rewritten/.test(out1));
check('idempotent', out1 === restoreHeadings(orig1, out1));

// Case 2: all headings intact -> unchanged.
const orig2 = '# T\n\nbody\n\n## S\n\nmore';
check('untouched when intact', restoreHeadings(orig2, orig2) === orig2);

// Case 3: no headings in source -> passthrough.
check('no-source-headings passthrough', restoreHeadings('plain text', 'plain rewritten') === 'plain rewritten');

// Case 4: H1 rephrased, H2 kept, H3 dropped.
const orig4 = '# Title\n\na\n\n## Section\n\nb\n\n### Detail\n\nc';
const rew4 = '# New Title\n\na rewritten\n\n## Section\n\nb rewritten';
const out4 = restoreHeadings(orig4, rew4);
check('H1 swapped', out4.startsWith('# Title'));
check('H3 reinserted before end', out4.includes('### Detail'));
check('H2 intact', out4.includes('## Section'));

// Splitter regression.
const long = Array.from({ length: 60 }, (_, i) => 'Sentence ' + i + ' about sleep pressure.').join(' ');
const chunks = splitBlocksForRewrite(['# Head', long, 'Short. Fine.']);
check('splitter chunks long block', chunks.length > 2);
check('splitter keeps heading atomic', chunks[0] === '# Head');
check('splitter preserves content', chunks.join(' ').replace(/\s+/g, ' ').length >= long.replace(/\s+/g, ' ').length - 10);

console.log(failed === 0 ? '\nALL HEADING/SPLIT TESTS PASSED' : '\n' + failed + ' FAILED');
process.exit(failed === 0 ? 0 : 1);
