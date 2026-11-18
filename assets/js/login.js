/* ── PARTICLES ── */

const formulas = [
"E = mc²",
"F = ma",
"F = Gm₁m₂/r²",
"v = u + at",
"s = ut + ½at²",
"PV = nRT",
"V = IR",
"A = πr²",
"a² + b² = c²",
"ax² + bx + c = 0",
"x = (−b ± √(b² − 4ac)) / 2a",
"Δ = b² − 4ac",

"π",
"∞",
"∑",
"∫",
"∂",
"∇",
"≈",
"≠",
"≤",
"≥",
"±",
"√x",
"∝",
"∈",
"∉",
"∩",
"∪",
"⊂",
"⊆",
"⊕",
"⊗",
"∀x",
"∃x",
"∴",
"∵",
"∠ABC",
"90°",
"180°",
"360°",

"sin θ",
"cos θ",
"tan θ",
"csc θ",
"sec θ",
"cot θ",

"sin²θ + cos²θ = 1",
"tan θ = sin θ / cos θ",
"1 + tan²θ = sec²θ",
"1 + cot²θ = csc²θ",
"sin(A+B)",
"cos(A-B)",
"e^x",
"ln(x)",
"log₁₀(x)",
"f(x)",
"f'(x)",
"dy/dx",
"d²y/dx²",

"lim x→∞",
"∫x dx",
"∫x² dx",
"∫sin(x)dx",
"∫cos(x)dx",
"d/dx(x²)=2x",
"d/dx(sin x)=cos x",
"d/dx(cos x)=-sin x",
"∫1/x dx = ln x",
"∫e^x dx = e^x",

"Σn = n(n+1)/2",
"Σn² = n(n+1)(2n+1)/6",
"n!",
"P(n,r)",
"C(n,r)",
"μ",
"σ",
"σ²",
"mean = Σx/n",
"P(A∩B)",
"P(A∪B)",
"P(A|B)",

"aₙ = a₁ + (n−1)d",
"Sₙ = n(a₁+aₙ)/2",
"aₙ = arⁿ⁻¹",
"Sₙ = a(1-rⁿ)/(1-r)",

"x+y=z",
"x−y=z",
"xy=z",
"x/y=z",
"x⁰=1",
"x¹=x",
"x⁻¹=1/x",
"x^(a+b)",
"(a+b)²",
"(a−b)²",
"a²−b²=(a+b)(a−b)",
"(a+b)³",
"(a−b)³",

"y=mx+b",
"m=(y₂−y₁)/(x₂−x₁)",
"(x−h)²+(y−k)²=r²",
"Ax+By+C=0",
"distance=√((x₂−x₁)²+(y₂−y₁)²)",
"midpoint=((x₁+x₂)/2,(y₁+y₂)/2)",

"c = λf",
"E = hf",
"p = mv",
"KE = ½mv²",
"PE = mgh",
"W = Fd",
"P = W/t",
"ρ = m/V",
"Q = mcΔT",
"F = qE",
"F = q(v×B)",
"V = IR",
"P = IV",
"P = I²R",
"P = V²/R",
"R = ρL/A",

"λ",
"μ₀",
"ε₀",
"ω",
"α",
"β",
"γ",
"δ",
"θ",
"φ",
"ψ",
"Ω",

"H₂O",
"CO₂",
"O₂",
"N₂",
"NH₃",
"CH₄",
"C₆H₁₂O₆",

"pH = −log[H⁺]",
"PV=nRT",
"M=n/V",
"n=m/M",
"NaCl",
"H₂SO₄",
"HCl",
"NaOH",
"KNO₃",

"DNA",
"RNA",
"ATP",
"ADP",
"CO₂ + H₂O",
"6O₂",
"C₆H₁₂O₆ + 6O₂",
"Photosynthesis",
"Cell Division",
"Mitosis",
"Meiosis",

"Ecosystem",
"Population",
"Genotype",
"Phenotype",
"Punnett Square",

"Hubble's Law",
"v = Hd",
"E = hf",
"λ = h/p",
"ΔxΔp ≥ h/4π",
"F = ma",
"ΣF = 0",

"GM/r²",
"Escape Velocity",
"v = √(2GM/r)",
"T² ∝ r³",

"A = lw",
"A = bh",
"A = ½bh",
"V = lwh",
"V = πr²h",
"V = 4/3πr³",
"SA = 4πr²",

"Binary: 1010",
"Hex: FF",
"2⁸ = 256",
"2¹⁰ = 1024",

"∑x",
"∑y",
"r²",
"R²",
"cov(x,y)",

"Euler: e^(iπ)+1=0",
"φ = (1+√5)/2",
"Golden Ratio",
"Fibonacci",
"1,1,2,3,5,8",

"Matrix [A]",
"|A|",
"A⁻¹",
"Aᵀ",
"det(A)",
"Ax=b",

"∇·E",
"∇×B",
"∇²ψ",
"Schrödinger",
"ψ(x,t)",

"Black Hole",
"Event Horizon",
"Relativity",
"Quantum",
"Entropy",

"S = k ln W",
"ΔG = ΔH − TΔS",

"Avogadro",
"6.022×10²³",
"1 mol",
"273.15 K",

"Electrons",
"Protons",
"Neutrons",
"Quarks",
"Bosons",

"∫₀¹x²dx",
"dx",
"dy",
"dz",
"dt",

"ℕ",
"ℤ",
"ℚ",
"ℝ",
"ℂ",

"⊥",
"∥",
"⇒",
"⇔",
"↔",
"→",
"←",

"√2",
"√3",
"√5",
"πr",
"2πr",
"πd",

"ln(e)=1",
"logₐ(a)=1",
"aⁿaᵐ=aⁿ⁺ᵐ",
"(aⁿ)ᵐ=aⁿᵐ",
"a⁻ⁿ=1/aⁿ",

"Speed = Distance/Time",
"Density = Mass/Volume",
"Acceleration = Δv/t",
"Momentum = mv",

"Δ",
"∑",
"∫",
"∞",
"Ω",
"λ",
"θ",
"μ",
"α",
"β",
"γ"
];

