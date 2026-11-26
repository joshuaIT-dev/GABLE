/* ═══════════════════════════════════════════════════════════
   powerups.js  —  Power-Ups Tab + In-Battle Dropdown
   Surfaces every reward defined in levelup.js's LEVELS table
   in one place, shows which ones the student currently owns,
   and lets them fire any owned manually-triggered power-up
   from a single dropdown during a quiz (instead of one button
   per power-up cluttering the battle nav row).

   Requires: levelup.js (LEVELS, coupons, getLevelForXP,
                          useFreeBoostCoupon)
             student.js (studentXP, activeBattle, battleCurrentQ,
                          renderXP, switchTab)
             fiftyfifty.js (useFiftyFifty — for the in-quiz trigger)
             hints.js (requestHint — listed in catalog only)

   HOW TO USE:
   Add to Student.html BEFORE </body>, after levelup.js and
   fiftyfifty.js:
     <script src="../assets/js/student/powerups.js"></script>

   student.js renders 50/50 in the quiz toolbar; switchTab('powerups')
   calls renderPowerupsTab().
═══════════════════════════════════════════════════════════ */

/* ── Master catalog: every power-up in the system ──────────
   manualDuringQuiz: true  → shows up in the in-battle dropdown
   manualDuringQuiz: false → either auto-applies, or is used
                              from the XP tab / profile (not
                              relevant mid-quiz)
   action: name of the function that requests an eligible server action
──────────────────────────────────────────────────────────── */
const POWERUP_CATALOG = [
  { type: 'avatar_unlock',  unlockLevel: 2, manualDuringQuiz: false, note: 'Cosmetic — check My Profile for the new frame.' },
  { type: 'streak_freeze',  unlockLevel: 3, manualDuringQuiz: false, note: 'Auto-applies if you miss a study day.' },
  { type: 'fifty_fifty',    unlockLevel: 4, manualDuringQuiz: true,  action: 'useFiftyFifty' },
  { type: 'xp_multiplier',  unlockLevel: 5, manualDuringQuiz: false, note: 'Auto-applies to your next quiz\'s XP — just finish a battle to see it.' },
  { type: 'hint_discount',  unlockLevel: 6, manualDuringQuiz: false, note: 'Auto-discounts the Hint button price during a quiz.' },
  { type: 'free_boost',     unlockLevel: 7, manualDuringQuiz: false, action: 'useFreeBoostCoupon' },
  { type: 'crown',          unlockLevel: 8, manualDuringQuiz: false, note: 'This semester +10 XP bonus — automatically applied to every quiz.' },
];

function getCatalogEntry(type) {
  return POWERUP_CATALOG.find(p => p.type === type);
}

/* ════════════════════════════════════════════════════════════
   IN-BATTLE DROPDOWN
   Replaces individual power-up buttons in the battle nav row.
════════════════════════════════════════════════════════════ */
let _puDropdownOpen = false;

function renderPowerupDropdown() {
  if (typeof coupons === 'undefined') return '';

  // Only coupons that are (a) usable manually and (b) usable mid-quiz
  const question = activeBattle?.questions[battleCurrentQ];
  if (!question || question.type === 'id' || question.opts?.length !== 4 || battleAnswers[battleCurrentQ] !== null) return '';
  const usable = coupons.filter(c => {
    const entry = getCatalogEntry(c.type);
    return entry && entry.manualDuringQuiz && c.remaining > 0;
  });

  if (!usable.length) return '';

  return `
    <div class="pu-dropdown-wrap" id="pu-dropdown-wrap">
      <button class="btn-powerup-dd" onclick="togglePowerupDropdown(event)">
        ⚡ Power-Ups <span class="pu-dd-count">${usable.length}</span>
      </button>
      <div class="pu-dropdown-menu" id="pu-dropdown-menu">
        ${usable.map(c => `
          <div class="pu-dd-item" onclick="firePowerupFromDropdown('${c.type}')">
            <span class="pu-dd-icon">${c.icon}</span>
            <div class="pu-dd-info">
              <div class="pu-dd-label">${c.label}</div>
              <div class="pu-dd-desc">${c.desc}</div>
            </div>
            <span class="pu-dd-uses">${c.remaining}x</span>
          </div>`).join('')}
      </div>
    </div>`;
}

function togglePowerupDropdown(e) {
  e.stopPropagation();
  const menu = document.getElementById('pu-dropdown-menu');
  if (!menu) return;
  _puDropdownOpen = !_puDropdownOpen;
  menu.classList.toggle('open', _puDropdownOpen);
}

document.addEventListener('click', e => {
  const wrap = document.getElementById('pu-dropdown-wrap');
  if (wrap && !wrap.contains(e.target)) {
    document.getElementById('pu-dropdown-menu')?.classList.remove('open');
    _puDropdownOpen = false;
  }
});

function firePowerupFromDropdown(type) {
  document.getElementById('pu-dropdown-menu')?.classList.remove('open');
  _puDropdownOpen = false;

  if (type === 'fifty_fifty' && typeof useFiftyFifty === 'function') {
    useFiftyFifty();
    // Re-render the dropdown button so the count/visibility updates
    refreshPowerupDropdownInPlace();
  }
}

/* Re-renders just the dropdown button after a power-up is consumed,
   without re-rendering the whole question (which would reset
   button states/highlights). */
