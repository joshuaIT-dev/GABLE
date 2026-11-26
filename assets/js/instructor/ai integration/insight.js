/* ═══════════════════════════════════════════════════════════
   classinsight.js  —  Class Insight Digest
   Reads existing student/quiz data, surfaces plain-language
   summary of what the class is collectively missing.

   HOW TO USE:
   1. Add to Instructor.html BEFORE </body>:
      <link rel="stylesheet" href="../assets/css/classinsight.css">
      <script src="../assets/js/classinsight.js"></script>
      (must come AFTER instructor.js)

   2. In instructor.js, find switchTab() and add this line
      inside the analytics tab case:
        if (tab === 'analytics') renderClassInsight();

   3. That's it — injects itself at top of Analytics panel.
═══════════════════════════════════════════════════════════ */

/* ── Inject container into Analytics panel on load ───────── */
document.addEventListener('DOMContentLoaded', () => {
    const analyticsPanel = document.getElementById('panel-analytics');
    if (!analyticsPanel) return;

    const container = document.createElement('div');
    container.id = 'ci-container';
    container.className = 'fade-up';
    analyticsPanel.insertBefore(container, analyticsPanel.firstChild);

    renderClassInsight();
});

/* ═══════════════════════════════════════════════════════════
   CLASS INSIGHT — SETTINGS & HELPERS
═══════════════════════════════════════════════════════════ */

