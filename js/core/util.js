/*
 * Emergency Landing – shared helpers.
 * Loaded first. Every module hangs off the single global `EL` namespace so the
 * game runs from a double-clicked index.html (no server, no build step).
 */
window.EL = window.EL || {};

(function (EL) {
  'use strict';

  const U = {};

  U.randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  U.rand = (min, max) => min + Math.random() * (max - min);
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;

  U.shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Pick one of several generator functions: U.pickWeighted([[2, fnA], [1, fnB]])
  U.pickWeighted = (entries) => {
    const total = entries.reduce((sum, [w]) => sum + w, 0);
    let r = Math.random() * total;
    for (const [w, fn] of entries) {
      r -= w;
      if (r < 0) return fn();
    }
    return entries[entries.length - 1][1]();
  };

  U.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  U.lerp = (a, b, t) => a + (b - a) * t;

  // Round away floating-point noise (0.1 + 0.2 → 0.3).
  U.round = (n, dp = 6) => {
    const m = Math.pow(10, dp);
    return Math.round(n * m) / m;
  };

  U.decimals = (n) => {
    const s = String(U.round(n));
    const i = s.indexOf('.');
    return i < 0 ? 0 : s.length - i - 1;
  };

  // British number formatting: 12,345 and 0.56
  U.fmt = (n) => U.round(n).toLocaleString('en-GB', { maximumFractionDigits: 6 });

  U.gcd = (a, b) => (b ? U.gcd(b, a % b) : Math.abs(a));

  U.escape = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  U.plural = (n, word, pluralWord) => `${U.fmt(n)} ${n === 1 ? word : pluralWord || word + 's'}`;

  // Safe localStorage (private windows and locked-down school machines can throw).
  U.store = {
    get(key, fallback) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        /* ignore */
      }
    },
  };

  EL.util = U;
  EL.ui = EL.ui || {};

  // Thrown through the async game code when the player quits a flight.
  EL.FlightAborted = class FlightAborted extends Error {
    constructor() {
      super('Flight aborted');
      this.name = 'FlightAborted';
    }
  };
})(window.EL);
