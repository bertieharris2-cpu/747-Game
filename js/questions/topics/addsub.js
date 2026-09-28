/* Topic: adding and subtracting (mental methods). */
(function (EL) {
  'use strict';

  const U = EL.util;
  const f = U.fmt;

  // Split b into its biggest place-value chunk and the rest: 38 → [30, 8], 245 → [200, 45]
  function splitNumber(b) {
    const mag = Math.pow(10, String(b).length - 1);
    const big = Math.floor(b / mag) * mag;
    return [big, b - big];
  }

  function add(a, b) {
    const ans = a + b;
    let explain;
    if (b < 10) {
      explain = `Count on ${b} from ${f(a)} to get ${f(ans)}.`;
    } else {
      const [big, rest] = splitNumber(b);
      explain = rest === 0
        ? `${f(a)} + ${f(b)} = ${f(ans)}.`
        : `Split ${f(b)} into ${f(big)} and ${f(rest)}: ${f(a)} + ${f(big)} = ${f(a + big)}, then + ${f(rest)} = ${f(ans)}.`;
    }
    return {
      key: `add:${a}+${b}`,
      prompt: `${f(a)} + ${f(b)} = ?`,
      answer: ans,
      distractors: [ans + 1, ans - 1, ans + 10, ans - 10, ans + 2, ans - 2, Math.abs(a - b)],
      explain,
    };
  }

  function sub(a, b) {
    const ans = a - b;
    let explain;
    if (b < 10) {
      explain = `Count back ${b} from ${f(a)} to get ${f(ans)}.`;
    } else {
      const [big, rest] = splitNumber(b);
      explain = rest === 0
        ? `${f(a)} − ${f(b)} = ${f(ans)}.`
        : `Take away ${f(big)} first: ${f(a)} − ${f(big)} = ${f(a - big)}, then − ${f(rest)} = ${f(ans)}.`;
    }
    explain += ` Check: ${f(ans)} + ${f(b)} = ${f(a)}.`;
    return {
      key: `sub:${a}-${b}`,
      prompt: `${f(a)} − ${f(b)} = ?`,
      answer: ans,
      distractors: [ans + 1, ans - 1, ans + 10, ans - 10, ans + 2, a + b],
      explain,
    };
  }

  // ? + b = c
  function missingAdd(b, c) {
    const ans = c - b;
    return {
      key: `missadd:${b}:${c}`,
      prompt: `<span class="box">?</span> + ${f(b)} = ${f(c)}`,
      answer: ans,
      distractors: [ans + 10, ans - 10, ans + 1, ans - 1, b + c],
      explain: `Work backwards: ${f(c)} − ${f(b)} = ${f(ans)}.`,
    };
  }

  function generate(level) {
    const R = U.randInt;
    switch (level) {
      case 1:
        return U.chance(0.5)
          ? add(R(1, 10), R(1, 10))
          : (() => {
              const a = R(6, 20);
              return sub(a, R(1, Math.min(10, a - 1)));
            })();
      case 2:
        return U.pickWeighted([
          [2, () => add(R(11, 79), R(2, 9))],
          [1, () => add(R(11, 69), 10 * R(1, 3))],
          [2, () => sub(R(21, 99), R(2, 9))],
        ]);
      case 3:
        return U.chance(0.5)
          ? (() => {
              const a = R(15, 75);
              return add(a, R(12, 99 - a));
            })()
          : (() => {
              const a = R(40, 99);
              return sub(a, R(11, a - 10));
            })();
      case 4:
        return U.pickWeighted([
          [1, () => add(R(120, 850), R(25, 99))],
          [1, () => {
            const a = R(120, 700);
            return add(a, R(110, 999 - a));
          }],
          [1, () => sub(R(200, 999), R(25, 99))],
          [1, () => {
            const a = R(300, 999);
            return sub(a, R(101, a - 50));
          }],
        ]);
      default:
        return U.pickWeighted([
          [1, () => {
            const c = R(100, 999);
            return missingAdd(R(25, c - 20), c);
          }],
          [1, () => add(R(1200, 8500), R(150, 999))],
          [1, () => {
            const a = R(2000, 9999);
            return sub(a, R(150, 1999));
          }],
        ]);
    }
  }

  EL.questions.registerTopic({
    id: 'addsub',
    name: 'Adding & subtracting',
    description: 'Number bonds up to 4-digit mental adding and taking away.',
    generate,
  });
})(window.EL);
