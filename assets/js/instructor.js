/* ═══════════════════════════════════════════════════════════════
   instructor.js — Instructor dashboard data & rendering
   Depends on: main.js  (showToast, showConfirm, closeConfirm,
                          openModal, closeModal, navigateTo, logout)
   ═══════════════════════════════════════════════════════════════ */


/* ── DATA STORE ─────────────────────────────────────────────────
   Replace with PHP/MySQL fetch calls later.
   ────────────────────────────────────────────────────────────── */


let quizzes = [];

let drafts = [];

const students = [];

let instructorAssignments = [];

let instructorQuizEvaluations = [];

const avatarColors = ['#7c5cbf', '#e05ca0', '#4f8ef7', '#f97316', '#4ade80', '#f59e0b', '#a57fe0', '#f47fc4'];
let currentFilter = 'All';
let eqCount = 0;
let teachingXP = 0;
let instrLbSection = 'All';

/* ── SHARED: FLAGGED QUESTIONS ───────────────────────────────
   Student → flags a question during a quiz battle.
   Instructor → sees it here, can resolve or edit.
   Admin → sees unresolved flags in their flagged quizzes panel.
   Replace with a shared DB table later (flags table).
   ──────────────────────────────────────────────────────────── */
let flaggedQuestions = [];

/* ── SHARED: NOTIFICATIONS ────────────────────────────────────
   Populated from: student flags, student submissions,
   admin announcements, grade boost redemptions, etc.
   ──────────────────────────────────────────────────────────── */
let notifications = [];


/* =========================================================
   INSTRUCTOR PROFILE LOADER
   Fetches the logged-in instructor's data from get_instructor.php
   (PHP session based) and fills in the navbar badge + profile modal.
========================================================== */

// Matches the convention already used in instructor.js
// (loadInstructorAnnouncements fetches '../assets/php/get_instructor_announcements.php')
const PROFILE_API_URL = "../assets/php/get_instructor.php";

// Cached instructor record so other scripts (instructor.js, etc.)
// can read it without re-fetching: window.currentInstructor
window.currentInstructor = null;

document.addEventListener("DOMContentLoaded", loadInstructorProfile);

async function loadInstructorProfile() {
    try {
        const res = await fetch(PROFILE_API_URL, {
            method: "GET",
            credentials: "same-origin" // sends the PHP session cookie
        });

        // Not logged in -> bounce to login page
        if (res.status === 401) {
            window.location.href = "Login.html";
            return;
        }

        const data = await res.json();

        if (!data.success) {
            console.error("Failed to load instructor profile:", data.message);
            showProfileError(data.message || "Could not load profile.");
            return;
        }

        window.currentInstructor = data.instructor;
        renderInstructorProfile(data.instructor);

    } catch (err) {
        console.error("Error fetching instructor profile:", err);
        showProfileError("Could not reach the server.");
    }

    
    }

function renderInstructorProfile(instructor) {

    const firstName = instructor.first_name || "";
    const lastName  = instructor.last_name || "";
    const fullName  = `${firstName} ${lastName}`.trim() || "Instructor";
    const initials  = getInitials(firstName, lastName);

    // ---- NAVBAR BADGE ----
    const navAvatar = document.getElementById("instructor-avatar");
    const navName   = document.getElementById("instructor-name");
    const navRole   = document.getElementById("instructor-role");

    if (navAvatar) navAvatar.textContent = initials;
    if (navName)   navName.textContent = fullName;
    if (navRole)   navRole.textContent = instructor.college || "Instructor";

    // ---- PROFILE MODAL: header card ----
    const modalAvatar = document.getElementById("profile-modal-avatar");
    const modalName   = document.getElementById("profile-modal-name");
    const modalFacId  = document.getElementById("profile-modal-facid");
    const modalXp     = document.getElementById("profile-modal-xp");

    if (modalAvatar) modalAvatar.textContent = initials;
    if (modalName)   modalName.textContent = fullName;

    if (modalFacId) {
        // Prefer instructor_number, fall back to institutional email
        modalFacId.textContent = instructor.instructor_number
            ? `ID: ${instructor.instructor_number}`
            : instructor.institutional_email || "";
    }
    

    // Teaching XP isn't in the `instructor` table yet, but instructor.js
    // already tracks it client-side in the `teachingXP` variable (used
    // for the navbar XP badge). Reuse it here so the modal stays in sync.
    // Once XP is persisted to the DB, swap this for instructor.teaching_xp.
    teachingXP = Number(instructor.teaching_xp) || 0;

    if (modalXp) {
        modalXp.textContent = teachingXP.toLocaleString();
    }

    updateInstructorXPProgress();

    // ---- PROFILE BADGES ----

// 1. COLLEGE BADGE
const collegeBadge = document.getElementById("profile-college-badge");

if (collegeBadge) {
    collegeBadge.textContent = getCollegeAbbreviation(instructor.college);
}

// 2. CURRENT LEVEL BADGE
const levelBadge = document.getElementById("profile-level-badge");

if (levelBadge) {
    const xp = Math.max(0, Number(teachingXP) || 0);

    const levels = [
        { xp: 0,    num: 1,  name: "Novice" },
        { xp: 500,  num: 2,  name: "Learner" },
        { xp: 1000, num: 4,  name: "Scholar" },
        { xp: 1600, num: 6,  name: "Expert" },
        { xp: 2200, num: 8,  name: "Master" },
        { xp: 3000, num: 10, name: "Legend" }
    ];

    let currentLevel = levels[0];

    levels.forEach(level => {
        if (xp >= level.xp) {
            currentLevel = level;
        }
    });

    levelBadge.textContent =
        `Level ${currentLevel.num} ${currentLevel.name}`;
}

// 3. ADMIN-ASSIGNED GRADE
const gradeBadge = document.getElementById("profile-grade-badge");

if (gradeBadge) {
    gradeBadge.textContent = instructor.grade || '--';
    gradeBadge.dataset.rank = instructor.grade || '';
    gradeBadge.classList.add('teaching-rank');
    gradeBadge.parentElement.classList.toggle('is-unranked', !instructor.grade);
    gradeBadge.parentElement.querySelector('small').textContent = instructor.grade ? 'Admin assigned' : 'Not ranked';
}

// ---- COLLEGE & PROGRAM ----
const collegeVal = document.getElementById("profile-college-val");
const programBlock = document.getElementById("profile-program-block");
const programVal = document.getElementById("profile-program-val");

if (collegeVal) {
    collegeVal.textContent = instructor.college || "—";
}

if (programVal) {
    programVal.textContent = instructor.program || "—";
}

if (programBlock) {
    programBlock.style.display = "";
}

    // ---- TEACHING ASSIGNMENTS ----
loadInstructorAssignments();
}

function getCollegeAbbreviation(college) {

    if (!college) return "College";

    const value = college.trim();

    // Keep existing abbreviations
    if (value.length <= 8) {
        return value.toUpperCase();
    }

    // Convert full college names into abbreviations
    const ignoredWords = ["of", "and", "the"];

    const abbreviation = value
        .split(/\s+/)
        .filter(word =>
            !ignoredWords.includes(word.toLowerCase())
        )
        .map(word => word.charAt(0).toUpperCase())
        .join("");

    return abbreviation || value;
}

function getInitials(firstName, lastName) {
    const f = (firstName || "").trim().charAt(0);
    const l = (lastName || "").trim().charAt(0);
    return (f + l).toUpperCase() || "?";
}

function showProfileError(message) {
    const modalName = document.getElementById("profile-modal-name");
    if (modalName) modalName.textContent = "Unable to load profile";

    const modalFacId = document.getElementById("profile-modal-facid");
    if (modalFacId) modalFacId.textContent = message;
}



/* ── RENDER QUIZ CARDS ──────────────────────────────────────── */
function renderQuizzes() {

    const formal = quizzes.filter(
        q =>
            q.status === 'active' &&
            q.mode === 'formal'
    );

    const informal = quizzes.filter(
        q =>
            q.status === 'active' &&
            q.mode === 'informal'
    );

    document.getElementById('formal-quiz-grid').innerHTML = formal.length ? formal.map(quizCardHTML).join('') : '<div class="empty-state"><span class="emoji">📭</span><p>No formal quizzes yet. Create one!</p></div>';
    document.getElementById('informal-quiz-grid').innerHTML = informal.length ? informal.map(quizCardHTML).join('') : '<div class="empty-state"><span class="emoji">📭</span><p>No informal quizzes yet.</p></div>';

    renderDrafts();
}

function quizCardHTML(q) {
    const typeTag = q.type === 'Team Battle' ? `<span class="tag tag-team">⚔ Team Battle</span>` :
        q.type === 'Solo' ? `<span class="tag tag-solo">👤 Solo</span>` :
        q.type === 'Battle Royale' ? `<span class="tag tag-team">👑 Battle Royale</span>` :
        `<span class="tag tag-hw">${q.type}</span>`;
    // Count question types
    const mcCount = q.questions.filter(x => x.type === 'mc').length;
    const idCount = q.questions.filter(x => x.type === 'id').length;
    const qTypeSummary = [
        mcCount ? `${mcCount} Multiple Choice` : '',
        idCount ? `${idCount} Identification` : ''
    ].filter(Boolean).join(' &bull; ');

    return `
    <div class="quiz-card ${q.type === 'Solo' ? 'solo' : ''}">
      <div class="quiz-card-top-row">
        <div class="quiz-tags"><span class="tag tag-active">Active</span>${typeTag}<span class="tag tag-subject">${q.subject}</span></div>
        <span class="quiz-card-icon">${q.icon}</span>
      </div>
      <h3>${q.title}</h3>
      <div class="quiz-meta">${q.section} &bull; ${quizTimingText(q)}</div>
      <div class="quiz-xp-row">
        <span class="qxp-label">Max XP</span>
        <span class="qxp-val">+${q.xpReward} XP</span>
      </div>
      <div class="quiz-qtypes">${qTypeSummary}</div>
      <div class="stats-row">
        <div class="stat-box"><span class="val">${q.stats.completed}</span><span class="lbl">Completed</span></div>
        <div class="stat-box"><span class="val val-yellow">${q.stats.inProgress}</span><span class="lbl">In Progress</span></div>
        <div class="stat-box"><span class="val val-green">${q.stats.avgScore}%</span><span class="lbl">Avg Score</span></div>
      </div>
      <button class="btn-secondary" onclick="openReviewerSettings(${Number(q.id)})">Reviewer release</button>
      <div class="quiz-btns three">
        <button class="btn-view"   onclick="event.stopPropagation();openResultsModal(${q.id})">View Results</button>
        <button class="btn-edit"   onclick="event.stopPropagation();openEditQuizModal(${q.id})">Edit Quiz</button>
        <button class="btn-danger" onclick="event.stopPropagation();confirmRemoveQuiz(${q.id})">Remove</button>
      </div>
    </div>`;
}

function renderDrafts() {
    const c = document.getElementById('drafts-container');
    if (!drafts.length) {
        c.innerHTML = '<div class="empty-state"><span class="emoji">📭</span><p>No draft quizzes.</p></div>';
        return;
    }
    c.innerHTML = drafts.map(d => {
        const mcCount = d.questions.filter(x => x.type === 'mc').length;
        const idCount = d.questions.filter(x => x.type === 'id').length;
        const qSummary = [mcCount ? `${mcCount} MC` : '', idCount ? `${idCount} ID` : ''].filter(Boolean).join(', ');
        return `
    <div class="draft-card" id="draft-${d.id}">
      <div class="draft-icon">📋</div>
      <div class="draft-info">
        <h4>${d.title}</h4>
        <p>${d.subject} &bull; ${d.questions.length} questions (${qSummary}) &bull; Max XP: ${d.xpReward || '—'}</p>
      </div>
      <div class="draft-btns">
        <button class="btn-continue"   onclick="openEditDraftModal('${d.id}')">Continue Editing</button>
        <button class="btn-post-draft" onclick="confirmPostDraft('${d.id}')">Post Quiz</button>
        <button class="btn-delete"     onclick="confirmRemoveDraft('${d.id}')">Delete Draft</button>
      </div>
    </div>`;
    }).join('');
}


/* ── NOTIFICATIONS ──────────────────────────────────────────── */
function renderNotifications() {

    const unread = notifications.filter(n => !n.read).length;

    const badge = document.getElementById('notif-badge');

    if (badge) {
        badge.textContent = unread;
        badge.classList.toggle('hidden', unread === 0);
    }

    const iconMap = {
        flag: '🚩',
        boost: '⭐',
        submit: '📝',
        announce: '📢'
    };

    const classMap = {
        flag: 'ni-flag',
        boost: 'ni-boost',
        submit: 'ni-submit',
        announce: 'ni-announce'
    };

    const list = document.getElementById('notif-list');

    if (!list) return;

    list.innerHTML = notifications.length
        ? notifications
            .slice()
            .sort((a, b) => b.time - a.time)
            .map(n => `
                <div 
                    class="notif-item ${n.read ? '' : 'unread'} priority-${(n.priority || 'Normal').toLowerCase()}"
                    onclick="openNotif('${n.id}')"
                >
                    <div class="notif-icon-wrap ${classMap[n.type] || 'ni-announce'}">
                        ${iconMap[n.type] || '🔔'}
                    </div>

                    <div class="notif-body">
                        <div class="notif-title-text">
                            ${n.title}
                        </div>

                        <div class="notif-desc">
                            ${['final_opening','syllabus_alignment'].includes(n.type) ? escapeHtml(n.desc) : n.desc}
                        </div>

                        <span class="notif-time">
                            ${['final_opening','syllabus_alignment'].includes(n.type) ? 'System &middot; Automated notice &middot; ' : ''}${timeAgoInstr(n.time)}
                        </span>
                    </div>

                    <div class="notif-dot"></div>
                </div>
            `)
            .join('')
        : `
            <div class="notif-empty">
                <div class="notif-empty-icon">🔔</div>
                No notifications yet.
            </div>
        `;
}

function timeAgoInstr(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

window.toggleNotifDropdown = function () {
    document.getElementById('notif-dropdown')?.classList.toggle('open');
};

document.addEventListener('click', e => {
    if (!e.target.closest('#notif-bell-wrap')) {
        document.getElementById('notif-dropdown')?.classList.remove('open');
    }
});

function markAllNotifsRead() {
    notifications.forEach(n => n.read = true);
    renderNotifications();
    showToast('✅', 'All notifications marked as read.');
}

function openNotif(id) {
    const record=notifications.find(x=>x.id===id);
    if (['final_opening','syllabus_alignment'].includes(record?.type)) fetch('../assets/php/get_instructor_notifications.php',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({notification_id:id})}).catch(()=>showToast('!', 'Could not save notification read status.'));
    const n = notifications.find(x => x.id === id);
    if (!n) return;
    n.read = true;
    renderNotifications();

    if(n.type==='syllabus_alignment'){document.getElementById('notif-dropdown')?.classList.remove('open');document.getElementById(n.quizId?'nav-quiz-alignment':'nav-syllabi')?.click();}
    if (n.type === 'flag') {
        document.getElementById('notif-dropdown')?.classList.remove('open');
        switchTab('flagged');
    }
}

function addInstructorAnnouncement(announcement) {

    notifications.unshift({
        id: announcement.id,
        type: 'announce',
        title: announcement.title,
        desc: announcement.body,
        priority: announcement.priority,
        time: announcement.time,
        read: false
    });

    renderNotifications();
}

async function loadInstructorAnnouncements() {

  try{
    const response = await fetch('../assets/php/get_instructor_announcements.php');
    
    if(!response.ok){
      throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await parseApiResponse(response);

  if(!result.success){
    console.error('Failed to load announcements:', result.message);
    return;
  }

  notifications = [...notifications.filter(n => n.type !== 'announce'), ...result.notifications];

  renderNotifications();

  console.log('Instructor announcements loaded successfully.', result.notifications);
} catch(error){
  console.error('Error fetching instructor announcements:', error);
  }
}

async function loadInstructorQuizNotifications() {

    try {

        const response =

            await fetch(

                '../assets/php/get_instructor_notifications.php',

                {

                    method:
                        'GET',

                    credentials:
                        'same-origin',

                    cache:
                        'no-store'

                }

            );


        const result =
            await parseApiResponse(
                response
            );


        if (

            !response.ok

            ||

            !result.success

        ) {

            throw new Error(

                result.message ||

                'Failed to load notifications.'

            );

        }


        /*
        |--------------------------------------------------------------------------
        | REMOVE OLD DATABASE SUBMISSION NOTIFICATIONS
        |
        | This prevents duplicates when the function
        | is called again.
        |--------------------------------------------------------------------------
        */

        notifications =
            notifications.filter(

                notification =>

                    !['submit','final_opening','syllabus_alignment'].includes(notification.type)

            );


        /*
        |--------------------------------------------------------------------------
        | ADD DATABASE NOTIFICATIONS
        |--------------------------------------------------------------------------
        */

        notifications.push(

            ...(
                result.notifications || []
            )

        );


        /*
        |--------------------------------------------------------------------------
        | UPDATE NOTIFICATION UI
        |--------------------------------------------------------------------------
        */

        renderNotifications();


        console.log(

            'Instructor quiz notifications loaded:',

            result.notifications

        );


    } catch (error) {

        console.error(

            'Failed to load instructor quiz notifications:',

            error

        );

    }

}

async function loadInstructorFlags() {

    try {

        console.log('Loading flagged questions from database...');


        const response = await fetch(
            '../assets/php/get_instructor_flags.php',
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            }
        );


        const result =
            await parseApiResponse(response);


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                'Failed to load flagged questions.'
            );

        }


        /*
        |--------------------------------------------------------------------------
        | REPLACE LOCAL FLAGS WITH DATABASE FLAGS
        |--------------------------------------------------------------------------
        */

        flaggedQuestions =
            result.flags || [];


        console.log(
            'Flagged questions loaded:',
            flaggedQuestions
        );


        /*
        |--------------------------------------------------------------------------
        | UPDATE FLAGGED QUESTION UI
        |--------------------------------------------------------------------------
        */

        renderFlaggedQuestions();

        renderFlaggedFullTab();


    } catch (error) {

        console.error(
            'Error loading flagged questions:',
            error
        );

    }

}

/* ── FLAGGED QUESTIONS ──────────────────────────────────────── */
let flagStatusFilter = 'pending';

function flagCardHTML(f) {
    const quiz = quizzes.find(q => q.id === f.quizId);
    const qText = quiz?.questions?.[f.questionIndex]?.text || '(question not found)';
    const resolved = f.status === 'resolved';
    return `
    <div class="flagged-card ${resolved ? 'flagged-card-resolved' : ''}">
      <div class="flagged-icon">${resolved ? '✅' : '⚠️'}</div>
      <div class="flagged-info">
        <h4>${quiz ? quiz.title : 'Unknown Quiz'} — Q${f.questionIndex + 1}</h4>
        <p>"${qText}"</p>
        <p style="margin-top:.3rem;color:rgba(255,255,255,.55)">Flagged by <strong>${f.studentName}</strong> (${f.studentSection}): "${f.reason}"</p>
        <span class="flagged-time">${timeAgoInstr(f.time)}</span>
      </div>
      <div class="flagged-btns">
        <button class="btn-sm btn-sm-view" onclick="openFlagDetail('${f.id}')">Review</button>
        ${resolved
          ? '<span class="status-badge sb-active">Resolved</span>'
          : `<button class="btn-sm btn-sm-ok" onclick="resolveFlag('${f.id}')">Resolve</button><span class="status-badge sb-flagged">1 flag</span>`
        }
      </div>
    </div>`;
}

/* Quick-view preview shown inside Quiz Management (max 2 items) */
function renderFlaggedQuestions() {
  const pending = flaggedQuestions.filter(f => f.status === 'pending');
  const titleEl = document.getElementById('flagged-section-title');
  const previewEl = document.getElementById('flagged-questions-preview');
  if (!titleEl || !previewEl) return;

  if (!pending.length) {
    titleEl.style.display = 'none';
    previewEl.innerHTML = '';
  } else {
    titleEl.style.display = 'flex';
    const shown = pending.slice(0, 2);
    previewEl.innerHTML = shown.map(flagCardHTML).join('')
      + (pending.length > 2 ? `<div class="flagged-more-note">+ ${pending.length - 2} more flagged question${pending.length - 2 > 1 ? 's' : ''} — <a onclick="switchTab('flagged')">view all</a></div>` : '');
  }

  // update nav badge
  const navBadge = document.getElementById('flagged-nav-badge');
  if (navBadge) {
    if (pending.length) {
      navBadge.textContent = pending.length;
      navBadge.style.display = 'inline-flex';
    } else {
      navBadge.style.display = 'none';
    }
  }
}

