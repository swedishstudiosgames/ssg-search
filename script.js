// Wait for the HTML document to be fully loaded
document.addEventListener('DOMContentLoaded', () => {

    // Get references to all the HTML elements we need
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const optionsBtn = document.getElementById('options-btn');
    const optionsMenu = document.getElementById('options-menu');

    // Set the default search mode
    let currentMode = 'internet';

    /**
     * Toggles the visibility of the search options menu.
     */
    optionsBtn.addEventListener('click', (event) => {
        // Stop the click from bubbling up to the document
        event.stopPropagation(); 
        optionsMenu.classList.toggle('hidden');
    });

    /**
     * Changes the search mode when a menu item is clicked.
     */
    optionsMenu.addEventListener('click', (event) => {
        const target = event.target;
        // Ensure the click was on an LI element
        if (target.tagName === 'LI') {
            // Update the current mode from the 'data-mode' attribute
            currentMode = target.dataset.mode;
            // Update the input's placeholder from the 'data-placeholder' attribute
            searchInput.placeholder = target.dataset.placeholder;
            // Hide the menu after selection
            optionsMenu.classList.add('hidden');
            // Focus on the input field for a better user experience
            searchInput.focus();
        }
    });

    /**
     * Handles the form submission based on the current search mode.
     */
    searchForm.addEventListener('submit', (event) => {
        // Prevent the form from submitting the default way
        event.preventDefault(); 
        
        const query = searchInput.value.trim();
        if (!query) return; // Do nothing if the search query is empty

        let searchUrl;

        // Use a switch statement to build the correct URL based on the mode
        switch (currentMode) {
            case 'store':
                // Replace with your actual store's search URL
                searchUrl = `https://www.your-store.com/search?q=${encodeURIComponent(query)}`;
                break;
            case 'image':
                // This uses Google's reverse image search by URL
                searchUrl = `https://www.google.com/searchbyimage?image_url=${encodeURIComponent(query)}`;
                break;
            case 'internet':
            default:
                // This uses a standard Google search
                searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
                break;
        }

        // Open the constructed URL in a new tab
        window.open(searchUrl, '_blank');
        
        // Optional: clear the input after searching
        // searchInput.value = '';
    });

    /**
     * Hides the options menu if the user clicks anywhere else on the page.
     */
    document.addEventListener('click', () => {
        optionsMenu.classList.add('hidden');
    });

});
