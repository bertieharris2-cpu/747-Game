/*
 * Event registry. To add a new emergency, create a file in js/events/ that calls
 * EL.events.register({...}) and add a <script> tag for it in index.html.
 *
 *   {
 *     id: 'engineFire',
 *     title: 'Engine fire',
 *     icon: '🔥',
 *     random: true,              // can be picked for the random part of a flight
 *     canRun(state) { ... },     // optional: false if it makes no sense right now
 *     async run(ctx) { ... },    // see js/game.js → makeContext() for what ctx offers
 *   }
 */
(function (EL) {
  'use strict';

  const events = {};

  EL.events = {
    register(def) {
      events[def.id] = { canRun: () => true, random: false, ...def };
    },
    get: (id) => events[id],
    all: () => Object.values(events),
    randomIds: () => Object.values(events).filter((e) => e.random).map((e) => e.id),
  };
})(window.EL);
