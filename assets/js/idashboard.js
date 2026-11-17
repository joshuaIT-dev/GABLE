/* ═══════════════════════════════════════════════════════════════
   GABLE – INSTRUCTOR DASHBOARD
   IDashboard JavaScript
   ═══════════════════════════════════════════════════════════════ */


/* ── DATA ── */

const submissions = [];

/* =========================================================
   STUDENT SUCCESS RATE
========================================================= */

async function idbLoadStudentSuccessRate() {
    const rateElement = document.getElementById(
        'idb-student-success-rate'
    );

    const barElement = document.getElementById(
        'idb-student-success-rate-bar'
    );

    if (!rateElement || !barElement) {
        console.error('Student success rate elements not found.');
        return;
    }

    try {
        const response = await fetch(
            '../assets/php/success_rate.php',
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || 'Could not load student success rate.'
            );
        }

        const rate = Math.min(
            100,
            Math.max(0, Number(result.student_success_rate) || 0)
        );

        rateElement.textContent = Number(result.total_students)>0?`${rate.toFixed(1)}%`:'No graded results';
        barElement.style.width = `${rate}%`;

        console.log('Student Success Rate:', result);

    } catch (error) {
        console.error('Student success rate error:', error);
        rateElement.textContent = '—';
        barElement.style.width = '0%';
    }
}

/* =========================================================
   INSTRUCTOR AVATAR
   Loads the logged-in instructor's name and initials
========================================================= */


