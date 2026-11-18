/* ═══ student.js ═══
   Depends on: main.js  (showToast, openModal, closeModal,
                          navigateTo, logout)
               levelup.js (getLevelProgressHTML, getLevelForXP,
                           getNextLevel, checkLevelUp, LEVELS,
                           coupons, applyProfileFrame,
                           renderProfileRewards, renderCouponsSection)
               timebuffer.js (startQuizTimer, stopQuizTimer,
                           renderTimeBufferButton)
   ════════════════════════════════════════════════════════ */

/* ═══ DATA ═══ */
let studentProfile = null;
let studentXP = 0;
let studentSemesterXP = 0;
let studentQuizXP = 0;

const formalQuizzes = [];
const informalQuizzes = [];

const databaseQuizzes = [];

let databaseSubmissions = [];

const completedFormal = [];
const completedInformal = [];

const homeAvailableQuizzes = [];
const homeCompletedActivity = [];
const homeRecentQuizzes = [];

const leaderboardData = [];

const boostableQuizzes = [];

/* ═══ COMPLETED RESULTS ═══ */
let myResults = {};
let answeredSubjectNames = [];


/* ═══════════════════════════════════════════════════════════════
   STUDENT PROFILE HELPERS
   ═══════════════════════════════════════════════════════════════ */

function setText(id, value) {
  const el = document.getElementById(id);

  if (el) {
    el.textContent = value ?? '';
  }

  return el;
}


function initialsFromName(name) {

    const parts =
        String(name || 'Student User')
            .trim()
            .split(/\s+/)
            .filter(Boolean);

    if (!parts.length) {
        return 'SU';
    }

    return parts
        .slice(0, 2)
        .map(p => p[0])
        .join('')
        .toUpperCase();
}


function getYearSuffix(year) {
    const num = Number(year);

    if (num === 1) return 'st';
    if (num === 2) return 'nd';
    if (num === 3) return 'rd';

    return 'th';
}


/* ── Quiz category ─────────────────────────────────────────── */

function quizIsInformal(q) {

  const value =
    String(
      q.category ||
      q.quizCategory ||
      q.mode ||
      q.quizType ||
      q.type ||
      ''
    ).toLowerCase();

  return (
    value.includes('informal') ||
    value.includes('homework') ||
    value.includes('practice')
  );
}


/* ── Section matching ──────────────────────────────────────── */

function quizMatchesStudent(q) {

    if (!q) {
        return false;
    }


    /*
    |--------------------------------------------------------------------------
    | NO SECTION = AVAILABLE TO EVERYONE
    |--------------------------------------------------------------------------
    */

    if (!q.section) {
        return true;
    }


    /*
    |--------------------------------------------------------------------------
    | GET THE STUDENT'S COMPLETE SECTION
    |--------------------------------------------------------------------------
    |
    | Example:
    |
    | program = BSIT
    | year    = 1
    | block   = Z
    |
    | studentProfile.section
    | = BSIT 1Z
    |
    |--------------------------------------------------------------------------
    */

    const studentSection =
        String(
            studentProfile?.section || ''
        )
        .trim()
        .toLowerCase()
        .replace(
            /^section\s+/i,
            ''
        );


    /*
    |--------------------------------------------------------------------------
    | GET QUIZ SECTION(S)
    |--------------------------------------------------------------------------
    */

    const rawSections =
        Array.isArray(q.section)
            ? q.section
            : String(
                q.section
              ).split(',');


    /*
    |--------------------------------------------------------------------------
    | COMPARE
    |--------------------------------------------------------------------------
    */

    const matches =
        rawSections.some(
            value => {

                const quizSection =
                    String(value)
                        .trim()
                        .toLowerCase()
                        .replace(
                            /^section\s+/i,
                            ''
                        );


                return (
                    quizSection ===
                    studentSection
                );

            }
        );


    /*
    |--------------------------------------------------------------------------
    | DEBUG
    |--------------------------------------------------------------------------
    */

    console.log(
        'Quiz matching:',
        {
            studentSection:
                studentSection,

            quizSection:
                q.section,

            matches:
                matches
        }
    );


    return matches;

}


/* ── Quiz normalizer ───────────────────────────────────────── */

function normalizeQuiz(q) {

  const type =
    q.type ||
    'Solo Battle';

  const typeClass = {
    'Solo': 'solo',
    'Solo Battle': 'solo',
    'Team Battle': 'team',
    'Battle Royale': 'royale',
    'Homework': 'hw',
    'Practice': 'practice'
  }[type] || 'standard';

  return {

    ...q,

    id: q.id,

    title:
      q.title ||
      'Untitled Quiz',

    type,

    subject:
      q.subject ||
      'General',

    section:
      q.section ||
      '',

    due:
      q.due ||
      '',

    time:
      Number(q.time) ||
      30,

    xpReward:
      Number(
        q.xpReward ??
        q.xp ??
        q.stats?.xp ??
        100
      ) || 100,

    descLabel:
      q.descLabel ||
      'Challenge',

    desc:
      q.desc ||
      q.instructions ||
      'Answer the questions and complete the quiz.',

    players:
      q.players ||
      q.mode ||
      'Solo',

    icon:
      q.icon ||
      '📝',

    badgeIcon:
      q.badgeIcon ||
      '📝',

    typeClass,

    category:
      q.category ||
      q.quizCategory ||
      (quizIsInformal(q) ? 'informal' : 'formal'),

    questions:
      Array.isArray(q.questions)
        ? q.questions
        : [],

    status:
      q.status ||
      'active',

    btnClass: ''

  };
}

async function loadDatabaseQuizzes() {

  try {

    const response =
      await fetch(
        '../assets/php/get_student_quizzes.php',
        {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store'
        }
      );


    if (!response.ok) {

      throw new Error(
        `Unable to load quizzes (${response.status})`
      );

    }


    const data =
      await response.json();


    if (!data.success) {

      throw new Error(
        data.message ||
        'Unable to load quizzes.'
      );

    }


    /*
    |----------------------------------------------------------------
    | CLEAR PREVIOUS DATABASE QUIZZES
    |----------------------------------------------------------------
    */

    databaseQuizzes.length = 0;


    /*
    |----------------------------------------------------------------
    | NORMALIZE DATABASE QUIZZES
    |----------------------------------------------------------------
    */

    (data.quizzes || []).forEach(
      dbQuiz => {

        const quiz = normalizeQuiz({

          id:
            dbQuiz.quiz_id,

          title:
            dbQuiz.title,

          subject:
            dbQuiz.subject,

          section:
            dbQuiz.section,

          type:
            dbQuiz.quiz_type,

          category:
            dbQuiz.mode,

          due:
            dbQuiz.due_date ||
            '',

          time:
            Number(
              dbQuiz.time_limit
            ) || 30,

          xpReward:
            Number(
              dbQuiz.xp_reward
            ) || 0,

          desc:
            dbQuiz.instructions ||
            '',

            createdAt: dbQuiz.created_at,

          questions:
            Array.isArray(
              dbQuiz.questions
            )
              ? dbQuiz.questions.map(
                  question => ({

                    /*
                    | Student battle currently expects:
                    |
                    | q
                    | opts
                    | correct
                    */

                    q:
                      question.q ||
                      question.text ||
                      '',

                    opts:
                      question.opts ||
                      question.choices ||
                      [],

                    correct:
                      question.correct,

                    type:
                      question.type ||
                      'mc'

                  })
                )
              : [],

          status:
            dbQuiz.status ||
            'active',
          
          submitted:
            Number(
                dbQuiz.submitted
            ) === 1,

          icon:
            dbQuiz.mode === 'formal'
              ? '⚔️'
              : '📚',

          badgeIcon:
            dbQuiz.mode === 'formal'
              ? '🏫'
              : '🏠'

        });


        databaseQuizzes.push(
          quiz
        );

      }
    );


    console.log(
      'Database quizzes loaded:',
      databaseQuizzes
    );


  } catch (error) {

    console.error(
      'Error loading database quizzes:',
      error
    );

  }

}


/* ── Student submissions ───────────────────────────────────── */

function getStudentSubmissions() {

    return databaseSubmissions || [];

}

async function loadDatabaseSubmissions() {

    try {

        const response =
            await fetch(
                '../assets/php/student_submissions.php',
                {
                    method: 'GET',
                    credentials: 'include',
                    cache: 'no-store'
                }
            );


        if (!response.ok) {

            throw new Error(
                `Unable to load submissions (${response.status})`
            );

        }


        const data =
            await response.json();


        if (!data.success) {

            throw new Error(
                data.message ||
                'Unable to load student submissions.'
            );

        }


        databaseSubmissions =
            Array.isArray(data.submissions)
                ? data.submissions
                : [];


        console.log(
            'Student submissions loaded from database:',
            databaseSubmissions
        );


        console.log(
            'Database submission count:',
            databaseSubmissions.length
        );


    } catch (error) {

        console.error(
            'Failed to load database submissions:',
            error
        );


        databaseSubmissions = [];

    }

}


/* ═══════════════════════════════════════════════════════════════
   LOAD STUDENT DATA
   ═══════════════════════════════════════════════════════════════ */

   async function loadStudentXP() {

    try {

        const response =

            await fetch(

                '../assets/php/studentXP.php',

                {

                    method:
                        'GET',

                    credentials:
                        'include',

                    cache:
                        'no-store'

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

                'Failed to load XP.'

            );

        }


        studentXP =

            Math.max(

                0,

                Number(
                    result.xp
                ) || 0

            );


        applyPowerupState(result);

        /*
        | Keep profile object synchronized
        */

        if (

            studentProfile

        ) {

            studentProfile.xp =
                studentXP;

        }


        console.log(

            'Student XP loaded from database:',

            studentXP

        );


        /*
        | Update XP UI if already rendered
        */

        if (

            typeof updateXPDisplay ===
            'function'

        ) {

            updateXPDisplay();

        }


    } catch (error) {

        console.error(

            'Failed to load student XP:',

            error

        );

    }

}