/* Full tab view with status filter */
function setFlagStatusFilter(status, btn) {
  flagStatusFilter = status;
  document.querySelectorAll('.flag-status-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderFlaggedFullTab();
}

function renderFlaggedFullTab() {
  const pendingCount  = flaggedQuestions.filter(f => f.status === 'pending').length;
  const resolvedCount = flaggedQuestions.filter(f => f.status === 'resolved').length;

  const pEl = document.getElementById('flag-count-pending');
  const rEl = document.getElementById('flag-count-resolved');
  if (pEl) pEl.textContent = pendingCount;
  if (rEl) rEl.textContent = resolvedCount;

  let list = flaggedQuestions;
  if (flagStatusFilter === 'pending')  list = list.filter(f => f.status === 'pending');
  if (flagStatusFilter === 'resolved') list = list.filter(f => f.status === 'resolved');

  const container = document.getElementById('flagged-questions-full');
  if (!container) return;

  container.innerHTML = list.length
    ? list.slice().sort((a, b) => b.time - a.time).map(flagCardHTML).join('')
    : `<div class="empty-state instructor-empty-state" role="status"><span class="emoji">✅</span><p>No ${flagStatusFilter === 'all' ? '' : `${flagStatusFilter} `}flagged questions.</p><small class="empty-state-hint">Flagged questions will appear here when students report an issue.</small></div>`;
}

function openFlagDetail(flagId) {
  const f = flaggedQuestions.find(x => x.id === flagId);
  if (!f) return;
  const quiz = quizzes.find(q => q.id === f.quizId);
  const q    = quiz?.questions?.[f.questionIndex];

  document.getElementById('flag-detail-body').innerHTML = `
    <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:1rem;margin-bottom:1rem">
      <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:.2rem">Quiz</div>
      <div style="font-size:.92rem;font-weight:700;margin-bottom:.65rem">${quiz ? quiz.title : 'Unknown'}</div>
      <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:.2rem">Question ${f.questionIndex + 1} (${q?.type === 'mc' ? 'Multiple Choice' : 'Identification'})</div>
      <div style="font-size:.9rem;font-weight:600;margin-bottom:.5rem">${q?.text || '(question not found)'}</div>
      ${q?.type === 'mc' ? `
        <div style="font-size:.72rem;color:var(--text-muted);margin-bottom:.3rem">Choices</div>
        <div style="display:flex;flex-direction:column;gap:.3rem">
          ${q.choices.map((c, i) => `<div style="font-size:.8rem;color:rgba(255,255,255,.8)">${['A','B','C','D'][i]}. ${c} ${i === q.correct ? '<span style="color:var(--green);font-weight:700">(Correct)</span>' : ''}</div>`).join('')}
        </div>` : ''}
    </div>
    <div style="background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.25);border-radius:14px;padding:1rem">
      <div style="font-size:.72rem;color:var(--gold);font-weight:700;margin-bottom:.3rem">⚠️ Flag Report</div>
      <div style="font-size:.85rem;margin-bottom:.4rem"><strong>${f.studentName}</strong> (${f.studentSection})</div>
      <div style="font-size:.82rem;color:rgba(255,255,255,.8);font-style:italic">"${f.reason}"</div>
      <div style="font-size:.7rem;color:var(--text-muted);margin-top:.5rem">${timeAgoInstr(f.time)}</div>
    </div>`;

  document.getElementById('flag-edit-btn').onclick = () => {

    closeModal('modal-flag-detail');

    openFlaggedQuestionEditor(
        f.quizId,
        f.questionIndex
    );

};

  const resolveBtn = document.getElementById('flag-resolve-btn');
  if (f.status === 'resolved') {
    resolveBtn.style.display = 'none';
  } else {
    resolveBtn.style.display = '';
    resolveBtn.onclick = () => {
      resolveFlag(f.id);
      closeModal('modal-flag-detail');
    };
  }

  openModal('modal-flag-detail');
}

function openFlaggedQuestionEditor(quizId, questionIndex) {

    /*
    |--------------------------------------------------------------------------
    | OPEN THE EXISTING QUIZ EDITOR
    |--------------------------------------------------------------------------
    */

    openEditQuizModal(quizId);


    /*
    |--------------------------------------------------------------------------
    | WAIT FOR THE QUESTIONS TO BE RENDERED
    |--------------------------------------------------------------------------
    |
    | openEditQuizModal() dynamically creates the question
    | elements, so we wait one moment before looking for them.
    |
    */

    setTimeout(() => {

        const questionItems =
            document.querySelectorAll(
                '#e-questions .q-item'
            );


        const targetQuestion =
            questionItems[questionIndex];


        if (!targetQuestion) {

            console.warn(
                'Flagged question could not be located:',
                questionIndex
            );

            return;

        }


        /*
        |--------------------------------------------------------------------------
        | SCROLL TO THE FLAGGED QUESTION
        |--------------------------------------------------------------------------
        */

        targetQuestion.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });


        /*
        |--------------------------------------------------------------------------
        | HIGHLIGHT THE FLAGGED QUESTION
        |--------------------------------------------------------------------------
        */

        targetQuestion.style.transition =
            'box-shadow 0.3s ease, border-color 0.3s ease';


        targetQuestion.style.border =
            '2px solid #f59e0b';


        targetQuestion.style.boxShadow =
            '0 0 0 4px rgba(245, 158, 11, 0.15)';


        /*
        |--------------------------------------------------------------------------
        | ADD TEMPORARY LABEL
        |--------------------------------------------------------------------------
        */

        const existingLabel =
            targetQuestion.querySelector(
                '.flagged-question-label'
            );


        if (!existingLabel) {

            const label =
                document.createElement('div');

            label.className =
                'flagged-question-label';


            label.innerHTML =
                '🚩 This question was flagged by a student';


            label.style.cssText = `
                color: #f59e0b;
                font-size: .8rem;
                font-weight: 700;
                margin-bottom: .7rem;
                padding: .5rem .7rem;
                background: rgba(245,158,11,.10);
                border: 1px solid rgba(245,158,11,.25);
                border-radius: 8px;
            `;


            targetQuestion.prepend(label);

        }

    }, 150);

}

async function resolveFlag(flagId) {

    const f = flaggedQuestions.find(
        x => x.id === flagId
    );

    if (!f) return;


    try {

        const response = await fetch(
            '../assets/php/resolve_flag.php',
            {
                method: 'POST',

                credentials: 'same-origin',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    flag_id: Number(flagId)
                })
            }
        );


        const result =
            await parseApiResponse(response);


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                'Failed to resolve flag.'
            );

        }


        /*
        |--------------------------------------------------------------------------
        | UPDATE LOCAL DATA
        |--------------------------------------------------------------------------
        */

        f.status = 'resolved';


        /*
        |--------------------------------------------------------------------------
        | UPDATE UI
        |--------------------------------------------------------------------------
        */

        renderFlaggedQuestions();

        renderFlaggedFullTab();


        /*
        |--------------------------------------------------------------------------
        | SUCCESS MESSAGE
        |--------------------------------------------------------------------------
        */

        showToast(
            '✅',
            `Flag from ${f.studentName} resolved.`
        );


        console.log(
            'Flag resolved successfully:',
            flagId
        );


    } catch (error) {

        console.error(
            'Error resolving flag:',
            error
        );


        showToast(
            '❌',
            error.message ||
            'Failed to resolve flag.'
        );

    }

}


function switchTab(tab) {

    /*
     * MAIN NAVIGATION
     * Explicitly hide every panel first.
     */
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
    });

    document.querySelectorAll('.nav-tab').forEach(button => {
        button.classList.remove('active');
    });

    const map = {
        quiz: 0,
        students: 1,
        analytics: 2,
        leaderboard: 3,
        flagged: 4
    };

    const navTabs =
        document.querySelectorAll('.nav-tab');

    if (navTabs[map[tab]]) {
        navTabs[map[tab]].classList.add('active');
    }

    const selectedPanel =
        document.getElementById('panel-' + tab);

    if (selectedPanel) {
        selectedPanel.classList.add('active');
        selectedPanel.style.display = 'block';
    }


    if (tab === 'students') {
        renderStudents(students);
    }

    if (tab === 'analytics') {
        renderAnalyticsReferencePanels();
        if (typeof renderClassInsight === 'function') renderClassInsight();
    }

    if (tab === 'analytics') {
    updateAnalyticsSummaryCards();
}

    if (tab === 'leaderboard') {
        renderInstrLeaderboard();
    }

    if (tab === 'quiz') {
        renderFlaggedQuestions();
    }

    if (tab === 'flagged') {
        renderFlaggedFullTab();
    }
}

function viewStudentsForSection(section) {

    // Normalize the selected section
    const selectedSection =
        normalizeInstructorSection(section);

    console.log(
        'Viewing students for section:',
        selectedSection
    );

    // Set the selected section
    currentFilter = selectedSection;

    // Open Student Roster
    switchSubTab('roster');

    // Filter students for this section
    filterStudents();

    // Update the active filter button
    document.querySelectorAll('.filter-btn').forEach(btn => {

        const btnSection =
            normalizeInstructorSection(
                btn.dataset.section
            );

        btn.classList.toggle(
            'active',
            btnSection === selectedSection
        );

    });
}

function switchSubTab(id) {
  document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
  const map = { sections: 0, roster: 1 };
  document.querySelectorAll('.sub-tab')[map[id]].classList.add('active');
  document.getElementById('sub-' + id).classList.add('active');
  if (id === 'roster') filterStudents();
}


/* ── LEVEL HELPER ───────────────────────────────────────────── */
function getStudentLevel(xp) {
  const levels = [
    [0, 'Rookie', 'lp-novice'], [300, 'Apprentice', 'lp-learner'],
    [700, 'Scholar', 'lp-scholar'], [1200, 'Battle Ready', 'lp-expert'],
    [2000, 'Battle Veteran', 'lp-expert'], [3000, 'Battle Master', 'lp-master'],
    [4500, 'Champion', 'lp-master'], [6500, 'GABLE Master', 'lp-legend']
  ];
  let index = 0;
  for (let i = 1; i < levels.length; i++) if (xp >= levels[i][0]) index = i;
  return { num: index + 1, name: levels[index][1], cls: levels[index][2] };
}

function getTeachingLevel(xp) {
  if (xp >= 3000) return { num: 10, name: 'Legend',   cls: 'lp-legend'  };
  if (xp >= 2200) return { num: 8,  name: 'Master',   cls: 'lp-master'  };
  if (xp >= 1600) return { num: 6,  name: 'Expert',   cls: 'lp-expert'  };
  if (xp >= 1000) return { num: 4,  name: 'Scholar',  cls: 'lp-scholar' };
  if (xp >= 500)  return { num: 2,  name: 'Learner',  cls: 'lp-learner' };
  return             { num: 1,  name: 'Novice',   cls: 'lp-novice'  };
}

/* ── INSTRUCTOR XP PROGRESS ─────────────────────────────── */

function updateInstructorXPProgress() {
    const xp = Math.max(0, Number(teachingXP) || 0);

    // Existing instructor level thresholds and names
    const levels = [
        { xp: 0,    num: 1,  name: 'Novice' },
        { xp: 500,  num: 2,  name: 'Learner' },
        { xp: 1000, num: 4,  name: 'Scholar' },
        { xp: 1600, num: 6,  name: 'Expert' },
        { xp: 2200, num: 8,  name: 'Master' },
        { xp: 3000, num: 10, name: 'Legend' }
    ];

    let current = levels[0];
    let next = null;

    for (let i = 0; i < levels.length; i++) {
        if (xp >= levels[i].xp) {
            current = levels[i];
            next = levels[i + 1] || null;
        }
    }

    const xpValue = document.getElementById('instructor-xp-value');
    const levelTitle = document.getElementById('instructor-xp-level');
    const levelSub = document.getElementById('instructor-xp-sub');
    const progressFill = document.getElementById('instructor-xp-progress-fill');
    const neededText = document.getElementById('instructor-xp-needed');

    // Update the navbar XP badge
    if (xpValue) {
        xpValue.textContent = `${xp.toLocaleString()} XP`;
    }

    // Update the level title
    if (levelTitle) {
        levelTitle.textContent = next
            ? `Level ${current.num} → Level ${next.num}`
            : `Level ${current.num} — Max Level`;
    }

    // Show the current level and name
    if (levelSub) {
        levelSub.textContent = `Level ${current.num} — ${current.name}`;
    }

    // Calculate progress between the current and next thresholds
    const progress = next
    ? Math.min(100, Math.max(0, (xp / next.xp) * 100))
    : 100;

    if (progressFill) {
        progressFill.style.width = `${progress}%`;
    }

    // Show remaining XP
    if (neededText) {
        neededText.textContent = next
            ? `${(next.xp - xp).toLocaleString()} XP needed to reach Level ${next.num} — ${next.name}`
            : 'You have reached the maximum level!';
    }
}

/* ── ANALYTICS SUMMARY CARDS ───────────────────────────── */

function updateAnalyticsSummaryCards() {
    const getEl = id => document.getElementById(id);

    // Collect submissions from all quizzes
    const quizList = Array.isArray(quizzes) ? quizzes : [];
    const studentList = Array.isArray(students) ? students : [];
    const submissions = [];

    quizList.forEach(quiz => {
        const quizSubmissions = Array.isArray(quiz.submissions)
            ? quiz.submissions
            : [];

        quizSubmissions.forEach(submission => {
            submissions.push({
                ...submission,
                quiz
            });
        });
    });

    // TOTAL STUDENTS
    const studentIds = new Set();

    studentList.forEach(student => {
        const id =
            student.student_id ??
            student.studentId ??
            student.user_id ??
            student.userId ??
            student.id ??
            student.email ??
            student.student_name ??
            student.studentName ??
            student.name;

        if (id !== undefined && id !== null && String(id).trim()) {
            studentIds.add(String(id).trim().toLowerCase());
        }
    });

    // If the roster is empty, count unique students in submissions
    if (studentIds.size === 0) {
        submissions.forEach(sub => {
            const id =
                sub.student_id ??
                sub.studentId ??
                sub.user_id ??
                sub.userId ??
                sub.student?.student_id ??
                sub.student?.id ??
                sub.student?.email ??
                sub.student_name ??
                sub.studentName ??
                sub.student?.name;

            if (id !== undefined && id !== null && String(id).trim()) {
                studentIds.add(String(id).trim().toLowerCase());
            }
        });
    }

    const totalStudentsEl = getEl('analytics-total-students');
    const studentSubEl = getEl('analytics-student-sub');

    if (totalStudentsEl) {
        totalStudentsEl.textContent = studentIds.size;
    }

    if (studentSubEl) {
        studentSubEl.textContent = studentIds.size
            ? 'Students enrolled / identified'
            : 'No student data available yet';
    }

    // AVG CLASS SCORE
    const scoredSubmissions = submissions.filter(sub =>
        sub.score !== null &&
        sub.score !== undefined &&
        sub.score !== '' &&
        Number.isFinite(Number(sub.score))
    );

    const averageScore = scoredSubmissions.length
        ? Math.round(
            scoredSubmissions.reduce(
                (sum, sub) => sum + Number(sub.score),
                0
            ) / scoredSubmissions.length
        )
        : null;

    const classScoreEl = getEl('analytics-class-score');
    const scoreSubEl = getEl('analytics-score-change');

    if (classScoreEl) {
        classScoreEl.textContent =
            averageScore === null ? '—' : `${averageScore}%`;
    }

    if (scoreSubEl) {
        scoreSubEl.textContent = scoredSubmissions.length
            ? `Based on ${scoredSubmissions.length} scored submissions`
            : 'No scored submissions yet';
    }

    // TEACHING XP
    const xp = Number(teachingXP) || 0;
    const level = typeof getTeachingLevel === 'function'
        ? getTeachingLevel(xp)
        : { num: 1, name: 'Educator' };

    const xpEl = getEl('analytics-teaching-xp');
    const levelEl = getEl('analytics-teaching-level');

    if (xpEl) {
        xpEl.textContent = `${xp.toLocaleString()} XP`;
    }

    if (levelEl) {
        levelEl.textContent =
            `Level ${level.num || 1} — ${level.name || 'Educator'}`;
    }

    // QUIZ COMPLETION
    const completed = scoredSubmissions.length;
    const totalSubmissions = submissions.length;
    const completionRate = totalSubmissions
        ? Math.round((completed / totalSubmissions) * 100)
        : 0;

    const completionEl = getEl('analytics-completion');
    const completionSubEl = getEl('analytics-quiz-count');

    if (completionEl) {
        completionEl.textContent = totalSubmissions
            ? `${completionRate}%`
            : '—';
    }

    if (completionSubEl) {
        completionSubEl.textContent = totalSubmissions
            ? `${completed} of ${totalSubmissions} submissions scored`
            : `${quizList.length} quizzes assigned`;
    }
}


/* ── STUDENTS ───────────────────────────────────────────────── */
function studentFrameClass(xp) {
  return 'frame-' + ['rookie','apprentice','scholar','ready','veteran','master','champion','gable'][getStudentLevel(xp).num - 1];
}

function renderStudents(list) {
  const c = document.getElementById('students-list');
  if (!list.length) {
    c.innerHTML = '<div class="empty-state"><span class="emoji">🔍</span><p>No students found.</p></div>';
    return;
  }
  c.innerHTML = list.map((s, i) => {
    return `
    <div class="table-row roster-top-${Number(s.rank) <= 3 ? Number(s.rank) : 0}" onclick="openStudentDetail(${students.indexOf(s)})">
      <div class="student-name">
        <div class="s-avatar ${studentFrameClass(s.level_xp ?? s.xp)}" style="background:${avatarColors[i % avatarColors.length]}">${s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
        <div><div class="s-name">${s.name}</div><div class="s-id">${s.id}</div></div>
      </div>
      <div class="cell-muted">${s.program}</div>
      <div class="cell">${s.section}</div>
      <div class="xp-cell">⭐ ${s.xp.toLocaleString()}</div>
      <div class="score-cell">${s.score}%</div>
      <div><span class="rank-badge rank-${Math.min(s.rank, 3)}">${s.rank <= 3 ? ['🥇','🥈','🥉'][s.rank - 1] : '#' + s.rank}</span></div>
    </div>`;
  }).join('');
}

function renderStudentSectionFilters() {
  const container = document.getElementById('student-section-filters');

  if (!container) return;

  // Always start with All Sections
  const sections = new Set();

  // Get sections from the instructor's actual assignments
  (instructorAssignments || []).forEach(a => {
    if (!a.section) return;

    let section = String(a.section).trim();

    // Normalize "SECTION BSIT 1A" → "BSIT 1A"
    section = section.replace(/^SECTION\s+/i, '');

    if (section) {
      sections.add(section);
    }
  });

  const sortedSections = [...sections].sort();

  container.innerHTML = `
    <button
      class="filter-btn active"
      data-section="All"
      onclick="setFilter(this,'All')">
      All Sections
    </button>
  `;

  sortedSections.forEach(section => {
    const button = document.createElement('button');

    button.className = 'filter-btn';
    button.dataset.section = section;
    button.textContent = section;

    button.onclick = function () {
      setFilter(this, section);
    };

    container.appendChild(button);
  });
}


function filterStudents() {

    const q = (
        document.getElementById('student-search')?.value || ''
    ).toLowerCase();

    let list = students;

    // Section filter
    if (currentFilter !== 'All') {

        const selectedSection =
            normalizeInstructorSection(
                currentFilter
            );

        list = list.filter(student => {

            const studentSection =
                normalizeInstructorSection(
                    student.section
                );

            console.log(
                'Comparing:',
                studentSection,
                'vs',
                selectedSection
            );

            return studentSection === selectedSection;
        });
    }

    // Search filter
    if (q) {

        list = list.filter(student =>

            String(student.name || '')
                .toLowerCase()
                .includes(q)

            ||

            String(student.program || '')
                .toLowerCase()
                .includes(q)

            ||

            String(student.id || '')
                .toLowerCase()
                .includes(q)
        );
    }

    renderStudents(list);
}



function setFilter(btn, section) {
    if (!btn) return;

    currentFilter = normalizeInstructorSection(section);

    document
    .querySelectorAll('.filter-btn')
    .forEach(button => {
        button.classList.remove('active');
    });

    btn.classList.add('active');

    filterStudents();
}


/* ── STUDENT DETAIL MODAL ───────────────────────────────────── */
function openStudentDetail(idx) {
  const s = students[idx];
  if (!s) return;
  const escape = escapeHtml;
  const level = getStudentLevel(Number(s.xp) || 0);
  document.getElementById('sd-modal-title').textContent = s.name || 'Student details';
  const scores = Object.entries(s.quizScores || {});
  const quizRows = scores.map(([name, score]) => `<div class="srd-quiz-row"><span>${escape(name)}</span><strong>${score == null ? 'Pending' : escape(score) + '%'}</strong></div>`).join('');
  document.getElementById('sd-modal-body').innerHTML = `
    <p class="student-detail-subtitle">${escape(s.id || s.student_number || '')} ? ${escape(s.program || 'Program not assigned')}</p>
    <div class="srd-grid">
      <div class="srd-box"><strong>${Number(s.xp || 0).toLocaleString()}</strong><span>Student XP</span></div>
      <div class="srd-box"><strong>${Number(s.submissions) > 0 ? Number(s.score || 0).toFixed(1) + '%' : '?'}</strong><span>Average score</span></div>
      <div class="srd-box"><strong>${Number(s.submissions || 0)}</strong><span>Submissions</span></div>
    </div>
    <dl class="student-detail-facts"><div><dt>Section</dt><dd>${escape(s.section || 'Not assigned')}</dd></div><div><dt>Student level</dt><dd>Level ${level.num} ? ${level.name}</dd></div></dl>
    <h3>Quiz scores</h3><div class="srd-quizzes">${quizRows || '<p class="student-detail-empty">Individual quiz scores are available in each quiz?s Results panel.</p>'}</div>`;
  openModal('modal-student-detail');
}


/* ── RESULTS MODAL ──────────────────────────────────────────── */
function openResultsModal(quizId) {
  const q = quizzes.find(x => x.id === quizId);
  if (!q) return;
  document.getElementById('results-title').textContent = 'Quiz Results : ' + q.title;
  const subs = q.submissions;

  // Guard against empty submissions
  if (!subs.length) {
    document.getElementById('rs-total').textContent   = '0';
    document.getElementById('rs-avg').textContent     = 'N/A';
    document.getElementById('rs-perfect').textContent = '0';
    document.getElementById('rs-passed').textContent  = '0';
    document.getElementById('score-list-container').innerHTML =
      '<div class="empty-state"><span class="emoji">📭</span><p>No submissions yet.</p></div>';
    openModal('modal-results');
    return;
  }

  const avg  = Math.round(subs.reduce((a, s) => a + s.score, 0) / subs.length);
  const perf = subs.filter(s => s.score === 100).length;
  const pass = subs.filter(s => s.score >= 80).length;

  // Check if any submission has identification questions pending
  const hasIDQuestions = q.questions.some(x => x.type === 'id');

  document.getElementById('rs-total').textContent   = q.stats.completed;
  document.getElementById('rs-avg').textContent     = avg + '%';
  document.getElementById('rs-perfect').textContent = perf;
  document.getElementById('rs-passed').textContent  = pass;

  document.getElementById('score-list-container').innerHTML = subs.map((s, i) => {
    // Check if student has pending ID answers
    const pendingID = s.answers && s.answers.some(a => a.type === 'id' && a.correct === null);
    return `
    <div class="score-row">
      <div class="sc-avatar" style="background:${s.color}">${s.initials}</div>
      <div class="sc-info">
        <strong>${s.name}</strong>
        <span>Completed in ${s.mins} min</span>
        ${pendingID ? '<span class="sc-pending-id">⚠️ Has identification answers to review</span>' : ''}
      </div>
      <div class="sc-right">
        <span class="sc-pct" style="color:${s.score >= 80 ? 'var(--green)' : 'var(--gold)'}">${s.score}%</span>
        <span class="sc-xp">+${s.xp} XP earned</span>
      </div>
      <button class="btn-view-det" data-index="${i}" data-quiz="${quizId}">View Details</button>
    </div>
    <div id="sdp-${quizId}-${i}" style="display:none"></div>`;
  }).join('');

  // Wire up buttons after render
  document.querySelectorAll('.btn-view-det').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.getAttribute('data-index'));
      const qid = parseInt(btn.getAttribute('data-quiz'));
      const quiz = quizzes.find(x => x.id === qid);
      const sub  = quiz.submissions[idx];
      toggleStudentAnswers(`sdp-${qid}-${idx}`, sub, quiz, idx, qid);
    });
  });

  openModal('modal-results');
}

