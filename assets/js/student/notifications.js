
/* ═══════════════════════════════════════════════════════════
   notifications.js — Student Portal
   Handles:
   1. Announcement banner/inbox (from admin)
   2. New quiz notification (from instructor)
   3. Flag question button (during quiz)

   FLAG STORAGE NOTE:
   Flags are stored locally in `studentFlaggedQuestions` using
   the SAME field shape instructor.js's `flaggedQuestions` array
   uses (id, quizId, questionIndex, status, studentName,
   studentSection, reason, time). This keeps both sides
   shape-compatible for when the PHP/SQL backend lands — at
   that point this just becomes an INSERT into a shared `flags`
   table instead of a local array, and instructor.js reads from
   the same table instead of its own hardcoded array.

   Until then, student and instructor portals are separate page
   loads with separate memory, so a flag submitted here does NOT
   appear in the instructor dashboard live — that cross-portal
   sync is explicitly deferred to the backend phase.
═══════════════════════════════════════════════════════════ */

/* ── DEMO DATA (replaced by PHP/MySQL later) ── */
const demoAnnouncements = [{
    id: 'ann-demo-1',
    title: 'System Maintenance',
    body: 'The system will undergo maintenance tonight from 10:00 PM to 12:00 AM.',
    target: 'All Students',
    priority: 'Important',
    sentAt: Date.now(),
    read: false
}];

const demoNewQuizzes = [];

/* ── STATE ── */
let announcements = [...demoAnnouncements];
let newQuizNotifs = [...demoNewQuizzes];

/* Flags submitted by this student this session.
   Shape matches instructor.js's flaggedQuestions exactly. */
let studentFlaggedQuestions = [];

/* ── UNREAD COUNTS ── */
function getUnreadAnnCount() {
    return announcements.filter(a => !a.read).length;
}

function getUnseenQuizCount() {
    return newQuizNotifs.filter(q => !q.seen).length;
}

function getTotalUnread() {
    return getUnreadAnnCount() + getUnseenQuizCount();
}

/* ════════════════════════════════════════
   FEATURE 1 — NOTIFICATION BELL
════════════════════════════════════════ */
function injectNotifBell() {
    // Keep notifications beside Settings, outside its popover.
    const settings = document.querySelector('.student-settings');
    if (!settings || document.getElementById('notif-bell-btn')) return;

    const bell = document.createElement('div');
    bell.className = 'notif-bell-wrap';
    bell.id = 'notif-bell-wrap';
    bell.innerHTML = `
    <button class="btn-notif-bell" id="notif-bell-btn" onclick="toggleNotifPanel()" title="Notifications" aria-label="Notifications" aria-expanded="false" aria-controls="notif-panel">
      <i data-lucide="bell" aria-hidden="true"></i>
      <span class="notif-badge" id="notif-badge" style="display:none">0</span>
    </button>`;
    settings.insertAdjacentElement('beforebegin', bell);
    updateNotifBadge();
}

function updateNotifBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    const count = getTotalUnread();
    badge.textContent = count > 9 ? '9+' : count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

/* ════════════════════════════════════════
   FEATURE 2 — NOTIFICATION PANEL
   (slides down from bell)
════════════════════════════════════════ */
let notifPanelOpen = false;

function toggleNotifPanel() {
    const existing = document.getElementById('notif-panel');
    if (existing) {
        closeNotifPanel();
        return;
    }
    openNotifPanel();
}

function openNotifPanel() {
    notifPanelOpen = true;
    const wrap = document.getElementById('notif-bell-wrap');
    if (!wrap) return;

    const panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.className = 'notif-panel';
    panel.innerHTML = `
    <div class="np-header">
      <span class="np-title">🔔 Notifications</span>
      <div style="display:flex;gap:.5rem;align-items:center">
        <button class="np-mark-all" onclick="markAllRead()">Mark all read</button>
        <button class="np-close-btn" onclick="closeNotifPanel()" aria-label="Close notifications"><i data-lucide="x" aria-hidden="true"></i></button>
      </div>
    </div>
    <div class="np-tabs">
      <button class="np-tab active" id="nptab-ann" onclick="switchNotifTab('announcements',this)">
        📢 Announcements
        ${getUnreadAnnCount() > 0 ? `<span class="np-tab-badge">${getUnreadAnnCount()}</span>` : ''}
      </button>
      <button class="np-tab" id="nptab-quiz" onclick="switchNotifTab('quizzes',this)">
        📝 New Quizzes
        ${getUnseenQuizCount() > 0 ? `<span class="np-tab-badge">${getUnseenQuizCount()}</span>` : ''}
      </button>
    </div>
    <div class="np-body" id="np-body"></div>`;

  wrap.appendChild(panel);
  document.getElementById('notif-bell-btn')?.setAttribute('aria-expanded', 'true');
  renderNotifTab('announcements');

  // Close when clicking outside
  setTimeout(() => {
    document.addEventListener('click', notifOutsideClick);
  }, 100);
}

