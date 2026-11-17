/* ═══════════════════════════════════════════════════════════════
   game.js — Student-facing game screen
   Modes: Boss Battle, Team Buzzer, Kahoot, Hot Seat, Memory Match
   Depends on: main.js  (showToast)
   ═══════════════════════════════════════════════════════════════ */

let exitToDashboard = false;
const gameTabId = sessionStorage.getItem('gableGameTabId') || Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
sessionStorage.setItem('gableGameTabId', gameTabId);
let gameInProgress = false;

function exitGame() {
    exitToDashboard = !gameInProgress;
    document.getElementById('quit-game-title').textContent = exitToDashboard ? 'Log out?' : 'Quit this game?';
    document.querySelector('#quit-game-dialog p').textContent = exitToDashboard
        ? 'You will be logged out of your account.'
        : 'Your current round will end and return to the game lobby.';
    document.querySelector('.quit-confirm').textContent = exitToDashboard ? 'Log out' : 'Quit game';
    document.getElementById('quit-game-dialog').showModal();
}

function confirmQuitGame() {
    document.getElementById('quit-game-dialog').close();
    if (exitToDashboard) {
        sessionStorage.removeItem('gableGameTabId');
        logout();
    } else resetToLobby();
}


/* ── QUESTION BANKS ─────────────────────────────────────────── */
const QB = {
    'Project Management': [
        { q: 'What Agile ceremony is held at the end of a sprint?', opts: ['Sprint Review', 'Sprint Planning', 'Daily Standup', 'Sprint Retrospective'], correct: 0 },
        { q: 'In Scrum, who is responsible for maximizing product value?', opts: ['Scrum Master', 'Development Team', 'Product Owner', 'Stakeholder'], correct: 2 },
        { q: 'What does KPI stand for?', opts: ['Key Planning Item', 'Key Performance Indicator', 'Knowledge Process Improvement', 'Key Process Item'], correct: 1 },
        { q: 'What is a Sprint in Agile?', opts: ['A daily meeting', 'A 2–4 week time-boxed iteration', 'A product release version', 'A team member role'], correct: 1 },
        { q: 'What is a Product Backlog?', opts: ['A list of developer tasks', 'The current sprint plan', 'A prioritized list of features', 'Completed work items'], correct: 2 },
        { q: 'What does a Burndown Chart track?', opts: ['Team velocity', 'Work remaining vs time', 'Project total cost', 'Team satisfaction'], correct: 1 },
        { q: 'What is Velocity in Agile?', opts: ['How fast developers code', 'Amount of work completed per sprint', 'Number of team members', 'Code quality metric'], correct: 1 },
        { q: 'What is the purpose of a Retrospective?', opts: ['Review product with stakeholders', 'Plan the next sprint', 'Reflect and improve team process', 'Demo completed features'], correct: 2 },
        { q: 'What is Backlog Refinement?', opts: ['Cleaning the office', 'Clarifying and estimating backlog items', 'Writing code', 'Testing the application'], correct: 1 },
        { q: 'What is the Definition of Done?', opts: ['When the manager approves', 'Shared criteria for completed work', 'When tests pass', 'When code is written'], correct: 1 },
    ],
    'Information Security': [
        { q: 'What does the CIA Triad stand for?', opts: ['Central Intelligence Agency', 'Confidentiality, Integrity, Availability', 'Critical Infrastructure Assessment', 'Chief Information Agency'], correct: 1 },
        { q: 'What is Phishing?', opts: ['A network routing protocol', 'A fraudulent attempt to steal credentials', 'A type of firewall rule', 'An encryption method'], correct: 1 },
        { q: 'What does 2FA stand for?', opts: ['Two-Factor Authentication', 'Two-File Authorization', 'Twice Firewall Auth', 'Two-Form Access'], correct: 0 },
        { q: 'What is Encryption?', opts: ['File compression', 'Encoding data so only authorized parties can read it', 'A network speed booster', 'A hardware security device'], correct: 1 },
        { q: 'What is a Firewall?', opts: ['A physical security camera', 'A system that controls network traffic', 'A type of database', 'A web API'], correct: 1 },
        { q: 'Which principle limits a user to only needed access?', opts: ['Defense in Depth', 'Least Privilege', 'Separation of Duty', 'Zero Trust'], correct: 1 },
        { q: 'What is a DDoS attack?', opts: ['Deleting data from servers', 'Overwhelming a server with traffic', 'Encrypting files for ransom', 'Stealing passwords'], correct: 1 },
        { q: 'What does HTTPS add to HTTP?', opts: ['Faster speed', 'Data encryption via TLS', 'File compression', 'Browser caching'], correct: 1 },
        { q: 'What is a security vulnerability?', opts: ['A bug that causes crashes', 'A weakness that can be exploited', 'Slow server performance', 'Poor documentation'], correct: 1 },
        { q: 'What is Social Engineering?', opts: ['Building social media apps', 'Manipulating people to divulge info', 'Engineering social systems', 'Network design'], correct: 1 },
    ],
    'Application Development': [
        { q: 'What is React?', opts: ['A server-side framework', 'A JavaScript library for building UIs', 'A relational database tool', 'A CSS preprocessor'], correct: 1 },
        { q: 'What are Props in React?', opts: ['Internal component state', 'Read-only data passed from parent to child', 'A lifecycle method', 'A CSS class'], correct: 1 },
        { q: 'What does JSX stand for?', opts: ['JSON Extension', 'JavaScript XML — HTML-like syntax in JS', 'Java Syntax Extra', 'JavaScript X-framework'], correct: 1 },
        { q: 'What is the Virtual DOM?', opts: ['A fake browser', 'A lightweight in-memory copy of the real DOM', 'A server-side renderer', 'A browser cache'], correct: 1 },
        { q: 'What is useEffect used for?', opts: ['Managing state', 'Running side effects after render', 'Creating context', 'Memoizing values'], correct: 1 },
        { q: 'What does useState return?', opts: ['A prop and a setter', 'A state value and updater function', 'A ref object', 'An effect handler'], correct: 1 },
        { q: 'What is a React Component?', opts: ['A CSS module', 'A reusable piece of UI', 'A database model', 'A server route'], correct: 1 },
        { q: 'What is Redux used for?', opts: ['Routing between pages', 'Centralized state management', 'Styling components', 'Making API calls'], correct: 1 },
        { q: 'What is React Router used for?', opts: ['Managing form state', 'Client-side navigation between pages', 'Making HTTP requests', 'Storing data locally'], correct: 1 },
        { q: 'What is a Hook in React?', opts: ['A CSS feature', 'A function that lets you use state in functional components', 'A server endpoint', 'A deployment tool'], correct: 1 },
    ],
};

/* ── HOT SEAT CONCEPT BANKS ─────────────────────────────────── */
const HOTSEAT_QB = {
    'Project Management': [
        { word: 'Agile', hint: 'Iterative, flexible project methodology' },
        { word: 'Sprint', hint: 'Time-boxed Agile iteration, usually 2 weeks' },
        { word: 'Scrum Master', hint: 'Facilitator who removes blockers for the team' },
        { word: 'Product Backlog', hint: 'Prioritized list of features to be built' },
        { word: 'Burndown Chart', hint: 'Visual showing work remaining over time' },
        { word: 'Velocity', hint: 'Amount of work a team completes per sprint' },
        { word: 'Retrospective', hint: 'Meeting to reflect on how the team can improve' },
        { word: 'Stakeholder', hint: 'Anyone with an interest in the project outcome' },
        { word: 'KPI', hint: 'Metric used to measure success toward a goal' },
        { word: 'Kanban', hint: 'Visual workflow board with columns like To-Do, Doing, Done' },
    ],
    'Information Security': [
        { word: 'Phishing', hint: 'Fake email that tricks you into giving your password' },
        { word: 'Firewall', hint: 'Guards your network by filtering traffic' },
        { word: 'Encryption', hint: 'Scrambles data so only authorized people can read it' },
        { word: 'Two-Factor Auth', hint: 'Login requires a second verification step beyond password' },
        { word: 'Malware', hint: 'Malicious software designed to harm a system' },
        { word: 'CIA Triad', hint: 'Confidentiality, Integrity, and Availability' },
        { word: 'Zero Trust', hint: 'Security model that trusts no one by default' },
        { word: 'DDoS', hint: 'Attack that floods a server with traffic to shut it down' },
        { word: 'VPN', hint: 'Encrypts your internet connection and hides your IP' },
        { word: 'Least Privilege', hint: 'Give users only the access they absolutely need' },
    ],
    'Application Development': [
        { word: 'React', hint: 'JavaScript library for building user interfaces' },
        { word: 'Component', hint: 'Reusable building block of a UI' },
        { word: 'Props', hint: 'Read-only data passed from a parent to a child element' },
        { word: 'useState', hint: 'React hook for tracking data that changes over time' },
        { word: 'Virtual DOM', hint: "React's lightweight copy of the real page structure" },
        { word: 'API', hint: 'Contract that lets two applications talk to each other' },
        { word: 'Redux', hint: 'Library for managing shared app state in one place' },
        { word: 'JSX', hint: 'HTML-like syntax written inside JavaScript' },
        { word: 'useEffect', hint: 'React hook that runs code after the component renders' },
        { word: 'React Router', hint: 'Library that handles page navigation without a reload' },
    ],
};

/* ── WORD JUMBLE BANK ───────────────────────────────────────── */
const JUMBLE_QB = {
    'Project Management': [
        { word: 'AGILE', hint: 'An iterative and flexible project methodology' },
        { word: 'SPRINT', hint: 'A time-boxed Agile iteration' },
        { word: 'KANBAN', hint: 'A visual workflow board' },
        { word: 'VELOCITY', hint: 'Amount of work completed per sprint' },
        { word: 'STAKEHOLDER', hint: 'A person with an interest in the project' },
        { word: 'RETROSPECTIVE', hint: 'Meeting where the team reflects and improves' },
        { word: 'BACKLOG', hint: 'Prioritized list of work or features' },
        { word: 'KPI', hint: 'Metric used to measure performance' }
    ],

    'Information Security': [
        { word: 'PHISHING', hint: 'A fraudulent attempt to steal information' },
        { word: 'FIREWALL', hint: 'Controls and filters network traffic' },
        { word: 'ENCRYPTION', hint: 'Protects data by converting it into coded form' },
        { word: 'MALWARE', hint: 'Malicious software' },
        { word: 'PASSWORD', hint: 'Secret information used to authenticate a user' },
        { word: 'FIREWALL', hint: 'Security system that filters network traffic' },
        { word: 'VPN', hint: 'Creates a protected network connection' },
        { word: 'PHISHING', hint: 'Fake communication designed to steal credentials' }
    ],

    'Application Development': [
        { word: 'REACT', hint: 'JavaScript library for building user interfaces' },
        { word: 'COMPONENT', hint: 'Reusable building block of a user interface' },
        { word: 'PROPS', hint: 'Read-only data passed from parent to child' },
        { word: 'JAVASCRIPT', hint: 'Programming language commonly used for web development' },
        { word: 'REDUX', hint: 'Library for centralized application state' },
        { word: 'JSX', hint: 'HTML-like syntax used inside JavaScript' },
        { word: 'API', hint: 'Allows applications to communicate with each other' },
        { word: 'ROUTER', hint: 'Handles navigation between application pages' }
    ]
};

