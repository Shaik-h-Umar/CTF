// js/auth.js
/**
 * Authentication Logic for GDG CTF
 * Handles Login and Registration using Supabase
 */
(function initAuth() {
    const AUTH_PAGES = ['login.html', 'register.html'];
    const DEFAULT_REDIRECT_PAGE = 'dashboard';

    function getSupabaseClient() {
        if (window.supabaseClient) return window.supabaseClient;
        if (window.ctfSupabase) return window.ctfSupabase;
        if (window.supabase && window.supabase.auth) return window.supabase;
        return null;
    }

    function isAuthPage() {
        const current = window.location.pathname.split('/').pop() || '';
        return AUTH_PAGES.includes(current);
    }

    function sanitizeNextPage(rawPage) {
        const allowed = new Set(['landing', 'dashboard', 'challenge', 'leaderboard']);
        if (!rawPage) return DEFAULT_REDIRECT_PAGE;
        return allowed.has(rawPage) ? rawPage : DEFAULT_REDIRECT_PAGE;
    }

    function getNextPageFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return sanitizeNextPage(params.get('next'));
    }

    async function redirectIfAlreadyAuthenticated() {
        const client = getSupabaseClient();
        if (!client || !isAuthPage()) return;

        try {
            const { data, error } = await client.auth.getSession();
            if (error) throw error;

            if (data && data.session) {
                const nextPage = getNextPageFromUrl();
                window.location.href = `index.html#${nextPage}`;
            }
        } catch (err) {
            console.error('Session check failed:', err);
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        const client = getSupabaseClient();
        if (!client) {
            console.error('CRITICAL: Supabase client not found. Ensure js/supabase.js is loaded.');
            return;
        }

        await redirectIfAlreadyAuthenticated();

        // DOM Elements
        const authForm = document.getElementById('auth-form');
        const submitBtn = document.querySelector('button[type="submit"]');

        // Inputs
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const usernameInput = document.getElementById('username');
        const confirmPassInput = document.getElementById('confirm-password');

        // Determine Page Type based on input existence
        const isRegisterPage = !!(usernameInput && confirmPassInput);
        const isLoginPage = !!(emailInput && passwordInput && !isRegisterPage);

        if (!authForm || !submitBtn) return;

        /**
         * Displays a terminal-style message inside the auth card
         * Dynamically creates the container if it doesn't exist
         * @param {string} message - Text to display
         * @param {string} type - 'success', 'error', or 'info'
         */
        const showTerminalMessage = (message, type = 'info') => {
            let msgContainer = document.getElementById('terminal-msg-box');

            // Create container if it doesn't exist
            if (!msgContainer) {
                msgContainer = document.createElement('div');
                msgContainer.id = 'terminal-msg-box';
                // Inline styles to match theme without modifying CSS files
                Object.assign(msgContainer.style, {
                    marginTop: '20px',
                    padding: '12px',
                    borderRadius: '4px',
                    fontFamily: "'Fira Code', monospace",
                    fontSize: '0.85rem',
                    textAlign: 'left',
                    display: 'none',
                    transition: 'all 0.3s ease'
                });

                // Insert after the submit button
                if (submitBtn.parentNode) {
                    submitBtn.parentNode.insertBefore(msgContainer, submitBtn.nextSibling);
                }
            }

            // Reset styles
            msgContainer.style.display = 'block';

            // Style based on type
            if (type === 'error') {
                msgContainer.style.background = 'rgba(255, 95, 86, 0.1)';
                msgContainer.style.borderLeft = '3px solid #ff5f56';
                msgContainer.style.color = '#ff5f56';
                msgContainer.innerHTML = `<span style="margin-right:8px">[!]</span> ${message}`;
            } else if (type === 'success') {
                msgContainer.style.background = 'rgba(0, 255, 159, 0.1)';
                msgContainer.style.borderLeft = '3px solid #00ff9f';
                msgContainer.style.color = '#00ff9f';
                msgContainer.innerHTML = `<span style="margin-right:8px">[+]</span> ${message}`;
            } else {
                msgContainer.style.background = 'rgba(13, 17, 23, 0.5)';
                msgContainer.style.borderLeft = '3px solid #00b8ff';
                msgContainer.style.color = '#00b8ff';
                msgContainer.innerHTML = `<span style="margin-right:8px">[*]</span> ${message}`;
            }
        };

        /**
         * Handle Login Submission
         */
        const handleLogin = async (e) => {
            e.preventDefault();
            if (!emailInput || !passwordInput) return;

            const email = emailInput.value.trim();
            const password = passwordInput.value;

            // UI Loading State
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '[ ACCESSING... ]';
            showTerminalMessage('Authenticating credentials...', 'info');

            try {
                const { error } = await client.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                showTerminalMessage('Access granted. Redirecting...', 'success');

                const nextPage = getNextPageFromUrl();
                setTimeout(() => {
                    window.location.href = `index.html#${nextPage}`;
                }, 700);
            } catch (err) {
                console.error('Login Error:', err);
                showTerminalMessage(err.message || 'Authentication failed.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        };

        /**
         * Handle Register Submission
         */
        const handleRegister = async (e) => {
            e.preventDefault();
            if (!usernameInput || !emailInput || !passwordInput || !confirmPassInput) return;

            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPass = confirmPassInput.value;

            // Validation
            if (password !== confirmPass) {
                showTerminalMessage('Passwords do not match.', 'error');
                return;
            }

            if (password.length < 6) {
                showTerminalMessage('Password must be at least 6 characters.', 'error');
                return;
            }

            // UI Loading State
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '[ INITIALIZING... ]';
            showTerminalMessage('Creating identity...', 'info');

            try {
                const { error } = await client.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            username: username
                        }
                    }
                });

                if (error) throw error;

                showTerminalMessage('Identity initialized. Check your email.', 'success');
                authForm.reset();

                // Keep button disabled to prevent re-submit
                submitBtn.innerHTML = '[ LINK SENT ]';
            } catch (err) {
                console.error('Register Error:', err);
                showTerminalMessage(err.message || 'Registration failed.', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        };

        // Attach Listeners
        if (isLoginPage) {
            authForm.addEventListener('submit', handleLogin);
        } else if (isRegisterPage) {
            authForm.addEventListener('submit', handleRegister);
        }
    });
})();
