/*
 * Cartoon drawing helpers (canvas 2D): clouds, the 747 side-on, birds,
 * parachutes, the control tower, plus the title banner and ending scenes.
 */
(function (EL) {
  'use strict';

  const TAU = Math.PI * 2;
  const INK = '#1b2238';

  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function cloud(ctx, x, y, s, alpha = 0.95) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, s * 0.5, 0, TAU);
    ctx.arc(x + s * 0.45, y - s * 0.2, s * 0.45, 0, TAU);
    ctx.arc(x + s * 0.9, y, s * 0.4, 0, TAU);
    ctx.arc(x - s * 0.45, y + s * 0.05, s * 0.35, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(180,200,230,0.35)';
    ctx.beginPath();
    ctx.ellipse(x + s * 0.2, y + s * 0.3, s * 0.9, s * 0.16, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* The jumbo, side-on, facing right. (x, y) is the centre, L the length. */
  function plane(ctx, x, y, L, { tilt = 0, gear = false } = {}) {
    const h = L * 0.13;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, L * 0.012);
    ctx.strokeStyle = INK;

    // far wing + engine
    ctx.fillStyle = '#9aa7c7';
    ctx.beginPath();
    ctx.moveTo(L * 0.05, h * 0.1);
    ctx.lineTo(-L * 0.2, -h * 0.9);
    ctx.lineTo(-L * 0.12, -h * 0.9);
    ctx.lineTo(L * 0.14, h * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // tail fin
    ctx.fillStyle = '#E69F00';
    ctx.beginPath();
    ctx.moveTo(-L * 0.5, -h * 0.35);
    ctx.lineTo(-L * 0.47, -h * 2.5);
    ctx.lineTo(-L * 0.38, -h * 2.5);
    ctx.lineTo(-L * 0.24, -h * 0.45);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${Math.round(h * 0.6)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('747', -L * 0.42, -h * 1.3);

    // upper-deck hump
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(L * 0.02, -h * 0.45);
    ctx.quadraticCurveTo(L * 0.2, -h * 1.25, L * 0.4, -h * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // fuselage
    ctx.beginPath();
    ctx.moveTo(-L * 0.5, -h * 0.45);
    ctx.lineTo(L * 0.36, -h * 0.5);
    ctx.quadraticCurveTo(L * 0.52, -h * 0.4, L * 0.51, h * 0.1);
    ctx.quadraticCurveTo(L * 0.48, h * 0.5, L * 0.34, h * 0.5);
    ctx.lineTo(-L * 0.32, h * 0.5);
    ctx.lineTo(-L * 0.5, -h * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // stripe
    ctx.fillStyle = '#0072B2';
    ctx.fillRect(-L * 0.46, h * 0.02, L * 0.9, h * 0.14);

    // windows
    ctx.fillStyle = INK;
    for (let i = 0; i < 16; i++) {
      ctx.beginPath();
      ctx.arc(-L * 0.36 + i * L * 0.045, -h * 0.18, h * 0.07, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(L * 0.14 + i * L * 0.04, -h * 0.72, h * 0.06, 0, TAU);
      ctx.fill();
    }
    // cockpit
    ctx.beginPath();
    ctx.moveTo(L * 0.4, -h * 0.4);
    ctx.lineTo(L * 0.47, -h * 0.25);
    ctx.lineTo(L * 0.4, -h * 0.2);
    ctx.closePath();
    ctx.fill();

    // near wing
    ctx.fillStyle = '#c8d1e6';
    ctx.beginPath();
    ctx.moveTo(L * 0.12, h * 0.25);
    ctx.lineTo(-L * 0.2, h * 1.1);
    ctx.lineTo(-L * 0.1, h * 1.1);
    ctx.lineTo(L * 0.24, h * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // engines
    ctx.fillStyle = '#e8ecf6';
    [[L * 0.1, h * 0.75], [-L * 0.05, h * 1.15]].forEach(([ex, ey]) => {
      rr(ctx, ex - L * 0.05, ey - h * 0.2, L * 0.1, h * 0.4, h * 0.2);
      ctx.fill();
      ctx.stroke();
    });

    if (gear) {
      ctx.fillStyle = INK;
      [[L * 0.3, h * 0.95], [-L * 0.12, h * 0.95], [-L * 0.02, h * 0.95]].forEach(([gx, gy]) => {
        ctx.fillRect(gx - 2, h * 0.5, 4, gy - h * 0.5);
        ctx.beginPath();
        ctx.arc(gx, gy, h * 0.18, 0, TAU);
        ctx.fill();
      });
    }
    ctx.restore();
  }

  /* A cartoon goose, seen head-on-ish. flap is -1..1. */
  function bird(ctx, x, y, s, flap) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = '#2b2f3a';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(2, s * 0.14);
    ctx.beginPath();
    ctx.moveTo(-s, -s * 0.2 * flap);
    ctx.quadraticCurveTo(-s * 0.5, -s * 0.6 * flap - s * 0.1, 0, 0);
    ctx.quadraticCurveTo(s * 0.5, -s * 0.6 * flap - s * 0.1, s, -s * 0.2 * flap);
    ctx.stroke();
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.05, s * 0.2, s * 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#E69F00';
    ctx.beginPath();
    ctx.moveTo(-s * 0.06, s * 0.05);
    ctx.lineTo(s * 0.06, s * 0.05);
    ctx.lineTo(0, s * 0.2);
    ctx.fill();
    ctx.restore();
  }

  const CANOPY_COLOURS = [['#E69F00', '#ffffff'], ['#0072B2', '#56B4E9'], ['#CC79A7', '#ffffff'], ['#009E73', '#F0E442']];

  /* A parachute carrying a person or a suitcase. */
  function chute(ctx, x, y, s, { sway = 0, colour = 0, kind = 'person' } = {}) {
    const [c1, c2] = CANOPY_COLOURS[colour % CANOPY_COLOURS.length];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(sway);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? c2 : c1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, s, Math.PI + (i * Math.PI) / 4, Math.PI + ((i + 1) * Math.PI) / 4);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath();
    ctx.arc(0, 0, s, Math.PI, TAU);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s, 0);
    ctx.lineTo(0, s * 1.3);
    ctx.lineTo(s, 0);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, s * 1.3);
    ctx.stroke();
    if (kind === 'bag') {
      ctx.fillStyle = '#8a5a2b';
      rr(ctx, -s * 0.35, s * 1.3, s * 0.7, s * 0.5, s * 0.08);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = '#f2c79b';
      ctx.beginPath();
      ctx.arc(0, s * 1.45, s * 0.2, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.lineWidth = Math.max(2, s * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, s * 1.6);
      ctx.lineTo(0, s * 2.0);
      ctx.moveTo(-s * 0.25, s * 1.75);
      ctx.lineTo(s * 0.25, s * 1.75);
      ctx.moveTo(0, s * 2.0);
      ctx.lineTo(-s * 0.18, s * 2.35);
      ctx.moveTo(0, s * 2.0);
      ctx.lineTo(s * 0.18, s * 2.35);
      ctx.stroke();
    }
    ctx.restore();
  }

  /* Air traffic control tower. (x, groundY) is the bottom centre, s its height. */
  function tower(ctx, x, groundY, s, { cracked = false } = {}) {
    ctx.save();
    ctx.lineWidth = Math.max(1.5, s * 0.015);
    ctx.strokeStyle = INK;
    ctx.fillStyle = '#d9dde8';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.1, groundY);
    ctx.lineTo(x - s * 0.07, groundY - s * 0.75);
    ctx.lineTo(x + s * 0.07, groundY - s * 0.75);
    ctx.lineTo(x + s * 0.1, groundY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // cab
    ctx.fillStyle = '#9aa7c7';
    ctx.beginPath();
    ctx.moveTo(x - s * 0.16, groundY - s * 0.75);
    ctx.lineTo(x - s * 0.2, groundY - s * 0.92);
    ctx.lineTo(x + s * 0.2, groundY - s * 0.92);
    ctx.lineTo(x + s * 0.16, groundY - s * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3d6fa8';
    ctx.fillRect(x - s * 0.17, groundY - s * 0.9, s * 0.34, s * 0.12);
    ctx.fillStyle = '#e8ecf6';
    ctx.fillRect(x - s * 0.21, groundY - s * 0.97, s * 0.42, s * 0.05);
    ctx.strokeRect(x - s * 0.21, groundY - s * 0.97, s * 0.42, s * 0.05);
    ctx.fillStyle = INK;
    ctx.fillRect(x - s * 0.01, groundY - s * 1.07, s * 0.02, s * 0.1);
    if (cracked) {
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      const cx = x - s * 0.1;
      const cy = groundY - s * 0.84;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * s * 0.09, cy + Math.sin(a) * s * 0.06);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function emoji(ctx, char, x, y, size, rot = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.font = `${Math.round(size)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, 0, 0);
    ctx.restore();
  }

  function skyAndSun(ctx, w, h, horizon) {
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, '#2f86de');
    g.addColorStop(1, '#cdeeff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, horizon);
    ctx.fillStyle = '#F0E442';
    ctx.beginPath();
    ctx.arc(w * 0.86, h * 0.18, Math.min(w, h) * 0.08, 0, TAU);
    ctx.fill();
  }

  function grass(ctx, w, h, top, colour = '#6fbf57') {
    ctx.fillStyle = colour;
    ctx.fillRect(0, top, w, h - top);
  }

  function runwayBand(ctx, w, top, height) {
    ctx.fillStyle = '#4a4f5c';
    ctx.fillRect(0, top, w, height);
    ctx.fillStyle = '#ffffff';
    for (let x = 10; x < w; x += 70) ctx.fillRect(x, top + height / 2 - 2, 36, 4);
  }

  /* Title banner: the jumbo cruising over moving clouds. */
  function drawTitle(ctx, w, h, t) {
    skyAndSun(ctx, w, h, h);
    for (let i = 0; i < 6; i++) {
      const x = ((i * 0.23 * w - t * 0.03 * (1 + (i % 3))) % (w * 1.4) + w * 1.4) % (w * 1.4) - w * 0.2;
      cloud(ctx, x, h * (0.25 + (i % 3) * 0.25), h * (0.12 + (i % 2) * 0.06), 0.9);
    }
    plane(ctx, w * 0.5, h * 0.5 + Math.sin(t * 0.002) * h * 0.05, Math.min(w * 0.55, h * 1.6), { tilt: Math.sin(t * 0.0015) * 0.04 });
  }

  /* Ending illustrations for the results screen. */
  function drawEnding(ctx, w, h, type, t) {
    ctx.clearRect(0, 0, w, h);
    const L = Math.min(w * 0.5, h * 1.3);
    const ground = h * 0.7;
    skyAndSun(ctx, w, h, ground);
    cloud(ctx, w * 0.15, h * 0.2, h * 0.1);
    cloud(ctx, w * 0.55, h * 0.12, h * 0.08);

    switch (type) {
      case 'perfect':
      case 'smooth':
      case 'bumpy': {
        grass(ctx, w, h, ground);
        runwayBand(ctx, w, ground + h * 0.04, h * 0.12);
        let bounce = 0;
        if (type === 'bumpy') bounce = Math.abs(Math.sin(t * 0.006)) * h * 0.08 * Math.max(0.2, 1 - ((t % 3000) / 3000));
        plane(ctx, w * 0.5, ground + h * 0.02 - L * 0.13 * 1.05 - bounce, L, { gear: true, tilt: type === 'bumpy' ? Math.sin(t * 0.01) * 0.03 : 0 });
        const cheers = type === 'perfect' ? ['⭐', '🎉', '👏', '⭐'] : type === 'smooth' ? ['👏', '🎉'] : ['🥤', '😅'];
        cheers.forEach((c, i) => {
          const phase = ((t * 0.0006 + i / cheers.length) % 1);
          emoji(ctx, c, w * (0.3 + i * (0.4 / Math.max(1, cheers.length - 1))), ground - L * 0.2 - phase * h * 0.35, h * 0.08);
        });
        break;
      }
      case 'field': {
        grass(ctx, w, h, ground, '#8cbf5a');
        for (let r = 0; r < 4; r++) {
          for (let x = (r % 2) * 20; x < w; x += 40) {
            const y = ground + h * 0.05 + r * h * 0.07;
            ctx.fillStyle = '#3e8e3a';
            ctx.beginPath();
            ctx.arc(x, y, h * 0.022 + r * 1.5, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#a6d86e';
            ctx.beginPath();
            ctx.arc(x, y, h * 0.011 + r, 0, TAU);
            ctx.fill();
          }
        }
        plane(ctx, w * 0.45, ground - L * 0.04, L, { tilt: -0.06 });
        emoji(ctx, '🧑‍🌾', w * 0.85, ground + h * 0.12, h * 0.14);
        emoji(ctx, '💢', w * 0.9, ground + h * 0.02 + Math.sin(t * 0.01) * 4, h * 0.07);
        emoji(ctx, '🥬', w * 0.2, ground - h * 0.1 - ((t * 0.08) % (h * 0.3)), h * 0.06, t * 0.005);
        break;
      }
      case 'pond': {
        grass(ctx, w, h, ground);
        plane(ctx, w * 0.5, ground + h * 0.02, L, { tilt: 0.03 });
        ctx.fillStyle = 'rgba(86,180,233,0.92)';
        ctx.beginPath();
        ctx.ellipse(w * 0.5, ground + h * 0.12, w * 0.45, h * 0.12, 0, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.ellipse(w * 0.5, ground + h * 0.12, w * (0.1 + ((t * 0.0002 + i * 0.25) % 1) * 0.35), h * (0.03 + ((t * 0.0002 + i * 0.25) % 1) * 0.08), 0, 0, TAU);
          ctx.globalAlpha = 1 - ((t * 0.0002 + i * 0.25) % 1);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        emoji(ctx, '🦆', w * 0.2 + Math.sin(t * 0.002) * 10, ground + h * 0.13, h * 0.09);
        emoji(ctx, '🦆', w * 0.78 - Math.sin(t * 0.002) * 10, ground + h * 0.15, h * 0.08);
        emoji(ctx, '💢', w * 0.82, ground + h * 0.04, h * 0.06);
        break;
      }
      case 'tower': {
        grass(ctx, w, h, ground);
        runwayBand(ctx, w, ground + h * 0.12, h * 0.1);
        const s = h * 0.42;
        const tx = w * 0.66;
        const Lt = L * 0.75;
        tower(ctx, tx, ground + h * 0.02, s, { cracked: true });
        const cabY = ground + h * 0.02 - s * 0.84;
        plane(ctx, tx - s * 0.1 - Lt * 0.47, cabY + Lt * 0.02, Lt, { tilt: 0.04 });
        emoji(ctx, '☕', tx + s * 0.25 + Math.sin(t * 0.003) * 10, cabY - h * 0.12 - Math.abs(Math.sin(t * 0.003)) * h * 0.1, h * 0.08, t * 0.006);
        for (let i = 0; i < 3; i++) {
          const a = t * 0.004 + (i * TAU) / 3;
          emoji(ctx, '💫', tx - s * 0.1 + Math.cos(a) * h * 0.1, cabY - h * 0.1 + Math.sin(a) * h * 0.03, h * 0.05);
        }
        break;
      }
      case 'empty':
      default: {
        grass(ctx, w, h, ground);
        runwayBand(ctx, w, ground + h * 0.04, h * 0.12);
        plane(ctx, w * 0.5, ground + h * 0.02 - L * 0.13 * 1.05, L, { gear: true });
        for (let i = 0; i < 7; i++) {
          const y = ((t * 0.02 + i * 60) % (ground + 40)) - 40;
          chute(ctx, (i + 0.5) * (w / 7) + Math.sin(t * 0.002 + i) * 12, y, h * 0.045, { sway: Math.sin(t * 0.002 + i) * 0.2, colour: i });
        }
        break;
      }
    }
  }

  EL.art = { rr, cloud, plane, bird, chute, tower, emoji, drawTitle, drawEnding };
})(window.EL);