const CI_WEAK_THRESHOLD = 80;    // subject average below this = needs attention
const CI_AI_MAX_RETRIES = 0;     // Explicit retries only; the server enforces the paid-attempt cap.
const CI_AI_TIMEOUT_MS  = 30000;
const CI_CACHE_PREFIX   = 'ci-ai-';
const CI_SENTENCE_END   = /[.!?]["')\]]?\s*$/;

let ciRequestToken   = 0;
let ciSummaryTimer   = null;
let ciInstructorInfo = null;
let answeredPlaceholder = null;

function ciDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function ciEscape(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

function ciFormat(text) {
    return ciEscape(text).replace(/\n+/g, '<br>');
}

function ciFormatSummary(text) {
    const source = String(text || '').trim().replace(/\r\n?/g, '\n').replace(/\*\*(.*?)\*\*/g, '$1');
    const lines = source.split(/\n+/).map(line => line.replace(/^\s*(?:\d+[.)]\s*|[-*]\s*)/, '').trim()).filter(Boolean);
    const findings = lines.filter(line => /^Problem:/i.test(line));
    const blocks = findings.length ? findings : source.split(/(?<=[.!?])\s+(?=[A-Z0-9])/).map(line => line.trim()).filter(Boolean).slice(0, 4);
    return blocks.map((block, index) => {
        const match = block.match(/^Problem:\s*(.*?)\s*\|\s*Why:\s*(.*)$/i);
        const title = match ? match[1] : `Finding ${index + 1}`;
        const reason = match ? match[2] : block.replace(/^Problem:\s*/i, '');
        const words = reason.split(/\s+/);
        const shortReason = words.length > 28 ? `${words.slice(0, 28).join(' ')}…` : reason;
        return `<article class="ci-finding"><span class="ci-finding-label">${match ? 'Problem' : 'Class insight'}</span><strong class="ci-finding-title">${ciEscape(title)}</strong><p class="ci-ai-text ci-ai-sentence">${ciEscape(shortReason)}</p></article>`;
    }).join('');
}

// Cut a response back to its last complete sentence.
function ciTrimToCompleteSentence(text) {
    const value = String(text || '').trim();
    if (!value || CI_SENTENCE_END.test(value)) return value;
    const match = value.match(/^[\s\S]*[.!?]["')\]]?(?=\s|$)/);
    return match ? match[0].trim() : value;
}

function ciSignature(snap) {
    const basis = JSON.stringify({
        s: snap.subjectData.map(x => [x.subject, x.section, x.avgScore, x.completion]),
        q: snap.quizData.map(x => [x.title, x.avgScore, x.completed]),
        r: snap.scoreRanges,
        t: snap.totalStudents
    });
    let hash = 5381;
    for (let i = 0; i < basis.length; i++) {
        hash = ((hash << 5) + hash + basis.charCodeAt(i)) | 0;
    }
    return (hash >>> 0).toString(36);
}

function ciCacheGet(key) {
    return null; // The server owns account-scoped reuse and generation limits.
}

function ciCacheSet(key, value) {
    try { sessionStorage.setItem(key, value); } catch (e) { /* ignore */ }
}

function ciMarkUpdated() {
    const label = document.querySelector('#ci-container .ci-refresh-time');
    if (label) {
        label.textContent = 'Updated ' + new Date().toLocaleTimeString(
            [], { hour: '2-digit', minute: '2-digit' }
        );
    }
}


/* ═══════════════════════════════════════════════════════════
   BUILD DATA SNAPSHOT (real data only)
═══════════════════════════════════════════════════════════ */

function buildClassSnapshot() {

    const safeQuizzes  = Array.isArray(quizzes)  ? quizzes  : [];
    const safeStudents = Array.isArray(students) ? students : [];

    /* ── QUIZZES ── */
    const quizData = safeQuizzes
        .filter(q => String(q.status || '').toLowerCase() === 'active')
        .map(q => ({
            title:      q.title || 'Untitled Quiz',
            subject:    q.subject || 'General',
            section:    q.section || 'Unassigned',
            avgScore:   Number(q.stats?.avgScore) || 0,
            completed:  Number(q.stats?.completed) || 0,
            inProgress: Number(q.stats?.inProgress) || 0,
            alignment:  Number(q.stats?.alignment) || 0
        }));

    /* ── SUBJECTS (averages weighted by submissions) ── */
    const subjectMap = {};

    quizData.forEach(quiz => {

        const key = `${quiz.subject}|${quiz.section}`;

        if (!subjectMap[key]) {
            subjectMap[key] = {
                subject: quiz.subject,
                section: quiz.section,
                weightedScore: 0,
                weight: 0,
                quizCount: 0,
                completed: 0
            };
        }

        const entry = subjectMap[key];

        entry.quizCount += 1;
        entry.completed += quiz.completed;

        // Quizzes nobody has taken must not count as 0%.
        if (quiz.completed > 0) {
            entry.weightedScore += quiz.avgScore * quiz.completed;
            entry.weight += quiz.completed;
        }
    });

    const subjectData = Object.values(subjectMap).map(entry => {

        const sectionStudents =
            safeStudents.filter(s => s.section === entry.section);

        const hasScores = entry.weight > 0;

        const avgScore = hasScores
            ? Math.round(entry.weightedScore / entry.weight)
            : 0;

        const expected = sectionStudents.length * entry.quizCount;

        const completion = expected > 0
            ? Math.min(100, Math.round((entry.completed / expected) * 100))
            : 0;

        return {
            subject: entry.subject,
            section: entry.section,
            students: sectionStudents.length,
            avgScore,
            hasScores,
            completion
        };
    });

    /* ── STUDENTS ── */
    const scoreOf = s => Number(s.score);

    // Students with no score yet are tracked separately,
    // not counted as "struggling".
    const scoredStudents = safeStudents.filter(s => scoreOf(s) > 0);

    const scoreRanges = {
        excellent:  scoredStudents.filter(s => scoreOf(s) >= 90).length,
        good:       scoredStudents.filter(s => scoreOf(s) >= 80 && scoreOf(s) < 90).length,
        fair:       scoredStudents.filter(s => scoreOf(s) >= 70 && scoreOf(s) < 80).length,
        struggling: scoredStudents.filter(s => scoreOf(s) < 70).length
    };

    /* ── SECTIONS (taken from the real students) ── */
    const sectionNames = [
        ...new Set(safeStudents.map(s => s.section).filter(Boolean))
    ];

    const sectionData = sectionNames.map(name => {

        const scored = scoredStudents.filter(s => s.section === name);

        return {
            section: name,
            students: safeStudents.filter(s => s.section === name).length,
            avgScore: scored.length
                ? Math.round(
                    scored.reduce((t, s) => t + scoreOf(s), 0) / scored.length
                )
                : null
        };
    });

    /* ── CLASS AVERAGE (weighted, only quizzes with submissions) ── */
    const scoredQuizzes = quizData.filter(q => q.completed > 0);

    const totalWeight =
        scoredQuizzes.reduce((t, q) => t + q.completed, 0);

    const classAverage = totalWeight > 0
        ? Math.round(
            scoredQuizzes.reduce((t, q) => t + q.avgScore * q.completed, 0) /
            totalWeight
        )
        : null;

    const weakSubjects = subjectData
        .filter(s => s.hasScores && s.avgScore < CI_WEAK_THRESHOLD)
        .sort((a, b) => a.avgScore - b.avgScore);

    return {
        subjectData,
        quizData,
        scoreRanges,
        weakSubjects,
        sectionData,
        classAverage,
        totalStudents: safeStudents.length,
        scoredStudents: scoredStudents.length,
        noScores: safeStudents.length - scoredStudents.length,
        hasData: scoredQuizzes.length > 0 || scoredStudents.length > 0
    };
}


/* ═══════════════════════════════════════════════════════════
   PROMPTS (built only from real data)
═══════════════════════════════════════════════════════════ */

function ciDescribeSnapshot(snap) {

    const r = snap.scoreRanges;
    const lines = [];

    lines.push(
        `- Students: ${snap.totalStudents} enrolled, ` +
        `${snap.scoredStudents} with at least one score, ` +
        `${snap.noScores} with no scores yet`
    );

    if (snap.sectionData.length) {
        lines.push(
            '- Sections: ' +
            snap.sectionData.map(s =>
                `${s.section} (${s.students} students` +
                `${s.avgScore !== null ? `, average ${s.avgScore}%` : ''})`
            ).join('; ')
        );
    }

    lines.push(
        `- Class average: ${
            snap.classAverage !== null
                ? snap.classAverage + '%'
                : 'not available yet'
        }`
    );

    lines.push(
        `- Score distribution (students with scores): ` +
        `${r.excellent} at 90%+, ${r.good} at 80-89%, ` +
        `${r.fair} at 70-79%, ${r.struggling} below 70%`
    );

    const scoredSubjects = snap.subjectData.filter(s => s.hasScores);

    if (scoredSubjects.length) {
        lines.push(
            '- Subject averages: ' +
            scoredSubjects.map(s =>
                `${s.subject} (${s.section}) ${s.avgScore}%, ` +
                `completion ${s.completion}%`
            ).join('; ')
        );
    }

    lines.push(
        `- Subjects below ${CI_WEAK_THRESHOLD}%: ` +
        (snap.weakSubjects.length
            ? snap.weakSubjects.map(s =>
                `${s.subject} (${s.section}) ${s.avgScore}%`
              ).join('; ')
            : 'none')
    );

    const lowest = snap.quizData
        .filter(q => q.completed > 0)
        .sort((a, b) => a.avgScore - b.avgScore)
        .slice(0, 8);

    if (lowest.length) {
        lines.push(
            '- Lowest-scoring quizzes: ' +
            lowest.map(q =>
                `"${q.title}" (${q.subject}) ${q.avgScore}% ` +
                `from ${q.completed} submissions`
            ).join('; ')
        );
    }

    return lines.join('\n');
}

function ciBuildSummaryPrompt(snap, instructor) {

    const where = instructor.college ? ` at ${instructor.college}` : '';

    return `You are an academic analytics assistant for ${instructor.name}${where}.

Return up to 4 separate lines, each exactly "Problem: <short issue> | Why: <brief data-backed explanation>". Keep each line under 20 words. Use only the data below; do not invent numbers, names or sections. No introduction or repeated overall summary. If there are no problems, say so in one short sentence.

Class data:
${ciDescribeSnapshot(snap)}`;
}

function ciBuildRecommendationPrompt(snap, instructor) {

    const where = instructor.college ? ` at ${instructor.college}` : '';

    return `You are an academic analytics assistant for ${instructor.name}${where}.

Give exactly 3 numbered, specific, actionable recommendations to improve this class's performance. Each recommendation must be one or two complete sentences (maximum 30 words each). Use only the data below and never invent numbers. No introduction and no closing remarks.

Class data:
${ciDescribeSnapshot(snap)}`;
}

// Plain summary built from the data, shown if the AI is unavailable.
function ciLocalSummary(snap) {

    const parts = [];

    if (snap.classAverage !== null) {
        parts.push(
            `Your class average is ${snap.classAverage}% across ` +
            `${snap.scoredStudents} student${snap.scoredStudents === 1 ? '' : 's'} ` +
            `with recorded scores.`
        );
    }

    if (snap.weakSubjects.length) {
        const weakest = snap.weakSubjects[0];
        parts.push(
            `${weakest.subject} (${weakest.section}) is the weakest area at ` +
            `${weakest.avgScore}%, so it deserves your attention first.`
        );
    } else if (snap.classAverage !== null) {
        parts.push(
            `No subject is below the ${CI_WEAK_THRESHOLD}% threshold right now.`
        );
    }

    const attention =
        snap.scoreRanges.struggling + snap.scoreRanges.fair;

    if (attention) {
        parts.push(
            `${attention} student${attention === 1 ? '' : 's'} scored below ` +
            `80% and may need support.`
        );
    }

    return parts.join(' ') ||
        'There is not enough quiz data yet to summarize.';
}


/* ═══════════════════════════════════════════════════════════
   AI REQUEST (timeout, retries, cut-off detection)
═══════════════════════════════════════════════════════════ */

async function ciGetInstructor() {

    if (ciInstructorInfo) return ciInstructorInfo;

    let info = { name: 'Instructor', college: '' };

    try {

        const response = await fetch('../assets/php/get_instructor.php', {
            credentials: 'same-origin',
            cache: 'no-store'
        });

        const data = await response.json();

        if (data.success) {

            const instructor = data.instructor || data;

            info = {
                name:
                    `${instructor.first_name || ''} ${instructor.last_name || ''}`
                        .trim() || 'Instructor',
                college: instructor.college || ''
            };
        }

    } catch (error) {
        console.warn('Could not load instructor information:', error);
    }

    ciInstructorInfo = info;

    return info;
}

async function ciRequestAI(prompt, options = {}) {

    let maxTokens = options.maxTokens || 450;
    const temperature = options.temperature ?? 0.4;

    let lastError = null;

    for (let attempt = 0; attempt <= CI_AI_MAX_RETRIES; attempt++) {

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), CI_AI_TIMEOUT_MS);

        try {

            const response = await fetch(
                '../assets/php/generate_ai_summary.php',
                {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt,
                        max_tokens: maxTokens,
                        refresh: options.refresh === true,
                        purpose: options.purpose || 'summary',
                        temperature
                    }),
                    signal: controller.signal
                }
            );

            const raw = await response.text();

            let data;

            try {
                data = JSON.parse(raw);
            } catch (parseError) {
                throw new Error('The server returned an invalid response.');
            }

            if (!response.ok || !data.success) {
                const error = new Error(data.message || `API ${response.status}`);
                error.status = response.status;
                error.finishReason = data.finish_reason;
                throw error;
            }

            const text = String(data.text || '').trim();

            if (!text) {
                throw new Error('The AI returned an empty response.');
            }

            const truncated =
                data.finish_reason === 'length' ||
                !CI_SENTENCE_END.test(text);

            // Cut off: try again with more room.
            if (truncated && attempt < CI_AI_MAX_RETRIES) {
                maxTokens = Math.round(maxTokens * 1.5);
                continue;
            }

            return {
                text: truncated ? ciTrimToCompleteSentence(text) : text,
                truncated, generations: data.generations, limitReached: data.limit_reached, outdated: data.outdated
            };

        } catch (error) {

              lastError = error;

            // Hit the token limit: retry with more room.
            if (error.finishReason === 'length') {
                maxTokens = Math.round(maxTokens * 1.5);
            }

            // Do not retry permanent errors.
            if ([400, 401, 403, 404].includes(error.status)) break;

            if (attempt < CI_AI_MAX_RETRIES) {
                await ciDelay(error.status === 429 ? 2500 : 800 * (attempt + 1));
            }

        } finally {
            clearTimeout(timer);
        }
    }

    throw lastError || new Error('Unable to generate AI text.');
}


