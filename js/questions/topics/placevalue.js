/* Topic: place value, rounding, and multiplying/dividing by 10, 100, 1000. */
(function (EL) {
  'use strict';

  const U = EL.util;
  const f = U.fmt;

  const PLACE_NAMES = { 1000: 'thousands', 100: 'hundreds', 10: 'tens', 1: 'ones', 0.1: 'tenths', 0.01: 'hundredths' };
  const placeName = (p) => PLACE_NAMES[U.round(p)] || f(p) + 's';

  function more(n, step, dir) {
    const ans = n + dir * step;
    const word = dir > 0 ? 'more' : 'less';
    return {
      key: `pv-${word}:${step}:${n}`,
      prompt: `What is ${f(step)} ${word} than ${f(n)}?`,
      answer: ans,
      distractors: [n + dir * step * 10, n + (dir * step) / 10, n - dir * step, ans + 1, ans - 1],
      explain: `${dir > 0 ? 'Adding' : 'Taking away'} ${f(step)} changes the ${placeName(step)} digit: ${f(n)} → ${f(ans)}.`,
    };
  }

  // What is the value of the highlighted digit? n may be a decimal like 4.35
  function digitValue(n) {
    const str = String(n);
    const digits = str.replace('.', '');
    const pointPos = str.includes('.') ? str.indexOf('.') : str.length; // digits before the point
    const options = [];
    for (let i = 0; i < digits.length; i++) {
      const d = digits[i];
      if (d !== '0' && digits.indexOf(d) === digits.lastIndexOf(d)) options.push(i);
    }
    if (!options.length) return null;
    const i = U.pick(options);
    const d = Number(digits[i]);
    const place = U.round(Math.pow(10, pointPos - 1 - i));
    const ans = U.round(d * place);
    const shown = f(n).replace(String(d), `<strong class="hl">${d}</strong>`);
    return {
      key: `pv-digit:${n}:${i}`,
      prompt: `What is the value of the <strong class="hl">${d}</strong> in ${shown}?`,
      answer: ans,
      distractors: [d, d * 10, d * 100, d * 1000, U.round(d * 0.1), U.round(ans * 10), U.round(ans / 10)],
      explain: `The ${d} is in the ${placeName(place)} place, so it is worth ${f(ans)}.`,
    };
  }

  function roundTo(n, to) {
    const ans = U.round(Math.round(n / to) * to);
    const lookAt = U.round(to / 10);
    const digit = Math.floor(U.round(n / lookAt)) % 10;
    const down = U.round(Math.floor(U.round(n / to)) * to);
    const up = U.round(down + to);
    const target = to === 1 ? 'whole number' : f(to);
    return {
      key: `pv-round:${to}:${n}`,
      prompt: `Round ${f(n)} to the nearest ${target}.`,
      answer: ans,
      distractors: [down, up, U.round(ans + to), U.round(ans - to), U.round(Math.round(n / (to * 10)) * to * 10), U.round(Math.round(n / lookAt) * lookAt)],
      explain: `Look at the ${placeName(lookAt)} digit: it's ${digit}. `
        + (digit >= 5 ? '5 or more, so round up' : 'Less than 5, so round down')
        + ` to ${f(ans)}.`,
    };
  }

  function scale(n, factor, op) {
    const ans = U.round(op === '×' ? n * factor : n / factor);
    const places = String(factor).length - 1;
    return {
      key: `pv-${op === '×' ? 'mul' : 'div'}:${n}:${factor}`,
      prompt: `${f(n)} ${op} ${f(factor)} = ?`,
      answer: ans,
      distractors: [U.round(ans * 10), U.round(ans / 10), U.round(ans * 100), U.round(ans / 100), n],
      explain: `${op === '×' ? 'Multiplying' : 'Dividing'} by ${f(factor)} moves every digit ${places} place${places > 1 ? 's' : ''} to the ${op === '×' ? 'left' : 'right'}: ${f(n)} → ${f(ans)}.`,
    };
  }

  function notMultiple(min, max, of) {
    let n;
    do n = U.randInt(min, max); while (n % of === 0);
    return n;
  }

  function digitValueOf(makeNumber) {
    for (let tries = 0; tries < 30; tries++) {
      const q = digitValue(makeNumber());
      if (q) return q;
    }
    return more(U.randInt(11, 89), 10, 1);
  }

  function generate(level) {
    const R = U.randInt;
    switch (level) {
      case 1:
        return U.chance(0.5)
          ? more(R(11, 89), 10, U.pick([1, -1]))
          : digitValueOf(() => R(11, 98));
      case 2:
        return U.pickWeighted([
          [1, () => more(R(100, 899), U.pick([10, 100]), U.pick([1, -1]))],
          [1, () => digitValueOf(() => R(102, 987))],
          [1, () => roundTo(notMultiple(11, 999, 10), 10)],
        ]);
      case 3:
        return U.pickWeighted([
          [1, () => roundTo(notMultiple(101, 999, 100), 100)],
          [1, () => digitValueOf(() => R(1023, 9876))],
          [1, () => more(R(1000, 8999), 1000, U.pick([1, -1]))],
          [1, () => scale(R(2, 99), 10, '×')],
        ]);
      case 4:
        return U.pickWeighted([
          [1, () => roundTo(notMultiple(1001, 9999, 1000), U.pick([100, 1000]))],
          [1, () => scale(R(3, 99), U.pick([10, 100]), '×')],
          [1, () => scale(10 * R(3, 99), 10, '÷')],
          [1, () => digitValueOf(() => R(10234, 98765))],
        ]);
      default:
        return U.pickWeighted([
          [1, () => scale(U.round(notMultiple(11, 999, 10) / 10), U.pick([10, 100]), '×')],
          [1, () => scale(notMultiple(2, 99, 10), U.pick([10, 100]), '÷')],
          [1, () => roundTo(U.round(notMultiple(11, 199, 10) / 10), 1)],
          [1, () => digitValueOf(() => U.round(R(111, 999) / 100))],
        ]);
    }
  }

  EL.questions.registerTopic({
    id: 'placevalue',
    name: 'Place value & rounding',
    description: '10/100/1000 more or less, digit values, rounding, × and ÷ by 10 and 100.',
    generate,
  });
})(window.EL);
