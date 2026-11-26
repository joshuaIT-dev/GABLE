
/* ═══════════════════════════════════════════════════════════
   weakspot.js — Weak Spot Radar

   Purpose:
   - Reads existing performance data.
   - Shows subjects that need review.
   - Opens the Performance tab when a weak spot is clicked.

   IMPORTANT:
   - Weak spot actions lead to subject results, not AI tutoring.

   Requires student.js / existing performance data.
   ═══════════════════════════════════════════════════════════ */


/* ── Performance data ─────────────────────────────────────── */

const subjectScores = [];

const WEAK_THRESHOLD = 70;


/* ── Compute weak spots ────────────────────────────────────── */

function getWeakSpots() {

    return subjectScores

        .map(s => {

            const availableScores = [
                s.formal,
                s.informal
            ].filter(score =>
                score !== null &&
                score !== undefined &&
                !Number.isNaN(Number(score))
            );


            const avg = availableScores.length
                ? Math.round(
                    availableScores.reduce(
                        (sum, score) => sum + Number(score),
                        0
                    ) / availableScores.length
                )
                : 0;


            let weakArea = 'Overall performance';


            if (
                s.formal !== null &&
                s.formal !== undefined &&
                s.informal !== null &&
                s.informal !== undefined
            ) {

                weakArea =
                    Number(s.formal) < Number(s.informal)
                        ? 'Formal quizzes'
                        : 'Informal quizzes';

            } else if (
                s.formal !== null &&
                s.formal !== undefined
            ) {

                weakArea = 'Formal quizzes';

            } else if (
                s.informal !== null &&
                s.informal !== undefined
            ) {

                weakArea = 'Informal quizzes';

            }


            const lowestScore = availableScores.length
                ? Math.min(
                    ...availableScores.map(Number)
                )
                : 0;


            const status =
                avg === WEAK_THRESHOLD
                    ? 'Passed but Critical'
                    : 'Critical — Needs Review';


            const gap =
                WEAK_THRESHOLD - avg;


            return {
                ...s,
                avg,
                gap,
                weakArea,
                lowestScore,
                status
            };

        })

        .filter(
            s => s.avg <= WEAK_THRESHOLD
        )

        .sort(
            (a, b) => a.avg - b.avg
        );
}


/* ── Topic suggestions per subject ──────────────────────────
   These do NOT control the chatbot.
   ──────────────────────────────────────────────────────────── */

const topicSuggestions = {};


/* ── Color per weakness level ──────────────────────────────── */

function wsColor(avg) {

    if (avg < 80) return 'ws-red';

    if (avg < 85) return 'ws-orange';

    return 'ws-yellow';
}


function wsIcon(avg) {

    if (avg < 80) return '🔴';

    if (avg < 85) return '🟠';

    return '🟡';
}


/* Weak spot actions open Performance; GAIA is limited to GABLE website help. */