function notifOutsideClick(e) {
  const panel = document.getElementById('notif-panel');
  const bell  = document.getElementById('notif-bell-wrap');
  if (panel && bell && !bell.contains(e.target)) {
    closeNotifPanel();
  }
}

function closeNotifPanel() {
  document.getElementById('notif-bell-btn')?.setAttribute('aria-expanded', 'false');
  document.getElementById('notif-panel')?.remove();
  document.removeEventListener('click', notifOutsideClick);
  notifPanelOpen = false;
}

function switchNotifTab(tab, btn) {
  document.querySelectorAll('.np-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderNotifTab(tab);
}

function renderNotifTab(tab) {
  const body = document.getElementById('np-body');
  if (!body) return;

  if (tab === 'announcements') {
    if (!announcements.length) {
      body.innerHTML = `<div class="np-empty">📭 No announcements yet.</div>`;
      return;
    }

    body.innerHTML = announcements.map((a, i) => {
      const priorityClass =
        a.priority === 'Urgent'
          ? 'np-priority-urgent'
          : a.priority === 'Important'
            ? 'np-priority-important'
            : '';

      const date = new Date(a.sentAt).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric'
      });

      return `
        <div class="np-item ${a.read ? 'np-read' : 'np-unread'}"
             onclick="openAnnouncement(${i})">

          <div class="np-item-left">
            <div class="np-item-icon ${priorityClass}">
              ${a.priority === 'Urgent'
                ? '🚨'
                : a.priority === 'Important'
                  ? '📌'
                  : '📢'}
            </div>
          </div>

          <div class="np-item-body">
            <div class="np-item-title">${a.title}</div>

            <div class="np-item-preview">
              ${a.body.substring(0, 70)}
              ${a.body.length > 70 ? '...' : ''}
            </div>

            <div class="np-item-meta">
              ${date} · ${a.target}
            </div>
          </div>

          ${a.read && Number(a.id) ? `<button type="button" class="np-delete-read" aria-label="Delete read notification" title="Delete read notification" onclick="deleteReadNotification(event,'announcement',${i})"><i data-lucide="trash-2" aria-hidden="true"></i></button>` : (!a.read ? '<div class="np-unread-dot"></div>' : '')}
        </div>
      `;
    }).join('');

  } else {

    // ==============================
    // QUIZ NOTIFICATIONS
    // ==============================

    if (!newQuizNotifs.length) {
      body.innerHTML =
        `<div class="np-empty">📭 No quiz notifications yet.</div>`;
      return;
    }

    body.innerHTML = newQuizNotifs.map((q, i) => {

      const date = new Date(q.postedAt).toLocaleDateString('en-PH', {
        month: 'short',
        day: 'numeric'
      });

      // =================================
      // QUIZ GRADED NOTIFICATION
      // =================================
      if (q.notificationType === 'system') {
        const escape = value => { const span=document.createElement('span'); span.textContent=value || ''; return span.innerHTML; };
        const trash = q.seen && q.notificationId ? `<button type="button" class="np-delete-read" aria-label="Delete read notification" title="Delete read notification" onclick="deleteReadNotification(event,'system',${i})"><i data-lucide="trash-2" aria-hidden="true"></i></button>` : '';
        return `<div class="np-item ${q.seen ? 'np-read' : 'np-unread'}" onclick="openNewQuizNotif(${i})"><div class="np-item-body"><div class="np-item-meta">System &middot; Automated notice &middot; ${date}</div><div class="np-item-title">${escape(q.title)}</div><div class="np-item-preview">${escape(q.message)}</div></div>${trash}${q.seen ? '' : '<div class="np-unread-dot"></div>'}</div>`;
      }
      if (q.notificationType === 'quiz_graded') {
        const trash = q.seen && q.quizId ? `<button type="button" class="np-delete-read" aria-label="Delete read notification" title="Delete read notification" onclick="deleteReadNotification(event,'quiz',${i})"><i data-lucide="trash-2" aria-hidden="true"></i></button>` : '';

        return `
          <div class="np-item ${q.seen ? 'np-read' : 'np-unread'}"
               onclick="openNewQuizNotif(${i})">

            <div class="np-item-left">
              <div class="np-item-icon"
                   style="background:rgba(76,175,80,.2);color:#66bb6a">
                ✅
              </div>
            </div>

            <div class="np-item-body">

              <div class="np-item-title">
                ${q.title}
              </div>

              <div class="np-item-preview">
                ${q.message}
              </div>

              <div class="np-item-meta">
                Graded ${date}
                ${q.instructorName
                  ? ` · ${q.instructorName}`
                  : ''}
              </div>

            </div>

            ${trash || (!q.seen ? '<div class="np-unread-dot"></div>' : '')}

          </div>
        `;
      }

      // =================================
      // NEW QUIZ POSTED NOTIFICATION
      // =================================
      const trash = q.seen && q.quizId ? `<button type="button" class="np-delete-read" aria-label="Delete read notification" title="Delete read notification" onclick="deleteReadNotification(event,'quiz',${i})"><i data-lucide="trash-2" aria-hidden="true"></i></button>` : '';
      return `
        <div class="np-item ${q.seen ? 'np-read' : 'np-unread'}"
             onclick="openNewQuizNotif(${i})">

          <div class="np-item-left">
            <div class="np-item-icon"
                 style="background:rgba(124,92,191,.2);color:#a57fe0">
              📝
            </div>
          </div>

          <div class="np-item-body">

            <div class="np-item-title">
              ${q.title}
            </div>

            <div class="np-item-preview">
              ${q.message || `${q.subject} · Due ${q.due} · +${q.xpReward} XP`}
            </div>

            <div class="np-item-meta">
              Posted ${date}
            </div>

          </div>

          ${trash || (!q.seen ? '<div class="np-unread-dot"></div>' : '')}

        </div>
      `;
    }).join('');
  }
}

