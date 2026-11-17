let powerupEffects = [];
let powerupBusy = false;

function applyPowerupState(state) {
  studentXP = Number(state.xp);
  studentLifetimeXP = Number(state.lifetime_xp);
  studentQuizXP = Number(state.earned_xp) || 0;
  coupons = state.grants.map(grant => {
    const reward = LEVELS.find(level => level.level === Number(grant.level))?.reward;
    return reward ? { ...reward, remaining: Number(grant.remaining), permanent: Number(grant.permanent) === 1 } : null;
  }).filter(Boolean);
  if (studentProfile) {
    studentProfile.xp = studentXP;
    studentProfile.streak = Number(state.streak);
  }
  const streakHost=document.getElementById('weekly-streak-reward');
  if(streakHost){streakHost.replaceChildren();const title=document.createElement('h3');title.textContent='Seven-day study reward';const copy=document.createElement('p');copy.textContent=`${state.streak} / 7 days. Submit a quiz each day to earn 100 XP. Each new cycle starts at day 1; a missed day resets progress unless a freeze applies.`;const claim=document.createElement('button');claim.className='btn-secondary';const ready=state.grants.some(g=>g.type==='weekly_streak'&&Number(g.remaining)>0);claim.textContent=ready?'Claim 100 XP':'Complete 7 days to claim';claim.disabled=!ready;claim.onclick=async()=>{claim.disabled=true;try{await powerupRequest('claim_streak');renderXP();showToast('Reward','100 streak XP claimed.');}catch(e){showToast('System',e.message);claim.disabled=false;}};streakHost.append(title,copy,claim);}
  checkLevelUp(studentLifetimeXP);
  updateXPDisplay();
  applyProfileFrame();
}

async function powerupRequest(action, extra = {}) {
  const response = await fetch('../assets/php/powerups.php', {
    method: action ? 'POST' : 'GET', credentials: 'include', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    ...(action ? { body: JSON.stringify({ action, session_token: typeof quizSession !== 'undefined' ? quizSession?.session_token : null, quiz_id: activeBattle?.id, question_index: battleCurrentQ, ...extra }) } : {})
  });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || 'Unable to save power-up changes.');
  applyPowerupState(data.state);
  if (data.effects) powerupEffects = data.effects;
  return data;
}

function restorePowerupEffects() {
  if (!activeBattle) return;
  for (const effect of powerupEffects) {
    if (Number(effect.question_index) !== battleCurrentQ) continue;
    const payload = JSON.parse(effect.payload);
    if (effect.type === 'fifty_fifty') {
      for (const i of payload.hidden) {
        const option = document.getElementById(`opt-${i}`);
        if (option) { option.disabled = true; option.classList.add('ff-eliminated'); }
      }
    }
    if (effect.type === 'hint') showHintCard(payload.hint, Number(effect.xp_cost));
  }
}

async function chooseGradeBoost(useFree = false) {
  try {
    const response = await fetch('../assets/php/get_grade_boosts.php', { credentials: 'include', cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Could not load quiz results.');
    if (!data.enabled) throw new Error('Grade boosts are disabled by the administrator.');
    if (!data.eligible.length) throw new Error('No eligible results. Complete a formal quiz and wait for grading; perfect or already boosted results cannot be boosted.');
    document.getElementById('powerup-grade-dialog')?.remove();
    const dialog = document.createElement('dialog');
    dialog.id = 'powerup-grade-dialog';
    dialog.className = 'powerup-grade-dialog';
    const heading = document.createElement('h2');
    heading.textContent = useFree ? 'Use a free grade boost' : 'Redeem 350 XP';
    dialog.append(heading);
    const description = document.createElement('p');
    description.textContent = 'Choose one graded formal quiz. Adds 1 percentage point, up to 100%.';
    dialog.append(description);dialog.setAttribute('aria-labelledby','grade-boost-title');heading.id='grade-boost-title';
    const choices=document.createElement('div');choices.className='grade-boost-choices';dialog.append(choices);
    const confirm=document.createElement('button');confirm.className='btn-primary';confirm.textContent=useFree?'Apply free boost':'Confirm - spend 350 XP';confirm.disabled=true;

    for (const item of data.eligible) {
      const button = document.createElement('button');
      button.className = 'btn-secondary';
      button.textContent = `${item.name}: ${item.current}% → ${item.boosted}%`;
      const redeem = async () => {
        for (const b of dialog.querySelectorAll('button')) b.disabled = true;
        try {
          const res = await fetch('../assets/php/redeem_grade_boost.php', {
            method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: item.submission_id, use_free_token: useFree })
          });
          const result = await res.json();
          if (!res.ok || !result.success) throw new Error(result.message || 'Boost failed.');
          dialog.close(); dialog.remove();
          await loadStudentXP(); await loadDatabaseSubmissions(); rebuildStudentData(); renderXP(); renderPowerupsTab();
          showToast('✓', 'Grade boost saved.');
        } catch (error) {
          showToast('!', error.message);
          for (const b of dialog.querySelectorAll('button')) b.disabled = false;
        }
      };
      button.className='grade-boost-choice';button.setAttribute('aria-pressed','false');
      button.replaceChildren();const name=document.createElement('strong');name.textContent=item.name;const score=document.createElement('span');score.textContent=`${item.current}% -> ${item.boosted}%`;button.append(name,score);
      button.onclick=()=>{choices.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed','false'));button.setAttribute('aria-pressed','true');confirm.disabled=false;confirm.onclick=redeem;};choices.append(button);
    }
    const close = document.createElement('button');
    close.className = 'btn-secondary'; close.textContent = 'Cancel';
    close.onclick = () => { dialog.close(); dialog.remove(); };
    const footer=document.createElement('div');footer.className='grade-boost-actions';footer.append(close,confirm);dialog.append(footer);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
  } catch (error) { showToast('!', error.message); }
}
