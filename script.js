document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration ---
    // Storing engine details in an object makes it easy to manage and add more options.
    const searchEngines = {
        web: {
            placeholder: 'Search the web...',
            url: 'https://duckduckgo.com/?q='
        },
        store: {
            placeholder: 'Search the SSG Store...',
            url: 'https://swedishstudiosgames.github.io/ssg-store/search/?q='
        }
    };

    // --- State ---
    // This variable keeps track of the currently selected search engine.
    let activeEngine = 'web'; // 'web' is the default

    // --- DOM Elements ---
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const optionButtons = document.querySelectorAll('.option-btn');

    // --- Functions ---
    /**
     * Sets the active search engine and updates the UI accordingly.
     * @param {string} engineName - The key of the engine in the searchEngines object ('web' or 'store').
     */
    function setSearchEngine(engineName) {
        // Exit if the engine doesn't exist or is already active
        if (!searchEngines[engineName] || engineName === activeEngine) {
            return;
        }

        // Update the state
        activeEngine = engineName;

        // Update the input placeholder
        searchInput.placeholder = searchEngines[activeEngine].placeholder;

        // Update the active class on buttons
        optionButtons.forEach(button => {
            if (button.dataset.engine === activeEngine) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    // --- Event Listeners ---
    
    // Listen for clicks on the option buttons
    optionButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Get the engine name from the button's data-engine attribute
            const engineName = button.dataset.engine;
            setSearchEngine(engineName);
        });
    });

    // Handle the form submission
    searchForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent the form from reloading the page
        const query = searchInput.value.trim();

        if (query) {
            // Get the correct search URL from our configuration object
            const searchUrl = searchEngines[activeEngine].url + encodeURIComponent(query);
            // Redirect the user to the search results page
            window.location.href = searchUrl;
        }
    });

    // --- Initialization ---
    // Set the initial state when the page loads
    setSearchEngine('web'); 
});
