/* ═══════════════════════════════════════════════════════════════
   idashboard-additions.js
   Implements for Idashboard.html:
     1. Announcement inbox + banner
     2. Notification bell (flag / boost / submission alerts)
     3. Leaderboard modal (per section, subject filter, podium)
     4. Level name display (mini-lb + leaderboard table)
     5. Sidebar recent alerts
     6. Rich toast notifications
     7. Notification stat card live count
   ═══════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────
   LEVEL SYSTEM
────────────────────────────────────── */
const IDB_LEVELS = [
    { min: 0, name: 'Novice', cls: 'ilp-novice' },
    { min: 500, name: 'Learner', cls: 'ilp-learner' },
    { min: 1000, name: 'Scholar', cls: 'ilp-scholar' },
    { min: 1500, name: 'Expert', cls: 'ilp-expert' },
    { min: 2000, name: 'Master', cls: 'ilp-master' },
    { min: 2500, name: 'Legend', cls: 'ilp-legend' },
];

function idbGetLevel(xp) {
    let out = IDB_LEVELS[0];
    for (const l of IDB_LEVELS) { if (xp >= l.min) out = l; }
    return out;
}

function idbLvlPill(xp) {
    const { name, cls } = idbGetLevel(xp);
    return `<span class="idb-lvl-pill ${cls}">${name}</span>`;
}

/* ──────────────────────────────────────
   TEACHING XP PROGRESS POPUP
────────────────────────────────────── */

function updateIdbTeachingXpPopup(xp) {

    xp = Math.max(0, Number(xp) || 0);

    // Use the existing IDB_LEVELS definitions
    let current = IDB_LEVELS[0];
    let next = null;

    for (let i = 0; i < IDB_LEVELS.length; i++) {

        if (xp >= IDB_LEVELS[i].min) {
            current = IDB_LEVELS[i];
            next = IDB_LEVELS[i + 1] || null;
        }

    }

    const title = document.getElementById('idb-xp-level-title');
    const subtitle = document.getElementById('idb-xp-level-sub');
    const progressFill = document.getElementById('idb-xp-progress-fill');
    const progressLabels = document.getElementById('idb-xp-progress-labels');
    const neededText = document.getElementById('idb-xp-needed');

    // Update level title
    if (title) {
        title.textContent = next
            ? `${current.name} → ${next.name}`
            : `${current.name} — Max Level`;
    }

    // Update current level description
    if (subtitle) {
        subtitle.textContent = `Current Level: ${current.name}`;
    }

    if (next) {

        const xpIntoLevel = xp - current.min;
        const xpRequired = next.min - current.min;

        const progress = Math.min(
            100,
            Math.max(0, (xpIntoLevel / xpRequired) * 100)
        );

        const xpNeeded = Math.max(0, next.min - xp);

        // Update progress bar
        // Calculate progress toward the next level
        const range = next.min - current.min;
        const earned = xp - current.min;

        const percentage = Math.min(
            100,
            Math.max(0, (earned / range) * 100)
        );

        // Update progress bar
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
            progressFill.style.display = 'block';
            progressFill.style.visibility = 'visible';
        }

        // Update XP range labels
        if (progressLabels) {
            progressLabels.innerHTML = `
                <span>${current.min.toLocaleString()} XP</span>
                <span>${next.min.toLocaleString()} XP</span>
            `;
        }

        // Update remaining XP
        if (neededText) {
            neededText.textContent =
                `${xpNeeded.toLocaleString()} XP needed to reach ${next.name}`;
        }

    } else {

        // Maximum level reached
        if (progressFill) {
            progressFill.style.width = '100%';
        }

        if (progressLabels) {
            progressLabels.innerHTML = `
                <span>${current.min.toLocaleString()} XP</span>
                <span>MAX LEVEL</span>
            `;
        }

        if (neededText) {
            neededText.textContent = 'You have reached the maximum level!';
        }

    }

    console.log('IDASHBOARD XP PROGRESS:', {
        xp,
        currentLevel: current.name,
        nextLevel: next?.name || 'Max Level',
        progress: next
            ? `${Math.round(((xp - current.min) / (next.min - current.min)) * 100)}%`
            : '100%'
    });

}


/* ──────────────────────────────────────
   ANNOUNCEMENT DATA
────────────────────────────────────── */
let idbAnnouncements = [];

const idbReadAnnouncements = new Set(idbAnnouncements.filter(a => a.read).map(a => a.id));

function idbUnreadAnnounceCount() {
    return idbAnnouncements.filter(a => !idbReadAnnouncements.has(a.id)).length;
}

let idbNotifications = [];
let idbNotifTab = 'announcements';

/* ──────────────────────────────────────
   DASHBOARD STATISTICS
────────────────────────────────────── */

let idbDashboardStats = {
    active_students: 0,
    sections: 0,
    assigned_quizzes: 0,
    subjects: 0,
    expected_assignments: 0,
    completed_assignments: 0,
    completion_rate: 0,
    pending_submissions: 0
};


async function loadIdbDashboardStats() {

    try {

        const response = await fetch(
            '../assets/php/IDashboard.php',
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            }
        );


        const responseText = await response.text();

let result;

try {
    result = JSON.parse(responseText);
} catch (parseError) {
    throw new Error(
        `Dashboard statistics returned HTML or invalid JSON. ` +
        `HTTP status: ${response.status}. ` +
        `Response: ${responseText.slice(0, 300)}`
    );
}

if (!response.ok || !result.success) {
    console.error(
        'DASHBOARD PHP ERROR DETAILS:',
        result.error || result.message || result
    );

    throw new Error(
        `Dashboard statistics failed. HTTP ${response.status}. ` +
        `${result.error || result.message || 'Unknown PHP error'}`
    );
}


        idbDashboardStats =
            result.stats || idbDashboardStats;


        /* ACTIVE STUDENTS */

        const activeStudents =
            document.getElementById(
                'stat-active-students'
            );

        const activeStudentsSub =
            document.getElementById(
                'stat-active-students-sub'
            );


        if (activeStudents) {

            activeStudents.textContent =
                idbDashboardStats.active_students;

        }


        if (activeStudentsSub) {

            activeStudentsSub.textContent =
                `${idbDashboardStats.sections} sections`;

        }


        /* ASSIGNED QUIZZES */

        const assignedQuizzes =
            document.getElementById(
                'stat-assigned-quizzes'
            );

        const assignedQuizzesSub =
            document.getElementById(
                'stat-assigned-quizzes-sub'
            );


        if (assignedQuizzes) {

            assignedQuizzes.textContent =
                idbDashboardStats.assigned_quizzes;

        }


        if (assignedQuizzesSub) {

            assignedQuizzesSub.textContent =
                `${idbDashboardStats.subjects} subjects`;

        }


        /* COMPLETION RATE */

        const completionRate =
            Number(
                idbDashboardStats.completion_rate || 0
            );


        const completionValue =
            document.getElementById(
                'stat-completion-rate'
            );

        const completionTrend =
            document.getElementById(
                'stat-completion-trend'
            );


        const completionText =
            `${completionRate}%`;


        if (completionValue) {

            completionValue.textContent =
                completionText;

        }


        if (completionTrend) {

            completionTrend.textContent =
                completionText;

        }


        /* NOTIFICATIONS */

        idbRefreshBadges();


        console.log(
            'Instructor dashboard statistics loaded:',
            idbDashboardStats
        );


    } catch (error) {

        console.error(
            'Error loading instructor dashboard statistics:',
            error
        );

    }

}

function formatIdbNotificationTime(timestamp) {

    const diff = Date.now() - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
        return 'Just now';
    }

    if (minutes < 60) {
        return `${minutes} min ago`;
    }

    if (hours < 24) {
        return `${hours} hr ago`;
    }

    if (days < 7) {
        return `${days} day${days === 1 ? '' : 's'} ago`;
    }

    return new Date(timestamp).toLocaleDateString();
}

async function loadIdbAnnouncements() {

    try {

        const response = await fetch(
            '../assets/php/get_instructor_announcements.php'
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            console.error(
                'Failed to load instructor announcements:',
                result.message
            );
            return;
        }

        const announcements = (result.notifications || []).map(n => ({
    ...n,
    time: formatIdbNotificationTime(n.time)
}));

        // Add announcements to the Dashboard notification list
        idbNotifications = [
            ...idbNotifications.filter(n => n.type !== 'announce'),
            ...announcements
        ];

        idbRefreshBadges();
        idbRenderSidebarNotifs();

    } catch (error) {

        console.error(
            'Error loading Dashboard announcements:',
            error
        );

    }
}

