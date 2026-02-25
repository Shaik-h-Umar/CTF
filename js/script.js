// ==================== RUN AFTER DOM LOAD ====================
const initScript = () => {

/* ==================== HELPERS ==================== */
const PROTECTED_PAGES = new Set(['dashboard', 'challenge']);
const ALL_PAGES = new Set(['landing', 'dashboard', 'challenge', 'leaderboard']);

function getSupabaseClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (window.ctfSupabase) return window.ctfSupabase;
    if (window.supabase && window.supabase.auth) return window.supabase;
    return null;
}

function sanitizePageId(pageId, fallback = 'landing') {
    return ALL_PAGES.has(pageId) ? pageId : fallback;
}

function updateHash(pageId) {
    if (!ALL_PAGES.has(pageId)) return;
    history.replaceState(null, '', `#${pageId}`);
}

function clearStoredAuthSession() {
    const clearKeys = storage => {
        if (!storage) return;
        const keysToRemove = [];

        for (let i = 0; i < storage.length; i += 1) {
            const key = storage.key(i);
            if (!key) continue;

            if (key.includes('supabase.auth.token') || key.startsWith('sb-')) {
                keysToRemove.push(key);
            }
        }

        keysToRemove.forEach(key => storage.removeItem(key));
    };

    try {
        clearKeys(window.localStorage);
        clearKeys(window.sessionStorage);
    } catch (err) {
        console.error('Failed to clear stored auth session:', err);
    }
}

/* ==================== MATRIX RAIN EFFECT ==================== */
const canvas = document.getElementById('matrix-canvas');

if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
        let matrixInterval = null;
        const matrixChars =
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*(){}[]|;:<>?/~';

        const fontSize = 14;
        let columns = 0;
        let drops = [];

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            columns = Math.max(1, Math.floor(canvas.width / fontSize));
            drops = Array(columns).fill(1);
        }

        function drawMatrix() {
            ctx.fillStyle = 'rgba(13,17,23,0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#00ff9f';
            ctx.font = `${fontSize}px monospace`;

            for (let i = 0; i < drops.length; i++) {
                const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];

                ctx.fillText(char, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i] += 1;
            }
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        if (matrixInterval) clearInterval(matrixInterval);
        matrixInterval = setInterval(drawMatrix, 50);
        drawMatrix();
    }
}

/* ==================== NAVIGATION ==================== */
const navLinks = document.querySelectorAll('.nav-link');
const pages = document.querySelectorAll('.page');
const navToggle = document.getElementById('nav-toggle');
const navLinksContainer = document.getElementById('nav-links');
const navbar = document.getElementById('navbar');

async function checkSession() {
    const client = getSupabaseClient();
    if (!client) return null;

    try {
        const { data, error } = await client.auth.getSession();
        if (error) throw error;
        return data ? data.session : null;
    } catch (err) {
        console.error('Session check failed:', err);
        return null;
    }
}

function redirectToLogin(nextPage) {
    const safeNext = sanitizePageId(nextPage, 'dashboard');
    window.location.href = `login.html?next=${encodeURIComponent(safeNext)}`;
}

async function navigateTo(pageId, options = {}) {
    const { updateUrl = true } = options;
    const safePageId = sanitizePageId(pageId, 'landing');

    if (PROTECTED_PAGES.has(safePageId)) {
        const session = await checkSession();
        if (!session) {
            redirectToLogin(safePageId);
            return;
        }
    }

    const target = document.getElementById(safePageId);
    if (!target) return;

    pages.forEach(p => p.classList.remove('active'));
    navLinks.forEach(l => l.classList.remove('active'));
    target.classList.add('active');

    navLinks.forEach(link => {
        if (link.dataset.page === safePageId) link.classList.add('active');
    });

    if (navLinksContainer) navLinksContainer.classList.remove('open');

    if (updateUrl) updateHash(safePageId);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (safePageId === 'challenge') startTimer();
}

function getCurrentPageFromHash() {
    return sanitizePageId((window.location.hash || '').replace('#', '').trim(), 'landing');
}

if (navLinks.length > 0) {
    navLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            navigateTo(link.dataset.page || 'landing');
        });
    });
}

// Global listener for navigation buttons
document.addEventListener('click', e => {
    const btn = e.target.closest('[data-navigate]');
    if (btn) {
        navigateTo(btn.dataset.navigate || 'landing');
        return;
    }

    const logoutBtn = e.target.closest('[data-logout], #logout-btn, .logout-btn');
    if (logoutBtn) {
        e.preventDefault();
        logout();
    }
});

if (navToggle) {
    navToggle.addEventListener('click', () => {
        if (navLinksContainer) navLinksContainer.classList.toggle('open');
    });
}

if (navbar) {
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });
}

/* ==================== LOGOUT ==================== */
async function logout() {
    const client = getSupabaseClient();
    if (!client) {
        clearStoredAuthSession();
        window.location.href = 'login.html';
        return;
    }

    try {
        const { error } = await client.auth.signOut();
        if (error) throw error;
    } catch (err) {
        console.error('Logout failed:', err);
    } finally {
        clearStoredAuthSession();
        window.location.href = 'login.html';
    }
}

window.logout = logout;

