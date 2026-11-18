function adminPageRows(list, host, page, render) {
    const id = host.id + '-pagination';
    document.getElementById(id)?.remove();
    const total = list.length, pages = Math.max(1, Math.ceil(total / 50));
    page = Math.max(1, Math.min(page, pages));
    const offset = (page - 1) * 50;
    const nav = document.createElement('nav'); nav.id = id; nav.className = 'admin-pagination'; nav.setAttribute('aria-label','Table pages');
    const label = document.createElement('span'); label.textContent = total ? `${offset + 1}-${Math.min(offset + 50,total)} of ${total}` : '0 results'; nav.append(label);
    if (pages > 1) for (const [text,target] of [['Previous',page-1],['Next',page+1]]) {
        const button = document.createElement('button'); button.type='button';button.className='btn-secondary';button.textContent=text;button.disabled=target<1||target>pages;button.onclick=()=>render(target);nav.append(button);
    }
    host.after(nav);
    return {rows:list.slice(offset,offset+50),offset};
}

function confirmAccountStatus(name, status) {
    const word = status === 'Active' ? 'ACTIVATE' : 'DEACTIVATE';
    return new Promise(resolve => {
        const dialog = document.createElement('dialog'); dialog.className='account-status-confirm ' + (status === 'Active' ? 'is-activate' : 'is-deactivate');
        dialog.innerHTML='<form method="dialog"><h2></h2><p></p><label for="account-status-word"></label><input id="account-status-word" autocomplete="off" spellcheck="false"><div class="account-status-actions"><button type="button" class="btn-secondary">Cancel</button><button type="submit" class="btn-primary" disabled>Continue</button></div></form>';
        dialog.querySelector('h2').textContent = word === 'ACTIVATE' ? 'Activate account' : 'Deactivate account';
        dialog.querySelector('p').textContent=name;
        dialog.querySelector('label').innerHTML=`Type <strong>${word}</strong> to continue`;
        dialog.querySelector('[type="submit"]').textContent = status === 'Active' ? 'Activate' : 'Deactivate';
        const input=dialog.querySelector('input'),submit=dialog.querySelector('[type="submit"]');
        input.oninput=()=>{submit.disabled=input.value!==word;};
        dialog.querySelector('[type="button"]').onclick=()=>dialog.close();
        dialog.querySelector('form').onsubmit=event=>{event.preventDefault();if(input.value===word)dialog.close(word);};
        dialog.onclose=()=>{const confirmed=dialog.returnValue===word;dialog.remove();resolve(confirmed?word:null);};
        document.body.append(dialog);dialog.showModal();input.focus();
    });
}

/* ═══════════════════════════════════════════════════════════════
   admin.js — Admin dashboard data & rendering
   Depends on: main.js  (showToast, showConfirm, closeConfirm,
                          openModal, closeModal, navigateTo, logout)
   ═══════════════════════════════════════════════════════════════ */


/* ── LEVEL SYSTEM ───────────────────────────────────────────── */
const XP_THRESHOLDS = [0, 300, 700, 1200, 2000, 3000, 4500, 6500];

function getLevel(xp) {
    let lvl = 1;
    for (let i = 1; i < XP_THRESHOLDS.length; i++) {
        if (xp >= XP_THRESHOLDS[i]) lvl = i + 1;
        else break;
    }
    return lvl;
}

function getLevelLabel(xp) {
    const lvl = getLevel(xp);
    const labels = ['', 'Rookie', 'Apprentice', 'Scholar', 'Battle Ready', 'Battle Veteran', 'Battle Master', 'Champion', 'GABLE Master'];
    return { lvl, label: labels[lvl] };
}


/* ── LIVE ACTIVITY FEED ─────────────────────────────────────── */
let activityFeed = [];

function logActivity(icon, text) {
    activityFeed.unshift({ icon, text, time: Date.now(), local: true });
    if (activityFeed.length > 50) activityFeed.pop(); // cap at 50
    // re-render feed if overview is visible
    const overview = document.getElementById('panel-overview');
    if (overview && overview.classList.contains('active')) {
        renderActivityFeed();
    }
}

function timeAgo(ts) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function renderActivityFeed() {
    const el = document.getElementById('activity-list');
    if (!el) return;
    const recent = activityFeed.slice(0, 12);
    if (!recent.length) {
        el.innerHTML = overviewPlaceholder('activity', 'No recent activity', 'Activity will appear here as the platform is used.');
        return;
    }
    el.innerHTML = recent.map(a => `
    <div style="display:flex;align-items:flex-start;gap:.75rem;padding:.65rem 0;border-bottom:1px solid rgba(255,255,255,.06)">
      <span style="font-size:1rem;flex-shrink:0">${a.icon}</span>
      <div style="flex:1">
        <div style="font-size:.82rem">${a.text}</div>
        <div style="font-size:.72rem;color:var(--text-muted)">${timeAgo(a.time)}</div>
      </div>
    </div>`).join('');
}

function overviewPlaceholder(icon, title, detail) {
    return `<div class="overview-placeholder"><i data-lucide="${icon}" aria-hidden="true"></i><strong>${title}</strong><span>${annEscape(detail)}</span></div>`;
}

// Refresh time-ago labels every 30s while page is open
setInterval(() => {
    if (document.getElementById('panel-overview')?.classList.contains('active')) {
        renderActivityFeed();
    }
}, 30000);


/* ── ANNOUNCEMENT HISTORY ───────────────────────────────────── */
let announcementHistory = [];

async function recordAnnouncement(title, body, target, priority) {

    // Convert UI values to database values
    const targetMap = {
        'All Users': 'all',
        'Students Only': 'students',
        'Instructors Only': 'instructors'
    };

    const priorityMap = {
        'Normal': 'normal',
        'Important': 'important',
        'Urgent': 'urgent'
    };

    const dbTarget = targetMap[target];
    const dbPriority = priorityMap[priority];

    if (!dbTarget) {
    console.error('Invalid target:', target);
    showToast('❌', 'Invalid announcement target.');
    return;
}

if (!dbPriority) {
    console.error('Invalid priority:', priority);
    showToast('❌', 'Invalid announcement priority.');
    return;
}

    try {

        const response = await fetch('../assets/php/send_announcement.php', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        title: title,
        message: body,
        target: dbTarget,
        priority: dbPriority
    })
});

        const result = await response.json();

        if (!result.success) {
            showToast('❌', result.message || 'Failed to send announcement.');
            return;
        }

        // Reload the saved history from the database (newest first)
        const settings = document.getElementById('panel-settings');

        if (settings?.classList.contains('active')) {
            loadAnnouncementHistory(1);
        }

        showToast('📢', `Announcement sent to ${target}!`);

    } catch (error) {

        console.error('Announcement error:', error);

        showToast(
            '❌',
            'Could not connect to the server.'
        );
    }
}

function addStudentNotification(announcement) {

    let notifications =
        JSON.parse(localStorage.getItem('studentNotifications')) || [];

    notifications.unshift(announcement);

    localStorage.setItem(
        'studentNotifications',
        JSON.stringify(notifications)
    );
}

function addInstructorNotification(announcement) {

    let notifications =
        JSON.parse(localStorage.getItem('instructorNotifications')) || [];

    notifications.unshift(announcement);

    localStorage.setItem(
        'instructorNotifications',
        JSON.stringify(notifications)
    );
}

function getPriorityClass(priority) {

    switch (priority) {
        case 'Urgent':
            return 'sb-flagged';

        case 'Important':
            return 'sb-pending';

        default:
            return 'sb-active';
    }
}

const annHistState = { page: 1, perPage: 10, pages: 1, total: 0, items: [], loading: false, error: null };

const ANN_TARGET_LABELS = { all: 'All Users', students: 'Students Only', instructors: 'Instructors Only' };
const ANN_PRIORITY_LABELS = { normal: 'Normal', important: 'Important', urgent: 'Urgent' };

function annEscape(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
}