function toggleStudentAnswers(panelId, sub, quiz, subIdx, quizId) {
  const el = document.getElementById(panelId);
  if (!el) return;
  if (el.style.display === 'none' || el.style.display === '') {
    el.style.display = 'block';
    el.innerHTML = `
      <div class="student-detail-panel">
        <div style="font-size:.82rem;font-weight:700;margin-bottom:.75rem">📋 ${sub.name}'s Answers</div>
        <div class="sdp-answers">
          ${quiz.questions.map((q, i) => {
            const ans = sub.answers[i];
            if (q.type === 'mc') {
              const isCorrect = ans.answer === q.correct;
              return `
                <div class="sdp-ans-row">
                  <div class="sdp-q-num">${i + 1}</div>
                  <span class="sdp-q-type-badge sdp-mc">MC</span>
                  <span class="${isCorrect ? 'sdp-correct' : 'sdp-incorrect'}">${isCorrect ? '✓' : '✗'}</span>
                  <span style="color:rgba(255,255,255,0.75);flex:1">${q.text}</span>
                  <span style="font-size:.72rem;color:var(--text-muted)">${isCorrect ? 'Correct' : 'Incorrect'}</span>
                </div>`;
            } else {
              // Identification — show typed answer + manual grade controls
              const graded = ans.correct !== null;
              return `
                <div class="sdp-ans-row sdp-id-row" id="idrow-${quizId}-${subIdx}-${i}">
                  <div class="sdp-q-num">${i + 1}</div>
                  <span class="sdp-q-type-badge sdp-id">ID</span>
                  <span class="${graded ? (ans.correct ? 'sdp-correct' : 'sdp-incorrect') : 'sdp-pending'}">
                    ${graded ? (ans.correct ? '✓' : '✗') : '?'}
                  </span>
                  <div style="flex:1">
                    <div style="font-size:.78rem;color:rgba(255,255,255,0.75);margin-bottom:.2rem">${q.text}</div>
                    <div class="sdp-id-answer">"${ans.answer}"</div>
                  </div>
                  ${graded
                    ? `<span style="font-size:.72rem;color:var(--text-muted)">${ans.correct ? 'Accepted' : 'Rejected'}</span>`
                    : `<div class="sdp-id-grade-btns">
                        <button class="btn-id-correct" onclick="gradeIDAnswer(${quizId},${subIdx},${i},true)">✓ Accept</button>
                        <button class="btn-id-wrong"   onclick="gradeIDAnswer(${quizId},${subIdx},${i},false)">✗ Reject</button>
                       </div>`
                  }
                </div>`;
            }
          }).join('')}
        </div>
      </div>`;
  } else {
    el.style.display = 'none';
  }
}

async function gradeIDAnswer(
    quizId,
    subIdx,
    qIdx,
    isCorrect
) {

    const quiz =

        quizzes.find(

            x =>
                x.id === quizId

        );


    if (!quiz) {

        showToast(
            '⚠️',
            'Quiz not found.'
        );

        return;

    }


    const sub =
        quiz.submissions[subIdx];


    if (!sub) {

        showToast(
            '⚠️',
            'Student submission not found.'
        );

        return;

    }


    /*
    |--------------------------------------------------------------------------
    | GET DATABASE SUBMISSION ID
    |--------------------------------------------------------------------------
    */

    const submissionId =

        Number(
            sub.submissionId
        );


    if (

        !submissionId

    ) {

        console.error(

            'Submission ID missing:',

            sub

        );


        showToast(

            '⚠️',

            'Database submission ID is missing.'

        );

        return;

    }


    /*
    |--------------------------------------------------------------------------
    | DISABLE BUTTONS WHILE SAVING
    |--------------------------------------------------------------------------
    */

    const rowId =

        `idrow-${quizId}-${subIdx}-${qIdx}`;


    const row =
        document.getElementById(
            rowId
        );


    const buttons =
        row

            ? row.querySelectorAll(
                'button'
            )

            : [];


    buttons.forEach(

        button => {

            button.disabled =
                true;

        }

    );


    /*
    |--------------------------------------------------------------------------
    | SEND GRADE TO DATABASE
    |--------------------------------------------------------------------------
    */

    try {

        const response =

            await fetch(

                '../assets/php/grade_submission.php',

                {

                    method:
                        'POST',

                    credentials:
                        'same-origin',

                    headers: {

                        'Content-Type':
                            'application/json'

                    },

                    body:

                        JSON.stringify({

                            submission_id:
                                submissionId,

                            question_index:
                                qIdx,

                            is_correct:
                                isCorrect

                        })

                }

            );


        const result =

            await response.json();


        if (

            !response.ok

            ||

            !result.success

        ) {

            throw new Error(

                result.message ||

                'Failed to save grade.'

            );

        }


        /*
        |--------------------------------------------------------------------------
        | UPDATE LOCAL DATA
        |--------------------------------------------------------------------------
        */

        sub.answers =
            result.submission.answers;


        sub.score =

            Number(
                result.submission.score
            );


        sub.xp =

            Number(
                result.submission.xp_earned
            );


        sub.status =
            result.submission.status;


        /*
        |--------------------------------------------------------------------------
        | SUCCESS MESSAGE
        |--------------------------------------------------------------------------
        */

        if (

            result.submission.status ===
            'graded'

        ) {

            showToast(

                isCorrect

                    ? '🎉'

                    : '📝',

                result.submission.xp_earned > 0

                    ? `Grading complete! Student earned ${result.submission.xp_earned} XP.`

                    : `Grading complete. Final score: ${result.submission.score}%.`

            );

        } else {

            showToast(

                isCorrect

                    ? '✅'

                    : '✗',

                `Answer ${
                    isCorrect

                        ? 'accepted'

                        : 'rejected'
                }. More identification answers still need review.`

            );

        }


        /*
        |--------------------------------------------------------------------------
        | REFRESH RESULTS
        |--------------------------------------------------------------------------
        */

        openResultsModal(
            quizId
        );


    } catch (error) {

        console.error(

            'Grade submission error:',

            error

        );


        showToast(

            '⚠️',

            error.message ||

            'Failed to save the grade.'

        );


        buttons.forEach(

            button => {

                button.disabled =
                    false;

            }

        );

    }

}


/* ── CREATE / EDIT QUIZ MODAL ───────────────────────────────── */

function selectQuizMode(mode) {

    // Save selected mode
    document.getElementById('e-mode').value = mode;

    // Get both buttons
    const buttons = document.querySelectorAll('.quiz-mode-btn');

    // Remove active state
    buttons.forEach(button => {
        button.classList.remove('active');
    });

    // Add active state to selected button
    const selectedButton = document.querySelector(
        `.quiz-mode-btn[data-mode="${mode}"]`
    );

    if (selectedButton) {
        selectedButton.classList.add('active');
    }
}

function setQuizModalAction(isEditing = false) {

    const mainButton =
        document.getElementById('post-quiz-btn');

    const draftButton =
        document.getElementById('save-draft-btn');

    if (!mainButton) return;


    if (isEditing) {

        // EDIT MODE
        mainButton.textContent =
            '💾 Save Quiz';

        mainButton.onclick =
            updateQuiz;

        // Prevent accidentally saving an active quiz as a draft
        if (draftButton) {
            draftButton.style.display =
                'none';
        }

    } else {

        // CREATE MODE
        mainButton.textContent =
            '🚀 Post Quiz';

        mainButton.onclick =
            postQuiz;

        if (draftButton) {
            draftButton.style.display =
                '';
        }
    }
}

function populateQuizAssignmentDropdowns(
    selectedSubject = '',
    selectedSection = ''
) {

    const subjectSelect =
        document.getElementById('e-subject');

    const sectionSelect =
        document.getElementById('e-section');

    if (!subjectSelect || !sectionSelect) {
        return;
    }

    /*
    |--------------------------------------------------------------------------
    | BUILD UNIQUE SUBJECT + SECTION ASSIGNMENTS
    |--------------------------------------------------------------------------
    */

    const assignments =
        instructorAssignments
            .filter(a =>
                a &&
                a.subject_name &&
                a.section
            );

    /*
    |--------------------------------------------------------------------------
    | GET UNIQUE SUBJECTS
    |--------------------------------------------------------------------------
    */

    const subjects = [
        ...new Set(
            assignments.map(a =>
                String(a.subject_name).trim()
            )
        )
    ];


    /*
    |--------------------------------------------------------------------------
    | POPULATE SUBJECT DROPDOWN
    |--------------------------------------------------------------------------
    */

    subjectSelect.innerHTML = '';

    if (subjects.length === 0) {

        const option =
            document.createElement('option');

        option.value = '';
        option.textContent =
            'No assigned subjects';

        subjectSelect.appendChild(option);

        subjectSelect.disabled = true;
        sectionSelect.disabled = true;

        sectionSelect.innerHTML = '';

        return;
    }

    subjectSelect.disabled = false;

    subjects.forEach(subject => {

        const option =
            document.createElement('option');

        option.value = subject;
        option.textContent = subject;

        subjectSelect.appendChild(option);

    });


    /*
    |--------------------------------------------------------------------------
    | SELECT SUBJECT
    |--------------------------------------------------------------------------
    */

    if (
        selectedSubject &&
        subjects.includes(selectedSubject)
    ) {

        subjectSelect.value =
            selectedSubject;

    } else {

        subjectSelect.value =
            subjects[0];

    }


    /*
    |--------------------------------------------------------------------------
    | FUNCTION TO UPDATE SECTIONS
    |--------------------------------------------------------------------------
    */

    function updateSections() {

        const currentSubject =
            subjectSelect.value;

        const matchingSections = [
            ...new Set(
                assignments
                    .filter(a =>
                        String(a.subject_name).trim()
                        === currentSubject
                    )
                    .map(a =>
                        String(a.section).trim()
                    )
                    .filter(Boolean)
            )
        ];


        sectionSelect.innerHTML = '';

        sectionSelect.disabled =
            matchingSections.length === 0;


        matchingSections.forEach(section => {

            const option =
                document.createElement('option');

            option.value = section;
            option.textContent = section;

            sectionSelect.appendChild(option);

        });


        /*
        |--------------------------------------------------------------------------
        | RESTORE SELECTED SECTION WHEN EDITING
        |--------------------------------------------------------------------------
        */

        if (
            selectedSection &&
            matchingSections.includes(selectedSection)
        ) {

            sectionSelect.value =
                selectedSection;

        } else if (
            matchingSections.length > 0
        ) {

            sectionSelect.value =
                matchingSections[0];

        }

    }


    /*
    |--------------------------------------------------------------------------
    | UPDATE SECTION WHEN SUBJECT CHANGES
    |--------------------------------------------------------------------------
    */

    subjectSelect.onchange =
        updateSections;


    updateSections();
}

/* =========================================================
   TEAM CLASSROOM GAMES
   Instructor creates/manages classroom games separately
   from the regular website quizzes.

   Final Game Modes:
   🔔 Team Buzzer
   🏆 Kahoot Battle
   🪑 The Hot Seat
   🧩 Crossword
   🔤 Word Jumble
   ========================================================= */

let selectedTeamGameMode = 'buzzer';
let teamGameQuestions = [];
let editingTeamGameQuestionIndex = -1;
const MAX_CROSSWORD_QUESTIONS = 12;


/* =========================================================
   GAME MODE INFORMATION
   ========================================================= */

const TEAM_GAME_MODE_INFO = {
    buzzer: {
        label: 'Team Buzzer',
        icon: '🔔'
    },

    kahoot: {
        label: 'Kahoot Battle',
        icon: '🏆'
    },

    hotseat: {
        label: 'The Hot Seat',
        icon: '🪑'
    },

    crossword: {
        label: 'Crossword',
        icon: '🧩'
    },

    jumble: {
        label: 'Word Jumble',
        icon: '🔤'
    }
};


/* =========================================================
   OPEN TEAM CLASSROOM GAMES
   ========================================================= */

async function openTeamClassroomGamesModal() {
    console.log(
    "🎮 OPEN CLASSROOM GAMES FUNCTION RUNNING"
);

    selectedTeamGameMode = 'buzzer';

    teamGameQuestions = [];

    editingTeamGameQuestionIndex = -1;

    teamGameQuestionType = 'multiple_choice';

    // Clear any editor left open from a previous session
    closeTeamGameQuestionEditor();


    /*
     * UPDATE ACTIVE GAME MODE BUTTON
     */

    document
        .querySelectorAll('.team-game-mode')
        .forEach(button => {

            button.classList.toggle(
                'active',
                button.dataset.gameMode ===
                selectedTeamGameMode
            );

        });


    /*
     * UPDATE HEADER
     */

    updateTeamGameModeHeader();


    /*
     * OPEN MODAL FIRST
     */

    openModal(
        'modal-team-games'
    );


    /*
     * LOAD THE INSTRUCTOR'S
     * TEACHING ASSIGNMENTS FROM PHP
     *
     * This guarantees that the game
     * dropdowns have the latest data.
     */

    try {

        console.log(
            'Loading teaching assignments for Classroom Games...'
        );


        await loadInstructorAssignments();


        console.log(
            'Teaching assignments available for Classroom Games:',
            instructorAssignments
        );


        /*
         * NOW populate Section + Topic
         */

        populateTeamGameSelectors();


    } catch (error) {

        console.error(
            'Failed to load Classroom Game assignments:',
            error
        );

    }

}

/* =========================================================
   SELECT GAME MODE
   ========================================================= */

function selectTeamGameMode(mode, button) {

    if (!TEAM_GAME_MODE_INFO[mode]) {
        console.warn(
            'Unknown team game mode:',
            mode
        );

        return;
    }


    /* -----------------------------------------
       CHANGE SELECTED MODE
    ----------------------------------------- */

    selectedTeamGameMode = mode;


    /* -----------------------------------------
       RESET EDITING STATE
    ----------------------------------------- */

    editingTeamGameQuestionIndex = -1;


    /* -----------------------------------------
       UPDATE ACTIVE MODE BUTTON
    ----------------------------------------- */

    document
        .querySelectorAll('.team-game-mode')
        .forEach(item => {

            item.classList.remove('active');

        });


    if (button) {

        button.classList.add('active');

    }


    /* -----------------------------------------
       CLOSE CURRENT QUESTION EDITOR
       when switching game modes
    ----------------------------------------- */

    closeTeamGameQuestionEditor();


    /* -----------------------------------------
       UPDATE MODE HEADER
    ----------------------------------------- */

    updateTeamGameModeHeader();


    /* -----------------------------------------
       LOAD QUESTIONS FOR NEW MODE
    ----------------------------------------- */

    refreshTeamGameQuestions();

}



/* =========================================================
   UPDATE SELECTED TEAM GAME MODE HEADER
========================================================= */

function updateTeamGameModeHeader() {

    const modeInfo =
        TEAM_GAME_MODE_INFO[
            selectedTeamGameMode
        ];

    if (!modeInfo) {
        return;
    }


    const icon =
        document.getElementById(
            'team-game-selected-mode-icon'
        );

    const label =
        document.getElementById(
            'team-game-selected-mode-label'
        );

    const description =
        document.getElementById(
            'team-game-selected-mode-description'
        );


    if (icon) {

        icon.textContent =
            modeInfo.icon;

    }


    if (label) {

        label.textContent =
            modeInfo.label;

    }


    if (description) {

        description.textContent =
            `Add questions for ${modeInfo.label}.`;

    }

}


/* =========================================================
   GET INSTRUCTOR ASSIGNMENTS
   ========================================================= */

function getTeamGameAssignments() {

    return (instructorAssignments || []).filter(assignment => {

        return (
            assignment &&
            String(assignment.subject_name || '').trim() &&
            String(assignment.section || '').trim()
        );

    });

}


/* =========================================================
   POPULATE TEAM GAME SECTION + TOPIC DROPDOWNS
   ========================================================= */

function populateTeamGameSelectors() {

    const sectionSelect =
        document.getElementById(
            'team-game-section'
        );


    const topicSelect =
        document.getElementById(
            'team-game-topic'
        );


    if (
        !sectionSelect ||
        !topicSelect
    ) {

        console.error(
            'Team Game section/topic dropdown not found.'
        );

        return;
    }


    /*
     * GET ASSIGNMENTS
     */

    const assignments =
        getTeamGameAssignments();


    console.log(
        'Assignments used for Team Game dropdowns:',
        assignments
    );


    /*
     * GET UNIQUE SECTIONS
     */

    const sections = [
        ...new Set(

            assignments
                .map(
                    assignment =>
                        String(
                            assignment.section || ''
                        ).trim()
                )
                .filter(Boolean)

        )
    ];


    console.log(
        'Team Game sections:',
        sections
    );


    /*
     * CLEAR SECTION DROPDOWN
     */

    sectionSelect.innerHTML = '';


    /*
     * NO ASSIGNED SECTIONS
     */

    if (!sections.length) {

        sectionSelect.innerHTML =
            '<option value="">No assigned sections</option>';

        topicSelect.innerHTML =
            '<option value="">No assigned topics</option>';

        teamGameQuestions = [];

        renderTeamGameQuestions();

        console.warn(
            'No teaching assignments were returned for this instructor.'
        );

        return;
    }


    /*
     * ADD SECTIONS
     */

    sections.forEach(
        section => {

            const option =
                document.createElement(
                    'option'
                );


            option.value =
                section;


            option.textContent =
                section;


            sectionSelect.appendChild(
                option
            );

        }
    );


    /*
     * SELECT FIRST SECTION
     */

    sectionSelect.value =
        sections[0];


    /*
     * LOAD TOPICS FOR SELECTED SECTION
     */

    updateTeamGameTopics();


    /*
     * WHEN SECTION CHANGES
     */

    sectionSelect.onchange =
        function () {

            updateTeamGameTopics();

        };
    
    topicSelect.onchange =
        function () {

        refreshTeamGameQuestions();

    };

}


/* =========================================================
   UPDATE TEAM GAME TOPICS
   ========================================================= */

function updateTeamGameTopics() {

    const sectionSelect =
        document.getElementById(
            'team-game-section'
        );


    const topicSelect =
        document.getElementById(
            'team-game-topic'
        );


    if (
        !sectionSelect ||
        !topicSelect
    ) {

        return;
    }


    const selectedSection =
        String(
            sectionSelect.value || ''
        ).trim();


    console.log(
        'Selected Team Game section:',
        selectedSection
    );


    /*
     * FIND ASSIGNMENTS FOR THIS SECTION
     */

    const topics = [
        ...new Set(

            getTeamGameAssignments()

                .filter(
                    assignment => {

                        return (
                            String(
                                assignment.section || ''
                            ).trim()
                            ===
                            selectedSection
                        );

                    }
                )

                .map(
                    assignment => {

                        return String(
                            assignment.subject_name || ''
                        ).trim();

                    }
                )

                .filter(Boolean)

        )
    ];


    console.log(
        'Topics for selected section:',
        topics
    );


    /*
     * CLEAR TOPIC DROPDOWN
     */

    topicSelect.innerHTML = '';


    /*
     * NO TOPICS
     */

    if (!topics.length) {

        topicSelect.innerHTML =
            '<option value="">No assigned topics</option>';

        teamGameQuestions = [];

        renderTeamGameQuestions();

        return;
    }


    /*
     * ADD TOPICS
     */

    topics.forEach(
        topic => {

            const option =
                document.createElement(
                    'option'
                );


            option.value =
                topic;


            option.textContent =
                topic;


            topicSelect.appendChild(
                option
            );

        }
    );


    /*
     * SELECT FIRST TOPIC
     */

    topicSelect.value =
        topics[0];


    /*
     * LOAD QUESTIONS
     */

    refreshTeamGameQuestions();

}

/* =========================================================
   LOAD QUESTION COUNTS FOR ALL GAME MODES
   ========================================================= */

async function loadGameModeQuestionCounts(
    section,
    topic
) {

    if (!section || !topic) {
        return;
    }


    const gameModes = [
        'buzzer',
        'kahoot',
        'hotseat',
        'crossword',
        'jumble'
    ];


    console.log(
        'Loading question counts:',
        {
            section: section,
            topic: topic
        }
    );


    try {

        const requests =
            gameModes.map(async mode => {

                const params =
                    new URLSearchParams({
                        section: section,
                        topic: topic,
                        game_mode: mode
                    });


                const response =
                    await fetch(
                        `../assets/php/get_game_questions.php?${params.toString()}`,
                        {
                            method: 'GET',

                            credentials:
                                'same-origin',

                            cache:
                                'no-store'
                        }
                    );


                const result =
                    await response.json();


                if (
                    !response.ok ||
                    !result.success
                ) {

                    throw new Error(
                        result.message ||
                        `Failed to load ${mode} questions.`
                    );

                }


                return {
                    mode: mode,

                    count:
                        Array.isArray(result.questions)
                            ? result.questions.length
                            : 0
                };

            });


        const results =
            await Promise.all(requests);


        console.log(
            'GAME MODE QUESTION COUNTS:',
            results
        );


        results.forEach(item => {

            const countElement =
                document.getElementById(
                    `team-game-count-${item.mode}`
                );


            if (countElement) {

                countElement.textContent =
                    `${item.count} ${
                        item.count === 1
                            ? 'Question'
                            : 'Questions'
                    }`;

            }

        });


    } catch (error) {

        console.error(
            'Failed to load game mode question counts:',
            error
        );

    }

}


/* =========================================================
   REFRESH CURRENT CLASSROOM QUESTIONS
   ========================================================= */

let teamGameQuestionRequestId = 0;


async function refreshTeamGameQuestions() {

    const section =
        document.getElementById(
            'team-game-section'
        )?.value || '';


    const topic =
        document.getElementById(
            'team-game-topic'
        )?.value || '';


    const gameMode =
        selectedTeamGameMode || '';
    
    loadGameModeQuestionCounts(
        section,
        topic
);


    console.log(
        '======================================'
    );

    console.log(
        'LOADING CLASSROOM QUESTIONS'
    );

    console.log(
        'Section:',
        section
    );

    console.log(
        'Topic:',
        topic
    );

    console.log(
        'Game Mode:',
        gameMode
    );

    console.log(
        '======================================'
    );


    if (
        !section ||
        !topic ||
        !gameMode
    ) {

        console.warn(
            'Missing section, topic, or game mode.'
        );

        teamGameQuestions = [];

        renderTeamGameQuestions();

        return;
    }


    /*
     * Give this request a unique ID.
     *
     * If the instructor changes modes quickly,
     * an older request must not overwrite the
     * newer request.
     */

    const requestId =
        ++teamGameQuestionRequestId;


    const params =
        new URLSearchParams({

            section:
                section,

            topic:
                topic,

            game_mode:
                gameMode

        });


    const url =
        `../assets/php/get_game_questions.php?${params.toString()}`;


    console.log(
        'REQUESTING:',
        url
    );


    try {

        const response =
            await fetch(
                url,
                {
                    method: 'GET',

                    credentials:
                        'same-origin',

                    cache:
                        'no-store'
                }
            );


        console.log(
            'GAME QUESTIONS API STATUS:',
            response.status
        );


        const result =
            await response.json();


        console.log(
            'GAME QUESTIONS API RESPONSE:',
            result
        );


        /*
         * Ignore this response if another
         * request was started after it.
         */

        if (
            requestId !==
            teamGameQuestionRequestId
        ) {

            console.warn(
                'Ignoring stale classroom question response:',
                requestId
            );

            return;
        }


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                'Failed to load classroom questions.'
            );

        }


        teamGameQuestions =
            result.questions || [];


        console.log(
            'Classroom game questions loaded:',
            teamGameQuestions
        );


        renderTeamGameQuestions();


    } catch (error) {

        console.error(
            'Failed to load classroom game questions:',
            error
        );


        /*
         * Don't let an old request erase
         * a newer request's results.
         */

        if (
            requestId !==
            teamGameQuestionRequestId
        ) {

            return;
        }


        teamGameQuestions = [];

        renderTeamGameQuestions();


        showToast(
            '⚠️',
            error.message ||
            'Failed to load classroom questions.'
        );

    }

}

/* =========================================================
   QUESTION PREVIEW
   ========================================================= */

