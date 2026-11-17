let quizSession = null;
let quizClock = null;
let quizOpening = false;
let quizSubmitting = false;
let quizSaving = null;
let quizSaveTimer = null;
function startQuizClock(attempt) {
  clearInterval(quizClock);
  quizSession = {...attempt, endsAt: Date.now() + (attempt.deadline-attempt.server_time)*1000, expired:false};
  quizClock = setInterval(updateQuizClock, 250);
  updateQuizClock();
}
function updateQuizClock() {
  if (!quizSession) return;
  const seconds = Math.max(0,Math.ceil((quizSession.endsAt-Date.now())/1000));
  const timer = document.getElementById('quiz-countdown');
  if (timer) { timer.textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; timer.classList.toggle('urgent',seconds<=60); }
  if (!seconds && !quizSession.expired && !quizSubmitting && !powerupBusy) {
    quizSession.expired=true;
    clearInterval(quizClock);
    document.querySelectorAll('#battle-body button, #battle-body textarea').forEach(el=>el.disabled=true);
    showToast('System','Time is up. Submitting your saved answers.');
    finishBattle();
  }
}
function saveQuizDraft() {
  clearTimeout(quizSaveTimer);
  if (!quizSession || quizSession.expired || activeBattle?.questions[battleCurrentQ]?.type!=='id') return Promise.resolve();
  const answer=battleAnswers[battleCurrentQ] || '';
  quizSaving=powerupRequest('answer',{answer}).finally(()=>{quizSaving=null;});
  return quizSaving;
}
function scheduleQuizDraft() {
  clearTimeout(quizSaveTimer);
  quizSaveTimer=setTimeout(()=>saveQuizDraft().catch(error=>showToast('!',error.message)),600);
}
function requestQuizClose() {
  if (!quizSession) { document.getElementById('modal-battle').classList.remove('open'); showSB(); return; }
  if (quizSubmitting || powerupBusy) { showToast('System','Please wait for the current action to finish.'); return; }
  const remaining=3-quizSession.open_count;
  showConfirm('Leave this quiz?', remaining ? `Your timer keeps running. You have ${remaining} opening${remaining===1?'':'s'} left.` : 'This is your third opening. Closing now prevents you from reopening this quiz.', 'Leave quiz', async()=>{
    if (!quizSession || quizSubmitting) return;
    try {
      if (quizSaving) await quizSaving;
      await saveQuizDraft();
      await powerupRequest('close');
      clearInterval(quizClock); quizSession=null;
      document.getElementById('modal-battle').classList.remove('open');
      showSB();
    } catch(error) { showToast('!',error.message); }
  });
}