async function loadIdbAnnouncementInbox() {

    try {

        const response = await fetch(
            '../assets/php/get_instructor_announcements.php'
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            console.error(
                'Failed to load announcements:',
                result.message
            );
            return;
        }

        const notifications = result.notifications || [];

        idbAnnouncements = notifications.map(n => ({
            id: n.id,
            title: n.title,
            body: n.desc || '',
            priority: {
    urgent: 'high',
    important: 'medium',
    normal: 'info'
}[String(n.priority || 'normal').toLowerCase()] || 'info',
            from: 'Admin',
            role: 'Administrator',
            time: formatIdbNotificationTime(n.time)
        }));

        idbRenderAnnouncements();

        console.log(
            'Dashboard announcement inbox loaded:',
            idbAnnouncements
        );

    } catch (error) {

        console.error(
            'Error loading Dashboard announcement inbox:',
            error
        );

    }
}

const idbReadNotifs = new Set(idbNotifications.filter(n => n.read).map(n => n.id));

function idbUnreadNotifCount() {
    return idbNotifications.filter(n => !idbReadNotifs.has(n.id)).length;
}

function idbNotifIconClass(type) {
    return { submit: 'idb-ni-submit', flag: 'idb-ni-flag', boost: 'idb-ni-boost', announce: 'idb-ni-announce' }[type] || 'idb-ni-announce';
}

function idbNotifEmoji(type) {
    return { submit: '\u{1F4DD}', flag: '\u{1F6A9}', boost: '\u{26A1}', announce: '\u{1F4E2}' }[type] || '\u{1F514}';
}

function idbNotifLucideIcon(type) {
    return { submit: 'notebook-pen', flag: 'flag-triangle-right', boost: 'zap', announce: 'megaphone' }[type] || 'bell';
}

// ==========================================
// DATABASE-DRIVEN LEADERBOARD
// ==========================================

let idbLeaderboard = [];
let idbLbSection = 'All';
let idbLbSubject = 'All';
let idbTeachingAssignments = [];

let idbLeaderboardLoaded = false;


// Generate consistent avatar color
function idbGetAvatarColor(value) {
    const colors = [
        '#7c5cbf',
        '#a57fe0',
        '#c45bb0',
        '#5c8bbf',
        '#6abf8b',
        '#d08b4f',
        '#4fa6a6',
        '#bf5c72'
    ];

    let hash = 0;

    String(value || '').split('').forEach(char => {
        hash = ((hash << 5) - hash) + char.charCodeAt(0);
        hash |= 0;
    });

    return colors[Math.abs(hash) % colors.length];
}


// Generate initials
function idbGetInitials(name) {
    if (!name) return 'ST';

    const parts = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }

    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}


// Load real leaderboard data
async function loadIdbLeaderboardData() {

    console.log('======================================');
    console.log('LOADING DATABASE LEADERBOARD');
    console.log('======================================');

    try {

        const response = await fetch('../assets/php/get_instructor_students.php', {
            method: 'GET',
            credentials: 'include'
        });

        console.log('LEADERBOARD RESPONSE STATUS:', response.status);

const responseText = await response.text();

let data;

try {
    data = JSON.parse(responseText);
} catch (parseError) {
    throw new Error(
        `get_instructor_students.php returned invalid JSON. ` +
        `HTTP status: ${response.status}. ` +
        `Response: ${responseText.slice(0, 500)}`
    );
}

console.log('LEADERBOARD DATABASE RESPONSE:', data);

if (!response.ok || !data.success) {
    throw new Error(
        `get_instructor_students.php failed. ` +
        `HTTP ${response.status}. ` +
        `${data.message || data.error || 'Unknown PHP error'}`
    );
}

if (!Array.isArray(data.students)) {
    throw new Error(
        'The leaderboard response does not contain a valid students array.'
    );
}

        idbLeaderboard = data.students.map(student => {

            const name =
                student.name ||
                student.student_name ||
                student.full_name ||
                'Unknown Student';

            const xp = Number(
    student.total_xp ??
    student.xp ??
    0
);
            const score = Number(
                student.avg_score ??
                student.average_score ??
                student.score ??
                0
            );

            return {
                student_id: student.student_id,
                student_number: student.student_number,

                name: name,

                initials: idbGetInitials(name),

                section:
                    student.section ||
                    'Unknown Section',

                program:
                    student.program ||
                    '',

                year_level:
                    student.year_level ||
                    '',

                block:
                    student.block ||
                    '',

                xp: xp,

                score: score,

                subjects: idbTeachingAssignments
                    .filter(
                        assignment =>
                            normalizeIdbSection(
                                assignment.section
                            ) ===
                            normalizeIdbSection(
                                student.section
                            )
                    )
                    .map(
                        assignment =>
                            String(
                                assignment.subject_name || ''
                            ).trim()
                    )
                    .filter(Boolean)
                    .filter(
                        (subject, index, arr) =>
                            arr.indexOf(subject) === index
                    ),

                // The current students endpoint does not provide
                // a real streak value, so we do NOT fake one.
                streak: null,

                // Subject-specific scores are not currently returned
                // by get_instructor_students.php.
                subject: 'All Subjects',

                submissions: Number(
    student.submission_count ??
    student.submissions_count ??
    student.submissions ??
    0
),

                color:
                    idbGetAvatarColor(
                        student.student_id || name
                    )
            };
        });

        idbLeaderboardLoaded = true;

        console.log(
            'DATABASE LEADERBOARD LOADED:',
            idbLeaderboard.length
        );

        idbRenderLeaderboard();

    } catch (error) {

        console.error(
            'ERROR LOADING DATABASE LEADERBOARD:',
            error
        );

        idbLeaderboard = [];
        idbLeaderboardLoaded = true;

        idbRenderLeaderboard();
    }
}


// Filter leaderboard
function idbFilteredLb() {

    let list = [...idbLeaderboard];

    // Section filter
    if (idbLbSection !== 'All') {

        list = list.filter(student =>
            normalizeIdbSection(student.section) ===
            normalizeIdbSection(idbLbSection)
        );

    }

    // Subject filter
    if (idbLbSubject !== 'All') {

        list = list.filter(student =>
            Array.isArray(student.subjects) &&
            student.subjects.includes(idbLbSubject)
        );

    }

    // Highest XP first
    list.sort((a, b) => {

        if (b.xp !== a.xp) {
            return b.xp - a.xp;
        }

        return b.score - a.score;

    });

    return list.map((student, index) => ({
        ...student,
        rank: index + 1
    }));
}


function idbUpdateLeaderboardSectionTabs() {
    const container = document.getElementById('idb-lb-sec-tabs');
    if (!container) return;

    // Use the logged-in instructor's actual teaching assignments.
    const sections = [
        ...new Set(
            idbTeachingAssignments
                .map(assignment =>
                    String(
                        assignment.section ||
                        assignment.section_label ||
                        ''
                    ).trim()
                )
                .filter(Boolean)
        )
    ].sort((a, b) => a.localeCompare(b));

    const availableSections = ['All', ...sections];

    // If the previously selected section is no longer assigned,
    // reset the filter to All.
    if (!availableSections.includes(idbLbSection)) {
        idbLbSection = 'All';
    }

    container.innerHTML = availableSections.map(section => `
        <button
            type="button"
            class="idb-lb-sec-tab ${idbLbSection === section ? 'active' : ''}"
            data-section="${escapeIdbHtml(section)}"
        >
            ${section === 'All'
                ? 'All Assigned Sections'
                : escapeIdbHtml(section)}
        </button>
    `).join('');

    container.querySelectorAll('.idb-lb-sec-tab').forEach(button => {
        button.addEventListener('click', () => {
            switchIdbLbSection(button, button.dataset.section);
        });
    });
}


