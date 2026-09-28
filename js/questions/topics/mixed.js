/* Topic: mixed number work – the default. Draws from every other topic. */
(function (EL) {
  'use strict';

  const U = EL.util;

  // Mental arithmetic gets more airtime than the other strands.
  const MIX = [
    [3, 'addsub'],
    [3, 'times'],
    [2, 'placevalue'],
    [2, 'fractions'],
  ];

  EL.questions.registerTopic({
    id: 'mixed',
    name: 'Mixed number work',
    description: 'A bit of everything: mental adding, subtracting, tables, place value and fractions.',
    generate(level) {
      const available = MIX.filter(([, id]) => EL.questions.get(id));
      return U.pickWeighted(available.map(([w, id]) => [w, () => EL.questions.get(id).generate(level)]));
    },
  });
})(window.EL);
