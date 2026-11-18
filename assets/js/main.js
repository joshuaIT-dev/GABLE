/* ═══════════════════════════════════════════════════════════════
   main.js — Gable shared utilities
   Load this on EVERY page before any page-specific script.
   ═══════════════════════════════════════════════════════════════ */


/* ── SCROLL REVEAL ─────────────────────────────────────────────
   Adds .visible to any .reveal element when it enters the viewport.
   ────────────────────────────────────────────────────────────── */
const _revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      _revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => _revealObserver.observe(el));


/* ── PAGE TRANSITIONS ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.classList.add('page-enter-active', 'ready');
    });
  });

  document.querySelectorAll('a').forEach(link => {
    const href = link.getAttribute('href');

    if (
      !href ||
      href === '#' ||
      href.startsWith('http') ||
      href.startsWith('mailto') ||
      href.startsWith('tel')
    ) return;

    link.addEventListener('click', function (e) {
      e.preventDefault();

      const target = this.getAttribute('href');

      document.body.style.opacity = '0';
      document.body.style.transition = 'opacity .3s';
      document.body.classList.add('page-exit');

      setTimeout(() => {
        window.location.href = target;
      }, 320);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', function (e) {
      if (e.target === this) {
        closeModal(this.id);
      }
    });
  });

});


/* ── SHARED TOAST ────────────────────────────────────────────── */
let _toastTimer;

function showToast(icon, msg) {
  clearTimeout(_toastTimer);

  const t  = document.getElementById('toast');
  const ti = document.getElementById('toast-icon');
  const tm = document.getElementById('toast-msg');

  if (!t) return;

  ti.textContent = icon;
  tm.textContent = msg;

  t.classList.add('show');

  _toastTimer = setTimeout(() => {
    t.classList.remove('show');
  }, 3200);
}


/* ── SHARED MODAL HELPERS ────────────────────────────────────── */
function openModal(id) {
  const modal=document.getElementById(id);
  if(modal && document.body.classList.contains('admin-portal')) document.body.appendChild(modal);
  modal?.classList.add('open');
}

function closeModal(id) {
  if (id === 'modal-battle' && typeof requestQuizClose === 'function') { requestQuizClose(); return; }
  document.getElementById(id)?.classList.remove('open');
}


/* ── CONFIRM DIALOG ──────────────────────────────────────────── */

function showConfirm(title, msg, btnLabel, onConfirm) {

    const overlay =
        document.getElementById('confirm-overlay');

    if (!overlay) return;
    document.body.appendChild(overlay);

    document.getElementById('confirm-title').textContent =
        title;

    document.getElementById('confirm-msg').textContent =
        msg;

    const yes =
        document.getElementById('confirm-yes');

    yes.textContent =
        btnLabel;

    /*
     * Apply destructive styling only
     * to Delete confirmations.
     */
    yes.classList.toggle(
        'confirm-delete-btn',
        /\b(delete|remove)\b/i.test(btnLabel)
    );

    yes.onclick = () => {

        closeConfirm();

        onConfirm();

    };

    overlay.classList.add('open');
}

function closeConfirm() {
  document
    .getElementById('confirm-overlay')
    ?.classList.remove('open');
}

function confirmAction(title, msg, onConfirm) {
  showConfirm(title, msg, 'Confirm', onConfirm);
}


/* ── CONFIRM DELETE ──────────────────────────────────────────── */
let _pendingDeleteId   = '';
let _pendingDeleteName = '';

function confirmDelete(id, name) {
  _pendingDeleteId   = id;
  _pendingDeleteName = name;

  const msg = document.getElementById('confirm-msg');

  if (msg) {
    msg.textContent = `"${name}" will be permanently deleted.`;
  }

  document
    .getElementById('confirm-overlay')
    ?.classList.add('open');
}

function executeDelete() {
  document.getElementById(_pendingDeleteId)?.remove();

  closeConfirm();

  showToast('🗑️', `"${_pendingDeleteName}" deleted.`);

  const c = document.getElementById('drafts-container');

  if (c && !c.querySelector('.draft-card')) {
    c.innerHTML =
      '<div class="empty-state"><div class="emoji">📭</div><p>No draft quizzes.</p></div>';
  }
}