/* ═══════════════════════════════════════════════════════════
   AI SUMMARY CARD
═══════════════════════════════════════════════════════════ */

const CI_LOADING_HTML = `
    <div class="ci-loading">
      <span class="ci-dot"></span><span class="ci-dot"></span><span class="ci-dot"></span>
      <span class="ci-loading-text">Analyzing class performance...</span>
    </div>`;

/* ── Render the always-visible summary card ──────────────── */
function renderClassInsight() {
    const container = document.getElementById('ci-container');
    if (!container) return;

    const snap = buildClassSnapshot();
    const weakCount = snap.weakSubjects.length;
    const excellentPct =
    snap.totalStudents > 0
        ? Math.round(
            (
                snap.scoreRanges.excellent /
                snap.totalStudents
            ) * 100
        )
        : 0;
    const strugglingCount = snap.scoreRanges.struggling + snap.scoreRanges.fair;

     const classAverage = snap.classAverage;

    container.innerHTML = `
    <div class="ci-card">
      <div class="ci-card-header">
        <div class="ci-header-left">
          <div class="ci-title">📊 Class Insight Digest</div>
          <div class="ci-subtitle">AI-generated summary • Both sections • ${snap.totalStudents} students</div>
        </div>
        <div class="ci-header-right">
          <div class="ci-refresh-time">Updated just now</div>
          <button class="review-library-button" onclick="openReviewHistory()">Saved Reviews</button>
          <button class="ci-btn-detail" onclick="downloadFullAnalyticsReport()">
    📥 Download Full Report
</button>
        </div>
      </div>

      <!-- Quick stats row -->
      <div class="ci-stats-row">
        <div class="ci-stat ci-stat-green">
          <div class="ci-stat-val">${excellentPct}%</div>
          <div class="ci-stat-lbl">Excelling (90%+)</div>
        </div>
        <div class="ci-stat ci-stat-yellow">
          <div class="ci-stat-val">${strugglingCount}</div>
          <div class="ci-stat-lbl">Need attention</div>
        </div>
        <div class="ci-stat ci-stat-red">
          <div class="ci-stat-val">${weakCount}</div>
          <div class="ci-stat-lbl">Weak subject${weakCount !== 1 ? 's' : ''}</div>
        </div>
        <div class="ci-stat ci-stat-blue">
            <div class="ci-stat-val">${classAverage === null ? '—' : classAverage + '%'}</div>
          <div class="ci-stat-lbl">Class average</div>
        </div>
      </div>

      <!-- Weak subjects pills -->
      ${weakCount > 0 ? `
      <div class="ci-weak-row">
        <span class="ci-weak-label">⚠️ Collective gaps:</span>
        ${snap.weakSubjects.map(s => `
          <span class="ci-weak-chip">${s.subject} — ${s.avgScore}% avg</span>
        `).join('')}
      </div>` : `
      <div class="ci-weak-row ci-all-good">
        ✅ All subjects performing above threshold — great class performance!
      </div>`}

      <!-- AI summary box -->
      <div class="ci-ai-box" id="ci-ai-summary">
        <div class="ci-ai-header">
          <span class="ci-ai-icon">🤖</span>
          <span class="ci-ai-label">AI Summary</span>
          <button class="ci-regenerate" onclick="generateAISummary(true)">↻ Regenerate</button>
        </div>
        <div class="ci-ai-body" id="ci-ai-body">
          <div class="ci-loading">
            <span class="ci-dot"></span><span class="ci-dot"></span><span class="ci-dot"></span>
            <span class="ci-loading-text">Analyzing class performance...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- FULL REPORT MODAL -->
    <div class="modal-overlay" id="modal-insight" style="display:none">
      <div class="modal" style="max-width:720px">
        <button class="modal-close" onclick="closeInsightModal()">✕</button>
        <h2>📊 Full Class Insight Report</h2>
        <div id="ci-modal-body"></div>
      </div>
    </div>
  `;

  // Auto-generate AI summary on render
  generateAISummary();
}

