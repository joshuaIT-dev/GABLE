var studentSemesterXP = 0;
var studentXP = 0;

const sdashText = (id, value) => { const node = document.getElementById(id); if (node) node.textContent = value ?? ''; };
const sdashGet = async file => { const response = await fetch(`../assets/php/${file}`, {credentials:'include',cache:'no-store'}); const data = await response.json(); if (!response.ok || !data.success) { const error = new Error(data.message || `Could not load ${file}.`); error.status = response.status; throw error; } return data; };

async function loadStudentDashboard() {
  const status = document.getElementById('sdash-status');
  try {
    const [profileResult, xpResult, submissionResult, quizResult] = await Promise.allSettled([
      sdashGet('get_student.php'), sdashGet('studentXP.php'),
      sdashGet('student_submissions.php'), sdashGet('get_student_Quizzes.php')
    ]);
    if (profileResult.status === 'rejected') throw profileResult.reason;
    if (xpResult.status === 'rejected') throw xpResult.reason;
    const profileData = profileResult.value;
    const xpData = xpResult.value;
    const submissionData = submissionResult.status === 'fulfilled' ? submissionResult.value : {submissions:[]};
    const quizData = quizResult.status === 'fulfilled' ? quizResult.value : {quizzes:[]};
    const student = profileData.student;
    renderStudentSubjects(student.subjects || []);
    const name = [student.first_name, student.last_name].filter(Boolean).join(' ');
    studentSemesterXP = Number(xpData.semester_xp) || Number(xpData.earned_xp) || 0;
    studentXP = Number(xpData.xp) || 0;
    coupons = (xpData.grants || []).map(g => ({type:g.type,remaining:Number(g.remaining)||0,permanent:Number(g.permanent)===1}));
    const level = getLevelForXP(studentSemesterXP);
    const next = LEVELS.find(item => item.level === level.level + 1);
    const progress = next ? Math.max(0,Math.min(100,Math.round((studentSemesterXP-level.xpRequired)/(next.xpRequired-level.xpRequired)*100))) : 100;
    const submissions = submissionData.submissions || [];
    const scored = submissions.filter(s => s.score !== null && s.score !== '' && ['submitted','graded'].includes(String(s.status).toLowerCase()));
    const accuracy = scored.length ? Math.round(scored.reduce((sum,s)=>sum+(Number(s.score)||0),0)/scored.length) : null;
    const quizzes = new Map((quizData.quizzes||[]).map(q=>[String(q.quiz_id),q]));
    const recent = submissions.slice().sort((a,b)=>new Date(b.submittedAt)-new Date(a.submittedAt)).slice(0,5);

    sdashText('sdash-name', name || 'Student');
    sdashText('sdash-id', `Student No. ${student.student_number || ''}`);
    sdashText('sdash-avatar', name.split(/\s+/).filter(Boolean).map(part=>part[0]).join('').slice(0,2).toUpperCase());
    sdashText('sdash-program', student.program || 'Program not assigned');
    sdashText('sdash-year', student.year_level ? `Year ${student.year_level}` : 'Year not assigned');
    sdashText('sdash-section', student.block ? `Section ${student.program} ${student.year_level}${student.block}` : 'Section not assigned');
    sdashText('sdash-college', student.college || 'Not assigned');
    sdashText('sdash-program-full', student.program || 'Not assigned');
    sdashText('sdash-year-full', student.year_level || 'Not assigned');
    sdashText('sdash-section-full', student.block || 'Not assigned');
    sdashText('sdash-xp', studentSemesterXP.toLocaleString());
    sdashText('sdash-level', `Level ${level.level} · ${level.name}`);
    sdashText('sdash-next-level', next ? `${(next.xpRequired-studentSemesterXP).toLocaleString()} XP to ${next.name}` : 'Max level');
    sdashText('sdash-xp-note', next ? `${studentSemesterXP.toLocaleString()} / ${next.xpRequired.toLocaleString()} semester XP` : 'You reached the highest level.');
    document.getElementById('sdash-xp-fill').style.width = `${progress}%`;
    sdashText('sdash-accuracy', accuracy === null ? '—' : `${accuracy}%`);
    sdashText('sdash-submissions', submissions.length);
    sdashText('sdash-balance', `${studentXP.toLocaleString()} XP`);
    sdashText('sdash-reward-count', LEVELS.filter(item=>item.level<=level.level&&item.reward).length);
    applyProfileFrame();
    renderProfileFrameCollection('sdash-frames');
    renderProfileRewards('sdash-reward-list');
    renderRecent(recent,quizzes);
    status.hidden=true;
    document.getElementById('sdash-content').hidden=false;
    if(window.lucide)lucide.createIcons();
  } catch(error) {
    status.replaceChildren(document.createTextNode(error.status === 401 ? 'Your student session could not be confirmed. ' : `${error.message} `));
    if(error.status === 401) { const login=document.createElement('a');login.href='Login.html';login.textContent='Sign in again';login.className='sdash-login-link';status.append(login); }
    status.classList.add('error');
  }
}

function renderRecent(items,quizzes) {
  const host=document.getElementById('sdash-recent');host.replaceChildren();
  if(!items.length){host.innerHTML='<p class="sdash-empty">No quiz submissions yet. Your completed work will appear here.</p>';return;}
  items.forEach(item=>{
    const quiz=quizzes.get(String(item.quizId));const row=document.createElement('article');row.className='sdash-result';
    const copy=document.createElement('div');copy.className='sdash-result-copy';const title=document.createElement('strong');title.textContent=quiz?.title||quiz?.quiz_title||'Quiz';const date=document.createElement('small');date.textContent=item.submittedAt?new Date(item.submittedAt).toLocaleDateString():'Submitted';copy.append(title,date);
    const score=document.createElement('span');score.className='sdash-result-score';score.textContent=item.score===null?'Pending':`${Math.round(Number(item.score)||0)}%`;row.append(copy,score);host.append(row);
  });
}

document.addEventListener('DOMContentLoaded',loadStudentDashboard);
