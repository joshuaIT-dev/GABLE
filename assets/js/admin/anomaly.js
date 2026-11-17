/* ═══════════════════════════════════════════════════════════
   anomaly.js  —  Anomaly Detection
   Flags unusual score drops and suspicious answer patterns.
   Auto-logs instructor notifications.

   HOW TO USE:
   1. Add to Admin.html BEFORE </body>:
      <link rel="stylesheet" href="../assets/css/anomaly.css">
      <script src="../assets/js/anomaly.js"></script>
      (must come AFTER admin.js)

   2. In admin.js, find renderOverview() and add at the end:
      renderAnomalyCard();
═══════════════════════════════════════════════════════════ */


/* ── Thresholds ──────────────────────────────────────────── */
const DROP_THRESHOLD      = 15;  // % drop from student avg = suspicious
const PATTERN_THRESHOLD   = 0.7; // 70%+ students share same wrong answer = suspicious

/* ── Notification log (persists in session) ──────────────── */
let anomalyLog = [];
let dismissedAnomalies = new Set();

/* ── Raw data for analysis (mirrors admin.js) ────────────── */
const anomalyData = {
  students: [
    { name:'Juan Dela Cruz', college:'CITCS', avg:94, recentScore:62, quizTitle:'React Components & Props' },
    { name:'Maria Santos',   college:'CITCS', avg:91, recentScore:88, quizTitle:'Network Security Basics' },
    { name:'Jose Reyes',     college:'CITCS', avg:89, recentScore:85, quizTitle:'Agile Methodology Practice' },
    { name:'Ana Garcia',     college:'CAS',   avg:87, recentScore:55, quizTitle:'Psych 101 Final Review' },
    { name:'Carlo Mendoza',  college:'CBA',   avg:85, recentScore:82, quizTitle:'Business Ethics Assessment' },
    { name:'Liza Bautista',  college:'CITCS', avg:83, recentScore:80, quizTitle:'React Components & Props' },
    { name:'Miguel Torres',  college:'CCJ',   avg:80, recentScore:48, quizTitle:'Criminal Law Basics' },
    { name:'Sofia Ramos',    college:'CTE',   avg:78, recentScore:75, quizTitle:'Education Principles' },
  ],
  // Simulated answer pattern data per quiz
  quizPatterns: [
    {
      quizTitle: 'Criminal Law Basics',
      instructor: 'Prof. Mark Reyes',
      college: 'CCJ',
      totalStudents: 15,
      suspiciousQuestion: 'Q3: Define mens rea',
      studentsWithSameWrongAnswer: 12,
      wrongAnswer: 'Physical act of committing a crime',
    },
    {
      quizTitle: 'Psych 101 Final Review',
      instructor: 'Prof. Ramon Cruz',
      college: 'CAS',
      totalStudents: 58,
      suspiciousQuestion: 'Q7: Freud\'s stages of development',
      studentsWithSameWrongAnswer: 41,
      wrongAnswer: 'Oral, Anal, Phallic, Latency, Formal',
    },
  ],
};

/* ── Detect anomalies ────────────────────────────────────── */
function detectAnomalies() {
  const anomalies = [];

  // 1. Score drops
  anomalyData.students.forEach(s => {
    const drop = s.avg - s.recentScore;
    if (drop >= DROP_THRESHOLD) {
      const id = `drop-${s.name}-${s.quizTitle}`;
      if (!dismissedAnomalies.has(id)) {
        anomalies.push({
          id,
          type: 'score_drop',
          severity: drop >= 30 ? 'high' : 'medium',
          student: s.name,
          college: s.college,
          quizTitle: s.quizTitle,
          detail: `Score dropped ${drop}% below average (avg: ${s.avg}%, got: ${s.recentScore}%)`,
          instructor: getInstructorForCollege(s.college),
          notified: anomalyLog.some(l => l.id === id),
        });
      }
    }
  });

  // 2. Suspicious answer patterns
  anomalyData.quizPatterns.forEach(p => {
    const pct = Math.round((p.studentsWithSameWrongAnswer / p.totalStudents) * 100);
    if (p.studentsWithSameWrongAnswer / p.totalStudents >= PATTERN_THRESHOLD) {
      const id = `pattern-${p.quizTitle}-${p.suspiciousQuestion}`;
      if (!dismissedAnomalies.has(id)) {
        anomalies.push({
          id,
          type: 'answer_pattern',
          severity: pct >= 80 ? 'high' : 'medium',
          college: p.college,
          quizTitle: p.quizTitle,
          detail: `${pct}% of students (${p.studentsWithSameWrongAnswer}/${p.totalStudents}) chose the same wrong answer on ${p.suspiciousQuestion}`,
          wrongAnswer: p.wrongAnswer,
          instructor: p.instructor,
          notified: anomalyLog.some(l => l.id === id),
        });
      }
    }
  });

  return anomalies;
}