const KAHOOT_COLORS = [
    { bg: 'rgba(239,68,68,.18)', border: 'rgba(239,68,68,.5)', text: '#ef4444', emoji: '🔴' },
    { bg: 'rgba(59,130,246,.18)', border: 'rgba(59,130,246,.5)', text: '#7eb3ff', emoji: '🔵' },
    { bg: 'rgba(245,158,11,.18)', border: 'rgba(245,158,11,.5)', text: '#f59e0b', emoji: '🟡' },
    { bg: 'rgba(34,197,94,.18)', border: 'rgba(34,197,94,.5)', text: '#4ade80', emoji: '🟢' },
];

/* =========================================================
   INSTRUCTOR TEACHING ASSIGNMENTS
   ========================================================= */

let gameInstructorAssignments = [];

async function loadGameInstructorAssignments() {

    console.log(
        '======================================'
    );

    console.log(
        'LOADING INSTRUCTOR TEACHING ASSIGNMENTS'
    );

    console.log(
        '======================================'
    );

    try {

        const response =
            await fetch(
                `../assets/php/get_instructor_assignments.php?game=1&tab=${gameTabId}`,
                {
                    method: 'GET',
                    credentials: 'same-origin',
                    cache: 'no-store'
                }
            );

        if (response.status === 401) {

            console.error(
                'Instructor is not logged in.'
            );

            window.location.href = 'Users.html';

            return false;
        }


        const result =
            await response.json();


        console.log(
            'INSTRUCTOR ASSIGNMENTS RESPONSE:',
            result
        );


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                'Unable to load teaching assignments.'
            );

        }


        gameInstructorAssignments =
            result.assignments || [];


        console.log(
            'GAME INSTRUCTOR ASSIGNMENTS:',
            gameInstructorAssignments
        );


        return true;


    } catch (error) {

        console.error(
            'LOAD INSTRUCTOR ASSIGNMENTS ERROR:',
            error
        );

        showToast(
            '⚠️',
            error.message ||
            'Unable to load teaching assignments.'
        );

        return false;

    }

}

function populateGameSections() {

    const sectionSelect =
        document.getElementById(
            'cfg-section'
        );

    if (!sectionSelect) {
        return;
    }


    const sections = [
        ...new Set(
            gameInstructorAssignments
                .map(
                    assignment =>
                        String(
                            assignment.section || ''
                        ).trim()
                )
                .filter(Boolean)
        )
    ];


    sectionSelect.innerHTML = '';


    if (!sections.length) {

        sectionSelect.innerHTML =
            '<option value="">No assigned sections</option>';

        return;
    }


    sections.forEach(section => {

        const option =
            document.createElement('option');

        option.value =
            section;

        option.textContent =
            section;

        sectionSelect.appendChild(
            option
        );

    });


    /*
     * If game.html was launched from
     * Instructor Portal, preserve the
     * section from the URL.
     */

    if (
        launchSection &&
        sections.includes(launchSection)
    ) {

        sectionSelect.value =
            launchSection;

    } else {

        const preferredSection =
        launchSection &&
        sections.includes(launchSection)
        ? launchSection
        : sections[0];

        sectionSelect.value =
        preferredSection;

        updateGameTopics();

    }

}

function setupGameSelectors() {

    const sectionSelect =
        document.getElementById(
            'cfg-section'
        );

    if (!sectionSelect) {
        return;
    }


    sectionSelect.addEventListener(
        'change',
        () => {

            populateGameTopics();

        }
    );

}

function populateGameTopics() {

    const sectionSelect =
        document.getElementById(
            'cfg-section'
        );

    const topicSelect =
        document.getElementById(
            'cfg-topic'
        );

    if (
        !sectionSelect ||
        !topicSelect
    ) {
        return;
    }


    const selectedSection =
        String(
            sectionSelect.value || ''
        ).trim();


    const topics = [
        ...new Set(
            gameInstructorAssignments
                .filter(
                    assignment =>
                        String(
                            assignment.section || ''
                        ).trim() ===
                        selectedSection
                )
                .map(
                    assignment =>
                        String(
                            assignment.subject_name || ''
                        ).trim()
                )
                .filter(Boolean)
        )
    ];


    topicSelect.innerHTML = '';


    if (!topics.length) {

        topicSelect.innerHTML =
            '<option value="">No assigned subjects</option>';

        return;
    }


    topics.forEach(topic => {

        const option =
            document.createElement('option');

        option.value =
            topic;

        option.textContent =
            topic;

        topicSelect.appendChild(
            option
        );

    });


    /*
     * Preserve topic passed from
     * Instructor Portal when possible.
     */

    if (
        launchTopic &&
        topics.includes(launchTopic)
    ) {

        topicSelect.value =
            launchTopic;

    } else {

        topicSelect.value =
            topics[0];

    }

}

/* =========================================================
   CLASSROOM GAME CONFIGURATION
   ========================================================= */

const gameURLParams =
    new URLSearchParams(
        window.location.search
    );


const launchMode =
    gameURLParams.get('mode') || '';


const launchSection =
    gameURLParams.get('section') || '';


const launchTopic =
    gameURLParams.get('topic') || '';


const launchDuration =
    Number(
        gameURLParams.get('duration')
    ) || 15;


console.log(
    '======================================'
);

console.log(
    'CLASSROOM GAME CONFIGURATION'
);

console.log(
    'Mode:',
    launchMode
);

console.log(
    'Section:',
    launchSection
);

console.log(
    'Topic:',
    launchTopic
);

console.log(
    'Duration:',
    launchDuration
);

console.log(
    '======================================'
);

/* =========================================================
   LOAD QUESTIONS FROM DATABASE
   ========================================================= */

async function loadDatabaseQuestions() {

    console.log('======================================');
    console.log('LOADING QUESTIONS FROM DATABASE');
    console.log('======================================');


    if (!launchMode || !launchSection || !launchTopic) {

        console.error(
            'Missing game configuration:',
            {
                mode: launchMode,
                section: launchSection,
                topic: launchTopic
            }
        );

        return [];

    }


    const params =
        new URLSearchParams({

            section:
                launchSection,

            topic:
                launchTopic,

            game_mode:
                launchMode

        });


    console.log(
        'Requesting:',
        `../assets/php/get_game_questions.php?${params.toString()}&game=1&tab=${gameTabId}`
    );


    try {

        const response =
            await fetch(
                `../assets/php/get_game_questions.php?${params.toString()}&game=1&tab=${gameTabId}`,
                {
                    method: 'GET',

                    credentials:
                        'same-origin',

                    cache:
                        'no-store'
                }
            );


        console.log(
            'GAME QUESTIONS API STATUS:',
            response.status
        );


        const result =
            await response.json();


        console.log(
            'GAME QUESTIONS API RESPONSE:',
            result
        );


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                'Failed to load game questions.'
            );

        }


        console.log(
            'DATABASE QUESTIONS LOADED:',
            result.questions
        );


        return result.questions || [];


    } catch (error) {

        console.error(
            'DATABASE QUESTION LOAD ERROR:',
            error
        );

        return [];

    }

}


/* ── STATE ──────────────────────────────────────────────────── */
let mode = null;
let questions = [];
let qIdx = 0;
let classCorrect = 0;
let buzzerA = 0;
let buzzerB = 0;
let kahootAnswered = false;
let kahootScore = 0;
let kahootCorrect = 0;
let timer = null;
let elapsed = 0;
let duration = 0;

// Hot Seat state
let hsQuestions = [];
let hsIdx = 0;
let hsScoreA = 0;
let hsScoreB = 0;
let hsTurn = 'A';
let hsCountdown = null;
let hsTimeLeft = 60;

// Word Jumble state
let jumbleQuestions = [];
let jumbleIdx = 0;
let jumbleScore = 0;
let jumbleCurrent = null;
let jumbleLocked = false;

/* ══ CROSSWORD STATE ══ */

let cwQuestions = [];
let cwIdx = 0;

let cwScoreA = 0;
let cwScoreB = 0;

let cwTurn = 'A';
let cwStealAttempt = false;
let cwStealPending = false;

let cwSolved = 0;

let cwGrid = [];

let gameAssignments = [];

/* =========================================================
   LOAD INSTRUCTOR ASSIGNMENTS FOR GAME LOBBY
   ========================================================= */

async function loadGameAssignments() {

    const sectionSelect =
        document.getElementById('cfg-section');

    const topicSelect =
        document.getElementById('cfg-topic');


    if (!sectionSelect || !topicSelect) {
        return;
    }


    try {

        const response =
            await fetch(
                `../assets/php/get_instructor_assignments.php?game=1&tab=${gameTabId}`,
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
                'Failed to load instructor assignments.'
            );

        }


        gameAssignments =
            result.assignments || [];


        console.log(
            'GAME ASSIGNMENTS:',
            gameAssignments
        );


        populateGameSections();


    } catch (error) {

        console.error(
            'GAME ASSIGNMENT LOAD ERROR:',
            error
        );


        sectionSelect.innerHTML =
            '<option value="">Unable to load sections</option>';

        topicSelect.innerHTML =
            '<option value="">Unable to load subjects</option>';

    }

}

/* =========================================================
   POPULATE SECTION DROPDOWN
   ========================================================= */
function populateGameSections() {

    const sectionSelect =
        document.getElementById('cfg-section');

    if (!sectionSelect) {
        return;
    }


    const sections = [
        ...new Set(

            gameAssignments

                .map(
                    assignment =>
                        String(
                            assignment.section || ''
                        ).trim()
                )

                .filter(Boolean)

        )
    ];


    sectionSelect.innerHTML = '';


    if (!sections.length) {

        sectionSelect.innerHTML =
            '<option value="">No assigned sections</option>';

        updateGameTopics();

        return;
    }


    sections.forEach(section => {

        const option =
            document.createElement('option');

        option.value =
            section;

        option.textContent =
            section;

        sectionSelect.appendChild(option);

    });


    sectionSelect.value =
        sections[0];


    updateGameTopics();


    sectionSelect.onchange =
        function () {

            updateGameTopics();

        };

}

/* =========================================================
   POPULATE SUBJECTS FOR SELECTED SECTION
   ========================================================= */

function updateGameTopics() {

    const sectionSelect =
        document.getElementById('cfg-section');

    const topicSelect =
        document.getElementById('cfg-topic');


    if (
        !sectionSelect ||
        !topicSelect
    ) {
        return;
    }


    const selectedSection =
        String(
            sectionSelect.value || ''
        ).trim();


    const topics = [
        ...new Set(

            gameAssignments

                .filter(assignment => {

                    return (
                        String(
                            assignment.section || ''
                        ).trim()
                        ===
                        selectedSection
                    );

                })

                .map(assignment => {

                    return String(
                        assignment.subject_name || ''
                    ).trim();

                })

                .filter(Boolean)

        )
    ];


    topicSelect.innerHTML = '';


    if (!topics.length) {

        topicSelect.innerHTML =
            '<option value="">No assigned subjects</option>';

        return;
    }


    topics.forEach(topic => {

        const option =
            document.createElement('option');

        option.value =
            topic;

        option.textContent =
            topic;

        topicSelect.appendChild(option);

    });


    const preferredTopic =
    launchTopic &&
    topics.includes(launchTopic)
        ? launchTopic
        : topics[0];

    topicSelect.value =
    preferredTopic;

}

