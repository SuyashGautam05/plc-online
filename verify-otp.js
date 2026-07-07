const cfg = window.SIMTEL_AUTH_CONFIG;

const form = document.getElementById('verifyForm');
const emailInput = document.getElementById('email');
const otpInput = document.getElementById('otp');
const errorMsg = document.getElementById('errorMsg');
const successMsg = document.getElementById('successMsg');
const verifyBtn = document.getElementById('verifyBtn');
const resendLink = document.getElementById('resendLink');

// Pre-fill email if passed in URL
const params = new URLSearchParams(window.location.search);
if (params.get('email')) {
    emailInput.value = params.get('email');
}

function showMsg(el, msg) {
    const span = el.querySelector('span');
    if (span) span.textContent = msg;
    else el.textContent = msg;
    el.classList.add('show');
}

function hideMsg(el) {
    el.classList.remove('show');
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideMsg(errorMsg);
    hideMsg(successMsg);
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<span class="spinner"></span>Verifying...';

    try {
        const res = await fetch(cfg.AUTH_SERVER_URL + '/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: emailInput.value.trim(), otp: otpInput.value.trim() })
        });
        const data = await res.json();

        if (!data.success) throw new Error(data.message);

        showMsg(successMsg, data.message);
        setTimeout(() => {
            window.location.href = cfg.LOGIN_PAGE + '?email=' + encodeURIComponent(emailInput.value.trim());
        }, 1500);
    } catch (err) {
        showMsg(errorMsg, err.message);
    } finally {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify';
    }
});

resendLink.addEventListener('click', async (e) => {
    e.preventDefault();
    hideMsg(errorMsg);
    hideMsg(successMsg);

    const email = emailInput.value.trim();
    if (!email) {
        showMsg(errorMsg, 'Enter your email first.');
        return;
    }

    try {
        const res = await fetch(cfg.AUTH_SERVER_URL + '/api/auth/resend-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        showMsg(successMsg, data.message);
    } catch (err) {
        showMsg(errorMsg, err.message);
    }
});