/*
 * The view out of the cockpit windscreen (canvas 2D).
 * Events drive it through a small API: bank/pitch, birds, parachutes,
 * oxygen masks, smoke, runway and the control tower.
 */
(function (EL) {
  'use strict';

  const U = EL.util;
  const art = () => EL.art;
  const TAU = Math.PI * 2;
  const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const S = {
    canvas: null, ctx: null, w: 0, h: 0, dpr: 1, t: 0,
    bank: 0, bankTarget: 0, dodge: 0, pitch: 0, pitchTarget: 0,
    altitude: 35000, scroll: 0,
    clouds: [], birds: [], laneShift: 0, laneShiftTarget: 0,
    chutes: [], splats: [], smoke: [],
    masks: false, maskDrop: 0,
    fireSide: null, smokeTimer: 0,
    landing: false, runwayP: 0, runwayPTarget: 0, runwayOff: 0, runwayOffTarget: 0,
    towerCrash: 0, towerCrashTarget: 0,
    shake: 0, flash: 0,
  };

  function newCloud(far) {
    return {
      x: U.rand(-3, 3),
      y: U.chance(0.55) ? U.rand(0.25, 1.2) : U.rand(-1.0, -0.25),
      z: far ? U.rand(3, 4.5) : U.rand(0.5, 4.5),
      size: U.rand(0.6, 1.4),
    };
  }

  function init(canvas) {
    S.canvas = canvas;
    S.ctx = canvas.getContext('2d');
    S.clouds = Array.from({ length: 14 }, () => newCloud(false));
    window.addEventListener('resize', resize);
    EL.clock.onFrame(frame);
  }

  function resize() {
    const rect = S.canvas.getBoundingClientRect();
    S.dpr = Math.min(2, window.devicePixelRatio || 1);
    S.w = rect.width;
    S.h = rect.height;
    S.canvas.width = Math.round(rect.width * S.dpr);
    S.canvas.height = Math.round(rect.height * S.dpr);
  }

  function reset() {
    Object.assign(S, {
      bank: 0, bankTarget: 0, dodge: 0, pitch: 0, pitchTarget: 0, altitude: 35000,
      birds: [], laneShift: 0, laneShiftTarget: 0, chutes: [], splats: [], smoke: [],
      masks: false, maskDrop: 0, fireSide: null,
      landing: false, runwayP: 0, runwayPTarget: 0, runwayOff: 0, runwayOffTarget: 0,
      towerCrash: 0, towerCrashTarget: 0, shake: 0, flash: 0,
    });
  }

  // ---------- update ----------
  function ease(current, target, dt, ms) {
    return current + (target - current) * Math.min(1, dt / ms);
  }

  function update(dt) {
    S.t += dt;
    S.bank = ease(S.bank, S.bankTarget + S.dodge, dt, 350);
    S.dodge = ease(S.dodge, 0, dt, 1400);
    S.pitch = ease(S.pitch, S.pitchTarget, dt, 600);
    S.laneShift = ease(S.laneShift, S.laneShiftTarget, dt, 350);
    S.runwayP = ease(S.runwayP, S.runwayPTarget, dt, 900);
    S.runwayOff = ease(S.runwayOff, S.runwayOffTarget, dt, 700);
    S.towerCrash = ease(S.towerCrash, S.towerCrashTarget, dt, 700);
    S.shake = Math.max(0, S.shake - dt * 0.02);
    S.flash = Math.max(0, S.flash - dt / 900);
    S.maskDrop = ease(S.maskDrop, S.masks ? 1 : 0, dt, 300);

    const speed = S.landing ? 2.2 : 1 + (35000 - S.altitude) / 15000;
    S.scroll = (S.scroll + dt * 0.0006 * speed) % 1000;

    for (const c of S.clouds) {
      c.z -= dt * 0.00032 * speed;
      if (c.z < 0.35) Object.assign(c, newCloud(true));
    }

    for (const b of S.birds) {
      if (b.state === 'approach') b.p = ease(b.p, 0.6, dt, 900 * b.lag);
      else b.p += dt * 0.0016;
    }
    S.birds = S.birds.filter((b) => b.p < 2.2);
    if (!S.birds.length) S.laneShiftTarget = 0;

    for (const c of S.chutes) {
      c.y += c.vy * dt;
      c.phase += dt * 0.002;
    }
    S.chutes = S.chutes.filter((c) => c.y < S.h + 80);

    for (const s of S.splats) s.age += dt;
    S.splats = S.splats.filter((s) => s.age < 6000);

    if (S.fireSide) {
      S.smokeTimer -= dt;
      if (S.smokeTimer <= 0) {
        S.smokeTimer = 140;
        const left = S.fireSide === 'left';
        S.smoke.push({ x: left ? S.w * 0.04 : S.w * 0.96, y: S.h * 0.82, vx: (left ? -1 : 1) * U.rand(0.01, 0.04), vy: -U.rand(0.02, 0.05), r: U.rand(10, 20), age: 0 });
      }
    }
    for (const p of S.smoke) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += dt * 0.03;
      p.age += dt;
    }
    S.smoke = S.smoke.filter((p) => p.age < 1800);
  }

  // ---------- draw ----------
  function drawWorld(ctx, w, h) {
    const big = Math.hypot(w, h) * 1.5;
    const horizon = h * 0.06 + S.pitch * h * 0.018;

    // sky
    let g = ctx.createLinearGradient(0, horizon - h * 0.9, 0, horizon);
    g.addColorStop(0, '#1f6fd1');
    g.addColorStop(0.65, '#6cb8f0');
    g.addColorStop(1, '#d9f0ff');
    ctx.fillStyle = g;
    ctx.fillRect(-big, horizon - big, big * 2, big);

    // ground
    const haze = U.clamp(S.altitude / 35000, 0, 1);
    g = ctx.createLinearGradient(0, horizon, 0, horizon + h);
    g.addColorStop(0, haze > 0.5 ? '#c4dcc0' : '#a7d493');
    g.addColorStop(0.2, '#7cbf5c');
    g.addColorStop(1, '#3f8f3a');
    ctx.fillStyle = g;
    ctx.fillRect(-big, horizon, big * 2, big);

    // field stripes rushing towards us
    const bands = 14;
    for (let i = 0; i < bands; i++) {
      const d = ((i + S.scroll * 20) % bands) / bands;
      const y = horizon + Math.pow(d, 2.3) * h * 1.2;
      ctx.globalAlpha = 0.1 + d * 0.25;
      ctx.fillStyle = i % 2 ? '#4f9a3c' : '#9fd27c';
      ctx.fillRect(-big, y, big * 2, Math.max(1, d * d * 40));
    }
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let k = -10; k <= 10; k++) {
      ctx.beginPath();
      ctx.moveTo(k * 6, horizon);
      ctx.lineTo(k * w * 0.2, horizon + h * 1.4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (S.landing || S.runwayP > 0.01) drawRunway(ctx, w, h, horizon);

    // clouds, far first
    const f = w * 0.35;
    const sorted = S.clouds.slice().sort((a, b) => b.z - a.z);
    for (const c of sorted) {
      const sx = (c.x / c.z) * f;
      const sy = horizon + ((c.y * f * 0.5) / c.z);
      const size = (c.size / c.z) * f * 0.22;
      const alpha = U.clamp((4.5 - c.z) / 1.5, 0, 1) * (S.landing ? 0.4 : 0.9);
      art().cloud(ctx, sx, sy, size, alpha);
    }
  }

  function drawRunway(ctx, w, h, horizon) {
    const p = S.runwayP;
    const e = p * p;
    const farY = horizon + 2 + e * h * 0.05;
    const nearY = horizon + (0.06 + e * 1.0) * h;
    const farW = 6 + e * w * 0.1;
    const nearW = 24 + e * w * 1.2;
    const farX = S.runwayOff * w * 0.05;
    const nearX = S.runwayOff * w * 0.4 * (0.3 + e);

    ctx.fillStyle = '#4a4f5c';
    ctx.beginPath();
    ctx.moveTo(farX - farW / 2, farY);
    ctx.lineTo(farX + farW / 2, farY);
    ctx.lineTo(nearX + nearW / 2, nearY);
    ctx.lineTo(nearX - nearW / 2, nearY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1 + e * 3;
    ctx.stroke();

    // centreline dashes
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 10; i++) {
      const a = ((i + (S.scroll * 40) % 1) / 10);
      const b = a + 0.04;
      const y1 = U.lerp(farY, nearY, a * a);
      const y2 = U.lerp(farY, nearY, b * b);
      const x1 = U.lerp(farX, nearX, a * a);
      const x2 = U.lerp(farX, nearX, b * b);
      const wd = U.lerp(1, 6 + e * 10, a * a);
      ctx.beginPath();
      ctx.moveTo(x1 - wd / 4, y1);
      ctx.lineTo(x1 + wd / 4, y1);
      ctx.lineTo(x2 + wd / 2, y2);
      ctx.lineTo(x2 - wd / 2, y2);
      ctx.fill();
    }

    // control tower beside the runway (it grows and slides to centre in the tower ending)
    const tc = S.towerCrash;
    const towerX = U.lerp(farX - farW * 2.5 - 12 - e * w * 0.35, 0, tc);
    const towerS = U.lerp(h * (0.06 + e * 0.35), h * 2.2, tc * tc);
    const towerBase = U.lerp(farY + e * h * 0.12, towerS * 0.84, tc); // cab ends up mid-screen
    art().tower(ctx, towerX, towerBase, towerS);
  }

  function drawBirds(ctx, w, h) {
    const vx = w / 2;
    const vy = h * 0.45;
    for (const b of S.birds) {
      const tx = w / 2 + (b.lane - 1) * w * 0.3 + b.dx * w + S.laneShift;
      const ty = h * 0.32 + b.dy * h;
      const p = b.p;
      const x = vx + (tx - vx) * p;
      const y = vy + (ty - vy) * p + (b.state === 'approach' ? Math.sin(S.t * 0.003 + b.phase) * 6 * p : 0);
      const s = (6 + p * p * 60) * b.size * (w / 1000 + 0.3);
      art().bird(ctx, x, y, s, Math.sin(S.t * 0.018 + b.phase));
    }
  }

  function drawChutes(ctx, w, h) {
    const s = Math.max(14, w * 0.022);
    for (const c of S.chutes) {
      art().chute(ctx, c.x + Math.sin(c.phase) * 18, c.y, s * c.scale, { sway: Math.sin(c.phase) * 0.25, colour: c.colour, kind: c.kind });
    }
  }

  function drawSplats(ctx, w) {
    for (const s of S.splats) {
      const alpha = s.age > 4500 ? 1 - (s.age - 4500) / 1500 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(s.x, s.y);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 7; i++) {
        const a = s.seed + i * 0.9;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * s.r * 0.6, Math.sin(a * 1.3) * s.r * 0.5, s.r * (0.35 + (i % 3) * 0.12), 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#9aa0ad';
      for (let i = 0; i < 4; i++) {
        const a = s.seed * 2 + i * 1.7;
        ctx.save();
        ctx.translate(Math.cos(a) * s.r * 1.2, Math.sin(a) * s.r * 1.1);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.ellipse(0, 0, s.r * 0.45, s.r * 0.12, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
    void w;
  }

  function drawSmoke(ctx, w, h) {
    if (!S.fireSide && !S.smoke.length) return;
    if (S.fireSide) {
      const left = S.fireSide === 'left';
      const gx = left ? 0 : w;
      const g = ctx.createRadialGradient(gx, h * 0.9, 5, gx, h * 0.9, w * 0.22);
      const flicker = 0.35 + Math.sin(S.t * 0.02) * 0.1;
      g.addColorStop(0, `rgba(230,159,0,${flicker})`);
      g.addColorStop(1, 'rgba(230,159,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    for (const p of S.smoke) {
      ctx.fillStyle = `rgba(90,90,100,${0.45 * (1 - p.age / 1800)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();
    }
  }

  function drawMasks(ctx, w, h) {
    if (S.maskDrop < 0.02) return;
    const xs = [0.14, 0.34, 0.66, 0.86];
    const len = h * 0.22 * S.maskDrop;
    const r = Math.max(12, w * 0.018);
    xs.forEach((fx, i) => {
      const swing = Math.sin(S.t * 0.004 + i) * 0.12;
      const x0 = w * fx;
      const x1 = x0 + Math.sin(swing) * len;
      const y1 = Math.cos(swing) * len;
      ctx.strokeStyle = '#d7dbe6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x0, 0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.fillStyle = '#F0E442';
      ctx.strokeStyle = '#1b2238';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x1, y1 + r * 0.8, r, 0, TAU);
      ctx.fill();
      ctx.stroke();
    });
  }

  function drawFrame(ctx, w, h) {
    const s = Math.max(0.6, w / 1000);
    ctx.fillStyle = '#141a2e';
    ctx.beginPath();
    ctx.moveTo(w / 2 - 7 * s, 0);
    ctx.lineTo(w / 2 + 7 * s, 0);
    ctx.lineTo(w / 2 + 20 * s, h);
    ctx.lineTo(w / 2 - 20 * s, h);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(26 * s, 0);
    ctx.lineTo(70 * s, h);
    ctx.lineTo(0, h);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w - 26 * s, 0);
    ctx.lineTo(w - 70 * s, h);
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.fillRect(0, 0, w, 8 * s);
  }

  function draw() {
    const { ctx, w, h, dpr } = S;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const shake = reduceMotion ? 0 : S.shake;
    ctx.save();
    ctx.translate(w / 2 + U.rand(-shake, shake), h / 2 + U.rand(-shake, shake));
    ctx.rotate((-S.bank * Math.PI) / 180);
    drawWorld(ctx, w, h);
    ctx.restore();

    ctx.save();
    ctx.translate(U.rand(-shake, shake), U.rand(-shake, shake));
    drawSmoke(ctx, w, h);
    drawBirds(ctx, w, h);
    drawChutes(ctx, w, h);
    drawSplats(ctx, w);
    drawMasks(ctx, w, h);
    ctx.restore();

    drawFrame(ctx, w, h);

    if (S.flash > 0) {
      ctx.fillStyle = `rgba(213,94,0,${S.flash * (reduceMotion ? 0.15 : 0.35)})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function frame(dt, paused) {
    if (!S.canvas || !S.canvas.offsetParent) return; // not on screen
    const rect = S.canvas.getBoundingClientRect();
    if (Math.abs(rect.width - S.w) > 1 || Math.abs(rect.height - S.h) > 1) resize();
    if (!S.w || !S.h) return;
    if (!paused) update(dt);
    draw();
  }

  // ---------- API used by events ----------
  const scene = {
    init,
    reset,
    setBank(deg) { S.bankTarget = deg; },
    setPitch(deg) { S.pitchTarget = deg; },
    setAltitude(ft) { S.altitude = ft; },
    shake(amount = 6) { S.shake = Math.max(S.shake, amount); },
    flash() { S.flash = 1; },

    spawnFlock(clearLane) {
      S.birds = [];
      S.laneShiftTarget = 0;
      for (let lane = 0; lane < 3; lane++) {
        if (lane === clearLane) continue;
        const n = U.randInt(4, 6);
        for (let k = 0; k < n; k++) {
          S.birds.push({ lane, dx: U.rand(-0.09, 0.09), dy: U.rand(-0.1, 0.1), p: 0, lag: 1 + k * 0.25, phase: U.rand(0, TAU), size: U.rand(0.8, 1.2), state: 'approach' });
        }
      }
    },

    // dodged: slide the view so the clear lane comes to the middle. Otherwise fly into a flock.
    resolveFlock(dodged, clearLane) {
      const lane = dodged ? clearLane : U.pick([0, 1, 2].filter((l) => l !== clearLane));
      S.laneShiftTarget = -(lane - 1) * S.w * 0.3;
      S.dodge = (lane - 1) * 22;
      S.birds.forEach((b) => { b.state = 'pass'; });
      if (!dodged) {
        setTimeout(() => {
          for (let i = 0; i < 3; i++) S.splats.push({ x: S.w * U.rand(0.25, 0.75), y: S.h * U.rand(0.15, 0.5), r: Math.max(18, S.w * 0.03), seed: U.rand(0, 6), age: 0 });
          scene.shake(10);
        }, 350);
      }
    },

    spawnParachutes(n, kind = 'person') {
      for (let i = 0; i < n; i++) {
        S.chutes.push({ x: U.rand(0.1, 0.9) * S.w, y: -U.rand(30, 260), vy: U.rand(0.05, 0.09), phase: U.rand(0, TAU), colour: U.randInt(0, 3), scale: U.rand(0.8, 1.2), kind });
      }
    },

    setMasks(on) { S.masks = !!on; },
    setFireSide(side) { S.fireSide = side; },

    setLanding(on) {
      S.landing = !!on;
      if (!on) {
        S.runwayPTarget = 0;
        S.runwayP = 0;
        S.towerCrashTarget = 0;
        S.towerCrash = 0;
      }
    },
    setRunway({ p, off }) {
      if (p != null) S.runwayPTarget = p;
      if (off != null) S.runwayOffTarget = off;
    },
    crashIntoTower() { S.towerCrashTarget = 1; S.runwayOffTarget = 0; },
  };

  EL.ui.scene = scene;
})(window.EL);