// Update subject filter
async function idbUpdateLeaderboardSubjects() {

    const select =
        document.getElementById(
            'idb-lb-subj-select'
        );

    if (!select) {
        return;
    }

    try {

        /* Get the instructor's actual assignments */
        const response =
            await fetch(
                '../assets/php/get_instructor_assignments.php',
                {
                    method: 'GET',
                    credentials: 'same-origin',
                    cache: 'no-store'
                }
            );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        const result =
            await response.json();

        console.log(
            'LEADERBOARD ASSIGNMENTS:',
            result
        );

        if (
            !result.success ||
            !Array.isArray(result.assignments)
        ) {

            throw new Error(
                result.message ||
                'No assignments returned.'
            );

        }


        let assignments =
            result.assignments;


        /* -----------------------------------------
           FILTER BY SELECTED SECTION
        ----------------------------------------- */

        if (
            idbLbSection &&
            idbLbSection !== 'All'
        ) {

            assignments =
                assignments.filter(
                    assignment => {

                        const assignmentSection =
                            assignment.section ||
                            assignment.section_label ||
                            '';

                        return (
                            normalizeIdbSection(
                                assignmentSection
                            ) ===
                            normalizeIdbSection(
                                idbLbSection
                            )
                        );

                    }
                );

        }


        /* -----------------------------------------
           GET SUBJECT NAMES
        ----------------------------------------- */

        const subjects = [
            ...new Set(
                assignments
                    .map(
                        assignment =>
                            String(
                                assignment.subject_name ||
                                assignment.subject ||
                                ''
                            ).trim()
                    )
                    .filter(Boolean)
            )
        ].sort();


        console.log(
            'LEADERBOARD SUBJECTS:',
            subjects
        );


        /* -----------------------------------------
           REBUILD DROPDOWN
        ----------------------------------------- */

        select.innerHTML = '';

        const allOption =
            document.createElement('option');

        allOption.value = 'All';
        allOption.textContent = 'All Subjects';

        select.appendChild(
            allOption
        );


        subjects.forEach(
            subject => {

                const option =
                    document.createElement(
                        'option'
                    );

                option.value = subject;
                option.textContent = subject;

                select.appendChild(
                    option
                );

            }
        );


        /* Keep current filter */
        if (
            subjects.includes(idbLbSubject)
        ) {

            select.value =
                idbLbSubject;

        } else {

            idbLbSubject = 'All';
            select.value = 'All';

        }


    } catch (error) {

        console.error(
            'ERROR LOADING LEADERBOARD SUBJECTS:',
            error
        );

        /* Keep All Subjects available */
        select.innerHTML = `
            <option value="All">
                All Subjects
            </option>
        `;

        idbLbSubject = 'All';

    }

}

// ==========================================
    // LEADEBOARD
    // ==========================================

async function idbRenderLeaderboard() {
    idbUpdateLeaderboardSectionTabs();

    await idbUpdateLeaderboardSubjects();

    const list = idbFilteredLb();

    console.log('RENDERING LEADERBOARD:', list);

    // Generate initials if they are missing.
    function getStudentInitials(student) {
        const name = String(student.name || '').trim();

        if (student.initials && String(student.initials).trim()) {
            return String(student.initials).trim().slice(0, 3);
        }

        const parts = name.split(/\s+/).filter(Boolean);

        if (!parts.length) return 'ST';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

        return (
            parts[0][0] +
            parts[parts.length - 1][0]
        ).toUpperCase();
    }

    function getStudentColor(student) {
        // Use the existing avatar color, with a fallback.
        const color = String(student.color || '').trim();

        // Accept only simple CSS hex colors to keep inline styles safe.
        return /^#[0-9a-fA-F]{3,8}$/.test(color)
            ? color
            : '#8b5cf6';
    }

    function renderStudentAvatar(student, size = 'normal') {
        const initials = getStudentInitials(student);
        const color = getStudentColor(student);

        return `
            <div
                class="idb-lb-avatar ${size === 'podium'
                    ? 'idb-lb-avatar-podium'
                    : 'idb-lb-avatar-row'}"
                style="--idb-lb-avatar-color: ${color}"
                aria-label="${escapeIdbHtml(student.name || 'Student')}"
                title="${escapeIdbHtml(student.name || 'Student')}"
            >
                ${escapeIdbHtml(initials)}
            </div>
        `;
    }

    // ==========================================
    // SUMMARY
    // ==========================================

    const summaryEl = document.getElementById('idb-lb-summary');

    if (summaryEl) {
        const sections =
            idbLbSection === 'All'
                ? [
                    ...new Set(
                        idbLeaderboard
                            .map(student => student.section)
                            .filter(Boolean)
                    )
                ]
                : [idbLbSection];

        if (!sections.length) {
            summaryEl.innerHTML = `
                <div class="idb-lb-summary-card">
                    <strong>0</strong>
                    <span>Students</span>
                    <small>No assigned sections found.</small>
                </div>
            `;
        } else {
            summaryEl.innerHTML = sections.map(section => {
                const students = idbLeaderboard.filter(
                    student =>
                        String(student.section).trim() ===
                        String(section).trim()
                );

                const average = students.length
                    ? Math.round(
                        students.reduce(
                            (total, student) =>
                                total + Number(
    student.score ??
    student.avg_score ??
    0
),
                            0
                        ) / students.length
                    )
                    : 0;

                return `
                    <div class="idb-lb-summary-card">
                        <strong>${students.length}</strong>
                        <span>${escapeIdbHtml(section)}</span>
                        <small>Avg. Score: ${average}%</small>
                    </div>
                `;
            }).join('');
        }
    }

    // ==========================================
    // PODIUM
    // ==========================================

    const podiumEl = document.getElementById('idb-lb-podium');

    if (podiumEl) {
        if (!list.length) {
            podiumEl.innerHTML = `
                <div class="idb-lb-empty">
                    No students found.
                </div>
            `;
        } else {
            const top = list.slice(0, 3);
            const medals = ['🥇', '🥈', '🥉'];

            podiumEl.innerHTML = top.map((student, index) => {
                const level = idbGetLevel(student.xp);
                const xp = Number(student.xp || 0);

                return `
                    <article class="idb-lb-podium-item">

                        <div class="idb-lb-podium-medal">
                            ${medals[index]}
                        </div>

                        ${renderStudentAvatar(student, 'podium')}

                        <div class="idb-lb-podium-info">
                            <strong class="idb-lb-podium-name">
                                ${escapeIdbHtml(student.name || 'Student')}
                            </strong>

                            <span class="idb-lb-podium-xp">
                                ${xp.toLocaleString()} XP
                            </span>

                            <small class="idb-lb-podium-level">
                                ${escapeIdbHtml(level.name)}
                            </small>
                        </div>

                    </article>
                `;
            }).join('');
        }
    }

    // ==========================================
    // TABLE
    // ==========================================

    const tbody = document.getElementById('idb-lb-tbody');

    if (!tbody) return;

    if (!list.length) {
        tbody.innerHTML = `
            <div class="idb-lb-empty">
                No students found for this section.
            </div>
        `;
        return;
    }

    tbody.innerHTML = list.map(student => {
        const level = idbGetLevel(student.xp);
        const xp = Number(student.xp || 0);
        const score = Number(student.score || 0);

        const streakDisplay =
            student.streak === null || student.streak === undefined
                ? '—'
                : `${student.streak} 🔥`;

        return `
            <div class="idb-lb-row">

                <div class="idb-lb-rank">
                    ${escapeIdbHtml(String(student.rank ?? '—'))}
                </div>

                <div class="idb-lb-student">

                    ${renderStudentAvatar(student, 'row')}

                    <div class="idb-lb-student-info">
                        <strong>
                            ${escapeIdbHtml(student.name || 'Student')}
                        </strong>

                        <small>
                            ${escapeIdbHtml(student.student_number || '')}
                        </small>
                    </div>

                </div>

                <div class="idb-lb-section">
                    ${escapeIdbHtml(student.section || '—')}
                </div>

                <div class="idb-lb-xp">
                    ${xp.toLocaleString()} XP
                </div>

                <div class="idb-lb-level">
                    ${idbLvlPill(student.xp)}
                </div>

                <div class="idb-lb-score">
                    ${Number.isFinite(score) ? `${score.toFixed(0)}%` : '—'}
                </div>

                <div class="idb-lb-streak">
                    ${escapeIdbHtml(String(streakDisplay))}
                </div>

            </div>
        `;
    }).join('');
}


