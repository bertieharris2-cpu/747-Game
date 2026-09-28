/* Event: engine fire. Each right answer completes a step of the fire checklist. */
(function (EL) {
  'use strict';

  const U = EL.util;
  const STEPS = ['Thrust lever: IDLE', 'Fuel switch: CUT-OFF', 'Pull the fire handle', 'Fire bottle: DISCHARGE'];

  EL.events.register({
    id: 'engineFire',
    title: 'Engine fire!',
    icon: '🔥',
    random: true,
    canRun: (s) => s.engines.includes('fire') || s.engines.filter((e) => e === 'on').length >= 2,

    async run(ctx) {
      const { state, scene } = ctx;
      let idx = state.engines.indexOf('fire');
      if (idx < 0) {
        idx = U.pick(ctx.runningEngineIndexes());
        ctx.setEngine(idx, 'fire');
      }
      await ctx.alarm({ sound: 'fire', icon: '🔥', title: `Engine ${idx + 1} on fire!` });

      const tracker = STEPS.map((text) => ({ text, status: 'pending' }));
      let misses = 0;
      for (let i = 0; i < STEPS.length; i++) {
        tracker[i].status = 'current';
        await ctx.ask({
          step: `Step ${i + 1} of ${STEPS.length}`,
          instruction: `Run the fire checklist for engine ${idx + 1}. Each right answer completes a step.`,
          tracker,
          onResult(r) {
            if (r.correct) {
              tracker[i].status = 'done';
              return `${STEPS[i]} ✓`;
            }
            tracker[i].status = 'failed';
            misses++;
            scene.shake(6);
            ctx.changeAltitude(-500);
            return "The fire's spreading and we're losing height – keep going!";
          },
        });
      }

      ctx.setEngine(idx, 'off');
      ctx.sound('whoosh');
      let html;
      if (misses <= 1) {
        html = `<p>🧯 Fire's out! Engine ${idx + 1} is safely shut down.</p>`;
      } else if (misses === 2) {
        ctx.changeAltitude(-1000);
        ctx.changeFuel(-5);
        html = "<p>🧯 Fire's out – but it took both fire bottles. We lost some height and a little fuel.</p>";
      } else {
        ctx.changeAltitude(-2000);
        ctx.changeFuel(-10);
        state.drag += 20;
        ctx.recalcSpeed();
        html = "<p>🧯 Phew, the fire's finally out, but the wing is scorched. We've lost height, fuel and speed.</p>";
      }
      const left = ctx.runningEngines();
      html += left > 0
        ? `<p>We're flying on <strong>${U.plural(left, 'engine')}</strong>. A 747 can keep flying on fewer engines – it's just slower.</p>`
        : "<p><strong>No engines left!</strong> Don't panic – a 747 can glide a long way.</p>";
      await ctx.message({ html });
    },
  });
})(window.EL);
