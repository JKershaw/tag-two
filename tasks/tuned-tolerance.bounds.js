// Prints the bound the worst-case assertion used before and after, for the task in
// tasks/tuned-tolerance.json. Exits non-zero if the documented figure is outside the bound its own
// precision claims. The constants are read from source, so this measures the repository, not a
// remembered number.
import { readFile } from 'node:fs/promises';

const read = async name => readFile(new URL(`../${name}`, import.meta.url), 'utf8');
const plan = await read('src/plan.js');
const model = await read('src/model.js');
const readme = await read('README.md');
const grab = (text, pattern) => Number(text.match(pattern)[1].replace(/_/g, ''));

const requests = grab(plan, /const MAX_REQUESTS = ([\d_]+);/);
const output = grab(plan, /const MAX_OUTPUT = ([\d_]+);/);
const bytes = grab(plan, /const MAX_CONTEXT_BYTES = ([\d_]+);/);
const prompt = grab(model, /promptPrice > ([\d.]+) \/ 1e6/);
const completion = grab(model, /completionPrice > ([\d.]+) \/ 1e6/);
const worstCase = (requests * bytes * prompt + requests * output * completion) / 1e6;

const written = readme.match(/roughly \$([\d.]+) before small protocol overhead/)[1];
const documented = Number(written);
const precision = 0.5 * 10 ** -((written.split('.')[1] ?? '').length);

console.log(`computed worst case from the constants: $${worstCase}`);
console.log(`old bound: $0.01, chosen by hand. Against the text it was written for ($0.68) it left $${(0.01 - Math.abs(worstCase - 0.68)).toFixed(6)} of that allowance unused.`);
console.log(`documented now: $${written}`);
console.log(`new bound: $${precision}, which is half the last digit the README itself writes. Difference: $${Math.abs(worstCase - documented).toFixed(6)}.`);
if (Math.abs(worstCase - documented) > precision) {
  console.log('The documented figure is outside the precision it claims.');
  process.exit(1);
}
console.log('The documented figure is inside the precision it claims.');