// Mini leaderboard
function idbRenderMiniLb(
    section,
    containerId
) {

    const el =
        document.getElementById(
            containerId
        );

    if (!el) return;


    const top3 =
        idbLeaderboard
            .filter(student =>
                String(student.section).trim() ===
                String(section).trim()
            )
            .sort((a, b) => {

                if (b.xp !== a.xp) {
                    return b.xp - a.xp;
                }

                return b.score - a.score;
            })
            .slice(0, 3);


    if (!top3.length) {

        el.innerHTML = '';

        return;
    }


    const medals = [
        '🥇',
        '🥈',
        '🥉'
    ];


    el.innerHTML = `

        <div class="idb-mini-lb-title">
            Top Students
        </div>

        ${top3.map((student, index) => {

            const level =
                idbGetLevel(
                    student.xp
                );

            return `

                <div class="idb-mini-row">

                    <span class="idb-mini-medal">
                        ${medals[index]}
                    </span>

                    <div
                        class="idb-mini-avatar"
                        style="background:${student.color}"
                    >
                        ${escapeIdbHtml(student.initials)}
                    </div>

                    <div class="idb-mini-info">

                        <strong>
                            ${escapeIdbHtml(student.name)}
                        </strong>

                        <small>
                            ${escapeIdbHtml(level.name)}
                        </small>

                    </div>

                    <strong class="idb-mini-xp">
                        ${student.xp.toLocaleString()} XP
                    </strong>

                </div>

            `;

        }).join('')}
    `;
}


/* ──────────────────────────────────────
   BADGE / COUNT REFRESH
────────────────────────────────────── */
function idbRefreshBadges() {
    const nc = idbUnreadNotifCount();
    const ac = idbUnreadAnnounceCount();

    /* Bell badge */
    const bb = document.getElementById('idb-bell-badge');
    if (bb) {
        bb.textContent = nc > 9 ? '9+' : nc;
        bb.classList.toggle('hidden', nc === 0);
    }

    /* Announce dot */
    const ad = document.getElementById('idb-announce-dot');
    if (ad) ad.classList.toggle('hidden', ac === 0);

    /* Stat card */
    const pendingSubmissions =
    Number(
        idbDashboardStats.pending_submissions || 0
    );

const total =
    pendingSubmissions + ac;
    const sv = document.getElementById('stat-notif-count');
    const sb = document.getElementById('stat-notif-badge');
    if (sv) sv.textContent = total;
    if (sb) {
    sb.textContent = total > 0 ? `${total} new` : '';
    sb.style.display = total ? '' : 'none';
}

/* Quick sidebar unread pill */
const qp = document.getElementById('qs-unread-pill');

if (qp) {
    qp.textContent = ac > 0 ? ac : '';
}

/* Announce modal label */
const ul = document.getElementById('idb-announce-unread-label');

if (ul) {
    ul.textContent = ac
        ? `${ac} unread announcement${ac > 1 ? 's' : ''}`
        : 'All caught up ✓';
    }
}



/* ──────────────────────────────────────
   ANNOUNCEMENT ACTIONS
────────────────────────────────────── */
function openIdbAnnouncements() {
    idbRenderAnnouncements();
    idbRefreshBadges();
    openModal('modal-idb-announcements');
}

function idbMarkAnnouncementRead(id) {
    idbReadAnnouncements.add(id);
    const card = document.getElementById('idb-ac-' + id);
    if (card) {
        card.classList.remove('unread');
        const pill = card.querySelector('.idb-ac-new');
        if (pill) pill.remove();
    }
    idbRefreshBadges();
}

function idbMarkAllAnnouncementsRead() {
    idbAnnouncements.forEach(a => idbReadAnnouncements.add(a.id));
    document.querySelectorAll('.idb-ac-card').forEach(c => {
        c.classList.remove('unread');
        const p = c.querySelector('.idb-ac-new');
        if (p) p.remove();
    });
    idbRefreshBadges();
}

function idbDismissBanner() {
    const b = document.getElementById('idb-announce-banner');
    if (!b) return;
    b.style.transition = 'opacity .3s, transform .3s';
    b.style.opacity = '0';
    b.style.transform = 'translateY(-8px)';
    setTimeout(() => b.remove(), 320);
}


/* ──────────────────────────────────────
   BELL / NOTIFICATION ACTIONS
────────────────────────────────────── */
function toggleIdbBell(e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('idb-notif-dropdown');
    if (!dd) return;
    const opening = !dd.classList.contains('open');
    dd.classList.toggle('open');
    if (opening) {
        idbRenderNotifList();
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function switchIdbNotifTab(tab, button) {
    idbNotifTab = tab;
    document.querySelectorAll('#idb-notif-dropdown .np-tab').forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', String(active));
    });
    idbRenderNotifList();
}

function idbMarkNotifRead(id) {
    idbReadNotifs.add(id);
    const el = document.getElementById('idb-ni-' + id);
    if (el) {
        el.classList.remove('unread');
        const dot = el.querySelector('.idb-nd-dot');
        if (dot) dot.style.opacity = '0';
    }
    idbRefreshBadges();
    idbUpdateNotifTabCounts();
    idbRenderSidebarNotifs();
}

function idbMarkAllNotifsRead() {
    idbNotifications.forEach(n => idbReadNotifs.add(n.id));
    document.querySelectorAll('.idb-nd-item').forEach(el => {
        el.classList.remove('unread');
        const dot = el.querySelector('.idb-nd-dot');
        if (dot) dot.style.opacity = '0';
    });
    idbUpdateNotifTabCounts();
    idbRenderNotifList();
    idbRefreshBadges();
    idbRenderSidebarNotifs();
}

/* Close bell dropdown when clicking outside */
document.addEventListener('click', e => {
    const bellWrap = document.querySelector('.idb-bell-wrap');
    const dd = document.getElementById('idb-notif-dropdown');
    if (dd && bellWrap && !bellWrap.contains(e.target)) {
        dd.classList.remove('open');
    }
});

