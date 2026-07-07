/**
 * PLC SimTel – Open-Card Renderer
 * Handles: live search with module counter
 * Cards are fully open — no expand/collapse needed.
 */

document.addEventListener('DOMContentLoaded', () => {

    const searchInput  = document.getElementById('search');
    const searchClear  = document.getElementById('search-clear');
    const countDisplay = document.getElementById('visible-count');
    const allCards     = document.querySelectorAll('.course-card');
    const totalModules = allCards.length;

    // ── Live Search ──
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();

        // Toggle clear button
        searchClear.classList.toggle('visible', query.length > 0);

        // Remove existing no-results
        const old = document.querySelector('.no-results');
        if (old) old.remove();

        if (!query) {
            // Reset
            allCards.forEach(c => c.classList.remove('hidden-search'));
            countDisplay.textContent = totalModules;
            return;
        }

        let visible = 0;

        allCards.forEach(card => {
            const text = card.textContent.toLowerCase();
            if (text.includes(query)) {
                card.classList.remove('hidden-search');
                visible++;
            } else {
                card.classList.add('hidden-search');
            }
        });

        countDisplay.textContent = visible;

        if (visible === 0) {
            const grid = document.getElementById('card-grid');
            const msg = document.createElement('div');
            msg.className = 'no-results';
            msg.innerHTML = `
                <i class="fas fa-search"></i>
                <p>No results found</p>
                <span>Try a different search term</span>
            `;
            grid.appendChild(msg);
        }
    });

    // ── Clear Search ──
    searchClear.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.focus();
    });

    // ── Keyboard: Ctrl+K or / to focus search ──
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT')) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.blur();
        }
    });

});