/* ── MODE SELECT ────────────────────────────────────────────── */
function selectMode(m, el) {
    mode = m;
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    document.querySelector('.btn-exit-game').innerHTML = '<i data-lucide="log-out" aria-hidden="true"></i> Quit game';
    if (window.lucide) lucide.createIcons();
    const btn = document.getElementById('btn-start');
    const labels = {
        buzzer: '🔔 Start Team Buzzer',
        kahoot: '🏆 Start Kahoot Battle',
        hotseat: '🪑 Start Hot Seat',
        jumble: '🔀 Start Word Jumble',
        crossword: '🧩 Start Crossword',
    };
    btn.textContent = labels[m];
    btn.disabled = false;
}

/* =========================================================
   LOAD CLASSROOM GAME QUESTIONS FROM DATABASE
   ========================================================= */

async function loadGameQuestionsFromDatabase(mode, section, topic) {

    console.log('======================================');
    console.log('LOADING GAME QUESTIONS FROM DATABASE');
    console.log('Mode:', mode);
    console.log('Section:', section);
    console.log('Topic:', topic);
    console.log('======================================');


    const params = new URLSearchParams({

        game_mode: mode,
        section: section,
        topic: topic

    });


    try {

        const response = await fetch(
            `../assets/php/get_game_questions.php?${params.toString()}&game=1&tab=${gameTabId}`,
            {
                method: 'GET',
                credentials: 'same-origin',
                cache: 'no-store'
            }
        );


        console.log(
            'GET GAME QUESTIONS STATUS:',
            response.status
        );


        const result =
            await response.json();


        console.log(
            'GET GAME QUESTIONS RESPONSE:',
            result
        );


        if (
            !response.ok ||
            !result.success
        ) {

            throw new Error(
                result.message ||
                'Failed to load classroom game questions.'
            );

        }


        console.log(
            'DATABASE QUESTIONS:',
            result.questions
        );


        return result.questions || [];


    } catch (error) {

        console.error(
            'LOAD GAME QUESTIONS ERROR:',
            error
        );


        showToast(
            '⚠️',
            error.message ||
            'Unable to load classroom game questions.'
        );


        return [];

    }

}


/* ── START ──────────────────────────────────────────────────── */

async function startGame() {

    if (!mode) {
        return;
    }


    const topic =
    document.getElementById(
        'cfg-topic'
    )?.value ||
    '';


    const section =
    document.getElementById(
        'cfg-section'
    )?.value ||
    '';


duration =
    launchDuration * 60;

    /*
     * Reset game state.
     */

    elapsed = 0;

    qIdx = 0;

    classCorrect = 0;

    buzzerA = 0;

    buzzerB = 0;

    kahootAnswered = false;

    kahootScore = 0;
    kahootCorrect = 0;


    /*
     * =========================================================
     * LOAD QUESTIONS FROM DATABASE
     * =========================================================
     */

    questions =
        await loadGameQuestionsFromDatabase(
            mode,
            section,
            topic
        );


    /*
     * Make sure questions actually exist.
     */

    if (!questions.length) {

        showToast(
            '⚠️',
            'No classroom game questions were found for this section and topic.'
        );

        console.warn(
            'No database questions found.'
        );

        return;

    }


    gameInProgress = true;
    document.querySelector('.btn-exit-game').innerHTML = '<i data-lucide="log-out" aria-hidden="true"></i> Quit game';
    if (window.lucide) lucide.createIcons();

    console.log(
        'FINAL GAME QUESTIONS:',
        questions
    );

    console.log(
    'BUZZER QUESTION TEXT:',
    questions[0]?.question_text
);


    /*
     * =========================================================
     * UPDATE GAME HEADER
     * =========================================================
     */

    document.getElementById(
        'nav-mode'
    ).textContent =

        mode === 'buzzer'
            ? '🔔 Team Buzzer'

        : mode === 'kahoot'
            ? '🏆 Kahoot'

        : mode === 'hotseat'
            ? '🪑 Hot Seat'

        : mode === 'jumble'
            ? '🔀 Word Jumble'

        : mode === 'crossword'
            ? '🧩 Crossword'

        : 'Waiting';


    /*
     * Hide lobby.
     */

    document.getElementById(
        'lobby'
    ).style.display = 'none';


    /*
     * Start timer.
     */

    startTimer();


    /*
     * Start selected game.
     */

    if (
        mode === 'buzzer'
    ) {

        showBuzzerQ();

    }


    if (
        mode === 'kahoot'
    ) {

        showKahootQ();

    }


    if (
        mode === 'hotseat'
    ) {

        startHotSeatFromDatabase();

    }


    if (
        mode === 'jumble'
    ) {

        startJumbleFromDatabase();

    }


    if (
        mode === 'crossword'
    ) {

        startCrosswordFromDatabase();

    }

}


/* ── TIMER ──────────────────────────────────────────────────── */
function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        elapsed++;
        const rem = Math.max(0, duration - elapsed);
        const m = String(Math.floor(rem / 60)).padStart(2, '0');
        const s = String(rem % 60).padStart(2, '0');
        const el = document.getElementById('nav-timer');
        if (el) {
            el.textContent = m + ':' + s;
            el.style.color = rem <= 30 ? '#ef4444' : rem <= 60 ? '#f59e0b' : '#fff';
        }
        if (rem <= 0) {
            clearInterval(timer);
            endGame();
        }
    }, 1000);
}

function stopTimer() { clearInterval(timer); }

/* ── TEAM BUZZER ────────────────────────────────────────────── */

function showBuzzerQ() {

    if (qIdx >= questions.length) {
        endGame();
        return;
    }

    const q = questions[qIdx];

    console.log('======================================');
    console.log('TEAM BUZZER QUESTION');
    console.log('Question object:', q);
    console.log('question_text:', q.question_text);
    console.log('question:', q.question);
    console.log('q:', q.q);
    console.log('======================================');

    document
        .getElementById('area-buzzer')
        .classList
        .add('active');

    document
        .getElementById('buzzer-q-num')
        .textContent =
        `QUESTION ${qIdx + 1} OF ${questions.length}`;

    const questionText =
        q.question_text ||
        q.question ||
        q.text ||
        q.q ||
        '';

    console.log(
        'DISPLAYING BUZZER QUESTION:',
        questionText
    );

    document
        .getElementById('buzzer-q-text')
        .textContent =
        questionText;

    document
        .getElementById('buzzer-prog-fill')
        .style.width =
        `${(qIdx / questions.length) * 100}%`;

    document
        .getElementById('buzzer-prog-label')
        .textContent =
        `${qIdx}/${questions.length}`;

    document
        .getElementById('buzzer-score-a')
        .textContent =
        buzzerA;

    document
        .getElementById('buzzer-score-b')
        .textContent =
        buzzerB;
}

function buzzerScore(team) {
    if (team === 'A') buzzerA++;
    else buzzerB++;
    document.getElementById('buzzer-score-a').textContent = buzzerA;
    document.getElementById('buzzer-score-b').textContent = buzzerB;
    showToast('🎯', `Team ${team === 'A' ? 'Alpha' : 'Beta'} scored! (${buzzerA} – ${buzzerB})`);
    qIdx++;
    if (qIdx >= questions.length) { endGame(); return; }
    showBuzzerQ();
}

function nextBuzzer() {
    qIdx++;
    if (qIdx >= questions.length) { endGame(); return; }
    showBuzzerQ();
}

/* ── KAHOOT TRUE / FALSE STYLES ─────────────────────────────── */
function injectKahootTrueFalseStyles() {

    if (document.getElementById('kahoot-true-false-styles')) {
        return;
    }

    const style = document.createElement('style');
    style.id = 'kahoot-true-false-styles';

    style.textContent = `
        /* Make the question card wide enough for two large buttons */
        .kahoot-true-false-card {
            width: min(92vw, 1150px) !important;
            box-sizing: border-box !important;
            padding: 34px 36px 36px !important;
        }

        /* Two large buttons side-by-side */
        .kahoot-true-false-options {
            width: 100% !important;
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 22px !important;
            margin-top: 30px !important;
            box-sizing: border-box !important;
        }

        /* True / False buttons */
        .kahoot-true-false-options .kahoot-tile {
            width: 100% !important;
            min-height: 170px !important;
            height: 170px !important;
            box-sizing: border-box !important;

            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            justify-content: center !important;

            gap: 16px !important;

            border-width: 3px !important;
            border-radius: 22px !important;

            cursor: pointer !important;
        }

        /* Large colored circle */
        .kahoot-true-false-options .kt-emoji {
            font-size: 3rem !important;
            line-height: 1 !important;
        }

        /* True / False text */
        .kahoot-true-false-options .kt-text {
            font-size: clamp(1.5rem, 2.6vw, 2.25rem) !important;
            font-weight: 800 !important;
            line-height: 1.1 !important;
            text-align: center !important;
        }

        /* Smaller screens */
        @media (max-width: 700px) {

            .kahoot-true-false-card {
                width: 94vw !important;
                padding: 24px 18px 24px !important;
            }

            .kahoot-true-false-options {
                gap: 12px !important;
                margin-top: 22px !important;
            }

            .kahoot-true-false-options .kahoot-tile {
                min-height: 130px !important;
                height: 130px !important;
                border-radius: 16px !important;
            }

            .kahoot-true-false-options .kt-emoji {
                font-size: 2.2rem !important;
            }

            .kahoot-true-false-options .kt-text {
                font-size: 1.25rem !important;
            }
        }
    `;

    document.head.appendChild(style);
}