/* ── Bell dropdown list ── */
function idbRenderNotifList() {

    const el =
        document.getElementById('idb-nd-list');

    if (!el) return;

    idbUpdateNotifTabCounts();
    const visibleNotifications = idbNotifications.filter(n => idbNotifTab === 'announcements' ? n.type === 'announce' : n.type !== 'announce');


    if (!visibleNotifications.length) {

        el.innerHTML = `
            <div class="idb-nd-empty">
                <div class="idb-nd-empty-icon">🔔</div>
                <p>No notifications yet</p>
            </div>
        `;

        return;
    }


    el.innerHTML =
        visibleNotifications.map(n => {

            const isRead =
                idbReadNotifs.has(n.id);

            return `
                <div
                    class="np-item idb-nd-item ${isRead ? 'np-read' : 'np-unread unread'}"
                    id="idb-ni-${n.id}"
                    onclick="idbMarkNotifRead('${n.id}')"
                >

                    <div
                        class="np-item-icon idb-nd-icon ${idbNotifIconClass(n.type)}"
                    >
                        <i data-lucide="${idbNotifLucideIcon(n.type)}" aria-hidden="true"></i>
                    </div>

                    <div class="np-item-body idb-nd-body">

                        <div class="np-item-title idb-nd-title2">
                            ${n.title}
                        </div>

                        <div class="np-item-preview idb-nd-desc">
                            ${n.desc}
                        </div>

                        <span class="np-item-meta idb-nd-time">
                            ${n.time}
                        </span>

                    </div>

                    ${isRead ? '' : '<div class="np-unread-dot idb-nd-dot"></div>'}

                </div>
            `;

        }).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function idbUpdateNotifTabCounts() {
    const announcements = idbNotifications.filter(n => n.type === 'announce' && !idbReadNotifs.has(n.id)).length;
    const activity = idbNotifications.filter(n => n.type !== 'announce' && !idbReadNotifs.has(n.id)).length;
    [['idb-notif-ann-count', announcements], ['idb-notif-activity-count', activity]].forEach(([id, count]) => {
        const el = document.getElementById(id);
        if (el) { el.textContent = count > 9 ? '9+' : String(count); el.hidden = count === 0; }
    });
}

/* ── Sidebar recent alerts (3 most recent unread first) ── */
function idbRenderSidebarNotifs() {

    const el =
        document.getElementById(
            'idb-sidebar-notif-list'
        );

    if (!el) return;

    const sorted =
        [...idbNotifications]
            .sort((a, b) => {

                const aRead =
                    idbReadNotifs.has(a.id)
                        ? 1
                        : 0;

                const bRead =
                    idbReadNotifs.has(b.id)
                        ? 1
                        : 0;

                return aRead - bRead;

            })
            .slice(0, 3);


    el.innerHTML =
        sorted.map(n => `

        <div
            class="idb-sn-item"
            onclick="idbMarkNotifRead('${n.id}');toggleIdbBell(event)"
        >

            <div
                class="idb-sn-icon ${idbNotifIconClass(n.type)}"
            >
                ${idbNotifEmoji(n.type)}
            </div>

            <div>

                <div class="idb-sn-title">
                    ${n.title}
                </div>

                <div class="idb-sn-desc">
                    ${n.desc}
                </div>

                <span class="idb-sn-time">
                    ${n.time}
                </span>

            </div>

        </div>

    `).join('');
}

/* ── Announcement modal ── */
function idbRenderAnnouncements() {

    const el =
        document.getElementById(
            'idb-announcement-list'
        );

    if (!el) return;


    el.innerHTML =
        idbAnnouncements.map(a => {

            const isRead =
                idbReadAnnouncements.has(a.id);


            const prioCls =
                {
                    high: 'idb-ap-high',
                    medium: 'idb-ap-medium',
                    info: 'idb-ap-info'
                }[a.priority]
                || 'idb-ap-info';


            const prioLabel =
                {
                    high: 'URGENT',
                    medium: 'NOTICE',
                    info: 'INFO'
                }[a.priority]
                || 'INFO';


            const newPill =
                !isRead
                    ? `<span class="idb-ac-new">NEW</span>`
                    : '';


            return `

                <div
                    class="idb-ac-card ${isRead ? '' : 'unread'}"
                    id="idb-ac-${a.id}"
                    onclick="idbMarkAnnouncementRead('${a.id}')"
                >

                    <div class="idb-ac-header">

                        <div class="idb-ac-title">
                            ${a.title}
                            ${newPill}
                        </div>

                        <span
                            class="idb-ac-priority ${prioCls}"
                        >
                            ${prioLabel}
                        </span>

                    </div>


                    <div class="idb-ac-body">
                        ${a.body}
                    </div>


                    <div class="idb-ac-footer">

                        <span class="idb-ac-from">
                            From:
                            <strong>${a.from}</strong>
                            · ${a.role}
                        </span>

                        <span class="idb-ac-time">
                            ${a.time}
                        </span>

                    </div>

                </div>

            `;

        }).join('');
}

/* ──────────────────────────────────────
   LEADERBOARD MODAL ACTIONS
────────────────────────────────────── */

async function openIdbLeaderboard(section) {

    if (section) {

        idbLbSection = section;

        document
            .querySelectorAll('.idb-lb-sec-tab')
            .forEach(btn => {

                btn.classList.toggle(
                    'active',
                    btn.textContent.trim() === section
                );

            });

    }

    /* Load the real subjects assigned by the instructor */
    await idbUpdateLeaderboardSubjects();

    idbRenderLeaderboard();

    openModal(
        'modal-idb-leaderboard'
    );
}


async function switchIdbLbSection(
    btn,
    section
) {

    document
        .querySelectorAll('.idb-lb-sec-tab')
        .forEach(
            b => b.classList.remove('active')
        );

    btn.classList.add('active');

    idbLbSection = section;

    /* Refresh subjects for this section */
    await idbUpdateLeaderboardSubjects();

    idbRenderLeaderboard();
}


function switchIdbLbSubject(value) {

    idbLbSubject = value;

    idbRenderLeaderboard();
}

/* ──────────────────────────────────────
   RICH TOAST
────────────────────────────────────── */
function idbShowRichToast(type, title, desc) {
    const existing = document.querySelector('.idb-rich-toast');
    if (existing) existing.remove();

    const clsMap = { flag: 'idb-rt-flag', boost: 'idb-rt-boost', submit: 'idb-rt-submit', info: 'idb-rt-info' };
    const emojiMap = { flag: '🚩', boost: '⚡', submit: '📥', info: '📢' };

    const div = document.createElement('div');
    div.className = 'idb-rich-toast';
    div.innerHTML = `
    <div class="idb-rt-icon ${clsMap[type] || 'idb-rt-info'}">
        ${emojiMap[type] || '📢'}
    </div>

    <div class="idb-rt-body">
        <div class="idb-rt-title">
            ${title}
        </div>

        <div class="idb-rt-desc">
            ${desc}
        </div>
    </div>

    <button
        class="idb-rt-close"
        onclick="this.closest('.idb-rich-toast').remove()"
    >
        ✕
    </button>
`;

    /* Also push to notification list */
    idbNotifications.unshift({
        id: 'in' + Date.now(),
        type,
        read: false,
        title,
        desc,
        time: 'Just now',
    });
    idbRefreshBadges();
    idbRenderSidebarNotifs();

    /* Auto-dismiss after 5 s */
    setTimeout(() => {
        if (div.parentNode) {
            div.classList.add('hiding');
            setTimeout(() => div.remove(), 300);
        }
    }, 5000);
}

/* Public helpers (callable from other scripts / backend hooks) */
window.idbShowFlagToast = (quiz) => idbShowRichToast('flag', 'Quiz Flagged by Admin', `"${quiz}" was flagged for review. Check alignment score.`);
window.idbShowBoostToast = (student, quiz, score) => idbShowRichToast('boost', 'Grade Boost Redeemed', `${student} used a Grade Boost on "${quiz}" — new score: ${score}%`);
window.idbShowSubmitToast = (student, quiz, score) => idbShowRichToast('submit', 'New Submission', `${student} completed "${quiz}" — scored ${score}%`);


/* ──────────────────────────────────────
   DEMO LIVE EVENTS (remove in production)
────────────────────────────────────── */
function idbStartDemoEvents() {

};


/* ──────────────────────────────────────
   CLOSE MODALS ON OVERLAY CLICK
   (extend existing handler pattern)
────────────────────────────────────── */
['modal-idb-announcements', 'modal-idb-leaderboard'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('click', function(e) {
            if (e.target === this) closeModal(id);
        });
    }
});


/* ──────────────────────────────────────
   TEACHING ASSIGNMENTS
────────────────────────────────────── */

async function loadIdbTeachingAssignments() {

    const container =
        document.getElementById(
            'idb-assignment-grid'
        );

    if (!container) {
        return;
    }


    try {

        const response =
            await fetch(
                '../assets/php/get_instructor_assignments.php',
                {
                    method: 'GET',
                    credentials: 'same-origin',
                    cache: 'no-store'
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
                'Failed to load teaching assignments.'
            );

        }


        const assignments =
            result.assignments || [];
        
        idbTeachingAssignments = assignments;


        console.log(
            'Instructor teaching assignments loaded:',
            assignments
        );


        if (!assignments.length) {

            container.innerHTML = `

                <div class="empty-state dashboard-empty-state" role="status">

                    <span class="emoji">
                        📚
                    </span>

                    <p>
                        No teaching assignments found.
                    </p>

                    <small class="empty-state-hint">Your subjects and sections will appear here when your teaching load is assigned.</small>

                </div>

            `;

            return;

        }


        container.innerHTML =
            assignments
                .map(
                    (assignment, index) => {

                        const subject =
                            assignment.subject_name ||
                            'Unknown Subject';


                        const type =
                            assignment.assignment_type ||
                            'Subject';


                        const average =
                            Number(
                                assignment.average_score
                            ) || 0;


                        const students =
                            Number(
                                assignment.student_count
                            ) || 0;


                        const courseYear =
                            assignment.course_year ||
                            assignment.program ||
                            '';


                        const section =
                            assignment.section_label ||
                            'Section';


                        /* ---------------------------------
                           TYPE COLOR
                        --------------------------------- */

                        let typeClass =
                            'act-purple';


                        if (
                            type
                                .toLowerCase()
                                .includes('advanced')
                        ) {

                            typeClass =
                                'act-blue';

                        } else if (
                            type
                                .toLowerCase()
                                .includes('case')
                        ) {

                            typeClass =
                                'act-pink';
                        }


                        /* ---------------------------------
                           SCORE COLOR
                        --------------------------------- */

                        let scoreClass =
                            'blue';


                        if (
                            average >= 90
                        ) {

                            scoreClass =
                                'teal';

                        } else if (
                            average < 75
                        ) {

                            scoreClass =
                                'pink';

                        }


                        return `

                            <div
                                class="assign-card"
                            >

                                <div class="ac-top">

                                    <div>

                                        <div
                                            class="ac-name"
                                        >
                                            ${escapeIdbHtml(
                                                subject
                                            )}
                                        </div>


                                        <span
                                            class="
                                                ac-type-tag
                                                ${typeClass}
                                            "
                                        >
                                            ${escapeIdbHtml(
                                                type
                                            )}
                                        </span>

                                    </div>


                                    <span
                                        class="
                                            ac-pct
                                            ${scoreClass}
                                        "
                                    >
                                        ${average}%
                                    </span>

                                </div>


                                <div
                                    class="ac-students"
                                >
                                    ${students}
                                    student${students === 1 ? '' : 's'}
                                </div>


                                <div
                                    class="ac-program"
                                >
                                    ${escapeIdbHtml(
                                        courseYear
                                    )}
                                </div>


                                <span
                                    class="ac-section-tag"
                                >
                                    ${escapeIdbHtml(
                                        section
                                    )}
                                </span>

                            </div>

                        `;

                    }
                )
                .join('');


    } catch (error) {

        console.error(
            'Error loading teaching assignments:',
            error
        );


        container.innerHTML = `

            <div class="empty-state">

                <span class="emoji">
                    ⚠️
                </span>

                <p>
                    Unable to load teaching assignments.
                </p>

            </div>

        `;

    }

}


