/* Boot: wire up the screens, buttons and pause handling. */
(function (EL) {
  'use strict';

  const $ = (id) => document.getElementById(id);

  EL.ui.dashboard.init($('dashboard'));
  EL.ui.challenge.init($('challenge'), $('alert-banner'));
  EL.ui.scene.init($('scene'));
  EL.ui.screens.init();
  EL.ui.screens.show('start');

  function takeOff() {
    EL.audio.init(); // browsers only allow audio after a click
    EL.game.start(EL.ui.screens.getSettings()).catch((e) => {
      console.error(e);
      EL.ui.screens.show('start');
    });
  }

  // ----- pause -----
  const overlay = $('pause-overlay');
  function pause() {
    if (document.body.dataset.screen !== 'game' || EL.clock.paused) return;
    EL.clock.paused = true;
    overlay.hidden = false;
    $('btn-resume').focus();
  }
  function resume() {
    EL.clock.paused = false;
    overlay.hidden = true;
  }
  function quitToMenu() {
    overlay.hidden = true;
    EL.game.quit();
    EL.ui.screens.show('start');
  }

  $('btn-start').addEventListener('click', takeOff);
  $('btn-again').addEventListener('click', takeOff);
  $('btn-menu').addEventListener('click', () => EL.ui.screens.show('start'));
  $('btn-pause').addEventListener('click', pause);
  $('btn-resume').addEventListener('click', resume);
  $('btn-quit').addEventListener('click', quitToMenu);
  $('btn-sound').addEventListener('click', () => EL.ui.screens.toggleSound());

  document.addEventListener('keydown', (e) => {
    if (document.body.dataset.screen !== 'game') return;
    if (e.key === 'p' || e.key === 'P' || (e.key === 'Escape' && EL.clock.paused)) {
      e.preventDefault();
      if (EL.clock.paused) resume();
      else pause();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pause();
  });
})(window.EL);
