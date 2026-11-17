
/* ═══════════════════════════════════════════════════════════
   hints.js  —  In-Quiz Concept Hints
   Costs 50 XP per hint (or 25 XP with 50% Off coupon).
   Requires: powerup-api.js (authenticated usage and payment)
             levelup.js (getCouponForHints)
═══════════════════════════════════════════════════════════ */

const HINT_XP_COST      = 50; // full price
const HINT_XP_DISCOUNTED = 25; // 50% off coupon price

/* Track which questions already got a hint this session */
const hintUsed = {};

/* ── Get actual cost this question (checks active coupon) ── */
function getHintCost() {
  if (typeof getCouponForHints === 'function' && getCouponForHints()) {
    return HINT_XP_DISCOUNTED;
  }
  return HINT_XP_COST;
}

/* ── Render hint button HTML (called from renderBattleQuestion) ── */
function renderHintButton() {
  const qKey       = `${activeBattle?.id}-${battleCurrentQ}`;
  const alreadyUsed = powerupEffects.some(effect => effect.type === 'hint' && Number(effect.question_index) === battleCurrentQ);
  const cost        = getHintCost();
  const canAfford   = studentXP >= cost;
  const hasDiscount = cost === HINT_XP_DISCOUNTED;

  if (alreadyUsed) {
    return `<div class="hint-used-badge">💡 Hint already used for this question</div>`;
  }
  if (battleAnswers[battleCurrentQ] !== null && battleAnswers[battleCurrentQ] !== '') return '<span class="hint-used-badge">Hint: use before answering</span>';

  return `
    <button class="btn-hint ${!canAfford ? 'hint-broke' : ''} ${hasDiscount ? 'hint-discounted' : ''}"
      onclick="requestHint()"
      ${!canAfford ? 'disabled' : ''}
      title="${canAfford ? `Use ${cost} XP for a concept hint` : 'Not enough XP'}">
      💡 Hint
      ${hasDiscount
        ? `<span class="hint-xp-cost"><s style="opacity:.5">${HINT_XP_COST}</s> ${cost} XP</span>
           <span class="hint-discount-badge">50% OFF</span>`
        : `<span class="hint-xp-cost">${cost} XP</span>`
      }
    </button>`;
}

/* ── User clicks Hint ────────────────────────────────────── */
async function requestHint() {
  if (!activeBattle || powerupBusy) return;
  const cost = getCouponForHints() ? 25 : 50;
  showConfirm('Use a hint?', `Costs ${cost} XP only when a hint is delivered.`, 'Use hint', async () => {
    if (powerupBusy) return;
    powerupBusy = true;
    try {
      await powerupRequest('hint');
      renderBattleQuestion();
      showToast('?', 'Hint saved.');
    } catch (error) { showToast('!', error.message); }
    finally { powerupBusy = false; }
  });
}

function showHintCard(hintText, cost) {
    document.querySelector('.hint-card')?.remove();
    document.querySelector('.btn-hint')?.remove();
    document.querySelector('.hint-used-badge')?.remove();

    const card = document.createElement('div');
    card.className = 'hint-card';

    card.innerHTML = `
        <div class="hint-card-header">
            <span class="hint-card-icon">💡</span>
            <span class="hint-card-title">Concept Hint</span>
            <span class="hint-card-cost">-${cost} XP</span>
        </div>

        <div class="hint-quote">
            <span class="hint-quote-mark">“</span>
            <span class="hint-card-text"></span>
            <span class="hint-quote-mark hint-quote-close">”</span>
        </div>
    `;

    // Safely insert AI-generated text
    card.querySelector('.hint-card-text').textContent = hintText;

    /*
     * Identification questions use:
     * .identification-answer-box
     *
     * Multiple-choice questions use:
     * .bq-options
     */
    const target =
        document.querySelector('.identification-answer-box') ||
        document.querySelector('.bq-options') ||
        document.querySelector('.battle-question');

    if (target) {
        target.insertAdjacentElement('afterend', card);
    } else {
        console.error('Hint card: could not find insertion target.');
        return;
    }

    // Add "Hint used" badge near the quiz navigation
    const nav =
        document.querySelector('.battle-actions') ||
        document.querySelector('.battle-action-row');

    if (nav) {
        const badge = document.createElement('div');

        badge.className = 'hint-used-badge';
        badge.textContent = '💡 Hint used';

        nav.insertAdjacentElement('beforebegin', badge);
    }
}
