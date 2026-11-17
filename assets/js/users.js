/* ═══════════════════════════════════════════════════════════════
   users.js — Instructor account selection & login
   Depends on: main.js
   ═══════════════════════════════════════════════════════════════ */


/* ── USERS ───────────────────────────────────────────────────── */

const USERS = [

    {
        id: 'i1',
        name: 'Instructor',
        sub: 'PLMUN — CITCS Faculty',
        initials: 'I',
        avatarClass: 'instructor',
        badgeClass: 'badge-instructor',
        badge: 'Instructor',
        dot: 'dot-online',
        dest: '../pages/Instructor.html'
    },

    {
        id: 'ig',
        name: 'Team Game Screen',
        sub: 'Project this to the class display',
        initials: '🎮',
        avatarClass: 'game',
        badgeClass: 'badge-game',
        badge: 'Game',
        dot: 'dot-online',
        dest: '../pages/Game.html'
    }

];


let selectedUser = null;


/* ── BUILD CARDS ────────────────────────────────────────────── */

function buildPage() {

    const grid = document.getElementById('users-grid');

    grid.innerHTML = USERS.map(u => `
        <button type="button" class="user-card ${u.avatarClass}" id="card-${u.id}" onclick="pickUser('${u.id}')">
            <span class="uc-avatar ${u.avatarClass}" aria-hidden="true"><i data-lucide="${u.id==='i1' ? 'graduation-cap' : 'monitor-play'}"></i></span>
            <span class="uc-name">${u.id==='i1' ? 'Instructor dashboard' : 'Classroom display'}</span>
            <span class="uc-role">${u.id==='i1' ? 'Create quizzes, review submissions, and follow your students’ progress.' : 'Open the Team Game screen for your classroom projector or shared display.'}</span>
            <span class="uc-action">${u.id==='i1' ? 'Open dashboard' : 'Launch display'} <span aria-hidden="true">&rarr;</span></span>
        </button>
    `).join('');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}


/* ── PICK USER ──────────────────────────────────────────────── */

function pickUser(id) {

    const user = USERS.find(u => u.id === id);

    if (!user) return;

    document
        .querySelectorAll('.user-card')
        .forEach(c => c.classList.remove('selected'));

    document
        .getElementById('card-' + id)
        .classList.add('selected');

    selectedUser = user;

    openPwPrompt(user);
}


/* ── OPEN LOGIN PROMPT ─────────────────────────────────────── */

function openPwPrompt(user) {

    document.getElementById('pw-avatar').className =
        'pw-avatar ' + user.avatarClass;

    document.getElementById('pw-avatar').textContent =
        user.id === 'i1' ? 'I' : 'G';

    document.getElementById('pw-name').textContent =
        user.name;

    document.getElementById('pw-sub').textContent =
        'Sign in with your instructor number and password.';


    /* Clear Instructor Number */

    const instructorNumberInput =
        document.getElementById('instructor-number');

    instructorNumberInput.value = '';


    /* Clear Password */

    const passwordInput =
        document.getElementById('pw-input');

    passwordInput.value = '';

    passwordInput.type = 'password';


    /* Reset password toggle */

    const toggleButton =
        document.querySelector('.pw-toggle');

    if (toggleButton) {
        toggleButton.setAttribute('aria-label','Show password');
        toggleButton.innerHTML = '<i data-lucide="eye" aria-hidden="true"></i>';
        lucide.createIcons();
    }


    /* Clear errors */

    document
        .getElementById('pw-error')
        .classList.remove('show');

    instructorNumberInput.classList.remove('error');
    passwordInput.classList.remove('error');


    /* Reset Sign In button */

    const goBtn =
        document.getElementById('pw-go');

    goBtn.classList.remove('loading');

    goBtn.textContent = 'Sign In →';


    /* Open popup */

    document
        .getElementById('pw-prompt')
        .showModal();


    /* Focus Instructor Number */

    setTimeout(() => {

        instructorNumberInput.focus();

    }, 200);
}


/* ── CLOSE LOGIN PROMPT ────────────────────────────────────── */

function closePwPrompt() {

    document
        .getElementById('pw-prompt')
        .close();

    document
        .querySelectorAll('.user-card')
        .forEach(c => c.classList.remove('selected'));

    document.getElementById('card-' + selectedUser?.id)?.focus();
    selectedUser = null;
}


/* ── PASSWORD TOGGLE ───────────────────────────────────────── */

function togglePw() {

    const inp =
        document.getElementById('pw-input');

    const toggleButton =
        document.querySelector('.pw-toggle');


    toggleButton?.setAttribute('aria-label', inp.type === 'password' ? 'Hide password' : 'Show password');
    if (inp.type === 'password') {

        inp.type = 'text';

        if (toggleButton) {
            toggleButton.innerHTML = '<i data-lucide="eye-off" aria-hidden="true"></i>';
            lucide.createIcons();
        }

    } else {

        inp.type = 'password';

        if (toggleButton) {
            toggleButton.innerHTML = '<i data-lucide="eye" aria-hidden="true"></i>';
        lucide.createIcons();
        }

    }
}