/* ── KAHOOT BATTLE ──────────────────────────────────────────── */
function showKahootQ() {

    if (qIdx >= questions.length) {
        endGame();
        return;
    }

    const q = questions[qIdx];

    kahootAnswered = false;

    document
        .getElementById('area-kahoot')
        .classList.add('active');

    document
        .getElementById('kahoot-feedback')
        .className = 'feedback-banner';

    document
        .getElementById('kahoot-q-num')
        .textContent =
        `QUESTION ${qIdx + 1} OF ${questions.length}`;

    document
        .getElementById('kahoot-q-text')
        .textContent =
        q.question_text || q.q || '';

    document
        .getElementById('kahoot-prog-fill')
        .style.width =
        `${(qIdx / questions.length) * 100}%`;

    document
        .getElementById('kahoot-prog-label')
        .textContent =
        `${qIdx}/${questions.length}`;


    const nextBtn =
        document.getElementById(
            'kahoot-next-btn'
        );

    nextBtn.style.opacity = '.4';
    nextBtn.style.pointerEvents = 'none';


    /*
     * =====================================================
     * TRUE / FALSE
     * =====================================================
     */

    const questionType = String(
    q.question_type ||
    q.type ||
    ''
).trim().toLowerCase();

const answerValue = String(
    q.answer ||
    q.correct_answer ||
    ''
).trim().toLowerCase();

const isTrueFalse =
    questionType === 'true_false' ||
    questionType === 'true-false' ||
    questionType === 'true/false' ||
    questionType === 'truefalse' ||
    (
        ['true', 'false'].includes(answerValue) &&
        !q.option_c &&
        !q.option_d
    );


    if (isTrueFalse) {

    const opts = [
        'True',
        'False'
    ];

    const correctAnswer =
        String(
            q.answer ||
            q.correct_answer ||
            'True'
        )
        .trim()
        .toLowerCase();

    q.opts = opts;

    q.correct =
        correctAnswer === 'false'
            ? 1
            : 0;


    const kahootOptions =
        document.getElementById('kahoot-options');


    /*
     * Render only True and False.
     * No A / B / C / D labels.
     */
    kahootOptions.innerHTML =
        opts
            .map((opt, i) => `
                <div
                    class="kahoot-tile"
                    id="ktile-${i}"
                    style="
                        background:${KAHOOT_COLORS[i].bg};
                        border-color:${KAHOOT_COLORS[i].border};
                        color:${KAHOOT_COLORS[i].text}
                    "
                    onclick="kahootReveal(${i})"
                >

                    <div class="kt-emoji">
                        ${KAHOOT_COLORS[i].emoji}
                    </div>

                    <div class="kt-text">
                        ${opt}
                    </div>

                </div>
            `)
            .join('');


    /*
     * Move the True / False buttons
     * inside the question card.
     */
    const qTextElement =
        document.getElementById('kahoot-q-text');

    const questionCard =
        qTextElement?.parentElement;


    if (questionCard) {

        /*
         * Save the normal position of the
         * options container so it can be
         * restored for multiple choice.
         */
        if (!window._kahootOptionsOriginalParent) {

            window._kahootOptionsOriginalParent =
                kahootOptions.parentElement;

            window._kahootOptionsOriginalNextSibling =
                kahootOptions.nextSibling;
        }


        /*
         * Put True / False inside
         * the question card.
         */
        questionCard.classList.add(
            'kahoot-true-false-card'
        );

        questionCard.appendChild(
            kahootOptions
        );
    }


    /*
     * Apply the special True / False layout.
     */
    kahootOptions.classList.add(
        'kahoot-true-false-options'
    );

    injectKahootTrueFalseStyles();

    return;
}

/*
 * Restore the normal Multiple Choice layout.
 */
const kahootOptions =
    document.getElementById('kahoot-options');

if (kahootOptions) {

    kahootOptions.classList.remove(
        'kahoot-true-false-options'
    );

    if (window._kahootOptionsOriginalParent) {

        window._kahootOptionsOriginalParent.insertBefore(
            kahootOptions,
            window._kahootOptionsOriginalNextSibling
        );
    }
}


/*
 * Remove the special True / False
 * question-card styling.
 */
const previousQuestionCard =
    document.querySelector(
        '.kahoot-true-false-card'
    );

if (previousQuestionCard) {

    previousQuestionCard.classList.remove(
        'kahoot-true-false-card'
    );
}


    /*
     * =====================================================
     * MULTIPLE CHOICE
     * =====================================================
     */

    const opts = [
        q.option_a || '',
        q.option_b || '',
        q.option_c || '',
        q.option_d || ''
    ];

    q.opts = opts;


    const correctAnswer =
        String(
            q.answer ||
            q.correct_answer ||
            'A'
        )
        .trim()
        .toUpperCase();


    q.correct =
        ['A', 'B', 'C', 'D']
            .indexOf(correctAnswer);

    if (q.correct < 0) {
        q.correct = 0;
    }


    document
        .getElementById('kahoot-options')
        .innerHTML =
        opts
            .map((opt, i) => `
                <div
                    class="kahoot-tile"
                    id="ktile-${i}"
                    style="
                        background:${KAHOOT_COLORS[i].bg};
                        border-color:${KAHOOT_COLORS[i].border};
                        color:${KAHOOT_COLORS[i].text}
                    "
                    onclick="kahootReveal(${i})"
                >

                    <div class="kt-emoji">
                        <svg class="kahoot-shape" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path fill="currentColor" d="${['M16 3 L30 28 H2 Z', 'M4 4 H28 V28 H4 Z', 'M16 2 A14 14 0 1 0 16 30 A14 14 0 1 0 16 2', 'M16 1 L31 16 L16 31 L1 16 Z'][i]}"/></svg>
                    </div>

                    <div class="kt-text">
                        ${opt}
                    </div>

                </div>
            `)
            .join('');
}

function kahootReveal(picked) {

    if (kahootAnswered) {
        return;
    }


    kahootAnswered = true;


    const q =
        questions[qIdx];


    const tiles =
        document.querySelectorAll(
            '.kahoot-tile'
        );


    /*
     * Reveal the correct answer.
     */

    tiles.forEach((t, i) => {

        t.onclick = null;

        t.style.cursor =
            'default';


        if (i === q.correct) {

            t.classList.add(
                'correct'
            );

            t.style.transform =
                'scale(1.04)';

        } else {

            t.classList.add(
                'wrong'
            );

        }

    });


    /*
     * Check answer.
     */

    const correct =
        picked === q.correct;

    const fb =
        document.getElementById(
            'kahoot-feedback'
        );


    /*
     * Get this question's points.
     */

    const points =
        Math.max(
            0,
            Number(q.points) || 0
        );


    if (correct) {

        kahootCorrect++;

        kahootScore += points;


        fb.textContent =
            `✅ Correct! +${points} points — ` +
            `${String.fromCharCode(65 + q.correct)}. ` +
            `${q.opts[q.correct]}`;


        fb.className =
            'feedback-banner correct';


        showToast(
            '🎯',
            `Correct! +${points} points`
        );

    } else {

        fb.textContent =
            `❌ Incorrect! ` +
            `Answer: ${String.fromCharCode(65 + q.correct)}. ` +
            `${q.opts[q.correct]}`;


        fb.className =
            'feedback-banner neutral';


        showToast(
            '❌',
            'Incorrect — 0 points'
        );

    }


    /*
     * Enable Next button.
     */

    const nextBtn =
        document.getElementById(
            'kahoot-next-btn'
        );


    nextBtn.style.opacity =
        '1';

    nextBtn.style.pointerEvents =
        'auto';

}

function nextKahoot() {
    if (!kahootAnswered) { showToast('⚠️', 'Reveal the answer first!'); return; }
    qIdx++;
    document.getElementById('area-kahoot').classList.remove('active');
    setTimeout(() => {
        if (qIdx >= questions.length) { endGame(); return; }
        showKahootQ();
    }, 200);
}


/* ══════════════════════════════════════════════════════════════
   🪑 HOT SEAT
   ══════════════════════════════════════════════════════════════ */

function startHotSeatFromDatabase() {

    console.log(
        'Starting Hot Seat with database questions:',
        questions
    );

    hsQuestions = questions.map(item => ({

        word:
            item.word ||
            item.answer ||
            '',

        hint:
            item.hint ||
            ''

    }));


    /* Shuffle database questions */

    for (
        let i = hsQuestions.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            hsQuestions[i],
            hsQuestions[j]
        ] = [
            hsQuestions[j],
            hsQuestions[i]
        ];

    }


    hsIdx = 0;

    hsScoreA = 0;

    hsScoreB = 0;

    hsTurn = 'A';


    document
        .getElementById('area-hotseat')
        .classList
        .add('active');


    showHotSeatCard();

}

function showHotSeatCard() {
    if (hsIdx >= hsQuestions.length) { endGame(); return; }
    const item = hsQuestions[hsIdx];

    const badge = document.getElementById('hs-turn-badge');
    if (hsTurn === 'A') {
        badge.textContent = "🔵 Team Alpha's Turn";
        badge.classList.remove('beta');
    } else {
        badge.textContent = "🩷 Team Beta's Turn";
        badge.classList.add('beta');
    }

    document.getElementById('hs-card-num').textContent = `ROUND ${hsIdx + 1} OF ${hsQuestions.length}`;
    document.getElementById('hs-concept-word').textContent = item.word;
    document.getElementById('hs-concept-hint').textContent = `💡 Hint for teacher: ${item.hint}`;
    document.getElementById('hs-score-a').textContent = hsScoreA;
    document.getElementById('hs-score-b').textContent = hsScoreB;
    document.getElementById('hs-prog-fill').style.width = `${(hsIdx / hsQuestions.length) * 100}%`;
    document.getElementById('hs-prog-label').textContent = `${hsIdx}/${hsQuestions.length}`;

    hsTimeLeft = 60;
    updateHsRing(60);
    document.getElementById('hs-countdown-num').textContent = '60';
    document.getElementById('hs-countdown-num').classList.remove('urgent');
    clearInterval(hsCountdown);
    hsCountdown = setInterval(() => {
        hsTimeLeft--;
        updateHsRing(hsTimeLeft);
        const numEl = document.getElementById('hs-countdown-num');
        numEl.textContent = hsTimeLeft;
        if (hsTimeLeft <= 10) numEl.classList.add('urgent');
        if (hsTimeLeft <= 0) {
            clearInterval(hsCountdown);
            showToast('⏰', "Time's up! No point awarded.");
            advanceHotSeat(false);
        }
    }, 1000);
}

function updateHsRing(timeLeft) {
    const fill = document.getElementById('hs-ring-fill');
    if (!fill) return;
    const circumference = 326.7;
    fill.style.strokeDashoffset = circumference * (1 - timeLeft / 60);
    fill.style.stroke = timeLeft > 30 ? '#4ade80' : timeLeft > 10 ? '#f59e0b' : '#ef4444';
}

function hotSeatResult(correct) {
    clearInterval(hsCountdown);
    if (correct) {
        if (hsTurn === 'A') hsScoreA++;
        else hsScoreB++;
        showToast('🎯', `Team ${hsTurn === 'A' ? 'Alpha' : 'Beta'} gets a point!`);
    }
    advanceHotSeat(correct);
}

function advanceHotSeat() {
    hsIdx++;
    hsTurn = hsTurn === 'A' ? 'B' : 'A';
    if (hsIdx >= hsQuestions.length) { endGame(); return; }
    showHotSeatCard();
}

/* ── WORD JUMBLE ─────────────────────────────────────────────── */