async function loadInstructorAvatar() {
    try {
        const res = await fetch("../assets/php/get_instructor.php", {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store"
        });

        if (res.status === 401) {
            console.error("Instructor not logged in.");
            return;
        }

        const data = await res.json();

        if (!data.success || !data.instructor) {
            console.error("Could not load instructor profile.");
            return;
        }

        const instructor = data.instructor;
        const teachingXP = Number(instructor.teaching_xp) || 0;

        // UPDATE TEACHING XP BADGE
        const xpBadge = document.querySelector('.xp-val');

        if (xpBadge) {
            xpBadge.textContent = `${teachingXP.toLocaleString()} XP`;
        }

        // UPDATE XP POPUP FIRST
        if (typeof updateIdbTeachingXpPopup === 'function') {
            updateIdbTeachingXpPopup(teachingXP);
        } else {
            console.error('Teaching XP popup function is not loaded.');
        }

        // UPDATE TEACHING QUALITY XP CARD
        const tqXpValue = document.getElementById('idb-tq-xp-value');
        const tqXpLevel = document.getElementById('idb-tq-xp-level');
        const tqXpFill = document.getElementById('idb-tq-xp-fill');

        if (tqXpValue) {
            tqXpValue.textContent = `${teachingXP.toLocaleString()} XP`;
        }

        // Read level and progress AFTER popup update
        const currentLevel =
            document.getElementById('idb-xp-level-title')?.textContent.trim();

        const progressText =
            document.getElementById('idb-xp-progress-fill')?.style.width || '0%';

        if (tqXpLevel) {
            tqXpLevel.textContent = currentLevel
                ? `${currentLevel} Educator`
                : 'Educator';
        }

        if (tqXpFill) {
            tqXpFill.style.width = progressText;
        }

        console.log('IDASHBOARD TEACHING XP:', teachingXP);

        // UPDATE INSTRUCTOR AVATAR
        const firstName = instructor.first_name || "";
        const lastName = instructor.last_name || "";

        const initials =
            `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

        const avatar = document.getElementById("instructor-avatar");

        if (avatar) {
            avatar.textContent = initials || "IN";
        }

    } catch (error) {
        console.error("Error loading instructor avatar:", error);
    }
}



/* ── MODALS ── */

function openModal(id) {

    // Build dynamic content before opening
    if (id === 'modal-grade') {
    idbLoadGradeQuizzes();
    }

    if (id === 'modal-reports') {
        idbLoadReports();
    }

    const modal = document.getElementById(id);

    if (modal) {
        modal.classList.add('open');
    }
}


function closeModal(id) {

    const modal = document.getElementById(id);

    if (modal) {
        modal.classList.remove('open');
    }
}

/* ── GRADE MODAL ── */

let idbQuizzes = [];
const reportStudents = [];

async function idbLoadGradeQuizzes() {
    const container = document.getElementById('submission-list');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align:center;padding:2rem">
            Loading quiz submissions...
        </div>
    `;

    try {
        const response = await fetch('../assets/php/get_quiz.php', {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store'
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Could not load quiz submissions.');
        }

        idbQuizzes = (result.quizzes || []).map(quiz => ({
            ...quiz,
            submissions: quiz.submissions || [],
            questions: quiz.questions || []
        }));

        buildGradeModal();
    } catch (error) {
        console.error('IDashboard grade loading error:', error);

        container.innerHTML = `
            <div style="text-align:center;padding:2rem;color:#f87171">
                Could not load quiz submissions. Please try again.
                <br><br>
                <button class="btn-secondary"
                    onclick="idbLoadGradeQuizzes()">
                    Retry
                </button>
            </div>
        `;
    }
}

function buildGradeModal() {
    const container = document.getElementById('submission-list');
    if (!container) return;

    const pending = [];

    idbQuizzes.forEach(quiz => {
        quiz.submissions.forEach((submission, submissionIndex) => {
            const answers = submission.answers || [];

            answers.forEach((answer, questionIndex) => {
                const question = quiz.questions[questionIndex];

                if (
                    question &&
                    question.type === 'id' &&
                    answer &&
                    answer.correct == null
                ) {
                    pending.push({
                        quiz,
                        submission,
                        submissionIndex,
                        questionIndex,
                        question,
                        answer
                    });
                }
            });
        });
    });

    if (!pending.length) {
        container.innerHTML = `
            <div style="text-align:center;padding:2rem;color:var(--text-muted)">
                <div style="font-size:2rem;margin-bottom:.75rem">📋</div>
                <div style="font-weight:600">
                    No identification answers awaiting review
                </div>
                <div style="font-size:.78rem;margin-top:.35rem">
                    New ungraded submissions will appear here.
                </div>
                <button class="btn-secondary"
                    style="margin-top:1rem"
                    onclick="idbLoadGradeQuizzes()">
                    Refresh
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = pending.map(item => {
        const {
            quiz,
            submission,
            submissionIndex,
            questionIndex,
            question,
            answer
        } = item;

        const quizId = Number(quiz.id);
        const studentName =
            submission.name ||
            submission.student_name ||
            'Student';

        const section = quiz.section || 'Section not specified';
        const rowId = `idb-grade-${quizId}-${submissionIndex}-${questionIndex}`;

        return `
            <div id="${rowId}"
                style="background:rgba(255,255,255,.05);
                       border:1px solid rgba(255,255,255,.1);
                       border-radius:14px;padding:1rem;margin-bottom:.8rem">

                <div style="font-weight:700;margin-bottom:.3rem">
                    ${idbEscape(studentName)}
                </div>

                <div style="font-size:.82rem;color:var(--text-muted);margin-bottom:.8rem">
                    ${idbEscape(quiz.title || 'Quiz')}
                    · ${idbEscape(section)}
                </div>

                <div style="font-size:.8rem;margin-bottom:.4rem">
                    Question ${questionIndex + 1}
                </div>

                <div style="margin-bottom:.6rem">
                    ${idbEscape(question.text || 'Identification question')}
                </div>

                <div style="padding:.75rem;border-radius:8px;
                            background:rgba(255,255,255,.05);margin-bottom:.9rem">
                    <strong>Student answer:</strong>
                    ${idbEscape(String(answer.answer ?? 'No answer provided'))}
                </div>

                <div style="display:flex;gap:.6rem;flex-wrap:wrap">
                    <button class="btn-primary"
                        onclick="idbGradeIdentification(${quizId},${submissionIndex},${questionIndex},true)">
                        ✓ Accept Answer
                    </button>

                    <button class="btn-secondary"
                        onclick="idbGradeIdentification(${quizId},${submissionIndex},${questionIndex},false)">
                        ✗ Reject Answer
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function idbEscape(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}

async function idbGradeIdentification(
    quizId,
    submissionIndex,
    questionIndex,
    isCorrect
) {
    const quiz = idbQuizzes.find(item => Number(item.id) === Number(quizId));
    const submission = quiz?.submissions?.[submissionIndex];

    if (!quiz || !submission) {
        showToast('⚠️', 'Quiz or submission could not be found.');
        return;
    }

    const submissionId = Number(submission.submissionId);

    if (!submissionId) {
        console.error('Missing submissionId:', submission);
        showToast('⚠️', 'Submission ID is missing. No grade was saved.');
        return;
    }

    const row = document.getElementById(
        `idb-grade-${quizId}-${submissionIndex}-${questionIndex}`
    );

    const buttons = row ? row.querySelectorAll('button') : [];
    buttons.forEach(button => button.disabled = true);

    try {
        const response = await fetch('../assets/php/grade_submission.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                submission_id: submissionId,
                question_index: questionIndex,
                is_correct: isCorrect
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Failed to save grade.');
        }

        // Update the local submission using the server's response.
        submission.answers = result.submission.answers;
        submission.score = Number(result.submission.score);
        submission.xp = Number(result.submission.xp_earned);
        submission.status = result.submission.status;

        showToast(
            isCorrect ? '✅' : '📝',
            result.submission.status === 'graded'
                ? `Grading complete. Score: ${result.submission.score}%.`
                : `Answer ${isCorrect ? 'accepted' : 'rejected'}.`
        );

        // Reload from the server so the list reflects saved grades.
        await idbLoadGradeQuizzes();
        await idbLoadStudentSuccessRate();

    } catch (error) {
        console.error('IDashboard grading error:', error);
        showToast('⚠️', error.message || 'Could not save the grade.');
        buttons.forEach(button => button.disabled = false);
    }
}

/* ── REPORTS MODAL: DATABASE INTEGRATION ── */

let idbReportQuizzes = [];
let idbReportStudents = [];
let idbReportAssignedStudents = [];

async function idbLoadReports() {
    const container = document.getElementById('report-list');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align:center;padding:2rem">
            Loading student reports...
        </div>
    `;

    try {
        const response = await fetch('../assets/php/get_quiz.php', {
            method: 'GET',
            credentials: 'same-origin',
            cache: 'no-store'
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || 'Could not load quiz data.'
            );
        }

        idbReportQuizzes = result.quizzes || [];

        // Load the instructor's assigned students for the report.
        const studentsResponse = await fetch(
            '../assets/php/get_instructor_students.php',
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            }
        );

        const studentsResult = await studentsResponse.json();

        if (!studentsResponse.ok || !studentsResult.success) {
            throw new Error(
                studentsResult.message || 'Could not load assigned students.'
            );
        }

        idbReportStudents = studentsResult.students || [];

        // Load assignment information for the report filters.
        if (!idbAssignments.length) {
            await idbLoadAssignments();
        }

        idbFillReportFilters();
        renderIdbReports();

    } catch (error) {
        console.error('IDashboard reports loading error:', error);

        container.innerHTML = `
            <div style="text-align:center;padding:2rem;color:#f87171">
                Could not load student reports.
                <br><br>
                <button class="btn-secondary"
                    onclick="idbLoadReports()">
                    Retry
                </button>
            </div>
        `;
    }
}

function idbFillReportFilters() {
    const sectionSelect = document.getElementById('rp-section');
    const subjectSelect = document.getElementById('rp-subject');

    // Only show sections and subjects assigned to this instructor.
    const sections = [
    ...new Set(
        idbAssignments
            .map(a => a.section)
            .filter(Boolean)
    )
    ].sort();

    const subjects = [
        ...new Set(
            idbAssignments
                .map(a => a.subject_name || a.subject)
                .filter(Boolean)
        )
    ].sort();

    if (sectionSelect) {
        const previous = sectionSelect.value;

        sectionSelect.innerHTML =
            '<option value="">All Sections</option>' +
            sections.map(section =>
                `<option value="${idbEscape(section)}">${idbEscape(section)}</option>`
            ).join('');

        sectionSelect.value = sections.includes(previous) ? previous : '';
    }

    if (subjectSelect) {
        const previous = subjectSelect.value;

        subjectSelect.innerHTML =
            '<option value="">All Subjects</option>' +
            subjects.map(subject =>
                `<option value="${idbEscape(subject)}">${idbEscape(subject)}</option>`
            ).join('');

        subjectSelect.value = subjects.includes(previous) ? previous : '';
    }
}


function renderIdbReports() {
    const container = document.getElementById('report-list');
    if (!container) return;

    const sectionFilter =
        document.getElementById('rp-section')?.value || '';

    const subjectFilter =
        document.getElementById('rp-subject')?.value || '';

    const studentsById = new Map();

    // Build the report from the instructor's assigned students.
    idbReportStudents.forEach(student => {
        const key = String(
            student.student_id ??
            student.studentId ??
            student.id ??
            student.name
        );

        if (!studentsById.has(key)) {
            studentsById.set(key, {
                key,
                id: student.id ?? student.student_id ?? '',
                name: student.name ??
                      student.full_name ??
                      student.student_name ??
                      'Student',
                section: student.section ??
                         student.section_name ??
                         '',
                scores: []
            });
        }
    });

    // Match submissions to registered students.
    idbReportQuizzes.forEach(quiz => {
        const quizSubject = quiz.subject ?? quiz.subject_name ?? '';
        const quizSection = quiz.section ?? quiz.section_name ?? '';

        if (subjectFilter && quizSubject !== subjectFilter) return;
        if (sectionFilter && quizSection !== sectionFilter) return;

        (quiz.submissions || []).forEach(submission => {
            const submittedId =
                submission.student_id ??
                submission.studentId ??
                submission.student?.student_id ??
                submission.student?.id;

            let student = submittedId != null
                ? studentsById.get(String(submittedId))
                : null;

            if (!student) {
                const submittedName =
                    submission.name ??
                    submission.student_name ??
                    submission.student?.name;

                student = [...studentsById.values()].find(s =>
                    submittedName &&
                    s.name === submittedName &&
                    s.section === (
                        submission.section ??
                        submission.section_name ??
                        quizSection
                    )
                );
            }

            if (!student) return;

            // Avoid including submissions from a different section.
            if (sectionFilter && student.section !== sectionFilter) return;

            const rawScore = Number(submission.score);

            if (
                submission.score !== null &&
                submission.score !== undefined &&
                submission.score !== '' &&
                Number.isFinite(rawScore) &&
                rawScore >= 0 &&
                rawScore <= 100
            ) {
                student.scores.push(rawScore);
            }
        });
    });

    const filtered = [...studentsById.values()].filter(student =>
        !sectionFilter || student.section === sectionFilter
    );

    const scoredStudents = filtered.filter(student =>
        student.scores.length > 0
    );

    const studentAverage = student =>
        student.scores.reduce((sum, score) => sum + score, 0) /
        student.scores.length;

    const overallAverage = scoredStudents.length
        ? scoredStudents.reduce(
            (sum, student) => sum + studentAverage(student), 0
        ) / scoredStudents.length
        : null;

    const above80 = scoredStudents.filter(student =>
        studentAverage(student) > 80
    ).length;

    const above80Percentage = scoredStudents.length
        ? (above80 / scoredStudents.length) * 100
        : 0;

    const totalElement = document.getElementById('rp-student-count');
    const averageElement = document.getElementById('rp-overall-average');
    const aboveElement = document.getElementById('rp-above-80');

    if (totalElement) totalElement.textContent = filtered.length;

    if (averageElement) {
        averageElement.textContent = overallAverage === null
            ? '—'
            : `${Math.round(overallAverage)}%`;
    }

    if (aboveElement) {
        aboveElement.textContent =
            `${above80} (${Math.round(above80Percentage)}%)`;
    }

    if (!filtered.length) {
        container.innerHTML = `
            <div class="empty-state" style="padding:2rem;text-align:center">
                <div style="font-size:2rem">👥</div>
                <p>No assigned students match these filters.</p>
            </div>`;
        return;
    }

    container.innerHTML = filtered.map(student => {
        const average = student.scores.length
            ? Math.round(studentAverage(student))
            : null;

        const scoreDisplay = average === null ? '—' : `${average}%`;

        const initials = (student.name || 'S')
            .split(/\s+/)
            .map(part => part[0] || '')
            .join('')
            .slice(0, 2);

        return `
            <div class="report-row"
                 style="display:flex;align-items:center;gap:1rem;
                        padding:1rem;margin:.6rem 0;
                        border:1px solid rgba(255,255,255,.1);
                        border-radius:12px;flex-wrap:wrap">
                <div class="rp-avatar">${idbEscape(initials)}</div>

                <div class="rp-info" style="flex:1">
                    <strong>${idbEscape(student.name)}</strong>
                    <span style="display:block">
                        ID: ${idbEscape(student.id || '—')}
                        · ${idbEscape(student.section || 'Section unavailable')}
                    </span>
                    <small>${student.scores.length} scored submission(s)</small>
                </div>

                <div class="rp-scores">
                    <div class="rp-score-item">
                        <span class="rp-lbl">Average</span>
                        <span class="rp-val"
                              style="color:${
                                  average === null
                                      ? 'var(--text-muted)'
                                      : average > 80
                                          ? 'var(--green)'
                                          : 'var(--gold)'
                              }">
                            ${scoreDisplay}
                        </span>
                    </div>
                </div>
            </div>`;
    }).join('');
}


function idbFormatReportScore(score) {
    return score == null ? '—' : `${score.toFixed(1)}%`;
}

function idbAverage(values) {
    return values.length
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : null;
}


function idbShowStudentReport(studentId) {
    const student = idbReportStudents.find(
        item => String(item.id) === String(studentId)
    );

    if (!student) {
        showToast('⚠️', 'Student report could not be found.');
        return;
    }

    const quizzes = student.filteredQuizzes || student.quizzes;

    const details = quizzes.map(quiz => `
        <div style="
            padding:.8rem 0;
            border-bottom:1px solid rgba(255,255,255,.1)
        ">
            <div style="font-weight:600">${idbEscape(quiz.title)}</div>
            <div style="font-size:.78rem;color:var(--text-muted)">
                ${idbEscape(quiz.subject)} · ${idbEscape(quiz.section)}
                · ${idbEscape(quiz.mode || 'Unknown mode')}
            </div>
            <div style="margin-top:.35rem">
                Score: <strong>${idbFormatReportScore(quiz.score)}</strong>
            </div>
            <div style="font-size:.75rem;color:var(--text-muted)">
                Status: ${idbEscape(quiz.status)}
            </div>
        </div>
    `).join('');

    let modal = document.getElementById('idb-student-detail-modal');

    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'idb-student-detail-modal';
        modal.className = 'modal-overlay';

        modal.innerHTML = `
            <div class="modal" style="max-width:650px;max-height:85vh;overflow-y:auto">
                <button class="modal-close"
                    onclick="closeModal('idb-student-detail-modal')">✕</button>
                <h2 id="idb-student-detail-title">Student Report</h2>
                <div id="idb-student-detail-content"></div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    document.getElementById('idb-student-detail-title').textContent =
        `${student.name} — Performance Details`;

    document.getElementById('idb-student-detail-content').innerHTML =
        details || '<p>No quiz scores are available for this student.</p>';

    openModal('idb-student-detail-modal');
}



/* ── XP POPUP ── */

function toggleXpPopup() {

    const popup = document.getElementById('xp-popup');

    if (!popup) return;

    const isOpen = popup.classList.contains('show');

    if (isOpen) {

        closeXpPopup();

    } else {

        popup.classList.add('show');

        setTimeout(() => {

            document.addEventListener(
                'click',
                closeXpOnOutside
            );

        }, 10);

    }
}


function closeXpPopup() {

    const popup = document.getElementById('xp-popup');

    if (popup) {
        popup.classList.remove('show');
    }

    document.removeEventListener(
        'click',
        closeXpOnOutside
    );
}


function closeXpOnOutside(e) {

    if (!e.target.closest('.xp-pill-wrap')) {
        closeXpPopup();
    }

}


/* ── TOAST ── */

let _tt;

function showToast(icon, msg) {

    clearTimeout(_tt);

    const iconElement =
        document.getElementById('toast-icon');

    const messageElement =
        document.getElementById('toast-msg');

    const toast =
        document.getElementById('toast');

    if (!iconElement || !messageElement || !toast) {
        return;
    }

    iconElement.textContent = icon;
    messageElement.textContent = msg;

    toast.classList.add('show');

    _tt = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}



/* ── CREATE QUIZ: DATABASE INTEGRATION ── */

let idbAssignments = [];

async function idbLoadAssignments() {
    const subjectSelect = document.getElementById('c-subject');
    const sectionSelect = document.getElementById('c-section');

    if (!subjectSelect || !sectionSelect) return;

    try {
        const response = await fetch(
            '../assets/php/get_instructor_assignments.php',
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Unable to load assignments.');
        }

        idbAssignments = result.assignments || [];

        subjectSelect.innerHTML =
            '<option value="">Choose assigned subject</option>';

        sectionSelect.innerHTML =
            '<option value="">Choose assigned section</option>';

        const subjects = [...new Set(
            idbAssignments
                .map(a => a.subject_name)
                .filter(Boolean)
        )];

        const sections = [...new Set(
            idbAssignments
                .map(a => a.section)
                .filter(Boolean)
        )];

        subjects.forEach(subject => {
            subjectSelect.add(new Option(subject, subject));
        });

        sections.forEach(section => {
            sectionSelect.add(new Option(section, section));
        });

        subjectSelect.onchange = () => {
            const selectedSubject = subjectSelect.value;

            const matchingSections = [...new Set(
                idbAssignments
                    .filter(a =>
                        !selectedSubject ||
                        a.subject_name === selectedSubject
                    )
                    .map(a => a.section)
                    .filter(Boolean)
            )];

            sectionSelect.innerHTML =
                '<option value="">Choose assigned section</option>';

            matchingSections.forEach(section => {
                sectionSelect.add(new Option(section, section));
            });
        };

    } catch (error) {
        console.error('Error loading assignments:', error);
        showToast('⚠️', 'Could not load assigned subjects and sections.');
    }
}

function addCreateQuestion(type = 'mc') {
    const container = document.getElementById('c-questions');
    if (!container) return;

    const letters = ['A', 'B', 'C', 'D'];
    const number = container.querySelectorAll('.q-item').length + 1;

    const item = document.createElement('div');
    item.className = 'q-item';
    item.dataset.type = type;

    item.innerHTML = type === 'mc'
        ? `
        <div class="q-item-header">
            <div class="q-num">${number}</div>
            <span class="q-type-tag q-type-mc">Multiple Choice</span>
            <button type="button" class="q-remove" data-remove-question>✕</button>
        </div>
        <input class="q-input" placeholder="Type your question here...">
        <div class="q-choices">
            ${letters.map(letter => `
            <div class="q-choice-row">
                <span class="q-choice-letter">${letter}</span>
                <input class="q-choice-input" placeholder="Choice ${letter}">
            </div>`).join('')}
        </div>
        <div class="q-correct-row">
            <label class="q-correct-label">Correct Answer:</label>
            <select class="q-correct-select">
                ${letters.map((letter, i) =>
                    `<option value="${i}">${letter}</option>`
                ).join('')}
            </select>
        </div>`
        : `
        <div class="q-item-header">
            <div class="q-num">${number}</div>
            <span class="q-type-tag q-type-id">Identification</span>
            <button type="button" class="q-remove" data-remove-question>✕</button>
        </div>
        <input class="q-input" placeholder="Type your identification question here...">
        <div class="q-id-note">📝 Students will type their answer. You will manually grade this.</div>`;

    item.querySelector('[data-remove-question]').onclick = () => {
        item.remove();
        idbUpdateQuestionCount();
    };

    container.appendChild(item);
    idbUpdateQuestionCount();
}

function idbUpdateQuestionCount() {
    const items = document.querySelectorAll('#c-questions .q-item');

    // Renumber the cards after adding or removing one
    items.forEach((item, i) => {
        const num = item.querySelector('.q-num');
        if (num) num.textContent = i + 1;
    });

    const label = document.getElementById('c-q-count');
    if (label) label.textContent = items.length;
}

function idbCollectCreateData() {
    const title = document.getElementById('c-title')?.value.trim();
    const subject = document.getElementById('c-subject')?.value;
    const section = document.getElementById('c-section')?.value;
    const xpReward = parseInt(document.getElementById('c-xp')?.value, 10);

    if (!title) {
        showToast('⚠️', 'Please enter a quiz title.');
        return null;
    }

    if (!subject || !section) {
        showToast('⚠️', 'Please choose an assigned subject and section.');
        return null;
    }

    if (!xpReward || xpReward < 50) {
        showToast('⚠️', 'XP reward must be at least 50.');
        return null;
    }

    const items = [
        ...document.querySelectorAll('#c-questions .q-item')
    ];

    if (!items.length) {
        showToast('⚠️', 'Please add at least one question.');
        return null;
    }

    const questions = [];

    for (const item of items) {
        const text = item.querySelector('.q-input')?.value.trim();

        if (!text) {
            showToast('⚠️', 'Please complete every question.');
            return null;
        }

        if (item.dataset.type === 'mc') {
            const choices = [
                ...item.querySelectorAll('.q-choice-input')
            ].map(input => input.value.trim());

            if (choices.length < 2 || choices.some(choice => !choice)) {
                showToast('⚠️', 'Please fill in all multiple-choice options.');
                return null;
            }

            questions.push({
                type: 'mc',
                text,
                choices,
                correct: parseInt(
                    item.querySelector('.q-correct-select').value,
                    10
                )
            });
        } else {
            questions.push({ type: 'id', text });
        }
    }

    return {
        title,
        subject,
        section,
        mode: document.getElementById('c-mode')?.value || 'formal',
        type: document.getElementById('c-type')?.value || 'Solo',
        due: document.getElementById('c-due')?.value || '',
        time: parseInt(document.getElementById('c-time')?.value, 10) || 30,
        xpReward,
        instructions: document.getElementById('c-instructions')?.value || '',
        questions
    };
}


function idbSelectQuizMode(mode) {
    const modeInput = document.getElementById('c-mode');

    if (!modeInput ||
        !['formal', 'informal'].includes(mode)) {
        return;
    }

    modeInput.value = mode;

    document.querySelectorAll('.idb-mode-card').forEach(card => {
        const selected = card.dataset.mode === mode;

        card.classList.toggle('selected', selected);
        card.setAttribute(
            'aria-pressed',
            selected ? 'true' : 'false'
        );
    });
}


async function saveCreate(status = 'active') {
    const data = idbCollectCreateData();
    if (!data) return;

    data.status = status;

    const button = document.getElementById(
        status === 'draft' ? 'c-draft-btn' : 'c-post-btn'
    );

    const originalText = button?.textContent;

    try {
        if (button) {
            button.disabled = true;
            button.textContent = status === 'draft'
                ? 'Saving...'
                : 'Posting...';
        }

        const response = await fetch('../assets/php/get_quiz.php', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Unable to save the quiz.');
        }

        showToast(
            '✅',
            status === 'draft' ? 'Quiz draft saved.' : 'Quiz posted successfully.'
        );

        document.getElementById('c-title').value = '';
        document.getElementById('c-instructions').value = '';
        document.getElementById('c-questions').innerHTML = '';
        document.getElementById('c-xp').value = 150;
        idbUpdateQuestionCount();
        closeModal('modal-create');

    } catch (error) {
        console.error('Create quiz error:', error);
        showToast('⚠️', error.message || 'Could not save the quiz.');
    } finally {
        if (button) {
            button.disabled = false;
            button.textContent = originalText;
        }
    }
}

/* ── REPORT FILTER EVENT LISTENERS ── */
// Updates the student reports whenever the instructor changes
// the selected section or subject filter.
document.addEventListener('DOMContentLoaded', () => {
    ['rp-section', 'rp-subject'].forEach(id => {
        const filter = document.getElementById(id);

        if (filter) {
            filter.addEventListener('change', renderIdbReports);
        }
    });
});


/* ── CLOSE MODALS WHEN CLICKING OVERLAY ── */

document.addEventListener('DOMContentLoaded', () => {

    [
        'modal-create',
        'modal-grade',
        'modal-reports',
        'modal-idb-announcements',
        'modal-idb-leaderboard'
    ].forEach(id => {

        const modal =
            document.getElementById(id);

        if (!modal) return;

        modal.addEventListener('click', function(e) {

            if (e.target === this) {
                closeModal(id);
            }

        });

    });

});


/* ── SET DEFAULT DUE DATE ── */

document.addEventListener('DOMContentLoaded', () => {

    const dueDate =
        document.getElementById('c-due');

    if (dueDate) {

        const d = new Date();

        d.setDate(d.getDate() + 7);

        const year =
            d.getFullYear();

        const month =
            String(d.getMonth() + 1).padStart(2, '0');

        const day =
            String(d.getDate()).padStart(2, '0');

        dueDate.value =
            `${year}-${month}-${day}`;

        idbLoadAssignments();
    }

    

});


/* ── PAGE ENTER ANIMATION ── */

async function idbInitializeDashboard() {

    console.log('IDASHBOARD INITIALIZATION STARTED');

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.body.classList.add('page-enter-active');
        });
    });

    console.log('CALLING STUDENT SUCCESS RATE');

    // Load the success rate independently of the avatar
    idbLoadStudentSuccessRate();

    // Load instructor avatar
    try {
        await loadInstructorAvatar();
    } catch (error) {
        console.error('Instructor avatar loading error:', error);
    }
}

// Handle both normal and late script loading
if (document.readyState === 'loading') {
    document.addEventListener(
        'DOMContentLoaded',
        idbInitializeDashboard,
        { once: true }
    );
} else {
    idbInitializeDashboard();
}