/* ── SHARED NAVIGATION ───────────────────────────────────────── */
function navigateTo(href) {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity .3s';

  setTimeout(() => {
    window.location.href = href;
  }, 320);
}


/* ── SHARED LOGOUT ───────────────────────────────────────────── */
function logout(dest = 'Index.html') {
  const role = document.body.classList.contains('admin-portal') ? 'admin'
    : document.body.classList.contains('instructor-portal') ? 'instructor' : 'student';
  showToast('??', 'Logging out?');
  fetch('../assets/php/logout.php', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ role })
  }).catch(() => {}).finally(() => setTimeout(() => navigateTo(dest), 300));
}


/* ═══════════════════════════════════════════════════════════════
   GABLE SHARED DATA STORE
   ═══════════════════════════════════════════════════════════════ */

const GABLE_STORE_KEYS = {
  quizzes: 'gable.shared.quizzes.v1',
  submissions: 'gable.shared.submissions.v1',
  flags: 'gable.shared.flags.v1',
  student: 'gable.shared.student.v1',
  activityCompletions: 'gable.shared.activityCompletions.v1'
};


function gableReadStore(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch (_) {
    return fallback;
  }
}


function gableWriteStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}


/* ── QUIZ NORMALIZER ─────────────────────────────────────────── */
function gableCloneQuizForStore(q) {
  return {
    id: q.id,

    title: q.title,

    type: q.type,

    subject: q.subject,

    section: q.section,

    due: q.due || '',

    time: Number(q.time) || 30,

    status: q.status || 'active',

    instructions: q.instructions || '',

    icon: q.icon || 'Quiz',

    iconBg: q.iconBg || '',

    typeClass: q.typeClass || '',

    badgeIcon: q.badgeIcon || '📝',

    xpReward:
      Number(
        q.xpReward ??
        q.stats?.xp ??
        q.xp ??
        100
      ) || 100,

    descLabel: q.descLabel || 'Challenge',

    desc:
      q.desc ||
      q.instructions ||
      '',

    players:
      q.players ||
      q.mode ||
      'Solo',

    stats:
      q.stats ||
      {
        completed: 0,
        inProgress: 0,
        avgScore: 0,
        alignment: 0,
        xp: 0
      },

    submissions: q.submissions || [],

    questions:
      Array.isArray(q.questions)
        ? q.questions
        : [],

    instructor:
      q.instructor ||
      'Dr. Diana Martinez',

    source:
      q.source ||
      'instructor',

    category:
      q.category ||
      q.quizCategory ||
      'formal',

    updatedAt: Date.now()
  };
}


/* ═══════════════════════════════════════════════════════════════
   STUDENT PROFILE STORE
   ═══════════════════════════════════════════════════════════════ */

const DEFAULT_STUDENT_PROFILE = {

  id: 'STU-0001',

  name: 'Student User',

  college: 'College of Information Technology & Computer Studies',

  program: 'BSIT',

  programShort: 'BSIT',

  year: '2nd Year',

  section: 'A',

  xp: 0,

  streak: 0
};


function gableCloneStudent(student) {

  const s = student || {};

  return {

    ...DEFAULT_STUDENT_PROFILE,

    ...s,

    xp: Math.max(
      0,
      Number(s.xp) || 0
    ),

    streak: Math.max(
      0,
      Number(s.streak) || 0
    )

  };
}



/* ═══════════════════════════════════════════════════════════════
   GABLE STORE API
   ═══════════════════════════════════════════════════════════════ */

   /* ── XP CALCULATOR ───────────────────────────────────────── */

function calculateXP(correctAnswers, totalQuestions, maxXP) {

  const correct = Math.max(
    0,
    Number(correctAnswers) || 0
  );

  const total = Math.max(
    1,
    Number(totalQuestions) || 1
  );

  const maximumXP = Math.max(
    0,
    Number(maxXP) || 0
  );


  const percentage =
    Math.min(
      1,
      correct / total
    );


  const xpEarned =
    Math.round(
      maximumXP * percentage
    );


  return {
    correct,
    total,
    percentage: Math.round(percentage * 100),
    xpEarned,
    maxXP: maximumXP
  };

}