for (let i = 0; i < 28; i++) {

    const p = document.createElement("div");

    p.className = "particle";
    const formula = formulas[Math.floor(Math.random() * formulas.length)];
    const fontSize = 12 + Math.random() * 6;
    p.textContent = formula;
    p.setAttribute("aria-hidden", "true");

    p.style.cssText =
        `left:${Math.random() * Math.max(0, innerWidth - formula.length * fontSize * .62)}px;
        font-size:${fontSize}px;
        animation-duration:${6 + Math.random() * 10}s;
        animation-delay:${Math.random() * 10}s;
        --particle-opacity:${0.1 + Math.random() * 0.3}`;

    document.getElementById("particles").appendChild(p);
}


/* ── ROLE CHANGE ── */

function onRoleChange() {

    const role = document.getElementById("role").value;

    const wrap = document.getElementById("id-field-wrap");
    const label = document.getElementById("id-label");
    const input = document.getElementById("id-input");
    const pwWrap = document.getElementById("password-wrap");

    // STUDENT
    if (role === "student") {

        label.textContent = "Student ID";
        input.placeholder = "23152222";

        // Show ID
        wrap.classList.add("visible");

        // Show password
        pwWrap.style.display = "block";

    }

    // ADMIN
    else if (role === "admin") {

        label.textContent = "Admin ID";
        input.placeholder = "2000";

        // Show ID
        wrap.classList.add("visible");

        // Show password
        pwWrap.style.display = "block";

    }

    // INSTRUCTOR
    else if (role === "instructor") {

        // Hide Instructor Number
        wrap.classList.remove("visible");

        // Hide password
        pwWrap.style.display = "none";

        // Clear fields
        input.value = "";
        document.getElementById("password").value = "";

        // Clear errors
        clearIdError();
        clearPwError();
    }
}


/* ── ERROR HELPERS ── */

function showIdError(msg) {

    const e = document.getElementById("id-error");

    e.textContent = msg;
    e.classList.add("show");

    document.getElementById("id-input").classList.add("error");
}


function clearIdError() {

    document.getElementById("id-error").classList.remove("show");

    document.getElementById("id-input").classList.remove("error");
}


function clearPwError() {

    document.getElementById("pw-error").classList.remove("show");

    document.getElementById("password").classList.remove("error");
}


/* ── PASSWORD TOGGLE ── */

const pwInput = document.getElementById("password");
const togglePw = document.getElementById("togglePw");

