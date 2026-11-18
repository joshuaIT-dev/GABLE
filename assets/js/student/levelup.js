/* ═══════════════════════════════════════════════
   levelup.js  —  Level-Up XP Bonus, Discount
                  Coupons & Scaled XP System
   Depends on: student.js (studentXP, showToast,
               updateXPDisplay, renderXP)
   ═══════════════════════════════════════════════ */

/* ═══ LEVEL CONFIGURATION ═══
   Each level defines:
   - xpRequired : cumulative XP needed to REACH this level
   - name       : display title
   - bonus      : flat XP awarded immediately on level-up
   - reward     : coupon/perk unlocked (null = none)
   ════════════════════════════════════════════════ */
const LEVELS = [
  { level: 1, xpRequired: 0,    name: 'Rookie',        bonus: 0,
    reward: null },

  { level: 2, xpRequired: 300,  name: 'Apprentice',    bonus: 100,
    reward: { type: 'avatar_unlock', label: 'Apprentice Badge', desc: 'Unlocks the Apprentice profile frame and title in your dashboard', icon: '🛡️', uses: 0, permanent: true } },

  { level: 3, xpRequired: 700,  name: 'Scholar',       bonus: 100,
    reward: { type: 'streak_freeze', label: 'Streak Freeze', desc: 'Automatically saves your study streak if you miss a day', icon: '🧊', uses: 1, permanent: false } },

  { level: 4, xpRequired: 1200, name: 'Battle Ready',  bonus: 150,
    reward: { type: 'fifty_fifty', label: '50/50 Lifeline', desc: 'Removes 2 wrong choices from any multiple-choice question', icon: '✂️', uses: 1, permanent: false } },

  { level: 5, xpRequired: 2000, name: 'Battle Veteran',bonus: 150,
    reward: { type: 'xp_multiplier', label: '1.5x XP Boost', desc: 'Earn 50% more XP on your next 2 quizzes', icon: '⚡', uses: 2, permanent: false } },

  { level: 6, xpRequired: 3000, name: 'Battle Master', bonus: 200,
    reward: { type: 'hint_discount', label: '50% Off Hints', desc: 'Hints cost 25 XP instead of 50 XP for your next 3 hints', icon: '💡', uses: 3, permanent: false } },

  { level: 7, xpRequired: 4500, name: 'Champion',      bonus: 200,
    reward: { type: 'free_boost', label: 'Free Grade Boost', desc: 'Add 1 percentage point to one eligible graded formal quiz without spending XP', icon: '🎁', uses: 1, permanent: false } },

  { level: 8, xpRequired: 6500, name: 'GABLE Master',  bonus: 250,
    reward: { type: 'crown', label: 'GABLE Master Crown', desc: 'Exclusive crown title, golden profile frame, and semester-long +10 bonus XP on every quiz this semester', icon: '👑', uses: null, permanent: true } },
];

/* ═══ COUPON WALLET ═══
   Populated when a reward is unlocked.
   Each entry: { type, label, desc, icon, uses, remaining }
   ════════════════════════════════════════════════ */
let coupons = [];

/* ═══ INTERNAL STATE ═══ */
let _lastCheckedLevel = null; // set on init after DOM is ready

/* ─────────────────────────────────────────
   getLevelForXP(xp)
   Returns the LEVELS entry the student is
   currently on given their total XP.
───────────────────────────────────────── */
function getLevelForXP(xp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.xpRequired) current = lvl;
    else break;
  }
  return current;
}

/* ─────────────────────────────────────────
   getNextLevel(currentLevel)
   Returns the next LEVELS entry, or null
   if already at max.
───────────────────────────────────────── */
function getNextLevel(currentLevel) {
  const idx = LEVELS.findIndex(l => l.level === currentLevel.level);
  return idx < LEVELS.length - 1 ? LEVELS[idx + 1] : null;
}

/* ─────────────────────────────────────────
   getXPProgressPct(xp)
   Returns 0-100 fill % within current level.
───────────────────────────────────────── */
function getXPProgressPct(xp) {
  const cur  = getLevelForXP(xp);
  const next = getNextLevel(cur);
  if (!next) return 100;
  const range    = next.xpRequired - cur.xpRequired;
  const progress = xp - cur.xpRequired;
  return Math.min(Math.round((progress / range) * 100), 100);
}

