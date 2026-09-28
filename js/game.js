/*
 * The flight: builds a random sequence of emergencies, runs each one, tracks
 * the plane's state and works out how the flight ends.
 */
(function (EL) {
  'use strict';

  const U = EL.util;
  const PASSENGERS = 416;
  const LEVEL_BASE = { cadet: 1, pilot: 2, captain: 3 };
  const FUEL_PER_LEG = 6;

  const ENDINGS = {
    perfect: { title: 'Butter-smooth landing!', stars: 3, success: true, text: 'You greased it on! The passengers are giving you a standing ovation.' },
    smooth: { title: 'Smooth landing!', stars: 2, success: true, text: 'A lovely landing. Nobody even spilled their orange juice.' },
    bumpy: { title: 'Bumpy… but down safely!', stars: 1, success: true, text: "Boing, boing, boing! A few bounces and a lot of spilled drinks, but everyone's safe on the ground." },
    field: { title: 'Oops – cabbage field!', stars: 0, success: false, text: 'You came down short of the runway in a cabbage field. Everyone slid down the escape slides and is fine… but the farmer is NOT happy.' },
    pond: { title: 'Splash! Out of fuel', stars: 0, success: false, text: 'With empty tanks you glided into the duck pond. Everyone paddled ashore in their life jackets. The ducks are furious.' },
    tower: { title: 'Straight into the control tower!', stars: 0, success: false, text: "BONK! The plane's nose is poking through the control tower window. The controllers are fine – just covered in coffee." },
    empty: { title: 'Where did everyone go?', stars: 0, success: false, text: 'Every single passenger parachuted out along the way! You flew an empty jumbo jet. Next time, keep them on board.' },
  };

  function newState() {
    return {
      passengers: PASSENGERS,
      passengersStart: PASSENGERS,
      fuel: 100,
      cargo: 60, // tonnes of bags and freight
      altitude: 35000,
      speed: 490,
      drag: 0,
      engines: ['on', 'on', 'on', 'on'],
      pressure: 100,
      balance: { x: 0, y: 0 },
      score: 0,
      streak: 0,
      bestStreak: 0,
      answered: 0,
      correct: 0,
      missed: [],
      flags: {},
      phase: 'cruise',
      destination: null,
      landing: null,
      landingPenalties: [],
      ending: null,
    };
  }

  const runningIndexes = (s) => s.engines.map((e, i) => (e === 'on' ? i : -1)).filter((i) => i >= 0);
  const weightOf = (s) => Math.round(180 + s.cargo + s.fuel * 1.6);

  function landingPenalties(s) {
    const list = [];
    if (s.flags.shortRunway) list.push('a short runway');
    if (!runningIndexes(s).length) list.push('no engines (gliding)');
    if (Math.abs(s.balance.x) > 30 || Math.abs(s.balance.y) > 30) list.push('a wonky, unbalanced plane');
    return list;
  }

  /*
   * Landing score = right answers on the approach, minus up to 2 for tricky
   * conditions. 5 → perfect, 4 → smooth, 3 → bumpy, ≤2 → short of the
   * runway; 0–1 right (or nothing left after penalties) → the control tower.
   */
  function computeEnding(s) {
    if (s.passengers <= 0) return 'empty';
    const correct = s.landing ? s.landing.correct : 0;
    const effective = correct - Math.min(2, s.landingPenalties.length);
    if (correct <= 1 || effective <= 0) return 'tower';
    if (effective <= 2) return s.flags.outOfFuel ? 'pond' : 'field';
    if (effective === 3) return 'bumpy';
    if (effective === 4) return 'smooth';
    return 'perfect';
  }

  // Each random emergency appears once before any repeats, never twice in a row.
  function buildPlan(count, ids) {
    const plan = [];
    let bag = [];
    while (plan.length < count) {
      if (!bag.length) bag = U.shuffle(ids);
      let next = bag.shift();
      if (next === plan[plan.length - 1] && bag.length) {
        bag.push(next);
        next = bag.shift();
      }
      plan.push(next);
    }
    return plan;
  }

  function makeContext(state, quiz, settings, signal) {
    const scene = EL.ui.scene;
    const challenge = EL.ui.challenge;

    function record(r) {
      const q = r.question;
      state.answered++;
      if (r.correct) {
        state.correct++;
        state.streak++;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        const base = 50 + 10 * q.level;
        const speedBonus = r.timeLeftFrac == null ? 25 : Math.round(50 * r.timeLeftFrac);
        r.multiplier = state.streak >= 5 ? 2 : state.streak >= 3 ? 1.5 : 1;
        r.points = Math.round((base + speedBonus) * r.multiplier);
        state.score += r.points;
      } else {
        state.streak = 0;
        state.missed.push({ prompt: q.prompt, answer: q.answer, given: r.given, timedOut: r.timedOut, explain: q.explain, event: ctx.eventTitle });
      }
      ctx.update();
    }

    const ctx = {
      state,
      settings,
      signal,
      scene,
      level: 1,
      eventIcon: '✈️',
      eventTitle: '',
      inserted: [],

      update() {
        scene.setAltitude(state.altitude);
        EL.ui.dashboard.update(state);
      },
      wait: (ms) => EL.clock.wait(ms, signal),
      sound: (name) => EL.audio.play(name),

      async alarm({ sound = 'alarm', icon, title }) {
        ctx.eventIcon = icon;
        ctx.eventTitle = title;
        challenge.hide();
        challenge.alert.show({ icon, title });
        ctx.sound(sound);
        scene.flash();
        ctx.update();
        await ctx.wait(1700);
        challenge.alert.hide(); // the challenge panel carries the title from here on
      },

      ask(opts) {
        const question = quiz.next(ctx.level + (opts.levelBoost || 0), {
          numChoices: opts.numChoices,
          correctIndex: opts.correctIndex,
        });
        return challenge.ask({
          ...opts,
          question,
          icon: ctx.eventIcon,
          title: ctx.eventTitle,
          signal,
          onResult(r) {
            record(r);
            return opts.onResult ? opts.onResult(r) : null;
          },
        });
      },

      message(opts) {
        return challenge.message({ icon: ctx.eventIcon, title: ctx.eventTitle, button: 'Continue ▶', ...opts, signal });
      },
      choose(opts) {
        return challenge.choose({ icon: ctx.eventIcon, ...opts, signal });
      },

      runningEngines: () => runningIndexes(state).length,
      runningEngineIndexes: () => runningIndexes(state),
      setEngine(i, status) {
        state.engines[i] = status;
        const fire = state.engines.map((e, j) => (e === 'fire' ? j : -1)).filter((j) => j >= 0);
        scene.setFireSide(fire.length ? (fire[0] < 2 ? 'left' : 'right') : null);
        ctx.recalcSpeed();
        ctx.update();
      },
      recalcSpeed() {
        const n = runningIndexes(state).length;
        state.speed = Math.max(180, (n ? 490 - (4 - n) * 35 : 260) - state.drag);
        ctx.update();
      },
      changeAltitude(delta) {
        state.altitude = U.clamp(state.altitude + delta, 1000, 41000);
        ctx.update();
      },
      changeFuel(delta) {
        state.fuel = U.clamp(state.fuel + delta, 0, 100);
        ctx.update();
      },
      losePassengers(n) {
        const lost = Math.min(state.passengers, n);
        state.passengers -= lost;
        scene.spawnParachutes(U.clamp(Math.ceil(lost / 4), 2, 10), 'person');
        ctx.sound('pop');
        ctx.update();
        return lost;
      },
      // Out of fuel: every running engine stops and we glide.
      flameOut() {
        state.fuel = 0;
        state.flags.outOfFuel = true;
        state.engines = state.engines.map((e) => (e === 'on' ? 'off' : e));
        ctx.recalcSpeed();
      },
      // How far we can get: gliding distance from our height, plus what the fuel buys us.
      rangeKm() {
        const glide = (state.altitude / 1000) * 3;
        const powered = runningIndexes(state).length ? state.fuel * 4 : 0;
        return Math.max(20, Math.round((glide + powered) / 10) * 10);
      },
      insertNext(id) {
        ctx.inserted.push(id);
      },
    };
    return ctx;
  }

  function levelFor(id, regularIndex, regularCount, base) {
    if (id === 'finalLanding') return base + 2;
    if (id === 'landingSpot') return base + 1;
    return base + (regularIndex >= Math.ceil(regularCount / 2) ? 1 : 0);
  }

  async function intro(ctx) {
    await ctx.message({
      icon: '👨‍✈️',
      title: 'Captain, you have control!',
      html: `<p>Boeing 747, flight EL747. <strong>${PASSENGERS} passengers</strong>, four engines, full tanks, cruising at <strong>35,000 ft</strong>.</p>`
        + '<p>Every emergency is solved with maths. Right answers keep us flying – wrong ones make things trickier. Land safely with as many passengers as you can!</p>',
      button: "Let's fly! ✈️",
    });
    EL.ui.challenge.hide();
    await ctx.wait(1800);
  }

  // Between emergencies: burn fuel, glide down if needed, and divert straight to landing if things are desperate.
  async function cruise(ctx, queue, i) {
    const s = ctx.state;
    const challenge = EL.ui.challenge;
    challenge.alert.hide();
    challenge.hide();
    ctx.scene.setBank(s.balance.x * 0.3);
    ctx.scene.setPitch(0);
    s.flags.birds = false;

    const running = runningIndexes(s).length;
    let reason = null;
    if (running) {
      s.fuel = Math.max(0, s.fuel - FUEL_PER_LEG);
      if (s.fuel <= 0) {
        ctx.flameOut();
        reason = "⛽ We're out of fuel and every engine has stopped! A 747 glides really well, so we'll head straight in to land.";
      }
    } else {
      s.altitude = Math.max(1500, s.altitude - 3000);
    }
    ctx.update();

    const next = queue[i + 1];
    const headingIn = next === 'landingSpot' || next === 'finalLanding';
    if (!reason && !headingIn) {
      if (!runningIndexes(s).length) reason = "🛩️ No engines left – we're a glider now! Time to find somewhere to land.";
      else if (s.altitude <= 3000) reason = "⛰️ We're getting very low! No time for anything else – let's land.";
    }
    if (reason && !headingIn) {
      queue.splice(i + 1, queue.length, ...queue.slice(i + 1).filter((id) => id === 'landingSpot' || id === 'finalLanding'));
    }
    if (reason) {
      await ctx.message({ icon: '⚠️', title: 'Change of plan!', html: `<p>${reason}</p>` });
      challenge.hide();
    }
    await ctx.wait(1400);
  }

  let current = null;

  async function start(settings) {
    if (current) current.controller.abort();
    const controller = new AbortController();
    current = { controller };
    const state = newState();
    const quiz = EL.questions.createQuizMaster(settings);
    const ctx = makeContext(state, quiz, settings, controller.signal);
    const base = LEVEL_BASE[settings.difficulty] || 2;

    EL.clock.paused = false;
    EL.ui.scene.reset();
    EL.ui.challenge.hide();
    EL.ui.challenge.alert.hide();
    EL.ui.screens.show('game');
    ctx.update();

    try {
      const regularCount = Math.max(1, (Number(settings.length) || 6) - 2);
      const queue = buildPlan(regularCount, EL.events.randomIds()).concat(['landingSpot', 'finalLanding']);
      await intro(ctx);

      let regularIndex = 0;
      for (let i = 0; i < queue.length; i++) {
        let ev = EL.events.get(queue[i]);
        if (!ev.canRun(state)) {
          const alternative = U.shuffle(EL.events.randomIds()).find((id) => id !== queue[i - 1] && EL.events.get(id).canRun(state));
          if (!alternative) continue;
          queue[i] = alternative;
          ev = EL.events.get(alternative);
        }
        ctx.level = U.clamp(levelFor(ev.id, regularIndex, regularCount, base), 1, 5);
        if (ev.random) regularIndex++;
        ctx.inserted = [];
        await ev.run(ctx);
        if (ctx.inserted.length) queue.splice(i + 1, 0, ...ctx.inserted);

        if (state.passengers <= 0) {
          state.ending = 'empty';
          break;
        }
        if (ev.id === 'finalLanding') break;
        await cruise(ctx, queue, i);
      }
      finish(state, settings);
    } catch (e) {
      if (!(e instanceof EL.FlightAborted)) throw e;
    } finally {
      if (current && current.controller === controller) current = null;
    }
  }

  function finish(state, settings) {
    const ending = state.ending || computeEnding(state);
    const def = ENDINGS[ending];
    if (def.success) state.score += state.passengers * 2 + def.stars * 250;
    const key = `emergency-landing:best:${settings.difficulty}`;
    const best = U.store.get(key, 0);
    const isNewBest = state.score > best;
    if (isNewBest) U.store.set(key, state.score);
    EL.ui.challenge.hide();
    EL.ui.challenge.alert.hide();
    EL.ui.screens.showResults({ state, settings, ending, def, best: Math.max(best, state.score), isNewBest });
  }

  function quit() {
    if (current) current.controller.abort();
    current = null;
    EL.clock.paused = false;
    EL.ui.challenge.hide();
    EL.ui.challenge.alert.hide();
  }

  EL.game = {
    start,
    quit,
    isFlying: () => !!current,
    weightOf,
    landingPenalties,
    computeEnding,
    buildPlan,
    ENDINGS,
    PASSENGERS,
  };
})(window.EL);
