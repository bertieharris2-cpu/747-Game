/*
 * Checks the maths engine: every generated question at every level has a
 * correct answer, sensible multiple-choice options and no repeats in a flight.
 * Run with:  node tests/questions.test.js   (or npm test)
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
global.window = global;
[
  'js/core/util.js',
  'js/questions/engine.js',
  'js/questions/topics/addsub.js',
  'js/questions/topics/times.js',
  'js/questions/topics/placevalue.js',
  'js/questions/topics/fractions.js',
  'js/questions/topics/mixed.js',
  'js/events/registry.js',
  'js/game.js',
].forEach((file) => vm.runInThisContext(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file }));

const EL = global.EL;
const Q = EL.questions;
const U = EL.util;
let failures = 0;
let checks = 0;

function check(cond, msg) {
  checks++;
  if (!cond) {
    failures++;
    if (failures <= 40) console.error('  ✗', msg);
  }
}

const close = (a, b) => Math.abs(a - b) < 1e-9;

// Work out the expected answer independently, from the question key.
function expectedFromKey(key, prompt) {
  let m;
  if ((m = key.match(/^add:(\d+)\+(\d+)$/))) return +m[1] + +m[2];
  if ((m = key.match(/^sub:(\d+)-(\d+)$/))) return +m[1] - +m[2];
  if ((m = key.match(/^missadd:(\d+):(\d+)$/))) return +m[2] - +m[1];
  if ((m = key.match(/^mul:(\d+)x(\d+)$/))) return +m[1] * +m[2];
  if ((m = key.match(/^div:(\d+)\/(\d+)$/))) return +m[1] / +m[2];
  if ((m = key.match(/^pv-more:([\d.]+):([\d.]+)$/))) return U.round(+m[2] + +m[1]);
  if ((m = key.match(/^pv-less:([\d.]+):([\d.]+)$/))) return U.round(+m[2] - +m[1]);
  if ((m = key.match(/^pv-mul:([\d.]+):(\d+)$/))) return U.round(+m[1] * +m[2]);
  if ((m = key.match(/^pv-div:([\d.]+):(\d+)$/))) return U.round(+m[1] / +m[2]);
  if ((m = key.match(/^pv-round:([\d.]+):([\d.]+)$/))) {
    const to = +m[1];
    const n = +m[2];
    // round half up, done with integer maths to dodge float issues
    const scaled = Math.round(n * 1000);
    const step = Math.round(to * 1000);
    return U.round((Math.floor((scaled + step / 2) / step) * step) / 1000);
  }
  if ((m = key.match(/^pv-digit:([\d.]+):(\d+)$/))) {
    const str = m[1];
    const i = +m[2];
    const digits = str.replace('.', '');
    const pointPos = str.includes('.') ? str.indexOf('.') : str.length;
    const hl = prompt.match(/class="hl">(\d)</);
    check(hl && hl[1] === digits[i], `${key}: highlighted digit matches`);
    return U.round(+digits[i] * Math.pow(10, pointPos - 1 - i));
  }
  if ((m = key.match(/^fr:(\d+)\/(\d+):(\d+)$/))) return (+m[3] * +m[1]) / +m[2];
  if ((m = key.match(/^pc:(\d+):(\d+)$/))) return (+m[2] * +m[1]) / 100;
  return undefined;
}

console.log('Question generators');
for (const topic of Q.listTopics()) {
  for (let level = 1; level <= 5; level++) {
    for (let n = 0; n < 400; n++) {
      const q = topic.generate(level);
      const where = `${topic.id} L${level} "${q.prompt}"`;
      check(typeof q.key === 'string' && q.key.length > 0, `${where}: has a key`);
      check(typeof q.prompt === 'string' && q.prompt.length > 0, `${where}: has a prompt`);
      check(typeof q.explain === 'string' && q.explain.length > 0 && !q.explain.includes('undefined') && !q.explain.includes('NaN'), `${where}: explanation "${q.explain}"`);
      check(!q.prompt.includes('undefined') && !q.prompt.includes('NaN'), `${where}: clean prompt`);
      check(typeof q.answer === 'number' && isFinite(q.answer), `${where}: numeric answer`);
      check(q.answer >= 0, `${where}: non-negative answer ${q.answer}`);
      check(U.decimals(q.answer) <= 2, `${where}: at most 2 decimal places (${q.answer})`);
      const expected = expectedFromKey(q.key, q.prompt);
      check(expected !== undefined, `${where}: key "${q.key}" is understood by the test`);
      if (expected !== undefined) check(close(U.round(q.answer), U.round(expected)), `${where}: answer ${q.answer} should be ${expected}`);

      for (const size of [3, 4]) {
        const correctIndex = size === 3 ? n % 3 : null;
        const choices = Q.makeChoices(q.answer, q.distractors, size, correctIndex);
        check(choices.length === size, `${where}: ${size} choices`);
        check(new Set(choices.map(String)).size === size, `${where}: choices unique ${choices}`);
        check(choices.filter((c) => close(c, U.round(q.answer))).length === 1, `${where}: answer appears once in ${choices}`);
        check(choices.every((c) => c >= 0), `${where}: no negative options ${choices}`);
        if (Number.isInteger(U.round(q.answer))) check(choices.every(Number.isInteger), `${where}: whole-number options ${choices}`);
        if (correctIndex != null) check(close(choices[correctIndex], U.round(q.answer)), `${where}: answer placed at lane ${correctIndex}`);
      }
    }
  }
}

console.log('Quiz master');
for (const topic of ['mixed', 'addsub', 'times', 'placevalue', 'fractions']) {
  for (const level of [1, 3, 5]) {
    const quiz = Q.createQuizMaster({ topic, answerStyle: 'auto', timer: 'normal' });
    const keys = new Set();
    // A long flight asks at most ~15 questions at any one level.
    for (let i = 0; i < 15; i++) {
      const q = quiz.next(level);
      check(!keys.has(q.key), `${topic} L${level}: no repeat within a flight (${q.key})`);
      keys.add(q.key);
    }
  }
}
{
  const auto = Q.createQuizMaster({ topic: 'mixed', answerStyle: 'auto', timer: 'normal' });
  check(auto.next(2).style === 'choice', 'auto style: multiple choice at level 2');
  check(auto.next(5).style === 'typed', 'auto style: typed at level 5');
  check(auto.next(5).choices === null, 'typed questions have no options');
  check(auto.next(1).timeLimit === 15, 'normal timer: 15s at level 1');
  const relaxed = Q.createQuizMaster({ topic: 'mixed', answerStyle: 'choice', timer: 'relaxed' });
  check(relaxed.next(1).timeLimit === 30, 'relaxed timer doubles the time');
  check(relaxed.next(5).style === 'choice', 'always multiple choice when chosen');
  const off = Q.createQuizMaster({ topic: 'mixed', answerStyle: 'typed', timer: 'off' });
  check(off.next(3).timeLimit === null, 'timer off → no time limit');
  check(off.next(1).style === 'typed', 'always typed when chosen');
}

console.log('Answer parsing');
[
  ['56', 56], [' 1,234 ', 1234], ['1 234', 1234], ['0.5', 0.5], ['.5', 0.5], ['7.', 7], ['−3', -3],
].forEach(([text, value]) => check(Q.parseAnswer(text) === value, `parseAnswer("${text}") → ${value}`));
['', 'abc', '1.2.3', '5-', '--1'].forEach((text) => check(isNaN(Q.parseAnswer(text)), `parseAnswer("${text}") → NaN`));
check(Q.isCorrect({ answer: 0.3 }, U.round(0.1 + 0.2)), 'isCorrect copes with 0.1 + 0.2');

console.log('Endings');
{
  const base = () => ({ passengers: 300, landing: { correct: 5, total: 5 }, landingPenalties: [], flags: {} });
  const ending = (patch) => EL.game.computeEnding(Object.assign(base(), patch));
  check(ending({}) === 'perfect', '5/5, no penalties → perfect');
  check(ending({ landing: { correct: 4, total: 5 } }) === 'smooth', '4/5 → smooth');
  check(ending({ landing: { correct: 3, total: 5 } }) === 'bumpy', '3/5 → bumpy');
  check(ending({ landing: { correct: 2, total: 5 } }) === 'field', '2/5 → cabbage field');
  check(ending({ landing: { correct: 2, total: 5 }, flags: { outOfFuel: true } }) === 'pond', '2/5 out of fuel → duck pond');
  check(ending({ landing: { correct: 1, total: 5 } }) === 'tower', '1/5 → control tower');
  check(ending({ landingPenalties: ['a', 'b', 'c'] }) === 'bumpy', 'penalties are capped at 2');
  check(ending({ landing: { correct: 2, total: 5 }, landingPenalties: ['a', 'b'] }) === 'tower', 'nothing left after penalties → tower');
  check(ending({ passengers: 0 }) === 'empty', 'no passengers → empty plane');
  for (const id of ['perfect', 'smooth', 'bumpy', 'field', 'pond', 'tower', 'empty']) check(!!EL.game.ENDINGS[id], `ending "${id}" is defined`);
}

console.log('Flight plan');
{
  const ids = ['a', 'b', 'c', 'd', 'e'];
  for (let n = 0; n < 200; n++) {
    const plan = EL.game.buildPlan(6, ids);
    check(plan.length === 6, 'plan has the right length');
    check(new Set(plan.slice(0, 5)).size === 5, `every event once before repeats: ${plan}`);
    check(plan.every((id, i) => id !== plan[i - 1]), `no back-to-back repeats: ${plan}`);
  }
}

console.log(`\n${checks - failures}/${checks} checks passed`);
if (failures) {
  console.error(`${failures} failed`);
  process.exit(1);
}
