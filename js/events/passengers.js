/* Event: a door blows open and passengers start sliding. Right answers buckle them in. */
(function (EL) {
  'use strict';

  const U = EL.util;
  const GROUPS = 4;

  EL.events.register({
    id: 'passengers',
    title: 'Door blown open!',
    icon: '🚪',
    random: true,
    canRun: (s) => s.passengers >= 60 && (s.flags.doorCount || 0) < 2,

    async run(ctx) {
      const { state, scene } = ctx;
      state.flags.doorCount = (state.flags.doorCount || 0) + 1;
      await ctx.alarm({ sound: 'boom', icon: '🚪', title: 'Door blown open!' });
      scene.shake(12);

      const firstRow = U.randInt(30, 45);
      const groups = Array.from({ length: GROUPS }, (_, i) => [firstRow + i * 5, firstRow + i * 5 + 4]);
      const tracker = groups.map(([a, b]) => ({ text: `Rows ${a}–${b}`, status: 'pending' }));
      let lostTotal = 0;

      for (let i = 0; i < GROUPS; i++) {
        const [a, b] = groups[i];
        tracker[i].status = 'current';
        await ctx.ask({
          step: `Rows ${a}–${b}`,
          instruction: 'Passengers are sliding towards the open door! Each right answer buckles a group of rows in tight.',
          tracker,
          onResult(r) {
            if (r.correct) {
              tracker[i].status = 'done';
              return `Rows ${a}–${b} buckled in! 💺`;
            }
            tracker[i].status = 'failed';
            const lost = ctx.losePassengers(U.randInt(20, 40));
            lostTotal += lost;
            return `Whoops! ${U.plural(lost, 'passenger')} slid out – luckily everyone on this flight has a parachute. 🪂`;
          },
        });
      }

      await ctx.message({
        html: '<p>🧰 The crew have shut the door and taped it up with a LOT of tape.</p>'
          + (lostTotal
            ? `<p>${U.plural(lostTotal, 'passenger')} floated off by parachute. They'll be fine – but they're not on board any more.</p>`
            : '<p>Nobody fell out. Great work, Captain! 🎉</p>'),
      });
    },
  });
})(window.EL);
