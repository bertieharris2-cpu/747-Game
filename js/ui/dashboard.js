/*
 * The instrument panel under the windscreen. Every warning uses an icon and a
 * word as well as colour, so nothing relies on colour alone.
 */
(function (EL) {
  'use strict';

  const U = EL.util;
  const els = {};

  const GAUGES = [
    { id: 'passengers', icon: '👥', label: 'Passengers' },
    { id: 'altitude', icon: '⛰️', label: 'Altitude' },
    { id: 'speed', icon: '💨', label: 'Speed' },
    { id: 'fuel', icon: '⛽', label: 'Fuel' },
    { id: 'pressure', icon: '🫁', label: 'Cabin air' },
    { id: 'weight', icon: '🧳', label: 'Weight' },
  ];

  const LIGHTS = [
    { id: 'fire', icon: '🔥', label: 'FIRE' },
    { id: 'pressure', icon: '💨', label: 'CABIN AIR' },
    { id: 'birds', icon: '🐦', label: 'BIRDS' },
    { id: 'balance', icon: '⚖️', label: 'BALANCE' },
    { id: 'fuel', icon: '⛽', label: 'FUEL LOW' },
    { id: 'engines', icon: '🛩️', label: 'GLIDING' },
  ];

  function init(root) {
    root.innerHTML = `
      ${GAUGES.map((g) => `
        <div class="gauge" id="g-${g.id}">
          <div class="g-label"><span aria-hidden="true">${g.icon}</span> ${g.label}</div>
          <div class="g-value" id="v-${g.id}">–</div>
          <div class="g-bar" aria-hidden="true"><span id="b-${g.id}"></span></div>
          <div class="g-status" id="s-${g.id}"></div>
        </div>`).join('')}
      <div class="gauge engines-panel">
        <div class="g-label"><span aria-hidden="true">⚙️</span> Engines</div>
        <div class="engines" id="engines">
          ${[0, 1, 2, 3].map((i) => `<div class="engine" id="e-${i}"><span class="e-num">${i + 1}</span><span class="e-icon" aria-hidden="true"></span><span class="e-text"></span></div>`).join('')}
        </div>
      </div>
      <div class="gauge balance-panel">
        <div class="g-label"><span aria-hidden="true">⚖️</span> Balance</div>
        <div class="balance-wrap">
          <svg viewBox="-50 -50 100 100" class="balance" aria-hidden="true">
            <circle r="44" class="bal-ring"/>
            <circle r="14" class="bal-safe"/>
            <line x1="-44" y1="0" x2="44" y2="0" class="bal-cross"/>
            <line x1="0" y1="-44" x2="0" y2="44" class="bal-cross"/>
            <text x="0" y="-33" class="bal-lbl">NOSE</text>
            <text x="0" y="40" class="bal-lbl">TAIL</text>
            <circle r="8" id="bal-dot" class="bal-dot"/>
          </svg>
          <div class="g-status" id="s-balance"></div>
        </div>
      </div>
      <div class="gauge lights-panel">
        <div class="g-label"><span aria-hidden="true">🚨</span> Warnings</div>
        <ul class="lights">
          ${LIGHTS.map((l) => `<li class="light" id="l-${l.id}"><span aria-hidden="true">${l.icon}</span> ${l.label}</li>`).join('')}
        </ul>
      </div>`;
    root.querySelectorAll('[id]').forEach((n) => { els[n.id] = n; });
    els.hudScore = document.getElementById('hud-score');
    els.hudStreak = document.getElementById('hud-streak');
  }

  // level: 'ok' | 'caution' | 'warn'
  function setGauge(id, text, fraction, level, statusText) {
    els[`v-${id}`].textContent = text;
    els[`b-${id}`].style.width = `${U.clamp(fraction, 0, 1) * 100}%`;
    const g = els[`g-${id}`];
    g.classList.toggle('caution', level === 'caution');
    g.classList.toggle('warn', level === 'warn');
    els[`s-${id}`].textContent = statusText || (level === 'warn' ? '✖ Danger' : level === 'caution' ? '⚠ Low' : '');
  }

  const lowLevel = (v, caution, warn) => (v <= warn ? 'warn' : v <= caution ? 'caution' : 'ok');

  function update(state) {
    if (!els['v-passengers']) return;
    const s = state;

    setGauge('passengers', `${s.passengers} / ${s.passengersStart}`, s.passengers / s.passengersStart,
      lowLevel(s.passengers / s.passengersStart, 0.75, 0.4));
    setGauge('altitude', `${U.fmt(Math.round(s.altitude))} ft`, s.altitude / 40000,
      s.phase === 'landing' ? 'ok' : lowLevel(s.altitude, 8000, 3000));
    setGauge('speed', `${Math.round(s.speed)} knots`, s.speed / 550, 'ok');
    setGauge('fuel', `${Math.round(s.fuel)}%`, s.fuel / 100, lowLevel(s.fuel, 30, 12), s.fuel <= 0 ? '✖ Empty' : '');
    setGauge('pressure', `${Math.round(s.pressure)}%`, s.pressure / 100, lowLevel(s.pressure, 80, 50));
    setGauge('weight', `${EL.game.weightOf(s)} t`, (EL.game.weightOf(s) - 150) / 270, 'ok');

    s.engines.forEach((status, i) => {
      const e = els[`e-${i}`];
      e.className = `engine e-${status}`;
      e.querySelector('.e-icon').textContent = status === 'on' ? '✓' : status === 'fire' ? '🔥' : '✖';
      e.querySelector('.e-text').textContent = status === 'on' ? 'ON' : status === 'fire' ? 'FIRE' : 'OFF';
      e.setAttribute('aria-label', `Engine ${i + 1}: ${status}`);
    });

    const bx = U.clamp(s.balance.x, -100, 100) * 0.4;
    const by = U.clamp(-s.balance.y, -100, 100) * 0.4; // nose-heavy (positive y) shows towards NOSE (top)
    els['bal-dot'].setAttribute('cx', bx);
    els['bal-dot'].setAttribute('cy', by);
    const off = Math.max(Math.abs(s.balance.x), Math.abs(s.balance.y));
    els['bal-dot'].classList.toggle('bad', off > 30);
    els['s-balance'].textContent = off <= 20 ? '✓ Level'
      : Math.abs(s.balance.x) >= Math.abs(s.balance.y)
        ? `⚠ Leaning ${s.balance.x < 0 ? 'left' : 'right'}`
        : `⚠ ${s.balance.y > 0 ? 'Nose' : 'Tail'} heavy`;

    const lights = {
      fire: s.engines.includes('fire'),
      pressure: s.pressure < 80,
      birds: !!s.flags.birds,
      balance: off > 30,
      fuel: s.fuel < 25,
      engines: s.engines.every((e) => e !== 'on'),
    };
    for (const [id, on] of Object.entries(lights)) els[`l-${id}`].classList.toggle('on', on);

    if (els.hudScore) els.hudScore.textContent = `⭐ ${U.fmt(s.score)}`;
    if (els.hudStreak) {
      els.hudStreak.textContent = s.streak >= 2 ? `🔥 Streak ${s.streak}` : '';
      els.hudStreak.hidden = s.streak < 2;
    }
  }

  EL.ui.dashboard = { init, update };
})(window.EL);
