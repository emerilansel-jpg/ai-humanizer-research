// One-shot parity check: engine vs builder vs worker for QA-loop-3 functions.
// Compares BEHAVIOR (normalized source after template-literal unescape).
// Known false positives: inline comments differ (engine-only commentary);
// template-literal escaping differs by design (two runtimes).
// For restoreHeadings, also runs a behavioral eval comparison below.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

function extract(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) return '';
  let d = 0;
  const start = src.indexOf('{', i);
  for (let k = start; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (d === 0) return src.slice(i, k + 1); }
  }
  return '';
}

function norm(s) { return s.replace(/\\\\/g, '\\').replace(/\r/g, '').trim(); }

const eng = fs.readFileSync(path.join(root, 'engine', 'humanizer.js'), 'utf8');
const bld = fs.readFileSync(path.join(root, 'build_worker.js'), 'utf8');
const wrk = fs.readFileSync(path.join(root, 'worker.js'), 'utf8');

let fail = 0;
for (const name of ['detectNonEnglish', 'validateFormat', 'splitBlocksForRewrite']) {
  const e = norm(extract(eng, name));
  const b = norm(extract(bld, name));
  const w = norm(extract(wrk, name));
  const eb = e === b;
  const bw = b === w;
  console.log(name + ': engine==builder ' + (eb ? 'OK' : 'DIFF') + ', builder==worker ' + (bw ? 'OK' : 'DIFF'));
  if (!eb || !bw) {
    fail++;
    const ref = eb ? b : e;
    const other = eb ? w : e;
    const rl = ref.split('\n'), ol = other.split('\n');
    for (let i = 0; i < Math.max(rl.length, ol.length); i++) {
      if (rl[i] !== ol[i]) {
        console.log('  first diff @' + i);
        console.log('  A: ' + JSON.stringify(rl[i]));
        console.log('  B: ' + JSON.stringify(ol[i]));
        break;
      }
    }
  }
}

// restoreHeadings: behavioral eval parity (comments/escaping excluded by design).
function builderFn(name) {
  const raw = extract(bld, name);
  return eval('(' + raw.replace(/\\\\/g, '\\') + ')');
}
function workerFn(name) { return eval('(' + extract(wrk, name) + ')'); }
const bRH = builderFn('restoreHeadings');
const wRH = workerFn('restoreHeadings');
const eRH = require(path.join(root, 'engine', 'humanizer.js')).restoreHeadings;
const orig = '# Long Title Here\n\npara\n\n## Part 7: The 20-Minute Rule (The "Reset")\n\nbody\n\n## Conclusion: The 10-Point Checklist\n\nend';
const rew = "# How to Fall Asleep When Your Mind Won't Quit\n\npara rewritten\n\n## Conclusion: The 10-Point Checklist\n\nend rewritten";
const o2 = '# T\n\nx\n\n## A + B (c) [100%]\n\ny';
const r2 = '# T\n\nx rewritten\n\n## A + B (c) [100%] rewritten\n\ny rewritten';
const behavioral =
  eRH(orig, rew) === bRH(orig, rew) && bRH(orig, rew) === wRH(orig, rew) &&
  eRH(o2, r2) === bRH(o2, r2) && bRH(o2, r2) === wRH(o2, r2);
console.log('restoreHeadings behavioral (e==b==w, incl metachar): ' + (behavioral ? 'OK' : 'FAIL'));
if (!behavioral) fail++;

// LANGUAGE guard count across all three.
for (const [label, src] of [['engine', eng], ['builder', bld], ['worker', wrk]]) {
  const n = (src.match(/LANGUAGE: Output MUST be 100% English/g) || []).length;
  console.log(label + ' LANGUAGE guards: ' + n + (n === 4 ? ' OK' : ' FAIL'));
  if (n !== 4) fail++;
}

console.log(fail === 0 ? '\nPARITY ALL OK' : '\n' + fail + ' PARITY FAILURES');
process.exit(fail === 0 ? 0 : 1);