function wsShowPerformance(trigger) {
    const card = trigger instanceof Element
        ? trigger.closest('.ws-detail-card')
        : null;
    const subjectName = card?.querySelector('.ws-detail-name')?.textContent?.trim();

    if (typeof switchTab === 'function') switchTab('scores');

    // Let the scores panel become visible before scrolling to its subject card.
    requestAnimationFrame(() => requestAnimationFrame(() => {
        const subjectGrid = document.getElementById('subject-performance-grid');
        if (!subjectGrid) {
            document.getElementById('panel-scores')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        const subjectCard = subjectName
            ? [...subjectGrid.querySelectorAll('.subject-result-card')].find(item =>
                item.querySelector('h4')?.textContent?.trim().toLocaleLowerCase() === subjectName.toLocaleLowerCase()
            )
            : null;

        (subjectCard || subjectGrid).scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (subjectCard) {
            subjectCard.setAttribute('tabindex', '-1');
            subjectCard.focus({ preventScroll: true });
        }
    }));
}


/* ════════════════════════════════════════════════════════════
   HOME TAB — compact summary card
   ════════════════════════════════════════════════════════════ */

function renderWeakSpotHome() {

    const container =
        document.getElementById('ws-home-container');


    if (!container) return;


    const weak =
        getWeakSpots();


    if (weak.length === 0) {

        container.innerHTML = `

            <div class="ws-home-card ws-all-good">

                <div class="ws-home-title">
                    🎯 Weak Spot Radar
                </div>

                <div class="ws-all-good-body">

                    <span class="ws-all-good-icon">
                        ✅
                    </span>

                    <div>

                        <div class="ws-all-good-text">
                            All subjects above ${WEAK_THRESHOLD}%
                        </div>

                        <div class="ws-all-good-sub"></div>

                    </div>

                </div>

            </div>

        `;

        return;
    }


    const topWeak =
        weak.slice(0, 3);


    container.innerHTML = `

        <div class="ws-home-card">

            <div class="ws-home-header">

                <div class="ws-home-title">
                    📡 Weak Spot Radar
                </div>

                <button
                    class="ws-see-all"
                    onclick="switchTab('scores')">

                    See full report →

                </button>

            </div>


            <div class="ws-home-sub">

                ${weak.length}
                subject${weak.length > 1 ? 's' : ''}
                need${weak.length === 1 ? 's' : ''}
                your attention

            </div>


            <div class="ws-nudge-list">

                ${topWeak.map(s => `

                    <div
                        class="ws-nudge ${wsColor(s.avg)}"

                        onclick="wsShowPerformance()"

                        role="button"

                        tabindex="0"

                        onkeydown="
                            if (
                                event.key === 'Enter' ||
                                event.key === ' '
                            ) {
                                wsShowPerformance();
                            }
                        "
                    >

                        <div class="ws-nudge-left">

                            <span class="ws-nudge-icon">
                                ${wsIcon(s.avg)}
                            </span>

                            <div>

                                <div class="ws-nudge-name">
                                    ${s.subject}
                                </div>

                                <div class="ws-nudge-detail">
                                    ${s.status}
                                    •
                                    ${s.avg}% avg
                                </div>

                            </div>

                        </div>


                        <div class="ws-nudge-right">

                            <div class="ws-nudge-score">
                                ${s.avg}%
                            </div>

                            <div class="ws-nudge-cta">
                                Review →
                            </div>

                        </div>

                    </div>

                `).join('')}

            </div>

        </div>

    `;
}


/* ════════════════════════════════════════════════════════════
   PERFORMANCE TAB — full detail section
   ════════════════════════════════════════════════════════════ */

function renderWeakSpotPerformance() {
    if (typeof reviewRequest === 'function') reviewRequest('review_history.php?role=student',{action:'weakspot'}).catch(error=>console.warn('Performance history:',error.message));

    const container =
        document.getElementById('ws-perf-container');


    if (!container) return;


    const weak =
        getWeakSpots();


    /*
       Calculate strong subjects safely.

       Only scores that actually exist are included
       in the average.
    */

    const strong = subjectScores

        .map(s => {

            const availableScores = [
                s.formal,
                s.informal
            ].filter(score =>
                score !== null &&
                score !== undefined &&
                !Number.isNaN(Number(score))
            );


            const avg = availableScores.length
                ? Math.round(
                    availableScores.reduce(
                        (sum, score) =>
                            sum + Number(score),
                        0
                    ) / availableScores.length
                )
                : 0;


            return {
                ...s,
                avg
            };

        })

        .filter(
            s => s.avg > WEAK_THRESHOLD
        )

        .sort(
            (a, b) => b.avg - a.avg
        );


    container.innerHTML = `

        <div class="ws-perf-card">

            <div class="ws-perf-header">

                <div class="ws-perf-title">
                    📡 Weak Spot Radar — Full Report
                </div>

                <div class="ws-perf-sub">
                    Based on saved formal &amp; informal quiz scores.
                    Opening this report uses no AI requests.
                </div>

            </div>


            ${
                weak.length === 0

                ? `

                    <div
                        class="ws-all-good-body"
                        style="padding:1.25rem 0"
                    >

                        <span class="ws-all-good-icon">
                            ✅
                        </span>

                        <div>

                            <div class="ws-all-good-text">
                                No subjects currently need review.
                            </div>

                        </div>

                    </div>

                `

                : `

                    <div
                        class="ws-section-label ws-label-weak"
                    >

                        ⚠️ Needs Review (${weak.length})

                    </div>


                    <div class="ws-detail-list">

                        ${weak.map(s => {

                            const topics =
                                (
                                    topicSuggestions[s.subject]
                                    || []
                                ).slice(0, 3);


                            return `

                                <div
                                    class="ws-detail-card
                                    ${wsColor(s.avg)}"
                                >

                                    <div class="ws-detail-top">


                                        <div class="ws-detail-left">

                                            <span
                                                class="ws-detail-icon"
                                            >
                                                ${wsIcon(s.avg)}
                                            </span>


                                            <div>

                                                <div
                                                    class="ws-detail-name"
                                                >
                                                    ${s.subject}
                                                </div>


                                                <div
                                                    class="ws-detail-meta"
                                                >

                                                    Formal:
                                                    ${s.formal ?? 'N/A'}%

                                                    &bull;

                                                    Informal:
                                                    ${s.informal ?? 'N/A'}%

                                                    &bull;

                                                    Avg:
                                                    ${s.avg}%

                                                </div>

                                            </div>

                                        </div>


                                        <button
                                            class="ws-study-btn"

                                            onclick="wsShowPerformance(this)"
                                        >

                                            View subject results

                                        </button>


                                    </div>


                                    <div class="ws-detail-bars">


                                        ${
                                            s.formal !== null &&
                                            s.formal !== undefined

                                            ? `

                                                <div
                                                    class="ws-bar-row"
                                                >

                                                    <span
                                                        class="ws-bar-label"
                                                    >
                                                        Formal
                                                    </span>


                                                    <div
                                                        class="ws-bar-track"
                                                    >

                                                        <div
                                                            class="
                                                                ws-bar-fill
                                                                ws-fill-formal
                                                            "

                                                            style="
                                                                width:
                                                                ${Math.max(
                                                                    0,
                                                                    Math.min(
                                                                        100,
                                                                        Number(s.formal)
                                                                    )
                                                                )}%
                                                            "
                                                        ></div>

                                                    </div>


                                                    <span
                                                        class="ws-bar-val"
                                                    >
                                                        ${s.formal}%
                                                    </span>

                                                </div>

                                            `

                                            : ''
                                        }


                                        ${
                                            s.informal !== null &&
                                            s.informal !== undefined

                                            ? `

                                                <div
                                                    class="ws-bar-row"
                                                >

                                                    <span
                                                        class="ws-bar-label"
                                                    >
                                                        Informal
                                                    </span>


                                                    <div
                                                        class="ws-bar-track"
                                                    >

                                                        <div
                                                            class="
                                                                ws-bar-fill
                                                                ws-fill-informal
                                                            "

                                                            style="
                                                                width:
                                                                ${Math.max(
                                                                    0,
                                                                    Math.min(
                                                                        100,
                                                                        Number(s.informal)
                                                                    )
                                                                )}%
                                                            "
                                                        ></div>

                                                    </div>


                                                    <span
                                                        class="ws-bar-val"
                                                    >
                                                        ${s.informal}%
                                                    </span>

                                                </div>

                                            `

                                            : ''
                                        }


                                    </div>


                                    ${
                                        topics.length

                                        ? `

                                            <div
                                                class="ws-topics"
                                            >

                                                <span
                                                    class="ws-topics-label"
                                                >
                                                    Suggested topics:
                                                </span>


                                                ${topics.map(t => `

                                                    <span
                                                        class="
                                                            ws-topic-chip
                                                        "

                                                    >

                                                        ${t}

                                                    </span>

                                                `).join('')}

                                            </div>

                                        `

                                        : ''
                                    }


                                </div>

                            `;

                        }).join('')}

                    </div>

                `
            }


            ${
                strong.length

                ? `

                    <div
                        class="
                            ws-section-label
                            ws-label-strong
                        "
                    >

                        ✅ Strong Subjects
                        (${strong.length})

                    </div>


                    <div class="ws-strong-list">

                        ${strong.map(s => `

                            <div class="ws-strong-item">

                                <span
                                    class="ws-strong-name"
                                >

                                    ${s.subject}

                                </span>


                                <div
                                    class="ws-strong-right"
                                >

                                    <div
                                        class="
                                            ws-strong-bar-track
                                        "
                                    >

                                        <div
                                            class="
                                                ws-strong-bar-fill
                                            "

                                            style="
                                                width:
                                                ${Math.max(
                                                    0,
                                                    Math.min(
                                                        100,
                                                        Number(s.avg)
                                                    )
                                                )}%
                                            "
                                        ></div>

                                    </div>


                                    <span
                                        class="ws-strong-val"
                                    >

                                        ${s.avg}%

                                    </span>

                                </div>

                            </div>

                        `).join('')}

                    </div>

                `

                : ''
            }


        </div>

    `;
}


/* ════════════════════════════════════════════════════════════
   AUTO-INJECT CONTAINERS AND RENDER
   ════════════════════════════════════════════════════════════ */

document.addEventListener(
    'DOMContentLoaded',
    () => {


        /*
           HOME TAB

           Inject the Weak Spot Radar after
           the stats overview.
        */

        const statsOverview =
            document.querySelector(
                '.stats-overview'
            );


        if (
            statsOverview &&
            !document.getElementById(
                'ws-home-container'
            )
        ) {

            const div =
                document.createElement('div');


            div.id =
                'ws-home-container';


            div.className =
                'fade-up-2';


            statsOverview.insertAdjacentElement(
                'afterend',
                div
            );


            renderWeakSpotHome();
        }


        /*
           PERFORMANCE TAB

           Inject the full Weak Spot Radar
           at the beginning of the scores panel.
        */

        const scoresPanel =
            document.getElementById(
                'panel-scores'
            );


        if (
            scoresPanel &&
            !document.getElementById(
                'ws-perf-container'
            )
        ) {

            const div =
                document.createElement('div');


            div.id =
                'ws-perf-container';


            div.className =
                'fade-up';


            scoresPanel.insertBefore(
                div,
                scoresPanel.firstChild
            );


            renderWeakSpotPerformance();
        }

    }
);