/* ─────────────────────────────────────────
   getXPToNextLevel(xp)
   Returns XP still needed, or 0 at max.
───────────────────────────────────────── */
function getXPToNextLevel(xp) {
  const next = getNextLevel(getLevelForXP(xp));
  return next ? Math.max(next.xpRequired - xp, 0) : 0;
}

/* ─────────────────────────────────────────
   checkLevelUp(newXP)
   Call this AFTER adding XP to studentXP.
   Handles bonus grant + popup + coupons.
   Returns true if a level-up occurred.
───────────────────────────────────────── */
function checkLevelUp(newXP) {
  if (_lastCheckedLevel === null) {
    _lastCheckedLevel = getLevelForXP(newXP);
    return false;
  }

  const newLevel = getLevelForXP(newXP);
  if (newLevel.level <= _lastCheckedLevel.level) return false;

  // ── Level-up detected! ──
  const levelsGained = [];
  for (const lvl of LEVELS) {
    if (lvl.level > _lastCheckedLevel.level && lvl.level <= newLevel.level) {
      levelsGained.push(lvl);
    }
  }

  const totalBonus = levelsGained.reduce((sum, lvl) => sum + lvl.bonus, 0);
  const newRewards = levelsGained.filter(lvl => lvl.reward).map(lvl => lvl.reward);

  // Update tracked level
  _lastCheckedLevel = newLevel;

  // Show the popup
  showLevelUpPopup(newLevel, totalBonus, newRewards, levelsGained.length > 1);

  return true;
}

/* ─────────────────────────────────────────
   showLevelUpPopup(level, bonus, rewards)
   Injects and displays the animated modal.
───────────────────────────────────────── */
function showLevelUpPopup(level, bonus, rewards, multiLevel) {
  // Remove existing if any
  const existing = document.getElementById('levelup-overlay');
  if (existing) existing.remove();

  const isGableMaster = level.level === 8;

  const rewardHTML = rewards.length
    ? rewards.map(r => `
        <div class="lu-reward-item ${r.permanent ? 'lu-reward-perm' : ''}">
          <span class="lu-reward-icon">${r.icon}</span>
          <div class="lu-reward-text">
            <div class="lu-reward-label">${r.label}</div>
            <div class="lu-reward-desc">${r.desc}</div>
            ${r.permanent
              ? `<div class="lu-perm-badge">♾️ This semester — until semester reset</div>`
              : r.uses > 1 ? `<div class="lu-uses-badge">${r.uses} uses</div>` : ''}
          </div>
        </div>`).join('')
    : '';

  const bonusHTML = bonus > 0
    ? `<div class="lu-bonus">+${bonus} XP Bonus Awarded!</div>`
    : '';

  const multiHTML = multiLevel
    ? `<div class="lu-multi">🔥 Multiple levels gained!</div>`
    : '';

  const titleText  = isGableMaster ? '👑 GABLE MASTER!' : 'LEVEL UP!';
  const btnText    = isGableMaster ? '👑 Claim My Crown!' : 'Awesome! Keep Going 🚀';
  const modalExtra = isGableMaster ? 'lu-modal-gable' : '';

  const overlay = document.createElement('div');
  overlay.id = 'levelup-overlay';
  overlay.className = 'lu-overlay';
  overlay.innerHTML = `
    <div class="lu-modal ${modalExtra}">
      <div class="lu-sparkles">
        <span class="lu-star s1">${isGableMaster ? '👑' : '⭐'}</span>
        <span class="lu-star s2">✨</span>
        <span class="lu-star s3">${isGableMaster ? '👑' : '⭐'}</span>
        <span class="lu-star s4">✨</span>
        <span class="lu-star s5">${isGableMaster ? '👑' : '⭐'}</span>
      </div>
      <div class="lu-badge-wrap">
        <div class="lu-level-badge ${isGableMaster ? 'lu-badge-gable' : ''}">${isGableMaster ? '👑' : level.level}</div>
        <div class="lu-level-ring ${isGableMaster ? 'lu-ring-gable' : ''}"></div>
      </div>
      <div class="lu-title ${isGableMaster ? 'lu-title-gable' : ''}">${titleText}</div>
      <div class="lu-subtitle">You've reached <strong>${isGableMaster ? 'the highest rank' : 'Level ' + level.level}</strong></div>
      <div class="lu-level-name ${isGableMaster ? 'lu-name-gable' : ''}">${level.name}</div>
      ${multiHTML}
      ${bonusHTML}
      ${rewardHTML ? `<div class="lu-rewards-title">${isGableMaster ? '👑 Ultimate Reward' : '🎁 Reward Unlocked'}</div>${rewardHTML}` : ''}
      <button class="lu-close-btn ${isGableMaster ? 'lu-btn-gable' : ''}" onclick="closeLevelUpPopup()">
        ${btnText}
      </button>
    </div>`;

  document.body.appendChild(overlay);

  // Trigger animation
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      overlay.classList.add('lu-visible');
    });
  });
}