function refreshPowerupDropdownInPlace() {
  const wrap = document.getElementById('pu-dropdown-wrap');
  if (!wrap) return;
  const fresh = renderPowerupDropdown();
  if (fresh) {
    wrap.outerHTML = fresh;
  } else {
    wrap.remove();
  }
}


/* ════════════════════════════════════════════════════════════
   POWER-UPS TAB
════════════════════════════════════════════════════════════ */
async function renderPowerupsTab() {
  try { await powerupRequest(); }
  catch (error) { showToast('!', error.message); }
  setText('pu-unlocked-count', `${coupons.length} / ${LEVELS.filter(level => level.reward).length}`);
  setText('pu-uses-count', coupons.reduce((total, reward) => total + (reward.permanent ? 0 : reward.remaining), 0));
  renderPowerupInventory();
  renderPowerupCatalog();
}

/* ── "Your Power-Up Inventory" — only coupons currently owned ── */
function renderPowerupInventory() {
  const container = document.getElementById('pu-inventory-list');
  if (!container) return;

  if (!coupons.some(c => c.permanent || c.remaining > 0)) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="emoji">🎒</span>
        <p>No power-ups yet. Level up to unlock your first one!</p>
      </div>`;
    return;
  }

  container.innerHTML = coupons.filter(c => c.permanent || c.remaining > 0).map(c => {
    const entry = getCatalogEntry(c.type);
    const canUse = c.type === 'free_boost' && c.remaining > 0;
    const usesHTML = c.permanent
      ? `<span class="pu-inv-uses pu-inv-perm">♾️ This semester</span>`
      : `<span class="pu-inv-uses">${c.remaining} use${c.remaining !== 1 ? 's' : ''} left</span>`;

    return `
      <div class="pu-inv-card">
        <div class="pu-inv-icon">${c.icon}</div>
        <div class="pu-inv-info">
          <div class="pu-inv-label">${c.label}</div>
          <div class="pu-inv-desc">${c.desc}</div>
          <p class="pu-inv-hint">${powerupInstructions(c.type)}</p>
          ${usesHTML}
        </div>
        ${canUse
          ? `<button class="btn-pu-use" onclick="${entry.action}()">Use token</button>`
          : entry?.manualDuringQuiz
            ? `<span class="pu-inv-hint">Use during a quiz</span>`
            : `<span class="pu-inv-hint">No activation needed</span>`}
      </div>`;
  }).join('');
}

/* ── "All Power-Ups & Unlock Levels" — full catalog, locked/unlocked ── */
function powerupInstructions(type) {
  return {
    avatar_unlock: 'Open My Profile to equip your Apprentice frame.',
    streak_freeze: 'Submit quizzes daily. If you miss one day, your saved freeze protects the streak when you return the following day.',
    fifty_fifty: 'Open a quiz with four-choice multiple-choice questions. Use 50/50 before answering; one use removes two wrong choices.',
    xp_multiplier: 'Finish a quiz that earns base XP above zero. The bonus applies when XP is awarded, after grading if review is needed. Covers two results.',
    hint_discount: 'Before answering, choose Hint in a quiz. Keep at least 25 spendable XP; each discounted hint uses 25 XP and one of your three discounts.',
    free_boost: 'After grading, choose a formal result below 100% and select Use token. Repeat boosts up to 100%. Grade boosts must be enabled by the administrator.',
    crown: 'Finish quizzes to receive the automatic +10 XP when each result earns its XP award. Open My Profile to equip the golden frame.'
  }[type] || '';
}

function renderPowerupCatalog() {
  const container = document.getElementById('pu-catalog-list');
  if (!container) return;

  const myLevel = getLevelForXP(studentSemesterXP).level;

  container.innerHTML = LEVELS.filter(l => l.reward).map(l => {
    const r = l.reward;
    const unlocked = myLevel >= l.level;
    const owned = coupons.find(c => c.type === r.type);

    let statusHTML;
    if (unlocked && owned) {
      statusHTML = r.permanent
        ? `<span class="pu-cat-status pu-status-active">♾️ Active</span>`
        : `<span class="pu-cat-status pu-status-active">${owned.remaining} left</span>`;
    } else if (unlocked) {
      statusHTML = `<span class="pu-cat-status pu-status-used">Used up</span>`;
    } else {
      statusHTML = `<span class="pu-cat-status pu-status-locked">🔒 Lv.${l.level}</span>`;
    }

    return `
      <div class="pu-cat-card ${unlocked ? '' : 'pu-cat-locked'}">
        <div class="pu-cat-icon">${unlocked ? r.icon : '🔒'}</div>
        <div class="pu-cat-info">
          <div class="pu-cat-label">${r.label}</div>
          <div class="pu-cat-desc">${r.desc}</div>
          <p class="pu-cat-unlock">${l.xpRequired.toLocaleString()} semester XP${unlocked ? ' reached' : ` • ${Math.max(0, l.xpRequired - studentSemesterXP).toLocaleString()} more XP needed`}. Earn XP by completing assigned quizzes; results awaiting review earn XP after grading. Level rewards are granted once per semester.</p>
          <p class="pu-cat-desc">${powerupInstructions(r.type)}</p>
          <div class="pu-cat-unlock">Unlocks at Level ${l.level} — ${l.name}</div>
        </div>
        ${statusHTML}
      </div>`;
  }).join('');
}