/* ──────────────────────────────────────
   SAFE HTML HELPER
────────────────────────────────────── */

function escapeIdbHtml(value) {

    return String(
        value ?? ''
    )
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );

}

/* ──────────────────────────────────────
   MY STUDENTS — DYNAMIC SECTIONS
────────────────────────────────────── */

async function loadIdbStudentSections() {

    const container =
        document.getElementById(
            'idb-student-sections'
        );

    if (!container) {
        return;
    }


    try {

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
            await response.json();


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                'Failed to load students.'
            );

        }


        const students =
            result.students || [];


        console.log(
            'Instructor students loaded:',
            students
        );


        /* -----------------------------------------
           NO STUDENTS
        ----------------------------------------- */

        if (!students.length) {

            container.innerHTML = `

                <div class="empty-state dashboard-empty-state" role="status">

                    <span class="emoji">
                        👨‍🎓
                    </span>

                    <p>
                        No students are currently
                        assigned to your sections.
                    </p>

                    <small class="empty-state-hint">Students will appear here once they are enrolled in one of your sections.</small>

                </div>

            `;

            return;

        }


        /* -----------------------------------------
           GROUP STUDENTS BY SECTION
        ----------------------------------------- */

        const sections = {};


        students.forEach(student => {

            const section =
                student.section ||
                'Unknown Section';


            if (!sections[section]) {

                sections[section] = [];

            }


            sections[section].push(
                student
            );

        });


        /* -----------------------------------------
           SORT SECTIONS
        ----------------------------------------- */

        const sectionNames =
            Object.keys(sections)
                .sort();


        /* -----------------------------------------
           LOAD ASSIGNMENTS FOR SUBJECTS
        ----------------------------------------- */

        let assignments = [];


        try {

            const assignmentResponse =
                await fetch(
                    '../assets/php/get_instructor_assignments.php',
                    {
                        method: 'GET',
                        credentials: 'same-origin',
                        cache: 'no-store'
                    }
                );


            const assignmentResult =
                await assignmentResponse.json();


            if (
                assignmentResponse.ok &&
                assignmentResult.success
            ) {

                assignments =
                    assignmentResult.assignments ||
                    [];

            }

        } catch (assignmentError) {

            console.warn(
                'Could not load assignment subjects:',
                assignmentError
            );

        }


        /* -----------------------------------------
           BUILD EACH SECTION
        ----------------------------------------- */

        container.innerHTML =
            sectionNames
                .map(
                    (sectionName, sectionIndex) => {

                        const sectionStudents =
                            sections[
                                sectionName
                            ];


                        const firstStudent =
                            sectionStudents[0];


                        const program =
                            firstStudent.program ||
                            '';


                        const yearLevel =
                            Number(
                                firstStudent.year_level
                            ) || 0;


                        const yearLabel =
                            getIdbYearLabel(
                                yearLevel
                            );


                        const courseYear =
                            [
                                program,
                                yearLabel
                            ]
                                .filter(Boolean)
                                .join(' ');


                        /* ---------------------------------
                           SUBJECTS FOR THIS SECTION
                        --------------------------------- */

                        const sectionAssignments =
                            assignments.filter(
                                assignment => {

                                    return normalizeIdbSection(
                                        assignment.section
                                    ) ===
                                    normalizeIdbSection(
                                        sectionName
                                    );

                                }
                            );


                        const subjects = [
                            ...new Set(
                                sectionAssignments
                                    .map(
                                        assignment =>
                                            assignment.subject_name
                                    )
                                    .filter(Boolean)
                            )
                        ];


                        /* ---------------------------------
                           CLASS AVERAGE
                        --------------------------------- */

                        const scores =
                            sectionStudents
                                .map(
                                    student =>
                                        Number(
                                            student.score ?? student.avg_score
                                        ) || 0
                                )
                                .filter(
                                    score =>
                                        score > 0
                                );


                        const average =
                            scores.length
                                ? Math.round(
                                    scores.reduce(
                                        (
                                            total,
                                            score
                                        ) =>
                                            total + score,
                                        0
                                    ) /
                                    scores.length
                                )
                                : 0;


                        const subjectText =
                            subjects.length === 1
                                ? '1 subject'
                                : `${subjects.length} subjects`;


                        /* ---------------------------------
                           MINI LEADERBOARD
                        --------------------------------- */

                        const topStudents =
                            [...sectionStudents]
                                .sort(
                                    (
                                        a,
                                        b
                                    ) =>
                                        (
                                            Number(
                                                b.score
                                            ) || 0
                                        ) -
                                        (
                                            Number(
                                                a.score
                                            ) || 0
                                        )
                                )
                                .slice(0, 3);


                        const miniLeaderboard =
                            topStudents
                                .map(
                                    (
                                        student,
                                        index
                                    ) => {

                                        const initials =
                                            String(
                                                student.name ||
                                                '?'
                                            )
                                                .split(' ')
                                                .map(
                                                    name =>
                                                        name[0]
                                                )
                                                .join('')
                                                .slice(
                                                    0,
                                                    2
                                                )
                                                .toUpperCase();


                                        const medal =
                                            index === 0
                                                ? '🥇'
                                                : index === 1
                                                    ? '🥈'
                                                    : '🥉';


                                        return `

                                            <div
                                                class="idb-mini-row"
                                            >

                                                <span
                                                    class="idb-mini-rank"
                                                >
                                                    ${medal}
                                                </span>

                                                <span
                                                    class="idb-mini-avatar"
                                                >
                                                    ${escapeIdbHtml(
                                                        initials
                                                    )}
                                                </span>

                                                <span
                                                    class="idb-mini-name"
                                                >
                                                    ${escapeIdbHtml(
                                                        student.name
                                                    )}
                                                </span>

                                                <span
                                                    class="idb-mini-score"
                                                >
                                                    ${
                                                        Number(
                                                            student.score ?? student.avg_score
                                                        ) || 0
                                                    }%
                                                </span>

                                            </div>

                                        `;

                                    }
                                )
                                .join('');


                        /* ---------------------------------
                           SECTION BUTTON TARGET
                        --------------------------------- */

                        const miniId =
                            `mini-lb-${sectionIndex}`;


                        return `

                            <div
                                class="section-block"
                            >

                                <div
                                    class="sb-header"
                                >

                                    <div
                                        class="sb-header-left"
                                    >

                                        <h3>
                                            ${escapeIdbHtml(
                                                sectionName
                                            )}
                                        </h3>

                                        <p>
                                            ${
                                                sectionStudents.length
                                            }
                                            ${
                                                sectionStudents.length === 1
                                                    ? 'student'
                                                    : 'students'
                                            }
                                            &bull;
                                            ${subjectText}
                                        </p>

                                    </div>


                                    <div
                                        style="
                                            display:flex;
                                            gap:.6rem;
                                            align-items:center
                                        "
                                    >

                                        <button
                                            class="idb-sec-lb-btn"
                                            onclick="
                                                openIdbLeaderboard(
                                                    '${escapeIdbAttribute(
                                                        sectionName
                                                    )}'
                                                )
                                            "
                                        >
                                            🏆 Leaderboard
                                        </button>


                                        <button
                                            class="btn-primary"
                                            style="
                                                font-size:.8rem;
                                                padding:.5rem 1.1rem
                                            "
                                            onclick="
                                                window.location.href='Instructor.html'
                                            "
                                        >
                                            View Students
                                        </button>

                                    </div>

                                </div>


                                <!-- SUBJECTS -->

                                <div
                                    style="
                                        display:flex;
                                        flex-wrap:wrap;
                                        gap:.45rem;
                                        margin:.75rem 0;
                                    "
                                >

                                    ${
                                        subjects.length
                                            ? subjects
                                                .map(
                                                    subject =>
                                                        `
                                                        <div
                                                            class="sb-subject-dot"
                                                            title="${escapeIdbAttribute(
                                                                subject
                                                            )}"
                                                        >
                                                            ${escapeIdbHtml(
                                                                subject
                                                            )}
                                                        </div>
                                                        `
                                                )
                                                .join('')
                                            : `
                                                <div
                                                    class="sb-subject-dot"
                                                >
                                                    No subjects assigned
                                                </div>
                                            `
                                    }

                                </div>


                                <!-- MINI LEADERBOARD -->

                                <div
                                    class="idb-mini-lb"
                                    id="${miniId}"
                                >

                                    ${
                                        miniLeaderboard ||
                                        `
                                            <div
                                                style="
                                                    padding:.75rem;
                                                    color:var(--text-muted);
                                                    font-size:.8rem;
                                                "
                                            >
                                                No quiz scores yet.
                                            </div>
                                        `
                                    }

                                </div>


                                <!-- METRICS -->

                                <div
                                    class="sb-metrics"
                                >

                                    <div
                                        class="sb-metric"
                                    >

                                        <span
                                            class="sm-val teal"
                                        >
                                            ${average}%
                                        </span>

                                        <span
                                            class="sm-lbl"
                                        >
                                            Formal Avg
                                        </span>

                                    </div>


                                    <div
                                        class="sb-metric"
                                    >

                                        <span
                                            class="sm-val purple"
                                        >
                                            ${average}%
                                        </span>

                                        <span
                                            class="sm-lbl"
                                        >
                                            Informal Avg
                                        </span>

                                    </div>

                                </div>

                            </div>

                        `;

                    }
                )
                .join('');


        console.log(
            'Dynamic student sections rendered:',
            sectionNames
        );


    } catch (error) {

        console.error(
            'Error loading instructor students:',
            error
        );


        container.innerHTML = `

            <div class="empty-state">

                <span class="emoji">
                    ⚠️
                </span>

                <p>
                    Unable to load student sections.
                </p>

            </div>

        `;

    }

}


