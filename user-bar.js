// ============================================================
//  user-bar.js  —  Injects a top user bar with name + logout
//  Add after auth-guard.js in every page's <head>
//
//  <script src="/auth-config.js"></script>
//  <script src="/auth-guard.js"></script>
//  <script src="/user-bar.js"></script>
// ============================================================

(function () {
    const cfg = window.SIMTEL_AUTH_CONFIG;

    document.addEventListener('DOMContentLoaded', () => {
        const userRaw = localStorage.getItem(cfg.USER_KEY);
        const user = userRaw ? JSON.parse(userRaw) : null;
        if (!user) return;

        // Inject styles
        const style = document.createElement('style');
        style.textContent = `
            #simtel-user-bar {
                position: fixed;
                top: 0; right: 0;
                z-index: 99999;
                display: flex;
                align-items: center;
                gap: 10px;
                background: #343a40;
                color: #fff;
                padding: 6px 14px;
                font-family: Georgia, serif;
                font-size: 0.82rem;
                border-bottom-left-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.25);
            }
            #simtel-user-bar .simtel-user-name {
                font-weight: 600;
                color: #f8f9fa;
            }
            #simtel-user-bar .simtel-user-role {
                background: #6c757d;
                color: #fff;
                padding: 1px 7px;
                border-radius: 10px;
                font-size: 0.72rem;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            #simtel-user-bar .simtel-user-role.admin {
                background: #0d6efd;
            }
            #simtel-user-bar button {
                background: transparent;
                color: #adb5bd;
                border: 1px solid #6c757d;
                border-radius: 4px;
                padding: 2px 10px;
                font-size: 0.78rem;
                cursor: pointer;
                font-family: inherit;
                transition: all 0.15s;
            }
            #simtel-user-bar button:hover {
                background: #dc3545;
                color: #fff;
                border-color: #dc3545;
            }
            #simtel-user-bar .simtel-admin-link {
                color: #74c0fc;
                text-decoration: none;
                font-size: 0.78rem;
            }
            #simtel-user-bar .simtel-admin-link:hover {
                text-decoration: underline;
            }
            // body { padding-top: 34px !important; }
            body { padding-top: 1px !important; }
        `;
        document.head.appendChild(style);

        // Build bar
        const bar = document.createElement('div');
        bar.id = 'simtel-user-bar';

        const roleBadge = user.role === 'admin'
            ? `<span class="simtel-user-role admin">Admin</span>`
            : `<span class="simtel-user-role">User</span>`;

        const adminLink = user.role === 'admin'
            ? `<a href="${window.location.origin + cfg.ADMIN_PAGE}" class="simtel-admin-link">⚙ Admin Panel</a>`
            : '';

        bar.innerHTML = `
            <span class="simtel-user-name">👤 ${user.name}</span>
            ${roleBadge}
            ${adminLink}
            <button id="simtel-logout-btn">Logout</button>
        `;
        document.body.insertBefore(bar, document.body.firstChild);

        document.getElementById('simtel-logout-btn').addEventListener('click', async () => {
            const token = localStorage.getItem(cfg.TOKEN_KEY);
            try {
                await fetch(`${cfg.AUTH_SERVER_URL}/api/auth/logout`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch { /* ignore */ }
            localStorage.removeItem(cfg.TOKEN_KEY);
            localStorage.removeItem(cfg.USER_KEY);
            window.location.replace(window.location.origin + cfg.LOGIN_PAGE);
        });
    });
})();