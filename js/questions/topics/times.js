/* Topic: times tables, multiplying and dividing. */
(function (EL) {
  'use strict';

  const U = EL.util;
  const f = U.fmt;

  function tableTip(a, b) {
    const t = [a, b].includes(10) ? 10 : [a, b].includes(5) ? 5 : [a, b].includes(9) ? 9
      : [a, b].includes(4) ? 4 : [a, b].includes(8) ? 8 : [a, b].includes(2) ? 2 : null;
    const other = t === a ? b : a;
    switch (t) {
      case 10: return 'Multiplying by 10 moves each digit one place to the left.';
      case 5: return `Tip: × 5 is half of × 10 (${other} × 10 = ${other * 10}, half is ${other * 5}).`;
      case 9: return `Tip: × 9 is × 10 take away one lot: ${other * 10} − ${other} = ${other * 9}.`;
      case 4: return `Tip: × 4 is double, then double again: ${other} → ${other * 2} → ${other * 4}.`;
      case 8: return `Tip: × 8 is double, double, double: ${other} → ${other * 2} → ${other * 4} → ${other * 8}.`;
      case 2: return `Tip: × 2 is just doubling ${other}.`;
      default: return `It's the same as ${b} × ${a}.`;
    }
  }

  function mul(a, b) {
    const ans = a * b;
    let explain;
    if (a <= 12 && b <= 12) {
      explain = `${a} × ${b} = ${f(ans)}. ${tableTip(a, b)}`;
    } else if (b >= 11 && b <= 19 && a >= 10) {
      const ones = b - 10;
      explain = `Split ${b} into 10 and ${ones}: ${a} × 10 = ${f(a * 10)} and ${a} × ${ones} = ${f(a * ones)}. ${f(a * 10)} + ${f(a * ones)} = ${f(ans)}.`;
    } else {
      // partition the bigger number: 34 × 6 = 30 × 6 + 4 × 6
      const [big, small] = a >= b ? [a, b] : [b, a];
      const parts = [];
      let rest = big;
      for (let mag = Math.pow(10, String(big).length - 1); mag >= 1; mag /= 10) {
        const chunk = Math.floor(rest / mag) * mag;
        if (chunk) parts.push(chunk);
        rest -= chunk;
      }
      explain = `Split ${f(big)} into ${parts.map(f).join(' + ')}: `
        + parts.map((p) => `${f(p)} × ${small} = ${f(p * small)}`).join(', ')
        + `. Add them: ${f(ans)}.`;
    }
    return {
      key: `mul:${Math.min(a, b)}x${Math.max(a, b)}`,
      prompt: `${f(a)} × ${f(b)} = ?`,
      answer: ans,
      distractors: [(a + 1) * b, (a - 1) * b, a * (b + 1), a * (b - 1), a + b, ans + 10, ans - 10],
      explain,
    };
  }

  function div(n, b) {
    const ans = n / b;
    return {
      key: `div:${n}/${b}`,
      prompt: `${f(n)} ÷ ${b} = ?`,
      answer: ans,
      distractors: [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, n - b],
      explain: `${f(n)} ÷ ${b} = ${f(ans)}, because ${f(ans)} × ${b} = ${f(n)}.`,
    };
  }

  // Randomly show 7 × 8 or 8 × 7
  const either = (x, y) => (U.chance(0.5) ? mul(x, y) : mul(y, x));

  function notMultipleOf10(min, max) {
    let n;
    do n = U.randInt(min, max); while (n % 10 === 0);
    return n;
  }

  function generate(level) {
    const R = U.randInt;
    switch (level) {
      case 1:
        return either(R(1, 10), U.pick([2, 5, 10]));
      case 2:
        return U.chance(0.7)
          ? either(R(2, 10), U.pick([2, 3, 4, 5, 8, 10]))
          : (() => {
              const t = U.pick([2, 5, 10]);
              return div(t * R(2, 10), t);
            })();
      case 3:
        return U.chance(0.6)
          ? either(R(2, 12), R(2, 12))
          : (() => {
              const t = R(2, 12);
              return div(t * R(2, 12), t);
            })();
      case 4:
        return U.chance(0.6)
          ? mul(notMultipleOf10(12, 49), R(3, 9))
          : (() => {
              const b = R(3, 9);
              return div(R(12, 30) * b, b);
            })();
      default:
        return U.pickWeighted([
          [2, () => mul(R(12, 25), R(11, 15))],
          [1, () => mul(notMultipleOf10(105, 450), R(3, 6))],
          [1, () => {
            const b = R(3, 9);
            return div(R(21, 99) * b, b);
          }],
        ]);
    }
  }

  EL.questions.registerTopic({
    id: 'times',
    name: 'Times tables & dividing',
    description: 'Tables facts up to 12 × 12, then bigger multiplying and dividing.',
    generate,
  });
})(window.EL);