async function loadStudentData() {

  /*
   * Load the existing local student data first.
   * This keeps quiz/XP information that is already
   * being handled by GableStore.
   */
  if (window.GableStore) {

    studentProfile =
      GableStore.getStudentProfile();

  } else {

    studentProfile = {
      id: '',
      name: '',
      college: '',
      program: '',
      programShort: '',
      year: '',
      section: '',
      xp: 0,
      streak: 0
    };

  }


  /*
   * Get the REAL logged-in student from PHP/MySQL.
   *
   * login.php stores:
   *
   * $_SESSION['student'] = $row['student_id'];
   *
   * get_student.php uses that session to retrieve
   * the student's actual database information.
   */
  try {

    const response =
      await fetch('../assets/php/get_student.php', {
        method: "GET",
        credentials: "include",
        cache: "no-store"
      });


    if (!response.ok) {

      throw new Error(
        `Unable to load student profile (${response.status})`
      );

    }


    const data =
      await response.json();


    if (!data.success || !data.student) {

      throw new Error(
        data.message ||
        "Student profile was not returned."
      );

    }


    const dbStudent =
      data.student;


    /*
     * DATABASE VALUES
     *
     * These values now come from MySQL.
     */
    studentProfile = {

      ...studentProfile,

      /*
       * Use the actual student number as the
       * displayed Student ID.
       */
      id:
        String(
          dbStudent.student_number
        ),

      /*
       * Use the actual first + last name.
       */
      name:
        `${dbStudent.first_name || ''} ${dbStudent.last_name || ''}`
          .trim(),

      /*
       * These fields exist in your student table.
       */
      email:
        dbStudent.institutional_email || '',

      subjects: dbStudent.subjects || [],
      college:
        dbStudent.college || '',

      section:
  `${dbStudent.program || ''} ${dbStudent.year_level || ''}${dbStudent.block || ''}`.trim(),

      /*
       * These fields are NOT currently shown
       * in your student table, so we preserve
       * existing application values if they exist.
       */
      program:
        dbStudent.program || '',

        programShort:
      dbStudent.program || '',

      year:
    dbStudent.year_level
        ? `${dbStudent.year_level}${getYearSuffix(dbStudent.year_level)} Year`
        : studentProfile.year || '',

      /*
       * XP/streak currently remain controlled
       * by the existing application.
       */
      xp:
        Number(studentProfile.xp) || 0,

      streak:
        Number(studentProfile.streak) || 0

    };


    console.log(
      "Database student loaded:",
      studentProfile
    );


  } catch (error) {

    console.error(
      "Failed to load database student:",
      error
    );


    /*
     * Do NOT silently replace the student with
     * "Student User" anymore.
     *
     * If the database cannot be reached, keep
     * whatever local profile data exists.
     */
    if (!studentProfile) {

      studentProfile = {
        id: '',
        name: 'Student',
        college: '',
        program: '',
        programShort: '',
        year: '',
        section: '',
        xp: 0,
        streak: 0
      };

    }

  }


await loadStudentXP();
await loadDatabaseQuizzes();
await loadDatabaseSubmissions();

rebuildStudentData();

await loadDatabaseLeaderboard();

renderLeaderboard(lbCurrentFilter);
}


/* ═══════════════════════════════════════════════════════════════
   REBUILD STUDENT DATA
   ═══════════════════════════════════════════════════════════════ */

function rebuildStudentData() {

  const storedQuizzes =
    window.GableStore
      ? GableStore.getQuizzes()
      : [];

  formalQuizzes.length = 0;
  informalQuizzes.length = 0;

  completedFormal.length = 0;
  completedInformal.length = 0;

  homeAvailableQuizzes.length = 0;
  homeCompletedActivity.length = 0;
  homeRecentQuizzes.length = 0;

  const recentDatabaseQuizzes = [
    ...databaseQuizzes
]
    .filter(quizMatchesStudent)
    .filter(q =>
        String(q.status || 'active').toLowerCase() === 'active'
    )
    .filter(q => !isQuizCompleted(q))
    .sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
    )
    .slice(0, 5);

recentDatabaseQuizzes.forEach(q => {
    homeRecentQuizzes.push(q);
});

  leaderboardData.length = 0;
  boostableQuizzes.length = 0;

  myResults = {};

const allQuizzes =
  [
    ...storedQuizzes.map(
      normalizeQuiz
    ),

    ...databaseQuizzes
  ];

  const uniqueQuizzes =
  [
    ...new Map(

      allQuizzes.map(
        quiz => [

          String(quiz.id),

          quiz

        ]
      )

    ).values()
  ];

  const quizzes =
  uniqueQuizzes
    .filter(quizMatchesStudent)
    .filter(
      quiz =>
        String(
          quiz.status ||
          'active'
        ).toLowerCase() ===
        'active'
    );


  const submissions =
    getStudentSubmissions();


  /* Restore completed quizzes */
  submissions.forEach(s => {

    if (s.quizId == null) {
      return;
    }

    myResults[s.quizId] = {

      score:
        Number(s.score) || 0,

      xpEarned:
        Number(s.xpEarned) || 0,

      wasMultiplied:
        !!s.wasMultiplied,

      answers:
        Array.isArray(s.answers)
          ? s.answers
          : [],
        
      status:
    s.status ||
    'submitted',

      submittedAt:
        s.submittedAt ||
        s.createdAt ||
        Date.now()

    };

  });


  quizzes.forEach(q => {

    if (quizIsInformal(q)) {
      informalQuizzes.push(q);
    } else {
      formalQuizzes.push(q);
    }


    const result =
    myResults[q.id];


/*
|--------------------------------------------------------------------------
| QUIZ ALREADY SUBMITTED IN DATABASE
|--------------------------------------------------------------------------
|
| The database knows the student submitted this quiz,
| but local myResults may not contain the result yet.
|
| Do NOT treat it as a completed local result because
| result.score may not exist.
|--------------------------------------------------------------------------
*/


if (
    (
        q.submitted === true ||
        q.submitted === 1
    ) &&
    !result
) {
    return;
}


/*
|--------------------------------------------------------------------------
| QUIZ HAS A LOCAL RESULT
|--------------------------------------------------------------------------
*/

if (!result) {

    homeAvailableQuizzes.push({

        id:
            q.id,

        title:
            q.title,

        subject:
            q.subject,

        due:
            q.due,

        xp:
            q.xpReward,

        btnClass:
            q.typeClass,

        btnLabel:
            getBattleLabel(
                q.type
            ),

        onclick:
            `openBattle(${q.id})`

    });

} else {

    const completed = {

        title:
            q.title,

        subject:
            q.subject,

        type:
            q.type,

        typeClass:
            q.typeClass,

        icon:
            q.icon,

        iconBg:
            q.iconBg ||
            'linear-gradient(135deg,#7c5cbf,#e05ca0)',

        score:
            result.score,

        grade:
            gradeLabel(
                result.score
            ),

        gradeClass:
            gradeClass(
                result.score
            ),

        xpEarned:
            result.xpEarned,

        timeAgo:
            formatRecentTime(
                result.submittedAt
            ),

        perfect:
            result.score === 100

    };


    if (quizIsInformal(q)) {

        completedInformal.push(
            completed
        );

    } else {

        completedFormal.push(
            completed
        );

    }


    homeCompletedActivity.push({

        title:
            q.title,

        subject:
            q.subject,

        score:
    result.status === 'pending_review'
        ? 'Under Review'
        : `${result.score}%`,

        badge:
    result.status === 'pending_review'
        ? 'Under Review'
        : result.score === 100
            ? 'Perfect'
            : result.score >= 80
                ? 'Passed'
                : 'Completed',

        badgeClass:
            result.score === 100
                ? 'perfect'
                : result.score >= 80
                    ? 'good'
                    : '',

        xp:
    result.status === 'pending_review'
        ? 'Pending grading'
        : `+${result.xpEarned} XP`,

        perfect:
            result.score === 100

          });

      }

  });

  /* ═══ BOOSTABLE QUIZZES ═══ */

  updateProfileUI();

  updateWeakSpotData();

  updatePerformanceUI();

}

function updateQuizHeroBanner() {

  const allQuizzes = [
    ...formalQuizzes,
    ...informalQuizzes
  ];

  const total = allQuizzes.length;

  const completed =
    allQuizzes.filter(isQuizCompleted).length;

  const remaining = total - completed;


  setText(
    'current-streak-value',
    `${studentProfile.streak || 0} day study streak`
  );


  let milestone;

  if (!total) {

    milestone = 'No quizzes available yet';

  } else if (!remaining) {

    milestone = 'All quizzes completed! 🎉';

  } else {

    milestone =
      `${remaining} more quiz${remaining !== 1 ? 'zes' : ''} to finish them all`;

  }

  setText('next-milestone-value', milestone);


  setText(
    'quiz-summary',
    `${total} quiz${total !== 1 ? 'zes' : ''} available • ${completed} completed`
  );

}

function calculatePerfectStreak() {
  const gradedResults = (databaseSubmissions || [])
    .filter(s =>
      String(s.status || '').toLowerCase() === 'graded'
    )
    .sort((a, b) => {
      const dateA = new Date(
        a.graded_at || a.updated_at || a.submitted_at || 0
      ).getTime();

      const dateB = new Date(
        b.graded_at || b.updated_at || b.submitted_at || 0
      ).getTime();

      return dateB - dateA;
    });

  let streak = 0;

  for (const result of gradedResults) {
    const score = Number(result.score);

    if (!Number.isFinite(score) || score !== 100) {
      break;
    }

    streak++;
  }

  return streak;
}


/* ═══════════════════════════════════════════════════════════════
   PROFILE UI
   ═══════════════════════════════════════════════════════════════ */