function shuffleWord(word) {
    const chars = word.split('');

    for (let i = chars.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    const shuffled = chars.join('');

    // Try again if the shuffle accidentally produces the original word
    if (shuffled === word && word.length > 2) {
        return shuffleWord(word);
    }

    return shuffled;
}

function startJumbleFromDatabase() {
    jumbleQuestions = questions.map(item => ({

    word:
        item.correct_word ||
        item.answer ||
        '',

    jumble:
        item.jumble ||
        item.jumbled_word ||
        '',

    hint:
        item.hint ||
        ''

}));

    for (let i = jumbleQuestions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [jumbleQuestions[i], jumbleQuestions[j]] =
            [jumbleQuestions[j], jumbleQuestions[i]];
    }

    jumbleIdx = 0;
    jumbleScore = 0;

    document.getElementById('area-jumble').classList.add('active');

    showJumbleWord();
}

function showJumbleWord() {
    if (jumbleIdx >= jumbleQuestions.length) {
        endGame();
        return;
    }

    const item = jumbleQuestions[jumbleIdx];

    jumbleCurrent = item;

    jumbleLocked = false;

    const scrambled = shuffleWord(
        item.word.replace(/\s/g, '').toUpperCase()
    );

    document.getElementById('jumble-q-num').textContent =
        `WORD ${jumbleIdx + 1} OF ${jumbleQuestions.length}`;

    document.getElementById('jumble-word').textContent =
        scrambled;

    document.getElementById('jumble-hint').textContent =
        item.hint;

    document.getElementById('jumble-answer').value = '';

    document.getElementById('jumble-feedback').textContent = '';

    document.getElementById('jumble-prog-fill').style.width =
        `${(jumbleIdx / jumbleQuestions.length) * 100}%`;

    document.getElementById('jumble-prog-label').textContent =
        `${jumbleIdx}/${jumbleQuestions.length}`;

    document.getElementById('jumble-answer').focus();
}

function checkJumble() {
    if (!jumbleCurrent || jumbleLocked) return;

    const input = document.getElementById('jumble-answer')
        .value
        .trim()
        .toUpperCase()
        .replace(/\s/g, '');

    const answer = jumbleCurrent.word
        .toUpperCase()
        .replace(/\s/g, '');

    const feedback = document.getElementById('jumble-feedback');

    if (input === answer) {
        jumbleScore++;
        jumbleLocked = true;

        feedback.textContent =
            `✅ Correct! The answer is ${jumbleCurrent.word}.`;

        showToast('🎯', 'Correct answer!');

        setTimeout(() => {
            jumbleIdx++;

            if (jumbleIdx >= jumbleQuestions.length) {
                endGame();
            } else {
                showJumbleWord();
            }
        }, 1000);

    } else {
        feedback.textContent =
            '❌ Not quite. Try again!';

        showToast('❌', 'Try again!');
    }
}

function skipJumble() {

    if (!jumbleCurrent || jumbleLocked) return;

    jumbleLocked = true;

    const feedback =
        document.getElementById('jumble-feedback');

    feedback.textContent =
        `⏭ Skipped! The answer is ${jumbleCurrent.word}.`;

    showToast(
        '⏭',
        `Skipped! Answer: ${jumbleCurrent.word}`
    );

    setTimeout(() => {

        jumbleIdx++;

        if (jumbleIdx >= jumbleQuestions.length) {

            endGame();

        } else {

            showJumbleWord();

        }

    }, 1000);
}

/* =========================================================
   CROSSWORD — PERSISTENT ERROR MESSAGE
   ========================================================= */

function showPersistentCrosswordMessage(message) {

    const existing =
        document.getElementById(
            'crossword-persistent-message'
        );

    if (existing) {
        existing.remove();
    }

    const styleId =
        'crossword-persistent-message-style';

    if (!document.getElementById(styleId)) {

        const style =
            document.createElement('style');

        style.id = styleId;

        style.textContent =
            '#crossword-persistent-message {' +
            'position:fixed;' +
            'right:24px;' +
            'bottom:24px;' +
            'width:min(390px,calc(100vw - 48px));' +
            'background:#211d3f;' +
            'color:#fff;' +
            'border:1px solid #514b7a;' +
            'border-left:4px solid #ff6b6b;' +
            'border-radius:12px;' +
            'box-shadow:0 12px 35px rgba(0,0,0,.35);' +
            'padding:16px 48px 16px 18px;' +
            'z-index:99999;' +
            'font-size:14px;' +
            'line-height:1.5;' +
            '}' +

            '#crossword-persistent-message strong {' +
            'display:block;' +
            'margin-bottom:6px;' +
            'font-size:15px;' +
            '}' +

            '#crossword-persistent-message .cw-message-close {' +
            'position:absolute;' +
            'top:8px;' +
            'right:10px;' +
            'width:28px;' +
            'height:28px;' +
            'border:0;' +
            'border-radius:6px;' +
            'background:transparent;' +
            'color:#fff;' +
            'font-size:20px;' +
            'line-height:28px;' +
            'cursor:pointer;' +
            '}' +

            '#crossword-persistent-message .cw-message-close:hover {' +
            'background:rgba(255,255,255,.10);' +
            '}';

        document.head.appendChild(style);
    }

    const box =
        document.createElement('div');

    box.id =
        'crossword-persistent-message';

    box.innerHTML =
        '<button type="button" ' +
        'class="cw-message-close" ' +
        'aria-label="Close">×</button>' +

        '<strong>⚠️ Crossword cannot be generated</strong>' +

        '<div>' +
        message +
        '</div>';

    box
        .querySelector('.cw-message-close')
        .addEventListener(
            'click',
            () => {
                box.remove();
            }
        );

    document.body.appendChild(box);
}

/* =========================================================
   CROSSWORD — DATABASE START
   ========================================================= */

function startCrosswordFromDatabase() {

    console.log(
        'Starting Crossword with database questions:',
        questions
    );


    /*
     * Convert database questions into the format
     * expected by the Crossword engine.
     */

    cwQuestions = questions
        .map(item => ({

            question_id:
                item.question_id,

            answer:
                (
                    item.answer ||
                    ''
                )
                .trim()
                .toUpperCase()
                .replace(/\s/g, ''),

            clue:
                item.clue ||
                item.hint ||
                ''

        }))
        .filter(item =>
            item.answer.length > 0 &&
            item.clue.length > 0
        );


    console.log(
        'CROSSWORD DATABASE QUESTIONS:',
        cwQuestions
    );


    if (!cwQuestions.length) {

        showToast(
            '⚠️',
            'No Crossword questions were found.'
        );

        console.warn(
            'No valid Crossword database questions.'
        );

        return;

    }


    /*
     * Crossword currently uses a 5×5 board.
     */

    const crosswordData =
    generateDatabaseCrossword(
        cwQuestions
    );


if (
    !crosswordData ||
    !crosswordData.clues
) {

    const failedWord =
        crosswordData &&
        crosswordData.failedWord
            ? crosswordData.failedWord
            : null;

    showPersistentCrosswordMessage(
        failedWord
            ? `The word <strong>${failedWord}</strong> could not be connected with the other words in the crossword. Please remove or edit this question, then try again.`
            : 'The questions could not be arranged together. Please remove or edit one or more questions, then try again.'
    );

    console.error(
        'Unable to generate a Crossword with all database questions.'
    );

    return;

}

    /*
     * Replace the questions with the generated
     * Crossword clues containing their cell positions.
     */

    cwQuestions =
        crosswordData.clues;


    cwIdx = 0;

    cwScoreA = 0;

    cwScoreB = 0;

    cwTurn = 'A';

    cwSolved = 0;


    /*
     * Build the actual board.
     */

    buildCrosswordBoard(
        crosswordData
    );


    document
        .getElementById('cw-score-a')
        .textContent = '0';


    document
        .getElementById('cw-score-b')
        .textContent = '0';


    document
        .getElementById('area-crossword')
        .classList
        .add('active');


    console.log(
        'DATABASE CROSSWORD READY:',
        crosswordData
    );


    showCrosswordClue();

}

/* =========================================================
   GENERATE DATABASE CROSSWORD
   ========================================================= */

function generateDatabaseCrossword(inputQuestions) {

    /*
     * ---------------------------------------------------------
     * CROSSWORD BOARD SETTINGS
     * ---------------------------------------------------------
     *
     * The instructor does NOT choose the board size.
     * The system automatically chooses it.
     *
     * 1–3 questions  → 5x5
     * 4–5 questions  → 7x7
     * 6–8 questions  → 9x9
     * 9–12 questions → 11x11
     *
     * Maximum questions = 12
     */

    const MAX_QUESTIONS = 12;
    const BOARD_SIZES = [5, 7, 9, 11, 13];


    /*
     * ---------------------------------------------------------
     * CLEAN QUESTIONS
     * ---------------------------------------------------------
     */

    const words = inputQuestions
        .map(item => ({

            question_id:
                item.question_id,

            answer:
                (item.answer || '')
                    .toUpperCase()
                    .replace(/[^A-Z]/g, ''),

            clue:
                item.clue || ''

        }))
        .filter(item =>
            item.answer.length >= 2 &&
            item.clue.length > 0
        );


    /*
     * ---------------------------------------------------------
     * REMOVE DUPLICATE ANSWERS
     * ---------------------------------------------------------
     */

    const uniqueWords = [];

    const seen = new Set();

    for (const item of words) {

        if (!seen.has(item.answer)) {

            seen.add(item.answer);

            uniqueWords.push(item);

        }

    }


    /*
     * ---------------------------------------------------------
     * BASIC VALIDATION
     * ---------------------------------------------------------
     */

    if (!uniqueWords.length) {

        console.warn(
            'No valid Crossword answers.'
        );

        return null;

    }


    /*
     * ---------------------------------------------------------
     * MAXIMUM QUESTION LIMIT
     * ---------------------------------------------------------
     */

    if (uniqueWords.length > MAX_QUESTIONS) {

        console.warn(
            `Crossword supports a maximum of ${MAX_QUESTIONS} questions.`
        );

        return null;

    }


    /*
     * ---------------------------------------------------------
     * DETERMINE STARTING BOARD SIZE
     * ---------------------------------------------------------
     *
     * The board size is based on:
     *
     * 1. Number of questions
     * 2. Longest answer
     *
     * The system can automatically move to a larger board
     * if the smaller one cannot contain the answers.
     */

    const questionCount =
        uniqueWords.length;

    const longestAnswer =
        Math.max(
            ...uniqueWords.map(
                item => item.answer.length
            )
        );


    let startingSize;


    if (questionCount <= 3) {

        startingSize = 5;

    } else if (questionCount <= 5) {

        startingSize = 7;

    } else if (questionCount <= 8) {

        startingSize = 9;

    } else {

        startingSize = 11;

    }


    /*
     * ---------------------------------------------------------
     * FIND A BOARD LARGE ENOUGH FOR THE LONGEST ANSWER
     * ---------------------------------------------------------
     */

    let sizeIndex =
        BOARD_SIZES.findIndex(
            size =>
                size >= startingSize &&
                size >= longestAnswer
        );


    /*
     * If no board is large enough, the questions cannot
     * be supported by the current maximum board size.
     */

    if (sizeIndex === -1) {

        console.warn(
            'Crossword answer is too long for the maximum board size.',
            {
                longestAnswer,
                maximumBoardSize:
                    BOARD_SIZES[BOARD_SIZES.length - 1]
            }
        );

        return null;

    }


    /*
     * ---------------------------------------------------------
     * TRY EACH BOARD SIZE
     * ---------------------------------------------------------
     *
     * IMPORTANT:
     *
     * We NEVER reduce the number of questions.
     *
     * If there are 5 questions, the system must either
     * generate all 5 or report that they cannot fit.
     */

    let lastFailedWord = null;

    for (
        ;
        sizeIndex < BOARD_SIZES.length;
        sizeIndex++
    ) {

        const SIZE =
            BOARD_SIZES[sizeIndex];


        /*
         * -----------------------------------------------------
         * BOARD
         * -----------------------------------------------------
         */

        const board =
            Array.from(
                { length: SIZE },
                () =>
                    Array(SIZE).fill(null)
            );


        /*
         * -----------------------------------------------------
         * CELL INFORMATION
         * -----------------------------------------------------
         */

        const cellInfo =
            Array.from(
                { length: SIZE },
                () =>
                    Array.from(
                        { length: SIZE },
                        () => ({
                            letter: null,
                            across: false,
                            down: false
                        })
                    )
            );


        const placed = [];
        /*
         * -----------------------------------------------------
         * CHECK WHETHER A WORD CAN BE PLACED
         * -----------------------------------------------------
         */

        function canPlace(
            text,
            row,
            col,
            direction,
            requireIntersection
        ) {

            const dr =
                direction === 'down'
                    ? 1
                    : 0;

            const dc =
                direction === 'across'
                    ? 1
                    : 0;


            let intersections = 0;


            /*
             * Check every character.
             */

            for (
                let i = 0;
                i < text.length;
                i++
            ) {

                const r =
                    row + dr * i;

                const c =
                    col + dc * i;


                /*
                 * Outside board.
                 */

                if (
                    r < 0 ||
                    r >= SIZE ||
                    c < 0 ||
                    c >= SIZE
                ) {

                    return {
                        valid: false,
                        intersections: 0
                    };

                }


                const cell =
                    cellInfo[r][c];


                /*
                 * Existing letter.
                 */

                if (cell.letter !== null) {

                    /*
                     * Different letter = invalid.
                     */

                    if (
                        cell.letter !==
                        text[i]
                    ) {

                        return {
                            valid: false,
                            intersections: 0
                        };

                    }


                    /*
                     * Same direction overlap is NOT allowed.
                     */

                    if (
                        direction === 'across' &&
                        cell.across
                    ) {

                        return {
                            valid: false,
                            intersections: 0
                        };

                    }


                    if (
                        direction === 'down' &&
                        cell.down
                    ) {

                        return {
                            valid: false,
                            intersections: 0
                        };

                    }


                    /*
                     * Same letter in the opposite direction
                     * is a legitimate crossword intersection.
                     */

                    intersections++;

                    continue;

                }


                /*
                 * -------------------------------------------------
                 * CHECK SIDE ADJACENCY
                 * -------------------------------------------------
                 *
                 * This prevents parallel words from touching.
                 */
                if (direction === 'across') {

                    // Cell above
                    if (
                        r > 0 &&
                        cellInfo[r - 1][c].letter !== null
                    ) {
                        return {
                            valid: false,
                            intersections: 0
                        };
                    }

                    // Cell below
                    if (
                        r < SIZE - 1 &&
                        cellInfo[r + 1][c].letter !== null
                    ) {
                        return {
                            valid: false,
                            intersections: 0
                        };
                    }

                } else {

                    // Cell left
                    if (
                        c > 0 &&
                        cellInfo[r][c - 1].letter !== null
                    ) {
                        return {
                            valid: false,
                            intersections: 0
                        };
                    }
                        

                    // Cell right
                    if (
                        c < SIZE - 1 &&
                        cellInfo[r][c + 1].letter !== null
                    ) {
                        return {
                            valid: false,
                            intersections: 0
                        };
                    }
                    

                }
            }


            /*
             * -----------------------------------------------------
             * CHECK CELL BEFORE AND AFTER WORD
             * -----------------------------------------------------
             */

            const beforeR =
                row - dr;

            const beforeC =
                col - dc;

            const afterR =
                row + dr * text.length;

            const afterC =
                col + dc * text.length;


            if (
                beforeR >= 0 &&
                beforeR < SIZE &&
                beforeC >= 0 &&
                beforeC < SIZE &&
                cellInfo[beforeR][beforeC].letter !== null
            ) {

                return {
                    valid: false,
                    intersections: 0
                };

            }


            if (
                afterR >= 0 &&
                afterR < SIZE &&
                afterC >= 0 &&
                afterC < SIZE &&
                cellInfo[afterR][afterC].letter !== null
            ) {

                return {
                    valid: false,
                    intersections: 0
                };

            }


            /*
             * Every word after the first must intersect.
             */

            if (
                requireIntersection &&
                intersections === 0
            ) {

                return {
                    valid: false,
                    intersections: 0
                };

            }


            return {
                valid: true,
                intersections
            };

        }


        /*
         * ---------------------------------------------------------
         * PLACE WORD
         * ---------------------------------------------------------
         */

        function placeWord(
            item,
            row,
            col,
            direction
        ) {

            const dr =
                direction === 'down'
                    ? 1
                    : 0;

            const dc =
                direction === 'across'
                    ? 1
                    : 0;


            const cells = [];


            for (
                let i = 0;
                i < item.answer.length;
                i++
            ) {

                const r =
                    row + dr * i;

                const c =
                    col + dc * i;


                const cell =
                    cellInfo[r][c];


                /*
                 * Save previous state for backtracking.
                 */

                cells.push({
                    row: r,
                    col: c,
                    letter: cell.letter,
                    across: cell.across,
                    down: cell.down
                });


                cell.letter =
                    item.answer[i];


                if (direction === 'across') {

                    cell.across = true;

                } else {

                    cell.down = true;

                }


                board[r][c] =
                    item.answer[i];

            }


            placed.push({

                question_id:
                    item.question_id,

                answer:
                    item.answer,

                clue:
                    item.clue,

                row,
                col,

                direction,

                cells:
                    cells.map(cell => ({
                        row: cell.row,
                        col: cell.col
                    }))

            });

        }


        /*
         * ---------------------------------------------------------
         * REMOVE WORD
         * ---------------------------------------------------------
         */

        function removeWord(
            placement
        ) {

            const index =
                placed.indexOf(
                    placement
                );


            if (index !== -1) {

                placed.splice(
                    index,
                    1
                );

            }


            /*
             * Rebuild entire board.
             */

            for (
                let r = 0;
                r < SIZE;
                r++
            ) {

                for (
                    let c = 0;
                    c < SIZE;
                    c++
                ) {

                    cellInfo[r][c] = {

                        letter: null,

                        across: false,

                        down: false

                    };


                    board[r][c] =
                        null;

                }

            }


            for (
                const p of placed
            ) {

                const dr =
                    p.direction === 'down'
                        ? 1
                        : 0;

                const dc =
                    p.direction === 'across'
                        ? 1
                        : 0;


                for (
                    let i = 0;
                    i < p.answer.length;
                    i++
                ) {

                    const r =
                        p.row + dr * i;

                    const c =
                        p.col + dc * i;


                    const cell =
                        cellInfo[r][c];


                    cell.letter =
                        p.answer[i];


                    if (
                        p.direction ===
                        'across'
                    ) {

                        cell.across = true;

                    } else {

                        cell.down = true;

                    }


                    board[r][c] =
                        p.answer[i];

                }

            }

        }


        /*
         * ---------------------------------------------------------
         * FIND POSSIBLE PLACEMENTS
         * ---------------------------------------------------------
         */

        function getCandidates(
            item,
            requireIntersection
        ) {

            const candidates = [];


            const directions = [
                'across',
                'down'
            ];


            for (
                const direction
                of directions
            ) {

                for (
                    let row = 0;
                    row < SIZE;
                    row++
                ) {

                    for (
                        let col = 0;
                        col < SIZE;
                        col++
                    ) {

                        const result =
                            canPlace(
                                item.answer,
                                row,
                                col,
                                direction,
                                requireIntersection
                            );


                        if (result.valid) {

    candidates.push({
        row,
        col,
        direction,
        intersections: result.intersections
    });

} else if (
    requireIntersection &&
    placed.length === 1 &&
    item.answer === 'JAVASCRIPT' &&
    result.intersections > 0
) {

    if (candidates.length === 0) {
    console.log(
        'CROSSWORD ZERO CANDIDATES:',
        JSON.stringify({
            index,
            word: item.answer,
            placed: placed.map(p => ({
                word: p.answer,
                row: p.row,
                col: p.col,
                direction: p.direction
            }))
        }, null, 2)
    );
}

}

                    }

                }

            }


            /*
             * Prefer placements with more intersections.
             */

            candidates.sort(
    (a, b) => {
        // Prefer placements with more intersections.
        if (b.intersections !== a.intersections) {
            return b.intersections - a.intersections;
        }

        // If intersections are equal,
        // prefer placements closer to the center.
        const center =
            (SIZE - 1) / 2;

        const distanceA =
            Math.abs(a.row - center) +
            Math.abs(a.col - center);

        const distanceB =
            Math.abs(b.row - center) +
            Math.abs(b.col - center);

        return distanceA - distanceB;
    }
);


            return candidates;

        }


        /*
         * ---------------------------------------------------------
         * BACKTRACKING SOLVER
         * ---------------------------------------------------------
         */

        /*
         * Place longer/more difficult answers first.
         */

        const selected =
            [...uniqueWords]
                .sort(
                    (a, b) =>
                        b.answer.length -
                        a.answer.length
                );


        function solve(index) {

                if (index >= selected.length) {
                    return true;
                }

                /*
                * ---------------------------------------------------------
                * FIND THE MOST CONSTRAINED REMAINING WORD
                * ---------------------------------------------------------
                *
                * Instead of always using selected[index],
                * check the remaining words and choose the one
                * with the fewest valid placements.
                */

                let bestIndex = -1;
                let bestCandidates = null;

                for (
                    let i = index;
                    i < selected.length;
                    i++
                ) {

                    const item =
                        selected[i];

                    const requireIntersection =
                        placed.length > 0;

                    const candidates =
                        getCandidates(
                            item,
                            requireIntersection
                        );                   
                       

                    /*
                    * No possible placement.
                    *
                    * This branch cannot work, so stop
                    * searching this arrangement.
                    */

                    if (candidates.length === 0) {

                        lastFailedWord =
                            item.answer;

                        return false;
                    }

                    /*
                    * Keep the word with the fewest
                    * possible placements.
                    */

                    if (
                        bestCandidates === null ||
                        candidates.length < bestCandidates.length
                    ) {

                        bestIndex = i;
                        bestCandidates = candidates;

                        /*
                        * One possible placement is already
                        * the most constrained case possible.
                        */

                        if (bestCandidates.length === 1) {
                            break;
                        }
                    }
                }


                /*
                * Move the most constrained word into
                * the current position.
                */

                [
                    selected[index],
                    selected[bestIndex]
                ] = [
                    selected[bestIndex],
                    selected[index]
                ];


                const item =
                    selected[index];


                /*
                * Try every possible placement for this word.
                */

                for (
                    const candidate
                    of bestCandidates
                ) {

                    const beforeCount =
                        placed.length;


                    placeWord(
                        item,
                        candidate.row,
                        candidate.col,
                        candidate.direction
                    );


                    if (
                        solve(index + 1)
                    ) {

                        return true;

                    }


                    /*
                    * Backtrack.
                    */

                    const lastPlacement =
                        placed[beforeCount];


                    removeWord(
                        lastPlacement
                    );

                }


                /*
                * Restore the original ordering
                * before returning failure.
                */

                [
                    selected[index],
                    selected[bestIndex]
                ] = [
                    selected[bestIndex],
                    selected[index]
                ];


                return false;

            }


        /*
         * ---------------------------------------------------------
         * RUN SOLVER
         * ---------------------------------------------------------
         */

        if (solve(0)) {

            /*
             * Build final clue data.
             */

            const clues =
                placed.map(
                    (placement, index) => ({

                        question_id:
                            placement.question_id,

                        answer:
                            placement.answer,

                        clue:
                            placement.clue,

                        row:
                            placement.row,

                        col:
                            placement.col,

                        direction:
                            placement.direction,

                        number:
                            index + 1,

                        cells:
                            placement.cells.map(
                                cell => [
                                    cell.row,
                                    cell.col
                                ]
                            )

                    })
                );


            /*
             * Make sure multiple words actually
             * have at least one intersection.
             */

            let totalIntersections = 0;


            for (
                let r = 0;
                r < SIZE;
                r++
            ) {

                for (
                    let c = 0;
                    c < SIZE;
                    c++
                ) {

                    const cell =
                        cellInfo[r][c];

                    if (
                        cell.across &&
                        cell.down
                    ) {

                        totalIntersections++;

                    }

                }

            }


            if (
                clues.length > 1 &&
                totalIntersections === 0
            ) {

                console.warn(
                    'Generated crossword has no intersections.'
                );

                continue;

            }


            /*
             * IMPORTANT:
             *
             * Make sure ALL instructor questions
             * were successfully placed.
             */

            if (
                clues.length !==
                uniqueWords.length
            ) {

                console.warn(
                    'Not all Crossword questions were placed.'
                );

                continue;

            }


            console.log(
                `Crossword generated successfully: ${clues.length} questions on ${SIZE}x${SIZE} board.`
            );


            return {

                size:
                    SIZE,

                board:
                    board,

                clues:
                    clues

            };

        }

        /*
         * If this board size fails,
         * automatically try the next larger board.
         */

        console.warn(
            `Could not fit all ${uniqueWords.length} questions on ${SIZE}x${SIZE}. Trying a larger board...`
        );

    }


    /*
     * ---------------------------------------------------------
     * NO VALID CROSSWORD
     * ---------------------------------------------------------
     */

    console.warn(
        `Could not generate a Crossword containing all ${uniqueWords.length} questions.`
    );


    return {
    failedWord:
        lastFailedWord
    };

}

/* ══════════════════════════════════════════════════════════════
   🧩 CROSSWORD ENGINE
   ══════════════════════════════════════════════════════════════ */

function showCrosswordClue() {

    cwStealAttempt = false;
    cwStealPending = false;
    document.getElementById('cw-answer').disabled = false;
    document.querySelector('#area-crossword .crossword-submit').disabled = false;
    const stealButton = document.getElementById('cw-steal');
    if (stealButton) stealButton.hidden = true;

    if (cwIdx >= cwQuestions.length) {

        endGame();

        return;
    }

    const item = cwQuestions[cwIdx];

    const turn = document.getElementById('cw-turn');

    if (cwTurn === 'A') {

        turn.textContent = "🔵 Team Alpha's Turn";
        turn.classList.remove('beta');

    } else {

        turn.textContent = "🩷 Team Beta's Turn";
        turn.classList.add('beta');

    }

    document.getElementById('cw-clue-number').textContent =
        `CLUE ${cwIdx + 1}`;

    document.getElementById('cw-direction').textContent =
        'WORD';

    document.getElementById('cw-clue').textContent =
        item.clue;

    document.getElementById('cw-answer').value = '';

    document.getElementById('cw-feedback').textContent = '';
    document.getElementById('cw-feedback').className =
        'crossword-feedback';

    document.getElementById('cw-score-a').textContent =
        cwScoreA;

    document.getElementById('cw-score-b').textContent =
        cwScoreB;

    document.getElementById('cw-word-progress').textContent =
        `Solved: ${cwSolved} / ${cwQuestions.length}`;

    document.getElementById('cw-prog-fill').style.width =
        `${(cwSolved / cwQuestions.length) * 100}%`;

    document.getElementById('cw-prog-label').textContent =
        `${cwSolved}/${cwQuestions.length}`;

    document.getElementById('cw-answer').focus();
}

/* =========================================================
   CROSSWORD SKIP BUTTON
   ========================================================= */

function setupCrosswordSkipButton() {

    /*
     * Don't create the button more than once.
     */
    if (
        document.getElementById(
            'cw-skip-button'
        )
    ) {
        return;
    }


    /*
     * Find the existing Check Answer button.
     */
    const checkButton =
        document.querySelector(
            'button[onclick="checkCrossword()"]'
        );


    if (!checkButton) {

        console.warn(
            'Crossword Check Answer button not found.'
        );

        return;

    }


    /*
     * Create Skip button.
     */
    const skipButton =
        document.createElement('button');


    skipButton.type =
        'button';


    skipButton.id =
        'cw-skip-button';


    skipButton.className =
        'crossword-skip-button';


    skipButton.textContent =
        '⏭ Skip';


    skipButton.onclick =
        skipCrossword;


    /*
     * Put Skip directly below
     * Check Answer.
     */
    checkButton.insertAdjacentElement(
        'afterend',
        skipButton
    );


    /*
     * Add styling.
     */
    if (
        !document.getElementById(
            'cw-skip-button-style'
        )
    ) {

        const style =
            document.createElement('style');


        style.id =
            'cw-skip-button-style';


        style.textContent = `

            #cw-skip-button {

                width: 100%;

                margin-top: 10px;

                padding: 13px 18px;

                border: 1px solid
                    rgba(255,255,255,.15);

                border-radius: 10px;

                background:
                    rgba(255,255,255,.06);

                color: #d8d4e8;

                font-size: 15px;

                font-weight: 700;

                cursor: pointer;

                transition:
                    .2s ease;

            }


            #cw-skip-button:hover {

                background:
                    rgba(255,255,255,.12);

                border-color:
                    rgba(255,255,255,.25);

                transform:
                    translateY(-1px);

            }


            #cw-skip-button:active {

                transform:
                    translateY(0);

            }

        `;


        document.head.appendChild(
            style
        );

    }

}

function checkCrossword() {

    if (cwIdx >= cwQuestions.length) return;

    const input =
        document.getElementById('cw-answer')
        .value
        .trim()
        .toUpperCase()
        .replace(/\s/g, '');

    const answer =
        cwQuestions[cwIdx].answer
        .toUpperCase()
        .replace(/\s/g, '');

    const feedback =
        document.getElementById('cw-feedback');

    if (input === answer) {

        if (cwTurn === 'A') {
            cwScoreA++;
        } else {
            cwScoreB++;
        }

        cwSolved++;

        feedback.textContent =
            `✅ Correct! ${cwQuestions[cwIdx].answer}`;

        feedback.className =
            'crossword-feedback correct';

        revealCrosswordWord(
            cwQuestions[cwIdx].answer
        );

        showToast(
            '🎯',
            `Team ${cwTurn === 'A' ? 'Alpha' : 'Beta'} gets a point!`
        );

        document.getElementById('cw-score-a').textContent =
            cwScoreA;

        document.getElementById('cw-score-b').textContent =
            cwScoreB;

        setTimeout(() => {

            cwIdx++;

            if (cwIdx >= cwQuestions.length) {

                endGame();

                return;
            }

            cwTurn = cwTurn === 'A' ? 'B' : 'A';

            showCrosswordClue();

        }, 900);

    } else {

        feedback.textContent =
            '❌ Incorrect. The turn goes to the other team.';

        feedback.className =
            'crossword-feedback wrong';

        showToast('❌', 'Turn passes to the other team.');

        setTimeout(() => {

            cwTurn = cwTurn === 'A' ? 'B' : 'A';

            showCrosswordClue();

        }, 900);
    }
}

/* =========================================================
   SKIP CROSSWORD CLUE
   ========================================================= */

function skipCrossword() {

    if (
        cwIdx >= cwQuestions.length
    ) {
        return;
    }


    const question =
        cwQuestions[cwIdx];


    const feedback =
        document.getElementById(
            'cw-feedback'
        );


    /*
     * Show the correct answer.
     */
    feedback.textContent =
        `⏭ Skipped! The answer is ${question.answer}.`;


    feedback.className =
        'crossword-feedback';


    /*
     * Reveal the answer on the board.
     */
    revealCrosswordWord(
        question
    );


    /*
     * Notify the players.
     */
    showToast(
        '⏭',
        `Skipped! Answer: ${question.answer}`
    );


    /*
     * Move to the next clue after
     * a short delay.
     */
    setTimeout(() => {

        cwIdx++;


        /*
         * If there are no more clues,
         * finish the game.
         */
        if (
            cwIdx >=
            cwQuestions.length
        ) {

            endGame();

            return;

        }


        /*
         * Pass the turn to the
         * other team.
         */
        cwTurn =
            cwTurn === 'A'
                ? 'B'
                : 'A';


        showCrosswordClue();

    }, 1000);

}


function revealCrosswordWord(answer) {

    const cells =
        document.querySelectorAll('.crossword-cell:not(.block)');

    /*
     * For this first version, reveal matching letters
     * progressively across available cells.
     */

    let letterIndex = 0;

    cells.forEach(cell => {

        if (letterIndex >= answer.length) return;

        if (!cell.classList.contains('solved')) {

            const letter =
                cell.dataset.letter;

            if (letter === answer[letterIndex]) {

                cell.querySelector('.crossword-letter')
                    .textContent = letter;

                cell.classList.add('solved');

                letterIndex++;
            }
        }
    });
}

/* =========================================================
   BUILD DATABASE CROSSWORD BOARD
   ========================================================= */

function buildCrosswordBoard(data) {

    console.log(
        'BUILDING CROSSWORD BOARD:',
        data
    );


    if (
        !data ||
        !Array.isArray(data.board)
    ) {

        console.error(
            'Invalid crossword board data:',
            data
        );

        showToast(
            '⚠️',
            'Unable to build the Crossword board.'
        );

        return;

    }


    const boardElement =
        document.getElementById(
            'crossword-board'
        );


    if (!boardElement) {

        console.error(
            'crossword-board element not found.'
        );

        return;

    }


    boardElement.innerHTML = '';


    const size =
    Number(data.size) ||
    data.board.length ||
    5;

console.log(
    `CROSSWORD BOARD SIZE: ${size}x${size}`
);


    boardElement.style.gridTemplateColumns =
        `repeat(${size}, 1fr)`;


    boardElement.style.gridTemplateRows =
        `repeat(${size}, 1fr)`;


    /*
     * ---------------------------------------------------------
     * BUILD BOARD FROM GENERATED DATA
     * ---------------------------------------------------------
     */

    cwGrid = [];


    for (
        let row = 0;
        row < size;
        row++
    ) {

        cwGrid[row] = [];


        for (
            let col = 0;
            col < size;
            col++
        ) {

            const cellValue =
                data.board[row]?.[col];


            const cell =
                document.createElement('div');


            cell.className =
                'crossword-cell';


            cell.dataset.row =
                row;

            cell.dataset.col =
                col;


            /*
             * Empty cell = blocked cell.
             */

            if (
                cellValue === null ||
                cellValue === undefined ||
                cellValue === ''
            ) {

                cell.classList.add(
                    'block'
                );

            } else {

                const letter =
                    document.createElement('span');


                letter.className =
                    'crossword-letter';


                /*
                 * Keep the answer hidden.
                 */

                letter.textContent = '';


                cell.appendChild(
                    letter
                );


                cwGrid[row][col] =
                    cell;

            }


            boardElement.appendChild(
                cell
            );

        }

    }


    console.log(
        'CROSSWORD BOARD BUILT SUCCESSFULLY.'
    );

}

/* ══ SHOW CROSSWORD CLUE ══ */

function showCrosswordClue() {

    if (cwIdx >= cwQuestions.length) {

        endGame();

        return;
    }

    setupCrosswordSkipButton();


    const question =
        cwQuestions[cwIdx];


    /* TEAM */

    const turn =
        document.getElementById('cw-turn');


    if (cwTurn === 'A') {

        turn.textContent =
            "🔵 Team Alpha's Turn";

        turn.classList.remove('beta');

    } else {

        turn.textContent =
            "🩷 Team Beta's Turn";

        turn.classList.add('beta');
    }


    /* CLUE */

    document
        .getElementById('cw-clue-number')
        .textContent =
            `CLUE ${question.number}`;


    document
        .getElementById('cw-direction')
        .textContent =
            question.direction.toUpperCase();


    document
        .getElementById('cw-clue')
        .textContent =
            question.clue;


    /* INPUT */

    const input =
        document.getElementById('cw-answer');

    input.value = '';

    input.focus();


    /* FEEDBACK */

    const feedback =
        document.getElementById('cw-feedback');

    feedback.textContent = '';

    feedback.className =
        'crossword-feedback';


    /* SCORE */

    document
        .getElementById('cw-score-a')
        .textContent = cwScoreA;

    document
        .getElementById('cw-score-b')
        .textContent = cwScoreB;


    /* PROGRESS */

    document
        .getElementById('cw-word-progress')
        .textContent =
            `Solved: ${cwSolved} / ${cwQuestions.length}`;


    document
        .getElementById('cw-prog-label')
        .textContent =
            `${cwSolved}/${cwQuestions.length}`;


    document
        .getElementById('cw-prog-fill')
        .style.width =
            `${(cwSolved / cwQuestions.length) * 100}%`;


    highlightCrosswordClue(question);
}

/* ══ HIGHLIGHT CURRENT WORD ══ */

function highlightCrosswordClue(question) {

    document
        .querySelectorAll('.crossword-cell')
        .forEach(cell => {

            cell.classList.remove('active');

        });


    question.cells.forEach(([row, col]) => {

        const cell =
            cwGrid[row]?.[col];

        if (cell) {

            cell.classList.add('active');

        }

    });
}

/* ══ CHECK ANSWER ══ */

function stealCrossword() {
    if (cwIdx >= cwQuestions.length || cwStealAttempt) return;
    if (!cwStealPending) return;
    cwStealPending = false;
    cwStealAttempt = true;
    const turn = document.getElementById('cw-turn');
    turn.textContent = cwTurn === 'A' ? "Team Alpha's Steal" : "Team Beta's Steal";
    turn.classList.toggle('beta', cwTurn === 'B');
    document.getElementById('cw-steal').hidden = true;
    document.getElementById('cw-answer').disabled = false;
    document.querySelector('#area-crossword .crossword-submit').disabled = false;
    document.getElementById('cw-feedback').textContent = `Team ${cwTurn === 'A' ? 'Alpha' : 'Beta'} can answer this clue for a point.`;
    document.getElementById('cw-feedback').className = 'crossword-feedback';
    document.getElementById('cw-answer').value = '';
    document.getElementById('cw-answer').focus();
}

function checkCrossword() {

    if (cwStealPending || cwIdx >= cwQuestions.length) {
        return;
    }


    const input =
        document
            .getElementById('cw-answer')
            .value
            .trim()
            .toUpperCase()
            .replace(/\s/g, '');


    const question =
        cwQuestions[cwIdx];


    const answer =
        question.answer
            .toUpperCase()
            .replace(/\s/g, '');


    const feedback =
        document.getElementById('cw-feedback');


    /* ══ CORRECT ══ */

    if (input === answer) {

        if (cwTurn === 'A') {

            cwScoreA++;

        } else {

            cwScoreB++;

        }


        cwSolved++;


        feedback.textContent =
            `✅ Correct! ${question.answer}`;

        feedback.className =
            'crossword-feedback correct';


        revealCrosswordWord(question);


        document
            .getElementById('cw-score-a')
            .textContent = cwScoreA;

        document
            .getElementById('cw-score-b')
            .textContent = cwScoreB;


        showToast(
            '🎯',
            `Team ${cwTurn === 'A' ? 'Alpha' : 'Beta'} gets 1 point!`
        );


        setTimeout(() => {

            cwIdx++;


            if (cwIdx >= cwQuestions.length) {

                endGame();

                return;
            }


            /* Switch team */

            cwTurn =
                cwTurn === 'A'
                    ? 'B'
                    : 'A';


            showCrosswordClue();

        }, 900);


    }

    /* First miss offers one steal attempt; a missed steal ends the clue. */
    else if (!cwStealAttempt) {
        cwTurn = cwTurn === 'A' ? 'B' : 'A';
        cwStealPending = true;
        document.getElementById('cw-answer').disabled = true;
        document.querySelector('#area-crossword .crossword-submit').disabled = true;
        const turn = document.getElementById('cw-turn');
        turn.textContent = cwTurn === 'A' ? "Team Alpha can steal" : "Team Beta can steal";
        turn.classList.toggle('beta', cwTurn === 'B');
        feedback.textContent = 'Incorrect. The other team may steal this clue.';
        feedback.className = 'crossword-feedback wrong';
        document.getElementById('cw-steal').hidden = false;
    } else {
        feedback.textContent = 'Incorrect steal. Moving to the next clue.';
        feedback.className = 'crossword-feedback wrong';
        setTimeout(() => {
            cwIdx++;
            if (cwIdx >= cwQuestions.length) { endGame(); return; }
            cwTurn = cwTurn === 'A' ? 'B' : 'A';
            showCrosswordClue();
        }, 900);
    }
}

/* ══ REVEAL WORD ══ */

function revealCrosswordWord(question) {

    question.cells.forEach(([row, col], index) => {

        const cell =
            cwGrid[row]?.[col];

        if (!cell) {
            return;
        }


        const letter =
            cell.querySelector(
                '.crossword-letter'
            );


        if (letter) {

            letter.textContent =
                question.answer[index];

            cell.classList.remove('active');

            cell.classList.add('solved');

        }

    });
}


/* ── END GAME ───────────────────────────────────────────────── */
function endGame(reason) {
    stopTimer();
    clearInterval(hsCountdown);
    document.querySelectorAll('.game-area').forEach(a => a.classList.remove('active'));
    document.getElementById('area-result').classList.add('active');

    let icon, title, sub, pct, label, xpText;

     if (mode === 'buzzer') {
        const winner = buzzerA > buzzerB ? '🔵 Team Alpha wins!' : buzzerB > buzzerA ? '🩷 Team Beta wins!' : "🤝 It's a Tie!";
        icon = buzzerA > buzzerB ? '🔵' : buzzerB > buzzerA ? '🩷' : '🤝';
        title = winner;
        sub = `Final score — Alpha: ${buzzerA} | Beta: ${buzzerB}`;
        pct = `${buzzerA} – ${buzzerB}`;
        label = 'Alpha – Beta Final Score';
        xpText = `+${Math.max(buzzerA, buzzerB) * 15} XP for the winning team`;
    } else if (mode === 'kahoot') {
         icon = '🏆';
        title = 'Kahoot Complete!';
         sub =
        `${kahootCorrect} out of ${questions.length} ` +
        `questions answered correctly!`;
         pct =
        `${kahootCorrect} / ${questions.length}`;
        label =
        `Correct Answers • ${kahootScore} Points`;
        xpText =
        `🏆 Final Score: ${kahootScore} points`;
    } else if (mode === 'hotseat') {
        const winner = hsScoreA > hsScoreB ? '🔵 Team Alpha wins!' : hsScoreB > hsScoreA ? '🩷 Team Beta wins!' : "🤝 It's a Tie!";
        icon = hsScoreA > hsScoreB ? '🔵' : hsScoreB > hsScoreA ? '🩷' : '🤝';
        title = winner;
        sub = `Hot Seat complete! Alpha: ${hsScoreA} | Beta: ${hsScoreB}`;
        pct = `${hsScoreA} – ${hsScoreB}`;
        label = 'Alpha – Beta Final Score';
        xpText = `+${Math.max(hsScoreA, hsScoreB) * 15} XP for the winning team`;
    }  else if (mode === 'jumble') {
    icon = '🔀';
    title = 'Word Jumble Complete!';
    sub = `${jumbleScore} out of ${jumbleQuestions.length} words solved correctly!`;
    pct = `${jumbleScore} / ${jumbleQuestions.length}`;
    label = 'Words Solved';
    xpText = `+${jumbleScore * 15} XP`;
    } else if (mode === 'crossword') {

    const winner =
        cwScoreA > cwScoreB
            ? '🔵 Team Alpha wins!'
            : cwScoreB > cwScoreA
                ? '🩷 Team Beta wins!'
                : "🤝 It's a Tie!";


    icon =
        cwScoreA > cwScoreB
            ? '🔵'
            : cwScoreB > cwScoreA
                ? '🩷'
                : '🤝';


    title = winner;


    sub =
        `5×5 Crossword complete! Alpha: ${cwScoreA} | Beta: ${cwScoreB}`;


    pct =
        `${cwScoreA} – ${cwScoreB}`;


    label =
        'Alpha – Beta Final Score';


    xpText =
        `+${Math.max(cwScoreA, cwScoreB) * 15} XP for the winning team`;
}

    document.getElementById('result-icon').textContent = icon;
    document.getElementById('result-title').textContent = title;
    document.getElementById('result-sub').textContent = sub;
    document.getElementById('result-pct').textContent = pct;
    document.getElementById('result-label').textContent = label;
    document.getElementById('result-xp').textContent = xpText;
}


/* ── RESET TO LOBBY ─────────────────────────────────────────── */
function resetToLobby() {
    gameInProgress = false;
    stopTimer();
    clearInterval(hsCountdown);
    mode = null;
    qIdx = 0;
    classCorrect = 0;
    buzzerA = 0;
    buzzerB = 0;
    hsIdx = 0;
    hsScoreA = 0;
    hsScoreB = 0;
    hsTurn = 'A';

    cwQuestions = [];
cwIdx = 0;

cwScoreA = 0;
cwScoreB = 0;

cwTurn = 'A';

cwSolved = 0;

cwGrid = [];

    document.querySelectorAll('.game-area').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('active'));
    document.getElementById('lobby').style.display = '';
    document.getElementById('nav-timer').textContent = '--:--';
    document.getElementById('nav-timer').style.color = '#fff';
    document.getElementById('nav-mode').textContent = 'Waiting';
    document.querySelector('.btn-exit-game').innerHTML = '<i data-lucide="log-out" aria-hidden="true"></i> Log out';
    if (window.lucide) lucide.createIcons();
    document.getElementById('btn-start').disabled = true;
    document.getElementById('btn-start').textContent = 'Select a mode to start';

    if (svg) svg.style.filter = 'none';
    const glow = document.getElementById('boss-glow');
    if (glow) glow.style.background = 'radial-gradient(ellipse,rgba(239,68,68,0.35) 0%,transparent 70%)';
    bossFlame(false);
}


/* ── INIT ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
     const context = await fetch(`../assets/php/game_context.php?tab=${gameTabId}`, {credentials:'same-origin',cache:'no-store'}).then(r => r.json()).catch(() => ({success:false}));
     if (!context.success) { window.location.href = 'Users.html'; return; }
     const loaded =
            await loadGameInstructorAssignments();


        if (!loaded) {
            return;
        }

        await loadGameAssignments();
        populateGameSections();
        populateGameTopics();
        setupGameSelectors();
        const selectedCard = document.getElementById('mc-' + launchMode);
        if (selectedCard && launchSection && launchTopic) {
            selectMode(launchMode, selectedCard);
            const start = document.getElementById('btn-start');
            start.disabled = true;
            const status = document.getElementById('game-launch-status');
            status.textContent = 'Signed in. Checking saved questions...';
            const saved = await loadGameQuestionsFromDatabase(launchMode, launchSection, launchTopic);
            status.textContent = saved.length ? `Ready: ${saved.length} saved questions for ${launchSection} / ${launchTopic}.` : 'No saved questions found. Return to the instructor portal to check the game.';
            start.disabled = !saved.length;
        }
});
