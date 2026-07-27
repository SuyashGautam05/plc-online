// ============================================================
//  theory-enhancements.js  —  OPTIONAL, add to topic lesson pages
//  for a reading progress bar, auto table-of-contents, gentle
//  scroll-reveal animations, and a reading-time badge.
//
//  Pure vanilla JS, no external library, no CDN dependency. Works
//  generically off the existing markup (.theory-section, h2/h3,
//  p/ul/ol/table/img) - no changes needed to any topic page's
//  content itself.
//
//  Add ONE tag near the end of <body>, after the theory-section
//  content exists in the DOM (same place mcq-handler.js is loaded):
//
//  <script src="/theory-enhancements.js"></script>
//
//  Safe to add to some pages and not others - the CSS rules it
//  relies on (in defination.css) are inert if this script is
//  absent, and this script no-ops gracefully if .theory-section
//  isn't found.
// ============================================================
(function () {
    const theory = document.querySelector('.theory-section');
    if (!theory) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    initProgressBar();
    initReadingTimeBadge();
    const headings = initTableOfContents();
    if (!prefersReducedMotion) initScrollReveal();
    if (headings.length) initActiveHeadingTracking(headings);

    // ── Reading progress bar ──────────────────────────────
    function initProgressBar() {
        const bar = document.createElement('div');
        bar.id = 'reading-progress-bar';
        document.body.appendChild(bar);

        const update = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const pct = docHeight > 0 ? Math.min(100, (scrollTop / docHeight) * 100) : 0;
            bar.style.width = pct + '%';
        };
        update();
        window.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
    }

    // ── Estimated reading time, inserted right after <h1> ──
    function initReadingTimeBadge() {
        const h1 = document.querySelector('header h1');
        if (!h1) return;

        const words = theory.innerText.trim().split(/\s+/).length;
        const minutes = Math.max(1, Math.round(words / 200)); // ~200 wpm

        const badge = document.createElement('div');
        badge.className = 'reading-time-badge';
        badge.innerHTML = `<i class="fas fa-clock"></i> ${minutes} min read`;
        h1.insertAdjacentElement('afterend', badge);
    }

    // ── Auto table of contents from h2s (falls back to h2+h3) ──
    function initTableOfContents() {
        const headings = Array.from(theory.querySelectorAll('h2'));
        if (headings.length < 3) return []; // not worth a TOC for a short page

        headings.forEach((h, i) => {
            if (!h.id) h.id = 'section-' + (i + 1);
        });

        const panel = document.createElement('nav');
        panel.id = 'toc-panel';
        panel.innerHTML = `
            <div class="toc-title"><i class="fas fa-list"></i> On this page</div>
            ${headings.map(h => `<a href="#${h.id}" data-target="${h.id}">${h.textContent.trim()}</a>`).join('')}
        `;
        document.body.appendChild(panel);

        // Reveal the panel once the reader has scrolled past the intro,
        // rather than showing it immediately (keeps first impression clean).
        const onScroll = () => {
            panel.classList.toggle('visible', window.scrollY > 300);
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });

        panel.addEventListener('click', e => {
            const a = e.target.closest('a');
            if (!a) return;
            e.preventDefault();
            document.getElementById(a.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });

        return headings;
    }

    // ── Highlight the current section's TOC entry while scrolling ──
    function initActiveHeadingTracking(headings) {
        const links = document.querySelectorAll('#toc-panel a');
        if (!links.length) return;

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                links.forEach(l => l.classList.remove('active'));
                const active = document.querySelector(`#toc-panel a[data-target="${entry.target.id}"]`);
                if (active) active.classList.add('active');
            });
        }, { rootMargin: '-15% 0px -70% 0px' });

        headings.forEach(h => observer.observe(h));
    }

    // ── Gentle fade-up as content enters the viewport ──────
    function initScrollReveal() {
        const targets = theory.querySelectorAll(':scope > h2, :scope > h3, :scope > p, :scope > ul, :scope > ol, :scope > img, :scope > table, :scope > .comparison-table, :scope > .info-box, :scope > .note-box, :scope > .warn-box');
        if (!targets.length) return;

        targets.forEach(el => el.classList.add('reveal-on-scroll'));

        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('revealed');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

        targets.forEach(el => observer.observe(el));
    }
})();