function annFormatDate(value) {
    if (!value) return '—';
    const d = new Date(String(value).replace(' ', 'T'));
    if (isNaN(d.getTime())) return annEscape(value);
    return d.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

async function loadAnnouncementHistory(page) {
    if (annHistState.loading) return;
    annHistState.loading = true;
    annHistState.error = null;
    if (page) annHistState.page = page;
    renderAnnouncementHistory();

    try {
        const response = await fetch(
            `../assets/php/get_announcement_history.php?page=${annHistState.page}&per_page=${annHistState.perPage}`,
            { credentials: 'same-origin', cache: 'no-store' }
        );
        const data = await response.json();
        if (!response.ok || !data.success) {
            throw new Error(data.message || `Server error: ${response.status}`);
        }
        annHistState.items = data.items || [];
        annHistState.page = data.page;
        annHistState.pages = data.pages;
        annHistState.total = data.total;
    } catch (error) {
        console.error('Failed to load announcement history:', error);
        annHistState.error = error.message || 'Could not load announcement history.';
    } finally {
        annHistState.loading = false;
        renderAnnouncementHistory();
    }
}

function renderAnnouncementHistory() {

    const el = document.getElementById('ann-history-list');
    const countEl = document.getElementById('ann-hist-count');

    if (!el) return;

    if (countEl) {
        countEl.textContent = annHistState.total ? `${annHistState.total} sent` : '';
    }

    if (annHistState.loading) {
        el.innerHTML = '<div class="empty-state"><p>Loading announcement history…</p></div>';
        return;
    }

    if (annHistState.error) {
        el.innerHTML = `
            <div class="empty-state">
                <span class="emoji">⚠️</span>
                <p>${annEscape(annHistState.error)}</p>
                <button class="btn-sm" style="margin-top:.6rem" onclick="loadAnnouncementHistory()">Try again</button>
            </div>`;
        return;
    }

    if (!annHistState.items.length) {
        el.innerHTML = `
            <div class="empty-state">
                <span class="emoji">📭</span>
                <p>No announcements sent yet.</p>
            </div>
        `;
        return;
    }

    const rows = annHistState.items.map(a => {
        const priority = ANN_PRIORITY_LABELS[a.priority] || 'Normal';
        const target = ANN_TARGET_LABELS[a.target] || a.target;
        const pc = getPriorityClass(priority);
        return `
            <div class="ann-hist-row">
                <div style="flex:1;min-width:0">
                    <div style="font-size:.88rem;font-weight:700;margin-bottom:.2rem;">${annEscape(a.title)}</div>
                    <div style="font-size:.75rem;color:var(--text-muted);margin-bottom:.45rem;white-space:pre-wrap;word-break:break-word;">${annEscape(a.message)}</div>
                    <div style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap;">
                        <span class="status-badge ${pc}">${annEscape(priority)}</span>
                        <span style="font-size:.7rem;color:var(--text-muted);">→ ${annEscape(target)}</span>
                        <span style="font-size:.7rem;color:var(--text-muted);">${annFormatDate(a.created_at)}</span>
                        <span style="font-size:.7rem;color:var(--text-muted);">by ${a.sender ? annEscape(a.sender) : 'Admin (not recorded)'}</span>
                    </div>
                </div>
            </div>`;
    }).join('');

    const pager = annHistState.pages > 1 ? `
        <div style="display:flex;align-items:center;justify-content:center;gap:.75rem;margin-top:1rem;">
            <button class="btn-sm" ${annHistState.page <= 1 ? 'disabled' : ''} onclick="loadAnnouncementHistory(${annHistState.page - 1})">← Previous</button>
            <span style="font-size:.75rem;color:var(--text-muted)">Page ${annHistState.page} of ${annHistState.pages}</span>
            <button class="btn-sm" ${annHistState.page >= annHistState.pages ? 'disabled' : ''} onclick="loadAnnouncementHistory(${annHistState.page + 1})">Next →</button>
        </div>` : '';

    el.innerHTML = rows + pager;
}


/* ── DATA ───────────────────────────────────────────────────── */
let users = [];
const collegePrograms = {
    "College of Engineering": [
        "BSCE",
        "BSME",
        "BSEE"
    ],

    "College of Information Technology": [
        "BSIT",
        "BSCS",
        "BSIS"
    ],

    "College of Education": [
        "BEEd",
        "BSEd"
    ],

    "College of Business": [
        "BSBA",
        "BSA"
    ],

    "College of Arts and Sciences": [
        "BS Psych",
        "BA Communication"
    ]
};

const addCollege = document.getElementById('add-college');
const addProgram = document.getElementById('add-program');

if (addCollege && addProgram) {

    addCollege.addEventListener('change', function () {

        const selectedCollege = this.value;

        // Always clear existing programs
        addProgram.innerHTML = '';

        // No college selected
        if (!selectedCollege) {

            addProgram.disabled = true;

            addProgram.innerHTML = `
                <option value="">
                    Select a college first
                </option>
            `;

            return;
        }

        // Get programs belonging ONLY to this college
        const programs = collegePrograms[selectedCollege];

        // College has no registered programs
        if (!Array.isArray(programs) || programs.length === 0) {

            addProgram.disabled = true;

            addProgram.innerHTML = `
                <option value="">
                    No programs available
                </option>
            `;

            return;
        }

        // Enable program dropdown
        addProgram.disabled = false;

        // Default option
        addProgram.innerHTML = `
            <option value="">
                Select Program
            </option>
        `;

        // Add ONLY programs defined in collegePrograms
        programs.forEach(program => {

            // Extra protection against Program 0
            if (
                !program ||
                program === '0' ||
                program === 0 ||
                program === 'Program 0'
            ) {
                return;
            }

            const option = document.createElement('option');

            option.value = program;
            option.textContent = program;

            addProgram.appendChild(option);

        });

    });

}




let instructors = [];

let adminQuizzes = [];

let flaggedQuizzes = [];

async function loadAdminQuizzesFromDatabase() {

    try {

        const response = await fetch(
            '../assets/php/get_admin_quizzes.php',
            {
                credentials: 'include'
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || 'Failed to load quizzes.'
            );
        }

        adminQuizzes = data.quizzes || [];
        const subjectFilter = document.getElementById('quiz-subject-filter');
const instructorFilter = document.getElementById('quiz-instructor-filter');

if (subjectFilter) {
    const selectedSubject = subjectFilter.value;

    const subjects = [...new Set(
        adminQuizzes
            .map(quiz => (quiz.subject || '').trim())
            .filter(subject => subject !== '')
    )].sort();

    subjectFilter.innerHTML = '<option value="">All Subjects</option>';

    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectFilter.appendChild(option);
    });

    subjectFilter.value = subjects.includes(selectedSubject)
        ? selectedSubject
        : '';
}

if (instructorFilter) {
    const selectedInstructor = instructorFilter.value;

    const instructors = [...new Set(
        adminQuizzes
            .map(quiz => (quiz.instructor || '').trim())
            .filter(instructor => instructor !== '')
    )].sort();

    instructorFilter.innerHTML = '<option value="">All Instructors</option>';

    instructors.forEach(instructor => {
        const option = document.createElement('option');
        option.value = instructor;
        option.textContent = instructor;
        instructorFilter.appendChild(option);
    });

    instructorFilter.value = instructors.includes(selectedInstructor)
        ? selectedInstructor
        : '';
}


const collegeFilter = document.getElementById('quiz-college-filter');

if (collegeFilter) {
    const selectedCollege = collegeFilter.value;

    try {
        const collegeResponse = await fetch(
            '../assets/php/get_admin_colleges.php',
            {
                credentials: 'include',
                cache: 'no-store'
            }
        );

        const collegeData = await collegeResponse.json();

        if (!collegeResponse.ok || !collegeData.success) {
            throw new Error(
                collegeData.message || 'Failed to load colleges.'
            );
        }

        const colleges = collegeData.colleges || [];

        collegeFilter.innerHTML = '<option value="">All Colleges</option>';

        colleges.forEach(college => {
            const option = document.createElement('option');
            option.value = college;
            option.textContent = college;
            collegeFilter.appendChild(option);
        });

        collegeFilter.value = colleges.includes(selectedCollege)
            ? selectedCollege
            : '';

    } catch (error) {
        console.error('Load colleges error:', error);
    }
}


        renderAdminQuizzes(adminQuizzes);

    } catch (error) {

        console.error(
            'Load admin quizzes error:',
            error
        );

        adminQuizzes = [];

        renderAdminQuizzes(adminQuizzes);
    }
}

const collegePerf = [];

const redemptions = [

];

const avatarColors = ['#7c5cbf', '#e05ca0', '#4f8ef7', '#f97316', '#4ade80', '#f59e0b', '#a57fe0', '#f47fc4'];


/* ── LIVE LEADERBOARDS ───────────────────────────────────────── */
let lbView = 'students'; // students | instructors | colleges
let lbData = { students: [], instructors: [], colleges: [] };
let lbLoaded = false;
let lbLoading = false;