function getTeamGameQuestionPreview(question) {

    if (!question) {
        return 'Untitled question';
    }

    let preview;


    if (
        selectedTeamGameMode === 'hotseat'
    ) {

        preview =
            question.word ||
            question.answer ||
            question.correct_answer ||
            'Untitled word';

    }


    else if (
        selectedTeamGameMode === 'crossword'
    ) {

        preview =
            question.answer ||
            question.correct_answer ||
            'Untitled crossword answer';

    }


    else if (
        selectedTeamGameMode === 'jumble'
    ) {

        preview =
            question.correct_word ||
            question.answer ||
            question.correct_answer ||
            'Untitled word';

    }


    else {

        preview =
            question.question_text ||
            question.question ||
            question.text ||
            'Untitled question';

    }


    /*
     * Limit the displayed preview to 50 characters.
     * Spaces are included in the 50-character limit.
     */

    preview = String(preview).trim();


    if (preview.length > 50) {

        return preview.substring(0, 50) + '...';

    }


    return preview;

}


/* =========================================================
   QUESTION TYPE LABEL
   ========================================================= */

function getTeamGameQuestionTypeLabel(question) {

    switch (selectedTeamGameMode) {

        case 'buzzer':
            return 'Multiple Choice';

        case 'kahoot':
            return 'Multiple Choice';

        case 'hotseat':
            return 'Word + Hint';

        case 'crossword':
            return 'Answer + Clue';

        case 'jumble':
            return 'Jumbled Word';

        default:
            return 'Classroom Game Question';

    }

}


/* =========================================================
   ADD QUESTION
   ========================================================= */

function addTeamGameQuestion() {

    /*
     * Crossword has a maximum of 12 questions.
     */
    if (
        selectedTeamGameMode === 'crossword' &&
        teamGameQuestions.length >= MAX_CROSSWORD_QUESTIONS
    ) {

        showToast(
            '⚠️',
            `Crossword can have a maximum of ${MAX_CROSSWORD_QUESTIONS} questions.`
        );

        return;

    }


    editingTeamGameQuestionIndex = -1;

    openTeamGameQuestionEditor();

}


/* =========================================================
   EDIT QUESTION
   ========================================================= */

function editTeamGameQuestion(index) {

    if (
        index < 0 ||
        index >= teamGameQuestions.length
    ) {
        return;
    }


    editingTeamGameQuestionIndex =
        index;


    const question =
        teamGameQuestions[index];


    /*
     * ---------------------------------------------------------
     * DETECT QUESTION TYPE
     * ---------------------------------------------------------
     *
     * New True / False questions should have:
     *
     * question_type = "true_false"
     *
     * But older questions may have been saved as:
     *
     * option_a = "True"
     * option_b = "False"
     * option_c = ""
     * option_d = ""
     *
     * In that case, detect it automatically.
     */

    const questionType =
        String(
            question.question_type ||
            ''
        )
        .trim()
        .toLowerCase();


    const optionA =
        String(
            question.option_a ||
            ''
        )
        .trim()
        .toLowerCase();


    const optionB =
        String(
            question.option_b ||
            ''
        )
        .trim()
        .toLowerCase();


    const optionC =
        String(
            question.option_c ||
            ''
        )
        .trim();


    const optionD =
        String(
            question.option_d ||
            ''
        )
        .trim();


    const isTrueFalse =
        questionType === 'true_false' ||
        (
            optionA === 'true' &&
            optionB === 'false' &&
            optionC === '' &&
            optionD === ''
        );


    /*
     * Set the global question type.
     */
    teamGameQuestionType =
        isTrueFalse
            ? 'true_false'
            : 'multiple_choice';


    /*
     * ---------------------------------------------------------
     * NORMALIZE OLD TRUE / FALSE QUESTIONS
     * ---------------------------------------------------------
     */

    if (isTrueFalse) {

        question.question_type =
            'true_false';


        question.option_a =
            'True';


        question.option_b =
            'False';


        question.option_c =
            '';


        question.option_d =
            '';


        /*
         * Older questions may have:
         *
         * A = True
         * B = False
         *
         * Convert the correct answer into
         * the actual True / False value.
         */

        let correctAnswer =
            String(
                question.correct_answer ||
                question.answer ||
                ''
            )
            .trim()
            .toUpperCase();


        if (correctAnswer === 'A') {

            correctAnswer = 'True';

        }

        else if (correctAnswer === 'B') {

            correctAnswer = 'False';

        }

        else if (
            correctAnswer !== 'TRUE' &&
            correctAnswer !== 'FALSE'
        ) {

            correctAnswer = 'True';

        }

        else {

            correctAnswer =
                correctAnswer === 'TRUE'
                    ? 'True'
                    : 'False';

        }


        question.correct_answer =
            correctAnswer;


        question.answer =
            correctAnswer;

    }


    /*
     * ---------------------------------------------------------
     * DEBUG
     * ---------------------------------------------------------
     */

    console.log(
        'EDITING QUESTION:',
        question
    );


    console.log(
        'DETECTED QUESTION TYPE:',
        teamGameQuestionType
    );


    /*
     * ---------------------------------------------------------
     * OPEN EDITOR
     * ---------------------------------------------------------
     */

    openTeamGameQuestionEditor(
        question
    );

}


/* =========================================================
   OPEN QUESTION EDITOR
   ========================================================= */

function openTeamGameQuestionEditor(question = {}) {

    const container =
        document.getElementById(
            'team-game-question-editor'
        );


    const addRow =
        document.getElementById(
            'team-game-add-row'
        );


    if (!container) {

        console.warn(
            'team-game-question-editor element was not found.'
        );

        return;

    }


    const isEditing =
        editingTeamGameQuestionIndex >= 0;


    /* -----------------------------------------
       HIDE + ADD QUESTION BUTTON
    ----------------------------------------- */

    if (addRow) {

        addRow.style.display = 'none';

    }


    /* -----------------------------------------
       SHOW QUESTION EDITOR
    ----------------------------------------- */

    container.style.display = 'block';


    /* -----------------------------------------
       CREATE EDITOR
    ----------------------------------------- */

    container.innerHTML = `

        <div class="team-game-editor-header">

    <h3>
        ${isEditing
            ? '✏️ Edit Question'
            : 'Create Question'}
    </h3>

    <button
        type="button"
        class="team-game-editor-close"
        onclick="closeTeamGameQuestionEditor()">

        ✕

    </button>

</div>


        <div class="team-game-editor-fields">

            ${buildTeamGameEditorFields(question)}

        </div>


        <div class="team-game-editor-actions">

            <button
                type="button"
                class="btn-secondary"
                onclick="closeTeamGameQuestionEditor()">

                Cancel

            </button>


            <button
                type="button"
                class="btn-primary"
                onclick="saveTeamGameQuestion()">

                💾
                ${isEditing
                    ? 'Update Question'
                    : 'Save Question'}

            </button>

        </div>

    `;

}

/* =========================================================
   OPTION FIELD
   ========================================================= */

function buildOptionField(letter, value) {

    return `

        <div class="team-game-form-group">

            <label>Option ${letter}</label>

            <input
                type="text"
                id="team-option-${letter.toLowerCase()}"
                value="${escapeHtml(value)}"
                placeholder="Enter option ${letter}...">

        </div>

    `;

}


/* =========================================================
   GET CORRECT ANSWER
   ========================================================= */

function getCorrectOption(question, fallbackIndex = 0) {

    if (!question) {
        return 'A';
    }


    if (
        typeof question.correct_answer === 'string'
    ) {

        const value =
            question.correct_answer.trim().toUpperCase();

        if (['A', 'B', 'C', 'D'].includes(value)) {
            return value;
        }

    }


    if (
        typeof question.correct === 'number'
    ) {

        return ['A', 'B', 'C', 'D'][
            question.correct
        ] || 'A';

    }


    return 'A';

}


/* =========================================================
   SAVE QUESTION
   ========================================================= */
async function saveTeamGameQuestion() {

    console.log('SAVE BUTTON CLICKED');

    console.log(
    'SELECTED GAME MODE:',
    selectedTeamGameMode
);

console.log(
    'QUESTION TYPE:',
    teamGameQuestionType
);

    const editing =
        editingTeamGameQuestionIndex >= 0;


    let question = {};


    /*
     * TEAM BUZZER
     * Question only.
     */

    if (selectedTeamGameMode === 'buzzer') {

        const questionText =
            document.getElementById(
                'team-question-text'
            )?.value.trim() || '';


        if (!questionText) {

            showToast(
                '⚠️',
                'Please enter the question.'
            );

            return;
        }


        question = {

            game_mode:
                'buzzer',

            question_text:
                questionText,

            answer:
                ''

        };
    }


        /*
    * KAHOOT
    * Multiple Choice OR True / False.
    */
    else if (selectedTeamGameMode === 'kahoot') {

        const questionText =
            document.getElementById(
                'team-question-text'
            )?.value.trim() || '';


        /*
        * TRUE / FALSE
        */
        if (teamGameQuestionType === 'true_false') {

            const correct =
                document.getElementById(
                    'team-question-correct'
                )?.value || 'True';


            if (!questionText) {

                showToast(
                    '⚠️',
                    'Please enter the question.'
                );

                return;
            }


            question = {

                game_mode:
                    'kahoot',

                question_type:
                    'true_false',

                question_text:
                    questionText,

                answer:
                    correct,

                correct_answer:
                    correct,

                option_a:
                    'True',

                option_b:
                    'False',

                option_c:
                    '',

                option_d:
                    ''

            };

        }


        /*
        * MULTIPLE CHOICE
        */
        else {

            const optionA =
                document.getElementById(
                    'team-option-a'
                )?.value.trim() || '';

            const optionB =
                document.getElementById(
                    'team-option-b'
                )?.value.trim() || '';

            const optionC =
                document.getElementById(
                    'team-option-c'
                )?.value.trim() || '';

            const optionD =
                document.getElementById(
                    'team-option-d'
                )?.value.trim() || '';

            const correct =
                document.getElementById(
                    'team-question-correct'
                )?.value || 'A';


            if (
                !questionText ||
                !optionA ||
                !optionB ||
                !optionC ||
                !optionD
            ) {

                showToast(
                    '⚠️',
                    'Please complete the question and all four choices.'
                );

                return;
            }


            question = {

                game_mode:
                    'kahoot',

                question_type:
                    'multiple_choice',

                question_text:
                    questionText,

                option_a:
                    optionA,

                option_b:
                    optionB,

                option_c:
                    optionC,

                option_d:
                    optionD,

                correct_answer:
                    correct,

                answer:
                    correct

            };

        }
    }


    /*
     * HOT SEAT
     */

    else if (
        selectedTeamGameMode === 'hotseat'
    ) {

        const word =
            document.getElementById(
                'team-hotseat-word'
            )?.value.trim() || '';


        const hint =
            document.getElementById(
                'team-hotseat-hint'
            )?.value.trim() || '';


        if (!word) {

            showToast(
                '⚠️',
                'Please enter the word or concept.'
            );

            return;
        }


        question = {

    game_mode:
        'hotseat',

    question_type:
        'hotseat',

    word:
        word,

    hint:
        hint
};
    }


    /*
     * CROSSWORD
     */

    else if (
        selectedTeamGameMode === 'crossword'
    ) {

        const answer =
            document.getElementById(
                'team-crossword-answer'
            )?.value.trim() || '';


        const clue =
            document.getElementById(
                'team-crossword-clue'
            )?.value.trim() || '';


        if (!answer || !clue) {

            showToast(
                '⚠️',
                'Please enter both the answer and clue.'
            );

            return;
        }


        question = {

    game_mode:
        'crossword',

    question_type:
        'crossword',

    answer:
        answer,

    clue:
        clue
};
    }


    /*
     * WORD JUMBLE
     */

    else if (
        selectedTeamGameMode === 'jumble'
    ) {

        const correctWord =
            document.getElementById(
                'team-jumble-word'
            )?.value.trim() || '';


        const jumbledWord =
            document.getElementById(
                'team-jumble-jumbled'
            )?.value.trim() || '';


        const hint =
            document.getElementById(
                'team-jumble-hint'
            )?.value.trim() || '';


        if (!correctWord || !jumbledWord) {

            showToast(
                '⚠️',
                'Please enter the correct word and jumbled word.'
            );

            return;
        }


        question = {

    game_mode:
        'jumble',

    question_type:
        'jumble',

    correct_word:
        correctWord,

    jumble:
        jumbledWord,

    hint:
        hint
};
    }


    /*
     * NO VALID GAME MODE
     */

    else {

        showToast(
            '⚠️',
            'Please select a valid game mode.'
        );

        return;
    }


    /*
     * SAVE EVERYTHING TO DATABASE
     *
     * IMPORTANT:
     * This is outside the game-mode blocks.
     * Therefore Buzzer, Kahoot, Hot Seat,
     * Crossword, and Jumble all reach PHP.
     */
    console.log('SENDING QUESTION TO DATABASE:', question);
    const saved =
        await saveQuestionToDatabase(question);


    if (!saved) {
        return;
    }


    /*
     * SUCCESS
     */

    showToast(
        '✅',
        editing
            ? 'Classroom question updated.'
            : 'Classroom question added.'
    );
}


/*
|--------------------------------------------------------------------------
| SAVE TO DATABASE
|--------------------------------------------------------------------------
*/

async function saveQuestionToDatabase(question, updateLocal = true) {

    const section =
        document.getElementById(
            'team-game-section'
        )?.value || '';


    const topic =
        document.getElementById(
            'team-game-topic'
        )?.value || '';


    if (!section || !topic) {

        teamGameFeedback(
            '⚠️',
            'Please select a section and topic first.'
        );

        return false;
    }


    /*
     * Add section/topic to the object.
     */

    question.section =
        section;

    question.topic =
        topic;


    /*
     * Existing question ID when editing.
     */

    if (
        updateLocal && editingTeamGameQuestionIndex >= 0 &&
        teamGameQuestions[
            editingTeamGameQuestionIndex
        ]?.question_id
    ) {

        question.question_id =
            teamGameQuestions[
                editingTeamGameQuestionIndex
            ].question_id;
    }


    try {

        const response =
            await fetch(
                '../assets/php/save_game_question.php',
                {

                    method: 'POST',

                    credentials:
                        'same-origin',

                    headers: {
                        'Content-Type':
                            'application/json'
                    },

                    body:
                        JSON.stringify(
                            question
                        )
                }
            );


        const responseText =
    await response.text();

console.log(
    'SAVE GAME QUESTION RAW RESPONSE:',
    responseText
);

let result;

try {

    result =
        JSON.parse(responseText);

} catch (error) {

    console.error(
        'PHP returned invalid JSON:',
        responseText
    );

    throw new Error(
        'PHP error: ' +
        responseText
    );
}


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                'Failed to save question.'
            );

        }

        Object.assign(question, result.question || {});
        if (updateLocal) {

            if (
                editingTeamGameQuestionIndex >= 0
            ) {
                teamGameQuestions[
                    editingTeamGameQuestionIndex
                ] = result.question;

            } else {

                teamGameQuestions.push(
                    result.question
                );
            }

}


        closeTeamGameQuestionEditor();

        renderTeamGameQuestions();

        return true;


    } catch (error) {

        console.error(
            'Save game question error:',
            error
        );


        teamGameFeedback(
            '⚠️',
            error.message ||
            'Failed to save classroom question.'
        );


        return false;
    }

}

/* =========================================================
   SAVE ALL CLASSROOM GAME QUESTIONS
   ========================================================= */

function teamGameFeedback(icon, message) {
    const status = document.getElementById('team-game-status');
    if (status) { status.hidden = false; status.textContent = message; }
}

async function saveTeamGameQuestionsUI() {

    console.log(
        'SAVE QUESTIONS BUTTON CLICKED'
    );


    if (!teamGameQuestions.length) {

        teamGameFeedback(
            '⚠️',
            'There are no questions to save.'
        );

        return;
    }


    const section =
        document.getElementById(
            'team-game-section'
        )?.value || '';


    const topic =
        document.getElementById(
            'team-game-topic'
        )?.value || '';


    if (!section || !topic) {

        teamGameFeedback(
            '⚠️',
            'Please select a section and topic first.'
        );

        return;
    }


    const saveButton = document.querySelector('.team-game-save-btn');
    if (saveButton?.disabled) return false;
    if (saveButton) saveButton.disabled = true;
    teamGameFeedback('System', 'Saving questions...');
    try {

        /*
         * Save every question currently
         * displayed in the instructor UI.
         */

        for (
            let i = 0;
            i < teamGameQuestions.length;
            i++
        ) {

            const question =
                teamGameQuestions[i];


            /*
             * Make sure the question has
             * the current section and topic.
             */

            question.section =
                section;

            question.topic =
                topic;


            /*
             * Save to PHP.
             */

            const saved =
    await saveQuestionToDatabase(
        question,
        false
    );


            if (!saved) {

                throw new Error(
                    `Failed to save Question ${i + 1}.`
                );

            }

        }


        /*
         * Reload everything from MySQL.
         *
         * This proves that the data is actually
         * coming back from the database.
         */

        await refreshTeamGameQuestions();


        teamGameFeedback(
            '✅',
            'All classroom game questions saved.'
        );


        console.log(
            'ALL QUESTIONS SAVED SUCCESSFULLY'
        );


        return true;
    } catch (error) {

        console.error(
            'Save all game questions error:',
            error
        );


        teamGameFeedback(
            '⚠️',
            error.message ||
            'Failed to save classroom questions.'
        );

        return false;
    } finally {
        if (saveButton) saveButton.disabled = false;
    }

}

/* =========================================================
   DELETE QUESTION
   ========================================================= */

function deleteTeamGameQuestion(index) {

    if (
        index < 0 ||
        index >= teamGameQuestions.length
    ) {
        return;
    }


    const questionNumber =
        index + 1;


    const removeQuestion = async () => {

        const question =
            teamGameQuestions[index];


        if (!question) {
            return;
        }


        /*
         * DELETE FROM MYSQL
         */

        if (question.question_id) {

            try {

                const response =
                    await fetch(
                        '../assets/php/delete_game_question.php',
                        {
                            method: 'POST',

                            credentials:
                                'same-origin',

                            headers: {
                                'Content-Type':
                                    'application/json'
                            },

                            body:
                                JSON.stringify({
                                    question_id:
                                        question.question_id
                                })
                        }
                    );


                const result =
                    await response.json();


                if (
                    !response.ok ||
                    !result.success
                ) {

                    throw new Error(
                        result.message ||
                        'Failed to delete question.'
                    );

                }


                console.log(
                    'QUESTION DELETED FROM DATABASE:',
                    question.question_id
                );


            } catch (error) {

                console.error(
                    'Delete game question error:',
                    error
                );


                showToast(
                    '⚠️',
                    error.message ||
                    'Failed to delete question.'
                );

                return;

            }

        }


        /*
         * REMOVE FROM CURRENT UI
         */

        teamGameQuestions.splice(
            index,
            1
        );


        renderTeamGameQuestions();


        showToast(
            '🗑️',
            `Question ${questionNumber} deleted.`
        );

    };


    /*
     * USE EXISTING CONFIRMATION SYSTEM
     */

    if (
        typeof showConfirm === 'function'
    ) {

        showConfirm(
            'Delete Question',
            `Are you sure you want to delete Question ${questionNumber}?`,
            'Delete',
            removeQuestion
        );

    } else {

        if (
            window.confirm(
                `Delete Question ${questionNumber}?`
            )
        ) {

            removeQuestion();

        }

    }

}

/* =========================================================
   CLOSE QUESTION EDITOR
========================================================= */

function closeTeamGameQuestionEditor() {

    const container =
        document.getElementById(
            'team-game-question-editor'
        );


    const addRow =
        document.getElementById(
            'team-game-add-row'
        );


    /* -----------------------------------------
       CLEAR EDITOR
    ----------------------------------------- */

    if (container) {

        container.innerHTML = '';

        container.style.display = 'none';

    }


    /* -----------------------------------------
       SHOW + ADD QUESTION AGAIN
    ----------------------------------------- */

    if (addRow) {

        addRow.style.display = 'flex';

    }


    /* -----------------------------------------
       RESET EDITING STATE
    ----------------------------------------- */

    editingTeamGameQuestionIndex = -1;

}

/* =========================================================
   PREPARE TEAM GAME LAUNCH
   ========================================================= */

async function prepareTeamGameLaunch() {

    const section =
        document.getElementById(
            'team-game-section'
        )?.value || '';

    const topic =
        document.getElementById(
            'team-game-topic'
        )?.value || '';

    const duration =
        document.getElementById(
            'team-game-duration'
        )?.value || '15';


    if (!section || !topic) {

        showToast(
            '⚠️',
            'Please select an assigned section and topic first.'
        );

        return;
    }


    if (!teamGameQuestions.length) {

        showToast(
            '⚠️',
            'Please add at least one classroom game question.'
        );

        return;
    }

    if (selectedTeamGameMode === 'crossword') {

    const MAX_CROSSWORD_QUESTIONS = 12;
    const MAX_CROSSWORD_ANSWER_LENGTH = 11;


    /* Check question count */

    if (
        teamGameQuestions.length >
        MAX_CROSSWORD_QUESTIONS
    ) {

        showToast(
            '⚠️',
            `Crossword can only have a maximum of ${MAX_CROSSWORD_QUESTIONS} questions. ` +
            `Please remove ${teamGameQuestions.length - MAX_CROSSWORD_QUESTIONS} question(s).`
        );

        console.warn(
            'CROSSWORD LAUNCH BLOCKED:',
            teamGameQuestions.length,
            'questions'
        );

        return;
    }


    /* Check answer lengths */

    const invalidAnswers =
        teamGameQuestions
            .map((question, index) => {

                const answer =
                    String(
                        question.answer || ''
                    )
                    .trim()
                    .toUpperCase()
                    .replace(/\s/g, '');

                return {
                    questionNumber: index + 1,
                    answer: answer,
                    length: answer.length
                };

            })
            .filter(question =>
                question.length >
                MAX_CROSSWORD_ANSWER_LENGTH
            );


    if (invalidAnswers.length > 0) {

        const firstInvalid =
            invalidAnswers[0];

        showToast(
            '⚠️',
            `Crossword cannot be launched. ` +
            `"${firstInvalid.answer}" is ${firstInvalid.length} letters long. ` +
            `Maximum is ${MAX_CROSSWORD_ANSWER_LENGTH}.`
        );

        console.warn(
            'CROSSWORD LAUNCH BLOCKED — ANSWER TOO LONG:',
            invalidAnswers
        );

        return;
    }

}


    /* =========================================================
   LAUNCH CLASSROOM GAME
   ========================================================= */

   window.pendingTeamGameConfig = {

    mode:
        selectedTeamGameMode,

    section:
        section,

    topic:
        topic,

    duration:
        Number(duration),

    questions:
        teamGameQuestions

};

/* =========================================================
   OPEN CLASSROOM GAME
   ========================================================= */

const gameParams = new URLSearchParams({

    mode: selectedTeamGameMode,

    section: section,

    topic: topic,

    duration: Number(duration)

});


const gameUrl =
    `Game.html?${gameParams.toString()}`;


console.log(
    'Opening classroom game:',
    gameUrl
);


const launchButton = document.getElementById('team-game-launch-btn');
if (launchButton?.disabled) return;
if (launchButton) launchButton.disabled = true;
try {
    const session = await fetch('../assets/php/get_instructor.php', {credentials:'same-origin', cache:'no-store'});
    if (!session.ok) throw new Error('Your session has expired. Sign in again before launching.');
    const account = await session.json();
    if (!account.success) throw new Error('Please sign in as an instructor before launching.');
    if (!await saveTeamGameQuestionsUI()) return;
    window.location.assign(gameUrl);
} catch (error) {
    teamGameFeedback('System', error.message || 'Unable to launch this game.');
} finally {
    if (launchButton) launchButton.disabled = false;
}

console.log(
    'Classroom game opened successfully.'
);
}


