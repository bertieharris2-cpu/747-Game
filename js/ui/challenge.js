/*
 * The challenge panel that sits over the windscreen. Three modes:
 *   ask()     – a maths question (multiple choice or typed) with a timer
 *   message() – a short story beat with a Continue button
 *   choose()  – pick one of several options (e.g. where to land)
 * Plus the flashing alert banner used by alarms.
 */
(function (EL) {
  'use strict';

  const U = EL.util;
  let root = null;
  let banner = null;
  let keyHandler = null;

  function el(tag, attrs, ...children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      node.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return node;
  }

  document.addEventListener('keydown', (e) => {
    if (!keyHandler || EL.clock.paused || e.ctrlKey || e.metaKey || e.altKey) return;
    keyHandler(e);
  });

  function init(rootEl, bannerEl) {
    root = rootEl;
    banner = bannerEl;
  }

  function hide() {
    if (!root) return;
    root.hidden = true;
    root.replaceChildren();
    keyHandler = null;
  }

  function mount(panel) {
    root.replaceChildren(panel);
    root.hidden = false;
    root.scrollTop = 0;
  }

  function header({ icon, title, step }) {
    return el('div', { class: 'ch-head' },
      el('span', { class: 'ch-icon', 'aria-hidden': 'true' }, icon || '✈️'),
      el('h2', { class: 'ch-title' }, title || ''),
      step ? el('span', { class: 'ch-step' }, step) : null);
  }

  const TRACKER_WORDS = { done: 'done', failed: 'missed', current: 'now', pending: 'to do' };
  const TRACKER_ICONS = { done: '✓', failed: '✗', current: '▶', pending: '•' };

  function tracker(items) {
    if (!items || !items.length) return null;
    return el('ol', { class: 'tracker' },
      items.map((it) => el('li', { class: `tr-${it.status}` },
        el('span', { class: 'tr-icon', 'aria-hidden': 'true' }, TRACKER_ICONS[it.status] || '•'),
        el('span', null, it.text),
        el('span', { class: 'sr-only' }, ` (${TRACKER_WORDS[it.status] || ''})`))));
  }

  // Resolve on Continue click or Enter/Space. Optional auto-continue after `auto` ms.
  function continueButton(container, label, signal, auto) {
    return new Promise((resolve, reject) => {
      const finish = () => {
        keyHandler = null;
        resolve();
      };
      const btn = el('button', { class: 'btn btn-primary btn-continue', type: 'button', onclick: finish }, label);
      container.append(el('div', { class: 'ch-actions' }, btn));
      setTimeout(() => btn.focus({ preventScroll: true }), 50);
      keyHandler = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          finish();
        }
      };
      if (auto) EL.clock.wait(auto, signal).then(finish, () => {});
      EL.clock.abortPromise(signal).catch(reject);
    });
  }

  /*
   * Ask one question. opts:
   *   question   – from the quiz master
   *   icon, title, step, instruction (string or fn(question)), tracker, extra (fn → HTML)
   *   layout     – 'grid' (default) or 'lanes'; laneLabels for lanes
   *   onResult(result) – called the moment the player answers; may return a note (HTML)
   *   signal     – AbortSignal
   * Resolves { question, correct, timedOut, given, timeLeftFrac, points?, note? }
   */
  async function ask(opts) {
    const q = opts.question;
    const signal = opts.signal;
    const panel = el('div', { class: 'ch-panel' });
    panel.append(header(opts));

    const instruction = typeof opts.instruction === 'function' ? opts.instruction(q) : opts.instruction;
    if (instruction) panel.append(el('p', { class: 'ch-instruction' }, instruction));
    const trackerSlot = el('div', { class: 'tracker-slot' }, tracker(opts.tracker));
    panel.append(trackerSlot);
    const extraSlot = el('div', { class: 'extra-slot', html: opts.extra ? opts.extra() : '' });
    panel.append(extraSlot);

    panel.append(el('div', { class: 'ch-prompt', html: q.prompt }));

    let done = false;
    let resolveAnswer;
    const answered = new Promise((r) => { resolveAnswer = r; });
    const submit = (given) => {
      if (done) return;
      done = true;
      resolveAnswer(given);
    };

    // ----- answers -----
    const buttons = [];
    let display = null;
    let entry = '';
    if (q.style === 'choice') {
      const lanes = opts.layout === 'lanes';
      const grid = el('div', { class: `ch-answers ${lanes ? 'lanes' : 'grid'}`, role: 'group', 'aria-label': 'Answers' });
      q.choices.forEach((value, i) => {
        const key = lanes && opts.laneLabels ? opts.laneLabels[i] : String(i + 1);
        const b = el('button', { class: 'answer', type: 'button', onclick: () => submit(value) },
          el('span', { class: 'key' }, key),
          el('span', { class: 'val' }, U.fmt(value)));
        buttons.push({ b, value });
        grid.append(b);
      });
      panel.append(grid);
      keyHandler = (e) => {
        let idx = -1;
        if (/^[1-9]$/.test(e.key)) idx = Number(e.key) - 1;
        else if (lanes) idx = { ArrowLeft: 0, ArrowUp: 1, ArrowRight: 2 }[e.key] ?? -1;
        if (idx >= 0 && idx < q.choices.length) {
          e.preventDefault();
          submit(q.choices[idx]);
        }
      };
    } else {
      display = el('div', { class: 'typed-display empty', role: 'textbox', 'aria-label': 'Your answer', 'aria-live': 'polite' }, 'Type your answer');
      const render = () => {
        display.textContent = entry || 'Type your answer';
        display.classList.toggle('empty', !entry);
      };
      const press = (k) => {
        if (done) return;
        if (k === 'back') entry = entry.slice(0, -1);
        else if (k === 'clear') entry = '';
        else if (k === 'ok') {
          const value = EL.questions.parseAnswer(entry);
          if (isNaN(value)) {
            display.classList.remove('nudge');
            void display.offsetWidth;
            display.classList.add('nudge');
            return;
          }
          submit(value);
          return;
        } else if (k === '.') {
          if (!entry.includes('.') && entry.length < 10) entry += entry ? '.' : '0.';
        } else if (k === '-') {
          if (!entry) entry = '-';
        } else if (entry.length < 10) entry = entry === '0' ? k : entry + k;
        EL.audio.play('click');
        render();
      };
      const keys = ['7', '8', '9', 'back', '4', '5', '6', '.', '1', '2', '3', '0'];
      const pad = el('div', { class: 'keypad', role: 'group', 'aria-label': 'Number keypad' },
        keys.map((k) => el('button', { type: 'button', class: `key-btn${k === 'back' ? ' key-back' : ''}`, 'aria-label': k === 'back' ? 'Delete' : k === '.' ? 'Decimal point' : k, onclick: () => press(k) }, k === 'back' ? '⌫' : k)));
      const check = el('button', { type: 'button', class: 'btn btn-primary key-ok', onclick: () => press('ok') }, '✓ Check');
      panel.append(el('div', { class: 'typed' }, el('div', { class: 'typed-left' }, display, check), pad));
      keyHandler = (e) => {
        if (/^[0-9]$/.test(e.key)) press(e.key);
        else if (e.key === '.') press('.');
        else if (e.key === '-') press('-');
        else if (e.key === 'Backspace') press('back');
        else if (e.key === 'Delete' || e.key === 'Escape') press('clear');
        else if (e.key === 'Enter') press('ok');
        else return;
        e.preventDefault();
      };
    }

    // ----- timer -----
    const total = q.timeLimit ? q.timeLimit * 1000 : null;
    let left = total;
    let offTimer = null;
    if (total) {
      const fill = el('span');
      const text = el('span', { class: 'timer-text' }, `${q.timeLimit}s`);
      const timer = el('div', { class: 'timer' }, el('div', { class: 'timer-bar', 'aria-hidden': 'true' }, fill), text);
      panel.append(timer);
      let lastSecond = q.timeLimit;
      offTimer = EL.clock.onFrame((dt, paused) => {
        if (paused || done) return;
        left -= dt;
        fill.style.width = `${Math.max(0, left / total) * 100}%`;
        const sec = Math.max(0, Math.ceil(left / 1000));
        if (sec !== lastSecond) {
          lastSecond = sec;
          const urgent = sec <= 5;
          timer.classList.toggle('urgent', urgent);
          text.textContent = urgent ? `⏰ ${sec}s – hurry!` : `${sec}s`;
          if (urgent && sec > 0) EL.audio.play('tick');
        }
        if (left <= 0) submit(null);
      });
    } else {
      panel.append(el('div', { class: 'timer timer-off' }, '⏸ No timer – take your time.'));
    }

    const feedback = el('div', { class: 'ch-feedback', role: 'status' });
    panel.append(feedback);
    mount(panel);

    let given;
    try {
      given = await Promise.race([answered, EL.clock.abortPromise(signal)]);
    } finally {
      done = true;
      if (offTimer) offTimer();
      keyHandler = null;
    }

    const timedOut = given === null;
    const correct = !timedOut && EL.questions.isCorrect(q, given);
    const result = { question: q, correct, timedOut, given, timeLeftFrac: total ? Math.max(0, left) / total : null };
    const note = opts.onResult ? opts.onResult(result) : null;
    result.note = note;

    // ----- show the outcome -----
    EL.audio.play(correct ? 'correct' : 'wrong');
    buttons.forEach(({ b, value }) => {
      b.disabled = true;
      if (Math.abs(value - q.answer) < 1e-9) b.classList.add('is-correct');
      else if (value === given) b.classList.add('is-wrong');
    });
    if (display) {
      display.classList.remove('empty');
      display.classList.add(correct ? 'is-correct' : 'is-wrong');
      if (timedOut) display.textContent = '—';
    }
    trackerSlot.replaceChildren(...[tracker(opts.tracker)].filter(Boolean));
    if (opts.extra) extraSlot.innerHTML = opts.extra();

    const noteHtml = note ? `<p class="fb-note">${note}</p>` : '';
    if (correct) {
      const bonus = result.multiplier > 1 ? ` <span class="fb-streak">🔥 streak ×${result.multiplier}</span>` : '';
      feedback.className = 'ch-feedback good';
      feedback.innerHTML = `<p class="fb-main"><span aria-hidden="true">✓</span> Correct!${result.points ? ` <span class="fb-points">+${result.points}</span>` : ''}${bonus}</p>${noteHtml}`;
      await Promise.race([EL.clock.wait(note ? 2200 : 1300, signal), clickToSkip(panel), EL.clock.abortPromise(signal)]);
    } else {
      feedback.className = 'ch-feedback bad';
      feedback.innerHTML = `<p class="fb-main"><span aria-hidden="true">${timedOut ? '⏰' : '✗'}</span> ${timedOut ? 'Out of time!' : 'Not quite.'} The answer is <strong>${U.fmt(q.answer)}</strong>.</p>`
        + `<p class="fb-explain">${q.explain}</p>${noteHtml}`;
      await continueButton(panel, 'Continue ▶', signal);
    }
    keyHandler = null;
    return result;
  }

  function clickToSkip(panel) {
    return new Promise((resolve) => {
      panel.addEventListener('click', () => resolve(), { once: true });
      keyHandler = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          resolve();
        }
      };
    });
  }

  /* A story beat. opts: icon, title, step, html, button (label) , auto (ms), signal */
  async function message(opts) {
    const panel = el('div', { class: 'ch-panel ch-message' });
    panel.append(header(opts));
    panel.append(el('div', { class: 'ch-body', html: opts.html || '' }));
    mount(panel);
    if (opts.button) {
      await continueButton(panel, opts.button, opts.signal, opts.auto);
    } else {
      await EL.clock.wait(opts.auto || 1500, opts.signal);
    }
  }

  /* Pick one option. opts: icon, title, html, options: [html], signal. Resolves the index. */
  async function choose(opts) {
    const panel = el('div', { class: 'ch-panel ch-choose' });
    panel.append(header(opts));
    if (opts.html) panel.append(el('div', { class: 'ch-body', html: opts.html }));
    let pickIt;
    const picked = new Promise((r) => { pickIt = r; });
    const list = el('div', { class: 'choices', role: 'group', 'aria-label': opts.title || 'Choices' });
    opts.options.forEach((html, i) => {
      list.append(el('button', { class: 'choice', type: 'button', onclick: () => pickIt(i) },
        el('span', { class: 'key' }, String(i + 1)),
        el('span', { class: 'choice-body', html })));
    });
    panel.append(list);
    mount(panel);
    keyHandler = (e) => {
      if (/^[1-9]$/.test(e.key) && Number(e.key) <= opts.options.length) {
        e.preventDefault();
        pickIt(Number(e.key) - 1);
      }
    };
    try {
      return await Promise.race([picked, EL.clock.abortPromise(opts.signal)]);
    } finally {
      keyHandler = null;
    }
  }

  const alert = {
    show({ icon, title }) {
      if (!banner) return;
      banner.innerHTML = `<span class="ab-icon" aria-hidden="true">${icon || '⚠️'}</span><span class="ab-text"><span class="sr-only">Warning: </span>${U.escape(title)}</span>`;
      banner.hidden = false;
      banner.classList.remove('flashing');
      void banner.offsetWidth;
      banner.classList.add('flashing');
    },
    hide() {
      if (banner) banner.hidden = true;
    },
  };

  EL.ui.challenge = { init, ask, message, choose, hide, alert };
})(window.EL);
