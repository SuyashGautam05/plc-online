// ============================================================
//  theory-enhancements.js  —  OPTIONAL, add to topic lesson pages.
//
//  Restructures the page into a hero + chunked sections + sidebar,
//  and adds: dark mode toggle, image lightbox, per-section
//  copy-link + reading-time badges, a mobile TOC bottom sheet, and
//  small toast notifications (link copied / topic marked as read).
//
//  Add ONE tag near the end of <body>, after mcq-handler.js:
//  <script src="/theory-enhancements.js"></script>
//
//  Pure vanilla JS, no external library/CDN. Every piece checks
//  for what it needs and no-ops if it's missing, so it's safe to
//  roll out incrementally across pages.
// ============================================================
(function () {
    const wrapper = document.querySelector('.content-wrapper');
    const theory = document.querySelector('.theory-section');
    if (!wrapper || !theory) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    initThemeToggle();

    const sections = wrapIntoSections(theory);
    const wordCount = theory.textContent.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.round(wordCount / 200)); // ~200 wpm

    // Not shown anywhere in the UI (per request, no "time" displays) - but
    // topic-read-tracker.js reads this to scale its dwell timer per-topic
    // instead of using one fixed duration for every page.
    window.SIMTEL_TOPIC_READ_MINUTES = minutes;

    buildHero(wrapper, sections.length, minutes);
    decorateHeadings(sections);

    if (sections.length >= 2) {
        buildTocDrawer(sections, minutes);
    }

    initProgressBar();
    initImageLightbox();
    if (!prefersReducedMotion) initScrollReveal(sections);
    listenForReadCelebration();

    // ── Dark mode toggle, injected next to the logo ──────────
    function initThemeToggle() {
        const header = document.querySelector('header');
        const logoContainer = document.querySelector('.logo-container');
        if (!header || !logoContainer) return;

        const row = document.createElement('div');
        row.className = 'header-row';
        header.insertBefore(row, logoContainer);
        row.appendChild(logoContainer); // moves it, doesn't duplicate

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'theme-toggle-btn';
        btn.setAttribute('aria-label', 'Toggle dark mode');
        btn.style.display = 'none';
        row.appendChild(btn);

        const apply = theme => {
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                btn.innerHTML = '<i class="fas fa-sun"></i>';
            } else {
                document.documentElement.removeAttribute('data-theme');
                btn.innerHTML = '<i class="fas fa-moon"></i>';
            }
        };

        apply(localStorage.getItem('simtel-theme') || 'light');

        btn.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const next = isDark ? 'light' : 'dark';
            apply(next);
            localStorage.setItem('simtel-theme', next);
        });
    }

    // ── Wrap each h2 + everything until the next h2 into a
    // <section class="lesson-section"> so the page reads as
    // distinct chunks instead of one continuous flow. ──
    function wrapIntoSections(theoryEl) {
        const children = Array.from(theoryEl.children);
        const frag = document.createDocumentFragment();
        const madeSections = [];
        let current = null;

        children.forEach(el => {
            if (el.tagName === 'H2') {
                current = document.createElement('section');
                current.className = 'lesson-section';
                frag.appendChild(current);
                madeSections.push(current);
            }
            if (current) {
                current.appendChild(el); // moves el out of theoryEl automatically
            } else {
                frag.appendChild(el); // lead content before the first h2
            }
        });

        theoryEl.appendChild(frag);

        madeSections.forEach((sec, i) => {
            const h2 = sec.querySelector('h2');
            if (h2 && !h2.id) h2.id = 'section-' + (i + 1);
        });

        return madeSections;
    }

    // ── Hero band: eyebrow + cloned title + meta chips ──
    function buildHero(wrapperEl, sectionCount, readMinutes) {
        const h1 = document.querySelector('header h1');
        const title = h1 ? h1.textContent.trim() : document.title;

        const hero = document.createElement('div');
        hero.className = 'lesson-hero';
        hero.innerHTML = `
            <div class="lesson-hero-inner">
                <span class="lesson-eyebrow"><i class="fas fa-graduation-cap"></i> Lesson</span>
                <h2 class="lesson-hero-title">${escapeHtml(title)}</h2>
                <div class="lesson-meta">
                    ${sectionCount ? `<span class="meta-chip"><i class="fas fa-layer-group"></i> ${sectionCount} section${sectionCount > 1 ? 's' : ''}</span>` : ''}
                </div>
            </div>
        `;
        wrapperEl.insertBefore(hero, wrapperEl.firstChild);
    }

    // ── Copy-link button on each h2 ──
    function decorateHeadings(sectionEls) {
        sectionEls.forEach(sec => {
            const h2 = sec.querySelector('h2');
            if (!h2) return;

            const actions = document.createElement('span');
            actions.className = 'h2-actions';
            actions.innerHTML = `
                <button type="button" class="section-link-btn" aria-label="Copy link to this section"><i class="fas fa-link"></i></button>
            `;
            h2.appendChild(actions);

            actions.querySelector('.section-link-btn').addEventListener('click', e => {
                e.stopPropagation();
                const url = location.origin + location.pathname + '#' + h2.id;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(url)
                        .then(() => showToast('Link copied!', 'fa-check'))
                        .catch(() => {});
                }
            });
        });
    }

    // ── Sidebar: progress ring + TOC + back-to-top, sticky in-flow ──
    // ── Table of contents: a toggle button fixed on the left edge
    // opens a slide-in drawer (progress ring + section links). Same
    // implementation serves desktop and mobile - no separate sidebar
    // column and no separate mobile sheet to keep in sync. ──
    function buildTocDrawer(sectionEls, readMinutes) {
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.id = 'toc-toggle-btn';
        toggleBtn.innerHTML = '<i class="fas fa-list"></i>';
        toggleBtn.setAttribute('aria-label', 'Table of contents');
        toggleBtn.setAttribute('aria-expanded', 'false');
        document.body.appendChild(toggleBtn);

        const overlay = document.createElement('div');
        overlay.id = 'toc-drawer-overlay';
        document.body.appendChild(overlay);

        const tocLinks = sectionEls.map(sec => {
            const h2 = sec.querySelector('h2');
            return h2 ? `<a href="#${h2.id}" data-target="${h2.id}">${escapeHtml(h2.textContent.trim())}</a>` : '';
        }).join('');

        const drawer = document.createElement('div');
        drawer.id = 'toc-drawer';
        drawer.innerHTML = `
            <div class="toc-drawer-header">
                <span class="toc-drawer-title"><i class="fas fa-list"></i> Contents</span>
                <button type="button" class="toc-drawer-close" aria-label="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="sidebar-block">
                <div class="sidebar-title">Your progress</div>
                <div class="progress-ring-wrap">
                    <div class="progress-ring" id="sidebar-progress-ring">
                        <div class="progress-ring-inner" id="sidebar-progress-pct">0%</div>
                    </div>
                    <div class="progress-ring-label"><strong>${sectionEls.length}</strong> section${sectionEls.length > 1 ? 's' : ''}</div>
                </div>
            </div>
            <div class="sidebar-block">
                <div class="sidebar-title">Read status</div>
                <div class="read-status-badge" id="read-status-badge">
                    <i class="fas fa-circle-notch"></i> Not read yet
                </div>
            </div>
            <div class="sidebar-block">
                <div class="sidebar-title">On this page</div>
                <nav id="toc-list">${tocLinks}</nav>
            </div>
            <div class="sidebar-block">
                <button type="button" class="back-to-top-btn" id="back-to-top-btn">
                    <i class="fas fa-arrow-up"></i> Back to top
                </button>
            </div>
        `;
        document.body.appendChild(drawer);

        const open = () => {
            drawer.classList.add('open');
            overlay.classList.add('open');
            toggleBtn.classList.add('active');
            toggleBtn.setAttribute('aria-expanded', 'true');
        };
        const close = () => {
            drawer.classList.remove('open');
            overlay.classList.remove('open');
            toggleBtn.classList.remove('active');
            toggleBtn.setAttribute('aria-expanded', 'false');
        };

        toggleBtn.addEventListener('click', () => {
            drawer.classList.contains('open') ? close() : open();
        });
        overlay.addEventListener('click', close);
        drawer.querySelector('.toc-drawer-close').addEventListener('click', close);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

        drawer.querySelector('#toc-list').addEventListener('click', e => {
            const a = e.target.closest('a');
            if (!a) return;
            e.preventDefault();
            close();
            setTimeout(() => document.getElementById(a.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 280);
        });

        drawer.querySelector('#back-to-top-btn').addEventListener('click', () => {
            close();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        initActiveHeadingTracking(sectionEls);
    }

    // ── Reading progress bar + sidebar progress ring, driven by scroll ──
function initProgressBar() {
    const bar = document.createElement('div');
    bar.id = 'reading-progress-bar';
    document.body.appendChild(bar);

    // Note: this bar only tracks raw scroll position (top-of-viewport
    // progress bar). #sidebar-progress-ring in the TOC drawer is
    // intentionally NOT updated here - it's driven by
    // topic-read-tracker.js's 'simtel:read-timer-tick' broadcasts instead
    // (see listenForReadCelebration below), so it reflects actual
    // read-tracking progress rather than raw scroll position.
    const update = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0;
        bar.style.width = pct + '%';
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
}

    // ── Highlight the current section's TOC entry while scrolling ──
    function initActiveHeadingTracking(sectionEls) {
        const links = document.querySelectorAll('#toc-list a');
        if (!links.length) return;

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                const h2 = entry.target.querySelector('h2');
                if (!h2) return;
                links.forEach(l => l.classList.remove('active'));
                document.querySelector(`#toc-list a[data-target="${h2.id}"]`)?.classList.add('active');
            });
        }, { rootMargin: '-15% 0px -70% 0px' });

        sectionEls.forEach(sec => observer.observe(sec));
    }

    // ── Gentle fade-up as each section enters the viewport ──
    function initScrollReveal(sectionEls) {
        if (!sectionEls.length) return;
        sectionEls.forEach(el => el.classList.add('reveal-on-scroll'));

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -60px 0px' });

        sectionEls.forEach(el => observer.observe(el));
    }

    // ── Click any diagram to view it larger ──
    function initImageLightbox() {
        const images = theory.querySelectorAll('img');
        if (!images.length) return;

        const overlay = document.createElement('div');
        overlay.id = 'img-lightbox';
        overlay.innerHTML = `
            <button type="button" id="img-lightbox-close" aria-label="Close"><i class="fas fa-times"></i></button>
            <img id="img-lightbox-img" src="" alt="">
        `;
        document.body.appendChild(overlay);

        const imgEl = overlay.querySelector('#img-lightbox-img');

        images.forEach(img => {
            img.addEventListener('click', () => {
                imgEl.src = img.currentSrc || img.src;
                imgEl.alt = img.alt || '';
                overlay.classList.add('open');
            });
        });

        const close = () => overlay.classList.remove('open');
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        overlay.querySelector('#img-lightbox-close').addEventListener('click', close);
        document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    }

    // ── Small toast helper, reused for copy-link + read celebration ──
    function showToast(message, icon) {
        let toast = document.getElementById('simtel-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'simtel-toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = `<i class="fas ${icon || 'fa-check'}"></i> ${escapeHtml(message)}`;
        toast.classList.add('show');
        clearTimeout(toast._hideTimer);
        toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 2600);
    }

    // ── topic-read-tracker.js dispatches 'simtel:topic-marked-read' both
    // when the dwell timer just completed (fresh:true) AND when a page
    // that was already read gets reloaded (fresh:false) - either way, sync
    // the drawer's read-status badge. Only show the celebration toast for
    // a genuinely new completion, not every time an already-read page loads. ──
    function listenForReadCelebration() {
        window.addEventListener('simtel:topic-marked-read', e => {
            setReadStatusBadge(true);
            if (e.detail && e.detail.fresh) {
                showToast("Nice! Marked as read.", 'fa-circle-check');
            }
        });

        // topic-read-tracker.js broadcasts read-progress percentage here
        // (0% until the visitor scrolls to the bottom, then rising to 100%
        // over the dwell period) - drives the SAME ring used for "Your
        // progress" in the TOC drawer, so it shows live read-tracking
        // status instead of raw scroll position.
        window.addEventListener('simtel:read-timer-tick', e => {
            const pct = e.detail && typeof e.detail.pct === 'number' ? e.detail.pct : 0;
            const ring = document.getElementById('sidebar-progress-ring');
            const pctLabel = document.getElementById('sidebar-progress-pct');
            if (ring) ring.style.setProperty('--pct', pct);
            if (pctLabel) pctLabel.textContent = Math.round(pct) + '%';
        });
    }

    function setReadStatusBadge(isRead) {
        const badge = document.getElementById('read-status-badge');
        if (!badge) return;
        badge.classList.toggle('is-read', isRead);
        badge.innerHTML = isRead
            ? '<i class="fas fa-check-circle"></i> Marked as read'
            : '<i class="fas fa-circle-notch"></i> Not read yet';
    }

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
})();