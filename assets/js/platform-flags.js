/* ═══════════════════════════════════════════════════════════════
   platform-flags.js
   Small UI helper for the Admin "Platform Settings".

   - Student page : shows the maintenance screen when Maintenance Mode
                    is ON (also if any server call answers "maintenance").
   - Instructor   : disables the "Battle Royale" quiz type when Battle
                    Royale Mode is OFF.

   This file is only about what people SEE. The real rules are enforced
   by the PHP endpoints, so skipping or editing this file cannot bypass
   a setting.
═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var path = (window.location.pathname || '').toLowerCase();
  var isStudentPage = /student\.html$/.test(path);
  var isInstructorPage = /instructor\.html$/.test(path);

  function goToMaintenance() {
    if (!/maintenance\.html$/.test((window.location.pathname || '').toLowerCase())) {
      window.location.replace('Maintenance.html');
    }
  }

  /* Student pages: any server answer of "maintenance" sends the student
     to the maintenance screen. */
  if (isStudentPage && typeof window.fetch === 'function') {
    var originalFetch = window.fetch.bind(window);
    window.fetch = function () {
      return originalFetch.apply(null, arguments).then(function (response) {
        if (response && response.status === 503) {
          response.clone().json().then(function (data) {
            if (data && data.maintenance) { goToMaintenance(); }
          }).catch(function () { /* not JSON: ignore */ });
        }
        return response;
      });
    };
  }

  function disableBattleRoyaleOptions() {
    var selects = document.querySelectorAll('select');
    selects.forEach(function (select) {
      Array.prototype.forEach.call(select.options, function (option) {
        var label = (option.textContent || '').replace(/[^a-z]/gi, '').toLowerCase();
        if (label.indexOf('battleroyale') === 0) {
          option.disabled = true;
          if (option.textContent.indexOf('disabled by admin') === -1) {
            option.textContent = option.textContent.trim() + ' (disabled by admin)';
          }
          if (select.selectedIndex === option.index) {
            for (var i = 0; i < select.options.length; i++) {
              if (!select.options[i].disabled) { select.selectedIndex = i; break; }
            }
          }
        }
      });
    });
  }

  function applyStatus(status) {
    if (!status || !status.success) { return; }

    if (isStudentPage && status.maintenance) {
      goToMaintenance();
      return;
    }

    if (isInstructorPage && status.battle_royale_enabled === false) {
      disableBattleRoyaleOptions();
    }
  }

  function loadStatus() {
    if (!isStudentPage && !isInstructorPage) { return; }

    fetch('../assets/php/platform_status.php', { cache: 'no-store', credentials: 'same-origin' })
      .then(function (response) { return response.json(); })
      .then(applyStatus)
      .catch(function (error) { console.error('Platform status check failed:', error); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadStatus);
  } else {
    loadStatus();
  }

  /* Instructor page: keep it updated if the Admin changes the setting. */
  if (isInstructorPage) { window.setInterval(loadStatus, 60000); }
})();