/* ── SUBMIT LOGIN ──────────────────────────────────────────── */

function submitPw() {

    if (!selectedUser || document.getElementById('pw-go').classList.contains('loading')) {
        return;
    }


    /* Get Instructor Number from Users.html */

    const instructorNumber =
        document
        .getElementById('instructor-number')
        .value
        .trim();


    /* Get Password */

    const password =
        document
        .getElementById('pw-input')
        .value;


    const err =
        document.getElementById('pw-error');

    const goBtn =
        document.getElementById('pw-go');


    /* Clear previous errors */

    err.classList.remove('show');

    document
        .getElementById('instructor-number')
        .classList.remove('error');

    document
        .getElementById('pw-input')
        .classList.remove('error');


    /* ── CHECK INSTRUCTOR NUMBER ── */

    if (instructorNumber === '') {

        err.textContent =
            'Please enter your Instructor Number.';

        err.classList.add('show');

        document
            .getElementById('instructor-number')
            .classList.add('error');

        document
            .getElementById('instructor-number')
            .focus();

        return;
    }


    /* ── CHECK PASSWORD ── */

    if (password === '') {

        err.textContent =
            'Please enter your password.';

        err.classList.add('show');

        document
            .getElementById('pw-input')
            .classList.add('error');

        document
            .getElementById('pw-input')
            .focus();

        return;
    }


    /* ── LOADING ── */

    goBtn.classList.add('loading');

    goBtn.textContent = 'Checking…';


    console.log('Instructor Number:', instructorNumber);
    console.log('Password entered: YES');


    /* ── SEND TO PHP ── */

    fetch('../assets/php/login.php', {

        method: 'POST',

        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },

        body: 'role=instructor' +
            '&id=' +
            encodeURIComponent(instructorNumber) +
            '&password=' +
            encodeURIComponent(password)

    })


    /* ── PHP RESPONSE ── */

    .then(response => response.text())

    .then(data => {

        console.log('PHP response:', data);

        data = data.trim();


        /* ── SUCCESS ── */

        if (data === 'success') {

            console.log(
                'Instructor login successful.'
            );


            /* Save selected account */

            sessionStorage.setItem(
                'gable_user_name',
                selectedUser.name
            );

            sessionStorage.setItem(
                'gable_user_id',
                selectedUser.id
            );


            goBtn.textContent =
                'Success ✓';


            /* Navigate */

            setTimeout(() => {

                navigateTo(
                    selectedUser.dest
                );

            }, 500);

        }


        /* ── LOGIN FAILED ── */
        else {

            console.error(
                'Instructor login failed:',
                data
            );


            err.textContent =
                data ||
                'Incorrect instructor number or password.';

            err.classList.add('show');


            document
                .getElementById('instructor-number')
                .classList.add('error');

            document
                .getElementById('pw-input')
                .classList.add('error');


            goBtn.classList.remove('loading');

            goBtn.textContent =
                'Sign In →';


            setTimeout(() => {

                document
                    .getElementById('instructor-number')
                    .classList.remove('error');

                document
                    .getElementById('pw-input')
                    .classList.remove('error');

            }, 400);

        }

    })


    /* ── CONNECTION ERROR ── */

    .catch(error => {

        console.error(
            'Connection error:',
            error
        );


        err.textContent =
            'Unable to connect to the server.';

        err.classList.add('show');


        goBtn.classList.remove('loading');

        goBtn.textContent =
            'Sign In →';

    });
}


/* ── ENTER KEY ─────────────────────────────────────────────── */

document
    .getElementById('instructor-number')
    .addEventListener('keydown', function(e) {

        if (e.key === 'Enter') {

            document
                .getElementById('pw-input')
                .focus();

        }

    });


document
    .getElementById('pw-input')
    .addEventListener('keydown', function(e) {

        if (e.key === 'Enter') {

            submitPw();

        }

    });


/* ── CLOCK ─────────────────────────────────────────────────── */

function startClock() {

    function tick() {

        const now = new Date();

        const h =
            String(now.getHours())
            .padStart(2, '0');

        const m =
            String(now.getMinutes())
            .padStart(2, '0');


        const days = [
            'Sunday',
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday'
        ];


        const months = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sep',
            'Oct',
            'Nov',
            'Dec'
        ];


        document
            .getElementById('clock')
            .textContent =
            `${days[now.getDay()]}, ` +
            `${months[now.getMonth()]} ` +
            `${now.getDate()} — ${h}:${m}`;
    }


    tick();

    setInterval(
        tick,
        60000
    );
}


/* ── BACK ──────────────────────────────────────────────────── */

function goBack() {

    navigateTo(
        '../pages/Login.html'
    );

}


/* ── INIT ──────────────────────────────────────────────────── */

document.addEventListener(
    'DOMContentLoaded',
    () => {

        buildPage();

        startClock();

    }
);
document.getElementById('pw-prompt').addEventListener('cancel', event => { event.preventDefault(); closePwPrompt(); });