window.GableStore = {

  /* ── QUIZZES ─────────────────────────────────────────────── */

  getQuizzes() {
    return gableReadStore(
      GABLE_STORE_KEYS.quizzes,
      []
    );
  },


  saveQuizzes(quizzes) {

    gableWriteStore(
      GABLE_STORE_KEYS.quizzes,
      quizzes.map(gableCloneQuizForStore)
    );

  },


  seedQuizzes(seedQuizzes) {

    const existing = this.getQuizzes();

    if (existing.length) {
      return existing;
    }

    const seeded =
      seedQuizzes.map(gableCloneQuizForStore);

    this.saveQuizzes(seeded);

    return seeded;
  },


  upsertQuiz(quiz) {

    const quizzes = this.getQuizzes();

    const stored =
      gableCloneQuizForStore(quiz);

    const idx =
      quizzes.findIndex(
        q =>
          String(q.id) ===
          String(stored.id)
      );

    if (idx >= 0) {

      quizzes[idx] = {
        ...quizzes[idx],
        ...stored
      };

    } else {

      quizzes.push(stored);

    }

    this.saveQuizzes(quizzes);

    return stored;
  },


  removeQuiz(id) {

    this.saveQuizzes(
      this.getQuizzes().filter(
        q =>
          String(q.id) !==
          String(id)
      )
    );

  },


  /* ── SUBMISSIONS ─────────────────────────────────────────── */

  getSubmissions() {

    return gableReadStore(
      GABLE_STORE_KEYS.submissions,
      []
    );

  },


  addSubmission(submission) {

    const submissions =
      this.getSubmissions();

    const stored = {

      id: Date.now(),

      submittedAt: Date.now(),

      ...submission

    };

    submissions.push(stored);

    gableWriteStore(
      GABLE_STORE_KEYS.submissions,
      submissions
    );

    return stored;
  },


  getSubmissionsForQuiz(quizId) {

    return this.getSubmissions()
      .filter(
        s =>
          String(s.quizId) ===
          String(quizId)
      );

  },


  getSubmissionsForStudent(studentId) {

    return this.getSubmissions()
      .filter(
        s =>
          String(s.studentId) ===
          String(studentId)
      );

  },


  /* ── STUDENT PROFILE ────────────────────────────────────── */

  getStudentProfile() {

    const stored =
      gableReadStore(
        GABLE_STORE_KEYS.student,
        null
      );

    if (!stored) {

      const seeded =
        gableCloneStudent(
          DEFAULT_STUDENT_PROFILE
        );

      gableWriteStore(
        GABLE_STORE_KEYS.student,
        seeded
      );

      return seeded;
    }

    return gableCloneStudent(stored);
  },


  saveStudentProfile(student) {

    const stored =
      gableCloneStudent(student);

    gableWriteStore(
      GABLE_STORE_KEYS.student,
      stored
    );

    return stored;
  },


  updateStudentProfile(patch) {

    const current =
      this.getStudentProfile();

    return this.saveStudentProfile({
      ...current,
      ...patch
    });

  },

  /* ── FLAGS ──────────────────────────────────────────────── */

  getFlags() {

    return gableReadStore(
      GABLE_STORE_KEYS.flags,
      []
    );

  },


  addFlag(flag) {

    const flags =
      this.getFlags();

    const stored = {

      id: Date.now(),

      status: 'Open',

      flaggedAt: Date.now(),

      ...flag

    };

    flags.push(stored);

    gableWriteStore(
      GABLE_STORE_KEYS.flags,
      flags
    );

    return stored;
  }

};
function quizTimingText(quiz) {
  const minutes = Number(quiz.time ?? quiz.time_limit);
  const limit = Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
  const due = String(quiz.due ?? quiz.due_date ?? '').trim();
  return `${limit} min time limit` + (/^\d{4}-\d{2}-\d{2}$/.test(due) && due !== '0000-00-00' ? ` | Due ${due}` : '');
}

// Shared status polling keeps student/instructor sessions on the server's maintenance deadline.
{ const script=document.createElement('script');script.src=new URL('maintenance.js?v=1',document.currentScript.src);document.head.append(script); }