/* ──────────────────────────────────────
   TEACHING QUALITY ANALYTICS
────────────────────────────────────── */


async function loadIdbTeachingQualityAnalytics() {
 const setMetric=(id,value)=>{
  const number=value==null?null:Number(value);
  const valid=number!==null&&Number.isFinite(number);
  document.getElementById(id).textContent=valid?number.toFixed(1)+'%':'Not evaluated';
  document.getElementById(id+'-bar').style.width=valid?Math.min(100,Math.max(0,number))+'%':'0%';
 };
 try{
  const responses=await Promise.all(['quiz_alignment.php','get_instructor.php'].map(path=>fetch('../assets/php/'+path,{credentials:'same-origin',cache:'no-store'})));
  const [alignment,profile]=await Promise.all(responses.map(response=>response.json()));
  if(responses.some(response=>!response.ok)||!alignment.success||!profile.success)throw Error('Teaching quality unavailable.');
  const instructor=profile.instructor;
  const labels={'SSS+':'Pinnacle','SSS':'Exceptional','SS':'Master','S':'Elite','A':'Excellent','B':'Proficient','C':'Developing','F':'Needs improvement'};
  const grade=labels[instructor.grade]?instructor.grade:null;
  document.getElementById('idb-quality-rank').textContent=grade||'--';
  document.getElementById('idb-quality-rank').dataset.rank=grade||'';
  document.getElementById('idb-quality-rank').classList.add('teaching-rank');
  document.getElementById('idb-quality-rank-label').textContent=grade?labels[grade]:'Not ranked';
  document.querySelector('.tq-grade-badge')?.classList.toggle('is-unranked',!grade);
  document.getElementById('idb-quality-rank-note').textContent=grade?'Rank assigned by your administrator.':'Your administrator has not assigned a grading rank yet.';
  setMetric('idb-syllabus-accuracy',Number(alignment.evaluated_quiz_count)>0?alignment.average_alignment:null);
  setMetric('idb-content-relevance',instructor.course_alignment);
  document.getElementById('idb-quality-evidence').textContent=Number(alignment.evaluated_quiz_count)+' admin-evaluated quizzes / AI suggestions alone do not affect this score.';
 }catch(error){
  setMetric('idb-syllabus-accuracy',null);setMetric('idb-content-relevance',null);
  document.getElementById('idb-quality-evidence').textContent='Unable to load teaching quality. Refresh to retry.';
 }
}

/* =========================================================
   SYLLABUS ALIGNMENT BY SUBJECT
========================================================= */

async function loadIdbSyllabusAlignmentBySubject() {

    const container = document.getElementById(
        'idb-syllabus-subject-list'
    );

    if (!container) return;

    container.innerHTML = '<p>Loading subject analytics...</p>';

    try {

        // 1. Get the instructor's quiz evaluations
        const alignmentResponse = await fetch(
            '../assets/php/quiz_alignment.php',
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            }
        );

        const alignmentResult = await alignmentResponse.json();

        if (!alignmentResponse.ok || !alignmentResult.success) {
            throw new Error(
                alignmentResult.message || 'Unable to load quiz evaluations.'
            );
        }

        const evaluations = Array.isArray(alignmentResult.evaluations)
            ? alignmentResult.evaluations
            : [];

        // 2. Get actual monthly Teaching XP
        let monthlyXP = 0;

        try {

            const instructorResponse = await fetch(
                '../assets/php/get_instructor.php',
                {
                    method: 'GET',
                    credentials: 'same-origin',
                    cache: 'no-store'
                }
            );

            const instructorResult = await instructorResponse.json();

            if (instructorResponse.ok && instructorResult.success) {
                monthlyXP = Number(
                    instructorResult.instructor?.monthly_teaching_xp ?? 0
                );
            }

        } catch (xpError) {

            console.error('Unable to load monthly Teaching XP:', xpError);

        }

        // 3. Get assigned subjects
        const assignments = Array.isArray(idbTeachingAssignments)
            ? idbTeachingAssignments
            : [];

        const subjectMap = new Map();

        assignments.forEach(assignment => {

            const subject = String(
                assignment.subject_name ||
                assignment.subject ||
                ''
            ).trim();

            if (!subject) return;

            const key = subject.toLowerCase();

            if (!subjectMap.has(key)) {
                subjectMap.set(key, {
                    name: subject,
                    sections: []
                });
            }

            const section = String(
                assignment.section ||
                assignment.section_label ||
                ''
            ).trim();

            if (section) {
                const subjectData = subjectMap.get(key);

                if (!subjectData.sections.includes(section)) {
                    subjectData.sections.push(section);
                }
            }

        });

        const subjects = [...subjectMap.values()]
            .sort((a, b) => a.name.localeCompare(b.name));

        // 4. Generate one row per assigned subject
        const subjectRows = subjects.map(subject => {

            const subjectEvaluations = evaluations.filter(evaluation =>
                String(evaluation.subject || '').trim().toLowerCase() ===
                subject.name.toLowerCase()
            );

            const hasEvaluations = subjectEvaluations.length > 0;

            const totalAlignment = subjectEvaluations.reduce(
                (total, evaluation) => {
                    return total + (
                        Number(evaluation.alignment_percentage) || 0
                    );
                },
                0
            );

            const average = hasEvaluations
                ? totalAlignment / subjectEvaluations.length
                : 0;

            const percentage = Math.min(
                100,
                Math.max(0, average)
            );

            // Quality labels and matching existing CSS classes
            let quality = 'Not Evaluated';
            let qualityClass = '';
            let barClass = '';

            if (hasEvaluations) {

                if (percentage >= 95) {
                    quality = 'Excellent';
                    qualityClass = 'sqb-excellent';
                    barClass = 'syl-bf-green';

                } else if (percentage >= 85) {
                    quality = 'Great';
                    qualityClass = 'sqb-great';
                    barClass = 'syl-bf-blue';

                } else if (percentage >= 70) {
                    quality = 'Good';
                    qualityClass = 'sqb-good';
                    barClass = 'syl-bf-purple';

                } else {
                    quality = 'Fair';
                    qualityClass = 'sqb-fair';
                    barClass = 'syl-bf-gold';
                }

            }

            const sectionText = subject.sections.length
                ? subject.sections.join(', ')
                : 'Assigned subject';

            return `
                <div class="syl-row">

                    <div class="syl-row-top">

                        <div>
                            <div class="syl-row-name">
                                ${escapeIdbHtml(subject.name)}
                            </div>

                            <div class="syl-row-prog">
                                ${escapeIdbHtml(sectionText)}
                            </div>
                        </div>

                        <span class="syl-quality-badge ${qualityClass}">
                            ${quality}
                        </span>

                    </div>

                    <div class="syl-bar-track">

                        <div
                            class="syl-bar-fill ${barClass}"
                            style="width:${hasEvaluations ? percentage : 0}%"
                        ></div>

                    </div>

                    <div class="syl-row-footer">

                        <span>
                            ${
                                hasEvaluations
                                    ? `${Math.round(percentage)}% alignment`
                                    : 'No quiz evaluations yet'
                            }
                        </span>

                        <span class="syl-row-xp">
                            ${subjectEvaluations.length} evaluated quiz(es)
                        </span>

                    </div>

                </div>
            `;

        }).join('');

        // 5. Display the results and monthly XP
        container.innerHTML = `

            ${
                subjectRows ||
                '<div class="empty-state dashboard-empty-state" role="status"><span class="emoji">📚</span><p>No assigned subjects found.</p><small class="empty-state-hint">Your syllabus alignment will appear here when teaching assignments load.</small></div>'
            }

            <div class="syl-row-footer syl-monthly-xp">
                <span>Monthly Teaching XP</span>

                <span class="syl-row-xp">
                    ${Math.max(0, monthlyXP).toLocaleString()} XP this month
                </span>
            </div>

        `;

        console.log('SYLLABUS ALIGNMENT BY SUBJECT:', {
            subjects,
            evaluations,
            monthlyXP
        });

    } catch (error) {

        console.error(
            'Error loading syllabus alignment by subject:',
            error
        );

        container.innerHTML = `
            <p class="syl-loading">
                Unable to load subject analytics.
            </p>
        `;

    }

}


