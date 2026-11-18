/* ═══════════════════════════════════════════════════════════════
   instructor-additions.js
   Implements:
     1. Announcement inbox / banner
     2. Flag notification
     3. Grade-boost notification
     4. New submission notification
     5. Leaderboard tab (per section + subject filter)
     6. Level name column in student roster
   ═══════════════════════════════════════════════════════════════ */

/* ──────────────────────────────────────
   LEVEL SYSTEM HELPERS
────────────────────────────────────── */
const LEVELS = [
    { min: 0, name: 'Rookie', cls: 'lp-novice' },
    { min: 300, name: 'Apprentice', cls: 'lp-learner' },
    { min: 700, name: 'Scholar', cls: 'lp-scholar' },
    { min: 1200, name: 'Battle Ready', cls: 'lp-expert' },
    { min: 2000, name: 'Battle Veteran', cls: 'lp-expert' },
    { min: 3000, name: 'Battle Master', cls: 'lp-master' },
    { min: 4500, name: 'Champion', cls: 'lp-master' },
    { min: 6500, name: 'GABLE Master', cls: 'lp-legend' }
];

function getLevelInfo(xp) {
    let info = LEVELS[0];
    for (const lvl of LEVELS) { if (xp >= lvl.min) info = lvl; }
    return info;
}

function levelPillHTML(xp) {
    const { name, cls } = getLevelInfo(xp);
    return `<span class="level-pill ${cls}">${name}</span>`;
}


/* ──────────────────────────────────────
   ANNOUNCEMENT DATA
────────────────────────────────────── */
const announcements = [];

/* track read state in memory */
let readAnnouncements = new Set(announcements.filter(a => a.read).map(a => a.id));

function unreadCount() {
    return announcements.filter(a => !readAnnouncements.has(a.id)).length;
}


/* ──────────────────────────────────────
   NOTIFICATION DATA
────────────────────────────────────── */
let notifications = [];

let readNotifications = new Set(notifications.filter(n => n.read).map(n => n.id));

function unreadNotifCount() {
    return notifications.filter(n => !readNotifications.has(n.id)).length;
}

function notifIconClass(type) {
    return { submit: 'ni-submit', flag: 'ni-flag', boost: 'ni-boost', announce: 'ni-announce' }[type] || 'ni-announce';
}

function notifEmoji(type) {
    return { submit: '📥', flag: '🚩', boost: '⚡', announce: '📢' }[type] || '📢';
}


/* ──────────────────────────────────────
   LEADERBOARD DATA
────────────────────────────────────── */
const leaderboardData = [];

let lbCurrentSection = 'All';
let lbCurrentSubject = 'All';

function filteredLeaderboard() {
    let list = [...leaderboardData];
    if (lbCurrentSection !== 'All') list = list.filter(s => s.section === lbCurrentSection);
    if (lbCurrentSubject !== 'All') list = list.filter(s => s.subject === lbCurrentSubject);
    // re-rank within filter
    list.sort((a, b) => b.xp - a.xp);
    return list.map((s, i) => ({...s, displayRank: i + 1 }));
}

