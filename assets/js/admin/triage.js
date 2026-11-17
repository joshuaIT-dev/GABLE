/* ═══════════════════════════════════════════════════════════
   triage.js  —  Flagged Quiz Triage
   AI summarizes why students flagged a quiz.
   Admin decides: resolve, edit, or remove.

   HOW TO USE:
   1. Add to Admin.html BEFORE </body>:
      <link rel="stylesheet" href="../assets/css/triage.css">
      <script src="../assets/js/triage.js"></script>
      (must come AFTER admin.js)

   2. In admin.js, find the flaggedQuizzes render block inside
      renderOverview() and replace it with the patched version
      at the bottom of this file.
═══════════════════════════════════════════════════════════ */


/* ── Extended flag data (reason details per quiz) ────────── */
const flagDetails = {
  'Criminal Law Basics': {
    flagCount: 2,
    studentReasons: [
      'Q3 has two correct answers — both "mens rea" and "actus reus" could apply',
      'Q5 wording is confusing, asked about "criminal intent" but options are about civil law',
    ],
    affectedQuestions: ['Q3: Define mens rea', 'Q5: Elements of criminal liability'],
    college: 'CCJ',
    instructor: 'Prof. Mark Reyes',
    submissionCount: 15,
    avgScore: 61,
  },
  'Psych 101 Final Review': {
    flagCount: 1,
    studentReasons: [
      'Q7 lists "Formal" as one of Freud\'s stages but the correct term is "Genital" — possible typo in options',
    ],
    affectedQuestions: ['Q7: Freud\'s stages of psychosexual development'],
    college: 'CAS',
    instructor: 'Prof. Ramon Cruz',
    submissionCount: 58,
    avgScore: 74,
  },
};

/* ── Triage state ────────────────────────────────────────── */
const triageCache = {}; // cache AI summaries per quiz title

/* ── Patched renderOverview flagged section ──────────────── */
function renderFlaggedWithTriage() {
  const el = document.getElementById('flagged-list');
  if (!el) return;

  el.innerHTML = flaggedQuizzes.length
    ? flaggedQuizzes.map((f, i) => {
        const qi      = adminQuizzes.findIndex(q => q.title === f.title);
        const details = flagDetails[f.title];
        return `
        <div class="triage-flagged-card" id="triage-card-${i}">
          <div class="triage-card-top">
            <div class="flagged-icon">⚠️</div>
            <div class="flagged-info">
              <h4>${f.title}</h4>
              <p>${f.instructor} &bull; ${f.reason}</p>
              ${details ? `<div class="triage-meta">${details.college} &bull; ${details.submissionCount} submissions &bull; Avg score: ${details.avgScore}%</div>` : ''}
            </div>
            <div class="flagged-btns">
              <button class="btn-sm btn-sm-view" onclick="viewQuiz(${qi})">Review</button>
              <button class="btn-sm btn-sm-warn" onclick="openTriageModal(${i})">🤖 Triage</button>
              <button class="btn-sm btn-sm-ok"   onclick="resolveFlagged(${i})">Resolve</button>
              <button class="btn-sm btn-sm-danger" onclick="removeFlagged(${i})">Remove</button>
              <span class="status-badge sb-flagged">${f.count} flag${f.count > 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>`;
      }).join('')
    : '<div class="empty-state"><span class="emoji">✅</span><p>No flagged quizzes. All clear!</p></div>';
}