/* ACTIVE STUDENTS ROSTER */
async function openIdbActiveRoster() {
    const body = document.getElementById('idb-active-roster-body');
    const count = document.getElementById('idb-active-roster-count');

    if (!body) {
        console.error('Active students modal body is missing.');
        return;
    }

    body.innerHTML = '<p>Loading student roster...</p>';
    if (count) count.textContent = 'Loading...';

    openModal('modal-idb-active-roster');

    try {
        const response = await fetch(
            '../assets/php/get_instructor_students.php',
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Unable to load students.');
        }

        const students = result.students || [];

        if (count) {
            count.textContent = `${students.length} student(s)`;
        }

        if (students.length === 0) {
            body.innerHTML = '<p>No students were found for your assigned sections.</p>';
            return;
        }

        body.innerHTML = `
            <div class="idb-student-card-grid">
                ${result.students.map(student => {
                    const name = student.name ||
                        [student.first_name, student.last_name].filter(Boolean).join(' ') ||
                        'Student';

                    const initials = name
                        .split(/\s+/)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map(part => part.charAt(0).toUpperCase())
                        .join('') || 'S';

                    const studentId = student.student_number ||
                        student.student_id ||
                        student.email || 'No student ID';

                    const program = student.program || 'Program not specified';
                    const year = student.year_level || student.year || '';
                    const block = student.block || '';
                    const section = student.section ||
                        [program, year, block].filter(Boolean).join(' ') ||
                        'Section not specified';

                    const score = Number(student.score ?? student.avg_score ?? 0);
                    const xp = Number(student.xp ?? student.total_xp ?? 0);
                    const submissions = Number(
                        student.submissions ??
                        student.submission_count ??
                        student.submissions_count ?? 0
                    );

                    const safeScore = Number.isFinite(score) ? score : 0;
                    const safeXp = Number.isFinite(xp) ? xp : 0;
                    const safeSubmissions = Number.isFinite(submissions)
                        ? submissions : 0;

                    return `
                        <article class="idb-student-profile-card">
                            <div class="idb-student-card-top">
                                <div class="idb-student-avatar"
                                     aria-label="${idbEscapeHtml(name)}">
                                    ${idbEscapeHtml(initials)}
                                </div>
                                <span class="idb-student-status">
                                    <span class="idb-status-dot"></span>
                                    Registered
                                </span>
                            </div>

                            <div class="idb-student-identity">
                                <h3>${idbEscapeHtml(name)}</h3>
                                <p>ID: ${idbEscapeHtml(studentId)}</p>
                            </div>

                            <div class="idb-student-section">
                                <span class="idb-student-label">CLASS / SECTION</span>
                                <strong>${idbEscapeHtml(section)}</strong>
                            </div>

                            <div class="idb-student-card-stats">
                                <div>
                                    <span>Average score</span>
                                    <strong>${safeScore.toFixed(1)}%</strong>
                                </div>
                                <div>
                                    <span>Total XP</span>
                                    <strong>${safeXp.toLocaleString()}</strong>
                                </div>
                                <div>
                                    <span>Submissions</span>
                                    <strong>${safeSubmissions}</strong>
                                </div>
                            </div>
                        </article>
                    `;
                }).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Unable to load active student roster:', error);
        if (count) count.textContent = 'Could not load';
        body.innerHTML = '<p>Unable to load the student roster. Check the browser console and PHP response.</p>';
    }
}

// Safely escape text before displaying it in HTML
function idbEscapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (char) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[char];
    });
}


/* COMPLETION RATE DETAILS */
function openIdbCompletionDetails() {
    const body = document.getElementById('idb-completion-details-body');

    if (!body) {
        console.error('Completion details modal body is missing.');
        return;
    }

    const stats = idbDashboardStats || {};
    const expected = Number(stats.expected_assignments || 0);
    const completed = Number(stats.completed_assignments || 0);
    const pending = Number(stats.pending_submissions || 0);
    const rate = Number(stats.completion_rate || 0);
    const remaining = Math.max(0, expected - completed);

    body.innerHTML = `
        <div class="idb-completion-metrics">
            <div>
                <span>Expected submissions</span>
                <strong>${expected.toLocaleString()}</strong>
            </div>
            <div>
                <span>Completed submissions</span>
                <strong>${completed.toLocaleString()}</strong>
            </div>
            <div>
                <span>Not yet completed</span>
                <strong>${remaining.toLocaleString()}</strong>
            </div>
            <div>
                <span>Awaiting review</span>
                <strong>${pending.toLocaleString()}</strong>
            </div>
        </div>

        <p style="margin-top:16px">
            Overall completion rate: <strong>${rate.toFixed(1)}%</strong>
        </p>

        ${expected === 0
            ? '<p>No expected submissions were found for your active quizzes.</p>'
            : ''}
    `;

    openModal('modal-idb-completion-details');
}


/* ──────────────────────────────────────
   STUDENT SECTION HELPERS
────────────────────────────────────── */

function normalizeIdbSection(value) {

    return String(
        value || ''
    )
        .trim()
        .toUpperCase()
        .replace(
            /\s+/g,
            ' '
        )
        .replace(
            /^SECTION\s+/,
            ''
        );

}


function getIdbYearLabel(year) {

    switch (
        Number(year)
    ) {

        case 1:
            return '1st Year';

        case 2:
            return '2nd Year';

        case 3:
            return '3rd Year';

        case 4:
            return '4th Year';

        default:

            return year
                ? `${year}th Year`
                : '';

    }

}


function escapeIdbAttribute(value) {

    return String(
        value ?? ''
    )
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        );

}


/* ──────────────────────────────────────
   INIT
────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    await loadIdbDashboardStats();
    await loadIdbTeachingAssignments();
    await loadIdbSyllabusAlignmentBySubject();
    await loadIdbStudentSections();
    await loadIdbTeachingQualityAnalytics();
    await loadIdbLeaderboardData();
    await loadIdbAnnouncements();
    await loadIdbAnnouncementInbox();
    idbRenderSidebarNotifs();
    idbRefreshBadges();
    idbStartDemoEvents();

    /* Wire overlay clicks for new modals (safe retry after DOM settle) */
    setTimeout(() => {
        ['modal-idb-announcements', 'modal-idb-leaderboard'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !el._overlayBound) {
                el._overlayBound = true;
                el.addEventListener('click', function(e) {
                    if (e.target === this) closeModal(id);
                });
            }
        });
    }, 0);
});
