/* Review only the selected quiz and its saved grading decisions. */
let explainerRequest=null;
async function openAnswerExplainer(quizId, answers) {
  const quiz=[...formalQuizzes,...informalQuizzes,...completedFormal,...completedInformal].find(q=>String(q.id)===String(quizId));
  if (!quiz || myResults[quizId]?.status==='pending_review') { showToast('System','Explanations become available after grading.'); return; }
  const wrong=answers.map((answer,index)=>({...answer,index:Number(answer.questionIndex ?? index)})).filter(a=>a.correct===false);
  if (!wrong.length) { showToast('System','No graded mistakes to review.'); return; }
  explainerRequest?.abort();
  const controller=new AbortController(); explainerRequest=controller;
  const escape=value=>{const node=document.createElement('span');node.textContent=String(value ?? '');return node.innerHTML;};
  document.getElementById('battle-title').textContent='Answer review';
  document.getElementById('battle-body').innerHTML=`<section class="expl-review"><div class="expl-header-row"><div class="expl-meta"><span class="expl-subject">${escape(quiz.subject)}</span><span class="expl-count">${wrong.length} answer${wrong.length===1?'':'s'} to review</span></div></div><div class="expl-toolbar"><button class="btn-secondary" id="expl-back">Back to result</button></div><div class="expl-cards-list">${wrong.map(item=>{
    const question=quiz.questions[item.index] || {};
    const choice=(question.choices || question.opts || [])[item.answer];
    const answer=item.answer===null || item.answer==='' ? 'No answer saved' : question.type==='id' ? item.answer : choice ?? item.answer;
    return `<article class="expl-card"><div class="expl-card-header"><span class="expl-q-num">Q${item.index+1}</span><span class="expl-wrong-badge">Your answer: ${escape(answer)}</span></div><div class="expl-question">${escape(item.question || question.text || question.q)}</div><div class="expl-correct-row" id="expl-correct-${item.index}" hidden></div><div class="expl-body" id="expl-body-${item.index}" role="status">Preparing your explanation...</div></article>`;
  }).join('')}</div><p class="expl-note">AI explanations support your review. Ask your instructor if something seems incorrect.</p></section>`;
  document.getElementById('expl-back').onclick=()=>{controller.abort();viewResult(quizId);};
  const exportButton=document.createElement('button');exportButton.className='btn-secondary';exportButton.textContent='Export review (.docx)';exportButton.onclick=()=>exportQuizReviewer(Number(quizId),exportButton);document.querySelector('.expl-toolbar').append(exportButton);
  for (const item of wrong) {
    if (controller.signal.aborted || !document.getElementById('modal-battle').classList.contains('open')) break;
    const body=document.getElementById(`expl-body-${item.index}`);
    const correct=document.getElementById(`expl-correct-${item.index}`);
    if (!body) break;
    const load=async(refresh=false)=>{
      body.textContent='Generating explanation...';
      try {
        const response=await fetch('../assets/php/explain_answer.php',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({quiz_id:Number(quizId),question_index:item.index,refresh})});
        const data=await response.json();
        if (!response.ok || !data.success) {const error=new Error(data.message || 'Explanation unavailable.');error.status=response.status;throw error;}
        correct.hidden=true;
        if (data.correct_answer) {correct.hidden=false;correct.textContent='Correct answer: '+data.correct_answer;}
        const text=document.createElement('p');text.className='expl-text';text.textContent=data.explanation;const saved=document.createElement('small');saved.className='expl-note';saved.textContent=data.outdated ? 'Results have changed. This older saved explanation is available for reference; regenerate to update it.' : data.cached ? 'Saved explanation - reused without a new AI request.' : 'Explanation saved for your next visit.';body.replaceChildren(text,saved);const regenerate=document.createElement('button');regenerate.className='btn-secondary';const remaining=Math.max(0,3-Number(data.generations||0));regenerate.textContent='Regenerate explanation';regenerate.disabled=Boolean(data.limit_reached)||remaining===0;regenerate.onclick=()=>load(true);const actions=document.createElement('div');actions.className='expl-regenerate-actions';const count=document.createElement('span');count.className='expl-attempt-count';count.textContent=regenerate.disabled?'No attempts remaining':`${remaining} ${remaining===1?'attempt':'attempts'} remaining`;actions.append(regenerate,count);body.append(actions);
      } catch(error) {
        if (error.name==='AbortError') return;
        const text=document.createElement('p');text.className='expl-error';text.textContent=error.message;
        const retry=document.createElement('button');retry.className='btn-secondary';retry.textContent='Retry explanation';retry.onclick=()=>load(false);retry.disabled=error.status===429;body.replaceChildren(text,retry);
      }
    };
    await load();
  }
}