/* ── Open triage modal ───────────────────────────────────── */
async function openTriageModal(flagIndex) {
  const f       = flaggedQuizzes[flagIndex];
  const details = flagDetails[f.title];
  if (!f) return;

  // Inject modal if not already present
  if (!document.getElementById('modal-triage')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="modal-triage">
        <div class="modal" style="max-width:640px">
          <button class="modal-close" onclick="closeModal('modal-triage')">✕</button>
          <h2 id="triage-modal-title">🤖 Quiz Triage</h2>
          <div id="triage-modal-body"></div>
        </div>
      </div>`);
  }

  document.getElementById('triage-modal-title').textContent = `🤖 Triage — ${f.title}`;

  const body = document.getElementById('triage-modal-body');
  body.innerHTML = `
    <!-- Flag summary -->
    <div class="triage-summary-card">
      <div class="triage-summary-header">
        <span class="triage-flag-count">${f.count} Student Flag${f.count > 1 ? 's' : ''}</span>
        <span class="triage-college">${details?.college || ''} &bull; ${details?.instructor || f.instructor}</span>
      </div>
      ${details ? `
      <div class="triage-reasons-list">
        <div class="triage-reasons-label">Student-reported reasons:</div>
        ${details.studentReasons.map(r => `
          <div class="triage-reason-item">
            <span class="triage-reason-icon">💬</span>
            <span>${r}</span>
          </div>`).join('')}
      </div>
      <div class="triage-affected">
        <div class="triage-affected-label">Affected questions:</div>
        ${details.affectedQuestions.map(q => `
          <span class="triage-q-chip">${q}</span>`).join('')}
      </div>
      <div class="triage-stats-row">
        <div class="triage-stat"><div class="ts-val">${details.submissionCount}</div><div class="ts-lbl">Submissions</div></div>
        <div class="triage-stat"><div class="ts-val" style="color:${details.avgScore < 70 ? '#f87171' : '#fbbf24'}">${details.avgScore}%</div><div class="ts-lbl">Avg Score</div></div>
        <div class="triage-stat"><div class="ts-val" style="color:#f47fc4">${f.count}</div><div class="ts-lbl">Flags</div></div>
      </div>` : ''}
    </div>

    <!-- AI Analysis -->
    <div class="triage-ai-card">
      <div class="triage-ai-header">
        <span class="triage-ai-icon">🤖</span>
        <span class="triage-ai-label">AI Triage Summary</span>
        <button class="triage-regen-btn" onclick="generateTriageSummary(${flagIndex}, true)">↻ Regenerate</button>
      </div>
      <div id="triage-ai-body">
        <div class="ci-loading">
          <span class="ci-dot"></span><span class="ci-dot"></span><span class="ci-dot"></span>
          <span class="ci-loading-text">Analyzing flag reasons...</span>
        </div>
      </div>
    </div>

    <!-- Admin action buttons -->
    <div class="triage-actions">
      <div class="triage-actions-label">Admin Decision</div>
      <div class="triage-action-btns">
        <button class="triage-action-btn triage-resolve"
          onclick="triageAction('resolve', ${flagIndex})">
          ✅ Resolve — Quiz is fine
        </button>
        <button class="triage-action-btn triage-edit"
          onclick="triageAction('edit', ${flagIndex})">
          ✏️ Flag for Instructor Edit
        </button>
        <button class="triage-action-btn triage-remove"
          onclick="triageAction('remove', ${flagIndex})">
          🗑️ Remove Quiz
        </button>
      </div>
    </div>
  `;

  openModal('modal-triage');
  await generateTriageSummary(flagIndex, false);
}

/* ── Generate AI triage summary ──────────────────────────── */
async function generateTriageSummary(flagIndex, forceRegen) {
  const f       = flaggedQuizzes[flagIndex];
  const details = flagDetails[f.title];
  const el      = document.getElementById('triage-ai-body');
  if (!el) return;

  // Use cache if available and not regenerating
  if (triageCache[f.title] && !forceRegen) {
    el.innerHTML = renderTriageResult(triageCache[f.title]);
    return;
  }

  el.innerHTML = `
    <div class="ci-loading">
      <span class="ci-dot"></span><span class="ci-dot"></span><span class="ci-dot"></span>
      <span class="ci-loading-text">Analyzing flag reasons...</span>
    </div>`;

  const reasons = details?.studentReasons.join('; ') || f.reason;
  const questions = details?.affectedQuestions.join(', ') || 'Unknown';

  const prompt = `You are an academic quality reviewer for GABLE, a quiz platform.

A quiz has been flagged by students. Analyze the flag reasons and provide a structured triage report.

Quiz: "${f.title}"
Instructor: ${f.instructor}
Student flag reasons: ${reasons}
Affected questions: ${questions}
${details ? `Submissions: ${details.submissionCount}, Average score: ${details.avgScore}%` : ''}

Respond with ONLY a JSON object (no markdown, no backticks):
{
  "severity": "low|medium|high",
  "rootCause": "one sentence explanation of what is likely wrong",
  "impact": "one sentence on how this affects students",
  "recommendation": "one of: resolve|instructor_edit|remove",
  "recommendationReason": "one sentence explaining why",
  "suggestedFix": "one concrete fix the instructor could make"
}`;

  try {
    const raw = await requestTriageAI(prompt);
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    triageCache[f.title] = parsed;
    el.innerHTML = renderTriageResult(parsed);

  } catch (err) {
    console.error('Triage error:', err);
    el.innerHTML = `<p class="ci-ai-text ci-ai-error">⚠️ Could not generate triage summary. Try again.</p>`;
  }
}

async function requestTriageAI(prompt) {
  const response = await fetch('../assets/php/groq_proxy.php', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feature: 'triage_summary', prompt }),
  });
  const data = await response.json();
  if (!response.ok || !data.success || !data.content) throw new Error(data.message || 'AI request failed.');
  return data.content;
}

function renderTriageResult(r) {
  const sevColor = r.severity === 'high' ? '#f87171' : r.severity === 'medium' ? '#fbbf24' : '#86efac';
  const recIcon  = r.recommendation === 'resolve' ? '✅' : r.recommendation === 'instructor_edit' ? '✏️' : '🗑️';
  const recLabel = r.recommendation === 'resolve' ? 'Resolve as-is' : r.recommendation === 'instructor_edit' ? 'Needs instructor edit' : 'Recommend removal';

  return `
    <div class="triage-result">
      <div class="triage-result-row">
        <div class="triage-result-item">
          <div class="tri-label">Severity</div>
          <div class="tri-val" style="color:${sevColor}">${r.severity.toUpperCase()}</div>
        </div>
        <div class="triage-result-item">
          <div class="tri-label">AI Recommendation</div>
          <div class="tri-val">${recIcon} ${recLabel}</div>
        </div>
      </div>
      <div class="triage-finding">
        <div class="tri-finding-label">🔍 Root Cause</div>
        <div class="tri-finding-text">${r.rootCause}</div>
      </div>
      <div class="triage-finding">
        <div class="tri-finding-label">📊 Student Impact</div>
        <div class="tri-finding-text">${r.impact}</div>
      </div>
      <div class="triage-finding triage-fix">
        <div class="tri-finding-label">💡 Suggested Fix</div>
        <div class="tri-finding-text">${r.suggestedFix}</div>
      </div>
    </div>`;
}

/* ── Admin decision actions ──────────────────────────────── */
function triageAction(action, flagIndex) {
  const f = flaggedQuizzes[flagIndex];
  if (!f) return;

  if (action === 'resolve') {
    resolveFlagged(flagIndex);
    closeModal('modal-triage');
    showToast('✅', `"${f.title}" resolved and unflagged.`);

  } else if (action === 'edit') {
    // Mark as flagged-for-edit in activity log
    recentActivity.unshift({
      icon: '✏️',
      text: `Admin flagged "${f.title}" for instructor edit — ${f.instructor}`,
      time: 'Just now',
    });
    resolveFlagged(flagIndex);
    closeModal('modal-triage');
    showToast('✏️', `${f.instructor} has been notified to edit the quiz.`);

  } else if (action === 'remove') {
    removeFlagged(flagIndex);
    closeModal('modal-triage');
    showToast('🗑️', `"${f.title}" removed from the platform.`);
  }

  renderOverview();
}

/* ── Auto-patch renderOverview to use triage version ─────── */
document.addEventListener('DOMContentLoaded', () => {
  // Wait for admin.js to finish, then override flagged rendering
  const originalRenderOverview = window.renderOverview;
  window.renderOverview = function() {
    originalRenderOverview();
    renderFlaggedWithTriage();
  };
  // Also patch the initial load
  renderFlaggedWithTriage();
});