function closeLevelUpPopup() {
  const overlay = document.getElementById('levelup-overlay');
  if (!overlay) return;
  overlay.classList.remove('lu-visible');
  overlay.classList.add('lu-hiding');
  setTimeout(() => overlay.remove(), 400);

  // Refresh displays after popup closes
  updateXPDisplay();
  if (document.getElementById('panel-xp').classList.contains('active')) {
    renderXP();
  }
}

/* ─────────────────────────────────────────
   getCouponForHints()
   Returns the first active hint-discount
   coupon, or null.
───────────────────────────────────────── */
function getCouponForHints() {
  return coupons.find(c => c.type === 'hint_discount' && c.remaining > 0) || null;
}




/* ─────────────────────────────────────────
   getFreeBoostCoupon()
   Returns the first active free-boost
   coupon, or null.
───────────────────────────────────────── */
function getFreeBoostCoupon() {
  return coupons.find(c => c.type === 'free_boost' && c.remaining > 0) || null;
}




/* ─────────────────────────────────────────
   renderCouponsSection()
   Returns HTML string for the coupon wallet
   to inject into renderXP().
───────────────────────────────────────── */
function renderCouponsSection() {
  if (!coupons.length) return '';


  return `
    <div class="coupon-wallet" id="coupon-wallet">
      <div class="cw-title">🎟️ Your Reward Coupons</div>
      ${coupons.map((c, i) => {
        const isManual = c.type === 'free_boost' && c.remaining > 0;
        const isCrown  = c.type === 'crown';
        const usesHTML = c.permanent
          ? `<div class="coupon-uses" style="background:rgba(251,191,36,.15);color:#fbbf24;border-color:rgba(251,191,36,.3)">♾️ This semester — until semester reset</div>`
          : `<div class="coupon-uses">${c.remaining} use${c.remaining !== 1 ? 's' : ''} remaining</div>`;
        const actionHTML = c.permanent
          ? `<div class="coupon-auto-badge">This semester</div>`
          : isManual
          ? `<button class="btn-coupon-use" onclick="useFreeBoostCoupon()">Use Now</button>`
          : `<div class="coupon-auto-badge">${c.remaining <= 0 ? 'Used up' : c.type === 'fifty_fifty' ? 'Use before answering' : 'Automatic when eligible'}</div>`;
        return `
          <div class="coupon-item ${isCrown ? 'coupon-item-crown' : ''}">
            <div class="coupon-left">
              <span class="coupon-icon">${c.icon}</span>
              <div class="coupon-info">
                <div class="coupon-label">${c.label}</div>
                <div class="coupon-desc">${c.desc}</div>
                ${usesHTML}
              </div>
            </div>
            ${actionHTML}
          </div>`;
      }).join('')}
    </div>`;
}

/* ─────────────────────────────────────────
   useFreeBoostCoupon()
   Triggered by the "Use Now" button in
   the coupon wallet.
───────────────────────────────────────── */
function useFreeBoostCoupon() {
  return chooseGradeBoost(true);
}

/* ─────────────────────────────────────────
   getLevelProgressHTML()
   Returns a small HTML snippet for the
   XP popup & XP tab showing current level
   info using the scaled system.
───────────────────────────────────────── */
function getLevelProgressHTML(xp) {
  const cur  = getLevelForXP(xp);
  const next = getNextLevel(cur);
  const pct  = getXPProgressPct(xp);
  const need = getXPToNextLevel(xp);
  return {
    levelNum:   cur.level,
    levelName:  cur.name,
    nextName:   next ? next.name : 'Max Level',
    pct,
    need,
    atMax:      !next,
  };
}

// The first server response establishes the level without replaying old unlocks.
function initLevelSystem() {
  _lastCheckedLevel = null;
}

// Auto-init if DOM already ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLevelSystem);
} else {
  initLevelSystem();
}


/* ═══════════════════════════════════════════════
   FEATURE 1 — PROFILE FRAME
   Applies a level-based CSS class to all avatar
   elements so the frame updates everywhere at once.
   ═══════════════════════════════════════════════ */