async function deleteReadNotification(event, type, index) {
  event.stopPropagation();
  const item = type === 'announcement' ? announcements[index] : newQuizNotifs[index];
  if (!item || (type === 'announcement' ? !item.read : !item.seen)) return;
  const id = type === 'announcement' ? Number(item.id) : Number(type === 'system' ? item.notificationId : item.quizId);
  const kind = type || (item.notificationType === 'system' ? 'system' : 'quiz');
  if (!id) return;
  try {
    const response = await fetch('../assets/php/mark_student_quiz_notification_read.php', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(kind === 'announcement' ? { delete_read: true, notification_type: kind, announcement_id: id } : kind === 'system' ? { delete_read: true, notification_type: kind, notification_id: id } : { delete_read: true, notification_type: kind, quiz_id: id })
    });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || 'Could not delete this notification.');
    if (kind === 'announcement') announcements.splice(index, 1);
    else newQuizNotifs = newQuizNotifs.filter(notification => String(kind === 'system' ? notification.notificationId : notification.quizId) !== String(id));
    updateNotifBadge();
    renderNotifTab(kind === 'announcement' ? 'announcements' : 'quizzes');
  } catch (error) {
    showToast('System', error.message);
  }
}

function openAnnouncement(i) {
  announcements[i].read = true;
  if (Number(announcements[i].id)) fetch('../assets/php/mark_student_quiz_notification_read.php', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ announcement_read: true, announcement_id: Number(announcements[i].id) }) }).catch(() => {});
  updateNotifBadge();
  closeNotifPanel();

  const a = announcements[i];
  const priorityColor = a.priority === 'Urgent' ? '#f87171' :
                        a.priority === 'Important' ? '#f59e0b' : '#a57fe0';
  const priorityIcon  = a.priority === 'Urgent' ? '🚨' : a.priority === 'Important' ? '📌' : '📢';

  // Inject modal if not there
  if (!document.getElementById('modal-announcement')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="modal-announcement">
        <div class="modal announcement-dialog" style="max-width:480px">
          <button class="modal-close" onclick="closeModal('modal-announcement')">✕</button>
          <h2 id="ann-modal-title">Announcement</h2>
          <div id="ann-modal-body"></div>
          <div class="modal-footer">
            <button class="btn-secondary" onclick="closeModal('modal-announcement')">Close</button>
          </div>
        </div>
      </div>`);
    document.getElementById('modal-announcement')?.addEventListener('click', function(e) {
      if (e.target === this) closeModal('modal-announcement');
    });
  }

  document.getElementById('ann-modal-title').textContent = a.title;
  document.getElementById('ann-modal-body').innerHTML = `
    <div style="display:flex;align-items:center;gap:.6rem;margin-bottom:1rem">
      <span style="font-size:1.1rem">${priorityIcon}</span>
      <span style="font-size:.72rem;font-weight:700;padding:.18rem .6rem;border-radius:99px;
        background:${priorityColor}22;border:1px solid ${priorityColor}55;color:${priorityColor}">
        ${a.priority}
      </span>
      <span style="font-size:.72rem;color:var(--text-muted)">
        ${new Date(a.sentAt).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
      </span>
    </div>
    <div class="announcement-message">
      ${a.body}
    </div>
    <div class="announcement-target">
      Sent to: ${a.target}
    </div>`;
  openModal('modal-announcement');
}

async function openNewQuizNotif(i) {

    const q =
        newQuizNotifs[i];


    if (!q) return;
    if (q.notificationType === 'system') {
        const response = await fetch('../assets/php/mark_student_quiz_notification_read.php', {method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({notification_id:q.notificationId})});
        if (response.ok) { q.seen=true; updateNotifBadge(); renderNotifTab('quizzes'); }
        showToast('System',q.message); return;
    }


    /*
    ---------------------------------------
    MARK AS READ LOCALLY FIRST
    ---------------------------------------
    */

    q.seen = true;


    updateNotifBadge();


    /*
    ---------------------------------------
    SAVE READ STATUS TO DATABASE
    ---------------------------------------
    */

    try {

        const response = await fetch(

            '../assets/php/mark_student_quiz_notification_read.php',

            {

                method: 'POST',

                credentials: 'include',

                headers: {

                    'Content-Type':
                        'application/json'

                },

                body:

                    JSON.stringify({

                        quiz_id:
                            q.quizId

                    })

            }

        );


        const result =
            await response.json();


        if (!result.success) {

            console.error(

                'Failed to mark quiz notification as read:',

                result.message

            );

        }


    } catch (error) {

        console.error(

            'Error marking quiz notification as read:',

            error

        );

    }


    closeNotifPanel();


    showToast(

        '📝',

        `New quiz: "${q.title}"`

    );


    /*
    ---------------------------------------
    GO TO MY QUIZZES
    ---------------------------------------
    */

    if (

        typeof switchTab ===
        'function'

    ) {

        switchTab(
            'quizzes'
        );

    }

}

async function markAllRead() {
    await fetch('../assets/php/mark_student_quiz_notification_read.php', {method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({system_all:true})});
    const unreadAnnouncementNotifications = announcements.filter(announcement => !announcement.read && Number(announcement.id));

    /*
    ---------------------------------------
    MARK ANNOUNCEMENTS LOCALLY
    ---------------------------------------
    */

    announcements.forEach(

        announcement =>

            announcement.read = true

    );


    /*
    ---------------------------------------
    GET UNREAD QUIZ NOTIFICATIONS
    ---------------------------------------
    */

    const unreadQuizNotifications =

        newQuizNotifs.filter(

            quiz => !quiz.seen

        );


    /*
    ---------------------------------------
    MARK QUIZZES LOCALLY
    ---------------------------------------
    */

    newQuizNotifs.forEach(

        quiz =>

            quiz.seen = true

    );


    updateNotifBadge();


    /*
    ---------------------------------------
    SAVE QUIZ READ STATUS
    TO DATABASE
    ---------------------------------------
    */

    try {

        await Promise.all(

            unreadQuizNotifications.map(

                async quiz => {

                    const response =
                        await fetch(

                            '../assets/php/mark_student_quiz_notification_read.php',

                            {

                                method:
                                    'POST',

                                credentials:
                                    'include',

                                headers: {

                                    'Content-Type':
                                        'application/json'

                                },

                                body:

                                    JSON.stringify({

                                        quiz_id:
                                            quiz.quizId

                                    })

                            }

                        );


                    const result =
                        await response.json();


                    if (!result.success) {

                        console.error(

                            'Failed to mark quiz as read:',

                            quiz.quizId

                        );

                    }

                }

            )

        );

        await Promise.all(unreadAnnouncementNotifications.map(announcement => fetch('../assets/php/mark_student_quiz_notification_read.php', {
            method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ announcement_read: true, announcement_id: Number(announcement.id) })
        })));


    } catch (error) {

        console.error(

            'Error marking all quiz notifications as read:',

            error

        );

    }


    closeNotifPanel();


    showToast(

        '✅',

        'All notifications marked as read.'

    );

}

/* ════════════════════════════════════════
   FEATURE 3 — FLAG QUESTION BUTTON
   Rendered inside renderBattleQuestion()
════════════════════════════════════════ */
function renderFlagButton() {
  if (!activeBattle) return '';
  const qKey = `${activeBattle.id}-${battleCurrentQ}`;
  const alreadyFlagged = studentFlaggedQuestions.some(
    f => f.quizId === activeBattle.id && f.questionIndex === battleCurrentQ
  );

  if (alreadyFlagged) {
    return `<div class="flag-used-badge">🚩 Flagged</div>`;
  }

  return `
    <button class="btn-flag-question" onclick="flagQuestion()" title="Flag this question as problematic">
      🚩 Flag
    </button>`;
}

function flagQuestion() {

  if (!activeBattle) return;


  const alreadyFlagged =
    studentFlaggedQuestions.some(
      f =>
        f.quizId === activeBattle.id &&
        f.questionIndex === battleCurrentQ
    );


  if (alreadyFlagged) return;


  /*
  |--------------------------------------------------------------------------
  | RESET FLAG FORM
  |--------------------------------------------------------------------------
  */

  const defaultReason =
    document.querySelector(
      'input[name="flag-reason"][value="Question is unclear"]'
    );


  if (defaultReason) {
    defaultReason.checked = true;
  }


  const otherContainer =
    document.getElementById(
      'flag-other-container'
    );


  if (otherContainer) {
    otherContainer.style.display =
      'none';
  }


  const otherText =
    document.getElementById(
      'flag-other-text'
    );


  if (otherText) {
    otherText.value = '';
  }


  /*
  |--------------------------------------------------------------------------
  | OPEN FLAG MODAL
  |--------------------------------------------------------------------------
  */

  const overlay =
    document.getElementById(
      'flag-overlay'
    );


  if (overlay) {

    overlay.classList.add('open');

  }

}

function closeFlagModal() {

  const overlay =
    document.getElementById(
      'flag-overlay'
    );


  if (overlay) {

    overlay.classList.remove(
      'open'
    );

  }

}

async function submitFlagQuestion() {

  if (!activeBattle) return;


  /*
  |--------------------------------------------------------------------------
  | GET SELECTED REASON
  |--------------------------------------------------------------------------
  */

  const selected =
    document.querySelector(
      'input[name="flag-reason"]:checked'
    );


  if (!selected) {

    showToast(
      '⚠️',
      'Please select a reason.'
    );

    return;

  }


  let reason =
    selected.value;


  /*
  |--------------------------------------------------------------------------
  | HANDLE "OTHER"
  |--------------------------------------------------------------------------
  */

  if (reason === 'Other') {

    const otherText =
      document.getElementById(
        'flag-other-text'
      );


    const details =
      otherText
        ? otherText.value.trim()
        : '';


    if (!details) {

      showToast(
        '⚠️',
        'Please explain the issue.'
      );

      if (otherText) {
        otherText.focus();
      }

      return;

    }


    reason =
      `Other: ${details}`;

  }


  /*
  |--------------------------------------------------------------------------
  | SEND FLAG TO PHP
  |--------------------------------------------------------------------------
  */

  try {

    const response =
      await fetch(
        "../assets/php/flag_question.php",
        {
          method: "POST",

          credentials: "include",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({

            quiz_id:
              activeBattle.id,

            question_index:
              battleCurrentQ,

            reason:
              reason

          })

        }
      );


    /*
    |--------------------------------------------------------------------------
    | READ RESPONSE
    |--------------------------------------------------------------------------
    */

    const data =
      await response.json();


    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data.message ||
        "Failed to flag question."
      );

    }


    /*
    |--------------------------------------------------------------------------
    | SAVE LOCAL UI STATE
    |--------------------------------------------------------------------------
    */

    studentFlaggedQuestions.push({

      id:
        data.flag_id,

      quizId:
        activeBattle.id,

      questionIndex:
        battleCurrentQ,

      status:
        "pending",

      reason:
        reason

    });


    /*
    |--------------------------------------------------------------------------
    | CLOSE FLAG MODAL
    |--------------------------------------------------------------------------
    */

    closeFlagModal();


    /*
    |--------------------------------------------------------------------------
    | CHANGE FLAG BUTTON
    |--------------------------------------------------------------------------
    */

    const nav =
      document.querySelector(
        '.battle-nav'
      );


    if (nav) {

      const flagBtn =
        nav.querySelector(
          '.btn-flag-question'
        );


      if (flagBtn) {

        flagBtn.outerHTML =
          `<div class="flag-used-badge">
             🚩 Flagged
           </div>`;

      }

    }


    /*
    |--------------------------------------------------------------------------
    | SUCCESS MESSAGE
    |--------------------------------------------------------------------------
    */

    showToast(
      '🚩',
      'Question flagged. Your instructor has been notified!'
    );


  } catch (error) {

    console.error(
      'Flag question error:',
      error
    );


    showToast(
      '❌',
      error.message ||
      'Failed to flag question.'
    );

  }

}

async function loadStudentAnnouncements() {

  try{
    const response = await fetch('../assets/php/get_student_announcements.php');

    const result = await response.json();
    if (!result.success) {
      console.error('Failed to load announcements:'
        , result.message);
        return
    }
    announcements = result.announcements;

    updateNotifBadge();

    if(document.getElementById('notif-panel')){
      renderNotifTab('announcements');
    }

    console.log('Student announcements loaded successfully.', 
      announcements
    );
  } catch (error) {
    console.error('Error loading student announcements:', error);
  }
}

async function loadStudentQuizNotifications() {

    try {

        const response = await fetch(

            '../assets/php/mark_student_quiz_notification_read.php',

            {

                method: 'GET',

                credentials: 'include',

                cache: 'no-store'

            }

        );


        const result =
            await response.json();


        if (

            !response.ok

            ||

            !result.success

        ) {

            console.error(

                'Failed to load quiz notifications:',

                result.message

            );

            return;

        }


        /*
        ---------------------------------------
        CONVERT DATABASE DATA
        INTO THE FORMAT USED BY THE UI
        ---------------------------------------
        */

        newQuizNotifs =
  (result.notifications || [])
    .map(notification => ({
      notificationId: notification.notification_id,
      quizId: notification.quiz_id,
      title: notification.title,
      message: notification.message,
      subject: notification.subject,
      due: notification.due_date || 'No due date',
      xpReward: notification.xp_reward,
      postedAt: notification.created_at,
      mode: notification.mode,
      quizType: notification.quiz_type,
      notificationType: notification.notification_type,
      instructorName: notification.instructor_name || '',
      seen: Number(notification.is_read) === 1
    }));

        updateNotifBadge();


        /*
        If notification panel is currently open
        and the quiz tab is selected, refresh it.
        */

        const quizTab =
            document
                .getElementById(
                    'nptab-quiz'
                );


        if (

            document.getElementById(
                'notif-panel'
            )

            &&

            quizTab

            &&

            quizTab.classList.contains(
                'active'
            )

        ) {

            renderNotifTab(
                'quizzes'
            );

        }


        console.log(

            'Student quiz notifications loaded:',

            newQuizNotifs

        );


    } catch (error) {

        console.error(

            'Error loading quiz notifications:',

            error

        );

    }

}
/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  injectNotifBell();

  loadStudentAnnouncements();
  loadStudentQuizNotifications();

  // Check for new quiz notifications every 30 seconds
  setInterval(() => {
        loadStudentQuizNotifications();
    }, 30000);
});
