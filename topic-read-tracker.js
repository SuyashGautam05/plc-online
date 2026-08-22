// ============================================================
//  topic-read-tracker.js  —  Add to every real lesson page
//  (the ~290 files under ./pages/**/*.html)
//
//  <script src="/auth-config.js"></script>
//  <script src="/topic-read-tracker.js"></script>
//
//  Rule: a topic counts as "read" once the visitor has stayed on
//  the page for DWELL_MS (2:30) — the timer starts the moment the
//  page loads, not after scrolling to the bottom. If they close the
//  tab/page before that, nothing is sent to the server — it is
//  simply never marked read. While waiting, a floating clock-style
//  badge (bottom-right) fills up as time passes, and the same
//  progress is broadcast via 'simtel:read-timer-tick' so
//  theory-enhancements.js can mirror it inside the TOC drawer.
// ============================================================
(function () {
    const cfg = window.SIMTEL_AUTH_CONFIG;
    if (!cfg) { console.error('auth-config.js must load before topic-read-tracker.js'); return; }

    // ── Tunables ──
    const DWELL_MS = 2.5 * 60 * 1000;   // 2:30 total, starts counting from page load
    const BADGE_TICK_MS = 1000;         // how often the badge/ring updates

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

    let startedAt = null;
    let marked = false;
    let tickHandle = null;

    // ── Floating status badge - just a plain white ring that fills up
    // (conic-gradient) as the dwell period elapses. Fully self-contained
    // inline styles - this file doesn't depend on defination.css being
    // loaded/intact, since it runs on every single topic page. ──
    function injectBadge() {
        const el = document.createElement('div');
        el.id = 'simtel-read-tracker-badge';
        el.style.cssText = `
            position: fixed; bottom: 18px; right: 18px; z-index: 999998;
            width: 34px; height: 34px;
            pointer-events: none; user-select: none;
        `;
        el.innerHTML = `
            <div id="simtel-read-ring" style="--pct:0; width:34px; height:34px; border-radius:50%;
                 background: conic-gradient(#ffffff calc(var(--pct) * 1%), rgba(0,0,0,0.35) 0);
                 box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                 transition: background 0.3s linear;">
            </div>
        `;
        document.body.appendChild(el);
    }

    function setBadgeRing(pct) {
        const ring = document.getElementById('simtel-read-ring');
        if (ring) ring.style.setProperty('--pct', pct);
    }

    function broadcastTick(pct, secondsLeft, done) {
        window.dispatchEvent(new CustomEvent('simtel:read-timer-tick', {
            detail: { pct, secondsLeft, done }
        }));
    }

    function showDone(fresh) {
        setBadgeRing(100);
        broadcastTick(100, 0, true);
        // Let any listener (e.g. theory-enhancements.js's TOC drawer /
        // celebration toast) know, without this file needing to know who's
        // listening. fresh:true = just now completed the dwell timer.
        window.dispatchEvent(new CustomEvent('simtel:topic-marked-read', { detail: { fresh } }));
    }

    function tick() {
        if (marked) return;

        const elapsed = Date.now() - startedAt;
        const remaining = DWELL_MS - elapsed;
        const pct = Math.min(100, (elapsed / DWELL_MS) * 100);

        if (remaining <= 0) {
            markRead();
            return;
        }

        setBadgeRing(pct);
        broadcastTick(pct, Math.ceil(remaining / 1000), false);

        tickHandle = setTimeout(tick, BADGE_TICK_MS);
    }

    async function markRead() {
        if (marked) return;
        marked = true;
        if (tickHandle) clearTimeout(tickHandle);
        showDone(true);

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
    // user, before starting the dwell timer from scratch. Without this,
    // revisiting an already-read page would restart the whole countdown
    // even though the server already had it recorded.
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
            showDone(false);
            return; // no need to run the dwell timer for something already read
        }

        // Timer starts the moment the page is ready - no more waiting for
        // the visitor to scroll anywhere.
        startedAt = Date.now();
        broadcastTick(0, Math.ceil(DWELL_MS / 1000), false);
        tick();
    });

    // If the page is closed/reloaded before the dwell timer completes,
    // nothing has been sent to the server — the topic simply stays
    // "not read". No special handling needed here on purpose.
})();