/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHtml(value) {

    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

}

/* =========================================================
   GAME MODE INFORMATION
   ========================================================= */

TEAM_GAME_MODE_INFO.kahoot = {
    label: 'Kahoot Battle',
    icon: '⚡',
    description:
        'Fast-paced multiple choice and true/false questions. Teams compete in real time — fastest correct answer earns the most points.'
};

TEAM_GAME_MODE_INFO.hotseat = {
    label: 'The Hot Seat',
    icon: '🔥',
    description:
        'A clue-based team challenge where players race to identify the word or concept.'
};

TEAM_GAME_MODE_INFO.crossword = {
    label: 'Crossword',
    icon: '🧩',
    description:
        'Build clue-and-answer rounds that teams solve together on the shared screen.'
};

TEAM_GAME_MODE_INFO.jumble = {
    label: 'Word Jumble',
    icon: '🔀',
    description:
        'Unscramble words as quickly as possible and keep the classroom competition moving.'
};

/* =========================================================
   SELECT GAME MODE
   ========================================================= */

function selectTeamGameMode(mode, button) {

    if (!TEAM_GAME_MODE_INFO[mode]) {
        return;
    }

    selectedTeamGameMode = mode;

    editingTeamGameQuestionIndex = -1;

    closeTeamGameQuestionEditor();

    document
        .querySelectorAll('.team-game-mode')
        .forEach(item => {

            item.classList.remove('active');

        });

    if (button) {
        button.classList.add('active');
    }

    updateTeamGameModeHeader();

    renderTeamGameQuestions();

    /* -----------------------------------------
   LOAD QUESTIONS FOR NEW MODE
----------------------------------------- */

console.log(
    'Switching classroom game mode:',
    selectedTeamGameMode
);

refreshTeamGameQuestions();
}


/* =========================================================
   UPDATE SELECTED MODE HEADER
   ========================================================= */

function updateTeamGameModeHeader() {

    const info =
        TEAM_GAME_MODE_INFO[selectedTeamGameMode];

    if (!info) {
        return;
    }

    const icon =
        document.getElementById(
            'team-game-selected-mode-icon'
        );

    const label =
        document.getElementById(
            'team-game-selected-mode-label'
        );

    const description =
        document.getElementById(
            'team-game-selected-mode-description'
        );

    if (icon) {
        icon.textContent = info.icon;
    }

    if (label) {
        label.textContent = info.label;
    }

    if (description) {
        description.textContent = info.description;
    }

    renderTeamGameModePanel();

    updateTeamGameQuestionUI();
}


/* =========================================================
   MODE SETTINGS PANEL
   ========================================================= */

function updateTeamGameAddButtonsForMode() {
    const addButtons = document.getElementById(
        'team-game-question-add-buttons'
    );

    const wordBtn = document.getElementById(
        'team-game-add-word-btn'
    );

    const mcBtn = document.getElementById(
        'team-game-add-mc-btn'
    );

    const tfBtn = document.getElementById(
        'team-game-add-tf-btn'
    );

    if (!addButtons) return;

    // Hide everything first
    addButtons.style.display = 'none';

    if (wordBtn) {
        wordBtn.style.display = 'none';
    }

    if (mcBtn) {
        mcBtn.style.display = 'none';
    }

    if (tfBtn) {
        tfBtn.style.display = 'none';
    }

    // -----------------------------------------
    // TEAM BUZZER
    // -----------------------------------------
    if (selectedTeamGameMode === 'buzzer') {

        addButtons.style.display = 'flex';

        if (wordBtn) {
            wordBtn.style.display = '';
            wordBtn.textContent = '+ Add Question';
        }

        return;
    }

    // -----------------------------------------
    // KAHOOT
    // -----------------------------------------
    if (selectedTeamGameMode === 'kahoot') {
        addButtons.style.display = 'flex';

        if (mcBtn) {
            mcBtn.style.display = '';
        }

        if (tfBtn) {
            tfBtn.style.display = '';
        }

        return;
    }

    // -----------------------------------------
    // HOT SEAT / CROSSWORD / WORD JUMBLE
    // -----------------------------------------
    if (
        selectedTeamGameMode === 'hotseat' ||
        selectedTeamGameMode === 'crossword' ||
        selectedTeamGameMode === 'jumble'
    ) {
        addButtons.style.display = 'flex';

        if (wordBtn) {
            wordBtn.style.display = '';
            wordBtn.textContent = '+ Add Question';
        }
    }
}

function renderTeamGameModePanel() {

    const container =
        document.getElementById(
            'team-game-mode-content'
        );

    const addButtons =
        document.getElementById(
            'team-game-question-add-buttons'
        );

    const helper =
        document.getElementById(
            'team-game-question-helper'
        );

    const livePill =
        document.querySelector(
            '.team-game-live-pill'
        );

        updateTeamGameAddButtonsForMode();

    if (!container) {
        return;
    }

        /* =====================================================
       TEAM BUZZER
       ===================================================== */

    if (selectedTeamGameMode === 'buzzer') {

        container.innerHTML = `

            <div class="team-game-info-banner">

                🔔

                <strong>
                    How it works:
                </strong>

                Teams compete to answer the question first.
                The instructor controls which team answered
                correctly from the classroom screen.

            </div>

        `;


        if (addButtons) {
            addButtons.style.display = 'flex';
        }


        const buzzerAddButton =
            document.getElementById(
                'team-game-add-word-btn'
            );


        if (buzzerAddButton) {

            buzzerAddButton.style.display = '';

            buzzerAddButton.textContent =
                '+ Add Question';

        }


        if (helper) {

            helper.textContent =
                'Add questions for each Team Buzzer round.';

        }


        if (livePill) {

            livePill.textContent =
                'CLASSROOM GAME';

        }


        return;
    }


    /* =====================================================
       KAHOOT
       ===================================================== */

    if (selectedTeamGameMode === 'kahoot') {

    container.innerHTML = `

        <div class="team-game-info-banner">

            💡

            <strong>
                How it works:
            </strong>

            Each question is shown on the shared screen.
            Students answer on their device within the
            time limit. Scores can be handled during
            the classroom game.

        </div>

    `;

    if (addButtons) {
        addButtons.style.display = 'flex';
    }

    if (helper) {
        helper.textContent =
            'Mix multiple choice and true/false for variety';
    }

    if (livePill) {
        livePill.textContent =
            'TEAM · REAL-TIME';
    }

    return;
}


    /* =====================================================
       HOT SEAT
       ===================================================== */

    if (selectedTeamGameMode === 'hotseat') {

        container.innerHTML = `

            <div class="team-game-generic-grid">

                <div class="team-game-generic-card">

                    <strong>
                        🔥 Game setup
                    </strong>

                    <span>
                        Players identify a hidden
                        word or concept.
                    </span>

                </div>


                <div class="team-game-generic-card">

                    <strong>
                        📝 Question format
                    </strong>

                    <span>
                        Add a word or concept
                        and a helpful clue.
                    </span>

                </div>

            </div>

        `;

        if (addButtons) {
    addButtons.style.display = 'flex';
}

const hotSeatAddButton =
    document.getElementById('team-game-add-word-btn');

if (hotSeatAddButton) {
    hotSeatAddButton.style.display = '';
    hotSeatAddButton.textContent = '+ Add Question';
}

if (helper) {
    helper.textContent =
        'Add words and clues for each Hot Seat round.';
}

        if (livePill) {
            livePill.textContent =
                'CLASSROOM GAME';
        }

        return;
    }


    /* =====================================================
       CROSSWORD
       ===================================================== */

    if (selectedTeamGameMode === 'crossword') {

        container.innerHTML = `

            <div class="team-game-generic-grid">

                <div class="team-game-generic-card">

                    <strong>
                        🧩 Game setup
                    </strong>

                    <span>
                        Teams solve clues together
                        to identify the answer.
                    </span>

                </div>


                <div class="team-game-generic-card">

                    <strong>
                        📝 Question format
                    </strong>

                    <span>
                        Add an answer and
                        corresponding clue.
                    </span>

                </div>

            </div>

        `;

        if (addButtons) {
    addButtons.style.display = 'flex';
}

const crosswordAddButton =
    document.getElementById('team-game-add-word-btn');

if (crosswordAddButton) {
    crosswordAddButton.style.display = '';
    crosswordAddButton.textContent = '+ Add Question';
}

if (helper) {
    helper.textContent =
        'Add answers and clues for each crossword entry.';
}

        if (livePill) {
            livePill.textContent =
                'CLASSROOM GAME';
        }

        return;
    }


    /* =====================================================
       WORD JUMBLE
       ===================================================== */

    if (selectedTeamGameMode === 'jumble') {

        container.innerHTML = `

            <div class="team-game-generic-grid">

                <div class="team-game-generic-card">

                    <strong>
                        🔀 Game setup
                    </strong>

                    <span>
                        Teams race to unscramble
                        the displayed word.
                    </span>

                </div>


                <div class="team-game-generic-card">

                    <strong>
                        📝 Question format
                    </strong>

                    <span>
                        Add the correct word,
                        jumbled word, and optional hint.
                    </span>

                </div>

            </div>

        `;

        if (addButtons) {
    addButtons.style.display = 'flex';
}

const jumbleAddButton =
    document.getElementById('team-game-add-word-btn');

if (jumbleAddButton) {
    jumbleAddButton.style.display = '';
    jumbleAddButton.textContent = '+ Add Question';
}

if (helper) {
    helper.textContent =
        'Add the correct word, jumbled word, and optional hint.';
}

        if (livePill) {
            livePill.textContent =
                'CLASSROOM GAME';
        }

    }

}


/* =========================================================
   QUESTION COUNTERS
   ========================================================= */

function updateTeamGameQuestionUI() {

    const count =
        document.getElementById(
            'team-game-question-count'
        );

    const mc =
        document.getElementById(
            'team-game-mc-count'
        );

    const tf =
        document.getElementById(
            'team-game-tf-count'
        );

    const points =
        document.getElementById(
            'team-game-points'
        );


    const total =
        teamGameQuestions.length;


    const mcCount =
        teamGameQuestions.filter(
            question =>
                question.question_type === 'multiple_choice'
        ).length;


    const tfCount =
        teamGameQuestions.filter(
            question =>
                question.question_type === 'true_false'
        ).length;


    /* =====================================================
       QUESTION COUNT
       ===================================================== */

    if (count) {

        if (selectedTeamGameMode === 'crossword') {

            count.textContent =
                `(${total} / 12)`;

        } else {

            count.textContent =
                `(${total})`;

        }

    }


    /* =====================================================
       KAHOOT
       ===================================================== */

    if (selectedTeamGameMode === 'kahoot') {

        if (mc) {
            mc.textContent =
                `${mcCount} Multiple Choice`;
        }

        if (tf) {
            tf.style.display = '';
            tf.textContent =
                `${tfCount} True/False`;
        }

        if (points) {
            points.textContent =
                `${(total * 1000).toLocaleString()} pts total`;
        }

    }


    /* =====================================================
       OTHER GAME MODES
       ===================================================== */

    else {

        if (mc) {
            mc.textContent =
                `${total} Questions`;
        }

        if (tf) {
            tf.style.display = 'none';
        }

        if (points) {
            points.textContent =
                'Ready to play';
        }

    }

}


/* =========================================================
   ADD QUESTION
   ========================================================= */

function addTeamGameQuestion(type = 'multiple_choice') {

    /*
     * Crossword has a maximum of 12 questions.
     */

    if (
        selectedTeamGameMode === 'crossword' &&
        teamGameQuestions.length >= MAX_CROSSWORD_QUESTIONS
    ) {

        showToast(
            '⚠️',
            `Crossword can have a maximum of ${MAX_CROSSWORD_QUESTIONS} questions.`
        );

        return;
    }


    editingTeamGameQuestionIndex = -1;


    if (selectedTeamGameMode === 'hotseat') {

        type = 'hotseat';

    }

    else if (selectedTeamGameMode === 'crossword') {

        type = 'crossword';

    }

    else if (selectedTeamGameMode === 'jumble') {

        type = 'jumble';

    }

    else if (selectedTeamGameMode === 'kahoot') {

        /*
         * Keep the type passed by the button:
         * multiple_choice OR true_false
         */

        if (type !== 'true_false') {

            type = 'multiple_choice';

        }

    }


    teamGameQuestionType =
        type;


    openTeamGameQuestionEditor({
        question_type: type
    });

}


/* =========================================================
   OPEN QUESTION EDITOR
   ========================================================= */

function openTeamGameQuestionEditor(question = {}) {

    const container =
        document.getElementById(
            'team-game-question-editor'
        );

    if (!container) {
        console.warn(
            'Question editor not found.'
        );

        return;
    }


    const isEditing =
        editingTeamGameQuestionIndex >= 0;


    container.style.display = 'block';


    container.innerHTML = `

        <div class="team-game-editor-header">

            <h3>
                ${isEditing
                    ? '✏️ Edit Question'
                    : 'Create Question'}
            </h3>

            <button
                type="button"
                class="team-game-editor-close"
                onclick="closeTeamGameQuestionEditor()">

                ✕

            </button>

        </div>


        <div class="team-game-editor-fields">

            ${buildTeamGameEditorFields(question)}

        </div>


        <div class="team-game-editor-actions">

            <button
                type="button"
                class="btn-secondary"
                onclick="closeTeamGameQuestionEditor()">

                Cancel

            </button>


            <button
                type="button"
                class="btn-primary"
                onclick="saveTeamGameQuestion()">

                💾
                ${isEditing
                    ? 'Update Question'
                    : 'Save Question'}

            </button>

        </div>

    `;

}


/* =========================================================
   BUILD QUESTION FIELDS
   ========================================================= */

function buildTeamGameEditorFields(question = {}) {

     /* =====================================================
       TEAM BUZZER
       Question only
       ===================================================== */

    if (
        selectedTeamGameMode === 'buzzer'
    ) {

        return `

            <div class="team-game-form-group">

                <label>
                    Question
                </label>

                <textarea
                    id="team-question-text"
                    rows="4"
                    placeholder="Enter your question..."
                >${escapeHtml(
                    question.question_text ||
                    question.question ||
                    question.text ||
                    ''
                )}</textarea>

            </div>

        `;
    }

    /* =====================================================
       TRUE / FALSE
       ===================================================== */

    if (
        selectedTeamGameMode === 'kahoot' &&
        teamGameQuestionType === 'true_false'
    ) {

        let correctAnswer =
    question.correct_answer ||
    question.answer ||
    'True';


/*
 * Handle older True / False questions
 * that were saved as A/B.
 */
const normalizedCorrect =
    String(correctAnswer)
        .trim()
        .toUpperCase();


if (normalizedCorrect === 'A') {

    correctAnswer = 'True';

}

else if (normalizedCorrect === 'B') {

    correctAnswer = 'False';

}

else if (
    normalizedCorrect !== 'TRUE' &&
    normalizedCorrect !== 'FALSE'
) {

    correctAnswer = 'True';

}

else {

    correctAnswer =
        normalizedCorrect === 'TRUE'
            ? 'True'
            : 'False';

}

        return `

            <div class="team-game-form-group">

                <label>
                    Question
                </label>

                <textarea
                    id="team-question-text"
                    rows="4"
                    placeholder="Enter your question...">${escapeHtml(
                        question.question_text ||
                        question.question ||
                        ''
                    )}</textarea>

            </div>


            <div class="team-game-form-group">

                <label>
                    Correct Answer
                </label>

                <select id="team-question-correct">

                    <option
                        value="True"
                        ${correctAnswer === 'True'
                            ? 'selected'
                            : ''}>

                        True

                    </option>

                    <option
                        value="False"
                        ${correctAnswer === 'False'
                            ? 'selected'
                            : ''}>

                        False

                    </option>

                </select>

            </div>

        `;

    }


    /* =====================================================
       KAHOOT MULTIPLE CHOICE
       ===================================================== */

    if (
        selectedTeamGameMode === 'kahoot'
    ) {

        return `

            <div class="team-game-form-group">

                <label>
                    Question
                </label>

                <textarea
                    id="team-question-text"
                    rows="4"
                    placeholder="Enter your question...">${escapeHtml(
                        question.question_text ||
                        question.question ||
                        ''
                    )}</textarea>

            </div>


            <div class="team-game-form-grid">

                ${buildOptionField(
                    'A',
                    question.option_a || ''
                )}

                ${buildOptionField(
                    'B',
                    question.option_b || ''
                )}

                ${buildOptionField(
                    'C',
                    question.option_c || ''
                )}

                ${buildOptionField(
                    'D',
                    question.option_d || ''
                )}

            </div>


            <div class="team-game-form-group">

                <label>
                    Correct Answer
                </label>

                <select id="team-question-correct">

                    <option value="A"
                        ${getCorrectOption(question) === 'A'
                            ? 'selected'
                            : ''}>
                        A
                    </option>

                    <option value="B"
                        ${getCorrectOption(question) === 'B'
                            ? 'selected'
                            : ''}>
                        B
                    </option>

                    <option value="C"
                        ${getCorrectOption(question) === 'C'
                            ? 'selected'
                            : ''}>
                        C
                    </option>

                    <option value="D"
                        ${getCorrectOption(question) === 'D'
                            ? 'selected'
                            : ''}>
                        D
                    </option>

                </select>

            </div>

        `;

    }


    /* =====================================================
       HOT SEAT
       ===================================================== */

    if (
        selectedTeamGameMode === 'hotseat'
    ) {

        return `

            <div class="team-game-form-group">

                <label>
                    Word / Concept
                </label>

                <input
                    type="text"
                    id="team-hotseat-word"
                    value="${escapeHtml(
                        question.word ||
                        question.answer ||
                        ''
                    )}"
                    placeholder="Example: Agile">

            </div>


            <div class="team-game-form-group">

                <label>
                    Hint
                </label>

                <textarea
                    id="team-hotseat-hint"
                    rows="4"
                    placeholder="Enter a hint...">${escapeHtml(
                        question.hint || ''
                    )}</textarea>

            </div>

        `;

    }


    /* =====================================================
       CROSSWORD
       ===================================================== */

    if (
        selectedTeamGameMode === 'crossword'
    ) {

        return `

            <div class="team-game-form-group">

                <label>
                    Answer
                </label>

                <input
                    type="text"
                    id="team-crossword-answer"
                    value="${escapeHtml(
                        question.answer ||
                        question.correct_answer ||
                        ''
                    )}"
                    placeholder="Example: SCRUM">

            </div>


            <div class="team-game-form-group">

                <label>
                    Clue
                </label>

                <textarea
                    id="team-crossword-clue"
                    rows="4"
                    placeholder="Enter the crossword clue...">${escapeHtml(
                        question.clue ||
                        ''
                    )}</textarea>

            </div>

        `;

    }


    /* =====================================================
       WORD JUMBLE
       ===================================================== */

    if (
        selectedTeamGameMode === 'jumble'
    ) {

        return `

            <div class="team-game-form-group">

                <label>
                    Correct Word
                </label>

                <input
                    type="text"
                    id="team-jumble-word"
                    value="${escapeHtml(
                        question.correct_word ||
                        question.answer ||
                        ''
                    )}"
                    placeholder="Example: DATABASE">

            </div>


            <div class="team-game-form-group">

                <label>
                    Jumbled Word
                </label>

                <input
                    type="text"
                    id="team-jumble-jumbled"
                    value="${escapeHtml(
                        question.jumble ||
                        question.jumbled_word ||
                        ''
                    )}"
                    placeholder="Example: TASABEDA">

            </div>


            <div class="team-game-form-group">

                <label>
                    Optional Hint
                </label>

                <textarea
                    id="team-jumble-hint"
                    rows="4"
                    placeholder="Optional hint...">${escapeHtml(
                        question.hint || ''
                    )}</textarea>

            </div>

        `;

    }


    return '';

}

/* =========================================================
   RENDER CURRENT QUESTIONS
   ========================================================= */

function renderTeamGameQuestions() {

    const container =
        document.getElementById(
            'team-game-question-list'
        );

    if (!container) {
        return;
    }


    /*
     * NO QUESTIONS
     */

    if (!teamGameQuestions.length) {

    container.innerHTML = `
        <div class="team-game-empty">

            <div style="font-size:2rem;">
                📝
            </div>

            <div>

                <strong>
                    No classroom questions yet.
                </strong>

                <p>
                    Add questions for
                    ${
                        TEAM_GAME_MODE_INFO[
                            selectedTeamGameMode
                        ]?.label ||
                        'this game'
                    }.
                </p>

            </div>

        </div>
    `;

    updateTeamGameQuestionUI();
    updateTeamGameLaunchButton();

    return;
}


    /*
     * RENDER QUESTIONS
     */

    container.innerHTML =
        teamGameQuestions
            .map((question, index) => {

                /*
                 * Get the question preview.
                 */

                let preview =
                    getTeamGameQuestionPreview(
                        question
                    );


                /*
                 * Make sure it is a string.
                 */

                preview =
                    String(
                        preview || ''
                    ).trim();


                /*
                 * Limit preview to 50 characters.
                 */

                if (preview.length > 50) {

                    preview =
                        preview.substring(
                            0,
                            50
                        ) + '...';

                }


                return `
                    <div class="team-game-question-card">

                        <div class="team-game-question-number">
                            ${index + 1}
                        </div>


                        <div class="team-game-question-content">

                            <div class="team-game-question-text">
                                ${escapeHtml(preview)}
                            </div>


                            <div class="team-game-question-type">
                                ${escapeHtml(
                                    getTeamGameQuestionTypeLabel(
                                        question
                                    )
                                )}
                            </div>

                        </div>


                        <div class="team-game-question-actions">

                            <button
                                type="button"
                                class="btn-sm"
                                onclick="editTeamGameQuestion(${index})">

                                ✏️ Edit

                            </button>


                            <button
                                type="button"
                                class="btn-sm btn-danger"
                                onclick="deleteTeamGameQuestion(${index})">

                                🗑️ Delete

                            </button>

                        </div>

                    </div>
                `;

            })
            .join('');

    updateTeamGameQuestionUI();
    updateTeamGameLaunchButton();

}


/* =========================================================
   CLOSE QUESTION EDITOR
   ========================================================= */

function closeTeamGameQuestionEditor() {

    const container =
        document.getElementById(
            'team-game-question-editor'
        );

    if (container) {

        container.innerHTML = '';

        container.style.display =
            'none';

    }

    editingTeamGameQuestionIndex =
        -1;

}



/* =========================================================
   LAUNCH BUTTON STATE
   ========================================================= */

