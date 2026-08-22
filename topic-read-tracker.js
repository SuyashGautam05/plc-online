// ============================================================
//  topic-read-tracker.js  —  Add to every real lesson page
//  (the ~290 files under ./pages/**/*.html)
//
//  <script src="/auth-config.js"></script>
//  <script src="/topic-read-tracker.js"></script>
//
//  Rule: a topic counts as "read" once the visitor has stayed on
//  the page for a dwell period. The timer starts the moment the
//  page loads — no more waiting for a scroll-to-bottom. If they
//  close the tab/page before the dwell completes, nothing is sent
//  to the server — it is simply never marked read.
//
//  DYNAMIC DWELL DURATION: instead of one fixed time for every
//  topic, the dwell length scales with how long the topic actually
//  is. theory-enhancements.js already estimates each page's reading
//  time (word count / 200 wpm) and exposes it as
//  window.SIMTEL_TOPIC_READ_MINUTES - this file reads that and
//  scales the dwell period from it (roughly 60% of the estimated
//  reading time), clamped between MIN_DWELL_MS and MAX_DWELL_MS so
//  very short topics still take a sensible minimum and very long
//  ones don't take forever. If that global isn't available (e.g. a
//  page without theory-enhancements.js loaded), it falls back to
//  measuring word count directly from .theory-section itself, and
//  finally to a fixed default if neither is possible.
//
//  Broadcasts the current read-progress percentage via
//  'simtel:read-timer-tick' (0% at page load, rising to 100% as the
//  dwell period elapses) - theory-enhancements.js listens for this
//  and displays it inside the TOC drawer's #sidebar-progress-ring.
// ============================================================
(function () {
    const cfg = window.SIMTEL_AUTH_CONFIG;
    if (!cfg) { console.error('auth-config.js must load before topic-read-tracker.js'); return; }

    // ── Tunables ──
    const MIN_DWELL_MS = 60 * 1000;         // never require less than 1 minute, even for tiny topics
    const MAX_DWELL_MS = 5 * 60 * 1000;     // never require more than 5 minutes, even for huge topics
    const DWELL_FACTOR = 0.6;               // dwell = ~60% of the topic's estimated reading time
    const DEFAULT_DWELL_MS = 2.5 * 60 * 1000; // used only if no read-time estimate is available at all
    const BADGE_TICK_MS = 1000;             // how often the badge/ring updates

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

    // Works out this specific topic's dwell duration. Prefers
    // theory-enhancements.js's already-computed estimate (window.
    // SIMTEL_TOPIC_READ_MINUTES) since that avoids re-measuring the DOM
    // twice; falls back to measuring .theory-section itself if that
    // global isn't present, and finally to a fixed default.
    function computeDwellMs() {
        let minutes = typeof window.SIMTEL_TOPIC_READ_MINUTES === 'number'
            ? window.SIMTEL_TOPIC_READ_MINUTES
            : null;

        if (minutes === null) {
            const theory = document.querySelector('.theory-section');
            if (theory) {
                const words = theory.textContent.trim().split(/\s+/).length;
                minutes = Math.max(1, Math.round(words / 200)); // ~200 wpm, same formula theory-enhancements.js uses
            }
        }

        if (minutes === null) return DEFAULT_DWELL_MS;

        const scaled = minutes * 60 * 1000 * DWELL_FACTOR;
        return Math.min(MAX_DWELL_MS, Math.max(MIN_DWELL_MS, scaled));
    }

    let DWELL_MS = DEFAULT_DWELL_MS; // finalized inside DOMContentLoaded, once the page/theory-enhancements.js are ready
    let startedAt = null;
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

    // Broadcasts the current read-progress percentage so
    // theory-enhancements.js can display it inside #sidebar-progress-ring
    // in the TOC drawer.
    function broadcastPct(pct) {
        window.dispatchEvent(new CustomEvent('simtel:read-timer-tick', {
            detail: { pct: Math.max(0, Math.min(100, pct)) }
        }));
    }

    function tick() {
        if (marked) return;

        const elapsed = Date.now() - startedAt;
        const remaining = DWELL_MS - elapsed;

        if (remaining <= 0) {
            markRead();
            return;
        }

        const secondsLeft = Math.ceil(remaining / 1000);
        setBadge(`Not marked as read yet — ${secondsLeft}s left`, '#f59e0b');
        broadcastPct((elapsed / DWELL_MS) * 100);
        tickHandle = setTimeout(tick, BADGE_TICK_MS);
    }

    async function markRead() {
        if (marked) return;
        marked = true;
        if (tickHandle) clearTimeout(tickHandle);
        setBadge('Marked as read ✓', '#16a34a');
        broadcastPct(100);

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
            setBadge('Marked as read ✓', '#16a34a');
            broadcastPct(100);
            window.dispatchEvent(new CustomEvent('simtel:topic-marked-read', { detail: { fresh: false } }));
            return; // no need to run the dwell timer for something already read
        }

        // By this point theory-enhancements.js (a synchronous script late
        // in <body>) has already run and set window.SIMTEL_TOPIC_READ_MINUTES
        // if it's present on this page, so the dwell duration can be
        // computed per-topic now.
        DWELL_MS = computeDwellMs();

        // Timer starts the moment the page is ready - no more waiting for
        // the visitor to scroll anywhere.
        startedAt = Date.now();
        broadcastPct(0);
        tick();
    });

    // If the page is closed/reloaded before the dwell timer completes,
    // nothing has been sent to the server — the topic simply stays
    // "not read". No special handling needed here on purpose.
})();