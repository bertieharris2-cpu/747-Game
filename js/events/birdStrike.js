/* Event: a flock of geese. Each right answer steers into the clear lane. */
(function (EL) {
  'use strict';

  const U = EL.util;
  const LANES = ['⬅ Left', '⬆ Middle', '➡ Right'];
  const FLOCKS = 3;

  EL.events.register({
    id: 'birdStrike',
    title: 'Birds ahead!',
    icon: '🐦',
    random: true,

    async run(ctx) {
      const { state, scene } = ctx;
      await ctx.alarm({ sound: 'bird', icon: '🐦', title: 'Birds ahead!' });
      state.flags.birds = true;
      ctx.update();

      const tracker = Array.from({ length: FLOCKS }, (_, i) => ({ text: `Flock ${i + 1}`, status: 'pending' }));
      let hits = 0;
      let engineHit = null;

      for (let f = 0; f < FLOCKS; f++) {
        const clear = U.randInt(0, 2);
        tracker[f].status = 'current';
        scene.spawnFlock(clear);
        await ctx.ask({
          step: `Flock ${f + 1} of ${FLOCKS}`,
          instruction: (q) => q.style === 'choice'
            ? 'Geese in two lanes! Pick the right answer to steer into the clear lane.'
            : 'Geese ahead! Type the right answer to swerve round them.',
          layout: 'lanes',
          laneLabels: LANES,
          numChoices: 3,
          correctIndex: clear,
          tracker,
          onResult(r) {
            scene.resolveFlock(r.correct, clear);
            if (r.correct) {
              tracker[f].status = 'done';
              ctx.sound('whoosh');
              return 'Swerved round them! 🐦💨';
            }
            tracker[f].status = 'failed';
            hits++;
            ctx.sound('bonk');
            state.drag += 10;
            ctx.changeAltitude(-500);
            ctx.recalcSpeed();
            if (hits === 2 && engineHit === null && ctx.runningEngines() >= 2) {
              engineHit = U.pick(ctx.runningEngineIndexes());
              ctx.setEngine(engineHit, 'fire');
              ctx.insertNext('engineFire');
              ctx.sound('boom');
              return `A goose flew into engine ${engineHit + 1} – it's on fire! 🔥`;
            }
            return 'Bonk! Feathers all over the windscreen, and we lost a bit of height.';
          },
        });
      }

      state.flags.birds = false;
      ctx.update();
      let html = hits === 0
        ? '<p>Not a single feather touched us. Brilliant flying! 🐦</p>'
        : `<p>We're through the flock, with ${U.plural(hits, 'bird strike')}.</p>`;
      if (engineHit !== null) html += `<p><strong>Engine ${engineHit + 1} is on fire – get the fire checklist ready!</strong></p>`;
      await ctx.message({ html });
    },
  });
})(window.EL);
