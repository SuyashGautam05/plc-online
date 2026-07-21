// ============================================================
//  auth-guard.js  —  Add ONE <script> tag to every HTML page:
//
//  <script src="/auth-config.js"></script>
//  <script src="/auth-guard.js"></script>
//
//  Put these tags at the TOP of <head> (before any content).
//  The page will stay hidden until the token is verified.
// ============================================================

(async function () {
    const cfg = window.SIMTEL_AUTH_CONFIG;
    if (!cfg) { console.error('auth-config.js not loaded'); return; }

    // How often to silently re-check the session while the page stays open.
    // This is what catches an admin force-logout, a deactivation, or a
    // license-seat eviction promptly instead of only on next navigation.
    const POLL_INTERVAL_MS = 90 * 1000;

    // Hide body until verified (prevents flash of content)
    document.documentElement.style.visibility = 'hidden';

    const token = localStorage.getItem(cfg.TOKEN_KEY);

    if (!token) {
        redirectToLogin('No session found');
        return;
    }

    try {
        const res = await checkSession(token);

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            clearSession();
            redirectToLogin(data.message || 'Session expired');
            return;
        }

        const data = await res.json();

        if (!data.success) {
            clearSession();
            redirectToLogin('Access denied');
            return;
        }

        // Store refreshed user info
        localStorage.setItem(cfg.USER_KEY, JSON.stringify(data.user));

        // Show the page
        document.documentElement.style.visibility = 'visible';

        startPolling();

    } catch (err) {
        // Network error — allow access with cached token (offline tolerance)
        console.warn('Auth server unreachable, using cached session');
        document.documentElement.style.visibility = 'visible';
        startPolling();
    }

    function checkSession(currentToken) {
        return fetch(`${cfg.AUTH_SERVER_URL}/api/auth/verify`, {
            headers: { Authorization: `Bearer ${currentToken}` }
        });
    }

    function startPolling() {
        setInterval(async () => {
            const currentToken = localStorage.getItem(cfg.TOKEN_KEY);
            if (!currentToken) return; // already logged out some other way

            try {
                const res = await checkSession(currentToken);
                if (!res.ok) {
                    const data = await res.json().catch(() => ({}));
                    clearSession();
                    alert(data.message || 'You have been logged out.');
                    redirectToLogin(data.message || 'Session invalidated');
                }
                // On success we don't need to do anything - staying logged in
                // is the default state. We intentionally don't re-write
                // localStorage user info on every poll to avoid unnecessary writes.
            } catch {
                // Network hiccup - don't log the user out over a blip, just
                // skip this cycle and try again next interval.
            }
        }, POLL_INTERVAL_MS);
    }

    function redirectToLogin(reason) {
        console.warn('Auth redirect:', reason);
        // Build absolute login URL from current origin
        const loginUrl = window.location.origin + cfg.LOGIN_PAGE +
            '?redirect=' + encodeURIComponent(window.location.href);
        window.location.replace(loginUrl);
    }

    function clearSession() {
        localStorage.removeItem(cfg.TOKEN_KEY);
        localStorage.removeItem(cfg.USER_KEY);
    }
})();