function updateTeamGameLaunchButton() {

    const button =
        document.getElementById(
            'team-game-launch-btn'
        );

    if (!button) {
        return;
    }


    const section =
        document.getElementById(
            'team-game-section'
        )?.value || '';

    const topic =
        document.getElementById(
            'team-game-topic'
        )?.value || '';


    const total =
        teamGameQuestions.length;


    /*
     * Crossword maximum question limit
     */

    const crosswordLimitReached =
        selectedTeamGameMode === 'crossword' &&
        total > 12;


    /*
     * Normal launch requirements
     */

    const ready =
        Boolean(
            section &&
            topic &&
            total > 0 &&
            !crosswordLimitReached
        );


    button.disabled =
        !ready;


    button.classList.toggle(
        'ready',
        ready
    );

}


/* =========================================================
   INITIAL TEAM GAME UI
   ========================================================= */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        const modal =
            document.getElementById(
                'modal-team-games'
            );

        if (!modal) {
            return;
        }


        /*
         * Make Kahoot the initial UI mode.
         */

        selectedTeamGameMode =
            'kahoot';


        document
            .querySelectorAll(
                '.team-game-mode'
            )
            .forEach(button => {

                button.classList.toggle(
                    'active',
                    button.dataset.gameMode ===
                    'kahoot'
                );

            });


        updateTeamGameModeHeader();

        renderTeamGameQuestions();

    }
);

function populateReportSectionFilter() {

    const select =
        document.getElementById('rp-section');

    if (!select) return;

    const sections = [
        ...new Set(
            (instructorAssignments || [])
                .map(a => String(a.section || '').trim())
                .filter(Boolean)
        )
    ];

    const previous = select.value;

    select.innerHTML = '<option value="">All Sections</option>';

    sections.forEach(section => {
        const option = document.createElement('option');
        option.value = section;
        option.textContent = section;
        select.appendChild(option);
    });

    if (sections.includes(previous)) {
        select.value = previous;
    }
}



function openCreateModal() {

    // Configure buttons for CREATE mode
    setQuizModalAction(false);

    selectQuizMode('formal');

    document.getElementById('edit-modal-title').textContent =
        'Create New Quiz';

    document.getElementById('editing-quiz-id').value =
        '';

    document.getElementById('e-title').value =
        '';

    populateQuizAssignmentDropdowns();

    const sectionSelect =
    document.getElementById('e-section');

if (sectionSelect) {

    const assignedSections = [
        ...new Set(
            instructorAssignments
                .map(a =>
                    String(a.section || '').trim()
                )
                .filter(Boolean)
        )
    ];

    // Clear existing section options
    sectionSelect.innerHTML = '';

    // Add only the instructor's assigned sections
    assignedSections.forEach(section => {

        const option =
            document.createElement('option');

        option.value = section;
        option.textContent = section;

        sectionSelect.appendChild(option);
    });

    // Automatically select the first assigned section
    if (assignedSections.length > 0) {
        sectionSelect.value =
            assignedSections[0];
    }
}

    document.getElementById('e-mode').value =
        'formal';

    document.getElementById('e-type').value =
        'Team Battle';

    document.getElementById('e-due').value =
        (() => {

            const d = new Date();

            d.setDate(
                d.getDate() + 7
            );

            return d
                .toISOString()
                .split('T')[0];

        })();

    document.getElementById('e-time').value =
        '30';

    document.getElementById('e-xp').value =
        '150';

    document.getElementById('e-instructions').value =
        '';

    clearQuestions();

    openModal('modal-edit');
}

function openEditQuizModal(quizId) {

    const q =
        quizzes.find(
            x => x.id === quizId
        );

    if (!q) return;


    // Configure buttons for EDIT mode
    setQuizModalAction(true);


    document.getElementById(
        'edit-modal-title'
    ).textContent =
        'Edit Quiz – ' + q.title;


    // Store the quiz ID we are editing
    document.getElementById(
        'editing-quiz-id'
    ).value =
        quizId;


    document.getElementById(
    'e-title'
).value =
    q.title;

document.getElementById(
    'e-subject'
).value =
    q.subject;

populateQuizAssignmentDropdowns(
    q.subject,
    q.section
);

    // Set quiz mode and update the active button
    selectQuizMode(
        q.mode || 'formal'
    );


    document.getElementById(
        'e-type'
    ).value =
        q.type;


    document.getElementById(
        'e-due'
    ).value =
        q.due;


    document.getElementById(
        'e-time'
    ).value =
        q.time;


    document.getElementById(
        'e-xp'
    ).value =
        q.xpReward || 150;


    document.getElementById(
        'e-instructions'
    ).value =
        q.instructions || '';


    // Remove old questions from the form
    clearQuestions();


    // Load existing questions
    q.questions.forEach(
        qObj => {

            addQuestion(
                'e-questions',
                'q-count',
                qObj.type,
                qObj
            );

        }
    );


    openModal(
        'modal-edit'
    );
}

function openEditDraftModal(draftId) {

  console.log("DRAFT BUTTON CLICKED:", draftId);

  const d = drafts.find(x => x.id == draftId);

  console.log("DRAFT FOUND:", d);

  if (!d) {
    console.log("Draft not found.");
    return;
  }

  document.getElementById('edit-modal-title').textContent =
      'Edit Draft – ' + d.title;

  document.getElementById('editing-quiz-id').value =
      'draft-' + draftId;

  document.getElementById('e-title').value =
      d.title;

    populateQuizAssignmentDropdowns(
      d.subject,
      d.section
  );

  selectQuizMode(
      d.mode || 'formal'
  );

  document.getElementById('e-type').value =
      d.type;

  document.getElementById('e-due').value =
      d.due || '';

  document.getElementById('e-time').value =
      d.time || 30;

  document.getElementById('e-xp').value =
      d.xpReward || 150;

  document.getElementById('e-instructions').value =
      d.instructions || '';

  clearQuestions();

  d.questions.forEach(qObj =>
      addQuestion(
          'e-questions',
          'q-count',
          qObj.type,
          qObj
      )
  );

  openModal('modal-edit');
}

function collectFormData() {
  const title = document.getElementById('e-title').value.trim();
  if (!title) { showToast('⚠️', 'Please enter a quiz title.'); return null; }
  const xpRaw = parseInt(document.getElementById('e-xp').value);
  if (!xpRaw || xpRaw < 50) { showToast('⚠️', 'Please set an XP reward (minimum 50).'); return null; }

  // Collect questions from the question builder
  const qItems = document.querySelectorAll('#e-questions .q-item');
  if (!qItems.length) { showToast('⚠️', 'Please add at least 1 question.'); return null; }

  const questions = [];
  let valid = true;
  qItems.forEach((item) => {
    const type = item.getAttribute('data-type');
    const text = item.querySelector('.q-input').value.trim();
    if (!text) { valid = false; return; }
    if (type === 'mc') {
      const choiceInputs = item.querySelectorAll('.q-choice-input');
      const choices = [...choiceInputs].map(c => c.value.trim());
      if (choices.some(c => !c)) { valid = false; return; }
      const correctVal = item.querySelector('.q-correct-select').value;
      questions.push({ type: 'mc', text, choices, correct: parseInt(correctVal) });
    } else {
      questions.push({ type: 'id', text });
    }
  });

  if (!valid) { showToast('⚠️', 'Please fill in all question fields and answer choices.'); return null; }
  if (!questions.length) { showToast('⚠️', 'Please add at least 1 question.'); return null; }

  return {
    title,
    subject: document.getElementById('e-subject').value,
    section: document.getElementById('e-section').value,

    mode: document.getElementById('e-mode').value,

    type: document.getElementById('e-type').value,
    due: document.getElementById('e-due').value,
    time: parseInt(document.getElementById('e-time').value) || 30,
    xpReward: xpRaw,
    instructions: document.getElementById('e-instructions').value,
    questions
};
}

async function saveDraft() {

    const data =
        collectFormData();

    if (!data) {
        return;
    }


    /*
    |--------------------------------------------------------------------------
    | MARK AS DRAFT
    |--------------------------------------------------------------------------
    */

    data.status =
        'draft';


    const saveButton =
        document.getElementById(
            'save-draft-btn'
        );


    try {

        /*
        |--------------------------------------------------------------------------
        | PREVENT DOUBLE CLICKING
        |--------------------------------------------------------------------------
        */

        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.textContent =
                'Saving...';

        }


        /*
        |--------------------------------------------------------------------------
        | SEND DRAFT TO PHP
        |--------------------------------------------------------------------------
        */

        const response =
            await fetch(
                '../assets/php/get_quiz.php',
                {

                    method:
                        'POST',

                    credentials:
                        'same-origin',

                    headers: {

                        'Content-Type':
                            'application/json'

                    },

                    body:
                        JSON.stringify(
                            data
                        )

                }
            );

            /*
|--------------------------------------------------------------------------
| READ RESPONSE SAFELY
|--------------------------------------------------------------------------
*/


        const responseText = await response.text();
        console.log('POST get_quiz.php status:', response.status);
console.log('POST get_quiz.php response:', responseText);


let result;

try {
    result = responseText ? JSON.parse(responseText) : {};
} catch (parseError) {
    console.error('Invalid JSON from get_quiz.php:', responseText);
    throw new Error(
        `Server returned invalid JSON (HTTP ${response.status}).`
    );
}

        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(

                result.message ||
                'Failed to save draft.'

            );

        }


        /*
        |--------------------------------------------------------------------------
        | ADD SAVED DRAFT TO UI
        |--------------------------------------------------------------------------
        */

        const savedDraft =
            result.quiz;


        drafts.push({

            ...savedDraft,

            icon:
                '📝'

        });


        /*
        |--------------------------------------------------------------------------
        | UPDATE UI
        |--------------------------------------------------------------------------
        */

        closeModal(
            'modal-edit'
        );


        renderQuizzes();


        showToast(

            '💾',

            `"${data.title}" saved as draft!`

        );


    } catch (error) {

        console.error(
            'Error saving draft:',
            error
        );


        showToast(

            '⚠️',

            error.message ||
            'Failed to save draft.'

        );


    } finally {

        /*
        |--------------------------------------------------------------------------
        | RESTORE BUTTON
        |--------------------------------------------------------------------------
        */

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                '💾 Save as Draft';

        }

    }

}

async function parseApiResponse(response) {
    const text = await response.text();

    console.log('API status:', response.status);
    console.log('API response:', text);

    if (!text.trim()) {
        throw new Error(
            `Server returned an empty response (HTTP ${response.status}).`
        );
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('Invalid JSON response:', text);
        throw new Error(
            `Server returned invalid JSON (HTTP ${response.status}).`
        );
    }
}

async function updateQuiz() {

    const data =
        collectFormData();


    if (!data) {
        return;
    }


    const quizId =
        Number(
            document.getElementById(
                'editing-quiz-id'
            ).value
        );


    if (!quizId) {

        showToast(
            '⚠️',
            'Invalid quiz ID.'
        );

        return;
    }


    /*
    --------------------------------------------------
    PREPARE UPDATE DATA
    --------------------------------------------------
    */

    data.action =
        'update';

    data.quiz_id =
        quizId;

    // Keep the quiz posted/active
    data.status =
        'active';


    const saveButton =
        document.getElementById(
            'post-quiz-btn'
        );


    try {

        /*
        --------------------------------------------------
        PREVENT DOUBLE CLICK
        --------------------------------------------------
        */

        if (saveButton) {

            saveButton.disabled =
                true;

            saveButton.textContent =
                'Saving...';
        }


        /*
        --------------------------------------------------
        SEND UPDATE REQUEST
        --------------------------------------------------
        */

        const response =
            await fetch(
                '../assets/php/get_quiz.php',
                {

                    method:
                        'POST',

                    credentials:
                        'same-origin',

                    headers: {

                        'Content-Type':
                            'application/json'

                    },

                    body:
                        JSON.stringify(
                            data
                        )

                }
            );


        const result =
            await parseApiResponse(
                response
            );


        /*
        --------------------------------------------------
        CHECK RESPONSE
        --------------------------------------------------
        */

        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                'Failed to update quiz.'
            );
        }


        /*
        --------------------------------------------------
        UPDATE LOCAL QUIZ ARRAY
        --------------------------------------------------
        */

        const quizIndex =
            quizzes.findIndex(
                q => q.id === quizId
            );


        if (quizIndex !== -1) {

            quizzes[quizIndex] = {

                // Keep existing UI-only data
                ...quizzes[quizIndex],

                // Replace with updated database data
                ...result.quiz,

                // Make sure it remains active
                status:
                    'active',

                // Keep existing icon
                icon:
                    quizzes[quizIndex].icon ||
                    '📝'

            };
        }


        /*
        --------------------------------------------------
        REFRESH INSTRUCTOR UI
        --------------------------------------------------
        */

        renderQuizzes();


        closeModal(
            'modal-edit'
        );


        showToast(
            '💾',
            `"${data.title}" updated successfully!`
        );


    } catch (error) {

        console.error(
            'Error updating quiz:',
            error
        );


        showToast(
            '⚠️',
            error.message ||
            'Failed to update quiz.'
        );


    } finally {

        /*
        --------------------------------------------------
        RESTORE BUTTON
        --------------------------------------------------
        */

        if (saveButton) {

            saveButton.disabled =
                false;

            saveButton.textContent =
                '💾 Save Quiz';
        }
    }
}


async function postQuiz() {

    const data =
        collectFormData();


    if (!data) {
        return;
    }

    data.status = 'active';


    const postButton =
        document.getElementById(
            'post-quiz-btn'
        );


    try {

        /*
        |--------------------------------------------------------------------------
        | PREVENT DOUBLE CLICKING
        |--------------------------------------------------------------------------
        */

        if (postButton) {

            postButton.disabled =
                true;

            postButton.textContent =
                'Posting, please wait.....';

        }


        /*
        |--------------------------------------------------------------------------
        | SEND QUIZ TO PHP
        |--------------------------------------------------------------------------
        */

        const response =
            await fetch(
                '../assets/php/get_quiz.php',
                {

                    method:
                        'POST',

                    credentials:
                        'same-origin',

                    headers: {

                        'Content-Type':
                            'application/json'

                    },

                    body:
                        JSON.stringify(data)

                }
            );


        /*
        |--------------------------------------------------------------------------
        | READ RESPONSE
        |--------------------------------------------------------------------------
        */

        const result =
            await parseApiResponse(response);


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(

                result.message ||
                'Failed to post quiz.'

            );

        }


        /*
        |--------------------------------------------------------------------------
        | ADD DATABASE QUIZ TO CURRENT UI
        |--------------------------------------------------------------------------
        */

        const savedQuiz =
            result.quiz;


        quizzes.push({

            ...savedQuiz,

            icon:
                '📝',

            stats: {

                completed:
                    0,

                inProgress:
                    0,

                avgScore:
                    0,

                alignment:
                    0,

                xp:
                    50

            },

            submissions:
                []

        });


        /*
        |--------------------------------------------------------------------------
        | TEACHING XP
        |--------------------------------------------------------------------------
        */

        teachingXP += 50;

        updateInstructorXPProgress();


        
const xpDisplay = document.getElementById('xp-display');

if (xpDisplay) {
    xpDisplay.textContent =
        teachingXP.toLocaleString() + ' XP';
}



        /*
        |--------------------------------------------------------------------------
        | UPDATE UI
        |--------------------------------------------------------------------------
        */

        closeModal(
            'modal-edit'
        );


        renderQuizzes();


        showToast(

            '🚀',

            `"${data.title}" posted successfully! +50 Teaching XP`

        );


    } catch (error) {

        console.error(
            'Error posting quiz:',
            error
        );


        showToast(

            '⚠️',

            error.message ||
            'Failed to post quiz.'

        );


    } finally {

        /*
        |--------------------------------------------------------------------------
        | RESTORE BUTTON
        |--------------------------------------------------------------------------
        */

        if (postButton) {

            postButton.disabled =
                false;

            postButton.textContent =
                '🚀 Post Quiz';

        }

    }

}

/* ── POST DRAFT ─────────────────────────────────────────────── */
async function confirmPostDraft(draftId) {

    console.log("POST DRAFT CLICKED:", draftId);

    const d = drafts.find(
        x => x.id == draftId
    );

    console.log("DRAFT FOUND:", d);

    if (!d) {
        console.error(
            "Draft not found:",
            draftId
        );
        return;
    }

    showConfirm(
        `Post "${d.title}"?`,
        'This will publish the quiz and make it visible to students.',
        '🚀 Post Quiz',
        async () => {

            try {

                console.log(
                    "Publishing draft:",
                    draftId
                );

                const response = await fetch(
                    '../assets/php/get_quiz.php',
                    {
                        method: 'POST',

                        credentials: 'same-origin',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            action: 'publish',
                            quiz_id: Number(draftId)
                        })
                    }
                );

                const result =
                    await response.json();

                console.log(
                    "Publish API response:",
                    result
                );

                if (
                    !response.ok ||
                    !result.success
                ) {
                    throw new Error(
                        result.message ||
                        'Failed to publish draft.'
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | REMOVE FROM DRAFTS
                |--------------------------------------------------------------------------
                */

                drafts = drafts.filter(
                    x => x.id != draftId
                );


                /*
                |--------------------------------------------------------------------------
                | ADD TO QUIZZES
                |--------------------------------------------------------------------------
                */

                quizzes.push({
                    ...d,
                    id: Number(draftId),
                    status: 'active',
                    icon: '📝'
                });


                /*
                |--------------------------------------------------------------------------
                | UPDATE UI
                |--------------------------------------------------------------------------
                */

                renderQuizzes();
                renderDrafts();


                showToast(
                    '🚀',
                    `"${d.title}" posted successfully!`
                );


                console.log(
                    "Draft successfully published."
                );


            } catch (error) {

                console.error(
                    "Error publishing draft:",
                    error
                );

                showToast(
                    '⚠️',
                    error.message ||
                    'Failed to publish draft.'
                );
            }
        }
    );
}

/* ── REMOVE QUIZ ────────────────────────────────────────────── */
async function confirmRemoveQuiz(quizId) {

    const q =
        quizzes.find(
            x => x.id === quizId
        );


    if (!q) {

        console.error(
            'Quiz not found:',
            quizId
        );

        return;
    }


    showConfirm(

        `Remove "${q.title}"?`,

        'This will permanently remove the quiz.',

        'Remove Quiz',

        async () => {

            try {

                console.log(
                    'Deleting posted quiz:',
                    quizId
                );


                /*
                --------------------------------------------------
                SEND DELETE REQUEST TO PHP
                --------------------------------------------------
                */

                const response =
                    await fetch(
                        '../assets/php/get_quiz.php',
                        {

                            method:
                                'POST',

                            credentials:
                                'same-origin',

                            headers: {

                                'Content-Type':
                                    'application/json'

                            },

                            body:
                                JSON.stringify({

                                    action:
                                        'delete',

                                    quiz_id:
                                        Number(quizId)

                                })

                        }
                    );


                /*
                --------------------------------------------------
                READ RESPONSE
                --------------------------------------------------
                */

                const result =
                    await parseApiResponse(
                        response
                    );


                console.log(
                    'Delete API response:',
                    result
                );


                /*
                --------------------------------------------------
                CHECK IF DELETE FAILED
                --------------------------------------------------
                */

                if (
                    !response.ok ||
                    !result.success
                ) {

                    throw new Error(

                        result.message ||
                        'Failed to delete quiz.'

                    );

                }


                /*
                --------------------------------------------------
                REMOVE FROM LOCAL ARRAY
                ONLY AFTER DATABASE DELETE SUCCEEDS
                --------------------------------------------------
                */

                quizzes =
                    quizzes.filter(
                        x => x.id !== quizId
                    );


                /*
                --------------------------------------------------
                REFRESH QUIZ CARDS
                --------------------------------------------------
                */

                renderQuizzes();


                /*
                --------------------------------------------------
                SUCCESS MESSAGE
                --------------------------------------------------
                */

                showToast(

                    '🗑️',

                    `"${q.title}" deleted successfully.`

                );


                console.log(
                    'Quiz successfully deleted.'
                );


            } catch (error) {

                console.error(
                    'Error deleting quiz:',
                    error
                );


                showToast(

                    '⚠️',

                    error.message ||
                    'Failed to delete quiz.'

                );

            }

        }

    );

}


