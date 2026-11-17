
/* ═══════════════════════════════════════════════════════════
   fiftyfifty.js  —  50/50 Lifeline
   Eliminates 2 wrong answer choices from a multiple-choice
   question, leaving the student's view down to 2 options.

   Replaces the old Time Buffer Token (removed — its countdown
   could be reset infinitely by closing/reopening the quiz
   modal, making it exploitable).

   Requires: levelup.js (coupons, showToast)
             student.js (activeBattle, battleCurrentQ)

   HOW TO USE:
   1. Add to Student.html BEFORE </body>, replacing the old
      timebuffer.js script tag:
      <script src="../assets/js/student/fiftyfifty.js"></script>
      (must come AFTER levelup.js)

   2. renderBattleQuestion() in student.js already calls
      renderFiftyFiftyButton() in the battle-nav row (same
      spot the Time Buffer button used to occupy).
═══════════════════════════════════════════════════════════ */

/* Track which questions already had 50/50 used this session,
   keyed by `${quizId}-${questionIndex}` */
const fiftyFiftyUsed = {};

/* ── Render the 50/50 button HTML (called from renderBattleQuestion) ── */
function renderFiftyFiftyButton() {
    if (!activeBattle) return '';
    const question = activeBattle.questions[battleCurrentQ];
    const coupon = typeof coupons !== 'undefined' ? coupons.find(c => c.type === 'fifty_fifty' && c.remaining > 0) : null;
    let reason = '';
    if (!question || question.type === 'id' || (question.choices || question.opts || []).length !== 4) reason = 'Available on four-choice questions only.';
    else if (powerupEffects.some(effect => effect.type === 'fifty_fifty' && Number(effect.question_index) === battleCurrentQ)) reason = 'Already used on this question.';
    else if (battleAnswers[battleCurrentQ] !== null && battleAnswers[battleCurrentQ] !== '') reason = 'Use before selecting an answer.';
    else if (!coupon) reason = 'No uses available. Earn this power-up in XP & Rewards.';
    return `<details class="powerup-tool" onpointerenter="if(event.pointerType === 'mouse') this.open = true" onpointerleave="if(event.pointerType === 'mouse' &amp;&amp; !this.matches(':focus-within')) this.open = false">
      <summary aria-label="50/50 power-up: show details"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.1 8.1 12.9 12.9M8.1 15.9 21 3"/></svg></summary>
      <div class="powerup-tooltip"><strong>50/50</strong><p>Remove two wrong choices.</p><p>${reason || `${Number(coupon.remaining)} uses available.`}</p>
      <button class="btn-start" id="fifty-fifty-btn" onclick="useFiftyFifty()" ${reason ? 'disabled' : ''}>Use 50/50</button></div>
    </details>`;
}

/* ── User clicks 50/50 ───────────────────────────────────── */
async function useFiftyFifty() {
  if (!activeBattle || powerupBusy) return;
  powerupBusy = true;
  try {
    await powerupRequest('fifty_fifty');
    renderBattleQuestion();
    showToast('?', 'Two wrong choices removed. Usage saved.');
  } catch (error) { showToast('!', error.message); }
  finally { powerupBusy = false; }
}
