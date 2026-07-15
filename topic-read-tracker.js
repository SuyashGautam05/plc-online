// ============================================================
//  topic-read-tracker.js  —  Add to every real lesson page
//  (the ~290 files under ./pages/**/*.html)
//
//  <script src="/auth-config.js"></script>
//  <script src="/topic-read-tracker.js"></script>
//
//  Rule: a topic only counts as "read" once the visitor has
//  scrolled to the bottom of the page AND stayed for a further
//  dwell period. If they close the tab/page before that, nothing
//  is sent to the server — it is simply never marked read.
//  While waiting, a small floating badge shows the current state.
// ============================================================
(function () {
    const cfg = window.SIMTEL_AUTH_CONFIG;
    if (!cfg) { console.error('auth-config.js must load before topic-read-tracker.js'); return; }

    // ── Tunables ──
    const DWELL_MS = 2.5 * 60 * 1000;   // 2.5 minutes after reaching the bottom (adjust between 2–3 min)
    const BOTTOM_THRESHOLD_PX = 48;     // how close to the very bottom counts as "reached the end"
    const BADGE_TICK_MS = 1000;         // how often the countdown badge updates

    const topicId = window.location.pathname;   // canonical id — must match index.html's toTopicId()
    const topicTitle = document.title || topicId;

    let reachedBottom = false;
    let bottomReachedAt = null;
    let marked = false;
    let tickHandle = null;

    // ── Floating status badge ──
    function injectBadge() {
        const el = document.createElement('div');
        el.id = 'simtel-read-tracker-badge';
        el.style.cssText = `
            position: fixed; bottom: 18px; right: 18px; z-index: 999998;
            display: flex; align-items: center; gap: 8px;
            background: #343a40; color: #fff;
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 0.78rem; padding: 8px 14px; border-radius: 20px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.3);
            pointer-events: none; user-select: none;
        `;
        el.innerHTML = `
            <span id="simtel-read-tracker-dot" style="width:8px;height:8px;border-radius:50%;background:#dc3545;flex-shrink:0;"></span>
            <span id="simtel-read-tracker-text">Not marked as read</span>
        `;
        document.body.appendChild(el);
    }

    function setBadge(text, color) {
        const dot = document.getElementById('simtel-read-tracker-dot');
        const txt = document.getElementById('simtel-read-tracker-text');
        if (dot) dot.style.background = color;
        if (txt) txt.textContent = text;
    }

    function pageHasNoScroll() {
        return document.documentElement.scrollHeight <= window.innerHeight + BOTTOM_THRESHOLD_PX;
    }

    function checkBottom() {
        if (reachedBottom) return;
        const scrolledTo = window.innerHeight + window.scrollY;
        const fullHeight = document.documentElement.scrollHeight;
        if (scrolledTo >= fullHeight - BOTTOM_THRESHOLD_PX) {
            reachedBottom = true;
            bottomReachedAt = Date.now();
            window.removeEventListener('scroll', checkBottom);
            tick(); // start the dwell countdown immediately
        }
    }

    function tick() {
        if (marked) return;

        if (!reachedBottom) {
            setBadge('Not marked as read — scroll to the end', '#dc3545');
            tickHandle = setTimeout(tick, BADGE_TICK_MS);
            return;
        }

        const elapsed = Date.now() - bottomReachedAt;
        const remaining = DWELL_MS - elapsed;

        if (remaining <= 0) {
            markRead();
            return;
        }

        const secondsLeft = Math.ceil(remaining / 1000);
        setBadge(`Not marked as read yet — ${secondsLeft}s left`, '#f59e0b');
        tickHandle = setTimeout(tick, BADGE_TICK_MS);
    }

    async function markRead() {
        if (marked) return;
        marked = true;
        if (tickHandle) clearTimeout(tickHandle);
        setBadge('Marked as read ✓', '#16a34a');

        const token = localStorage.getItem(cfg.TOKEN_KEY);
        if (!token) return; // not logged in — nothing to save

        try {
            await fetch(`${cfg.AUTH_SERVER_URL}/api/progress/mark-read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    topicId,
                    topicUrl: topicId,
                    topicTitle
                })
            });
        } catch (err) {
            console.warn('Could not save reading progress:', err);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        injectBadge();

        // Short pages with no real scrollbar: treat "at the bottom" as
        // already true, but the dwell timer still has to run its course.
        if (pageHasNoScroll()) {
            reachedBottom = true;
            bottomReachedAt = Date.now();
        } else {
            window.addEventListener('scroll', checkBottom, { passive: true });
        }

        tick();
    });

    // If the page is closed/reloaded before the conditions are met,
    // nothing has been sent to the server — the topic simply stays
    // "not read". No special handling needed here on purpose.
})();