function updateProfileUI() {

  if (!studentProfile) {
    return;
  }


  const initials =
    initialsFromName(
      studentProfile.name
    );


  const rankEntry =
    leaderboardData.find(
      s => s.isMe
    );


  const rank =
    rankEntry
      ? rankEntry.rank
      : 1;


  const scores =
    Object.values(myResults)
      .map(
        r => Number(r.score) || 0
      );


  const accuracy =
    scores.length
      ? Math.round(
          scores.reduce(
            (a, b) => a + b,
            0
          ) /
          scores.length
        )
      : 0;


  setText(
    'profile-name',
    studentProfile.name
  );

  setText(
    'profile-student-id',
    studentProfile.id
  );

  setText(
    'profile-program',
    studentProfile.programShort ||
    studentProfile.program
  );

  setText(
    'profile-year',
    studentProfile.year
  );

  setText(
    'profile-section',
    `Section ${studentProfile.section}`
  );

  setText(
    'profile-xp-val',
    studentXP
  );

  setText('profile-accuracy', `${accuracy}%`);
  setText('profile-rank', rankEntry ? `#${rankEntry.rank}` : '--');
  setText('profile-completed', scores.length);


  setText(
    'profile-college',
    studentProfile.college
  );

  setText(
    'profile-program-full',
    studentProfile.program
  );


  /* Navbar */
  setText(
    'nav-student-name',
    studentProfile.name
  );

  setText(
    'nav-student-program',
    studentProfile.programShort ||
    studentProfile.program
  );


  /* Home */
  setText(
    'home-welcome',
    `Welcome back, ${studentProfile.name}! 👋`
  );

  setText(
    'home-summary',
    `${studentProfile.programShort || studentProfile.program} • ${studentProfile.year} • Section ${studentProfile.section}`
  );

  setText(
    'home-streak',
    `🔥 ${studentProfile.streak || 0} day streak`
  );

  setText(
    'home-xp-trend',
    studentXP
      ? '⭐ Keep going!'
      : ''
  );

  setText(
    'home-accuracy',
    `${accuracy}%`
  );

  setText(
    'home-accuracy-trend',
    accuracy >= 90
      ? 'Excellent'
      : accuracy
        ? 'Keep improving'
        : ''
  );

  setText(
    'home-accuracy-sub',
    `${scores.length} quiz${scores.length !== 1 ? 'zes' : ''} completed`
  );

  setText(
    'home-rank',
    `#${rank}`
  );

  setText(
    'home-section',
    `Section ${studentProfile.section}`
  );

  setText(
    'home-completed',
    scores.length
  );

  setText(
    'home-completed-sub',
    'Quizzes completed'
  );


  /* XP tab */
  setText(
  'xp-perfect-streak',
  calculatePerfectStreak()
);

  setText(
    'xp-completed',
    scores.length
  );

  setText(
    'xp-accuracy',
    `${accuracy}%`
  );


  /* Avatar */
  const avatar =
    document.getElementById(
      'profile-avatar'
    );

  const navAvatar =
    document.getElementById(
      'nav-avatar'
    );

  if (avatar) {
    avatar.textContent =
      initials;
  }

  if (navAvatar) {
    navAvatar.textContent =
      initials;
  }

  updateQuizHeroBanner();

}

/* ═══════════════════════════════════════════════════════════════
   HOME PERFORMANCE OVERVIEW
   ═══════════════════════════════════════════════════════════════ */

function renderHomePerformanceOverview() {

    const sections =
        document.querySelectorAll(
            '#panel-home .perf-section'
        );


    if (sections.length < 2) {
        return;
    }


    /*
    |--------------------------------------------------------------------------
    | INFORMAL ACTIVITIES
    |--------------------------------------------------------------------------
    */

    renderPerformanceSection(
        sections[0],
        informalQuizzes
    );


    /*
    |--------------------------------------------------------------------------
    | FORMAL ACTIVITIES
    |--------------------------------------------------------------------------
    */

    renderPerformanceSection(
        sections[1],
        formalQuizzes
    );

}


/* ═══════════════════════════════════════════════════════════════
   RENDER PERFORMANCE SECTION
   ═══════════════════════════════════════════════════════════════ */

function renderPerformanceSection(
    section,
    quizList
) {

    if (!section) {
        return;
    }


    /*
    |--------------------------------------------------------------------------
    | GET EXISTING ROWS
    |--------------------------------------------------------------------------
    */

    const rows =
        section.querySelectorAll(
            '.perf-row'
        );


    /*
    |--------------------------------------------------------------------------
    | GROUP QUIZZES BY SUBJECT
    |--------------------------------------------------------------------------
    */

    const subjectData = {};


    quizList.forEach(
        quiz => {

            const subject =
                String(
                    quiz.subject ||
                    'Unknown Subject'
                ).trim();


            if (!subject) {
                return;
            }


            /*
            --------------------------------------------------------------
            | Create subject entry
            --------------------------------------------------------------
            */

            if (!subjectData[subject]) {

                subjectData[subject] = {

                    subject:
                        subject,

                    scores:
                        []

                };

            }


            const result =
                myResults[
                    quiz.id
                ];

            const score = Number(result?.score);
            if (
                result &&
                String(result.status || '').toLowerCase() !== 'pending_review' &&
                result.score !== null &&
                result.score !== undefined &&
                result.score !== '' &&
                Number.isFinite(score)
            ) {
                subjectData[subject].scores.push(score);
            }

        }
    );


    /*
    |--------------------------------------------------------------------------
    | CONVERT TO ARRAY
    |--------------------------------------------------------------------------
    */

    const subjects =
        Object.values(
            subjectData
        )
        .sort(
            (a, b) =>
                a.subject.localeCompare(
                    b.subject
                )
        );


    /*
    |--------------------------------------------------------------------------
    | DISPLAY SUBJECTS
    |--------------------------------------------------------------------------
    */

    rows.forEach(
        (row, index) => {

            const subject =
                subjects[index];


            /*
            --------------------------------------------------------------
            | Hide unused rows
            --------------------------------------------------------------
            */

            if (!subject) {

                row.style.display =
                    'none';

                return;

            }


            row.style.display =
                'block';


            const percentage = subject.scores.length
                ? Math.round(
                    subject.scores.reduce((sum, score) => sum + score, 0) /
                    subject.scores.length
                )
                : null;


            /*
            --------------------------------------------------------------
            | Find elements
            --------------------------------------------------------------
            */

            const label =
                row.querySelector(
                    '.perf-row-label'
                );


            const pct =
                row.querySelector(
                    '.perf-row-pct'
                );


            const bar =
                row.querySelector(
                    '.perf-bar-fill'
                );


            /*
            --------------------------------------------------------------
            | Subject name
            --------------------------------------------------------------
            */

            if (label) {

                label.textContent =
                    subject.subject;

            }


            /*
            --------------------------------------------------------------
            | Percentage
            --------------------------------------------------------------
            */

            if (pct) {

                pct.textContent =
                    percentage === null ? '--' : `${percentage}%`;

            }


            /*
            --------------------------------------------------------------
            | Progress bar
            --------------------------------------------------------------
            */

            if (bar) {

                bar.style.width =
                    `${percentage ?? 0}%`;

            }


            /*
            --------------------------------------------------------------
            | Debug information
            --------------------------------------------------------------
            */

            console.log(
                'Performance Overview:',
                {
                    type:
                        quizList === informalQuizzes
                            ? 'Informal'
                            : 'Formal',

                    subject:
                        subject.subject,

                    graded:
                        subject.scores.length,

                    percentage:
                        percentage
                }
            );

        }
    );

}

/* ═══════════════════════════════════════════════════════════════
   SUBJECT PERFORMANCE DATA
   Calculates averages using graded quiz results only
   ═══════════════════════════════════════════════════════════════ */

function updateWeakSpotData() {
  

  if (typeof subjectScores === 'undefined') {
    return;
  }

  subjectScores.length = 0;

  const subjects = {};

  // Build a lookup of quizzes so each result can be matched
  // to its subject and quiz type.
  const allQuizzes = [
    ...(Array.isArray(formalQuizzes) ? formalQuizzes : []),
    ...(Array.isArray(informalQuizzes) ? informalQuizzes : []),
    ...(Array.isArray(databaseQuizzes) ? databaseQuizzes : [])
  ];

  const quizLookup = new Map();

  allQuizzes.forEach(quiz => {
    if (quiz && quiz.id != null) {
      quizLookup.set(String(quiz.id), quiz);
    }
  });

  // Use all student results, not only currently active quizzes.
  const results =
    typeof myResults !== 'undefined' && myResults
      ? Object.entries(myResults)
      : [];

        

    const answered = new Set();

  results.forEach(([quizId, result]) => {
    if (!result) return;

    const quiz = quizLookup.get(String(quizId));

    if (!quiz) {
      console.warn(
        'Subject Performance: no quiz found for result',
        quizId
      );
      return;
    }

    const subjectName =
      String(quiz.subject || 'Unknown Subject').trim();

    // Every subject with an answered quiz is listed on the card.
    answered.add(subjectName);

    // Only graded quizzes count toward the averages.
     if (String(result.status || '').toLowerCase() === 'pending_review') {
      return;
    }

    const score = Number(result.score);

    if (!Number.isFinite(score)) return;

    if (!subjects[subjectName]) {
      subjects[subjectName] = {
        subject: subjectName,
        formalScores: [],
        informalScores: []
      };
    }

    const isInformal =
      typeof quizIsInformal === 'function'
        ? quizIsInformal(quiz)
        : false;

    if (isInformal) {
      subjects[subjectName].informalScores.push(score);
    } else {
      subjects[subjectName].formalScores.push(score);
    }
  });

  answeredSubjectNames = [...answered];

  // Calculate formal, informal, and overall subject averages.
  Object.values(subjects).forEach(subject => {
    const average = scores =>
      scores.length
        ? Math.round(
            scores.reduce((sum, score) => sum + score, 0) /
            scores.length
          )
        : null;

    const formal = average(subject.formalScores);
    const informal = average(subject.informalScores);

    const availableScores = [formal, informal]
      .filter(score => score !== null);

    const avg = availableScores.length
      ? Math.round(
          availableScores.reduce((sum, score) => sum + score, 0) /
          availableScores.length
        )
      : null;

    subjectScores.push({
      subject: subject.subject,
      formal,
      informal,
      avg
    });
  });

  if (typeof renderWeakSpotHome === 'function') {
    renderWeakSpotHome();
  }

  if (typeof renderWeakSpotPerformance === 'function') {
    renderWeakSpotPerformance();
  }

  renderSubjectPerformanceCard();
}

/* ═══════════════════════════════════════════════════════════════
   SUBJECT PERFORMANCE CARD
   Displays graded quiz averages for each subject
   ═══════════════════════════════════════════════════════════════ */

function summarizeQuizPerformance(quizzes, results) {
  const subjects = new Map();
  const unique = new Map(quizzes.map(quiz => [String(quiz.id), quiz]));
  for (const [id, quiz] of unique) {
    const name = String(quiz.subject || 'General').trim();
    if (!subjects.has(name)) subjects.set(name, { subject: name, total: 0, completed: 0, pending: 0, formal: [], informal: [], xp: 0 });
    const subject = subjects.get(name);
    subject.total++;
    const result = results[id];
    if (!result) continue;
    subject.completed++;
    if (result.status === 'pending_review') { subject.pending++; continue; }
    if (result.score === null || result.score === undefined || !Number.isFinite(Number(result.score))) continue;
    subject[quizIsInformal(quiz) ? 'informal' : 'formal'].push(Number(result.score));
    subject.xp += Number(result.xpEarned) || 0;
  }
  return [...subjects.values()].sort((a, b) => a.subject.localeCompare(b.subject));
}

