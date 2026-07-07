document.addEventListener('DOMContentLoaded', () => {
    // Toggle subtopics
    const sectionHeaders = document.querySelectorAll('.menu-section h3');
    
    sectionHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const icon = header.querySelector('i');
            
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-down');
            } else {
                content.style.display = 'none';
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-right');
            }
        });
    });
    
    // Add dropdown functionality to nested list items
    const allListItems = document.querySelectorAll('.menu-section ul li');
    
    allListItems.forEach(item => {
        // Check if this item has a nested ul
        const nestedUl = item.querySelector(':scope > ul');
        if (nestedUl) {
            // Initially hide the nested ul
            nestedUl.style.display = 'none';
            
            // Create a wrapper span for the item text and icon
            const itemText = document.createTextNode(item.textContent);
            const items = Array.from(item.childNodes);
            
            // Clear the item and rebuild it
            item.innerHTML = '';
            
            // Get the text content (before the nested ul)
            let textContent = '';
            for (let node of items) {
                if (node.nodeType === Node.TEXT_NODE) {
                    textContent += node.textContent;
                } else if (node.nodeName !== 'UL') {
                    item.appendChild(node);
                }
            }
            
            // Create a clickable header for the item
            const itemHeader = document.createElement('span');
            itemHeader.style.cursor = 'pointer';
            itemHeader.style.display = 'flex';
            itemHeader.style.alignItems = 'center';
            itemHeader.style.gap = '8px';
            itemHeader.textContent = textContent.trim();
            
            // Add chevron icon (initially pointing right since nested ul is closed)
            const icon = document.createElement('i');
            icon.classList.add('fas', 'fa-chevron-right');
            icon.style.fontSize = '0.75rem';
            itemHeader.appendChild(icon);
            
            // Insert header at the beginning
            item.insertBefore(itemHeader, item.firstChild);
            
            // Re-append the nested ul
            item.appendChild(nestedUl);
            
            // Add click event to toggle nested ul
            itemHeader.addEventListener('click', (e) => {
                e.stopPropagation();
                if (nestedUl.style.display === 'none') {
                    nestedUl.style.display = 'block';
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-chevron-down');
                } else {
                    nestedUl.style.display = 'none';
                    icon.classList.remove('fa-chevron-down');
                    icon.classList.add('fa-chevron-right');
                }
            });
        }
    });
    
    // Search functionality
    const searchInput = document.getElementById('search');
    const menuItems = document.querySelectorAll('.menu-section > ul > li');
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        menuItems.forEach(item => {
            const text = item.textContent.toLowerCase();
            const parentSection = item.closest('.menu-section');
            
            if (text.includes(searchTerm)) {
                item.style.display = 'block';
                parentSection.style.display = 'block';
                
                // Expand parent section
                const sectionHeader = parentSection.querySelector('h3');
                const sectionContent = sectionHeader.nextElementSibling;
                const icon = sectionHeader.querySelector('i');
                
                sectionContent.style.display = 'block';
                icon.classList.remove('fa-chevron-right');
                icon.classList.add('fa-chevron-down');
            } else {
                item.style.display = 'none';
            }
        });
        
        // Hide sections with no visible items
        document.querySelectorAll('.menu-section').forEach(section => {
            const visibleItems = section.querySelectorAll('.menu-section > ul > li:not([style*="display: none"])');
            if (visibleItems.length === 0) {
                section.style.display = 'none';
            }
        });
    });
    
    // Add chevron icons to section headers
    sectionHeaders.forEach(header => {
        const icon = document.createElement('i');
        icon.classList.add('fas', 'fa-chevron-down');
        header.appendChild(icon);
    });
});