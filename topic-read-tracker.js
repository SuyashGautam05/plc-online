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

    const topicId = canonicalPathId(window.location.pathname);   // canonical id — must match index.html's toTopicId()
    const topicTitle = document.title || topicId;

    // Percent-encoded pathnames (e.g. spaces as %20) can end up encoded
    // slightly differently depending on how they were produced - decoding
    // to a plain, human-readable string removes that entire class of
    // mismatch so this always matches what index.html computes for the
    // same page. Falls back to the raw path if decoding ever throws (a
    // malformed %-sequence), rather than crashing the tracker.
    function canonicalPathId(pathname) {
        try { return decodeURIComponent(pathname); }
        catch { return pathname; }
    }

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
            display: none; align-items: center; gap: 8px;
            background: #343a40; color: #fff;
            font-family: Georgia, 'Times New Roman', serif;
            font-size: 0.78rem; padding: 8px 14px; border-radius: 20px;
            box-shadow: 0 2px 12px rgba(0,0,0,0.3);
            pointer-events: none; user-select: none;
        `;
        el.innerHTML = `
            <span id="simtel-read-tracker-dot" style="width:8px;height:8px;border-radius:50%;background:#6c757d;flex-shrink:0;"></span>
            <span id="simtel-read-tracker-text">Checking status…</span>
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

        // Let any listener (e.g. theory-enhancements.js's TOC drawer /
        // celebration toast) know, without this file needing to know who's
        // listening. fresh:true = just now completed the dwell timer.
        window.dispatchEvent(new CustomEvent('simtel:topic-marked-read', { detail: { fresh: true } }));

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

    // Checks whether THIS topic is already marked read for the logged-in
    // user, before starting the scroll/dwell tracking from scratch. Without
    // this, revisiting an already-read page always showed "Not marked as
    // read" and made you wait through the dwell timer again, even though
    // the server already had it recorded - the tracker never looked.
    async function checkAlreadyRead() {
        const token = localStorage.getItem(cfg.TOKEN_KEY);
        if (!token) return false; // not logged in - nothing to check

        try {
            const res = await fetch(`${cfg.AUTH_SERVER_URL}/api/progress/my-progress`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json().catch(() => ({}));
            if (!data.success || !Array.isArray(data.topics)) return false;

            return data.topics.some(t => {
                // Compare canonically, same as index.html's toTopicId() -
                // a record saved before the decode fix may still be
                // percent-encoded, so check both forms.
                if (t.topicId === topicId) return true;
                try { return decodeURIComponent(t.topicId) === topicId; }
                catch { return false; }
            });
        } catch (err) {
            console.warn('Could not check existing reading progress:', err);
            return false; // fall back to normal tracking rather than blocking
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        injectBadge();

        const alreadyRead = await checkAlreadyRead();
        if (alreadyRead) {
            marked = true;
            setBadge('Marked as read ✓', '#16a34a');
            window.dispatchEvent(new CustomEvent('simtel:topic-marked-read', { detail: { fresh: false } }));
            return; // no need to track scroll/dwell for something already read
        }

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