/**
 * PLC SimTel – Modernized Card-Grid Renderer
 * Handles: expand/collapse, expand-all, live search, subtopic toggling
 */

document.addEventListener('DOMContentLoaded', () => {

    const searchInput = document.getElementById('search');
    const searchClear = document.getElementById('search-clear');
    const expandAllBtn = document.getElementById('btn-expand-all');
    const allCards = document.querySelectorAll('.course-card');
    let allExpanded = false;

    // ── Expand / Collapse Single Card ──
    window.toggleCard = function (headerEl) {
        const card = headerEl.closest('.course-card');
        const isExpanded = card.classList.contains('expanded');

        if (isExpanded) {
            card.classList.remove('expanded');
        } else {
            card.classList.add('expanded');
        }
    };

    // ── Toggle Subtopics ──
    window.toggleSubtopics = function (toggleEl) {
        // Find the parent .has-subtopics li
        const parentLi = toggleEl.closest('.has-subtopics');

        if (parentLi) {
            parentLi.classList.toggle('open');
        } else {
            // Fallback for sub-l2 toggles inside a .has-subtopics
            toggleEl.classList.toggle('open');
            const siblingList = toggleEl.nextElementSibling;
            if (siblingList && siblingList.classList.contains('subtopic-list')) {
                if (toggleEl.classList.contains('open')) {
                    siblingList.style.maxHeight = siblingList.scrollHeight + 'px';
                } else {
                    siblingList.style.maxHeight = '0px';
                }
            }
        }
    };

    // ── Expand / Collapse All ──
    expandAllBtn.addEventListener('click', () => {
        allExpanded = !allExpanded;

        allCards.forEach(card => {
            if (allExpanded) {
                card.classList.add('expanded');
            } else {
                card.classList.remove('expanded');
            }
        });

        const icon = expandAllBtn.querySelector('i');
        const label = expandAllBtn.querySelector('span');

        if (allExpanded) {
            icon.className = 'fas fa-compress-alt';
            if (label) label.textContent = 'Collapse All';
            expandAllBtn.classList.add('expanded');
        } else {
            icon.className = 'fas fa-expand-alt';
            if (label) label.textContent = 'Expand All';
            expandAllBtn.classList.remove('expanded');
        }
    });

    // ── Live Search ──
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.trim().toLowerCase();

        // Toggle clear button
        if (query.length > 0) {
            searchClear.classList.add('visible');
        } else {
            searchClear.classList.remove('visible');
        }

        // Remove any existing no-results message
        const existingNoResults = document.querySelector('.no-results');
        if (existingNoResults) existingNoResults.remove();

        if (query.length === 0) {
            // Reset: show all cards, remove highlights
            allCards.forEach(card => {
                card.classList.remove('hidden-search');
                card.querySelectorAll('.search-highlight').forEach(el => {
                    el.replaceWith(document.createTextNode(el.textContent));
                });
            });
            return;
        }

        let anyVisible = false;

        allCards.forEach(card => {
            const allText = card.textContent.toLowerCase();
            const hasMatch = allText.includes(query);

            if (hasMatch) {
                card.classList.remove('hidden-search');
                anyVisible = true;

                // Auto-expand matching cards
                card.classList.add('expanded');

                // Also expand subtopics that contain the match
                card.querySelectorAll('.has-subtopics').forEach(sub => {
                    if (sub.textContent.toLowerCase().includes(query)) {
                        sub.classList.add('open');
                    }
                });
            } else {
                card.classList.add('hidden-search');
            }
        });

        // Show "no results" message if nothing matches
        if (!anyVisible) {
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

    // ── Keyboard shortcut: Ctrl+K or / to focus search ──
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT')) {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }

        // Escape to clear search
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
            searchInput.blur();
        }
    });

});