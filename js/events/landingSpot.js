/*
 * Event: find a safe place to land. Each right answer gets radio facts about one
 * airport (distance and runway length). Then the player picks where to go:
 * it must be within range, with a runway of at least 3,000 m.
 */
(function (EL) {
  'use strict';

  const U = EL.util;
  const f = U.fmt;
  const MIN_RUNWAY = 3000;

  const NAMES = [
    'Puddleby Airfield', 'Great Muddington International', 'Little Snoring Airstrip', 'Sheepsworth Regional',
    'Biggleton International', 'Soggy Marsh Aerodrome', 'Castle Cloudy Airport', 'Upper Wobbleton Airfield',
    'Muddy Boots Airstrip', 'Sunnyvale Airport', 'Goosegate Regional', 'Crumpet Cross Airport',
  ];

  const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);

  function makeSites(range) {
    const names = U.shuffle(NAMES);
    const near = () => round5(U.rand(Math.max(10, range * 0.25), Math.max(15, range * 0.8)));
    return U.shuffle([
      { type: 'safe', dist: near(), runway: 100 * U.randInt(30, 42) },
      { type: 'short', dist: near(), runway: 100 * U.randInt(14, 27) },
      { type: 'far', dist: round5(range + U.rand(30, 180)), runway: 100 * U.randInt(32, 45) },
    ]).map((s, i) => ({ ...s, name: names[i], revealed: false }));
  }

  function siteCard(site, letter) {
    const q = '<span class="fog">???</span>';
    return `<div class="site${site.revealed ? '' : ' unknown'}">`
      + `<div class="site-name">${letter}. ${site.name}</div>`
      + `<div class="site-fact">📏 Distance: <strong>${site.revealed ? `${f(site.dist)} km` : q}</strong></div>`
      + `<div class="site-fact">🛬 Runway: <strong>${site.revealed ? `${f(site.runway)} m` : q}</strong></div>`
      + '</div>';
  }

  EL.events.register({
    id: 'landingSpot',
    title: 'Find a place to land',
    icon: '🗺️',

    async run(ctx) {
      const { state } = ctx;
      await ctx.alarm({ sound: 'chime', icon: '🗺️', title: 'Find a place to land!' });
      const range = ctx.rangeKm();
      const sites = makeSites(range);
      const letters = ['A', 'B', 'C'];
      const facts = `<p class="facts">⛽ We can fly about <strong>${f(range)} km</strong>. `
        + `🛬 A 747 needs a runway at least <strong>${f(MIN_RUNWAY)} m</strong> long.</p>`;
      const board = () => facts + `<div class="sites">${sites.map((s, i) => siteCard(s, letters[i])).join('')}</div>`;

      for (let i = 0; i < sites.length; i++) {
        await ctx.ask({
          step: `Radio call ${i + 1} of ${sites.length}`,
          instruction: `Answer correctly to get the facts about ${sites[i].name} over the radio.`,
          extra: board,
          onResult(r) {
            if (r.correct) {
              sites[i].revealed = true;
              return `📻 ${sites[i].name}: ${f(sites[i].dist)} km away, runway ${f(sites[i].runway)} m.`;
            }
            return `📻 Crackle… static! No facts about ${sites[i].name}.`;
          },
        });
      }

      const choice = await ctx.choose({
        title: 'Where shall we land?',
        html: `${facts}<p>Pick an airport that is <strong>close enough</strong> and has a <strong>long enough runway</strong>.</p>`,
        options: sites.map((s, i) => siteCard(s, letters[i])),
      });
      const site = sites[choice];
      state.destination = site;
      let html;
      if (site.type === 'safe') {
        html = `<p>✅ Great choice! ${site.name} is ${f(site.dist)} km away – within our ${f(range)} km – and its ${f(site.runway)} m runway is long enough.</p>`;
      } else if (site.type === 'short') {
        state.flags.shortRunway = true;
        html = `<p>😬 ${site.name}'s runway is only ${f(site.runway)} m, and a 747 needs about ${f(MIN_RUNWAY)} m. It's going to be a tight squeeze!</p>`;
      } else {
        html = `<p>😬 ${site.name} is ${f(site.dist)} km away, but we can only fly about ${f(range)} km. The tanks will run dry on the way – we'll have to glide the last bit!</p>`;
        ctx.flameOut();
      }
      if (!site.revealed) html += '<p>(We didn\'t get the facts for that one over the radio, so it was a guess!)</p>';
      await ctx.message({ html, button: 'Start the approach ▶' });
    },
  });
})(window.EL);