function getInstructorForCollege(college) {
  const map = {
    'CITCS': 'Dr. Diana Martinez',
    'CAS':   'Prof. Ramon Cruz',
    'CBA':   'Dr. Lisa Santos',
    'CCJ':   'Prof. Mark Reyes',
    'COM':   'Dr. Anna Flores',
    'CTE':   'Prof. Ben Garcia',
  };
  return map[college] || 'Unknown Instructor';
}

/* ── Inject card into overview ───────────────────────────── */
function renderAnomalyCard() {
  // Inject container after flagged-list
  let container = document.getElementById('anomaly-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'anomaly-container';
    container.className = 'fade-up-3';
    const flaggedList = document.getElementById('flagged-list');
    if (flaggedList) flaggedList.insertAdjacentElement('afterend', container);
    else document.querySelector('.main .panel.active')?.appendChild(container);
  }

  const anomalies = detectAnomalies();

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;margin-top:1.75rem">
      <div class="section-title" style="margin:0">🔍 Anomaly Detection
        ${anomalies.length > 0 ? `<span class="anomaly-count-badge">${anomalies.length}</span>` : ''}
      </div>
      <button class="anomaly-log-btn" onclick="openAnomalyLog()">📋 Notification Log (${anomalyLog.length})</button>
    </div>

    ${anomalies.length === 0 ? `
      <div class="anomaly-all-clear">
        <span>✅</span>
        <div>
          <div class="anomaly-clear-title">No anomalies detected</div>
          <div class="anomaly-clear-sub">All colleges are showing normal patterns across quizzes</div>
        </div>
      </div>` : `
      <div class="anomaly-list">
        ${anomalies.map(a => renderAnomalyCard_item(a)).join('')}
      </div>`}

    <!-- Anomaly Log Modal -->
    <div class="modal-overlay" id="modal-anomaly-log">
      <div class="modal" style="max-width:620px">
        <button class="modal-close" onclick="closeModal('modal-anomaly-log')">✕</button>
        <h2>📋 Instructor Notification Log</h2>
        <div id="anomaly-log-body"></div>
      </div>
    </div>

    <!-- Anomaly Detail Modal -->
    <div class="modal-overlay" id="modal-anomaly-detail">
      <div class="modal" style="max-width:580px">
        <button class="modal-close" onclick="closeModal('modal-anomaly-detail')">✕</button>
        <h2 id="anomaly-detail-title">Anomaly Details</h2>
        <div id="anomaly-detail-body"></div>
      </div>
    </div>
  `;
}

function renderAnomalyCard_item(a) {
  const severityClass = a.severity === 'high' ? 'anomaly-high' : 'anomaly-medium';
  const typeIcon = a.type === 'score_drop' ? '📉' : '🔁';
  const typeLabel = a.type === 'score_drop' ? 'Score Drop' : 'Answer Pattern';

  return `
    <div class="anomaly-card ${severityClass}" id="acard-${CSS.escape(a.id)}">
      <div class="anomaly-card-left">
        <div class="anomaly-type-icon">${typeIcon}</div>
        <div class="anomaly-info">
          <div class="anomaly-title">
            ${a.type === 'score_drop' ? a.student : a.quizTitle}
            <span class="anomaly-type-tag">${typeLabel}</span>
            ${a.severity === 'high' ? '<span class="anomaly-severity-high">HIGH</span>' : '<span class="anomaly-severity-med">MED</span>'}
          </div>
          <div class="anomaly-college">${a.college} — ${a.instructor}</div>
          <div class="anomaly-detail">${a.detail}</div>
          ${a.notified ? '<div class="anomaly-notified">✓ Instructor notified</div>' : ''}
        </div>
      </div>
      <div class="anomaly-card-actions">
        <button class="btn-sm btn-sm-view" onclick="openAnomalyDetail('${a.id}')">Investigate</button>
        ${!a.notified ? `<button class="btn-sm btn-sm-warn" onclick="notifyInstructor('${a.id}')">Notify</button>` : ''}
        <button class="btn-sm btn-sm-ok" onclick="dismissAnomaly('${a.id}')">Dismiss</button>
      </div>
    </div>`;
}

/* ── Notify instructor ───────────────────────────────────── */
async function notifyInstructor(anomalyId) {
  const anomalies = detectAnomalies();
  const a = anomalies.find(x => x.id === anomalyId);
  if (!a) return;

  // Add to log immediately
  const logEntry = {
    id: anomalyId,
    type: a.type,
    instructor: a.instructor,
    college: a.college,
    quizTitle: a.quizTitle,
    detail: a.detail,
    timestamp: new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' }),
    aiSummary: null,
  };

  anomalyLog.unshift(logEntry);
  showToast('📬', `${a.instructor} has been notified.`);

  // Generate AI summary for the log
  try {
    const prompt = `Write a brief, professional 2-sentence notification message to an instructor about a detected quiz anomaly. Be factual and actionable.

Anomaly type: ${a.type === 'score_drop' ? 'Unusual student score drop' : 'Suspicious identical wrong answers across students'}
Details: ${a.detail}
Quiz: ${a.quizTitle}
College: ${a.college}

Address the instructor directly. No preamble.`;

    logEntry.aiSummary = await requestAnomalyAI('anomaly_notification', prompt);
  } catch (err) {
    console.error('Anomaly notify error:', err);
  }

  renderAnomalyCard();
}

/* ── Dismiss anomaly ─────────────────────────────────────── */
function dismissAnomaly(anomalyId) {
  dismissedAnomalies.add(anomalyId);
  renderAnomalyCard();
  showToast('✅', 'Anomaly dismissed.');
}

/* ── Open detail modal ───────────────────────────────────── */
async function openAnomalyDetail(anomalyId) {
  const anomalies = detectAnomalies();
  const a = anomalies.find(x => x.id === anomalyId);
  if (!a) return;

  document.getElementById('anomaly-detail-title').textContent =
    a.type === 'score_drop' ? `📉 Score Drop — ${a.student}` : `🔁 Pattern — ${a.quizTitle}`;

  document.getElementById('anomaly-detail-body').innerHTML = `
    <div class="anomaly-detail-grid">
      <div class="anom-det-box">
        <div class="anom-det-label">College</div>
        <div class="anom-det-val">${a.college}</div>
      </div>
      <div class="anom-det-box">
        <div class="anom-det-label">Instructor</div>
        <div class="anom-det-val">${a.instructor}</div>
      </div>
      <div class="anom-det-box">
        <div class="anom-det-label">Quiz</div>
        <div class="anom-det-val">${a.quizTitle}</div>
      </div>
      <div class="anom-det-box">
        <div class="anom-det-label">Severity</div>
        <div class="anom-det-val" style="color:${a.severity === 'high' ? '#f87171' : '#fbbf24'}">${a.severity.toUpperCase()}</div>
      </div>
    </div>

    <div class="anom-det-detail-box">
      <div class="anom-det-label" style="margin-bottom:.5rem">Anomaly Details</div>
      <div style="font-size:.85rem;line-height:1.6;color:rgba(255,255,255,.85)">${a.detail}</div>
      ${a.wrongAnswer ? `<div style="margin-top:.65rem;font-size:.8rem;color:rgba(255,255,255,.5)">Common wrong answer: <span style="color:#fca5a5;font-weight:600">"${a.wrongAnswer}"</span></div>` : ''}
    </div>

    <div class="anom-ai-section">
      <div class="anom-ai-header">🤖 AI Analysis</div>
      <div id="anom-ai-analysis">
        <div class="ci-loading">
          <span class="ci-dot"></span><span class="ci-dot"></span><span class="ci-dot"></span>
          <span class="ci-loading-text">Analyzing anomaly...</span>
        </div>
      </div>
    </div>

    <div class="modal-footer" style="margin-top:1.25rem">
      ${!a.notified ? `<button class="btn-primary" onclick="notifyInstructor('${a.id}');closeModal('modal-anomaly-detail')">📬 Notify ${a.instructor}</button>` : '<span style="font-size:.82rem;color:#86efac">✓ Instructor already notified</span>'}
      <button class="btn-secondary" onclick="dismissAnomaly('${a.id}');closeModal('modal-anomaly-detail')">Dismiss</button>
      <button class="btn-secondary" onclick="closeModal('modal-anomaly-detail')">Close</button>
    </div>
  `;

  openModal('modal-anomaly-detail');
  generateAnomalyAnalysis(a);
}

async function generateAnomalyAnalysis(a) {
  const el = document.getElementById('anom-ai-analysis');
  if (!el) return;

  const prompt = `You are an academic integrity analyst for GABLE, a quiz platform.

Analyze this anomaly and provide:
1. Most likely cause (1 sentence)
2. Risk level assessment (1 sentence)  
3. Recommended action for the admin (1 sentence)

Anomaly: ${a.type === 'score_drop' ? 'Sudden student score drop' : 'Suspicious identical wrong answers'}
Details: ${a.detail}
College: ${a.college}, Quiz: ${a.quizTitle}
${a.wrongAnswer ? `Common wrong answer chosen: "${a.wrongAnswer}"` : ''}

Be concise, numbered, no preamble.`;

  try {
    const text = await requestAnomalyAI('anomaly_analysis', prompt);
    el.innerHTML = `<p class="ci-ai-text">${text.replace(/\n/g, '<br>')}</p>`;
  } catch {
    el.innerHTML = `<p class="ci-ai-text ci-ai-error">⚠️ Could not load analysis.</p>`;
  }
}

async function requestAnomalyAI(feature, prompt) {
  const response = await fetch('../assets/php/groq_proxy.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feature, prompt }),
  });
  const data = await response.json();
  if (!response.ok || !data.success || !data.content) throw new Error(data.message || 'AI request failed.');
  return data.content;
}

/* ── Open notification log ───────────────────────────────── */
function openAnomalyLog() {
  const body = document.getElementById('anomaly-log-body');
  if (!body) return;

  body.innerHTML = anomalyLog.length === 0 ? `
    <div class="empty-state">
      <span class="emoji">📭</span>
      <p>No notifications sent yet.</p>
    </div>` : anomalyLog.map(l => `
    <div class="anomaly-log-entry">
      <div class="ale-header">
        <span class="ale-icon">${l.type === 'score_drop' ? '📉' : '🔁'}</span>
        <div class="ale-info">
          <div class="ale-title">${l.quizTitle}</div>
          <div class="ale-meta">Notified: ${l.instructor} • ${l.college} • ${l.timestamp}</div>
        </div>
        <span class="ale-badge ${l.type === 'score_drop' ? 'ale-drop' : 'ale-pattern'}">${l.type === 'score_drop' ? 'Score Drop' : 'Pattern'}</span>
      </div>
      <div class="ale-detail">${l.detail}</div>
      ${l.aiSummary ? `<div class="ale-ai-msg"><span style="font-size:.68rem;color:var(--purple-light);font-weight:700">AI NOTIFICATION SENT:</span><br>${l.aiSummary}</div>` : ''}
    </div>`).join('');

  openModal('modal-anomaly-log');
}
