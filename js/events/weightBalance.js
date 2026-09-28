/*
 * Event: weight & balance. Two versions:
 *  - the cargo slides and the plane leans; right answers move it back
 *  - the plane is too heavy; right answers jettison bags (wrong answers dump fuel)
 */
(function (EL) {
  'use strict';

  const U = EL.util;
  const STEPS = 3;

  async function balance(ctx) {
    const { state, scene } = ctx;
    const axis = U.pick(['x', 'y']);
    const dir = U.pick([-1, 1]);
    state.balance[axis] = dir * 60;
    const problem = axis === 'x' ? `leaning to the ${dir < 0 ? 'left' : 'right'}` : `${dir > 0 ? 'nose' : 'tail'} heavy`;
    const title = axis === 'x' ? `Leaning ${dir < 0 ? 'left' : 'right'}!` : `${dir > 0 ? 'Nose' : 'Tail'} too heavy!`;

    const tilt = () => {
      scene.setBank(state.balance.x * 0.3);
      scene.setPitch(-state.balance.y * 0.08);
    };
    tilt();
    await ctx.alarm({ sound: 'alarm', icon: '⚖️', title });

    const tracker = Array.from({ length: STEPS }, (_, i) => ({ text: `Cargo stack ${i + 1}`, status: 'pending' }));
    for (let i = 0; i < STEPS; i++) {
      tracker[i].status = 'current';
      await ctx.ask({
        step: `Move ${i + 1} of ${STEPS}`,
        instruction: `The cargo has slid and the plane is ${problem}. Each right answer moves a stack of crates back to the middle.`,
        tracker,
        onResult(r) {
          if (r.correct) {
            tracker[i].status = 'done';
            state.balance[axis] -= dir * 20;
            tilt();
            ctx.update();
            return 'Crates moved – the plane is levelling out. ⚖️';
          }
          tracker[i].status = 'failed';
          state.balance[axis] = U.clamp(state.balance[axis] + dir * 10, -90, 90);
          tilt();
          ctx.changeAltitude(-500);
          return 'The crates slid the wrong way and the plane dipped!';
        },
      });
    }

    const level = Math.abs(state.balance[axis]) <= 20;
    if (level) {
      state.balance[axis] = 0;
      tilt();
    }
    ctx.update();
    await ctx.message({
      html: level
        ? '<p>Level again! Nice balancing. ✓</p>'
        : '<p>Still a bit wonky. A wonky plane is harder to land – if the cargo slides again, you can fix it then.</p>',
    });
  }

  async function heavy(ctx) {
    const { state, scene } = ctx;
    await ctx.alarm({ sound: 'alarm', icon: '🧳', title: 'Too heavy!' });
    const tracker = Array.from({ length: STEPS }, (_, i) => ({ text: `Load ${i + 1}`, status: 'pending' }));
    let dumped = 0;
    for (let i = 0; i < STEPS; i++) {
      tracker[i].status = 'current';
      await ctx.ask({
        step: `Load ${i + 1} of ${STEPS}`,
        instruction: "We're too heavy to hold our height! Each right answer throws 20 tonnes of suitcases out of the hold (on parachutes!). Wrong answers mean dumping fuel instead.",
        tracker,
        onResult(r) {
          if (r.correct) {
            tracker[i].status = 'done';
            state.cargo = Math.max(0, state.cargo - 20);
            scene.spawnParachutes(4, 'bag');
            ctx.sound('pop');
            ctx.update();
            return 'Bye-bye bags! 🧳🪂 20 tonnes lighter.';
          }
          tracker[i].status = 'failed';
          dumped++;
          ctx.changeFuel(-10);
          return "We had to dump fuel instead – that's less fuel for later. ⛽";
        },
      });
    }
    await ctx.message({
      html: `<p>We're down to <strong>${EL.game.weightOf(state)} tonnes</strong> and holding our height.</p>`
        + (dumped ? `<p>We dumped fuel ${dumped === 1 ? 'once' : `${dumped} times`}, so keep an eye on the fuel gauge.</p>` : '<p>No fuel wasted. Top packing! 🧳</p>'),
    });
  }

  EL.events.register({
    id: 'weightBalance',
    title: 'Weight & balance',
    icon: '⚖️',
    random: true,
    async run(ctx) {
      if (ctx.state.cargo >= 40 && U.chance(0.5)) await heavy(ctx);
      else await balance(ctx);
    },
  });
})(window.EL);
