// Compare shared functions between engine/humanizer.js and build_worker.js.
// The builder wraps its source in a template literal, so backslash counts differ.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine', 'humanizer.js'), 'utf8').split('\n');
const bld = fs.readFileSync(path.join(root, 'build_worker.js'), 'utf8').split('\n');

function slice(arr, s, e) { return arr.slice(s - 1, e).join('\n').trim(); }
// Builder source lives inside a template literal: \\n in file -> \n at runtime.
function norm(s) { return s.replace(/\\\\/g, '\\'); }

const checks = [
  ['sanitizeInputSuperhumanizer', 26, 45, 12, 25],
  ['replaceSentenceFuzzy', 47, 71, 27, 50],
  ['BANNED_PATTERNS', 73, 151, 52, 130],
  ['cleanSentencePunct', 153, 194, 132, 173],
  ['cleanLine', 196, 218, 175, 194],
  ['mechanicalClean', 220, 241, 196, 217],
  ['cleanFormattingOnly', 244, 254, 219, 227],
  ['fixSentenceCapitalization', 256, 264, 229, 237],
  ['checkFidelity', 537, 546, 508, 517],
  ['splitBlocksForRewrite', 953, 975, 797, 817],
  ['restoreHeadings', 977, 1031, 819, 879],
];

let anyDiff = false;
for (const [name, es, ee, bs, be] of checks) {
  const a = norm(slice(eng, es, ee));
  const b = norm(slice(bld, bs, be));
  if (a === b) { console.log(name + ': SAME'); continue; }
  anyDiff = true;
  console.log(name + ': DIFF');
  const al = a.split('\n'), bl = b.split('\n');
  for (let i = 0; i < Math.max(al.length, bl.length); i++) {
    if (al[i] !== bl[i]) {
      console.log('  eng[' + (es + i) + ']: ' + JSON.stringify(al[i]));
      console.log('  bld[' + (bs + i) + ']: ' + JSON.stringify(bl[i]));
    }
  }
}
process.exit(anyDiff ? 1 : 0);