const supabaseClient = getSupabaseClient();
if (supabaseClient && typeof supabaseClient.auth?.onAuthStateChange === 'function') {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
        const currentPage = getCurrentPageFromHash();
        if (!session && PROTECTED_PAGES.has(currentPage)) {
            redirectToLogin(currentPage);
        }
    });
}

/* ==================== TYPING EFFECT ==================== */
const typingTexts = [
    'Initializing system...',
    'Loading challenges...',
    'Scanning vulnerabilities...',
    'Access granted.',
    'Welcome, hacker.'
];

let textIndex = 0;
let charIndex = 0;
let isDeleting = false;

const typingElement = document.getElementById('typing-text');

if (typingElement) {
    function typeEffect() {
        const currentText = typingTexts[textIndex];

        typingElement.textContent = isDeleting
            ? currentText.substring(0, --charIndex)
            : currentText.substring(0, ++charIndex);

        let speed = isDeleting ? 30 : 60;

        if (!isDeleting && charIndex === currentText.length) {
            speed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % typingTexts.length;
            speed = 500;
        }

        setTimeout(typeEffect, speed);
    }

    typeEffect();
}

/* ==================== COUNTERS ==================== */
let countersStarted = false;

function animateCounters() {
    const counters = document.querySelectorAll('.stat-number[data-count]');
    if (!counters.length || countersStarted) return;

    countersStarted = true;

    counters.forEach(counter => {
        const target = Number(counter.dataset.count);
        if (!Number.isFinite(target)) {
            counter.textContent = '0';
            return;
        }

        let current = 0;
        const step = Math.max(target / 120, 0.1);

        function update() {
            current += step;
            if (current < target) {
                counter.textContent = String(Math.floor(current));
                requestAnimationFrame(update);
            } else {
                counter.textContent = String(target);
            }
        }

        update();
    });
}

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            if (entries.length > 0 && entries[0].isIntersecting) {
                animateCounters();
                observer.disconnect();
            }
        }, { threshold: 0.3 });

        observer.observe(heroStats);
    }

    // Fallback trigger
    setTimeout(() => {
        animateCounters();
    }, 500);
}

/* ==================== HINT TOGGLE ==================== */
const hintToggle = document.getElementById('hint-toggle');
const hintContent = document.getElementById('hint-content');
const hintArrow = document.querySelector('.hint-arrow');

if (hintToggle) {
    hintToggle.addEventListener('click', () => {
        if (hintContent) hintContent.classList.toggle('open');
        if (hintArrow) hintArrow.classList.toggle('open');
    });
}

/* ==================== FLAG SUBMISSION ==================== */
const submitBtn = document.getElementById('submit-flag');
const flagInput = document.getElementById('flag-input');
const terminalBody = document.getElementById('terminal-body');

function addTerminalLine(text, cls = '') {
    if (!terminalBody) return;
    const line = document.createElement('div');
    line.className = 'terminal-line-output';
    line.innerHTML = `<span class="${cls}">${text}</span>`;
    terminalBody.appendChild(line);
    terminalBody.scrollTop = terminalBody.scrollHeight;
}

if (submitBtn && flagInput) {
    submitBtn.addEventListener('click', () => {
        const flag = flagInput.value.trim();

        if (!flag) {
            addTerminalLine('[!] Error: No flag provided.', 'terminal-text-error');
            return;
        }

        addTerminalLine(`root@ctf:~$ check_flag "GDG{${flag}}"`);
        addTerminalLine('[*] Verifying flag...', 'terminal-text-muted');

        setTimeout(() => {
            if (flag.toLowerCase() === 'rsa_cracked') {
                addTerminalLine('[+] ✓ Correct! Flag accepted!', 'terminal-text-success');
                submitBtn.disabled = true;
                submitBtn.textContent = '✓ Solved';
            } else {
                addTerminalLine('[-] ✗ Incorrect flag.', 'terminal-text-error');
                flagInput.value = '';
            }
        }, 1500);
    });

    flagInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') submitBtn.click();
    });
}

/* ==================== TIMER ==================== */
let timerInterval = null;
let timerSeconds = 0;

function startTimer() {
    if (timerInterval) clearInterval(timerInterval);

    const timerDisplay = document.getElementById('challenge-timer');
    const timerBarFill = document.getElementById('timer-bar-fill');

    timerInterval = setInterval(() => {
        timerSeconds += 1;

        const h = String(Math.floor(timerSeconds / 3600)).padStart(2, '0');
        const m = String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0');
        const s = String(timerSeconds % 60).padStart(2, '0');

        if (timerDisplay) timerDisplay.textContent = `${h}:${m}:${s}`;

        if (timerBarFill) {
            const progress = Math.min((timerSeconds / 3600) * 100, 100);
            timerBarFill.style.width = `${progress}%`;
        }
    }, 1000);
}

/* ==================== INITIAL PAGE ==================== */
const hasSpaPages = document.querySelectorAll('.page').length > 0;
if (hasSpaPages) {
    const initialPage = getCurrentPageFromHash();
    navigateTo(initialPage, { updateUrl: true });

    window.addEventListener('hashchange', () => {
        const nextPage = getCurrentPageFromHash();
        navigateTo(nextPage, { updateUrl: false });
    });
}

};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScript);
} else {
    initScript();
}