/* ── Generate AI summary via Groq ────────────────────────── */
// Calls made within half a second are merged into one.
function generateAISummary(force = false) {

    clearTimeout(ciSummaryTimer);

    ciSummaryTimer = setTimeout(
        () => runAISummary(force === true),
        force === true ? 0 : 500
    );
}

async function runAISummary(force = false) {

    const bodyEl = document.getElementById('ci-ai-body');

    if (!bodyEl) return;

    const token = ++ciRequestToken;

    const snap = buildClassSnapshot();

    if (!snap.hasData) {
        bodyEl.innerHTML =
            `<p class="ci-ai-text">No quiz results are available yet. ` +
            `The summary will appear once students start submitting quizzes.</p>`;
        return;
    }

    const cacheKey = `${CI_CACHE_PREFIX}summary-${ciSignature(snap)}`;


    bodyEl.innerHTML = CI_LOADING_HTML;

    try {

        const instructor = await ciGetInstructor();

        const result = await ciRequestAI(
            ciBuildSummaryPrompt(snap, instructor),
            { maxTokens: 180, temperature: 0.3, refresh: force }
        );

        // A newer request started: ignore this one.
        if (token !== ciRequestToken) return;

        ciCacheSet(cacheKey, result.text);
        document.querySelectorAll("#ci-ai-summary .ci-regenerate").forEach(button => { button.disabled = !!result.limitReached; button.textContent = result.limitReached ? "Saved response - 3/3 used" : `New response (${result.generations ?? 1}/3 used)`; });

        bodyEl.innerHTML =
            `${ciFormatSummary(result.text)}${result.outdated ? '<p class="ci-ai-error">Results have changed. This is an older saved review; choose New response to update it.</p>' : ''}`;

        ciMarkUpdated();

    } catch (error) {

        if (token !== ciRequestToken) return;

        console.error('Class insight error:', error);

        bodyEl.innerHTML = `
            ${ciFormatSummary(ciLocalSummary(snap))}
            <p class="ci-ai-text ci-ai-error">
                ⚠️ The AI summary is unavailable right now, so a basic summary is shown.
                <button class="ci-regenerate" onclick="generateAISummary(true)">↻ Try again</button>
            </p>`;
    }
}



