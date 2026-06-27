// ============================================================
//  auth-config.js  —  Drop this file into every SimTel product
//  Change only AUTH_SERVER_URL to point to your Render server
// ============================================================

window.SIMTEL_AUTH_CONFIG = {
    // ▼ CHANGE THIS to your deployed Render auth server URL
    AUTH_SERVER_URL: 'https://plc-deploy-q9qz.vercel.app',

    // App ID for this product (used to check app-level access)
    APP_ID: 'plc-simtel',

    // Login page path relative to product root
    LOGIN_PAGE: '/login.html',

    // Admin panel path (only accessible to admin role)
    ADMIN_PAGE: '/admin.html',

    // Token key in localStorage
    TOKEN_KEY: 'simtel_token',
    USER_KEY: 'simtel_user',
};