/* Frame tiers — maps level → CSS class + label */
const FRAME_TIERS = [
  { minLevel: 8, cls: 'frame-gable',      label: '👑 GABLE Master' },
  { minLevel: 7, cls: 'frame-champion',   label: '🏆 Champion'     },
  { minLevel: 6, cls: 'frame-master',     label: '⚔️ Battle Master' },
  { minLevel: 5, cls: 'frame-veteran',    label: '🛡️ Battle Veteran'},
  { minLevel: 4, cls: 'frame-ready',      label: '⚡ Battle Ready'  },
  { minLevel: 3, cls: 'frame-scholar',    label: '📚 Scholar'       },
  { minLevel: 2, cls: 'frame-apprentice', label: '🛡️ Apprentice'    },
  { minLevel: 1, cls: 'frame-rookie',     label: ''                 },
];

function getFrameTier(level) {
  return FRAME_TIERS.find(t => level >= t.minLevel) || FRAME_TIERS[FRAME_TIERS.length - 1];
}

/* Call after any XP change — updates every avatar on page */
function applyProfileFrame() {
  const level = getLevelForXP(studentSemesterXP).level;
  const tier  = getFrameTier(level);

  // Remove all old frame classes first
  const allClasses = FRAME_TIERS.map(t => t.cls);
  document.querySelectorAll('.s-avatar-nav, .profile-avatar-large').forEach(el => {
    el.classList.remove(...allClasses);
    if (tier.cls !== 'frame-rookie') el.classList.add(tier.cls);
  });

  // Update frame label badge wherever it exists
  document.querySelectorAll('.profile-frame-label').forEach(el => {
    el.textContent = tier.label;
    el.style.display = tier.label ? 'inline-block' : 'none';
  });
}


/* ═══════════════════════════════════════════════
   FEATURE 2 — MY REWARDS in profile modal
   Renders the full reward history inside the
   profile modal's rewards section.
   ═══════════════════════════════════════════════ */

function renderProfileFrameCollection(containerId = 'profile-frame-collection') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const level = getLevelForXP(studentSemesterXP).level;
  const current = getFrameTier(level);
  container.replaceChildren();
  [...FRAME_TIERS].reverse().forEach(tier => {
    const unlocked = level >= tier.minLevel;
    const card = document.createElement('div');
    card.className = `profile-frame-option${unlocked ? ' unlocked' : ' locked'}${tier.cls === current.cls ? ' current' : ''}`;
    const swatch = document.createElement('span');
    swatch.className = `profile-frame-swatch ${tier.cls}`;
    swatch.textContent = 'G';
    const copy = document.createElement('span');
    copy.className = 'profile-frame-copy';
    const name = document.createElement('strong');
    name.textContent = tier.label.replace(/^[^A-Za-z]+/, '') || 'Rookie';
    const state = document.createElement('small');
    state.textContent = tier.cls === current.cls ? 'Active frame' : unlocked ? 'Unlocked' : `Unlock at Level ${tier.minLevel}`;
    copy.append(name,state);card.append(swatch,copy);container.append(card);
  });
}

function renderProfileRewards(containerId = 'profile-rewards-list') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const level    = getLevelForXP(studentSemesterXP);
  const allEarned = LEVELS.filter(l => l.level <= level.level && l.reward);

  if (!allEarned.length) {
    container.innerHTML = `<div class="pr-empty">Keep earning XP to unlock rewards!</div>`;
    return;
  }

  container.innerHTML = allEarned.map(l => {
    const r = l.reward;
    // Check if coupon still active in wallet
    const active = coupons.find(c => c.type === r.type && (c.permanent || c.remaining > 0));
    const statusHTML = r.permanent
      ? `<span class="pr-status pr-status-perm">♾️ This semester</span>`
      : active
      ? `<span class="pr-status pr-status-active">${active.remaining} use${active.remaining !== 1 ? 's' : ''} left</span>`
      : `<span class="pr-status pr-status-used">Used</span>`;

    return `
      <div class="pr-item ${r.permanent ? 'pr-item-perm' : ''}">
        <div class="pr-icon">${r.icon}</div>
        <div class="pr-info">
          <div class="pr-label">${r.label}</div>
          <div class="pr-from">Unlocked at Level ${l.level} — ${l.name}</div>
        </div>
        <div class="pr-right">${statusHTML}</div>
      </div>`;
  }).join('');
}
