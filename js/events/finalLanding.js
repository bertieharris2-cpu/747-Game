/*
 * Event: the final approach. The hardest questions of the flight; how many
 * you get right (minus any tricky conditions) decides how the landing goes.
 */
(function (EL) {
  'use strict';

  const U = EL.util;
  const STAGES = ['Line up', 'Wheels down', 'Flaps out', 'Slow down', 'Touchdown'];
  const MISS_NOTES = ['Drifting off the centre line!', 'Too high – nose down a bit!', 'Wobbly wings!', 'Too fast – ease off!'];

  EL.events.register({
    id: 'finalLanding',
    title: 'Final approach',
    icon: '🛬',

    async run(ctx) {
      const { state, scene } = ctx;
      state.phase = 'landing';
      state.landingPenalties = EL.game.landingPenalties(state);
      const where = state.destination ? ` to ${state.destination.name}` : '';
      await ctx.alarm({ sound: 'chime', icon: '🛬', title: `Final approach${where}` });
      scene.setLanding(true);
      scene.setBank(state.balance.x * 0.3);
      scene.setPitch(-2);
      scene.setRunway({ p: 0.12, off: 0 });

      const tracker = STAGES.map((text) => ({ text, status: 'pending' }));
      const startAlt = Math.min(state.altitude, 3000);
      state.altitude = startAlt;
      ctx.update();
      const startSpeed = state.speed;
      const penalties = state.landingPenalties;
      const instruction = 'Runway in sight! These are the hardest questions – each right answer keeps us on the glide path.'
        + (penalties.length ? ` Tricky conditions: ${penalties.join(', ')}.` : '');
      let correct = 0;

      for (let i = 0; i < STAGES.length; i++) {
        tracker[i].status = 'current';
        await ctx.ask({
          step: `${STAGES[i]} (${i + 1}/${STAGES.length})`,
          instruction,
          tracker,
          onResult(r) {
            const progress = (i + 1) / STAGES.length;
            state.altitude = Math.round(startAlt * (1 - progress));
            state.speed = Math.round(U.lerp(startSpeed, 150, progress));
            if (r.correct) {
              correct++;
              tracker[i].status = 'done';
              scene.setRunway({ p: 0.12 + progress * 0.7, off: 0 });
              ctx.update();
              return 'Right on the glide path ✓';
            }
            tracker[i].status = 'failed';
            scene.setRunway({ p: 0.12 + progress * 0.7, off: U.pick([-1, 1]) * U.rand(0.4, 0.8) });
            ctx.update();
            return U.pick(MISS_NOTES);
          },
        });
      }

      state.landing = { correct, total: STAGES.length };
      state.ending = EL.game.computeEnding(state);
      EL.ui.challenge.hide();
      EL.ui.challenge.alert.hide();

      // Touchdown!
      const e = state.ending;
      if (e === 'tower') {
        scene.crashIntoTower();
        await ctx.wait(1300);
        ctx.sound('crash');
        scene.shake(16);
        scene.flash();
      } else if (e === 'field' || e === 'pond') {
        scene.setRunway({ p: 0.55, off: 0 });
        scene.setPitch(4);
        await ctx.wait(1200);
        ctx.sound(e === 'pond' ? 'splash' : 'crash');
        scene.shake(14);
      } else {
        scene.setRunway({ p: 1, off: 0 });
        await ctx.wait(1400);
        ctx.sound('thud');
        scene.shake(e === 'bumpy' ? 12 : e === 'smooth' ? 6 : 3);
      }
      state.altitude = 0;
      state.speed = 0;
      ctx.update();
      await ctx.wait(1500);
    },
  });
})(window.EL);