togglePw.addEventListener("click", () => {

    if (pwInput.type === "password") {

        pwInput.type = "text";
        togglePw.innerHTML = '<i data-lucide="eye-off" aria-hidden="true"></i>';
        lucide.createIcons();

    } else {

        pwInput.type = "password";
        togglePw.innerHTML = '<i data-lucide="eye" aria-hidden="true"></i>';
        lucide.createIcons();

    }

});


/* ── LOGIN BUTTON ── */

const loginBtn = document.getElementById("loginBtn");
document.getElementById("login-form").addEventListener("submit", e => e.preventDefault());

loginBtn.addEventListener("click", function(e) {

    console.log("BUTTON CLICKED");

    const rect = this.getBoundingClientRect();

    const ripple = document.createElement("span");

    ripple.className = "ripple";

    const size = Math.max(rect.width, rect.height);

    ripple.style.width = size + "px";
    ripple.style.height = size + "px";

    ripple.style.left =
        (e.clientX - rect.left - size / 2) + "px";

    ripple.style.top =
        (e.clientY - rect.top - size / 2) + "px";

    this.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);

    console.log("BEFORE handleLogin");

    try {

        handleLogin();

    } catch (err) {

        console.error("HANDLE LOGIN ERROR:", err);

    }

    console.log("AFTER handleLogin");

});


/* ── ENTER KEY ── */

pwInput.addEventListener("keydown", function(e) {

    if (e.key === "Enter") {

        loginBtn.click();

    }

});


/* ── LOGIN FUNCTION ── */

function handleLogin() {

    console.log("1. handleLogin started");

    const role = document.getElementById("role").value;

    clearIdError();
    clearPwError();


    /* 
     * ─────────────────────────────
     * INSTRUCTOR
     * ─────────────────────────────
     *
     * Instructor does NOT require:
     * - Instructor Number
     * - Password
     *
     * Simply go to Users.html.
     */

    if (role === "instructor") {

        console.log("Instructor selected");

        loginBtn.classList.add("loading");
        loginBtn.textContent = "Loading...";

        window.location.href = "Users.html";

        return;
    }


    /*
     * ─────────────────────────────
     * STUDENT / ADMIN
     * ─────────────────────────────
     */

    const id =
        document.getElementById("id-input").value.trim();

    const password =
        document.getElementById("password").value.trim();


    console.log("Role:", role);
    console.log("ID:", id);


    /* Check ID */

    if (id === "") {

        showIdError("Please enter your ID.");

        return;
    }


    /* Check Password */

    if (password === "") {

        document.getElementById("pw-error").textContent =
            "Please enter your password.";

        document.getElementById("pw-error").classList.add("show");

        return;
    }


    /* Loading */

    loginBtn.classList.add("loading");
    loginBtn.textContent = "Logging in...";


    /* Send Login Request */

    fetch("../assets/php/login.php", {

        method: "POST",

        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },

        body: "role=" + encodeURIComponent(role) +
            "&id=" + encodeURIComponent(id) +
            "&password=" + encodeURIComponent(password)

    })

    .then(response => response.text())

    .then(data => {

        console.log("PHP Response:", data);

        data = data.trim();


        /* SUCCESS */

        if (data === "success") {

            if (role === "student") {

                window.location.href = "Student.html";

            } else if (role === "admin") {

                window.location.href = "Admin.html";

            } else if (role === "instructor") {
                window.location.href = "Instructor.html";

            }

        }


        /* ERROR */
        else {

            if (data.toLowerCase().includes("maintenance")) {
                if(window.showMaintenanceToast)window.showMaintenanceToast(data);
            } else if (data.toLowerCase().includes("password")) {

                document.getElementById("pw-error").textContent = data;

                document.getElementById("pw-error").classList.add("show");

            } else {

                showIdError(data);

            }

            loginBtn.classList.remove("loading");

            loginBtn.textContent = "Login";
        }

    })

    .catch(error => {

        console.error(error);

        alert("Unable to connect to the server.");

        loginBtn.classList.remove("loading");

        loginBtn.textContent = "Login";

    });
}


/* ── INIT ── */

document.addEventListener("DOMContentLoaded", () => {

    requestAnimationFrame(() => {

        requestAnimationFrame(() => {

            document.body.classList.add("page-enter-active");

        });

    });

});
