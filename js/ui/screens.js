/*
 * Start screen (with teacher settings), results screen and screen switching.
 */
(function (EL) {
  'use strict';

  const U = EL.util;
  const SETTINGS_KEY = 'emergency-landing:settings';
  const DEFAULTS = { topic: 'mixed', difficulty: 'pilot', answerStyle: 'auto', timer: 'normal', length: '6', sound: true, captions: true };

  const LABELS = {
    difficulty: { cadet: 'Cadet', pilot: 'Pilot', captain: 'Captain' },
    answerStyle: { auto: 'Multiple choice (typed when hard)', choice: 'Multiple choice', typed: 'Typed answers' },
    timer: { normal: 'Timer on', relaxed: 'Relaxed timer', off: 'No timer' },
    length: { 5: 'Short flight', 6: 'Normal flight', 8: 'Long flight' },
  };

  let settings = { ...DEFAULTS, ...U.store.get(SETTINGS_KEY, {}) };
  let titleT = 0;

  const $ = (id) => document.getElementById(id);

  function show(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
    document.body.dataset.screen = name;
    if (name === 'start') refreshStart();
    window.scrollTo(0, 0);
  }

  function getSettings() {
    return { ...settings };
  }

  function applyAudioSettings() {
    EL.audio.enabled = !!settings.sound;
    EL.audio.captions = !!settings.captions;
    const btn = $('btn-sound');
    if (btn) {
      btn.textContent = settings.sound ? '🔊' : '🔇';
      btn.setAttribute('aria-label', settings.sound ? 'Sound on (click to mute)' : 'Sound off (click to unmute)');
      btn.setAttribute('aria-pressed', String(!settings.sound));
    }
  }

  function save() {
    U.store.set(SETTINGS_KEY, settings);
    applyAudioSettings();
    refreshStart();
  }

  function toggleSound() {
    settings.sound = !settings.sound;
    if (settings.sound) EL.audio.init();
    const box = document.querySelector('#settings-form [name="sound"]');
    if (box) box.checked = settings.sound;
    save();
  }

  function buildTopicOptions() {
    const box = $('topic-options');
    box.innerHTML = EL.questions.listTopics()
      .map((t) => `<label class="opt"><input type="radio" name="topic" value="${t.id}"> <span><strong>${U.escape(t.name)}</strong><small>${U.escape(t.description)}</small></span></label>`)
      .join('');
  }

  function syncForm() {
    const form = $('settings-form');
    for (const [name, value] of Object.entries(settings)) {
      const inputs = form.querySelectorAll(`[name="${name}"]`);
      inputs.forEach((input) => {
        if (input.type === 'checkbox') input.checked = !!value;
        else input.checked = String(input.value) === String(value);
      });
    }
  }

  function refreshStart() {
    const topic = EL.questions.get(settings.topic);
    $('settings-summary').textContent = [
      topic ? topic.name : '',
      LABELS.difficulty[settings.difficulty],
      LABELS.answerStyle[settings.answerStyle],
      LABELS.timer[settings.timer],
      LABELS.length[settings.length],
    ].filter(Boolean).join(' · ');
    const best = U.store.get(`emergency-landing:best:${settings.difficulty}`, 0);
    $('best-score').textContent = best ? `🏆 Best score (${LABELS.difficulty[settings.difficulty]}): ${U.fmt(best)}` : '';
  }

  function init() {
    buildTopicOptions();
    syncForm();
    applyAudioSettings();
    refreshStart();

    $('settings-form').addEventListener('change', (e) => {
      const input = e.target;
      if (!input.name) return;
      settings[input.name] = input.type === 'checkbox' ? input.checked : input.value;
      if (input.name === 'sound' && input.checked) EL.audio.init();
      save();
    });
    $('btn-reset-settings').addEventListener('click', () => {
      settings = { ...DEFAULTS };
      syncForm();
      save();
    });

    // Title banner animation
    const canvas = $('title-art');
    const ctx = canvas.getContext('2d');
    EL.clock.onFrame((dt) => {
      if (!canvas.offsetParent) return;
      titleT += dt;
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(r.width * dpr)) {
        canvas.width = Math.round(r.width * dpr);
        canvas.height = Math.round(r.height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      EL.art.drawTitle(ctx, r.width, r.height, titleT);
    });

    const endCanvas = $('ending-art');
    const endCtx = endCanvas.getContext('2d');
    let endT = 0;
    EL.clock.onFrame((dt) => {
      if (!endCanvas.offsetParent) {
        endT = 0;
        return;
      }
      endT += dt;
      const r = endCanvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (endCanvas.width !== Math.round(r.width * dpr)) {
        endCanvas.width = Math.round(r.width * dpr);
        endCanvas.height = Math.round(r.height * dpr);
      }
      endCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      EL.art.drawEnding(endCtx, r.width, r.height, endCanvas.dataset.ending || 'perfect', endT);
    });
  }

  function showResults({ state, ending, def, best, isNewBest }) {
    const s = state;
    $('ending-art').dataset.ending = ending;
    $('ending-art').setAttribute('aria-label', `Cartoon: ${def.title}`);
    $('ending-title').textContent = def.title;
    $('ending-text').textContent = def.text;
    const stars = $('ending-stars');
    stars.textContent = def.success ? '★'.repeat(def.stars) + '☆'.repeat(3 - def.stars) : '';
    stars.setAttribute('aria-label', def.success ? `${def.stars} out of 3 stars` : 'No stars this time');
    stars.hidden = !def.success;

    const pct = s.answered ? Math.round((s.correct / s.answered) * 100) : 0;
    const parachuted = s.passengersStart - s.passengers;
    const rows = [
      ['👥 Passengers on board', `${s.passengers} / ${s.passengersStart}${parachuted ? ` (${parachuted} parachuted out)` : ''}`],
      ['🛬 Landing', def.success ? `${def.stars} ★ – ${s.landing.correct} of ${s.landing.total} approach questions right` : "Didn't make the runway"],
      ['🎯 Accuracy', `${s.correct} out of ${s.answered} right (${pct}%)`],
      ['🔥 Best streak', String(s.bestStreak)],
      ['⭐ Score', `${U.fmt(s.score)}${isNewBest && s.score > 0 ? ' – new best! 🏆' : ` (best ${U.fmt(best)})`}`],
    ];
    if (s.landingPenalties && s.landingPenalties.length) rows.splice(2, 0, ['⚠️ Tricky conditions', s.landingPenalties.join(', ')]);
    $('stats').innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${U.escape(v)}</dd></div>`).join('');

    const review = $('review-list');
    if (!s.missed.length) {
      review.innerHTML = '<li class="rv-none">No mistakes at all – ace pilot! 🏅</li>';
    } else {
      review.innerHTML = s.missed.map((m) => `
        <li>
          <div class="rv-q">${m.prompt}</div>
          <div class="rv-a">Answer: <strong>${U.fmt(m.answer)}</strong>
            <span class="rv-given">${m.timedOut ? '(ran out of time)' : `(you said ${U.fmt(m.given)})`}</span></div>
          <div class="rv-explain">${m.explain}</div>
        </li>`).join('');
    }
    $('review-count').textContent = s.missed.length ? `(${s.missed.length})` : '';
    EL.audio.play(def.success ? 'fanfare' : 'sad');
    show('results');
    setTimeout(() => $('ending-title').focus({ preventScroll: true }), 50);
  }

  EL.ui.screens = { init, show, showResults, getSettings, toggleSound, applyAudioSettings };
})(window.EL);