function renderSubjectPerformanceCard() {
  const container = document.getElementById('subject-performance-grid');
  if (!container) return;
  const subjects = summarizeQuizPerformance([...formalQuizzes, ...informalQuizzes], myResults);
  container.replaceChildren();
  if (!subjects.length) {
    container.innerHTML = '<div class="subject-empty"><h4>No subjects assigned yet</h4><p>Your subject cards will appear when your instructor publishes a quiz for your section.</p></div>';
    return;
  }
  const average = scores => scores.length ? `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%` : '--';
  subjects.forEach(subject => {
    const scores = [...subject.formal, ...subject.informal];
    const completion = Math.round(subject.completed / subject.total * 100);
    const card = document.createElement('article');
    card.className = 'subject-result-card';
    card.innerHTML = `
      <div class="subject-card-heading"><h4></h4><span class="subject-status">${subject.completed === 0 ? 'Not started' : subject.pending ? 'Awaiting review' : subject.completed === subject.total ? 'Completed' : 'In progress'}</span></div>
      <div class="subject-score"><strong>${average(scores)}</strong><span>${scores.length ? 'average graded score' : 'No graded results yet'}</span></div>
      <div class="subject-score-split"><div><span class="formal">Formal</span><strong>${average(subject.formal)}</strong></div><div><span class="informal">Informal</span><strong>${average(subject.informal)}</strong></div></div>
      <div class="subject-completion-label"><span>${subject.completed} of ${subject.total} submitted</span><strong>${completion}%</strong></div>
      <div class="sp-bar-track" role="progressbar" aria-label="Quiz completion" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${completion}"><div class="sp-bar-fill" style="width:${completion}%"></div></div>
      <p class="subject-card-footer">${scores.length} graded &middot; ${subject.pending} awaiting review &middot; ${subject.xp} XP</p>`;
    card.querySelector('h4').textContent = subject.subject;
    container.appendChild(card);
  });
}

function updatePerformanceUI() {
  const allResults = Object.values(myResults);
  const graded = allResults.filter(result => result.status !== 'pending_review' && result.score !== null && result.score !== undefined && Number.isFinite(Number(result.score)));
  const scores = graded.map(result => Number(result.score));
  const average = list => list.length ? Math.round(list.reduce((sum, score) => sum + score, 0) / list.length) : null;
  const accuracy = average(scores);
  setText('overall-accuracy', accuracy === null ? '--' : `${accuracy}%`);
  setText('xp-accuracy', accuracy === null ? '--' : `${accuracy}%`);
  setText('overall-completed', allResults.length);
  setText('xp-completed', allResults.length);
  setText('xp-perfect-streak', calculatePerfectStreak());
  setText('overall-xp', studentQuizXP);
  setText('overall-streak', calculatePerfectStreak());
  const categories = [['formal', formalQuizzes], ['informal', informalQuizzes]].map(([name, quizzes]) => {
    const results = quizzes.map(quiz => myResults[quiz.id]).filter(Boolean);
    const finalized = results.filter(result => result.status !== 'pending_review' && result.score !== null && result.score !== undefined && Number.isFinite(Number(result.score)));
    return { name, total: quizzes.length, completed: results.length, avg: average(finalized.map(result => Number(result.score))), xp: finalized.reduce((sum, result) => sum + (Number(result.xpEarned) || 0), 0) };
  });
  const totalXP = categories.reduce((sum, category) => sum + category.xp, 0);
  for (const category of categories) {
    const completion = category.total ? Math.round(category.completed / category.total * 100) : 0;
    setText(`${category.name}-average`, category.avg === null ? 'No grades yet' : `${category.avg}%`);
    setText(`${category.name}-xp`, `${category.xp} XP`);
    setText(`${category.name}-completion`, `${category.completed}/${category.total} (${completion}%)`);
    for (const [metric, percent] of [['average', category.avg || 0], ['xp', totalXP ? category.xp / totalXP * 100 : 0], ['completion', completion]]) {
      const fill = document.getElementById(`${category.name}-${metric}-bar`);
      if (!fill) continue;
      const value = Math.max(0, Math.min(100, percent));
      fill.style.width = `${value}%`;
      fill.parentElement.setAttribute('role', 'meter');
      fill.parentElement.setAttribute('aria-label', `${category.name} ${metric}`);
      fill.parentElement.setAttribute('aria-valuemin', '0');
      fill.parentElement.setAttribute('aria-valuemax', '100');
      fill.parentElement.setAttribute('aria-valuenow', String(Math.round(value)));
      fill.parentElement.setAttribute('aria-valuetext', metric === 'average' && category.avg === null ? 'No grades yet' : metric === 'xp' ? `${category.xp} XP, ${Math.round(value)}% of quiz XP` : `${Math.round(value)}%`);
    }
  }
  for (const [name, minimum, maximum] of [['perfect',100,100],['excellent',90,99.999],['good',80,89.999],['pass',70,79.999]]) {
    const count = scores.filter(score => score >= minimum && score <= maximum).length;
    setText(`xp-${name}-sub`, `${count} graded quiz${count === 1 ? '' : 'zes'}`);
  }
  renderSubjectPerformanceCard();
  renderHomePerformanceOverview();
}

function saveStudentXP() {

  if (
    !studentProfile ||
    !window.GableStore
  ) {
    return;
  }

  studentProfile.xp =
    Math.max(
      0,
      Math.round(
        Number(studentXP) || 0
      )
    );

  GableStore.saveStudentProfile(
    studentProfile
  );

}


/* ═══════════════════════════════════════════════════════════════
   BATTLE STATE
   ═══════════════════════════════════════════════════════════════ */

let activeBattle = null,
    battleAnswers = [],
    battleCurrentQ = 0;


/* ═══════════════════════════════════════════════════════════════
   TABS
   ═══════════════════════════════════════════════════════════════ */

