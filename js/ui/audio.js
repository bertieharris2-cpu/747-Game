/*
 * Sound effects, synthesised with the Web Audio API (no audio files needed,
 * works offline). Every sound that carries meaning also has a text caption,
 * shown when captions are on – independent of whether sound is on.
 */
(function (EL) {
  'use strict';

  const A = { enabled: true, captions: true, ctx: null, master: null };

  const CAPTIONS = {
    alarm: '🔔 Alarm: beep-beep-beep!',
    fire: '🔔 Fire bell ringing!',
    chime: '🔔 Bing-bong!',
    bird: '🐦 Honk! Squawk!',
    whoosh: '💨 Whoooosh!',
    boom: '💥 BANG!',
    bonk: '💥 Bonk! Bird on the windscreen',
    pop: '🪂 Pop! Parachutes open',
    thud: '🛬 Bump! Wheels on the runway',
    fanfare: '🎺 Ta-daaa!',
    sad: '🎺 Wah-wah-waaah…',
    crash: '💥 CRUNCH!',
    splash: '💦 SPLASH!',
  };

  A.init = () => {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      A.ctx = new AC();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.3;
      A.master.connect(A.ctx.destination);
    } catch (e) {
      A.ctx = null;
    }
  };

  function tone(freq, dur, { type = 'sine', at = 0, vol = 0.5, slide = null } = {}) {
    const c = A.ctx;
    const t0 = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(A.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  let noiseBuffer = null;
  function noise(dur, { at = 0, vol = 0.5, freq = 1000, slide = null, filter = 'lowpass' } = {}) {
    const c = A.ctx;
    if (!noiseBuffer) {
      noiseBuffer = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const t0 = c.currentTime + at;
    const src = c.createBufferSource();
    src.buffer = noiseBuffer;
    src.loop = true;
    const fl = c.createBiquadFilter();
    fl.type = filter;
    fl.frequency.setValueAtTime(freq, t0);
    if (slide) fl.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl);
    fl.connect(g);
    g.connect(A.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  const SOUNDS = {
    alarm() {
      for (let i = 0; i < 3; i++) {
        tone(880, 0.16, { type: 'square', at: i * 0.4, vol: 0.25 });
        tone(660, 0.16, { type: 'square', at: i * 0.4 + 0.2, vol: 0.25 });
      }
    },
    fire() {
      for (let i = 0; i < 8; i++) tone(1250, 0.1, { type: 'triangle', at: i * 0.13, vol: 0.4 });
    },
    chime() {
      tone(740, 0.6, { at: 0, vol: 0.4 });
      tone(587, 0.9, { at: 0.45, vol: 0.4 });
    },
    bird() {
      for (let i = 0; i < 4; i++) tone(700 + i * 90, 0.12, { type: 'sawtooth', at: i * 0.17, vol: 0.12, slide: 450 });
    },
    whoosh() {
      noise(1.0, { vol: 0.5, freq: 300, slide: 3000, filter: 'bandpass' });
    },
    boom() {
      noise(0.7, { vol: 0.9, freq: 900, slide: 80 });
      tone(70, 0.6, { vol: 0.8, slide: 30 });
    },
    bonk() {
      tone(320, 0.15, { type: 'square', vol: 0.3, slide: 120 });
      noise(0.2, { vol: 0.3, freq: 1500 });
    },
    pop() {
      for (let i = 0; i < 3; i++) tone(500, 0.08, { at: i * 0.12, vol: 0.3, slide: 1100 });
    },
    thud() {
      noise(0.35, { vol: 0.7, freq: 250 });
      tone(90, 0.35, { vol: 0.6, slide: 50 });
    },
    fanfare() {
      [523, 659, 784, 1047].forEach((fq, i) => tone(fq, i === 3 ? 0.7 : 0.18, { type: 'triangle', at: i * 0.16, vol: 0.4 }));
    },
    sad() {
      [392, 370, 349].forEach((fq, i) => tone(fq, 0.4, { type: 'sawtooth', at: i * 0.45, vol: 0.15 }));
      tone(330, 1.0, { type: 'sawtooth', at: 1.35, vol: 0.15, slide: 300 });
    },
    crash() {
      noise(1.2, { vol: 0.9, freq: 2000, slide: 150 });
      tone(55, 0.9, { type: 'square', vol: 0.3, slide: 30 });
    },
    splash() {
      noise(0.9, { vol: 0.7, freq: 2500, slide: 400, filter: 'bandpass' });
    },
    correct() {
      tone(660, 0.12, { vol: 0.35 });
      tone(990, 0.22, { at: 0.1, vol: 0.35 });
    },
    wrong() {
      tone(220, 0.3, { type: 'triangle', vol: 0.35, slide: 160 });
    },
    tick() {
      tone(1000, 0.04, { type: 'square', vol: 0.08 });
    },
    click() {
      tone(1400, 0.03, { type: 'square', vol: 0.06 });
    },
  };

  function caption(text) {
    const box = document.getElementById('captions');
    if (!box) return;
    const item = document.createElement('div');
    item.className = 'cap';
    item.textContent = text;
    box.append(item);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => item.remove(), 3200);
  }

  A.play = (name) => {
    if (A.captions && CAPTIONS[name]) caption(CAPTIONS[name]);
    if (!A.enabled || !A.ctx || !SOUNDS[name]) return;
    try {
      SOUNDS[name]();
    } catch (e) {
      /* audio is a nice-to-have */
    }
  };

  EL.audio = A;
})(window.EL);