function renderLeaderboard() {
    const list = filteredLeaderboard();
    const wrap = document.getElementById('lb-table-body');
    if (!wrap) return;

    if (!list.length) {
        wrap.innerHTML = '<div class="notif-empty"><div class="notif-empty-icon">🏆</div><p>No students match this filter.</p></div>';
        return;
    }

    // Podium (top 3)
    const podiumWrap = document.getElementById('lb-podium');
    if (podiumWrap) {
        const top = list.slice(0, 3);
        // display order: 2nd, 1st, 3rd
        const order = top.length === 3 ? [top[1], top[0], top[2]] :
            top.length === 2 ? [null, top[0], top[1]] : [null, top[0], null];
        const baseCls = ['p2-base', 'p1-base', 'p3-base'];
        const rankLabel = ['🥈', '🥇', '🥉'];
        const sizes = [90, 110, 90];

        podiumWrap.innerHTML = order.map((s, i) => {
            if (!s) return '';
            const crownHTML = i === 1 ? `<span class="podium-crown">👑</span>` : '';
            const { name: lvlName } = getLevelInfo(s.xp);
            return `
        <div class="podium-slot">
          <div class="podium-avatar" style="background:${s.color};width:${i===1?66:54}px;height:${i===1?66:54}px">
            ${crownHTML}${s.initials}
          </div>
          <div class="podium-name">${s.name.split(' ')[0]}</div>
          <div class="podium-xp">⭐ ${s.xp.toLocaleString()} XP</div>
          <div class="podium-base ${baseCls[i]}" style="width:${sizes[i]}px">${rankLabel[i]}</div>
        </div>`;
        }).join('');
    }

    // Table rows (all, including top 3 repeated for context)
    wrap.innerHTML = list.map(s => {
        const rnk = s.displayRank;
        const rnkCls = rnk === 1 ? 'r1' : rnk === 2 ? 'r2' : rnk === 3 ? 'r3' : '';
        const topCls = rnk <= 3 ? 'lb-top' : '';
        const changeHTML = s.change > 0 ? `<span class="lb-change up">↑ ${s.change}</span>` :
            s.change < 0 ? `<span class="lb-change down">↓ ${Math.abs(s.change)}</span>` :
            `<span class="lb-change same">—</span>`;
        const { name: lvlName } = getLevelInfo(s.xp);
        return `
      <div class="lb-row ${topCls}">
        <div class="lb-rank-num ${rnkCls}">${rnk <= 3 ? ['🥇','🥈','🥉'][rnk-1] : rnk}</div>
        <div class="lb-student">
          <div class="lb-s-avatar" style="background:${s.color}">${s.initials}</div>
          <div>
            <div class="lb-s-name">${s.name}</div>
            <div class="lb-s-level">${s.section} · ${lvlName}</div>
          </div>
        </div>
        <div class="lb-cell-xp">⭐ ${s.xp.toLocaleString()}</div>
        <div class="lb-cell-score">${s.score}%</div>
        <div class="lb-streak">🔥 ${s.streak}d</div>
        <div>${changeHTML}</div>
      </div>`;
    }).join('');

    // Update summary cards
    const secAStudents = leaderboardData.filter(s => s.section === 'Section A');
    const secBStudents = leaderboardData.filter(s => s.section === 'Section B');
    const avgA = Math.round(secAStudents.reduce((a, s) => a + s.score, 0) / (secAStudents.length || 1));
    const avgB = Math.round(secBStudents.reduce((a, s) => a + s.score, 0) / (secBStudents.length || 1));
    const el = id => document.getElementById(id);
    if (el('lb-summ-a-avg')) el('lb-summ-a-avg').textContent = avgA + '% avg';
    if (el('lb-summ-b-avg')) el('lb-summ-b-avg').textContent = avgB + '% avg';
}