/* ── Full report modal ───────────────────────────────────── */
async function openInsightModal() {
  const modal = document.getElementById('modal-insight');
  const body  = document.getElementById('ci-modal-body');
  if (!modal || !body) return;

  modal.style.display = 'flex';
  const snap = buildClassSnapshot();

  body.innerHTML = `
    <div class="ci-modal-sections">

      <!-- Score distribution -->
      <div class="ci-report-section">
        <div class="ci-report-title">📈 Score Distribution — Both Sections</div>
        <div class="ci-dist-grid">
          <div class="ci-dist-item ci-dist-green">
            <div class="ci-dist-val">${snap.scoreRanges.excellent}</div>
            <div class="ci-dist-lbl">Excelling (90%+)</div>
            <div class="ci-dist-bar"><div class="ci-dist-fill ci-fill-green" style="width:${Math.round(snap.scoreRanges.excellent/snap.totalStudents*100)}%"></div></div>
          </div>
          <div class="ci-dist-item ci-dist-blue">
            <div class="ci-dist-val">${snap.scoreRanges.good}</div>
            <div class="ci-dist-lbl">Good (80-89%)</div>
            <div class="ci-dist-bar"><div class="ci-dist-fill ci-fill-blue" style="width:${Math.round(snap.scoreRanges.good/snap.totalStudents*100)}%"></div></div>
          </div>
          <div class="ci-dist-item ci-dist-yellow">
            <div class="ci-dist-val">${snap.scoreRanges.fair}</div>
            <div class="ci-dist-lbl">Fair (70-79%)</div>
            <div class="ci-dist-bar"><div class="ci-dist-fill ci-fill-yellow" style="width:${Math.round(snap.scoreRanges.fair/snap.totalStudents*100)}%"></div></div>
          </div>
          <div class="ci-dist-item ci-dist-red">
            <div class="ci-dist-val">${snap.scoreRanges.struggling}</div>
            <div class="ci-dist-lbl">Struggling (&lt;70%)</div>
            <div class="ci-dist-bar"><div class="ci-dist-fill ci-fill-red" style="width:${Math.round(snap.scoreRanges.struggling/snap.totalStudents*100)}%"></div></div>
          </div>
        </div>
      </div>

      <!-- Subject breakdown -->
      <div class="ci-report-section">
        <div class="ci-report-title">📚 Subject Performance Breakdown</div>
        ${snap.subjectData.map(s => `
          <div class="ci-subject-row">
            <div class="ci-subject-left">
              <div class="ci-subject-name">${s.subject}</div>
              <div class="ci-subject-meta">Section ${s.section} • ${s.students} students • ${s.completion}% completion</div>
            </div>
            <div class="ci-subject-right">
              <div class="ci-subject-avg ${s.avgScore < 88 ? 'ci-avg-weak' : 'ci-avg-ok'}">${s.avgScore}%</div>
              ${s.avgScore < 88 ? '<div class="ci-needs-attn">Needs attention</div>' : '<div class="ci-on-track">On track</div>'}
            </div>
          </div>
          <div class="ci-subj-bar-track"><div class="ci-subj-bar-fill ${s.avgScore < 88 ? 'ci-bar-weak' : 'ci-bar-ok'}" style="width:${s.avgScore}%"></div></div>
        `).join('')}
      </div>

      <!-- Quiz breakdown -->
      <div class="ci-report-section">
        <div class="ci-report-title">🎯 Quiz Performance</div>
        ${snap.quizData.map(q => `
          <div class="ci-quiz-row">
            <div class="ci-quiz-name">${q.title}</div>
            <div class="ci-quiz-subject">${q.subject}</div>
            <div class="ci-quiz-stats">
              <span class="ci-quiz-avg ${q.avgScore < 80 ? 'ci-avg-weak' : ''}">${q.avgScore}% avg</span>
              <span class="ci-quiz-done">${q.completed} submitted</span>
              ${q.alignment ? `<span class="ci-quiz-align">${q.alignment}% aligned</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- AI detailed recommendations -->
      <div class="ci-report-section">
        <div class="ci-report-title">🤖 AI Recommendations</div>
        <div class="ci-ai-detail-box" id="ci-ai-detail">
          <div class="ci-loading">
            <span class="ci-dot"></span><span class="ci-dot"></span><span class="ci-dot"></span>
            <span class="ci-loading-text">Generating detailed recommendations...</span>
          </div>
        </div>
      </div>
    </div>
  `;

  // Generate detailed AI recommendations
  await generateDetailedRecommendations(snap);
}

/* ═══════════════════════════════════════════════════════════
   DETAILED RECOMMENDATIONS (full report modal)
═══════════════════════════════════════════════════════════ */

async function generateDetailedRecommendations(snap, force = false) {

    const el = document.getElementById('ci-ai-detail');

    if (!el) return;

    if (!snap.hasData) {
        el.innerHTML =
            `<p class="ci-ai-text">Recommendations will appear once quiz results are available.</p>`;
        return;
    }

    const cacheKey = `${CI_CACHE_PREFIX}recs-${ciSignature(snap)}`;
    el.innerHTML=CI_LOADING_HTML;


    try {

        const instructor = await ciGetInstructor();

        const result = await ciRequestAI(
            ciBuildRecommendationPrompt(snap, instructor),
            { maxTokens: 500, temperature: 0.4, refresh: force, purpose: 'recommendations' }
        );

        ciCacheSet(cacheKey, result.text);


        el.innerHTML = `<p class="ci-ai-text">${ciFormat(result.text)}</p>${result.outdated ? '<p class="ci-ai-error">Results have changed. This is an older saved review; choose New response to update it.</p>' : ''}`;
        const regenerate=document.createElement('button');
        regenerate.className='ci-regenerate';
        regenerate.textContent=`New response (${Math.max(0,3-Number(result.generations||0))} attempts left)`;
        regenerate.disabled=Boolean(result.limitReached);
        regenerate.onclick=()=>generateDetailedRecommendations(buildClassSnapshot(),true);
        el.append(regenerate);


    } catch (error) {

        console.error('Recommendation error:', error);

        el.innerHTML = `
            <p class="ci-ai-text ci-ai-error">
                ⚠️ Could not load recommendations.
                <button class="ci-regenerate"
                        onclick="generateDetailedRecommendations(buildClassSnapshot(), true)">↻ Try again</button>
            </p>`;
    }
}


function closeInsightModal() {
  const modal = document.getElementById('modal-insight');
  if (modal) modal.style.display = 'none';
}


/* =========================================================
   EXPORT COMPLETE ANALYTICS REPORT TO MICROSOFT WORD
   Collects live Analytics DOM data + Class Insight snapshot
========================================================= */

async function downloadFullAnalyticsReport() {

    const button = document.querySelector(
        '#ci-container .ci-btn-detail'
    );

    const analyticsPanel = document.getElementById(
        'panel-analytics'
    );

    if (!analyticsPanel) {
        alert('Analytics panel could not be found.');
        return;
    }

    if (!window.docx) {
        alert(
            'The Word document library could not be loaded. ' +
            'Please check your internet connection and try again.'
        );
        return;
    }

    if (button) {
        button.disabled = true;
        button.textContent = 'Generating report...';
    }

    try {

        const {
            Document,
            Paragraph,
            TextRun,
            Table,
            TableRow,
            TableCell,
            HeadingLevel,
            WidthType,
            Packer
        } = window.docx;

        const children = [];

        /* -----------------------------------------
           HELPER: ADD TITLE
        ----------------------------------------- */

        function addTitle(text) {

            children.push(
                new Paragraph({
                    text: text,
                    heading: HeadingLevel.TITLE,
                    spacing: { after: 200 }
                })
            );

        }

        /* -----------------------------------------
           HELPER: ADD SECTION HEADING
        ----------------------------------------- */

        function addHeading(text) {

            children.push(
                new Paragraph({
                    text: text,
                    heading: HeadingLevel.HEADING_1,
                    spacing: {
                        before: 250,
                        after: 120
                    }
                })
            );

        }

        /* -----------------------------------------
           HELPER: ADD NORMAL PARAGRAPH
        ----------------------------------------- */

        function addParagraph(text) {

            if (!text || !String(text).trim()) return;

            children.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: String(text).trim(),
                            size: 24
                        })
                    ],
                    spacing: { after: 100 }
                })
            );

        }

        /* -----------------------------------------
           HELPER: ADD TABLE
        ----------------------------------------- */

        function addTable(headers, rows) {
            children.push(window.GableDocs.table(headers, rows, true));
            children.push(new Paragraph({ text: '' }));
        }

        /* -----------------------------------------
           REPORT HEADER
        ----------------------------------------- */

        const instructorName =
            document.getElementById('instructor-name')
                ?.innerText.trim() || 'Instructor';

        const reportDate =
            window.GableDocs.timestamp();

        addTitle('Instructor Analytics Report');

        addParagraph(
            `Prepared for: ${instructorName}`
        );

        addParagraph(
            `Generated: ${reportDate}`
        );

        addParagraph(
            'This report summarizes the currently available ' +
            'class performance and teaching analytics.'
        );

        /* -----------------------------------------
           1. MAIN ANALYTICS METRICS
        ----------------------------------------- */

        addHeading('1 Overall Class Analytics');

        const metricCards = analyticsPanel.querySelectorAll(
            '.analytics-grid .metric-card'
        );

        const metricRows = [];

        metricCards.forEach(card => {

            const label =
                card.querySelector('.metric-label')
                    ?.innerText.trim() || 'Metric';

            const value =
                card.querySelector('.metric-val')
                    ?.innerText.trim() || '—';

            const description =
                card.querySelector('.metric-sub, .metric-up')
                    ?.innerText.trim() || '—';

            metricRows.push([
                label,
                value,
                description
            ]);

        });

        if (metricRows.length) {

            addTable(
                ['Metric', 'Value', 'Additional Information'],
                metricRows
            );

        } else {

            addParagraph(
                'No overall analytics metrics are currently available.'
            );

        }

        /* -----------------------------------------
           2. ANALYTICS REFERENCE PANELS
        ----------------------------------------- */

        addHeading('2 Detailed Analytics');

        const analyticsCards =
            analyticsPanel.querySelectorAll(
                '.analytics-reference-grid > .analytics-panel-card'
            );

        if (!analyticsCards.length) addParagraph('No detailed analytics are currently available.');

        analyticsCards.forEach((card, index) => {

            const heading =
                card.querySelector(
                    ':scope > h3, :scope > .analytics-panel-title'
                );

            const title =
                heading?.innerText.trim() ||
                `Analytics Section ${index + 1}`;

            addHeading(title);

            const clone = card.cloneNode(true);

            // Remove controls and irrelevant buttons
            clone.querySelectorAll(
                'button, script, style'
            ).forEach(element => element.remove());

            const lines = clone.innerText
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean);

            lines.forEach(line => {

                if (
                    line === title ||
                    line.toLowerCase().includes('loading')
                ) {
                    return;
                }

                addParagraph(line);

            });

        });

        /* -----------------------------------------
           3. CLASS INSIGHT DIGEST
        ----------------------------------------- */

        addHeading('3 Class Insight Digest');

        const digest = document.querySelector(
            '#ci-container .ci-card'
        );

        if (!digest) addParagraph('No saved class insight is currently available.');

        if (digest) {

            const digestClone = digest.cloneNode(true);

            digestClone.querySelectorAll(
                'button, script, style'
            ).forEach(element => element.remove());

            const digestLines = digestClone.innerText
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean);

            digestLines.forEach(line => {

                if (
                    !line.toLowerCase().includes('regenerate') &&
                    !line.toLowerCase().includes('full report')
                ) {
                    addParagraph(line);
                }

            });

        }

        /* -----------------------------------------
           4. SCORE DISTRIBUTION
        ----------------------------------------- */

        const snap = buildClassSnapshot();

        addHeading('4 Student Score Distribution');

        addTable(
            ['Performance Category', 'Number of Students'],
            [
                [
                    'Excelling (90%+)',
                    snap.scoreRanges.excellent
                ],
                [
                    'Good (80–89%)',
                    snap.scoreRanges.good
                ],
                [
                    'Fair (70–79%)',
                    snap.scoreRanges.fair
                ],
                [
                    'Struggling (Below 70%)',
                    snap.scoreRanges.struggling
                ],
                [
                    'Total Students',
                    snap.totalStudents
                ]
            ]
        );

        /* -----------------------------------------
           5. SUBJECT PERFORMANCE
        ----------------------------------------- */

        addHeading('5 Subject Performance Breakdown');

        if (snap.subjectData.length) {

            addTable(
                [
                    'Subject',
                    'Section',
                    'Students',
                    'Average Score',
                    'Completion'
                ],
                snap.subjectData.map(subject => [

                    subject.subject,
                    subject.section,
                    subject.students,
                    `${subject.avgScore}%`,
                    `${subject.completion}%`

                ])
            );

        } else {

            addParagraph(
                'No subject performance data is currently available.'
            );

        }

        /* -----------------------------------------
           6. QUIZ PERFORMANCE
        ----------------------------------------- */

        addHeading('6 Quiz Performance Breakdown');

        if (snap.quizData.length) {

            addTable(
                [
                    'Quiz',
                    'Subject',
                    'Section',
                    'Average Score',
                    'Completed',
                    'In Progress',
                    'Alignment'
                ],
                snap.quizData.map(quiz => [

                    quiz.title,
                    quiz.subject,
                    quiz.section,
                    `${quiz.avgScore}%`,
                    quiz.completed,
                    quiz.inProgress,
                    `${quiz.alignment}%`

                ])
            );

        } else {

            addParagraph(
                'No active quiz performance data is available.'
            );

        }

        /* -----------------------------------------
           7. WEAKEST SUBJECTS
        ----------------------------------------- */

        addHeading('7 Subjects Requiring Attention');

        if (snap.weakSubjects.length) {

            addTable(
                ['Subject', 'Average Score'],
                snap.weakSubjects.map(subject => [
                    subject.subject,
                    `${subject.avgScore}%`
                ])
            );

        } else {

              addParagraph(
                `No subjects currently fall below the ${CI_WEAK_THRESHOLD}% ` +
                'performance threshold.'
            );

        }

        /* -----------------------------------------
           DOCUMENT GENERATION
        ----------------------------------------- */

        const report = window.GableDocs.create(children, 'Instructor Analytics Report', true);

        const blob = await Packer.toBlob(report);

        /* -----------------------------------------
           AUTOMATIC DOWNLOAD
        ----------------------------------------- */

        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');

        const date = new Date()
            .toISOString()
            .slice(0, 10);

        link.href = url;

        link.download =
            `GABLE_Analytics_Report_${date}.docx`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);

    } catch (error) {

        console.error(
            'Analytics report export error:',
            error
        );

        alert(
            'Unable to generate the analytics report. ' +
            'Please check the browser console for details.'
        );

    } finally {

        if (button) {
            button.disabled = false;
            button.textContent = '📥 Download Full Report';
        }

    }

}

