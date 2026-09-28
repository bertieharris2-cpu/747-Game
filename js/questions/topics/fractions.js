/* Topic: fractions and percentages of amounts. */
(function (EL) {
  'use strict';

  const U = EL.util;
  const f = U.fmt;

  const frac = (n, d) =>
    `<span class="frac"><span class="num" aria-hidden="true">${n}</span><span class="den" aria-hidden="true">${d}</span><span class="sr-only">${n}/${d}</span></span>`;

  function fractionOf(n, d, amount) {
    const unit = amount / d;
    const ans = unit * n;
    return {
      key: `fr:${n}/${d}:${amount}`,
      prompt: `What is ${frac(n, d)} of ${f(amount)}?`,
      answer: ans,
      distractors: [unit, amount - ans, ans + unit, ans - unit, amount / n, ans + 1, ans - 1, amount * n],
      explain: n === 1
        ? `To find ${frac(1, d)}, divide by ${d}: ${f(amount)} ÷ ${d} = ${f(ans)}.`
        : `Find ${frac(1, d)} first: ${f(amount)} ÷ ${d} = ${f(unit)}. Then × ${n}: ${f(unit)} × ${n} = ${f(ans)}.`,
    };
  }

  const PERCENT_TIPS = {
    50: (a) => `50% is a half: ${f(a)} ÷ 2 = ${f(a / 2)}.`,
    25: (a) => `25% is a quarter: halve and halve again. ${f(a)} → ${f(a / 2)} → ${f(a / 4)}.`,
    75: (a) => `75% is three quarters: ${f(a)} ÷ 4 = ${f(a / 4)}, then × 3 = ${f((a / 4) * 3)}.`,
    10: (a) => `10% means divide by 10: ${f(a)} ÷ 10 = ${f(a / 10)}.`,
    20: (a) => `Find 10% (${f(a / 10)}) then double it: ${f(a / 5)}.`,
    5: (a) => `Find 10% (${f(a / 10)}) then halve it: ${f(a / 20)}.`,
  };

  function percentOf(p, amount) {
    const ans = (amount * p) / 100;
    return {
      key: `pc:${p}:${amount}`,
      prompt: `What is ${p}% of ${f(amount)}?`,
      answer: ans,
      distractors: [amount / 10, ans * 2, ans / 2, amount - ans, ans + amount / 10, p],
      explain: PERCENT_TIPS[p](amount),
    };
  }

  function coprimeNumerator(d) {
    const options = [];
    for (let n = 2; n < d; n++) if (U.gcd(n, d) === 1) options.push(n);
    return U.pick(options);
  }

  function generate(level) {
    const R = U.randInt;
    switch (level) {
      case 1:
        return U.pickWeighted([
          [3, () => fractionOf(1, 2, 2 * R(2, 15))],
          [1, () => fractionOf(1, 2, 10 * R(4, 10))],
          [2, () => fractionOf(1, 4, 4 * R(1, 10))],
        ]);
      case 2: {
        const d = U.pick([2, 3, 4, 5, 10]);
        return fractionOf(1, d, d * R(2, 10));
      }
      case 3: {
        const d = R(3, 12);
        return fractionOf(1, d, d * R(2, 12));
      }
      case 4: {
        const d = U.pick([3, 4, 5, 6, 8, 10]);
        return fractionOf(coprimeNumerator(d), d, d * R(2, 12));
      }
      default:
        return U.chance(0.5)
          ? (() => {
              const p = U.pick([5, 10, 20, 25, 50, 75]);
              const amount = { 5: 20 * R(2, 30), 10: 10 * R(3, 60), 20: 10 * R(3, 50), 25: 4 * R(3, 40), 50: 2 * R(10, 200), 75: 4 * R(3, 40) }[p];
              return percentOf(p, amount);
            })()
          : (() => {
              const d = U.pick([6, 7, 8, 9, 12]);
              return fractionOf(coprimeNumerator(d), d, d * R(3, 12));
            })();
    }
  }

  EL.questions.registerTopic({
    id: 'fractions',
    name: 'Fractions & percentages',
    description: 'Halves and quarters up to non-unit fractions and percentages of amounts.',
    generate,
  });
})(window.EL);