function switchLbSection(btn, section) {
    document.querySelectorAll('.lb-sec-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    lbCurrentSection = section;
    renderLeaderboard();
}

function switchLbSubject(btn, subject) {
    document.querySelectorAll('.lb-subj-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    lbCurrentSubject = subject;
    renderLeaderboard();
}


/* ──────────────────────────────────────
   BUILD & INJECT HTML ADDITIONS
────────────────────────────────────── */
function buildAnnouncementsHTML() {
    return announcements.map(a => {
        const isRead = readAnnouncements.has(a.id);
        const prioClass = { high: 'ap-high', medium: 'ap-medium', info: 'ap-info' }[a.priority] || 'ap-info';
        const prioLabel = { high: 'URGENT', medium: 'NOTICE', info: 'INFO' }[a.priority] || 'INFO';
        const newPill = !isRead ? `<span class="announce-new-pill">NEW</span>` : '';
        return `
      <div class="announce-card ${isRead ? '' : 'unread'}" id="ac-${a.id}" onclick="markAnnouncementRead('${a.id}')">
        <div class="announce-card-header">
          <div class="announce-card-title">${a.title} ${newPill}</div>
          <span class="announce-priority ${prioClass}">${prioLabel}</span>
        </div>
        <div class="announce-body">${a.body}</div>
        <div class="announce-footer">
          <span class="announce-from">From: <strong>${a.from}</strong> · ${a.role}</span>
          <span class="announce-time">${a.time}</span>
        </div>
      </div>`;
    }).join('');
}

function buildNotificationsHTML() {
    if (!notifications.length) {
        return `<div class="notif-empty"><div class="notif-empty-icon">🔔</div><p>No notifications yet</p></div>`;
    }
    return notifications.map(n => {
        const isRead = readNotifications.has(n.id);
        const iCls = notifIconClass(n.type);
        const iEmoji = notifEmoji(n.type);
        return `
      <div class="notif-item ${isRead ? '' : 'unread'}" id="ni-${n.id}" onclick="markNotifRead('${n.id}')">
        <div class="notif-icon-wrap ${iCls}">${iEmoji}</div>
        <div class="notif-body">
          <div class="notif-title-text">${n.title}</div>
          <div class="notif-desc">${n.desc}</div>
          <span class="notif-time">${n.time}</span>
        </div>
        <div class="notif-dot"></div>
      </div>`;
    }).join('');
}

function buildLeaderboardPanel() {
    return `
    <div class="panel" id="panel-leaderboard">
      <div class="lb-hero fade-up">
        <div class="lb-hero-left">
          <h2>Section Leaderboard 🏆</h2>
          <p>Real-time rankings across your sections — track top performers and rising stars</p>
        </div>
        <div class="lb-hero-emoji">🏅</div>
      </div>

      <div class="lb-section-summary fade-up-1">
        <div class="lb-summ-card">
          <div class="lb-summ-icon lsi-a">🅰</div>
          <div class="lb-summ-info">
            <div class="lb-summ-label">Section A</div>
            <div class="lb-summ-val">42 Students</div>
            <div class="lb-summ-sub" id="lb-summ-a-avg">— avg</div>
          </div>
        </div>
        <div class="lb-summ-card">
          <div class="lb-summ-icon lsi-b">🅱</div>
          <div class="lb-summ-info">
            <div class="lb-summ-label">Section B</div>
            <div class="lb-summ-val">38 Students</div>
            <div class="lb-summ-sub" id="lb-summ-b-avg">— avg</div>
          </div>
        </div>
      </div>

      <div class="lb-section-tabs fade-up-1">
        <button class="lb-sec-tab active" onclick="switchLbSection(this,'All')">All Sections</button>
        <button class="lb-sec-tab" onclick="switchLbSection(this,'Section A')">Section A</button>
        <button class="lb-sec-tab" onclick="switchLbSection(this,'Section B')">Section B</button>
      </div>

      <div class="lb-subject-filter fade-up-2">
        <label>Subject:</label>
        <button class="lb-subj-btn active" onclick="switchLbSubject(this,'All')">All Subjects</button>
        <button class="lb-subj-btn" onclick="switchLbSubject(this,'IT Professional Elective 2')">IT Elective 2</button>
        <button class="lb-subj-btn" onclick="switchLbSubject(this,'Enterprise Systems')">Enterprise Systems</button>
        <button class="lb-subj-btn" onclick="switchLbSubject(this,'IT Case Studies')">IT Case Studies</button>
      </div>

      <!-- Podium -->
      <div class="lb-podium fade-up-2" id="lb-podium"></div>

      <!-- Table -->
      <div class="lb-table fade-up-3">
        <div class="lb-table-head">
          <div>Rank</div><div>Student</div><div>XP</div>
          <div>Avg Score</div><div>Streak</div><div>Change</div>
        </div>
        <div id="lb-table-body"></div>
      </div>
    </div>`;
}

function buildAnnouncementModal() {
    return `
    <div class="modal-overlay" id="modal-announcements">
      <div class="modal" style="max-width:640px">
        <button class="modal-close" onclick="closeModal('modal-announcements')">✕</button>
        <h2>📢 Admin Announcements</h2>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
          <span id="announce-unread-label" style="font-size:.8rem;color:rgba(255,255,255,.55)"></span>
          <button class="notif-mark-all" onclick="markAllAnnouncementsRead()">Mark all as read</button>
        </div>
        <div class="announcement-list" id="announcement-list"></div>
      </div>
    </div>`;
}

function buildNotifDropdown() {
    return `
    <div class="notif-dropdown" id="notif-dropdown">
      <div class="notif-header">
        <span class="notif-header-title">Notifications</span>
        <button class="notif-mark-all" onclick="markAllNotifsRead()">Mark all read</button>
      </div>
      <div class="notif-list" id="notif-list"></div>
    </div>`;
}


/* ──────────────────────────────────────
   DOM INJECTION
────────────────────────────────────── */
function injectAdditions() {
    /* 1. Add CSS link */
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '../assets/css/instructor-additions.css';
    document.head.appendChild(link);

    /* 2. Inject Leaderboard panel into .main */
    const main = document.querySelector('.main');
    if (main) main.insertAdjacentHTML('beforeend', buildLeaderboardPanel());

    /* 3. Add Leaderboard nav tab */
    const navTabs = document.querySelector('.nav-tabs');
    if (navTabs) {
        navTabs.insertAdjacentHTML('beforeend',
            `<button class="nav-tab" onclick="switchTab('leaderboard')">Leaderboard <span class="nav-tab-new-badge">NEW</span></button>`);
    }

    /* 4. Inject notification bell + announce button into nav-right */
    const navRight = document.querySelector('.nav-right');
    if (navRight) {
        const bellWrap = document.createElement('div');
        bellWrap.className = 'notif-bell-wrap';
        bellWrap.innerHTML = `
      <button class="notif-bell-btn" id="notif-bell" onclick="toggleNotifDropdown(event)" title="Notifications">
        🔔
        <span class="notif-badge" id="notif-badge"></span>
      </button>
      ${buildNotifDropdown()}`;

        const announceWrap = document.createElement('div');
        announceWrap.style.position = 'relative';
        announceWrap.innerHTML = `
      <button class="announce-btn" onclick="openAnnouncementModal()" title="Admin Announcements">
        📢 Inbox
        <span class="announce-unread-dot" id="announce-dot"></span>
      </button>`;

        // Insert before the first child (xp-badge)
        navRight.insertBefore(bellWrap, navRight.firstChild);
        navRight.insertBefore(announceWrap, navRight.firstChild);
    }

    /* 5. Inject announcement modal */
    document.body.insertAdjacentHTML('beforeend', buildAnnouncementModal());

    /* 6. Announcement banner strip (inside .main, before panels) */
    if (main) {
        main.insertAdjacentHTML('afterbegin', `
      <div class="announce-banner-strip" id="announce-banner" onclick="openAnnouncementModal()">
        <span class="abb-icon">📢</span>
        <span class="abb-text"><strong>New admin announcement:</strong> Midterm Grading Deadline Extended — Click to read.</span>
        <span class="abb-cta">View all →</span>
        <button class="abb-close" onclick="event.stopPropagation();dismissBanner()" title="Dismiss">✕</button>
      </div>`);
    }

    /* 7. Update students table header to add Level column */
    const tableHead = document.querySelector('.table-head');
    if (tableHead && !tableHead.querySelector('.level-col-head')) {
        const levelHeadEl = document.createElement('div');
        levelHeadEl.className = 'level-col-head';
        levelHeadEl.textContent = 'Level';
        // Insert after XP (4th child, index 3)
        const children = [...tableHead.children];
        if (children[3]) {
            tableHead.insertBefore(levelHeadEl, children[4]); // after XP
        } else {
            tableHead.appendChild(levelHeadEl);
        }
    }

    /* 8. Update badge counts */
    refreshBadgeCounts();
}


/* ──────────────────────────────────────
   OVERRIDE switchTab TO HANDLE LEADERBOARD
────────────────────────────────────── */
const _origSwitchTab = window.switchTab;
window.switchTab = function(tab) {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

    const tabs = [...document.querySelectorAll('.nav-tab')];
    const panels = [...document.querySelectorAll('.panel')];

    // Find matching tab
    const tabMap = { quiz: 'panel-quiz', students: 'panel-students', analytics: 'panel-analytics', leaderboard: 'panel-leaderboard' };
    const panelId = tabMap[tab];
    if (!panelId) { if (_origSwitchTab) _origSwitchTab(tab); return; }

    // Activate the right nav tab
    const tabNames = ['quiz', 'students', 'analytics', 'leaderboard'];
    const tabIdx = tabNames.indexOf(tab);
    if (tabs[tabIdx]) tabs[tabIdx].classList.add('active');

    const targetPanel = document.getElementById(panelId);
    if (targetPanel) targetPanel.classList.add('active');

    if (tab === 'students') {
        if (typeof renderStudents === 'function') renderStudents(students);
    }
    if (tab === 'leaderboard') {
        renderLeaderboard();
    }
};


/* ──────────────────────────────────────
   OVERRIDE renderStudents TO ADD LEVEL COLUMN
────────────────────────────────────── */
const _origRenderStudents = window.renderStudents;
window.renderStudents = function(list) {
    const c = document.getElementById('students-list');
    if (!c) return;
    if (!list.length) {
        c.innerHTML = '<div class="empty-state"><span class="emoji">🔍</span><p>No students found.</p></div>';
        return;
    }
    const avatarColors = ['#7c5cbf', '#e05ca0', '#4f8ef7', '#f97316', '#4ade80', '#f59e0b', '#a57fe0', '#f47fc4'];
    c.innerHTML = list.map((s, i) => {
        const globalIdx = (typeof students !== 'undefined') ? students.indexOf(s) : i;
        return `
      <div class="table-row" onclick="openStudentDetail(${globalIdx})">
        <div class="student-name">
          <div class="s-avatar" style="background:${avatarColors[i % avatarColors.length]}">${s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
          <div><div class="s-name">${s.name}</div><div class="s-id">${s.id}</div></div>
        </div>
        <div class="cell-muted">${s.program}</div>
        <div class="cell">${s.section}</div>
        <div class="xp-cell">⭐ ${s.xp.toLocaleString()}</div>
        <div class="level-name-cell">${levelPillHTML(s.xp)}</div>
        <div class="score-cell">${s.score}%</div>
        <div><span class="rank-badge rank-${Math.min(s.rank, 3)}">${s.rank <= 3 ? ['🥇','🥈','🥉'][s.rank - 1] : '#' + s.rank}</span></div>
      </div>`;
    }).join('');
};


/* ──────────────────────────────────────
   ANNOUNCEMENT FUNCTIONS
────────────────────────────────────── */
function openAnnouncementModal() {
    markAllAnnouncementsRead();
    const listEl = document.getElementById('announcement-list');
    if (listEl) listEl.innerHTML = buildAnnouncementsHTML();
    updateAnnounceLabel();
    if (typeof openModal === 'function') openModal('modal-announcements');
}

function markAnnouncementRead(id) {
    readAnnouncements.add(id);
    const card = document.getElementById('ac-' + id);
    if (card) {
        card.classList.remove('unread');
        const pill = card.querySelector('.announce-new-pill');
        if (pill) pill.remove();
    }
    updateAnnounceLabel();
    refreshBadgeCounts();
}

function markAllAnnouncementsRead() {
    announcements.forEach(a => readAnnouncements.add(a.id));
    document.querySelectorAll('.announce-card').forEach(c => c.classList.remove('unread'));
    updateAnnounceLabel();
    refreshBadgeCounts();
}

function updateAnnounceLabel() {
    const n = unreadCount();
    const el = document.getElementById('announce-unread-label');
    if (el) el.textContent = n ? `${n} unread announcement${n > 1 ? 's' : ''}` : 'All caught up ✓';
}

function dismissBanner() {
    const b = document.getElementById('announce-banner');
    if (b) {
        b.style.animation = 'none';
        b.style.opacity = '0';
        b.style.transform = 'translateY(-8px)';
        setTimeout(() => b.remove(), 300);
    }
}


/* ──────────────────────────────────────
   NOTIFICATION BELL FUNCTIONS
────────────────────────────────────── */
function toggleNotifDropdown(e) {
    e.stopPropagation();
    const dd = document.getElementById('notif-dropdown');
    if (!dd) return;
    const isOpen = dd.classList.contains('open');
    dd.classList.toggle('open');
    if (!isOpen) {
        // Refresh list
        const nl = document.getElementById('notif-list');
        if (nl) nl.innerHTML = buildNotificationsHTML();
    }
}

document.addEventListener('click', e => {
    const bell = document.getElementById('notif-bell');
    const dd = document.getElementById('notif-dropdown');
    if (dd && bell && !bell.closest('.notif-bell-wrap').contains(e.target)) {
        dd.classList.remove('open');
    }
    const xpPopup = document.getElementById('xp-popup');
    if (xpPopup && document.getElementById('xp-badge-btn') && !document.getElementById('xp-badge-btn').contains(e.target)) {
        xpPopup.classList.remove('open');
    }
}, true);

function markNotifRead(id) {
    readNotifications.add(id);
    const el = document.getElementById('ni-' + id);
    if (el) {
        el.classList.remove('unread');
        const dot = el.querySelector('.notif-dot');
        if (dot) dot.style.opacity = '0';
    }
    refreshBadgeCounts();
}

function markAllNotifsRead() {
    notifications.forEach(n => readNotifications.add(n.id));
    document.querySelectorAll('.notif-item').forEach(el => {
        el.classList.remove('unread');
        const dot = el.querySelector('.notif-dot');
        if (dot) dot.style.opacity = '0';
    });
    refreshBadgeCounts();
}

function refreshBadgeCounts() {
    const nb = document.getElementById('notif-badge');
    const nc = unreadNotifCount();
    if (nb) {
        nb.textContent = nc > 9 ? '9+' : nc;
        nb.classList.toggle('hidden', nc === 0);
    }
    const dot = document.getElementById('announce-dot');
    if (dot) dot.classList.toggle('hidden', unreadCount() === 0);
}


/* ──────────────────────────────────────
   RICH TOAST NOTIFICATIONS
   (for flag / boost / new submission)
────────────────────────────────────── */
function showRichToast(type, title, desc) {
    const existing = document.querySelector('.rich-toast');
    if (existing) existing.remove();

    const clsMap = { flag: 'rt-flag', boost: 'rt-boost', submit: 'rt-submit', info: 'rt-info' };
    const emojiMap = { flag: '🚩', boost: '⚡', submit: '📥', info: '📢' };
    const div = document.createElement('div');
    div.className = 'rich-toast';
    div.innerHTML = `
    <div class="rt-icon-wrap ${clsMap[type] || 'rt-info'}">${emojiMap[type] || '📢'}</div>
    <div class="rt-body">
      <div class="rt-title">${title}</div>
      <div class="rt-desc">${desc}</div>
    </div>
    <button class="rt-close" onclick="this.closest('.rich-toast').remove()">✕</button>`;
    document.body.appendChild(div);

    // Also add to notifications list
    const newNotif = {
        id: 'n' + Date.now(),
        type,
        read: false,
        title,
        desc,
        time: 'Just now',
    };
    notifications.unshift(newNotif);
    refreshBadgeCounts();

    // Auto dismiss after 5s
    setTimeout(() => {
        if (div.parentNode) {
            div.classList.add('hiding');
            setTimeout(() => div.remove(), 300);
        }
    }, 5000);
}

/* Expose helpers so other scripts can call them */
window.showFlagNotification = (quizTitle) =>
    showRichToast('flag', 'Quiz Flagged by Admin', `"${quizTitle}" was flagged for review. Check alignment score.`);

window.showBoostNotification = (studentName, quizTitle, newScore) =>
    showRichToast('boost', 'Grade Boost Redeemed', `${studentName} used a Grade Boost on "${quizTitle}" — new score: ${newScore}%`);

window.showSubmissionNotification = (studentName, quizTitle, score) =>
    showRichToast('submit', 'New Submission', `${studentName} completed "${quizTitle}" — scored ${score}%`);

/* Demo triggers (remove in production) — simulate live events */
function startDemoNotifications() {
    setTimeout(() => {
        window.showSubmissionNotification('Sofia Ramos', 'React Components & Props', 84);
    }, 6000);
    setTimeout(() => {
        window.showFlagNotification('Enterprise Systems Quiz 3');
    }, 14000);
    setTimeout(() => {
        window.showBoostNotification('Miguel Torres', 'Network Security Basics', 90);
    }, 22000);
}


/* ──────────────────────────────────────
   INIT
────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    injectAdditions();
    startDemoNotifications();

    // Refresh student list once extra column CSS has loaded
    setTimeout(() => {
        if (typeof filterStudents === 'function') filterStudents();
    }, 100);
});
