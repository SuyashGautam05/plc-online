// ============================================================
//  theory-enhancements.js  —  OPTIONAL, add to topic lesson pages.
//
//  This is what turns the page from "one long scroll of text"
//  into: a hero band, distinct chunked sections, and a real
//  in-flow sidebar (progress ring + table of contents). All of
//  it is generated from the existing markup - no per-page HTML
//  changes needed, just this one script tag near the end of
//  <body>, after mcq-handler.js:
//
//  <script src="/theory-enhancements.js"></script>
//
//  Pure vanilla JS, no external library/CDN. If .theory-section
//  or .content-wrapper aren't found, it no-ops safely - fine to
//  roll out to some pages before others.
// ============================================================
(function () {
    const wrapper = document.querySelector('.content-wrapper');
    const theory = document.querySelector('.theory-section');
    if (!wrapper || !theory) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const sections = wrapIntoSections(theory);
    const wordCount = theory.textContent.trim().split(/\s+/).length;
    const minutes = Math.max(1, Math.round(wordCount / 200)); // ~200 wpm

    buildHero(wrapper, sections.length, minutes);

    if (sections.length >= 2) {
        buildSidebar(wrapper, theory, sections, minutes);
        wrapper.classList.add('has-sidebar');
    }

    initProgressBar();
    if (!prefersReducedMotion) initScrollReveal(sections);

    // ── Wrap each h2 + everything until the next h2 into a
    // <section class="lesson-section"> - this is what makes the
    // page read as distinct chunks instead of one continuous flow. ──
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

        // Give each section's heading a stable id for anchors/TOC.
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
            <span class="lesson-eyebrow"><i class="fas fa-graduation-cap"></i> Lesson</span>
            <h2 class="lesson-hero-title">${escapeHtml(title)}</h2>
            <div class="lesson-meta">
                <span class="meta-chip"><i class="fas fa-clock"></i> ${readMinutes} min read</span>
                ${sectionCount ? `<span class="meta-chip"><i class="fas fa-layer-group"></i> ${sectionCount} section${sectionCount > 1 ? 's' : ''}</span>` : ''}
            </div>
        `;
        wrapperEl.insertBefore(hero, wrapperEl.firstChild);
    }

    // ── Sidebar: progress ring + TOC + back-to-top, sticky in-flow ──
    function buildSidebar(wrapperEl, theoryEl, sectionEls, readMinutes) {
        const aside = document.createElement('aside');
        aside.id = 'lesson-sidebar';

        const tocLinks = sectionEls.map(sec => {
            const h2 = sec.querySelector('h2');
            if (!h2) return '';
            // Read the heading's own text, skipping the numbered badge
            // (which is CSS ::before content, not real text - safe).
            const label = h2.textContent.trim();
            return `<a href="#${h2.id}" data-target="${h2.id}">${escapeHtml(label)}</a>`;
        }).join('');

        aside.innerHTML = `
            <div class="sidebar-block">
                <div class="sidebar-title">Your progress</div>
                <div class="progress-ring-wrap">
                    <div class="progress-ring" id="sidebar-progress-ring">
                        <div class="progress-ring-inner" id="sidebar-progress-pct">0%</div>
                    </div>
                    <div class="progress-ring-label">~${readMinutes} min read<br><strong>${sectionEls.length}</strong> section${sectionEls.length > 1 ? 's' : ''}</div>
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

        theoryEl.insertAdjacentElement('afterend', aside);

        aside.querySelector('#toc-list').addEventListener('click', e => {
            const a = e.target.closest('a');
            if (!a) return;
            e.preventDefault();
            document.getElementById(a.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        aside.querySelector('#back-to-top-btn').addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        initActiveHeadingTracking(sectionEls);
    }

    // ── Reading progress bar + sidebar progress ring, driven by scroll ──
    function initProgressBar() {
        const bar = document.createElement('div');
        bar.id = 'reading-progress-bar';
        document.body.appendChild(bar);

        const ring = document.getElementById('sidebar-progress-ring');
        const pctLabel = document.getElementById('sidebar-progress-pct');

        const update = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const pct = docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0;
            bar.style.width = pct + '%';
            if (ring) ring.style.setProperty('--pct', pct);
            if (pctLabel) pctLabel.textContent = pct + '%';
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

    function escapeHtml(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
})();