function switchTab(tab) {

  document
    .querySelectorAll('.nav-tab')
    .forEach(
      t =>
        t.classList.remove('active')
    );

  document
    .querySelectorAll('.panel')
    .forEach(
      p =>
        p.classList.remove('active')
    );


  document.querySelectorAll('.nav-tab').forEach(button => {
    const selected = button.dataset.panel === tab;
    button.classList.toggle('active', selected);
    if (selected) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  document.getElementById('panel-' + tab)?.classList.add('active');
  closeXpPopup();
  if (typeof sbSyncView === 'function') sbSyncView();

  if (tab === 'home') {
    renderHome();
  }

  if (tab === 'quizzes') {
    renderQuizzes();
  }

  if (tab === 'leaderboard') {
    renderLeaderboard('section');
  }

  if (tab === 'powerups') {

    if (
      typeof renderPowerupsTab ===
      'function'
    ) {
      renderPowerupsTab();
    }

  }

  if (tab === 'xp') {
    renderXP();
    loadStudentXP().then(renderXP);
  }

}


/* ═══ HOME ═══ */

function switchHomeActivity(view) {
    for (const name of ['recent', 'latest']) {
        const selected = name === view;
        const tab = document.getElementById(`home-${name}-tab`);
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        document.getElementById(name === 'recent' ? 'home-available-list' : 'home-completed-list').hidden = !selected;
    }
}
document.addEventListener('keydown', event => {
    if (!event.target.matches('.home-activity-tabs button')) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const view = event.key === 'Home' ? 'recent' : event.key === 'End' ? 'latest' : event.target.id === 'home-recent-tab' ? 'latest' : 'recent';
    switchHomeActivity(view);
    document.getElementById(`home-${view}-tab`).focus();
});

function renderHome() {
  renderStudentSubjects(studentProfile?.subjects || []);

    // Render recently added quizzes
    renderRecentQuizActivity();


    // Render completed activities
    const completedContainer =
        document.getElementById('home-completed-list');

    if (!completedContainer) return;


    if (!homeCompletedActivity.length) {

        completedContainer.innerHTML = `
            <div class="empty-state">
                <span class="emoji">🏆</span>

                <p>
                    No quizzes completed yet.
                </p>
            </div>
        `;

        return;
    }


    completedContainer.innerHTML =
        homeCompletedActivity
            .map(a => `
                <div class="activity-done ${a.perfect ? 'perfect' : ''}">

                    <div class="ad-left">

                        <div class="ad-title">
                            ${a.title}
                        </div>

                        <div class="ad-sub">
                            ${a.subject}
                        </div>

                        <div
                            style="
                                font-size:.72rem;
                                color:rgba(255,255,255,.6);
                                margin-top:.2rem;
                            "
                        >
                            ${a.score}
                        </div>

                    </div>


                    <div class="ad-right">

                        <div class="ad-badge ${a.badgeClass}">
                            ${a.badge}
                        </div>

                        <div class="ad-xp">
                            ${a.xp}
                        </div>

                    </div>

                </div>
            `)
            .join('');
}

function isQuizCompleted(q) {

    return (
        q.submitted === true ||
        q.submitted === 1 ||
        String(q.submitted) === '1' ||
        String(q.submitted).toLowerCase() === 'true' ||
        Boolean(myResults[q.id])
    );

}


function renderRecentQuizActivity() {

    const container =
        document.getElementById('home-available-list');

    if (!container) return;

    const recentQuizzes =
        [...databaseQuizzes]
            .filter(q =>
                String(q.status || 'active').toLowerCase() === 'active'
            )
            .filter(quizMatchesStudent)
            .filter(q => !isQuizCompleted(q))
            .sort((a, b) =>
                new Date(b.createdAt) -
                new Date(a.createdAt)
            )
            .slice(0, 5);

    if (!recentQuizzes.length) {

        container.innerHTML = `
            <div class="empty-state">
                <span class="emoji">📭</span>
                <p>You're all caught up! No pending quizzes.</p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        recentQuizzes.map(q => {

            const informal =
                quizIsInformal(q);

            const category =
                informal
                    ? 'Informal'
                    : 'Formal';

            const icon =
                informal
                    ? '🏠'
                    : '🏫';

            return `
                <div class="activity-available">

                    <div class="aa-left">

                        <span class="aa-badge">
                            ${icon} ${category}
                        </span>

                        <div class="aa-title">
                            ${q.title}
                        </div>

                        <div class="aa-sub">
                            ${q.subject}
                        </div>

                        <div class="aa-meta">
                            Added ${formatRecentTime(q.createdAt)}
                        </div>

                    </div>

                    <button
                      class="btn-start ${q.typeClass}"
                      onclick="openBattle(${q.id})"
                      ${q.submitted ? 'disabled' : ''}>

                      ${q.submitted
                          ? '✓ Submitted'
                          : 'Start Quiz →'
                      }

                    </button>

                </div>
            `;

        }).join('');
}

function formatRecentTime(dateValue) {

    if (!dateValue) {
        return 'Recently';
    }

    const date = new Date(
        String(dateValue).replace(' ', 'T')
    );

    if (Number.isNaN(date.getTime())) {
        return 'Recently';
    }

    const diff =
        Date.now() - date.getTime();

    const minutes =
        Math.floor(diff / 60000);

    if (minutes < 1) {
        return 'just now';
    }

    if (minutes < 60) {
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }

    const hours =
        Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }

    const days =
        Math.floor(hours / 24);

    if (days < 7) {
        return `${days} day${days === 1 ? '' : 's'} ago`;
    }

    return date.toLocaleDateString();
}

function renderQuizGrid(
  quizzes,
  containerId,
  emptyMessage
) {

  const container =
    document.getElementById(
      containerId
    );

  if (!container) {
    return;
  }


  if (!quizzes.length) {

    container.innerHTML = `

      <div class="empty-state">

        <span class="emoji">
          📭
        </span>

        <p>
          ${emptyMessage}
        </p>

      </div>

    `;

    return;

  }


  container.innerHTML =

    quizzes
      .map(q => {

        const done =
          myResults[q.id];


        const btnLabel =
          done
            ? `✓ Completed (${done.score}%)`
            : getBattleLabel(
                q.type
              );


        const btnClass =
          done
            ? 'done'
            : '';


        const btnAction =
          done
            ? `viewResult(${q.id})`
            : `openBattle(${q.id})`;


        return `

        <div
          class="battle-card ${q.typeClass}"
          onclick="${btnAction}">

          <div>

            <span class="bc-badge">
              ${q.badgeIcon}
              ${q.type}
            </span>

          </div>


          <div class="battle-card-title">
            ${q.title}
          </div>


          <div class="battle-card-sub">
            ${q.subject}
          </div>


          <div class="bc-xp-box">

            <span class="bc-xp-label">
              Max XP
            </span>

            <span class="bc-xp-val">
              +${q.xpReward} XP
            </span>

          </div>


          <div class="bc-desc-box">

            <div class="bc-desc-label">
              ${q.descLabel}
            </div>

            <div class="bc-desc-text">
              ${q.desc}
            </div>

          </div>


          <div class="bc-meta">

            <div class="bc-meta-item">

              <div class="bcm-label">
                Mode
              </div>

              <div class="bcm-val">
                ${q.players}
              </div>

            </div>


            <div class="bc-meta-item">

              <div class="bcm-label">
                Time
              </div>

              <div class="bcm-val">
                ${quizTimingText(q)}
              </div>

            </div>

          </div>


          <button
            class="btn-battle ${btnClass}"
            onclick="
              event.stopPropagation();
              ${btnAction}
            ">

            ${btnLabel}

          </button>

        </div>

        `;

      })
      .join('');

}


/* ═══ MY QUIZZES ═══ */

function filterCompletedBySubject(quizzes, selectorId) {
  const select = document.getElementById(selectorId);
  const selected = select.value;
  const subjects = [...new Set(quizzes.map(q => q.subject).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  select.replaceChildren(new Option('All subjects', ''),
    ...subjects.map(subject => new Option(subject, subject)));
  select.value = subjects.includes(selected) ? selected : '';
  return quizzes.filter(q => !select.value || q.subject === select.value);
}

function renderQuizzes() {


  renderQuizGrid(

    formalQuizzes,

    'formal-battle-grid',

    'No formal quizzes available yet.'

  );


  renderQuizGrid(

    informalQuizzes,

    'informal-battle-grid',

    'No informal quizzes available yet.'

  );

  const allCompletedFormal =
    [
      ...completedFormal,

      ...formalQuizzes
        .filter(
          q => myResults[q.id]
        )
        .map(q => ({

          title: q.title,

          subject: q.subject,

          type: q.type,

          typeClass:
            q.typeClass,

          icon: q.icon,

          iconBg:
            'linear-gradient(135deg,#7c5cbf,#e05ca0)',

          score:
            myResults[q.id].score,

          grade:
            gradeLabel(
              myResults[q.id].score
            ),

          gradeClass:
            gradeClass(
              myResults[q.id].score
            ),

          xpEarned:
            myResults[q.id].xpEarned,

          timeAgo:
            'Just now',

          perfect:
            myResults[q.id].score === 100

        }))

    ];


  document.getElementById(
    'completed-formal-list'
  ).innerHTML =

    filterCompletedBySubject(allCompletedFormal, 'formal-history-subject')
      .map(c => `

      <div
        class="completed-item ${c.perfect?'perfect':''}">

        <div class="ci-info">

          <div class="ci-title">

            ${c.title}

            <span
              style="
                font-size:.65rem;
                font-weight:700;
                padding:.15rem .5rem;
                border-radius:6px;
                background:rgba(255,255,255,.12)
              ">
              ${c.type}
            </span>

          </div>

          <div class="ci-sub">
            ${c.subject}
            &bull;
            ${c.timeAgo}
          </div>

        </div>

        <div class="ci-right">

          <div
            class="ci-badge ${c.gradeClass}">
            ${c.grade}
          </div>

          <div class="ci-xp">
            +${c.xpEarned} XP Earned
          </div>

        </div>

      </div>

    `)
    .join('') ||

    `
    <div class="empty-state">
      <p>
        No formal quizzes completed yet.
        Join a battle!
      </p>
    </div>
    `;


  document.getElementById(
    'completed-informal-list'
  ).innerHTML =

    filterCompletedBySubject(completedInformal, 'informal-history-subject')
      .map(c => `

      <div class="completed-item">

        <div class="ci-info">

          <div class="ci-title">

            ${c.title}

            <span
              style="
                font-size:.65rem;
                font-weight:700;
                padding:.15rem .5rem;
                border-radius:6px;
                background:rgba(74,222,128,.2);
                color:var(--green)
              ">
              ${c.type}
            </span>

          </div>

          <div class="ci-sub">
            ${c.subject}
            &bull;
            ${c.timeAgo}
          </div>

        </div>

        <div class="ci-right">

          <div
            class="ci-badge ${c.gradeClass}">
            ${c.grade}
          </div>

          <div class="ci-xp">
            +${c.xpEarned} XP Earned
          </div>

        </div>

      </div>

    `)
    .join('') || '<div class="empty-state"><p>No informal quizzes completed yet.</p></div>';

}


function getBattleLabel(type) {

  if (type === 'Team Battle') {
    return 'Join Team Battle! →';
  }

  if (type === 'Solo Battle') {
    return 'Start Solo Battle! →';
  }

  if (type === 'Battle Royale') {
    return 'Join Battle Royale! →';
  }

  return 'Start Quiz →';

}


function gradeLabel(score) {

  if (score === 100) {
    return 'Perfect Score! 100%';
  }

  if (score >= 90) {
    return `Excellent! ${score}%`;
  }

  if (score >= 80) {
    return `Good! ${score}%`;
  }

  return `Pass ${score}%`;

}


function gradeClass(score) {

  if (
    score === 100 ||
    score >= 90
  ) {

    return score === 100
      ? 'cib-perfect'
      : 'cib-excellent';

  }

  if (score >= 80) {
    return 'cib-good';
  }

  return '';

}

async function loadDatabaseLeaderboard() {

    try {

        const response =
            await fetch(
                '../assets/php/get_student_leaderboard.php',
                {
                    method: 'GET',
                    credentials: 'include',
                    cache: 'no-store'
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            console.error(
                'Failed to load leaderboard:',
                data.message ||
                'Unknown error'
            );

            return;

        }


        /*
        |--------------------------------------------------------------------------
        | CLEAR OLD LEADERBOARD DATA
        |--------------------------------------------------------------------------
        */

        leaderboardData.length = 0;


        /*
        |--------------------------------------------------------------------------
        | LOAD STUDENTS
        |--------------------------------------------------------------------------
        */

        (data.students || []).forEach(
            s => {

                leaderboardData.push({

                    id:
                        String(
                            s.id
                        ),

                    name:
                        s.name ||
                        s.id,

                    section:
                        String(
                            s.section ||
                            ''
                        ).trim(),

                    program:
                        String(
                            s.program ||
                            ''
                        ).trim(),

                    year_level:
                        String(
                            s.year_level ||
                            ''
                        ).trim(),

                    block:
                        String(
                            s.block ||
                            ''
                        ).trim(),

                    xp:
                        Number(
                            s.xp
                        ) || 0,

                    score:
                        Number(
                            s.score
                        ) || 0,

                    level_xp: Number(s.level_xp) || 0,
                    submissions:
                        Number(
                            s.submissions
                        ) || 0,

                    initials:
                        initialsFromName(
                            s.name ||
                            s.id
                        ),

                    color:
                        'linear-gradient(135deg,#4f8ef7,#7c5cbf)',

                    isMe:
                        String(s.id) ===
                        String(
                            studentProfile?.id
                        )

                });

            }
        );

        /*
        |--------------------------------------------------------------------------
        | ASSIGN LEADERBOARD RANK
        |--------------------------------------------------------------------------
        */

        leaderboardData.forEach(
            (student, index) => {

                student.rank =
                    index + 1;

            }
        );


    } catch (error) {

        console.error(
            'Leaderboard loading error:',
            error
        );

    }

}

/* ═══════════════════════════════════════════════════════════════
   STUDENT LEADERBOARD
   ═══════════════════════════════════════════════════════════════ */

let lbCurrentFilter = 'section';

let lbSelectedSubject = '';


/*
|--------------------------------------------------------------------------
| CHANGE LEADERBOARD FILTER
|--------------------------------------------------------------------------
*/

function setLbFilter(
    btn,
    filter
) {

    lbCurrentFilter =
        filter;


    document
        .querySelectorAll(
            '.lb-filter-btn'
        )
        .forEach(
            b =>
                b.classList.remove(
                    'active'
                )
        );


    btn.classList.add(
        'active'
    );


    /*
    |--------------------------------------------------------------------------
    | SUBJECT
    |--------------------------------------------------------------------------
    */

    if (
        filter === 'subject'
    ) {

        renderSubjectSelector();

    } else {

        /*
        | Hide subject selector
        */

        const container =
            document.getElementById(
                'lb-subject-selector'
            );


        if (container) {

            container.innerHTML =
                '';

        }

    }


    renderLeaderboard(
        filter
    );

}


/*
|--------------------------------------------------------------------------
| NORMALIZE SECTION
|--------------------------------------------------------------------------
|
| Prevents problems caused by:
|
| "BSIT 1A"
| "bsit 1a"
| "BSIT 1 A"
|
|--------------------------------------------------------------------------
*/

function normalizeLeaderboardSection(
    value
) {

    return String(
        value || ''
    )
        .trim()
        .replace(
            /\s+/g,
            ' '
        )
        .toLowerCase();

}

/*
|--------------------------------------------------------------------------
| GET SUBJECTS AVAILABLE TO THIS STUDENT
|--------------------------------------------------------------------------
|
| Subjects come from quizzes assigned to
| the student's section.
|--------------------------------------------------------------------------
*/

function getStudentSubjects() {

    const subjects = [...new Set((studentProfile?.subjects || []).map(item => item.subject))];


    databaseQuizzes
        .filter(
            quiz =>
                quizMatchesStudent(quiz)
        )
        .filter(
            quiz =>
                String(
                    quiz.status || 'active'
                ).toLowerCase() === 'active'
        )
        .forEach(
            quiz => {

                const subject =
                    String(
                        quiz.subject || ''
                    ).trim();


                if (
                    subject &&
                    !subjects.some(
                        existing =>
                            existing.toLowerCase() ===
                            subject.toLowerCase()
                    )
                ) {

                    subjects.push(
                        subject
                    );

                }

            }
        );


    return subjects.sort(
        (a, b) =>
            a.localeCompare(b)
    );

}

function renderSubjectSelector() {

    const container =
        document.getElementById(
            'lb-subject-selector'
        );


    if (!container) {
        return;
    }


    const subjects =
        getStudentSubjects();


    if (!subjects.length) {

        container.innerHTML = `

            <div
                style="
                    padding:12px;
                    color:var(--text-muted);
                    font-size:.85rem;
                "
            >
                📚 No subjects available yet.
            </div>

        `;

        return;

    }


    /*
    |--------------------------------------------------------------------------
    | Keep current subject if possible
    |--------------------------------------------------------------------------
    */

    if (
        !lbSelectedSubject ||
        !subjects.some(
            subject =>
                subject ===
                lbSelectedSubject
        )
    ) {

        lbSelectedSubject =
            subjects[0];

    }


    container.innerHTML = `

        <div
            class="lb-subject-select-wrap"
            style="
                margin:1rem 0;
            "
        >

            <label
                for="lb-subject-select"
                style="
                    display:block;
                    margin-bottom:.45rem;
                    font-size:.78rem;
                    color:var(--text-muted);
                "
            >
                📚 Subject
            </label>


            <select
                id="lb-subject-select"
                class="lb-subject-select"
                onchange="changeLeaderboardSubject(this.value)"
                style="
                    width:100%;
                    padding:.7rem .8rem;
                    border-radius:10px;
                    border:1px solid var(--border);
                    background:var(--surface);
                    color:var(--text);
                    font-family:inherit;
                    cursor:pointer;
                "
            >

                ${
                    subjects
                        .map(
                            subject => `

                                <option
                                    value="${subject.replace(
                                        /"/g,
                                        '&quot;'
                                    )}"
                                    ${
                                        subject ===
                                        lbSelectedSubject
                                            ? 'selected'
                                            : ''
                                    }
                                >
                                    ${subject}
                                </option>

                            `
                        )
                        .join('')
                }

            </select>

        </div>

    `;

}

function changeLeaderboardSubject(
    subject
) {

    lbSelectedSubject =
        subject;


    renderLeaderboard(
        'subject'
    );

}

/*
|--------------------------------------------------------------------------
| RENDER LEADERBOARD
|--------------------------------------------------------------------------
*/

let lbRenderVersion = 0;
async function renderLeaderboard(filter = 'section', page = 1) {
    const list = document.getElementById('lb-list');
    if (!list) return;
    const version = ++lbRenderVersion;
    let data = [...leaderboardData];
    if (filter === 'subject') {
        if (!lbSelectedSubject) { list.textContent = 'Please select a subject.'; return; }
        list.textContent = 'Loading subject rankings...';
        try {
            const response = await fetch('../assets/php/get_student_leaderboard.php?subject=' + encodeURIComponent(lbSelectedSubject), {credentials:'include',cache:'no-store'});
            const result = await response.json();
            if (version !== lbRenderVersion) return;
            if (!response.ok || !result.success) throw new Error(result.message || 'Could not load rankings.');
            data = result.students.map(student => ({...student, isMe:String(student.id) === String(studentProfile?.id)}));
        } catch (error) {
            if (version === lbRenderVersion) list.textContent = error.message;
            return;
        }
    } else if (filter === 'section') {
        const normalize = value => String(value || '').toLowerCase().replace(/\s+/g, '');
        data = data.filter(student => normalize(student.section) === normalize(studentProfile?.section));
    }
    list.replaceChildren();
    if (!data.length) { list.textContent = 'No students found for this leaderboard.'; return; }
    const total = data.length;
    const myRank = data.findIndex(student => student.isMe) + 1;
    const pages = Math.ceil(total / 50);
    page = Math.max(1, Math.min(page, pages));
    const offset = (page - 1) * 50;
    const fragment = document.createDocumentFragment();
    data.slice(offset, offset + 50).forEach((student, index) => {
        const row = document.createElement('div'); row.className = 'lb-row' + (student.isMe ? ' me' : '');
        const position = offset + index + 1;
        if (position <= 5) row.classList.add('lb-top', `lb-top-${position}`);
        const rank = document.createElement('div'); rank.className = 'lb-rank'; rank.textContent = '#' + (offset + index + 1);
        const avatar = document.createElement('div'); avatar.className = 'lb-avatar';
        const level = getLevelForXP(Number(student.level_xp) || 0);
        avatar.classList.add(getFrameTier(level.level).cls);
        avatar.title = `Level ${level.level} - ${level.name}`;
        avatar.style.background = 'linear-gradient(135deg,#4f8ef7,#7c5cbf)'; avatar.textContent = initialsFromName(student.name || student.id);
        const info = document.createElement('div'); info.className = 'lb-info';
        const name = document.createElement('strong'); name.textContent = student.name + (student.isMe ? ' (You)' : '');
        const levelLabel = document.createElement('span'); levelLabel.className = `lb-level student-level student-level-${level.level}`;
        levelLabel.textContent = `Level ${level.level} - ${level.name}`;
        const section = document.createElement('span'); section.textContent = 'Section ' + student.section;
        info.append(name, levelLabel, section);
        const xp = document.createElement('div'); xp.className = 'lb-xp'; xp.textContent = Number(student.xp || 0).toLocaleString() + ' XP';
        const score = document.createElement('div'); score.className = 'lb-score'; score.textContent = Number(student.score || 0).toFixed(2) + '%';
        row.append(rank, avatar, info, xp, score); fragment.append(row);
    });
    const navigation = document.createElement('div'); navigation.className = 'lb-pagination';
    const summary = document.createElement('span');
    summary.textContent = `${offset + 1}-${Math.min(offset + 50, total)} of ${total} students${myRank ? ` | Your rank: #${myRank}` : ''}`;
    navigation.append(summary);
    if (pages > 1) {
        for (const [label, target] of [['Previous', page - 1], ['Next', page + 1]]) {
            const button = document.createElement('button'); button.type = 'button'; button.className = 'btn-secondary';
            button.textContent = label; button.disabled = target < 1 || target > pages;
            button.onclick = () => renderLeaderboard(filter, target); navigation.append(button);
        }
    }
    fragment.append(navigation); list.append(fragment);
}

/* ═══ XP TAB ═══ */

function renderXP() {
  const info = getLevelProgressHTML(studentSemesterXP);
  setText('available-xp', `${studentXP.toLocaleString()} XP`);
  setText('xp-tile-val', studentQuizXP.toLocaleString());
  setText('main-xp-num', studentSemesterXP.toLocaleString());
  setText('xp-welcome', `Level ${info.levelNum} progress`);
  setText('xp-level-name', info.levelName);
  setText('xp-level-num', info.levelNum);
  setText('xp-next-reward', info.atMax ? 'All level milestones unlocked' : `${info.need.toLocaleString()} XP until ${info.nextName}`);
  setText('next-level-chip', info.atMax ? 'Maximum level reached' : `Next unlock: Level ${info.levelNum + 1}`);
  document.getElementById('xp-bar-fill-main').style.width = `${info.pct}%`;
  const boost = document.getElementById('btn-use-xp-main');
  boost.disabled = studentXP < 350;
  setText('boost-quiz-list', studentXP < 350 ? `${(350 - studentXP).toLocaleString()} more XP needed for a grade boost.` : 'Select an eligible result to review and apply your boost.');
  document.getElementById('xp-rewards-wallet').innerHTML = coupons.length
    ? renderCouponsSection()
    : '<div class="xp-reward-empty"><strong>Your first reward is ahead</strong><p>Reach Level 2 at 300 semester XP to unlock your Apprentice badge. Complete quizzes to begin your collection.</p></div>';
  document.getElementById('xp-level-roadmap').innerHTML = LEVELS.map(level => `
    <div class="level-milestone ${level.level === info.levelNum ? 'current' : ''}">
      <span class="milestone-number">${level.level}</span><div><strong>${level.name}</strong><span>${level.reward?.label || 'Your starting point'}</span></div>
      <div class="milestone-status"><strong>${level.xpRequired.toLocaleString()} XP</strong><span>${level.level === info.levelNum ? 'Current level' : level.level < info.levelNum ? 'Reached' : 'Locked'}</span></div>
    </div>`).join('');
  updatePerformanceUI();
}

function confirmBoost(name, idx) { return chooseGradeBoost(false); }
function confirmBoostFromXP() { return chooseGradeBoost(false); }

/* ═══ BATTLE ═══ */

/* ── Study Buddy visibility helpers ── */

function hideSB() {
  if (typeof sbSetQuizHidden === 'function') sbSetQuizHidden(true);
}
function showSB() {
  if (typeof sbSetQuizHidden === 'function') sbSetQuizHidden(false);
}

async function openBattle(quizId) {
    if (quizOpening || quizSubmitting || document.getElementById('modal-battle').classList.contains('open')) return;

    const q =
        formalQuizzes.find(
            x => x.id === quizId
        ) ||
        informalQuizzes.find(
            x => x.id === quizId
        );

    if (!q) return;


    /*
    |--------------------------------------------------------------------------
    | PREVENT OPENING A QUIZ THAT WAS ALREADY SUBMITTED
    |--------------------------------------------------------------------------
    */

    if (
        q.submitted === true ||
        q.submitted === 1 ||
        myResults[quizId]
    ) {

        showToast(
            '⚠️',
            'You have already submitted this quiz.'
        );

        return;

    }


    /*
    |--------------------------------------------------------------------------
    | START QUIZ
    |--------------------------------------------------------------------------
    */

    quizOpening = true;
    activeBattle = q;
    battleCurrentQ = 0;
    try {
        const attempt = await powerupRequest('start', { quiz_id: q.id });
        if (Array.isArray(attempt.questions)) q.questions = attempt.questions.map(question => ({...question, q: question.q || question.text || '', opts: question.opts || question.choices || []}));
        battleAnswers = q.questions.map((_, i) => attempt.answers[i] ?? null);
        startQuizClock(attempt);
        if (typeof loadStudentQuizNotifications === "function") loadStudentQuizNotifications();
    } catch (error) {
        quizOpening = false;
        activeBattle = null;
        showToast('!', error.message);
        return;
    }

    document.getElementById(
        'battle-title'
    ).textContent =
        q.title;


    renderBattleQuestion();


    openModal(
        'modal-battle'
    );


    hideSB();
    quizOpening = false;
    updateQuizClock();

}
function renderFlagButton() {

  if (!activeBattle) return '';

  const alreadyFlagged =
    typeof studentFlaggedQuestions !== 'undefined' &&
    studentFlaggedQuestions.some(
      f =>
        f.quizId === activeBattle.id &&
        f.questionIndex === battleCurrentQ
    );

  if (alreadyFlagged) {

    return `
      <div class="flag-used-badge">
        🚩 Flagged
      </div>
    `;

  }

  return `
  <button
    type="button"
    class="btn-flag-question"
    onclick="flagQuestion()"
    title="Flag this question as problematic">
    🚩 Flag
  </button>
`;
}


function renderBattleQuestion() {

  const q =
    activeBattle;

  const idx =
    battleCurrentQ;

  const qObj =
    q.questions[idx];

  const pct =
    (idx /
      q.questions.length) *
    100;


  const hasMultiplier =
    typeof coupons !== 'undefined' &&
    coupons.some(
      c =>
        c.type ===
          'xp_multiplier' &&
        c.remaining > 0
    );


  const multiplierBanner =
    hasMultiplier

      ? `
        <div class="xp-boost-banner">
          ⚡ 1.5x XP Boost Active!
          Applies to your next eligible result when grading finishes.
        </div>
      `

      : '';


  let loadout = document.getElementById('quiz-loadout');
  if (!loadout) {
    loadout = document.createElement('aside');
    loadout.id = 'quiz-loadout';
    loadout.setAttribute('aria-label', 'Quiz power-ups');
    document.getElementById('modal-battle').appendChild(loadout);
  }
  loadout.innerHTML = renderFiftyFiftyButton();

  document.getElementById(
    'battle-body'
  ).innerHTML = `

    ${multiplierBanner}

    <div class="battle-layout">


      <div class="battle-main-col">

        <div class="battle-info">

          <h3>
            ${q.type}
            &bull;
            ${q.subject}
          </h3>

          <p>
            ${q.desc}
          </p>

          <div class="battle-meta-row">

            <div class="bm-item quiz-timer">Time left <strong id="quiz-countdown" role="timer">--:--</strong></div>
            <div class="bm-item">${quizTimingText(q)}</div>
            <div class="bm-item">Opening ${quizSession?.open_count || 1} / 3</div>

            <div class="bm-item">
              ⭐ +${q.xpReward} XP on pass
            </div>

            <div class="bm-item">
              📋 ${q.questions.length} questions
            </div>

          </div>

        </div>

        <div class="battle-progress">

          <div
            class="battle-progress-fill"
            style="width:${pct}%">
          </div>

        </div>

        <div
          style="
            font-size:.72rem;
            color:var(--text-muted);
            margin-bottom:1rem
          ">
          Question ${idx + 1}
          of
          ${q.questions.length}
        </div>

        <div class="battle-question">

          <div class="bq-num">
            QUESTION ${idx + 1}
          </div>

          <div class="bq-text">
    ${qObj.text || qObj.q || ''}
</div>


${
    qObj.type === 'id'

        ? `

            <div class="identification-answer-box">

                <label
                    style="
                        display:block;
                        margin-bottom:10px;
                        font-size:.8rem;
                        color:var(--text-muted);
                    "
                >
                    Type your answer below:
                </label>


                <textarea
                    id="identification-answer"
                    placeholder="Enter your answer here..."
                    oninput="saveIdentificationAnswer(this.value)"
                    style="
                        width:100%;
                        min-height:120px;
                        padding:14px;
                        border-radius:10px;
                        border:1px solid var(--border);
                        background:var(--surface);
                        color:var(--text);
                        resize:vertical;
                        font-family:inherit;
                        font-size:.95rem;
                        box-sizing:border-box;
                    "
                >${String(battleAnswers[idx] || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>

            </div>

        `

        : `

            <div class="bq-options">

                ${
                    (qObj.choices || qObj.opts || [])
                        .map(
                            (opt, i) => `

                                <button
                                    class="bq-option"
                                    id="opt-${i}"
                                    onclick="selectAnswer(${i})">

                                    ${opt}

                                </button>

                            `
                        )
                        .join('')
                }

            </div>

        `
}

      </div>


        <p class="quiz-session-note">The timer keeps running when closed. ${quizSession?.open_count === 3 ? 'Final opening: finish before leaving.' : 'You can open this quiz up to three times.'}</p>
        <!-- QUIZ NAVIGATION -->

        <div
            class="battle-actions"
            style="
                display:flex;
                justify-content:flex-end;
                align-items:center;
                gap:12px;
                margin-top:20px;
            "
        >

            <span
                class="battle-hint-text"
                style="
                    margin-right:auto;
                    font-size:.8rem;
                    color:var(--text-muted);
                "
            >

                ${
                    qObj.type === 'id'

                        ? 'Type your answer to continue'

                        : 'Select an answer to continue'
                }

            </span>


${typeof renderHintButton === 'function' ? renderHintButton() : ''}

<!-- FLAG QUESTION BUTTON -->
${
    typeof renderFlagButton === 'function'
        ? renderFlagButton()
        : ''
}

<!-- NEXT / SUBMIT BUTTON -->
<button
    id="next-btn"
    class="btn-primary"
    onclick="nextQuestion()"
    style="
        min-width:150px;
        opacity:${
            battleAnswers[idx] !== null &&
            battleAnswers[idx] !== ''
                ? '1'
                : '.4'
        };
        pointer-events:${
            battleAnswers[idx] !== null &&
            battleAnswers[idx] !== ''
                ? 'auto'
                : 'none'
        };
    "
>
    ${
        idx === q.questions.length - 1
            ? 'Submit Quiz 🚀'
            : 'Next Question →'
    }
</button>

        </div>

      </div>

    </div>

  `;

  if (
    battleAnswers[idx] !==
    null
  ) {

    highlightAnswer(
      battleAnswers[idx],
      qObj.correct
    );

  }

  restorePowerupEffects();
  if (typeof updateQuizClock === "function") updateQuizClock();

}

function saveIdentificationAnswer(answer) {
    scheduleQuizDraft();

    battleAnswers[
        battleCurrentQ
    ] =
        answer;


    const nextButton =
        document.getElementById(
            'next-btn'
        );


    if (!nextButton) {
        return;
    }


    if (
        answer.trim().length > 0
    ) {

        nextButton.style.opacity =
            '1';

        nextButton.style.pointerEvents =
            'auto';

    } else {

        nextButton.style.opacity =
            '.4';

        nextButton.style.pointerEvents =
            'none';

    }

}


async function selectAnswer(optIdx) {
  if (powerupBusy) return;
  powerupBusy = true;
  try { await powerupRequest('answer', { answer: optIdx }); }
  catch (error) { showToast('!', error.message); return; }
  finally { powerupBusy = false; }

  battleAnswers[
    battleCurrentQ
  ] = optIdx;

  highlightAnswer(
    optIdx,
    activeBattle
      .questions[
        battleCurrentQ
      ].correct
  );


  const nb =
    document.getElementById(
      'next-btn'
    );

  nb.style.opacity = '1';

  nb.style.pointerEvents =
    'auto';

  renderBattleQuestion();

}


function highlightAnswer(selected) {
  document.querySelectorAll('.bq-option').forEach((button, i) => {
    button.classList.toggle('selected', i === selected);
    button.classList.remove('correct', 'wrong');
  });
}


async function nextQuestion() {
  clearTimeout(quizSaveTimer);
  if (powerupBusy) return;
  if (activeBattle?.questions[battleCurrentQ]?.type === 'id') {
    powerupBusy = true;
    try { await powerupRequest('answer', { answer: battleAnswers[battleCurrentQ] || '' }); }
    catch (error) { showToast('!', error.message); return; }
    finally { powerupBusy = false; }
  }


  const answer =
    battleAnswers[
        battleCurrentQ
    ];


if (
    answer === null ||
    answer === undefined ||
    (
        typeof answer === 'string' &&
        answer.trim() === ''
    )
) {

    showToast(
        '⚠️',
        activeBattle.questions[
            battleCurrentQ
        ].type === 'id'
            ? 'Please type your answer first.'
            : 'Please select an answer first.'
    );

    return;

}


  if (
    battleCurrentQ <
    activeBattle.questions.length - 1
  ) {

    battleCurrentQ++;

    renderBattleQuestion();

  } else {

    window._lastBattle =
      activeBattle;

    window._lastAnswers =
      battleAnswers.slice();

    finishBattle();

  }

}

async function submitQuizToDatabase(
    quiz,
    answers,
    score,
    xpEarned,
    status
) {

    const response =
        await fetch(

            '../assets/php/submit_idQuiz.php',

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
                        session_token: quizSession?.session_token,

                        quiz_id:
                            Number(
                                quiz.id
                            ),

                        answers:
                            answers,

                        score:
                            score,

                        xp_earned:
                            xpEarned,

                        status:
                            status

                    })

            }

        );


    const responseText =
        await response.text();


    let result;


    try {

        result =
            responseText
                ? JSON.parse(
                    responseText
                )
                : {};

    } catch (error) {

        console.error(
            'Invalid response from submit_idQuiz.php:',
            responseText
        );

        throw new Error(
            'Server returned an invalid response.'
        );

    }


    if (

        !response.ok ||

        !result.success

    ) {

        throw new Error(

            result.message ||

            'Failed to submit quiz.'

        );

    }


    return result;

}


async function finishBattle() {
    if (quizSubmitting) return;
    quizSubmitting=true;

    const q =
        activeBattle;


    /*
    |--------------------------------------------------------------------------
    | PREVENT DOUBLE SUBMISSION
    |--------------------------------------------------------------------------
    */

    const submitButton =
        document.getElementById(
            'next-btn'
        );


    if (submitButton) {

        submitButton.disabled =
            true;

        submitButton.style.pointerEvents =
            'none';

        submitButton.textContent =
            'Submitting...';

    }


    /*
    |--------------------------------------------------------------------------
    | GET MULTIPLE CHOICE QUESTIONS ONLY
    |--------------------------------------------------------------------------
    */

    // Scores, grading status, and bonuses come from the saved server result.
    let score = 0;
    let xpEarned = 0;
    let wasMultiplied = false;
    const hasIdentification = q.questions.some(question => question.type === 'id');
    let formattedAnswers = q.questions.map((question, index) => ({
        questionIndex: index,
        answer: question.type === 'id' ? String(battleAnswers[index] ?? '') : battleAnswers[index]
    }));

    let submissionStatus =

        hasIdentification

            ? 'pending_review'

            : 'submitted';


    /*
    |--------------------------------------------------------------------------
    | SEND TO DATABASE FIRST
    |--------------------------------------------------------------------------
    */

    try {

        const savedResult = await submitQuizToDatabase(

            q,

            formattedAnswers,

            score,

            xpEarned,

            submissionStatus

        );

        clearInterval(quizClock); quizSession=null; quizSubmitting=false;
        score = Number(savedResult.score);
        xpEarned = Number(savedResult.xp_earned);
        submissionStatus = savedResult.status;
        formattedAnswers = savedResult.answers || formattedAnswers;
        wasMultiplied = Boolean(savedResult.was_multiplied);

    } catch (error) {

        quizSubmitting=false;
        console.error(

            'Quiz submission failed:',

            error

        );


        showToast(

            '⚠️',

            error.message ||

            'Quiz could not be submitted.'

        );


        /*
        | Restore submit button
        */

        if (submitButton) {

            submitButton.disabled =
                false;

            submitButton.style.pointerEvents =
                'auto';

            submitButton.textContent =
                'Retry submission';
            submitButton.onclick = () => finishBattle();

        }


        return;

    }


    /*
    |--------------------------------------------------------------------------
    | DATABASE SUBMISSION SUCCESSFUL
    |--------------------------------------------------------------------------
    */


    await loadStudentXP();


    /*
    |--------------------------------------------------------------------------
    | SAVE LOCAL COPY
    |--------------------------------------------------------------------------
    */

    const submission =

        window.GableStore

            ? GableStore.addSubmission({

                quizId:
                    q.id,

                studentId:
                    studentProfile.id,

                studentName:
                    studentProfile.name,

                section:
                    studentProfile.section,

                score:
                    score,

                xpEarned:
                    xpEarned,

                wasMultiplied:
                    wasMultiplied,

                answers:
                    formattedAnswers,

                quizTitle:
                    q.title,

                subject:
                    q.subject,

                type:
                    q.type,

                status:
                    submissionStatus

            })

            : null;


    /*
    |--------------------------------------------------------------------------
    | UPDATE STUDENT RESULT
    |--------------------------------------------------------------------------
    */

    myResults[q.id] = {

        score:
            score,

        xpEarned:
            xpEarned,

        wasMultiplied:
            wasMultiplied,

        answers:
            formattedAnswers,

        status:
            submissionStatus,

        submittedAt:

            submission?.submittedAt ||

            Date.now()

    };


    /*
    |--------------------------------------------------------------------------
    | UPDATE XP
    |--------------------------------------------------------------------------
    */

      checkLevelUp(studentSemesterXP);


    saveStudentXP();


    /*
    | Reload submissions so the new one is included
    | before everything is rebuilt.
    */
    await loadDatabaseSubmissions();
    await loadDatabaseQuizzes();


    rebuildStudentData();


    /*
    | Safety net: if the reload did not include the new
    | submission, keep the result so the score still shows.
    */
    if (!myResults[q.id]) {

        myResults[q.id] = {

            score:
                score,

            xpEarned:
                xpEarned,

            wasMultiplied:
                wasMultiplied,

            answers:
                formattedAnswers,

            status:
                submissionStatus,

            submittedAt:
                submission?.submittedAt ||
                Date.now()

        };

    }


    updateXPDisplay();


    renderHome();


    /*
    |--------------------------------------------------------------------------
    | REMOVE FROM AVAILABLE QUIZZES
    |--------------------------------------------------------------------------
    */

    const idx =
        homeAvailableQuizzes.findIndex(

            quiz =>
                quiz.id ===
                q.id

        );


    if (
        idx !== -1
    ) {

        homeAvailableQuizzes.splice(

            idx,

            1

        );

    }


    /*
    |--------------------------------------------------------------------------
    | SAVE LAST QUIZ
    |--------------------------------------------------------------------------
    */

    window._lastBattle =
        q;


    window._lastAnswers =
        [...battleAnswers];


    /*
    |--------------------------------------------------------------------------
    | CLOSE QUIZ MODAL
    |--------------------------------------------------------------------------
    */

    closeModal(
        'modal-battle'
    );


    /*
    |--------------------------------------------------------------------------
    | SUCCESS MESSAGE
    |--------------------------------------------------------------------------
    */

    showToast(

        hasIdentification

            ? '📝'

            : '🎉',

        hasIdentification

            ? 'Quiz submitted! Your identification answers are pending instructor review.'

            : 'Quiz submitted successfully!'

    );


    /*
    |--------------------------------------------------------------------------
    | SHOW RESULTS
    |--------------------------------------------------------------------------
    */

    viewResult(
        q.id
    );

}


function viewResult(quizId) {
  const result=myResults[quizId];
  const quiz=[...formalQuizzes,...informalQuizzes,...completedFormal,...completedInformal].find(q=>String(q.id)===String(quizId));
  if (!result && !quiz) return;
  const pending=result?.status==='pending_review';
  const rawScore=result?.score ?? quiz?.score;
  const score=rawScore!==null && rawScore!==undefined && rawScore!=='' && Number.isFinite(Number(rawScore)) ? Number(rawScore) : null;
  const rawXP=result?.xpEarned ?? result?.xp_earned ?? quiz?.xpEarned ?? quiz?.xp_earned;
  const xp=rawXP!==null && rawXP!==undefined && Number.isFinite(Number(rawXP)) ? Number(rawXP) : null;
  const answers=Array.isArray(result?.answers) ? result.answers : [];
  const wrong=answers.filter(a=>a.correct===false).length;
  document.getElementById('battle-title').textContent=(quiz?.title || 'Quiz')+' - Results';
  document.getElementById('battle-body').innerHTML=`
    <section class="battle-score-result">
      <div class="bsr-summary"><div><div class="bsr-label">${pending ? 'Grading status' : 'Final score'}</div><div class="bsr-score ${pending ? 'bsr-pending' : ''}">${pending ? 'Under review' : score===null ? 'Unavailable' : score+'%'}</div></div>
      <div class="bsr-summary-detail"><div class="bsr-label">${pending ? 'Submission saved' : score===null ? 'Grade unavailable' : 'Grade: '+gradeLabel(score)}</div><div class="bsr-xp">${pending ? 'XP after grading' : xp===null ? 'XP unavailable' : '+'+xp+' XP earned'}</div></div></div>
      <p class="bsr-description">${pending ? 'Your instructor will review your answers. Your final score, XP, and AI review will be available after grading.' : wrong ? wrong+' answer'+(wrong===1?'':'s')+' to revisit. Review the concepts behind your mistakes.' : score===100 ? 'All answers correct. Your result has been saved.' : 'Your result has been saved. Check Performance for your progress.'}</p>
      <div class="bsr-actions"><button class="btn-primary" onclick="exportQuizReviewer(${Number(quizId)},this)">Export Reviewer</button><button class="btn-secondary" onclick="openReviewHistory(${Number(quizId)})">Saved Reviews</button>${!pending && wrong ? '<button class="btn-explain" id="explain-mistakes-btn">Review with AI</button>' : ''}</div><div class="bsr-navigation"><button class="btn-secondary" onclick="closeModal('modal-battle');switchTab('quizzes')">My Quizzes</button><button class="btn-secondary" onclick="closeModal('modal-battle');switchTab('scores')">Performance</button></div>
    </section>`;
  const explain=document.getElementById('explain-mistakes-btn');
  if (explain) explain.onclick=()=>openAnswerExplainer(quizId,answers);
  openModal('modal-battle');
}

function updateXPDisplay() {

  const v =
    studentXP.toLocaleString();

  const info =
    getLevelProgressHTML(
      studentSemesterXP
    );


  setText(
    'xp-display',
    v + ' XP'
  );

  setText(
    'home-xp',
    v
  );

  setText(
    'profile-xp-val',
    v
  );


  const popupFill =
    document.getElementById(
      'popup-fill'
    );

  if (popupFill) {
    popupFill.style.width =
      info.pct + '%';
  }


  setText(
    'popup-level-text',
    `Level ${info.levelNum} → ${
      info.atMax
        ? 'Max Level'
        : 'Level ' +
          (info.levelNum + 1)
    }`
  );


  setText(
    'popup-sub',
    info.atMax
      ? 'You have reached the maximum level! 🏆'
      : `${info.need.toLocaleString()} XP needed to reach Level ${info.levelNum + 1} — ${info.nextName}`
  );


  const levelSubText =
    `Level ${info.levelNum} – ${info.levelName}`;


  setText(
    'home-level-sub',
    levelSubText
  );

  setText(
    'xp-level-sub',
    levelSubText
  );


  updateProfileUI();

  updatePerformanceUI();


  if (
    typeof applyProfileFrame ===
    'function'
  ) {

    applyProfileFrame();

  }

}


/* ═══ XP POPUP ═══ */

function toggleXpPopup() {
  const open = document.getElementById('xp-popup').classList.toggle('open');
  document.querySelector('.xp-nav-trigger')?.setAttribute('aria-expanded', String(open));
}
function closeXpPopup() {
  document.getElementById('xp-popup')?.classList.remove('open');
  document.querySelector('.xp-nav-trigger')?.setAttribute('aria-expanded', 'false');
}

document.addEventListener(
  'click',
  e => {

    const b =
      document.getElementById(
        'xp-badge-btn'
      );

    if (
      b &&
      !b.contains(e.target)
    ) {

      closeXpPopup();

    }

  }
);


/* ═══ MODALS ═══ */




/* ═══ INIT ═══ */

document.addEventListener(
  'DOMContentLoaded',
  async () => {

    await loadStudentData();

    const requestedTab = location.hash.slice(1);
    if (['quizzes', 'xp'].includes(requestedTab)) switchTab(requestedTab);

    renderHome();

    renderQuizzes();

    renderLeaderboard(
      'section'
    );

    renderXP();

    updateXPDisplay();


    if (
      typeof renderProfileRewards ===
      'function'
    ) {

      renderProfileRewards();

    }


    requestAnimationFrame(
      () =>
        requestAnimationFrame(
          () =>
            document.body.classList.add(
              'ready'
            )
        )
    );

  }
);
