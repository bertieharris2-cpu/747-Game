/*
 * Pausable game clock. Timers, waits and animations all run off this so that
 * pausing the game (or switching tabs) freezes everything, including the
 * question timer.
 */
(function (EL) {
  'use strict';

  const listeners = new Set();
  const clock = { time: 0, paused: false };
  let last = null;

  function frame(ts) {
    const dt = last === null ? 0 : Math.min(100, ts - last);
    last = ts;
    if (!clock.paused) clock.time += dt;
    listeners.forEach((fn) => {
      try {
        fn(dt, clock.paused);
      } catch (e) {
        console.error(e);
      }
    });
    window.requestAnimationFrame(frame);
  }

  if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(frame);

  // fn(dtMs, paused) every animation frame. Returns an unsubscribe function.
  clock.onFrame = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  };

  // Resolves after `ms` of un-paused game time. Rejects if the flight is aborted.
  clock.wait = (ms, signal) =>
    new Promise((resolve, reject) => {
      if (signal && signal.aborted) return reject(new EL.FlightAborted());
      const end = clock.time + ms;
      const off = clock.onFrame(() => {
        if (signal && signal.aborted) {
          off();
          reject(new EL.FlightAborted());
        } else if (clock.time >= end) {
          off();
          resolve();
        }
      });
    });

  // A promise that only ever rejects, when the signal aborts. Use with Promise.race.
  clock.abortPromise = (signal) =>
    new Promise((_, reject) => {
      if (!signal) return;
      if (signal.aborted) return reject(new EL.FlightAborted());
      signal.addEventListener('abort', () => reject(new EL.FlightAborted()), { once: true });
    });

  EL.clock = clock;
})(window.EL);