/* ── REMOVE DRAFT ───────────────────────────────────────────── */
async function confirmRemoveDraft(draftId) {

    console.log("DELETE DRAFT CLICKED:", draftId);

    const d = drafts.find(
        x => x.id == draftId
    );

    console.log("DRAFT FOUND:", d);

    if (!d) {
        console.error(
            "Draft not found:",
            draftId
        );
        return;
    }

    showConfirm(
        `Delete "${d.title}"?`,
        'This draft will be permanently deleted.',
        'Delete Draft',
        async () => {

            try {

                console.log(
                    "Deleting draft:",
                    draftId
                );

                const response = await fetch(
                    '../assets/php/get_quiz.php',
                    {
                        method: 'POST',

                        credentials: 'same-origin',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({
                            action: 'delete',
                            quiz_id: Number(draftId)
                        })
                    }
                );

                const result =
                    await response.json();

                console.log(
                    "Delete API response:",
                    result
                );

                if (
                    !response.ok ||
                    !result.success
                ) {
                    throw new Error(
                        result.message ||
                        'Failed to delete draft.'
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | REMOVE FROM LOCAL ARRAY
                |--------------------------------------------------------------------------
                */

                drafts = drafts.filter(
                    x => x.id != draftId
                );


                /*
                |--------------------------------------------------------------------------
                | UPDATE UI
                |--------------------------------------------------------------------------
                */

                renderDrafts();


                showToast(
                    '🗑️',
                    `"${d.title}" deleted successfully.`
                );


                console.log(
                    "Draft successfully deleted."
                );


            } catch (error) {

                console.error(
                    "Error deleting draft:",
                    error
                );

                showToast(
                    '⚠️',
                    error.message ||
                    'Failed to delete draft.'
                );
            }
        }
    );
}


/* ── QUESTION BUILDER ───────────────────────────────────────── */
function clearQuestions() {
  document.getElementById('e-questions').innerHTML = '';
  eqCount = 0;
  document.getElementById('q-count').textContent = '0';
}

function addQuestion(listId, countId, type = 'mc', existing = null) {
  eqCount++;
  const id  = 'q-' + Date.now() + '-' + eqCount;
  const div = document.createElement('div');
  div.className   = 'q-item';
  div.id          = id;
  div.setAttribute('data-type', type);

  const textVal = existing ? existing.text.replace(/"/g, '&quot;') : '';

  if (type === 'mc') {
    const choices = existing?.choices || ['', '', '', ''];
    const correctIdx = existing?.correct ?? 0;
    div.innerHTML = `
      <div class="q-item-header">
        <div class="q-num">${eqCount}</div>
        <span class="q-type-tag q-type-mc">Multiple Choice</span>
        <button class="q-remove" onclick="removeQ('${id}','${listId}','${countId}')">✕</button>
      </div>
      <input class="q-input" placeholder="Type your question here..." value="${textVal}">
      <div class="q-choices">
        ${choices.map((c, i) => `
          <div class="q-choice-row">
            <span class="q-choice-letter">${['A','B','C','D'][i]}</span>
            <input class="q-choice-input" placeholder="Choice ${['A','B','C','D'][i]}" value="${c.replace(/"/g, '&quot;')}">
          </div>`).join('')}
      </div>
      <div class="q-correct-row">
        <label class="q-correct-label">Correct Answer:</label>
        <select class="q-correct-select">
          ${['A','B','C','D'].map((l, i) => `<option value="${i}" ${correctIdx === i ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>`;
  } else {
    div.innerHTML = `
      <div class="q-item-header">
        <div class="q-num">${eqCount}</div>
        <span class="q-type-tag q-type-id">Identification</span>
        <button class="q-remove" onclick="removeQ('${id}','${listId}','${countId}')">✕</button>
      </div>
      <input class="q-input" placeholder="Type your identification question here..." value="${textVal}">
      <div class="q-id-note">📝 Students will type their answer. You will manually grade this.</div>`;
  }

  document.getElementById(listId).appendChild(div);
  updateQCount(listId, countId);
}

function removeQ(id, listId, countId) {
  document.getElementById(id)?.remove();
  renumberQ(listId, countId);
}

function renumberQ(listId, countId) {
  document.querySelectorAll('#' + listId + ' .q-num').forEach((el, i) => el.textContent = i + 1);
  updateQCount(listId, countId);
}

function updateQCount(listId, countId) {
  const n  = document.querySelectorAll('#' + listId + ' .q-item').length;
  const el = document.getElementById(countId);
  if (el) el.textContent = n;
  eqCount = n;
}


/* ── GRADE MODAL ────────────────────────────────────────────── */
function openGradeModal() {
  // Show only submissions that still have Identification
  // answers awaiting manual grading.
  const allSubs = quizzes.flatMap(q =>
    (q.submissions || [])
      .filter(s =>
        Array.isArray(q.questions) &&
        q.questions.some((question, qi) =>
          question.type === 'id' &&
          s.answers?.[qi]?.correct == null
        )
      )
      .map(s => ({
        ...s,
        quizTitle: q.title,
        quizId: q.id,
        questions: q.questions,
        quizSection: q.section
      }))
  );

  document.getElementById('submission-list').innerHTML = allSubs.length
    ? allSubs.map((s, i) => `
        <div class="submission-card" id="sub-card-${i}">
          <div class="sub-header">
            <div>
              <div class="sub-name">${s.name}</div>
              <div class="sub-quiz">${s.quizTitle}</div>
              <div class="sub-tags">
                <span class="sub-tag">${s.quizSection}</span>
                <span class="sub-tag time">Submitted recently</span>
                <span class="sub-tag sub-tag-pending">
                  ⚠️ ID answers pending
                </span>
              </div>
            </div>

            <div class="sub-grade">
              <span class="g-pct" id="g-pct-${i}"
                style="color:${s.score >= 80 ? 'var(--green)' : 'var(--gold)'}">
                ${s.score}%
              </span>
              <span class="g-lbl">Needs review</span>
            </div>
          </div>

          <div class="sub-btns">
            <button class="btn-sub-view"
              onclick="closeModal('modal-grade');openResultsModal(${s.quizId})">
              View Full Submission
            </button>

            <button class="btn-approve" id="appr-${i}"
              onclick="approveGrade(${i},'${s.name}')">
              Approve Grade
            </button>

            <button class="btn-adjust"
              onclick="openAdjustModal(${i},'${s.name}',${s.score},${s.quizId})">
              Adjust
            </button>
          </div>
        </div>
      `).join('')
    : '<div class="empty-state"><span class="emoji">✅</span><p>No Identification submissions need grading!</p></div>';

  openModal('modal-grade');
  updateGradeCount();
}

async function approveGrade(i, name) {
  const btn = document.getElementById('appr-' + i);
  if (!btn) return;

  // Locate the submission using the same flattened list as the modal.
  const allSubs = quizzes.flatMap(q =>
    q.submissions.map(s => ({
      ...s,
      quizId: q.id
    }))
  );

  const submission = allSubs[i];
  const submissionId = Number(submission?.submissionId);

  if (!submissionId) {
    showToast('⚠️', 'Database submission ID is missing.');
    return;
  }

  if (submission.status !== 'graded') {
    showToast('⚠️', 'Finish grading all identification answers first.');
    return;
  }

  btn.disabled = true;

  try {
    const response = await fetch('../assets/php/approve_submission.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        submission_id: submissionId
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to approve grade.');
    }

    // Update the corresponding submission in the local quiz data.
    const quiz = quizzes.find(q => Number(q.id) === Number(submission.quizId));
    const savedSubmission = quiz?.submissions.find(
      s => Number(s.submissionId) === submissionId
    );

    if (savedSubmission) {
      savedSubmission.gradeApproved = 1;
    }

    btn.classList.add('approved');
    btn.textContent = '✓ Approved';
    btn.disabled = true;
    btn.onclick = null;

    showToast('✅', `Grade approved for ${name}!`);
    updateGradeCount();
  } catch (error) {
    console.error('Approve grade error:', error);
    showToast('⚠️', error.message || 'Could not save grade approval.');
    btn.disabled = false;
  }
}

/* ── ADJUST GRADE MODAL ─────────────────────────────────────── */
let _adjustTarget = null;

function openAdjustModal(subIdx, name, currentScore, quizId) {
  _adjustTarget = { subIdx, name, currentScore, quizId };

  document.getElementById('adj-modal-title').textContent  = `Adjust Grade — ${name}`;
  document.getElementById('adj-current-score').textContent = currentScore + '%';
  document.getElementById('adj-score-input').value         = currentScore;
  document.getElementById('adj-reason').value              = '';

  // Update preview as slider/input changes
  const input   = document.getElementById('adj-score-input');
  const preview = document.getElementById('adj-score-preview');
  input.oninput = () => {
    const v = Math.min(100, Math.max(0, parseInt(input.value) || 0));
    preview.textContent = v + '%';
    preview.style.color = v >= 80 ? 'var(--green)' : 'var(--gold)';
  };
  preview.textContent = currentScore + '%';
  preview.style.color = currentScore >= 80 ? 'var(--green)' : 'var(--gold)';

  closeModal('modal-grade');
  openModal('modal-adjust-grade');
}

function saveAdjustedGrade() {
  if (!_adjustTarget) return;
  const { subIdx, name, quizId } = _adjustTarget;
  const newScore = Math.min(100, Math.max(0, parseInt(document.getElementById('adj-score-input').value) || 0));
  const reason   = document.getElementById('adj-reason').value.trim();

  if (isNaN(newScore)) { showToast('⚠️', 'Please enter a valid score.'); return; }

  // Find and update the submission score in quizzes data
  let found = false;
  quizzes.forEach(q => {
    if (q.id === quizId) {
      const sub = q.submissions[subIdx] || q.submissions.find((s, i) => i === subIdx);
      if (sub) {
        sub.score = newScore;
        sub.xp    = Math.round((newScore / 100) * q.xpReward);
        found = true;
      }
    }
  });

  closeModal('modal-adjust-grade');
  showToast('✏️', `Score for ${name} adjusted to ${newScore}%.${reason ? ' Reason: ' + reason : ''}`);

  // Re-open grade modal so instructor can continue reviewing
  setTimeout(() => openGradeModal(), 300);
}

function updateGradeCount() {
  const pending = quizzes.reduce((total, q) => {
    return total + (q.submissions || []).filter(s =>
      Array.isArray(q.questions) &&
      q.questions.some((question, qi) =>
        question.type === 'id' &&
        s.answers?.[qi]?.correct == null
      )
    ).length;
  }, 0);

  const label = document.getElementById('grade-count-label');

  if (label) {
    label.textContent = pending > 0
      ? `${pending} Identification submission${pending !== 1 ? 's' : ''} pending`
      : 'No Identification submissions pending';
  }
}


/* ── REPORTS MODAL ──────────────────────────────────────────── */
function openReportsModal() {
  renderReports();
  openModal('modal-reports');
}

function renderReports() {
  const secFilter = document.getElementById('rp-section')?.value || '';
  let list = students;
  if (secFilter) list = list.filter(s => s.section === secFilter);
  document.getElementById('report-list').innerHTML = list.map(s => `
    <div class="report-row" onclick="openStudentDetail(${students.indexOf(s)});closeModal('modal-reports')">
      <div class="rp-avatar">${s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
      <div class="rp-info"><strong>${s.name}</strong><span>ID: ${s.id} &bull; ${s.section}</span></div>
      <div class="rp-scores">
        <div class="rp-score-item"><span class="rp-lbl">Informal</span><span class="rp-val">${Math.round(s.score * 0.95)}%</span></div>
        <div class="rp-score-item"><span class="rp-lbl">Formal</span><span class="rp-val">${s.score}%</span></div>
        <div class="rp-score-item"><span class="rp-lbl">Overall</span><span class="rp-val rp-overall">${Math.round(s.score * 1.02)}%</span></div>
      </div>
      <button class="btn-rp-view" onclick="event.stopPropagation();openStudentDetail(${students.indexOf(s)});closeModal('modal-reports')">View Details</button>
    </div>`).join('');
}


/* ── SUBJECT ANALYTICS MODAL ────────────────────────────────── */
function openSubjectAnalytics(subject, section, avg, totalStudents, totalQuizzes, completion) {
  document.getElementById('sa-modal-title').textContent = `📊 ${subject} — ${section}`;

  // Filter students in this section and get their scores for this subject
  const sectionStudents = students.filter(s => s.section === section);
  const subjectScores   = sectionStudents
    .map(s => ({ name: s.name, score: s.quizScores[subject] || null }))
    .filter(s => s.score !== null)
    .sort((a, b) => b.score - a.score);

  const passing   = subjectScores.filter(s => s.score >= 80).length;
  const perfect   = subjectScores.filter(s => s.score === 100).length;
  const failing   = subjectScores.filter(s => s.score < 80).length;

  const scoreRows = subjectScores.length
    ? subjectScores.map(s => `
        <div class="sa-score-row">
          <span class="sa-score-name">${s.name}</span>
          <div class="sa-score-bar-wrap">
            <div class="sa-score-bar" style="width:${s.score}%;background:${s.score >= 90 ? 'linear-gradient(90deg,#4ade80,#22c55e)' : s.score >= 80 ? 'linear-gradient(90deg,#4f8ef7,#7c5cbf)' : 'linear-gradient(90deg,#f59e0b,#f97316)'}"></div>
          </div>
          <span class="sa-score-val" style="color:${s.score >= 80 ? 'var(--green)' : 'var(--gold)'}">${s.score}%</span>
        </div>`).join('')
    : '<div style="font-size:.8rem;color:var(--text-muted);text-align:center;padding:1rem">No quiz scores available yet.</div>';

  document.getElementById('sa-modal-body').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.65rem;margin-bottom:1.25rem">
      <div class="sa-stat-box"><div class="sa-stat-val" style="color:var(--green)">${avg}%</div><div class="sa-stat-lbl">Class Avg</div></div>
      <div class="sa-stat-box"><div class="sa-stat-val" style="color:var(--blue)">${totalStudents}</div><div class="sa-stat-lbl">Students</div></div>
      <div class="sa-stat-box"><div class="sa-stat-val" style="color:var(--gold)">${passing}</div><div class="sa-stat-lbl">Passing</div></div>
      <div class="sa-stat-box"><div class="sa-stat-val" style="color:var(--pink-light)">${failing}</div><div class="sa-stat-lbl">Failing</div></div>
    </div>
    <div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:1rem;margin-bottom:1rem">
      <div style="font-size:.75rem;font-weight:700;color:rgba(255,255,255,.6);margin-bottom:.35rem">Completion Rate</div>
      <div style="height:8px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden;margin-bottom:.3rem">
        <div style="height:100%;width:${completion}%;background:linear-gradient(90deg,#4ade80,#22d3ee);border-radius:99px"></div>
      </div>
      <div style="font-size:.72rem;color:var(--text-muted)">${completion}% of students completed assigned quizzes</div>
    </div>
    <div style="font-size:.8rem;font-weight:700;color:rgba(255,255,255,.7);margin-bottom:.75rem">📋 Student Scores</div>
    <div class="sa-scores-list">${scoreRows}</div>`;

  openModal('modal-subject-analytics');
}


/* ── INSTRUCTOR LEADERBOARD ───────────────────────────────────
   Pulls from the same `students` array used in My Students.
   Later this should query the shared students/XP table so it
   stays in sync with the student portal's own leaderboard.
   ──────────────────────────────────────────────────────────── */
function setInstrLbSection(section, btn) {
  instrLbSection = section;
  document.querySelectorAll('.lb-sec-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderInstrLeaderboard();
}

function renderInstrLeaderboard() {

    // =====================================================
    // GET STUDENTS
    // =====================================================

    let list = students.slice();


    // =====================================================
    // NORMALIZE + FILTER BY SECTION
    // =====================================================

    if (instrLbSection !== 'All') {

        const selectedSection =
            normalizeInstructorSection(instrLbSection);

        list = list.filter(student => {

            const studentSection =
                normalizeInstructorSection(student.section);

            return studentSection === selectedSection;

        });
    }


    // =====================================================
    // SORT BY XP — HIGHEST FIRST
    // =====================================================

    list.sort((a, b) => {

        const xpDifference =
            Number(b.xp || 0) - Number(a.xp || 0);

        // If XP is tied, use average score
        if (xpDifference !== 0) {
            return xpDifference;
        }

        return Number(b.score || 0) - Number(a.score || 0);

    });


    // =====================================================
    // PODIUM
    // =====================================================

    const podiumEl =
        document.getElementById('lb-podium');

    if (podiumEl) {

        const top3 =
            list.slice(0, 3);

        const order =
            [1, 0, 2];

        podiumEl.innerHTML =
            order
                .filter(i => top3[i])
                .map(i => {

                    const s =
                        top3[i];

                    const lvl =
                        getStudentLevel(
                            Number(s.xp || 0)
                        );

                    const crown =
                        i === 0
                            ? '<span class="podium-crown">👑</span>'
                            : '';

                    const baseCls =
                        i === 0
                            ? 'p1-base'
                            : i === 1
                                ? 'p2-base'
                                : 'p3-base';

                    const rankNum =
                        i + 1;

                    const initials =
                        String(s.name || '')
                            .split(' ')
                            .map(n => n[0])
                            .join('')
                            .slice(0, 2);

                    return `
                        <div class="podium-slot">

                            ${crown}

                            <div
                                class="podium-avatar ${studentFrameClass(s.level_xp ?? s.xp)}"
                                style="background:${avatarColors[i % avatarColors.length]}"
                            >
                                ${initials}
                            </div>

                            <div class="podium-name">
                                ${s.name}
                            </div>

                            <div class="podium-xp">
                                ⭐ ${Number(s.xp || 0).toLocaleString()}
                            </div>

                            <div class="podium-base ${baseCls}">
                                ${rankNum}
                            </div>

                        </div>
                    `;

                })
                .join('');

    }


    // =====================================================
    // LEADERBOARD TABLE
    // =====================================================

    const tbody =
        document.getElementById('lb-table-body');

    if (!tbody) {
        return;
    }


    // No students
    if (!list.length) {

        tbody.innerHTML = `
            <div class="empty-state">
                <span class="emoji">🔍</span>
                <p>No students found.</p>
            </div>
        `;

        return;
    }


    // =====================================================
    // RENDER TABLE
    // =====================================================

    tbody.innerHTML =
        list.map((s, i) => {

            const rank =
                i + 1;

            const xp =
                Number(s.xp || 0);

            const score =
                Number(s.score || 0);

            const lvl =
                getStudentLevel(xp);

            const rankCls =
                rank === 1
                    ? 'r1'
                    : rank === 2
                        ? 'r2'
                        : rank === 3
                            ? 'r3'
                            : '';

            const medal =
                rank <= 3
                    ? ['🥇', '🥈', '🥉'][rank - 1]
                    : rank;

            const initials =
                String(s.name || '')
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .slice(0, 2);

            return `
                <div
                    class="lb-row ${rank <= 5 ? 'lb-top lb-top-' + rank : ''}"
                    onclick="openStudentDetail(${students.indexOf(s)})"
                >

                    <span class="lb-rank-num ${rankCls}">
                        ${medal}
                    </span>


                    <div class="lb-student">

                        <div
                            class="lb-s-avatar ${studentFrameClass(s.level_xp ?? s.xp)}"
                            style="background:${avatarColors[i % avatarColors.length]}"
                        >
                            ${initials}
                        </div>

                        <div>

                            <div class="lb-s-name">
                                ${s.name}
                            </div>

                            <div class="lb-s-level">
                                ${s.id}
                            </div>

                        </div>

                    </div>


                    <span class="lb-cell">
                        ${s.section}
                    </span>


                    <span class="level-pill ${lvl.cls}">
                        Lv.${lvl.num} ${lvl.name}
                    </span>


                    <span class="lb-cell-xp">
                        ⭐ ${xp.toLocaleString()}
                    </span>


                    <span class="lb-cell-score">
                        ${score}%
                    </span>

                </div>
            `;

        })
        .join('');
}

/* ── XP POPUP ───────────────────────────────────────────────── */

function toggleXpPopup() {
    const popup = document.getElementById('xp-popup');

    if (!popup) {
        console.error('XP popup element not found.');
        return;
    }

    popup.classList.toggle('open');
}

function closeXpPopup() {
    document.getElementById('xp-popup')
        ?.classList.remove('open');
}

document.addEventListener('click', function (event) {
    const badge = document.getElementById('xp-badge-btn');
    const popup = document.getElementById('xp-popup');

    if (
        badge &&
        popup &&
        !badge.contains(event.target)
    ) {
        popup.classList.remove('open');
    }
});


function closeXpPopup() {
  document.getElementById('xp-popup').classList.remove('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('#xp-badge-btn')) {
    document.getElementById('xp-popup')?.classList.remove('open');
  }
});

function normalizeInstructorSection(section) {
    return String(section || '')
        .trim()
        .replace(/^SECTION\s+/i, '')
        .trim();
}


function renderStudentSectionFilters() {
    const container = document.getElementById('student-section-filters');

    if (!container) return;

    const sections = [...new Set(
        (instructorAssignments || [])
            .map(a => normalizeInstructorSection(a.section))
            .filter(Boolean)
    )].sort();

    container.innerHTML = `
        <button
            class="filter-btn ${currentFilter === 'All' ? 'active' : ''}"
            data-section="All"
            onclick="setFilter(this, 'All')">
            All Sections
        </button>
    `;

    sections.forEach(section => {
        const button = document.createElement('button');

        button.className =
            `filter-btn ${currentFilter === section ? 'active' : ''}`;

        button.dataset.section = section;
        button.textContent = section;

        button.onclick = function () {
            setFilter(this, section);
        };

        container.appendChild(button);
    });

    // If the previously selected section no longer exists,
    // return to All Sections.
    if (
        currentFilter !== 'All' &&
        !sections.includes(currentFilter)
    ) {
        currentFilter = 'All';

        const allButton =
            container.querySelector('[data-section="All"]');

        if (allButton) {
            allButton.classList.add('active');
        }
    }
}

function renderInstructorTeachingInfo() {

    const yearBadge =
        document.getElementById('teaching-year-badge');

    const loadGrid =
        document.getElementById('teaching-load-grid');

    if (!yearBadge || !loadGrid) return;

    const assignments = (instructorAssignments || [])
        .filter(a =>
            a &&
            a.subject_name &&
            a.section
        );

    // =========================================
    // DETERMINE YEAR LEVEL FROM ASSIGNED SECTIONS
    // =========================================

    const years = [...new Set(
        assignments
            .map(a => {
                const section =
                    normalizeInstructorSection(a.section);

                // Example:
                // BSIT 1A → 1
                // BSIT 1B → 1
                // BSIT 2A → 2
                // BSIT 3A → 3

                const match =
                    section.match(/\b(\d+)[A-Z]\b/i);

                return match
                    ? parseInt(match[1], 10)
                    : null;
            })
            .filter(year => year !== null)
    )].sort((a, b) => a - b);


    function getYearLabel(year) {

        if (year === 1) return '1st Year';
        if (year === 2) return '2nd Year';
        if (year === 3) return '3rd Year';
        if (year === 4) return '4th Year';

        return `${year}th Year`;
    }


    // =========================================
    // YEAR BADGE
    // =========================================

    if (years.length === 1) {

        yearBadge.textContent =
            getYearLabel(years[0]);

    } else if (years.length > 1) {

        yearBadge.textContent =
            years.map(getYearLabel).join(' / ');

    } else {

        yearBadge.textContent = '—';
    }


    // =========================================
    // TEACHING LOAD
    // =========================================

    if (!assignments.length) {

        loadGrid.innerHTML = `
            <div class="empty-state instructor-empty-state" role="status">
                <span class="emoji">📚</span>
                <p>No teaching assignments found.</p>
                <small class="empty-state-hint">Your assigned subjects and sections will appear here when your teaching load is set up.</small>
            </div>
        `;

        return;
    }


    loadGrid.innerHTML = assignments.map(assignment => {

        const subject =
            assignment.subject_name || 'Unknown Subject';

        const type =
            assignment.assignment_type || 'Subject';

        const section =
            normalizeInstructorSection(
                assignment.section
            );

        return `
            <div class="tl-item">

                <span class="tl-dot"></span>

                <span class="tl-sub">
                    ${subject}
                </span>

                &nbsp;

                <span class="tl-cat">
                    ${type} · ${section}
                </span>

            </div>
        `;

    }).join('');
}


function renderLeaderboardSectionFilters() {
    const container =
        document.getElementById('leaderboard-section-filters');

    if (!container) return;

    const sections = [...new Set(
        (instructorAssignments || [])
            .map(a => normalizeInstructorSection(a.section))
            .filter(Boolean)
    )].sort();

    container.innerHTML = `
        <button
            class="lb-sec-tab ${instrLbSection === 'All' ? 'active' : ''}"
            onclick="setInstrLbSection('All', this)">
            All Sections
        </button>
    `;

    sections.forEach(section => {
        const button = document.createElement('button');

        button.className =
            `lb-sec-tab ${instrLbSection === section ? 'active' : ''}`;

        button.textContent = section;

        button.onclick = function () {
            setInstrLbSection(section, this);
        };

        container.appendChild(button);
    });

    // If the previously selected section no longer exists,
    // return to All Sections.
    if (
        instrLbSection !== 'All' &&
        !sections.includes(instrLbSection)
    ) {
        instrLbSection = 'All';

        const allButton =
            container.querySelector('.lb-sec-tab');

        if (allButton) {
            allButton.classList.add('active');
        }
    }
}

function renderTeachingSections() {

    const container =
        document.getElementById('teaching-sections-container');

    if (!container) return;

    const assignments = (instructorAssignments || [])
        .filter(a =>
            a &&
            a.subject_name &&
            a.section
        );

    if (!assignments.length) {

        container.innerHTML = `
            <div class="empty-state instructor-empty-state" role="status">
                <span class="emoji">📚</span>
                <p>No teaching assignments found.</p>
                <small class="empty-state-hint">Your assigned subjects and sections will appear here when your teaching load is set up.</small>
            </div>
        `;

        return;
    }


    // =====================================================
    // GROUP ASSIGNMENTS BY SECTION
    // =====================================================

    const sections = {};

    assignments.forEach(assignment => {

        const section =
            normalizeInstructorSection(
                assignment.section
            );

        if (!sections[section]) {
            sections[section] = [];
        }

        sections[section].push(assignment);
    });


    // =====================================================
    // HELPER — GET QUIZZES FOR SECTION + SUBJECT
    // =====================================================

    function getSubjectQuizzes(section, subject) {

        return (quizzes || []).filter(q => {

            const quizSection =
                normalizeInstructorSection(q.section);

            const quizSubject =
                String(q.subject || '')
                    .trim()
                    .toLowerCase();

            const targetSubject =
                String(subject || '')
                    .trim()
                    .toLowerCase();

            return (
                quizSection === section &&
                quizSubject === targetSubject
            );

        });

    }


    // =====================================================
    // RENDER
    // =====================================================

    container.innerHTML = '';


    Object.entries(sections).forEach(
        ([section, sectionAssignments]) => {

            // ---------------------------------------------
            // STUDENTS IN THIS SECTION
            // ---------------------------------------------

            const sectionStudents =
                (students || []).filter(s =>
                    normalizeInstructorSection(
                        s.section
                    ) === section
                );

            const totalStudents =
                sectionStudents.length;


            // ---------------------------------------------
            // SUBJECT CARDS
            // ---------------------------------------------

            const subjectCards =
                sectionAssignments.map(assignment => {

                    const subject =
                        assignment.subject_name;

                    const assignmentType =
                        assignment.assignment_type ||
                        'Subject';

                    const subjectQuizzes =
                        getSubjectQuizzes(
                            section,
                            subject
                        );

                    const totalQuizzes =
                        subjectQuizzes.length;


                    // -------------------------------------
                    // ALL SUBMISSIONS FOR THIS SUBJECT
                    // -------------------------------------

                    const submissions =
                        subjectQuizzes.flatMap(q =>
                            Array.isArray(q.submissions)
                                ? q.submissions
                                : []
                        );


                    // -------------------------------------
                    // CLASS AVERAGE
                    // -------------------------------------

                    const scores =
                        submissions
                            .map(s => Number(s.score))
                            .filter(
                                score =>
                                    Number.isFinite(score)
                            );

                    const classAverage =
                        scores.length
                            ? Math.round(
                                scores.reduce(
                                    (sum, score) =>
                                        sum + score,
                                    0
                                ) / scores.length
                            )
                            : 0;


                    // -------------------------------------
                    // COMPLETION RATE
                    // -------------------------------------

                    const expectedSubmissions =
                        totalStudents *
                        totalQuizzes;

                    const completion =
                        expectedSubmissions > 0
                            ? Math.min(
                                100,
                                Math.round(
                                    (
                                        submissions.length /
                                        expectedSubmissions
                                    ) * 100
                                )
                            )
                            : 0;


                    // -------------------------------------
                    // SUBJECT CARD
                    // -------------------------------------

                    return `
                        <div class="subject-card">

                            <div class="subject-card-top">

                                <div>
                                    <div class="subject-card-name">
                                        ${subject}
                                    </div>

                                    <div class="subject-card-type">
                                        ${assignmentType}
                                    </div>
                                </div>


                                <div class="subject-card-right">

                                    <div class="class-avg">

                                        <span class="class-avg-label">
                                            Class Avg
                                        </span>

                                        <span
                                            class="class-avg-value"
                                            style="color:${
                                                classAverage >= 80
                                                    ? 'var(--green)'
                                                    : 'var(--gold)'
                                            }"
                                        >
                                            ${classAverage}%
                                        </span>

                                    </div>

                                    <button
                                        class="subject-analytics-btn"
                                        onclick="openSubjectAnalytics(
                                            ${JSON.stringify(subject)},
                                            ${escapeHtml(JSON.stringify(section))},
                                            ${classAverage},
                                            ${totalStudents},
                                            ${totalQuizzes},
                                            ${completion}
                                        )"
                                        title="View subject analytics"
                                    >
                                        📊
                                    </button>

                                </div>

                            </div>


                            <div class="subject-card-stats">

                                <div class="subject-stat">

                                    <strong>
                                        ${totalStudents}
                                    </strong>

                                    <span>
                                        Students
                                    </span>

                                </div>


                                <div class="subject-stat">

                                    <strong>
                                        ${totalQuizzes}
                                    </strong>

                                    <span>
                                        Quizzes
                                    </span>

                                </div>


                                <div class="subject-stat">

                                    <strong>
                                        ${completion}%
                                    </strong>

                                    <span>
                                        Completion
                                    </span>

                                </div>

                            </div>


                            <div class="subject-progress">

                                <div
                                    class="subject-progress-fill"
                                    style="width:${completion}%"
                                ></div>

                            </div>

                        </div>
                    `;

                }).join('');


            // =================================================
            // SECTION CARD
            // =================================================

            const sectionBlock =
                document.createElement('div');

            sectionBlock.className =
                'section-block fade-up-3';


            sectionBlock.innerHTML = `

                <div class="section-block-header">

                    <div>

                        <h3>
                            ${section}
                        </h3>

                        <div class="sec-meta">

                            ${sectionStudents.length}
                            student${sectionStudents.length !== 1 ? 's' : ''}

                        </div>

                    </div>


                    <span class="subj-pill">

                        ${sectionAssignments.length}
                        subject${sectionAssignments.length !== 1 ? 's' : ''}

                    </span>


                    <button
                        class="btn-view-students"
                        onclick="viewStudentsForSection(
                            ${escapeHtml(JSON.stringify(section))}
                        )"
                    >
                        View Students
                    </button>

                </div>


                <div class="subject-cards">

                    ${subjectCards}

                </div>

            `;


            container.appendChild(sectionBlock);

        }
    );
}


async function loadInstructorAssignments() {
    try {
        const res = await fetch("../assets/php/get_instructor_assignments.php", {
            method: "GET",
            credentials: "same-origin"
        });

        if (res.status === 401) {
            console.error("Instructor session expired.");
            return;
        }

        const data = await res.json();

        if (!data.success) {
            console.error("Failed to load teaching assignments:", data.message);
            return;
        }

        instructorAssignments =
    data.assignments || [];

console.log(
    'Instructor assignments loaded:',
    instructorAssignments)
       

        const rows = document.querySelectorAll(".assignment-row");

        // Clear existing rows
        rows.forEach(row => {
            row.style.display = "none";
        });

        // Display the assignments returned by PHP
        instructorAssignments = data.assignments || [];
        populateReportSectionFilter();

instructorAssignments.forEach((assignment, index) => {
            if (!rows[index]) return;

            const row = rows[index];

            const name = row.querySelector(".asgn-name");
            const sub = row.querySelector(".asgn-sub");
            const type = row.querySelector(".asgn-type");
            const pct = row.querySelector(".asgn-pct");

            if (name) {
                name.textContent = assignment.subject_name;
            }

            if (sub) {
                sub.textContent = assignment.section;
            }

            if (type) {
                type.textContent = assignment.assignment_type;
            }

            // We don't have percentage/load data yet
            if (pct) {
                pct.textContent = "";
            }

            row.style.display = "";
        });

    } catch (err) {
        console.error("Error loading teaching assignments:", err);
    }

     renderTeachingSections();
     renderInstructorTeachingInfo();
     renderStudentSectionFilters();
    renderLeaderboardSectionFilters();
}



async function loadQuizzes() {
    try {
        console.log('Loading quizzes from database...');

        const response = await fetch('../assets/php/get_quiz.php', {
            method: 'GET',
            credentials: 'same-origin'
        });

        const result = await parseApiResponse(response);

        console.log('Quiz API response:', result);

       console.log('GET get_quiz.php status:', response.status);
console.log('GET get_quiz.php response:', result);

if (!response.ok || !result.success) {
    throw new Error(
        `HTTP ${response.status}: ${result.message || 'Failed to load quizzes.'}`
    );
}

        quizzes = (result.quizzes || []).map(q => ({
            ...q,

            icon: q.icon || '📝',

            stats: q.stats || {
                completed: 0,
                inProgress: 0,
                avgScore: 0,
                alignment: 0,
                xp: 0
            },

            submissions: q.submissions || [],

            questions: q.questions || []
        }));

        drafts = quizzes.filter(
    q => q.status === 'draft'
);

        console.log('Quizzes loaded:', quizzes);

        renderQuizzes();
        renderTeachingSections();
        renderAnalyticsReferencePanels();

    } catch (error) {

        console.error('Error loading quizzes:', error);

        renderQuizzes();
        
    }
}

async function loadInstructorStudents() {

    try {

        console.log(
            'Loading instructor students from database...'
        );


        const response =
            await fetch(

                '../assets/php/get_instructor_students.php',

                {
                    method: 'GET',

                    credentials: 'same-origin',

                    cache: 'no-store'
                }

            );


        const result =
            await parseApiResponse(
                response
            );


        console.log(
            'Instructor students API response:',
            result
        );


        if (

            !response.ok ||

            !result.success

        ) {

            throw new Error(

                result.message ||
                'Failed to load instructor students.'

            );

        }


        /*
        |--------------------------------------------------------------------------
        | UPDATE EXISTING STUDENTS ARRAY
        |--------------------------------------------------------------------------
        |
        | We use splice instead of:
        |
        | students = result.students
        |
        | because students is declared as const.
        |
        */

        students.splice(

            0,

            students.length,

            ...(result.students || [])

        );


        console.log(

            'Instructor students loaded:',

            students

        );


        /*
        |--------------------------------------------------------------------------
        | UPDATE STUDENT ROSTER
        |--------------------------------------------------------------------------
        */

        renderStudents(
            students
        );
        renderTeachingSections();
        renderInstrLeaderboard();
        renderAnalyticsReferencePanels();


        /*
        |--------------------------------------------------------------------------
        | UPDATE CLASS INSIGHT
        |--------------------------------------------------------------------------
        */

        if (

            typeof renderClassInsight ===
            'function'

        ) {

            renderClassInsight();

        }

        renderAnalyticsReferencePanels();

    } catch (error) {


        console.error(

            'Error loading instructor students:',

            error

        );


        /*
        | Keep the UI functional even if
        | the database request fails.
        */

        renderStudents(
            students
        );

    }

}



/* =========================================================
   ANALYTICS — reference-style detail panels
   Uses the same live quizzes, submissions, students and
   assignments already loaded by the instructor dashboard.
========================================================= */

async function loadInstructorQuizEvaluations() {
    try {
        const response = await fetch("../assets/php/quiz_alignment.php", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Failed to load quiz evaluations.");
        }

        instructorQuizEvaluations = Array.isArray(data.evaluations)
            ? data.evaluations
            : [];

        console.log(
            "Instructor quiz evaluations loaded:",
            instructorQuizEvaluations
        );

    } catch (error) {
        console.error("Error loading instructor quiz evaluations:", error);
        instructorQuizEvaluations = [];
    }
}


function renderAnalyticsReferencePanels() {
    const byId = id => document.getElementById(id);
    const safeArray = value => Array.isArray(value) ? value : [];
    const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
    const pct = value => `${Math.round(num(value))}%`;
    const scoreValues = [];
    const allSubmissions = [];

    safeArray(quizzes).forEach(q => {
        safeArray(q.submissions).forEach(sub => {
            allSubmissions.push({ ...sub, quiz: q });
            if (sub.score !== null && sub.score !== undefined && sub.score !== '' && Number.isFinite(Number(sub.score))) {
                scoreValues.push(num(sub.score));
            }
        });
    });

    const now = new Date();
    const monthQuizzes = safeArray(quizzes).filter(q => {
        const rawDate = q.created_at || q.createdAt || q.created_on || q.date_created;
        if (!rawDate) return true; // API currently may not return quiz creation dates
        const date = new Date(rawDate);
        return !Number.isNaN(date.getTime()) && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
    const formalCount = monthQuizzes.filter(q => String(q.mode || '').toLowerCase() === 'formal').length;
    const informalCount = monthQuizzes.filter(q => String(q.mode || '').toLowerCase() === 'informal').length;
    const pendingReview = allSubmissions.filter(({quiz:q, ...sub}) =>
        safeArray(q.questions).some((question, qi) =>
            question.type === 'id' && sub.answers?.[qi]?.correct == null
        )
    ).length;
    const completedCount = allSubmissions.filter(s => s.score !== null && s.score !== undefined && s.score !== '').length;
    const completionRate = allSubmissions.length ? Math.round(completedCount / allSubmissions.length * 100) : 0;

    const activity = byId('analytics-activity-stats');
    if (activity) {
        activity.innerHTML = [
            ['formal','Formal Quizzes','Battle modes',formalCount,'analytics-purple'],
            ['informal','Informal Quizzes','Homework & practice',informalCount,'analytics-blue'],
            ['submissions','Submissions Received',`${completionRate}% with scores`,allSubmissions.length,'analytics-green'],
            ['pending','Pending Review','Awaiting grading',pendingReview,'analytics-orange']
        ].map((item) => `<div class="analytics-activity-stat"><span class="num ${item[4]}">${item[3]}</span><span class="label">${item[1]}</span><span class="sub">${item[2]}</span></div>`).join('');
    }

    const bands = [
        {label:'Excellent (95–100%)',min:95,max:100,color:'#22c55e'},
        {label:'Good (85–94%)',min:85,max:94.999,color:'#3b82f6'},
        {label:'Fair (75–84%)',min:75,max:84.999,color:'#f59e0b'},
        {label:'Needs Work (<75%)',min:0,max:74.999,color:'#ef4444'}
    ];
    const quality = byId('analytics-quality-distribution');
    if (quality) {
        quality.innerHTML = scoreValues.length ? bands.map(b => {
            const count = scoreValues.filter(s => s >= b.min && s <= b.max).length;
            const share = Math.round(count / scoreValues.length * 100);
            return `<div class="analytics-quality-row"><div class="analytics-quality-head"><span>${b.label}</span><strong>${share}%</strong></div><div class="analytics-quality-track"><div class="analytics-quality-fill" style="width:${share}%;background:${b.color}"></div></div></div>`;
        }).join('') : '<div class="analytics-empty">Score distribution will appear after students submit scored quizzes.</div>';
    }

    const xp = num(typeof teachingXP !== 'undefined' ? teachingXP : 0);
    const xpLevel = typeof getTeachingLevel === 'function' ? getTeachingLevel(xp) : {num: Math.max(1, Math.floor(xp / 500) + 1), name:'Educator'};
    const xpMilestones = [0, 500, 1000, 1600, 2200, 3000];
    const nextMilestone = xpMilestones.find(value => value > xp) || xp + 500;
    const progress = Math.min(100, Math.max(0, (xp / nextMilestone) * 100));
    const xpProgress = byId('analytics-xp-progress');
    if (xpProgress) xpProgress.innerHTML = `<div class="analytics-xp-level"><div class="analytics-xp-level-icon">${xpLevel.num || 1}</div><div class="analytics-xp-level-info"><strong>Level ${xpLevel.num || 1} — ${xpLevel.name || 'Educator'}</strong><span>${xp.toLocaleString()} / ${nextMilestone.toLocaleString()} XP toward next milestone</span><div class="analytics-progress-track"><div class="analytics-progress-fill" style="width:${progress}%;background:linear-gradient(90deg,#a45bc8,#e879f9)"></div></div></div></div>`;

    const subjectRows = new Map();

// Get assigned subjects first
const assignmentSubjects = safeArray(instructorAssignments)
    .filter(a => a.subject_name);

assignmentSubjects.forEach(a => {
    const subject = String(a.subject_name || '').trim();
    const key = subject.toLowerCase();

    if (!subject || !key) return;

    if (!subjectRows.has(key)) {
        subjectRows.set(key, {
            subject,
            sections: [],
            alignment: [],
            xp: 0
        });
    }

    const row = subjectRows.get(key);

    if (a.section && !row.sections.includes(a.section)) {
        row.sections.push(a.section);
    }
});

// Accumulate XP from formal quizzes
safeArray(quizzes)
    .filter(q =>
        q.mode === 'formal' &&
        q.type !== 'Homework' &&
        q.type !== 'Practice'
    )
    .forEach(q => {
        const key = String(q.subject || '').trim().toLowerCase();
        const row = subjectRows.get(key);

        if (row) {
            row.xp += num(q.stats?.xp);
        }
    });

// Match admin evaluations to assigned subjects
safeArray(instructorQuizEvaluations).forEach(evaluation => {
    const key = String(evaluation.subject || '').trim().toLowerCase();
    const row = subjectRows.get(key);

    const value = Number(evaluation.alignment_percentage);

    if (row && Number.isFinite(value)) {
        row.alignment.push(value);
    }
});

// Prepare subject rows
const subjects = [...subjectRows.values()].map(row => ({
    subject: row.subject,
    section: row.sections.join(', '),
    xp: row.xp,
    alignment: row.alignment.length
        ? row.alignment.reduce((sum, value) => sum + value, 0) / row.alignment.length
        : null
}));

// Render syllabus alignment progress bars
const syllabus = byId('analytics-syllabus-subjects');

if (syllabus) {
    syllabus.innerHTML = subjects.length
        ? subjects.map(row => {
            const value = row.alignment;
            const width = value === null
                ? 0
                : Math.max(0, Math.min(100, value));

            return `
                <div class="analytics-subject-row">
                    <div class="analytics-subject-top">
                        <span>${row.subject}</span>

                        <span class="analytics-subject-meta">
                            ${row.section || 'Assigned subject'}
                            ${row.xp ? ` • +${Math.round(row.xp)} XP` : ''}
                            <strong>
                                ${value === null ? 'No evaluations yet' : pct(value)}
                            </strong>
                        </span>
                    </div>

                    <div class="analytics-subject-track">
                        <div
                            class="analytics-subject-fill"
                            style="width:${width}%">
                        </div>
                    </div>
                </div>
            `;
        }).join('')
        : '<div class="analytics-empty">Your assigned subjects will appear here when teaching assignments load.</div>';
}

// Calculate overall alignment using all evaluated quizzes
const knownAlignments = subjects.filter(s => s.alignment !== null);

const evaluationValues = safeArray(instructorQuizEvaluations)
    .map(e => Number(e.alignment_percentage))
    .filter(value => Number.isFinite(value));

const overall = evaluationValues.length
    ? evaluationValues.reduce((sum, value) => sum + value, 0) / evaluationValues.length
    : null;

const overallEl = byId('analytics-overall-alignment');

if (overallEl) {
    overallEl.innerHTML = `
        <span>✓ Overall syllabus alignment</span>
        <strong style="color:${overall !== null && overall >= 85 ? '#4ade80' : '#fbbf24'}">
            ${overall === null ? 'No alignment data yet' : pct(overall)}
        </strong>
    `;
}

    const sectionNames = [...new Set([
        ...safeArray(students).map(s => String(s.section || '').trim()).filter(Boolean),
        ...safeArray(instructorAssignments).map(a => String(a.section || '').trim()).filter(Boolean)
    ])].sort();
    const sectionWrap = byId('analytics-section-performance');
    if (sectionWrap) {
        sectionWrap.innerHTML = sectionNames.length ? sectionNames.map(section => {
            const sectionStudents = safeArray(students).filter(s => String(s.section || '').trim() === section);
            const studentScores = sectionStudents.map(s => num(s.score)).filter((score, i) => sectionStudents[i]?.score !== null && sectionStudents[i]?.score !== undefined && sectionStudents[i]?.score !== '');
            const passing = studentScores.length ? Math.round(studentScores.filter(s => s >= 80).length / studentScores.length * 100) : null;
            const formalScores = allSubmissions.filter(s => String(s.quiz?.section || '').trim() === section && String(s.quiz?.mode || '').toLowerCase() === 'formal' && s.score !== null && s.score !== undefined && s.score !== '').map(s => num(s.score));
            const informalScores = allSubmissions.filter(s => String(s.quiz?.section || '').trim() === section && String(s.quiz?.mode || '').toLowerCase() === 'informal' && s.score !== null && s.score !== undefined && s.score !== '').map(s => num(s.score));
            const avg = arr => arr.length ? Math.round(arr.reduce((sum,v)=>sum+v,0)/arr.length) : null;
            return `<div class="analytics-section-card"><div class="analytics-section-head"><div><strong>${section}</strong><small>${sectionStudents.length} students • ${new Set(assignmentSubjects.filter(a => String(a.section || '').trim() === section).map(a => a.subject_name)).size} subjects</small></div><div style="text-align:right"><div class="analytics-section-score" style="color:${passing !== null && passing >= 80 ? '#4ade80' : '#fbbf24'}">${passing === null ? '—' : `${passing}%`}</div><small>passing (80%+)</small></div></div><div class="analytics-section-substats"><div class="analytics-section-substat"><strong>${avg(formalScores) === null ? '—' : `${avg(formalScores)}%`}</strong><span>Formal avg</span></div><div class="analytics-section-substat"><strong>${avg(informalScores) === null ? '—' : `${avg(informalScores)}%`}</strong><span>Informal avg</span></div></div></div>`;
        }).join('') : '<div class="analytics-empty">Section performance will appear when students or teaching assignments are available.</div>';
    }

    const sourceEl = byId('analytics-xp-sources');
    if (sourceEl) {
        const sourceRows = subjects.filter(s => s.xp > 0).sort((a,b)=>b.xp-a.xp).slice(0,4);
        sourceEl.innerHTML = sourceRows.length ? sourceRows.map(s => `<div class="analytics-xp-source"><span>📚 ${s.subject}${s.alignment !== null ? ` — ${Math.round(s.alignment)}% alignment` : ''}</span><strong>+${Math.round(s.xp)} XP</strong></div>`).join('') : '<div class="analytics-empty">XP sources will appear as quiz alignment and XP data become available.</div>';
    }
    const tipEl = byId('analytics-xp-tip');
    if (tipEl) {
        const lowest = knownAlignments.slice().sort((a,b)=>a.alignment-b.alignment)[0];
        tipEl.textContent = lowest
            ? `💡 Improve ${lowest.subject} alignment (${Math.round(lowest.alignment)}%) to strengthen syllabus coverage and unlock more teaching XP.`
            : '💡 Add quiz alignment data to see subject-specific recommendations for earning more Teaching XP.';
    }

    const years = safeArray(instructorAssignments).map(a => a.year_level || a.year || a.program_year).filter(Boolean);
    const yearLabel = years.length ? [...new Set(years)].join(' / ') : 'Your teaching load';
    ['analytics-year-badge','analytics-section-year-badge'].forEach(id => { const el = byId(id); if (el) el.textContent = yearLabel; });
}


/* ── INIT ───────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', async () => {
    renderStudents(students);

    updateGradeCount();

    renderFlaggedQuestions();


    await loadInstructorAnnouncements();
    await loadInstructorAssignments();
    await loadInstructorQuizEvaluations();
    await loadInstructorStudents();
    await loadQuizzes();
    await loadInstructorFlags();
    await loadInstructorQuizNotifications();

    /* Initialize the instructor XP popup */
if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        updateInstructorXPProgress
    );
} else {
    updateInstructorXPProgress();
}


    if (

        typeof renderClassInsight ===
        'function'

    ) {

        renderClassInsight();

    }
});

setInterval(() => { if (!document.hidden) loadInstructorQuizNotifications(); }, 30000);
