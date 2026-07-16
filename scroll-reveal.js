// ============================================================
//  scroll-reveal.js  —  optional, add to lesson pages for
//  scroll-triggered fade/slide-in animations on headings, images,
//  and tables as the reader scrolls down a long lesson.
//
//  <script src="/scroll-reveal.js"></script>
//
//  Progressive enhancement: defination.css shows everything fully
//  visible by default. This script only switches elements to the
//  hidden-until-scrolled-into-view state by adding "js-reveal-active"
//  to <body> — so if it's missing, blocked, or the browser doesn't
//  support IntersectionObserver, the page still looks completely
//  normal (just without the reveal animation).
// ============================================================
(function () {
    if (!('IntersectionObserver' in window)) return;

    function ready(fn) {
        if (document.readyState !== 'loading') fn();
        else document.addEventListener('DOMContentLoaded', fn);
    }

    ready(() => {
        const targets = document.querySelectorAll(
            '.theory-section h2, .theory-section h3, .theory-section img, .comparison-table, .theory-section > ul, .theory-section > ol'
        );
        if (!targets.length) return;

        document.body.classList.add('js-reveal-active');
        targets.forEach(el => el.classList.add('reveal-target'));

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

        targets.forEach(el => observer.observe(el));
    });
})();