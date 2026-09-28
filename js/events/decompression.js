/* Event: the cabin loses pressure. Answer quickly to dive down to 10,000 ft. */
(function (EL) {
  'use strict';

  const U = EL.util;
  const SAFE_ALTITUDE = 10000;
  const STEPS = 3;

  EL.events.register({
    id: 'decompression',
    title: 'Cabin pressure lost!',
    icon: '💨',
    random: true,
    canRun: (s) => s.altitude >= 15000 && !s.flags.decompressed,

    async run(ctx) {
      const { state, scene } = ctx;
      state.flags.decompressed = true;
      await ctx.alarm({ sound: 'whoosh', icon: '💨', title: 'Cabin pressure lost!' });
      state.pressure = 25;
      scene.setMasks(true);
      ctx.update();

      const start = state.altitude;
      const targets = Array.from({ length: STEPS }, (_, i) =>
        i === STEPS - 1 ? SAFE_ALTITUDE : Math.round((start - ((start - SAFE_ALTITUDE) * (i + 1)) / STEPS) / 500) * 500);
      const tracker = targets.map((t) => ({ text: `${U.fmt(t)} ft`, status: 'pending' }));
      let lostTotal = 0;

      for (let i = 0; i < STEPS; i++) {
        tracker[i].status = 'current';
        scene.setPitch(-6);
        await ctx.ask({
          step: `Dive ${i + 1} of ${STEPS}`,
          instruction: 'Oxygen masks down! Dive to 10,000 ft where there is enough air to breathe. Right answers keep everyone safe.',
          tracker,
          onResult(r) {
            state.altitude = targets[i];
            if (r.correct) {
              tracker[i].status = 'done';
              state.pressure = Math.min(100, state.pressure + 25);
              ctx.update();
              return `Down to ${U.fmt(targets[i])} ft – the air is getting better!`;
            }
            tracker[i].status = 'failed';
            const lost = ctx.losePassengers(U.randInt(12, 28));
            lostTotal += lost;
            return `Too slow! The oxygen ran out at the back – ${U.plural(lost, 'passenger')} grabbed parachutes and jumped. 🪂`;
          },
        });
      }

      scene.setPitch(0);
      scene.setMasks(false);
      state.pressure = 100;
      ctx.update();
      await ctx.message({
        html: '<p>We\'re at a safe 10,000 ft. Everyone can breathe normally – masks off! 😮‍💨</p>'
          + (lostTotal
            ? `<p>${U.plural(lostTotal, 'passenger')} parachuted out. They're safe on the ground, but they won't be landing with us.</p>`
            : '<p>Every passenger stayed on board. 🎉</p>'),
      });
    },
  });
})(window.EL);