function lbEscape(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

async function loadLeaderboardData(force = false) {
    if (lbLoading) return;
    if (lbLoaded && !force) return;
    lbLoading = true;
    const el = document.getElementById('leaderboard-content');
    if (el) el.innerHTML = '<div class="empty-state"><span class="emoji">⏳</span><p>Loading live leaderboard data…</p></div>';
    try {
        const response = await fetch('../assets/php/get_admin_leaderboards.php', {
            method: 'GET', credentials: 'include', cache: 'no-store'
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load leaderboard data.');
        lbData = {
            students: Array.isArray(data.students) ? data.students : [],
            instructors: Array.isArray(data.instructors) ? data.instructors : [],
            colleges: Array.isArray(data.colleges) ? data.colleges : []
        };
        lbLoaded = true;
        populateLeaderboardFilters();
        renderLeaderboard();
    } catch (error) {
        console.error('Leaderboard load failed:', error);
        if (el) el.innerHTML = `<div class="empty-state"><span class="emoji">⚠️</span><p>Could not load leaderboard data.</p><small>${lbEscape(error.message)}</small><br><button class="btn-secondary" onclick="loadLeaderboardData(true)">Try again</button></div>`;
    } finally {
        lbLoading = false;
    }
}

function populateLeaderboardFilters() {
    const collegeSelect = document.getElementById('lb-college-filter');
    const sectionSelect = document.getElementById('lb-section-filter');
    const oldCollege = collegeSelect?.value || '';
    const oldSection = sectionSelect?.value || '';
    const colleges = [...new Set([
        ...lbData.students.map(x => x.college),
        ...lbData.instructors.map(x => x.college),
        ...lbData.colleges.map(x => x.college)
    ].map(x => String(x || '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
    if (collegeSelect) {
        collegeSelect.innerHTML = '<option value="">All Colleges</option>' + colleges.map(c=>`<option value="${lbEscape(c)}">${lbEscape(c)}</option>`).join('');
        collegeSelect.value = colleges.includes(oldCollege) ? oldCollege : '';
    }
    const sectionRows = lbView === 'instructors'
        ? lbData.instructors.flatMap(i => (i.sections || []).map(section => ({section, college:i.college})))
        : lbData.students.map(s => ({section:s.section, college:s.college}));
    const selectedCollege = collegeSelect?.value || '';
    const sections = [...new Set(sectionRows.filter(x => !selectedCollege || x.college === selectedCollege).map(x => String(x.section || '').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
    if (sectionSelect) {
        sectionSelect.innerHTML = '<option value="">All Sections</option>' + sections.map(x=>`<option value="${lbEscape(x)}">${lbEscape(x)}</option>`).join('');
        sectionSelect.value = sections.includes(oldSection) ? oldSection : '';
        sectionSelect.style.display = lbView === 'colleges' ? 'none' : '';
    }
    if (collegeSelect) collegeSelect.style.display = '';
}

function setLbView(view, btn) {
    lbView = view;
    document.querySelectorAll('#panel-leaderboard .fpill').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    populateLeaderboardFilters();
    renderLeaderboard();
}

function renderLeaderboard(page = 1) {
    const el = document.getElementById('leaderboard-content');
    if (!el) return;
    if (!lbLoaded) { loadLeaderboardData(); return; }
    const collegeFilter = document.getElementById('lb-college-filter')?.value || '';
    const sectionFilter = document.getElementById('lb-section-filter')?.value || '';
    el.dataset.view = lbView;
    const rankMark = i => i < 3
        ? `<i data-lucide="medal" aria-label="Rank ${i + 1}"></i>`
        : `#${i + 1}`;

    document.getElementById(el.id + '-pagination')?.remove();
    if (lbView === 'students') {
        let list = lbData.students.filter(s => (!collegeFilter || s.college === collegeFilter) && (!sectionFilter || s.section === sectionFilter));
        list.sort((a,b) => Number(b.xp)-Number(a.xp) || (Number(b.average_score ?? -1)-Number(a.average_score ?? -1)) || String(a.name).localeCompare(String(b.name)));
        const paged = adminPageRows(list, el, page, renderLeaderboard); list = paged.rows;
        el.innerHTML = `<div class="lb-header-row"><span class="lb-col-rank">Rank</span><span class="lb-col-name">Student</span><span class="lb-col-mid">College</span><span class="lb-col-mid">Section</span><span class="lb-col-xp">XP</span></div>` +
            (list.length ? list.map((s,i) => {
                i += paged.offset;
                const {lvl,label} = getLevelLabel(Number(s.level_xp)||0);
                const initials = String(s.name||'?').split(/\s+/).filter(Boolean).map(n=>n[0]).slice(0,2).join('').toUpperCase();
                return `<div class="lb-row ${i<3?'lb-row-top':''} ${i===0?'lb-row-gold':i===1?'lb-row-silver':i===2?'lb-row-bronze':''}"><span class="lb-col-rank lb-rank">${rankMark(i)}</span><div class="lb-col-name cell-user"><div class="u-avatar" title="Level ${lvl} - ${label}" style="background:linear-gradient(135deg,#4f8ef7,#7c5cbf);width:36px;height:36px;font-size:.78rem">${lbEscape(initials)}</div><div><div class="u-name">${lbEscape(s.name)}</div><div class="u-id">${lbEscape(s.student_number || s.student_id)}</div></div></div><span class="lb-col-mid" style="font-size:.82rem;color:var(--text-muted)">${lbEscape(s.college||'—')}</span><span class="lb-col-mid">${lbEscape(s.section||'Unassigned')}</span><span class="lb-col-xp xp-cell">⭐${(Number(s.xp)||0).toLocaleString()}<br><small class="student-level student-level-${lvl}">Level ${lbEscape(lvl)} - ${lbEscape(label)}</small></span></div>`;
            }).join('') : '<div class="empty-state"><span class="emoji">🏆</span><p>No students match these filters.</p></div>');
    } else if (lbView === 'instructors') {
        let list = lbData.instructors.filter(i => (!collegeFilter || i.college === collegeFilter) && (!sectionFilter || (i.sections||[]).includes(sectionFilter)));
        list.sort((a,b) => Number(b.teaching_exp)-Number(a.teaching_exp) || String(a.name).localeCompare(String(b.name)));
        const paged = adminPageRows(list, el, page, renderLeaderboard); list = paged.rows;
        el.innerHTML = `<div class="lb-header-row"><span class="lb-col-rank">Rank</span><span class="lb-col-name">Instructor</span><span class="lb-col-mid">College</span><span class="lb-col-mid">Section(s)</span><span class="lb-col-xp">Teaching EXP</span></div>` +
            (list.length ? list.map((i,n) => {
                n += paged.offset;
                const initials = String(i.name||'?').replace(/^(Dr\.|Prof\.)\s*/i,'').split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase();
                return `<div class="lb-row ${n<3?'lb-row-top':''} ${n===0?'lb-row-gold':n===1?'lb-row-silver':n===2?'lb-row-bronze':''}"><span class="lb-col-rank lb-rank">${rankMark(n)}</span><div class="lb-col-name cell-user"><div class="u-avatar" style="background:${avatarColors[n%avatarColors.length]};width:36px;height:36px;font-size:.78rem">${lbEscape(initials)}</div><div><div class="u-name">${lbEscape(i.name)}</div><div class="u-id">${lbEscape(i.instructor_number || i.instructor_id)} ? <span class="teaching-rank" data-rank="${lbEscape(i.grade || '')}">${lbEscape(i.grade || 'Not ranked')}</span></div></div></div><span class="lb-col-mid" style="font-size:.82rem;color:var(--text-muted)">${lbEscape(i.college||'—')}</span><span class="lb-col-mid">${lbEscape((i.sections||[]).join(', ') || 'No section assigned')}</span><span class="lb-col-xp xp-cell">⭐${(Number(i.teaching_exp)||0).toLocaleString()} EXP</span></div>`;
            }).join('') : '<div class="empty-state"><span class="emoji">🎓</span><p>No instructors match these filters.</p></div>');
    } else {
        let list = lbData.colleges.filter(c => !collegeFilter || c.college === collegeFilter);
        list.sort((a,b) => (b.average_score == null ? -1 : Number(b.average_score)) - (a.average_score == null ? -1 : Number(a.average_score)) || Number(b.students)-Number(a.students));
        el.innerHTML = `<div class="lb-header-row"><span class="lb-col-rank">Rank</span><span class="lb-col-name">College</span><span class="lb-col-mid">Students</span><span class="lb-col-mid">Instructors</span><span class="lb-col-mid">Scored attempts</span><span class="lb-col-xp">Overall rating</span></div>` +
            (list.length ? list.map((c,i) => `<div class="lb-row ${i<3?'lb-row-top':''} ${i===0?'lb-row-gold':i===1?'lb-row-silver':i===2?'lb-row-bronze':''}"><span class="lb-col-rank lb-rank">${rankMark(i)}</span><div class="lb-col-name"><div class="u-name">${lbEscape(c.college)}</div><div class="u-id">${(Number(c.total_xp)||0).toLocaleString()} XP recorded</div></div><span class="lb-col-mid">${Number(c.students)||0}</span><span class="lb-col-mid">${Number(c.instructors)||0}</span><span class="lb-col-mid">${Number(c.scored_attempts)||0}</span><span class="lb-col-xp xp-cell">${c.average_score == null ? 'N/A' : `${Number(c.average_score).toFixed(2)}%`}<br><small>Average quiz score</small></span></div>`).join('') : '<div class="empty-state"><span class="emoji">🏫</span><p>No college data matches this selection.</p></div>') + `<p style="font-size:.78rem;color:var(--text-muted);margin-top:1rem">Rating is the average of recorded scored quiz attempts for students in each college. Colleges without scored attempts show N/A. It is not an instructor evaluation or a term-filtered rating.</p>`;
    }
}

/* ── TABS ───────────────────────────────────────────────────── */
function switchTab(tab) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  const map = { overview:0, users:1, instructors:2, quizzes:3, reports:4, leaderboard:5, settings:6 };
  document.querySelectorAll('.nav-tab')[map[tab]].classList.add('active');
  document.getElementById('panel-' + tab).classList.add('active');
  const renders = {
    overview:     refreshOverview,
    users:        () => renderUsers(users),
    instructors:  () => renderInstructors(instructors),
    quizzes:      () => renderAdminQuizzes(adminQuizzes),
    reports:      renderReports,
    leaderboard:  renderLeaderboard,
    settings:     renderSettingsExtras,
  };
  if (renders[tab]) renders[tab]();
}


/* ── OVERVIEW ───────────────────────────────────────────────── */
function renderOverview() {
  const perfEl = document.getElementById('college-perf-list');
  const flagEl = document.getElementById('flagged-list');

  // College performance bars
  if (perfEl) {
    if (overviewState.error) {
      perfEl.innerHTML = overviewPlaceholder('chart-no-axes-column-increasing', 'Performance data unavailable', overviewState.error);
    } else if (!overviewState.loaded) {
      perfEl.innerHTML = overviewPlaceholder('loader-circle', 'Loading performance data', 'Please wait while college metrics load.');
    } else if (!collegePerf.length) {
      perfEl.innerHTML = overviewPlaceholder('school', 'No college data yet', 'College metrics will appear here once available.');
    } else {
      perfEl.innerHTML = collegePerf.map(c => `
    <div style="margin-bottom:.85rem">
      <div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:.35rem">
        <span style="font-weight:600">${annEscape(c.name)}</span>
        <span style="color:var(--text-muted)">${c.avg == null ? 'No scores yet' : 'Avg ' + c.avg + '%'} &bull; ${Number(c.xp || 0).toLocaleString()} XP</span>
      </div>
      <div class="prog-track"><div class="prog-fill" style="width:${Math.max(0, Math.min(100, Number(c.avg) || 0))}%;background:${c.color};border-radius:99px"></div></div>
    </div>`).join('');
    }
  }

  renderActivityFeed();

  // Flagged quizzes (pending flags saved in the database)
  if (flagEl) {
    if (overviewState.error) {
      flagEl.innerHTML = `<div class="empty-state"><span class="emoji">⚠️</span><p>${annEscape(overviewState.error)}</p></div>`;
    } else if (!overviewState.loaded) {
      flagEl.innerHTML = '<div class="empty-state"><p>Loading…</p></div>';
    } else {
      flagEl.innerHTML = flaggedQuizzes.length
        ? flaggedQuizzes.map((f, i) => {
            return `
    <div class="flagged-card">
      <div class="flagged-icon">⚠️</div>
      <div class="flagged-info">
        <h4>${annEscape(f.title)}</h4>
        <p>${annEscape(f.instructor || 'Unknown instructor')}${f.reason ? ' &bull; ' + annEscape(f.reason) : ''}</p>
      </div>
      <div class="flagged-btns">
        <button class="btn-sm btn-sm-view"   onclick="reviewFlaggedQuiz(${i})">Review</button>
        <button class="btn-sm btn-sm-ok"     onclick="resolveFlagged(${i})">Resolve</button>
        <span class="status-badge sb-flagged">${f.count} flag${f.count > 1 ? 's' : ''}</span>
      </div>
    </div>`;
          }).join('')
        : '<div class="empty-state"><span class="emoji">✅</span><p>No flagged quizzes. All clear!</p></div>';
    }
  }
}

/* ── OVERVIEW DATA (from the database) ──────────────────────── */
const overviewState = { loaded: false, error: null, loading: false };

function setOverviewText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

async function loadAdminOverview() {
  if (overviewState.loading) return;
  overviewState.loading = true;

  try {
    const response = await fetch('../assets/php/get_admin_overview.php', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || `Server error: ${response.status}`);
    }

    const m = data.metrics || {};
    setOverviewText('ov-students', Number(m.students || 0).toLocaleString());
    setOverviewText('ov-instructors', Number(m.instructors || 0).toLocaleString());
    setOverviewText('ov-instructors-sub', `across ${Number(m.instructor_colleges || 0)} college${Number(m.instructor_colleges) === 1 ? '' : 's'}`);
    setOverviewText('ov-quizzes', Number(m.active_quizzes || 0).toLocaleString());
    setOverviewText('ov-quizzes-sub', `${Number(m.formal_quizzes || 0)} formal + ${Number(m.informal_quizzes || 0)} informal`);
    setOverviewText('ov-quizzes-trend', Number(m.quizzes_week) > 0 ? `+${m.quizzes_week} this week` : '');
    setOverviewText('ov-xp', Number(m.total_xp || 0).toLocaleString());
    setOverviewText('ov-xp-trend', Number(m.xp_week) > 0 ? `+${Number(m.xp_week).toLocaleString()} this week` : '');

    collegePerf.length = 0;
    (data.colleges || []).forEach((c, i) => collegePerf.push({
      name: c.name,
      avg: c.avg,
      xp: c.xp,
      color: avatarColors[i % avatarColors.length]
    }));

    // Recent activity: database events first; anything logged this session stays on top.
    const sessionOnly = activityFeed.filter(a => a.local);
    activityFeed = sessionOnly.concat((data.activity || []).map(a => ({
      icon: a.icon,
      text: annEscape(a.text),
      time: Number(a.time) * 1000
    })));

    flaggedQuizzes = (data.flagged || []).map(f => ({
      quizId: f.quiz_id,
      title: f.title,
      instructor: f.instructor,
      reason: f.reason,
      count: f.count
    }));

    overviewState.loaded = true;
    overviewState.error = null;
  } catch (error) {
    console.error('Failed to load overview:', error);
    overviewState.error = 'Could not load overview data. ' + (error.message || '');
  } finally {
    overviewState.loading = false;
    renderOverview();
  }
}

function refreshOverview() {
  renderOverview();
  loadAdminOverview();
}

function reviewFlaggedQuiz(i) {
  const f = flaggedQuizzes[i];
  if (!f) return;
  // Looked up at click time so it works even if the quiz list finished loading later.
  let qi = adminQuizzes.findIndex(q => Number(q.quiz_id ?? q.id) === Number(f.quizId));
  if (qi < 0) qi = adminQuizzes.findIndex(q => q.title === f.title);
  viewQuiz(qi);
}

async function resolveFlagged(i) {
  const flagged = flaggedQuizzes[i];
  if (!flagged) return;

  try {
    const response = await fetch('../assets/php/admin_resolve_flags.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_id: flagged.quizId })
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Could not resolve the flags.');
    }

    flaggedQuizzes.splice(i, 1);
    renderOverview();
    logActivity('✅', `"${annEscape(flagged.title)}" flags resolved by Admin`);
    showToast('✅', 'Quiz resolved and unflagged.');
  } catch (error) {
    console.error('Resolve flags failed:', error);
    showToast('❌', error.message || 'Could not resolve the flags.');
  }
}


/* ── USERS ──────────────────────────────────────────────────── */
function renderUsers(list, page = 1) {
    const el = document.getElementById('users-table-body');

    if (!el) return;

    const sourceRows = list;
    list = adminPageRows(list, el, page, next => renderUsers(sourceRows, next)).rows;
    if (!list.length) {
        el.innerHTML = `
            <div class="empty-state">
                <span class="emoji">🔍</span>
                <p>No users found.</p>
            </div>
        `;
        return;
    }

    el.innerHTML = list.map((u, i) => {
        const { lvl, label } = getLevelLabel(u.level_xp ?? u.xp);

        // Find the student's actual position in the master users array
        const userIndex = users.findIndex(
            student => student.student_id === u.student_id
        );

        return `
        <div class="a-table-row users-row">

            <div class="cell-user">
                <div
                    class="u-avatar"
                    style="background:${avatarColors[i % avatarColors.length]}"
                >
                    ${u.name
                        .split(' ')
                        .filter(Boolean)
                        .map(n => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                </div>

                <div>
                    <div class="u-name">${annEscape(u.name)}</div>
                    <div class="u-id">${annEscape(u.id)}</div>
                </div>
            </div>

            <div class="cell-muted">${annEscape(u.program)}</div>

            <div class="cell">${annEscape(u.section)}</div>

            <div class="xp-cell">
                ⭐ ${u.xp.toLocaleString()}
            </div>

            <div>
                <span
                    class="lb-level-badge lb-level-sm"
                    title="${label}"
                >
                    Lv.${lvl}
                </span>
            </div>

            <div>
                <span class="status-badge ${
                    u.status === 'Active'
                        ? 'sb-active'
                        : 'sb-inactive'
                }">
                    ${annEscape(u.status)}
                </span>
            </div>

            <div style="display:flex;gap:.4rem">

                <button
                    class="btn-sm btn-sm-view"
                    onclick="viewUser(${userIndex})"
                >
                    View
                </button>

                <button
                    class="btn-sm btn-sm-danger"
                    onclick="toggleUserStatus(${userIndex})"
                >
                    ${u.status === 'Active'
                        ? 'Deactivate'
                        : 'Activate'}
                </button>

            </div>

        </div>
        `;
    }).join('');
}

function filterUsers() {

    const q =
        document
            .getElementById('user-search')
            .value
            .trim()
            .toLowerCase();

    const college =
        document.getElementById(
            'user-college-filter'
        ).value;

    const program =
        document.getElementById(
            'user-program-filter'
        ).value;

    const section =
        document.getElementById(
            'user-section-filter'
        ).value;

    const status =
        document.getElementById(
            'user-status-filter'
        ).value;


    let list = users;


    /* SEARCH */
    if (q) {

        list = list.filter(u =>

            u.name
                .toLowerCase()
                .includes(q)

            ||

            String(u.id)
                .toLowerCase()
                .includes(q)

        );

    }


    /* COLLEGE */
    if (college) {

        list = list.filter(
            u => u.college === college
        );

    }


    /* PROGRAM */
    if (program) {

        list = list.filter(
            u => u.program === program
        );

    }


    /* SECTION / BLOCK */
    if (section) {

        list = list.filter(
            u => u.section === section
        );

    }


    /* STATUS */
    if (status) {

        list = list.filter(
            u => u.status === status
        );

    }


    renderUsers(list);
}

function populateUserFilters() {

    populateCollegeFilter();

    updateProgramFilter();

    updateSectionFilter();
}


/* ─────────────────────────────────────────────
   COLLEGE FILTER
───────────────────────────────────────────── */

function populateCollegeFilter() {

    const select =
        document.getElementById(
            'user-college-filter'
        );

    if (!select) return;


    const colleges = [
        ...new Set(

            users
                .map(u => u.college)
                .filter(Boolean)

        )
    ].sort();


    select.innerHTML =
        '<option value="">All Colleges</option>';


    colleges.forEach(college => {

        const option =
            document.createElement('option');

        option.value = college;
        option.textContent = college;

        select.appendChild(option);

    });
}


/* ─────────────────────────────────────────────
   PROGRAM FILTER
───────────────────────────────────────────── */

function updateProgramFilter() {

    const college =
        document.getElementById(
            'user-college-filter'
        ).value;

    const select =
        document.getElementById(
            'user-program-filter'
        );

    if (!select) return;


    let filteredUsers = users;


    /*
     * If a college is selected,
     * only show programs belonging
     * to that college.
     */

    if (college) {

        filteredUsers =
            users.filter(
                u => u.college === college
            );

    }


    const programs = [
        ...new Set(

            filteredUsers
                .map(u => u.program)
                .filter(Boolean)

        )
    ].sort();


    select.innerHTML =
        '<option value="">All Programs</option>';


    programs.forEach(program => {

        const option =
            document.createElement('option');

        option.value = program;
        option.textContent = program;

        select.appendChild(option);

    });


    updateSectionFilter();

}


/* ─────────────────────────────────────────────
   SECTION FILTER
───────────────────────────────────────────── */

function updateSectionFilter() {

    const college =
        document.getElementById(
            'user-college-filter'
        ).value;

    const program =
        document.getElementById(
            'user-program-filter'
        ).value;

    const select =
        document.getElementById(
            'user-section-filter'
        );

    if (!select) return;


    let filteredUsers = users;


    if (college) {

        filteredUsers =
            filteredUsers.filter(
                u => u.college === college
            );

    }


    if (program) {

        filteredUsers =
            filteredUsers.filter(
                u => u.program === program
            );

    }


    const sections = [
        ...new Set(

            filteredUsers
                .map(u => u.section)
                .filter(Boolean)

        )
    ].sort();


    select.innerHTML =
        '<option value="">All Sections</option>';


    sections.forEach(section => {

        const option =
            document.createElement('option');

        option.value = section;
        option.textContent =
            `Section ${section}`;

        select.appendChild(option);

    });

}


/* ─────────────────────────────────────────────
   COLLEGE CHANGED
───────────────────────────────────────────── */

function onCollegeFilterChange() {

    /*
     * Changing college resets program
     * and section.
     */

    const program =
        document.getElementById(
            'user-program-filter'
        );

    const section =
        document.getElementById(
            'user-section-filter'
        );


    program.value = '';
    section.value = '';


    updateProgramFilter();

    filterUsers();
}


/* ─────────────────────────────────────────────
   PROGRAM CHANGED
───────────────────────────────────────────── */

function onProgramFilterChange() {

    /*
     * Changing program resets section.
     */

    const section =
        document.getElementById(
            'user-section-filter'
        );

    section.value = '';


    updateSectionFilter();

    filterUsers();
}


/* ─────────────────────────────────────────────
   CLEAR FILTERS
───────────────────────────────────────────── */

function clearUserFilters() {

    document.getElementById(
        'user-search'
    ).value = '';


    document.getElementById(
        'user-college-filter'
    ).value = '';


    document.getElementById(
        'user-program-filter'
    ).value = '';


    document.getElementById(
        'user-section-filter'
    ).value = '';


    document.getElementById(
        'user-status-filter'
    ).value = '';


    populateUserFilters();

    renderUsers(users);
}

function viewUser(i) {
  const u = users[i];
  const { lvl, label } = getLevelLabel(u.level_xp ?? u.xp);
  const nextThresh = XP_THRESHOLDS[lvl] || XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  const prevThresh = XP_THRESHOLDS[lvl - 1] || 0;
  const prog = lvl === XP_THRESHOLDS.length ? 100 : Math.min(100, Math.round((u.xp - prevThresh) / (nextThresh - prevThresh) * 100));
  document.getElementById('ud-title').textContent = u.name;
  document.getElementById('ud-body').innerHTML = adminDetails([['Student ID',u.id],['College',u.college],['Program',u.program],['Section',u.section],['Total XP',Number(u.xp).toLocaleString()],['Level',lvl+' / '+label],['Status',u.status]])+`<section class="admin-detail-note"><strong>Level progress</strong><div class="prog-track"><div class="prog-fill pf-blue" style="width:${prog}%"></div></div><p>${lvl === XP_THRESHOLDS.length ? 'Highest student level reached' : prog + '% toward the next level'}</p></section>`;
  document.getElementById('ud-deactivate-btn').textContent = u.status === 'Active' ? 'Deactivate User' : 'Activate User';
  document.getElementById('ud-deactivate-btn').onclick = () => { toggleUserStatus(i); closeModal('modal-user-detail'); };
  openModal('modal-user-detail');
}

async function toggleUserStatus(i) {
    const user = users[i];

    const newStatus =
        user.status === 'Active'
            ? 'Inactive'
            : 'Active';

    const confirmation = await confirmAccountStatus(user.name, newStatus);
    if (!confirmation) return;

    try {

        const response = await fetch(
            '../assets/php/deactivate_account.php',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                credentials: 'include',

                body: JSON.stringify({
                    type: 'student',
                    id: user.student_id,
                    status: newStatus, confirmation
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                'Failed to update account status.'
            );
        }

        // Update the local display only after MySQL succeeds
        user.status = newStatus;

        renderUsers(users);
        filterUsers();

        logActivity(
            newStatus === 'Active' ? '✅' : '🚫',
            `Admin ${newStatus === 'Active' ? 'activated' : 'deactivated'} ${user.name}`
        );

        showToast(
            '✅',
            `${user.name} is now ${newStatus}.`
        );

    } catch (error) {

        console.error(
            'Update account status error:',
            error
        );

        showToast(
            '❌',
            error.message ||
            'Failed to update account status.'
        );
    }
}
async function saveUser() {

    const firstName =
        document.getElementById(
            'add-first-name'
        ).value.trim();

    const lastName =
        document.getElementById(
            'add-last-name'
        ).value.trim();

    const studentNumber =
        document.getElementById(
            'add-student-number'
        ).value.trim();

    const email =
        document.getElementById(
            'add-email'
        ).value.trim();

    const college =
        document.getElementById(
            'add-college'
        ).value;

    const program =
        document.getElementById(
            'add-program'
        ).value.trim();

    const yearLevel =
        document.getElementById(
            'add-year-level'
        ).value;

    const block =
        document.getElementById(
            'add-block'
        ).value;

    const password =
        document.getElementById(
            'add-password'
        ).value;


    /* VALIDATION */

    if (
        !firstName ||
        !lastName ||
        !studentNumber ||
        !college ||
        !program ||
        !block
    ) {

        showToast(
            '⚠️',
            'Please complete all required fields.'
        );

        return;
    }


    try {

        const response = await fetch(
            '../assets/php/add_student.php',
            {
                method: 'POST',

                headers: {
                    'Content-Type':
                        'application/json'
                },

                credentials: 'include',

                body: JSON.stringify({

                    first_name:
                        firstName,

                    last_name:
                        lastName,

                    student_number:
                        studentNumber,

                    institutional_email:
                        email,

                    college:
                        college,

                    program:
                        program,

                    year_level:
                        yearLevel,

                    block:
                        block,

                    password:
                        password

                })

            }
        );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                'Failed to add student.'
            );

        }


        /* CLOSE MODAL */

        closeModal(
            'modal-add-user'
        );


        /* SUCCESS MESSAGE */

        showToast(
            '✅',
            'New student added successfully!'
        );


        logActivity(
            '👤',
            `Admin added ${firstName} ${lastName}`
        );


        /*
         * IMPORTANT:
         *
         * Reload the students from MySQL.
         * This makes the new student appear
         * immediately in Student Users.
         */

        const studentsLoaded = await loadStudentsFromDatabase();

if (!studentsLoaded) {
    showToast(
        '⚠️',
        'Student was added, but the student list could not be refreshed.'
    );
}


        /*
         * Clear form after successful insert.
         */

        document.getElementById(
            'add-first-name'
        ).value = '';

        document.getElementById(
            'add-last-name'
        ).value = '';

        document.getElementById(
            'add-student-number'
        ).value = '';

        document.getElementById(
            'add-email'
        ).value = '';

        document.getElementById(
            'add-program'
        ).value = '';

        document.getElementById(
            'add-password'
        ).value = 'password123';


    } catch (error) {

        console.error(
            'Add student error:',
            error
        );


        showToast(
            '❌',
            error.message ||
            'Failed to add student.'
        );

    }

}


/* ── INSTRUCTORS ────────────────────────────────────────────── */
function renderInstructors(list, page = 1) {

    const el = document.getElementById('instr-table-body');

    if (!el) return;

    const sourceRows = list;
    list = adminPageRows(list, el, page, next => renderInstructors(sourceRows, next)).rows;
    if (!list.length) {
        el.innerHTML = `
            <div class="empty-state">
                <span class="emoji">🔍</span>
                <p>No instructors found.</p>
            </div>
        `;
        return;
    }

    el.innerHTML = list.map((r, i) => {

        const initials = r.name
            .replace(/^(Dr\.|Prof\.)\s*/i, '')
            .split(' ')
            .filter(Boolean)
            .map(n => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();

        /*
         * Find the instructor's real position
         * in the main instructors array.
         *
         * This prevents View/Deactivate from
         * targeting the wrong instructor after filtering.
         */
        const instructorIndex = instructors.findIndex(
            instructor =>
                instructor.instructor_id === r.instructor_id
        );

        return `
            <div class="a-table-row instr-row">

                <!-- Instructor -->
                <div class="cell-user">

                    <div
                        class="u-avatar"
                        style="background:${avatarColors[i % avatarColors.length]}"
                    >
                        ${initials}
                    </div>

                    <div>
                        <div class="u-name">
                            ${r.name}
                        </div>

                        <div class="u-id">
                            ${r.id}
                        </div>
                    </div>

                </div>

                <!-- College -->
                <div class="cell">
                    ${r.college || 'N/A'}
                </div>

                <!-- Teaching XP -->
                <div class="cell xp-cell">
                    ⭐ ${Number(
                        r.teaching_exp || 0
                    ).toLocaleString()} EXP
                </div>

                <!-- Instructor rank -->
                <div class="cell instructor-rank-cell"><strong class="teaching-rank" data-rank="${lbEscape(r.grade || '')}">${lbEscape(r.grade || 'Not ranked')}</strong></div>

                <!-- Status -->
                <div>
                    <span class="status-badge ${
                        r.status === 'Active'
                            ? 'sb-active'
                            : 'sb-inactive'
                    }">
                        ${r.status}
                    </span>
                </div>

                <!-- Actions -->
                <div style="display:flex;gap:.4rem">

                    <button
                        type="button"
                        class="btn-sm btn-sm-view"
                        onclick="viewInstructor(${instructorIndex})"
                    >
                        View
                    </button>

                    <button
                        type="button"
                        class="btn-sm btn-sm-view"
                        onclick="openInstructorGrade(${instructorIndex})"
                    >
                        Grade
                    </button>

                    <button
                        type="button"
                        class="btn-sm btn-sm-danger"
                        onclick="toggleInstructorStatus(${instructorIndex})"
                    >
                        ${
                            r.status === 'Active'
                                ? 'Deactivate'
                                : 'Activate'
                        }
                    </button>

                </div>

            </div>
        `;
    }).join('');
}

function filterInstructors() {
  const q       = document.getElementById('instr-search').value.toLowerCase();
  const college = document.getElementById('instr-college-filter').value;
  let list = instructors;
  if (q)       list = list.filter(r => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q));
  if (college) list = list.filter(r => r.college === college);
  renderInstructors(list);
}

const instructorPrograms = {

    CITCS: [
        "BSIT",
        "BSCS",
        "BSIS"
    ],

    CAS: [
        "BS Psych",
        "BA Communication"
    ],

    CBA: [
        "BSBA",
        "BSA"
    ],

    COA: [
        "BS Architecture"
    ],

    CCJ: [
        "BS Criminology"
    ],

    COM: [
        "Doctor of Medicine"
    ],

    CTE: [
        "BEEd",
        "BSEd"
    ]

};


function updateInstructorPrograms() {

    const college =
        document.getElementById('instr-college').value;

    const programSelect =
        document.getElementById('instr-program');

    // Reset program dropdown
    programSelect.innerHTML = '';

    // No college selected
    if (!college) {

        programSelect.disabled = true;

        programSelect.innerHTML = `
            <option value="">
                Select a college first
            </option>
        `;

        return;
    }

    const programs =
        instructorPrograms[college] || [];

    // Enable program dropdown
    programSelect.disabled = false;

    // Default option
    programSelect.innerHTML = `
        <option value="">
            Select Program
        </option>
    `;

    // Add programs
    programs.forEach(program => {

        const option =
            document.createElement('option');

        option.value = program;
        option.textContent = program;

        programSelect.appendChild(option);

    });

}

async function saveInstructor() {

    const instructorNumber =
        document.getElementById('instr-number')?.value.trim();

    const email =
        document.getElementById('instr-email')?.value.trim();

    const firstName =
        document.getElementById('instr-first-name')?.value.trim();

    const lastName =
        document.getElementById('instr-last-name')?.value.trim();

    const college =
        document.getElementById('instr-college')?.value.trim();

    const program =
        document.getElementById('instr-program')?.value.trim();

    const password =
        document.getElementById('instr-password')?.value;

    const teachingExp =
        Number(
            document.getElementById('instr-teaching-exp')?.value || 0
        );


    // VALIDATION
    if (
        !instructorNumber ||
        !email ||
        !firstName ||
        !lastName ||
        !college ||
        !program ||
        !password
    ) {

        showToast(
            '⚠️',
            'Please complete all required fields.'
        );

        return;
    }


    if (teachingExp < 0) {

        showToast(
            '⚠️',
            'Teaching EXP cannot be negative.'
        );

        return;
    }


    if (!/^\d+$/.test(instructorNumber)) {

        showToast(
            '⚠️',
            'Instructor ID must contain numbers only.'
        );

        return;
    }


    if (!email.includes('@')) {

        showToast(
            '⚠️',
            'Please enter a valid email address.'
        );

        return;
    }


    try {

        const response = await fetch(
            '../assets/php/add_instructor.php',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({

                    instructor_number:
                        instructorNumber,

                    email:
                        email,

                    first_name:
                        firstName,

                    last_name:
                        lastName,

                    college:
                        college,

                    program:
                        program,

                    password:
                        password,

                    teaching_exp:
                        teachingExp

                })
            }
        );


        const data = await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.message ||
                'Failed to add instructor.'
            );
        }


        // CLOSE MODAL
        closeModal('modal-add-instr');


        // CLEAR FORM
        document.getElementById(
            'instr-first-name'
        ).value = '';

        document.getElementById(
            'instr-last-name'
        ).value = '';

        document.getElementById(
            'instr-number'
        ).value = '';

        document.getElementById(
            'instr-email'
        ).value = '';

        document.getElementById(
            'instr-college'
        ).value = '';

        document.getElementById(
            'instr-program'
        ).value = '';

        document.getElementById(
            'instr-password'
        ).value = '';

        document.getElementById(
            'instr-teaching-exp'
        ).value = '0';


        // SUCCESS MESSAGE
        showToast(
            '✅',
            'Instructor added successfully!'
        );


        // ACTIVITY
        logActivity(
            '🎓',
            `Admin added instructor ${firstName} ${lastName}`
        );


        // RELOAD FROM DATABASE
        await loadInstructorsFromDatabase();

        filterInstructors();


    } catch (error) {

        console.error(
            'Add instructor error:',
            error
        );

        showToast(
            '❌',
            error.message ||
            'Failed to add instructor.'
        );
    }
}


/* ── ADMIN QUIZZES ──────────────────────────────────────────── */
function renderAdminQuizzes(list, page = 1) {
  const el = document.getElementById('quizzes-table-body');
    const sourceRows = list;
    list = adminPageRows(list, el, page, next => renderAdminQuizzes(sourceRows, next)).rows;
  if (!list.length) {
    el.innerHTML = '<div class="empty-state"><span class="emoji">📭</span><p>No quizzes found.</p></div>';
    return;
  }
  el.innerHTML = list.map(q => {
    const i = adminQuizzes.findIndex(
      x => Number(x.quiz_id) === Number(q.quiz_id)
    );
    const sc = q.status === 'Active' ? 'sb-active' : q.status === 'Draft' ? 'sb-pending' : 'sb-flagged';
    return `
      <div class="a-table-row rep-row">
        <div>
          <div style="font-size:.85rem;font-weight:600">${q.title}</div>
          <span class="status-badge ${sc}" style="margin-top:.3rem;display:inline-block">${q.status}</span>
        </div>
        <div class="cell-muted">${q.instructor}</div>
<div class="cell-muted">${q.college || 'N/A'}</div>
        <div class="cell">${q.type}</div>
        <div class="cell">${q.submissions} submissions</div>
        <div style="display:flex;gap:.4rem;flex-wrap:wrap">
        <button class="btn-sm btn-sm-view" onclick="viewQuiz(${i})">View</button>


        ${q.status === 'Flagged' ? `<button class="btn-sm btn-sm-ok" onclick="resolveQuiz(${i})">Resolve</button>` : ''}

        <button class="btn-sm btn-sm-danger" onclick="confirmRemoveQuiz(${i})">Remove</button>
        </div>
      </div>`;
  }).join('');
}


function filterAdminQuizzes() {
    const q = document.getElementById('quiz-search').value.toLowerCase();
    const type = document.getElementById('quiz-type-filter').value;
    const college = document.getElementById('quiz-college-filter').value;
    const subject = document.getElementById('quiz-subject-filter').value;
    const instructor = document.getElementById('quiz-instructor-filter').value;
    const stat = document.getElementById('quiz-status-filter').value;

    let list = adminQuizzes;

    if (q) {
        list = list.filter(x =>
            (x.title || '').toLowerCase().includes(q) ||
            (x.instructor || '').toLowerCase().includes(q) ||
            (x.subject || '').toLowerCase().includes(q)
        );
    }

    if (type) {
        list = list.filter(x => x.type === type);
    }

    if (college) {
        list = list.filter(x => x.college === college);
    }

    if (subject) {
        list = list.filter(x => x.subject === subject);
    }

    if (instructor) {
        list = list.filter(x => x.instructor === instructor);
    }

    if (stat) {
        list = list.filter(x => x.status === stat);
    }

    renderAdminQuizzes(list);
}


function resolveQuiz(i) {
  const name = adminQuizzes[i].title;
  adminQuizzes[i].status = 'Active';
  renderAdminQuizzes(adminQuizzes);
  logActivity('✅', `Admin resolved flag on "${name}"`);
  showToast('✅', 'Quiz resolved and set to Active.');
}

async function removeQuiz(i, confirmation) {
    if (confirmation !== 'REMOVE') return;

    if (i < 0 || i >= adminQuizzes.length) return;

    const quiz = adminQuizzes[i];

    try {

        const response = await fetch(
            '../assets/php/admin_update_quizzes.php',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    quiz_id: quiz.quiz_id,
                    action: 'remove', confirmation
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                'Failed to remove quiz.'
            );
        }

        // Update the screen only after MySQL succeeds
        adminQuizzes.splice(i, 1);
        filterAdminQuizzes();

        logActivity('🗑️', `Admin removed quiz "${quiz.title}"`);
        showToast('🗑️', `"${quiz.title}" removed.`);

    } catch (error) {

        console.error('Remove quiz error:', error);

        showToast(
            '❌',
            error.message || 'Failed to remove quiz.'
        );
    }
}


/* ── REPORTS ────────────────────────────────────────────────── */
async function renderReports() {
  const studentsEl = document.getElementById('top-students-list');
  const instructorsEl = document.getElementById('top-instr-list');
  const redemptionsEl = document.getElementById('redemption-list');
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  const safe = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const setProgress = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.max(0, Math.min(100, Number(value) || 0))}%`;
  };

  if (studentsEl) studentsEl.innerHTML = overviewPlaceholder('users', 'Loading student leaders', 'Please wait while report data loads.');
  if (instructorsEl) instructorsEl.innerHTML = overviewPlaceholder('graduation-cap', 'Loading instructor leaders', 'Please wait while report data loads.');
  if (redemptionsEl) redemptionsEl.innerHTML = overviewPlaceholder('gift', 'Loading redemptions', 'Please wait while report data loads.');

  try {
    const response = await fetch('../assets/php/get_admin_reports.php', {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store'
    });
    const data = await response.json();
    if (!response.ok || !data.success) {
      throw new Error(data.error || data.message || `Server error: ${response.status}`);
    }

    const m = data.metrics || {};
    const completion = m.completion_rate;
    const avgXp = Number(m.average_xp_per_student || 0);
    const avgScore = m.average_score;

    setText('report-completion-rate', completion == null ? 'N/A' : `${Number(completion).toFixed(1)}%`);
    setText('report-average-xp', avgXp.toFixed(1));
    setText('report-average-score', avgScore == null ? 'N/A' : `${Number(avgScore).toFixed(1)}%`);
    setText('report-completion-caption', `${Number(m.completed_submissions || 0)} completed submissions / ${Number(m.expected_attempts || 0)} expected attempts`);
    setText('report-average-xp-caption', `${Number(m.active_students || 0)} active students · ${Number(m.total_xp || 0).toLocaleString()} total XP`);
    setText('report-average-score-caption', `${Number(m.scored_submissions || 0)} scored submissions`);
    setProgress('report-completion-progress', completion == null ? 0 : completion);
    setProgress('report-average-score-progress', avgScore == null ? 0 : avgScore);
    setProgress('report-average-xp-progress', m.active_students > 0 ? Math.min(100, avgXp) : 0);

    const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
    const topStudents = Array.isArray(data.top_students) ? data.top_students : [];
    if (studentsEl) {
      studentsEl.innerHTML = topStudents.length ? topStudents.map((s, i) => `
        <div style="display:flex;align-items:center;gap:.75rem;padding:.65rem 0;border-bottom:1px solid rgba(255,255,255,.06)">
          <span style="font-size:1rem;width:24px;text-align:center">${medals[i] || `${i + 1}.`}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:.85rem;font-weight:600">${safe(s.name)}</div>
            <div style="font-size:.72rem;color:var(--text-muted)">${safe(s.college)} · ${safe(s.program)} ${s.year_level ? `· Year ${safe(s.year_level)}` : ''}${s.block ? `-${safe(s.block)}` : ''}</div>
          </div>
          <div style="font-weight:700;color:var(--gold);font-size:.85rem">⭐ ${Number(s.xp || 0).toLocaleString()}</div>
        </div>`).join('') : overviewPlaceholder('users', 'No student records yet', 'Top students will appear here once activity is recorded.');
    }

    const topInstructors = Array.isArray(data.top_instructors) ? data.top_instructors : [];
    if (instructorsEl) {
      instructorsEl.innerHTML = topInstructors.length ? topInstructors.map((r, i) => `
        <div style="display:flex;align-items:center;gap:.75rem;padding:.65rem 0;border-bottom:1px solid rgba(255,255,255,.06)">
          <span style="font-size:1rem;width:24px;text-align:center">${medals[i] || `${i + 1}.`}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:.85rem;font-weight:600">${safe(r.name)}</div>
            <div style="font-size:.72rem;color:var(--text-muted)">${safe(r.college)} · ${safe(r.program)}</div>
          </div>
          <div style="font-weight:700;color:var(--gold);font-size:.85rem">⭐ ${Number(r.teaching_exp || 0).toLocaleString()} EXP</div>
        </div>`).join('') : overviewPlaceholder('graduation-cap', 'No instructor records yet', 'Top instructors will appear here once activity is recorded.');
    }

    if (redemptionsEl) {
      const redemptionRows = Array.isArray(data.redemptions) ? data.redemptions : [];
      if (!data.redemptions_available) {
        redemptionsEl.innerHTML = overviewPlaceholder('database', 'Redemption records unavailable', 'Run the platform SQL migration to enable grade boost tracking.');
      } else if (!redemptionRows.length) {
        redemptionsEl.innerHTML = overviewPlaceholder('gift', 'No redemptions yet', 'Redeemed grade boosts will appear here this semester.');
      } else {
        redemptionsEl.innerHTML = redemptionRows.map(r => `
          <div style="display:flex;align-items:center;gap:.75rem;padding:.65rem 0;border-bottom:1px solid rgba(255,255,255,.06)">
            <div style="flex:1;min-width:0">
              <div style="font-size:.85rem;font-weight:600">${safe(r.student || 'Student')} · ${safe(r.quiz || 'Quiz')}</div>
              <div style="font-size:.72rem;color:var(--text-muted)">${safe(r.score_before)}% → ${safe(r.score_after)}% · ${safe(String(r.redeemed_at || '').slice(0, 16))}</div>
            </div>
            <div style="font-weight:700;color:var(--gold);font-size:.85rem">−${Number(r.xp_cost || 0).toLocaleString()} XP</div>
          </div>`).join('');
      }
    }
  } catch (error) {
    console.error('Failed to load admin reports:', error);
    const message = safe(error.message || 'Unable to load report data.');
    ['report-completion-rate','report-average-xp','report-average-score'].forEach(id => setText(id, '—'));
    if (studentsEl) studentsEl.innerHTML = overviewPlaceholder('users', 'Student report unavailable', `Unable to load report data. ${message}`);
    if (instructorsEl) instructorsEl.innerHTML = overviewPlaceholder('graduation-cap', 'Instructor report unavailable', `Unable to load report data. ${message}`);
    if (redemptionsEl) redemptionsEl.innerHTML = overviewPlaceholder('gift', 'Redemption report unavailable', `Report data could not be loaded. ${message}`);
  }
}

/* ── SETTINGS + ANNOUNCEMENT HISTORY ───────────────────────── */
function renderSettingsExtras() {
  loadAnnouncementHistory();
}

const XP_RULE_TOGGLES = {
  'toggle-95': 'xp_alignment_95_enabled',
  'toggle-85': 'xp_pass_rate_85_enabled',

};

const PLATFORM_TOGGLES = {
  'toggle-redeem': 'platform_grade_boost_enabled',
  'toggle-royale': 'platform_battle_royale_enabled',
  'toggle-auto': 'platform_auto_grading_enabled',
  'toggle-maint': 'platform_maintenance_mode_enabled'
};

function applyPlatformToggleLabel(id) {
  const el = document.getElementById(id);
  const label = el && el.nextElementSibling;
  if (!label) return;
  const on = el.classList.contains('on');
  label.textContent = on
    ? (id === 'toggle-maint' ? 'On' : 'Enabled')
    : (id === 'toggle-maint' ? 'Off' : 'Disabled');
}

async function loadPlatformSettings() {
  try {
    const response = await fetch('../assets/php/admin_platform_settings.php', { credentials: 'same-origin', cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load platform settings.');
    Object.entries(PLATFORM_TOGGLES).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('on', Boolean(Number(data.settings[key])));
      applyPlatformToggleLabel(id);
      if(el){el.disabled=false;renderConfigurationState(id,'Saved');}
    });
  } catch (error) {
    console.error('Failed to load platform settings:', error);
    Object.keys(PLATFORM_TOGGLES).forEach(id=>renderConfigurationState(id,'Unavailable. Reload to retry.'));
    showToast('⚠️', 'Could not load saved platform settings.');
  }
}

async function savePlatformSettings() {
  const settings = {};
  Object.entries(PLATFORM_TOGGLES).forEach(([id, key]) => {
    const el = document.getElementById(id);
    settings[key] = !!el && el.classList.contains('on') ? 1 : 0;
  });
  const button = document.getElementById('btn-save-platform');
  if (button) button.disabled = true;
  try {
    const response = await fetch('../assets/php/admin_platform_settings.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings })
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to save platform settings.');
    Object.entries(PLATFORM_TOGGLES).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('on', Boolean(Number(data.settings[key])));
      applyPlatformToggleLabel(id);
      if(el){el.disabled=false;renderConfigurationState(id,'Saved');}
    });
    showToast('✅', 'Platform settings saved!');
  } catch (error) {
    console.error('Failed to save platform settings:', error);
    showToast('❌', error.message || 'Could not save platform settings.');
  } finally {
    if (button) button.disabled = false;
  }
}

function renderConfigurationState(id, message) {
 const button=document.getElementById(id);if(!button)return;
 const on=button.classList.contains('on');button.setAttribute('aria-checked',String(on));
 if(button.nextElementSibling)button.nextElementSibling.textContent=on?'Enabled':'Disabled';
 const status=document.getElementById(id+'-status');if(status)status.textContent=message;
}
async function toggleSetting(id) {
 const button=document.getElementById(id);
 const key=PLATFORM_TOGGLES[id]||XP_RULE_TOGGLES[id];
 if(!button||button.disabled||!key)return;
 const previous=button.classList.contains('on');
 button.classList.toggle('on',!previous);button.disabled=true;renderConfigurationState(id,'Saving...');
 try {
  const endpoint=PLATFORM_TOGGLES[id]?'admin_platform_settings.php':'admin_xp_settings.php';
  const response=await fetch('../assets/php/'+endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings:{[key]:previous?0:1}})});
  const data=await response.json();if(!response.ok||!data.success)throw Error(data.message||'Unable to save setting.');
  if(data.settings&&key in data.settings)button.classList.toggle('on',Boolean(Number(data.settings[key])));
  renderConfigurationState(id,'Saved');
 }catch(error){button.classList.toggle('on',previous);renderConfigurationState(id,'Not saved. Try again.');showToast('!',error.message||'Unable to save setting.');}
 finally{button.disabled=false;}
}

async function loadXPRules() {
  try {
    const response = await fetch('../assets/php/admin_xp_settings.php', { credentials: 'same-origin' });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load XP rules.');
    Object.entries(XP_RULE_TOGGLES).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('on', Boolean(Number(data.settings[key])));
      if(el){el.disabled=false;renderConfigurationState(id,'Saved');}
    });
  } catch (error) {
    console.error('Failed to load XP rules:', error);
    Object.keys(XP_RULE_TOGGLES).forEach(id=>renderConfigurationState(id,'Unavailable. Reload to retry.'));
    showToast('⚠️', 'Could not load saved XP rules.');
  }
}

async function saveXPRules() {
  const settings = {};
  Object.entries(XP_RULE_TOGGLES).forEach(([id, key]) => {
    const el = document.getElementById(id);
    settings[key] = !!el && el.classList.contains('on') ? 1 : 0;
  });
  try {
    const response = await fetch('../assets/php/admin_xp_settings.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings })
    });
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Unable to save XP rules.');
    showToast('✅', 'XP rules saved!');
  } catch (error) {
    console.error('Failed to save XP rules:', error);
    showToast('❌', error.message || 'Could not save XP rules.');
  }
}

function sendAnnouncement() {
  const title    = document.getElementById('ann-title')?.value?.trim();
  const body     = document.getElementById('ann-body')?.value?.trim() || '';
  const target   = document.getElementById('ann-target')?.value   || 'All Users';
  const priority = document.getElementById('ann-priority')?.value || 'Normal';
  if (!title) { showToast('⚠️', 'Please enter a title.'); return; }
  recordAnnouncement(title, body, target, priority);
  logActivity('📢', `Admin sent announcement: "${title}"`);
  showToast('📢', 'Announcement sent to all users!');
  document.getElementById('ann-title').value = '';
  if (document.getElementById('ann-body')) document.getElementById('ann-body').value = '';
}

function sendAnnouncementModal() {

    console.log('SEND ANNOUNCEMENT BUTTON CLICKED');

    const title =
        document.getElementById('ann-title-m')?.value?.trim();

    const body =
        document.getElementById('ann-body-m')?.value?.trim() || '';

    const target =
        document.getElementById('ann-target-m')?.value || 'All Users';

    const priority =
        document.getElementById('ann-priority-m')?.value || 'Normal';

    console.log('Form values:', {
        title,
        body,
        target,
        priority
    });

    if (!title) {
        showToast('⚠️', 'Please enter a title.');
        return;
    }

    recordAnnouncement(
        title,
        body,
        target,
        priority
    );

    logActivity(
        '📢',
        `Admin sent announcement: "${title}" to ${target}`
    );

    closeModal('modal-announce');

    showToast(
        '📢',
        `Announcement sent to ${target}!`
    );

    // Clear form
    document.getElementById('ann-title-m').value = '';
    document.getElementById('ann-body-m').value = '';
}

function onSectionChange(el) {
  if (!el.value) return;
  const container = document.getElementById('sections-container');
  const allSelects = container.querySelectorAll('.section-select');
  const lastSelect = allSelects[allSelects.length - 1];
  if (el !== lastSelect) return;
  const existing = container.querySelector('.add-more-row');
  if (existing && existing.querySelector('select').value === '') existing.remove();
  const row = document.createElement('div');
  row.className = 'add-more-row';
  row.style.cssText = 'display:flex;align-items:center;gap:.5rem';
  row.innerHTML = `
    <select class="section-select" style="flex:1;background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.13);border-radius:12px;padding:.75rem 1rem;font-family:'Poppins',sans-serif;font-size:.88rem;color:#fff;outline:none" onchange="onSectionChange(this)">
      <option value="">+ Add another section</option>
      <option>Section A</option>
      <option>Section B</option>
      <option>Section C</option>
    </select>
    <button type="button" onclick="this.parentElement.remove()" style="background:rgba(224,92,160,0.2);border:1px solid rgba(224,92,160,0.3);color:#f47fc4;border-radius:10px;padding:.5rem .75rem;cursor:pointer;font-size:.85rem;font-family:'Poppins',sans-serif;flex-shrink:0">✕</button>`;
  container.appendChild(row);
}

function adminDetails(entries){return '<dl class="admin-detail-grid">'+entries.map(([label,value])=>'<div><dt>'+lbEscape(label)+'</dt><dd>'+lbEscape(value==null||value===''?'Not specified':String(value))+'</dd></div>').join('')+'</dl>';}
function viewInstructor(i){const r=instructors[i];if(!r)return;document.getElementById('instructor-view-content').innerHTML='<h2>'+lbEscape(r.name)+'</h2><span class="teaching-rank" data-rank="'+lbEscape(r.grade||'')+'">'+lbEscape(r.grade||'Not ranked')+'</span><p class="admin-dialog-subtitle">Instructor account & teaching record</p>'+adminDetails([['Email',r.email],['College',r.college],['Program',r.program],['Teaching XP',r.teaching_exp??r.xp??0],['Grade',r.grade],['Status',r.status],['Course alignment',r.course_alignment==null?'Not evaluated':r.course_alignment+'%']]);openModal('modal-view-instr');}

function openInstructorGrade(instructorIndex) {

    const instructor = instructors[instructorIndex];

    if (!instructor) {
        console.error('Instructor not found:', instructorIndex);
        return;
    }

    const title = document.getElementById('grade-modal-title');
    const body = document.getElementById('grade-modal-body');

    if (!title || !body) {
        showToast('❌', 'Evaluation modal could not be found.');
        return;
    }

    title.textContent = `Evaluate ${instructor.name}`;

    body.innerHTML = `

        <div style="padding:1rem 0;">

            <p style="color:var(--text-muted);margin-bottom:1.25rem;">
                Choose an instructor rank based on course alignment. SSS+ additionally requires at least 100 evaluated quizzes averaging 99.5% alignment.
                This will not change individual quiz grades.
            </p>

            <!-- OVERALL GRADE -->
            <div style="margin-bottom:1.25rem;">

                <label
                    for="instructor-evaluation-grade"
                    style="display:block;font-weight:700;margin-bottom:.5rem;"
                >
                    Instructor grading rank
                </label>

                <select
                    id="instructor-evaluation-grade"
                    class="form-input"
                    style="width:100%;"
                >
                    <option value="">Select a grade</option>
                    <option value="SSS+">SSS+ / Pinnacle (100%, 100 reviews, 99.5% average)</option>
                    <option value="SSS">SSS / Exceptional (99%+)</option>
                    <option value="SS">SS / Master (98%+)</option>
                    <option value="S">S / Elite (95%+)</option>
                    <option value="A">A / Excellent (90%+)</option>
                    <option value="B">B / Proficient (80%+)</option>
                    <option value="C">C / Developing (70%+)</option>
                    <option value="F">F / Needs improvement</option>
                </select>

            </div>

            <!-- COURSE ALIGNMENT -->
            <div style="margin-bottom:1rem;">

                <label
                    for="instructor-course-alignment"
                    style="display:block;font-weight:700;margin-bottom:.5rem;"
                >
                    Course Alignment (%)
                </label>

                <input
                    type="number"
                    id="instructor-course-alignment"
                    class="form-input"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="Enter percentage (0–100)"
                    style="width:100%;"
                >

                <small style="display:block;margin-top:.4rem;color:var(--text-muted);">
                    Enter a percentage between 0 and 100.
                </small>

            </div>

            <div style="
                padding:.85rem;
                border-radius:10px;
                background:rgba(59,130,246,.08);
                border:1px solid rgba(59,130,246,.2);
                font-size:.82rem;
            ">
                <strong>Reminder:</strong>
                This evaluation is separate from student quiz scores
                and individual quiz grading.
            </div>

        </div>

    `;

    // Populate existing values when editing an evaluation.
    const gradeInput = document.getElementById(
        'instructor-evaluation-grade'
    );

    const alignmentInput = document.getElementById(
        'instructor-course-alignment'
    );

    gradeInput.value = instructor.grade ?? '';

    alignmentInput.value =
        instructor.course_alignment ?? '';

    // Remember which instructor is being evaluated.
    window.currentInstructorEvaluationIndex = instructorIndex;

    openModal('modal-grade');
}

async function saveGrade() {

    const instructorIndex =
        window.currentInstructorEvaluationIndex;

    const instructor = instructors[instructorIndex];

    if (!instructor) {
        showToast('❌', 'Instructor not found.');
        return;
    }

    const gradeInput = document.getElementById(
        'instructor-evaluation-grade'
    );

    const alignmentInput = document.getElementById(
        'instructor-course-alignment'
    );

    if (!gradeInput || !alignmentInput) {
        showToast('❌', 'Evaluation fields are missing.');
        return;
    }

    const grade = gradeInput.value;

    const alignmentValue = alignmentInput.value.trim();

    const courseAlignment = Number(alignmentValue);

    // Validate grade.
    if (!['SSS+','SSS','SS','S','A','B','C','F'].includes(grade)) {
        showToast('⚠️', 'Please select an instructor grade.');
        return;
    }

    // Validate course alignment.
    if (
        alignmentValue === '' ||
        !Number.isInteger(courseAlignment) ||
        courseAlignment < 0 ||
        courseAlignment > 100
    ) {
        showToast(
            '⚠️',
            'Course alignment must be a whole number from 0 to 100.'
        );
        return;
    }

    const saveButton = document.querySelector(
        '#modal-grade .modal-footer .btn-primary'
    );

    try {

        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = 'Saving...';
        }

        const response = await fetch(
            '../assets/php/save_instructor_evaluation.php',
            {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    instructor_id: instructor.instructor_id,
                    grade: grade,
                    course_alignment: courseAlignment
                })
            }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.message || 'Failed to save instructor evaluation.'
            );
        }

        // Update the local instructor data.
        instructor.grade = grade;
        instructor.course_alignment = courseAlignment;

        instructor.evaluation_updated_at =
            data.evaluation_updated_at ?? new Date().toISOString();

        // Refresh the instructor table.
        renderInstructors(instructors);

        if (typeof filterInstructors === 'function') {
            filterInstructors();
        }

        // Close the evaluation popup.
        closeModal('modal-grade');

        // Display confirmation.
        showToast(
            '✅',
            `Evaluation saved for ${instructor.name}.`
        );

        // Record admin activity.
        logActivity(
            '⭐',
            `Admin evaluated instructor ${instructor.name} with grade ${grade} and ${courseAlignment}% course alignment.`
        );

    } catch (error) {

        console.error(
            'Failed to save instructor evaluation:',
            error
        );

        showToast(
            '❌',
            error.message || 'Unable to save evaluation.'
        );

    } finally {

        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'Save Grade';
        }

    }
}


async function toggleInstructorStatus(i) {

    const instructor = instructors[i];

    console.log('Instructor being updated:', instructor);

    const newStatus =
        instructor.status === 'Active'
            ? 'Inactive'
            : 'Active';

    const confirmation = await confirmAccountStatus(instructor.name, newStatus);
    if (!confirmation) return;

    try {

        const response = await fetch(
            '../assets/php/deactivate_account.php',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    type: 'instructor',
                    id: instructor.instructor_id,
                    status: newStatus, confirmation
                })
            }
        );

        const data = await response.json();

        console.log('Status update response:', response.status, data);
        
        if (!response.ok || !data.success) {
            throw new Error(
                data.message ||
                'Failed to update instructor status.'
            );
        }

        instructor.status = newStatus;

        renderInstructors(instructors);
        filterInstructors();

        logActivity(
            newStatus === 'Active' ? '✅' : '🚫',
            `Admin ${
                newStatus === 'Active'
                    ? 'activated'
                    : 'deactivated'
            } instructor ${instructor.name}`
        );

        showToast(
            '✅',
            `${instructor.name} is now ${newStatus}.`
        );

    } catch (error) {

        console.error(
            'Update instructor status error:',
            error
        );

        showToast(
            '❌',
            error.message ||
            'Failed to update instructor status.'
        );
    }
}

function openQuizAlignment(quizId) {
 document.getElementById('nav-quiz-alignment')?.click();
 showToast('', 'Select the instructor and open the quiz review to assess its accepted syllabus.');
}

async function saveQuizAlignment(quizId) {
    closeModal('modal-quiz-alignment');
    document.getElementById('nav-quiz-alignment')?.click();
    showToast('','Choose the instructor and open the current quiz review to confirm its score.');
}


function viewQuiz(i) {
    const q = adminQuizzes[i];

    if (!q) {
        showToast('❌', 'Quiz not found.');
        return;
    }

    const sc = q.status === 'Active'
        ? 'sb-active'
        : q.status === 'Draft'
            ? 'sb-pending'
            : 'sb-flagged';

    const formatValue = value => {
        return value !== null &&
               value !== undefined &&
               String(value).trim() !== ''
            ? String(value)
            : 'Not specified';
    };

    const dueDate = q.due_date
        ? new Date(q.due_date + 'T00:00:00').toLocaleDateString()
        : 'No due date';

    document.getElementById('quiz-detail-title').textContent =
        q.title || 'Untitled Quiz';

    document.getElementById('quiz-detail-body').innerHTML=adminDetails([['Instructor',q.instructor],['Subject',q.subject],['Section',q.section],['Mode',q.type],['Status',q.status],['Due date',dueDate],['Time limit',q.time_limit+' minutes'],['XP reward',q.xp_reward],['Submissions',q.submissions]])+'<section class="admin-detail-note"><h3>Instructions</h3><p>'+lbEscape(q.instructions||'No additional instructions.')+'</p></section>';
    document.getElementById('quiz-remove-btn').onclick = () =>
        confirmRemoveQuiz(i);

    openModal('modal-quiz-detail');
}


function confirmRemoveQuiz(i) {
 const q=adminQuizzes[i];if(!q)return;
 const input=document.getElementById('admin-remove-text'),button=document.getElementById('admin-remove-confirm');
 document.getElementById('admin-remove-name').textContent=q.title;
 input.value='';button.disabled=true;input.oninput=()=>button.disabled=input.value!=='REMOVE';
 button.onclick=async()=>{if(input.value!=='REMOVE')return;button.disabled=true;await removeQuiz(i,input.value);closeModal('modal-remove-quiz');closeModal('modal-quiz-detail');};
 openModal('modal-remove-quiz');input.focus();
}

async function loadStudentsFromDatabase() {

    try {

        const response = await fetch(
            '../assets/php/get_admin_students.php',
            {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            throw new Error(
                `Server error: ${response.status}`
            );
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(
                data.message ||
                'Failed to load students.'
            );
        }

        users = data.students.map(student => ({
            student_id: Number(student.student_id),

            id: String(student.student_number),

            name:
                `${student.first_name} ${student.last_name}`,

            email:
                student.institutional_email || '',

            college:
                student.college || '',

            program: (
    student.program === 0 ||
    String(student.program).trim() === '0' ||
    String(student.program).trim().toLowerCase() === 'program 0'
)
    ? 'No Program Assigned'
    : String(student.program || '').trim(),

            section:
                student.block || '',

            year_level:
                Number(student.year_level) || 0,

            xp:
                Number(student.xp) || 0,
            level_xp: Number(student.level_xp) || 0,

            status: student.status || 'Active'
        }));

        console.log(
            'Students loaded from database:',
            users
        );

        populateUserFilters();
        renderUsers(users);

        return true;

    } catch (error) {

        console.error(
            'Failed to load students:',
            error
        );

        const el =
            document.getElementById(
                'users-table-body'
            );

        if (el) {
            el.innerHTML = `
                <div class="empty-state">
                    <span class="emoji">⚠️</span>
                    <p>Failed to load students.</p>
                    <small>${error.message}</small>
                </div>
            `;
        }

        return false;
    }
}

async function loadInstructorsFromDatabase() {

    try {

        const response = await fetch(
            '../assets/php/get_admin_instructors.php',
            {
                method: 'GET',
                credentials: 'include',
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            throw new Error(
                `Server error: ${response.status}`
            );
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(
                data.message ||
                'Failed to load instructors.'
            );
        }

        instructors = data.instructors.map(instructor => ({
            instructor_id:
                Number(instructor.instructor_id),

            id:
                String(
                    instructor.instructor_number ?? ''
                ),

            name:
                `${instructor.first_name ?? ''} ${instructor.last_name ?? ''}`
                    .trim(),

            email:
                instructor.institutional_email ?? '',

            college:
                instructor.college ?? '',

            program:
                instructor.program ?? '',

            teaching_exp:
    Number(instructor.teaching_exp ?? 0),

grade: instructor.grade ?? null,
course_alignment: instructor.course_alignment ?? null,
evaluation_updated_at: instructor.evaluation_updated_at ?? null,

status:
    instructor.status || 'Active'
        }));

        console.log(
            'Instructors loaded from database:',
            instructors
        );

        renderInstructors(instructors);

    } catch (error) {

        console.error(
            'Failed to load instructors:',
            error
        );

        const el =
            document.getElementById(
                'instr-table-body'
            );

        if (el) {
            el.innerHTML = `
                <div class="empty-state">
                    <span class="emoji">⚠️</span>
                    <p>Failed to load instructors.</p>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }
}

/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
    renderOverview();
    loadAdminOverview();

    await loadStudentsFromDatabase();
    await loadInstructorsFromDatabase();
    await loadAdminQuizzesFromDatabase();
    await loadXPRules();
    await loadPlatformSettings();
});

function showAdminSettingsSection(section, button) {
 document.getElementById('settings-controls').hidden=section!=='controls';
 document.getElementById('settings-communications').hidden=section!=='communications';
 document.querySelectorAll('.settings-navigation button').forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-pressed',String(item===button));});
}
