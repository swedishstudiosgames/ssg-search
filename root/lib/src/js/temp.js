/**
 * SSG Website - Search Functionality (sok.js)
 * Modernized, Clean, and Interoperable with index.html
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Configuration: specific to your index.html IDs
    const ui = {
        form: document.getElementById('sq'),
        textInput: document.getElementById('q'),
        fileInput: document.getElementById('qim'),
        menuBtn: document.getElementById('mb'),
        menuDropdown: document.getElementById('mdd'),
        modeBtns: document.querySelectorAll('#mdd button')
    };

    // Verify critical elements exist before running
    if (!ui.form || !ui.menuBtn || !ui.menuDropdown) {
        console.warn('Search UI elements missing. Check IDs in index.html.');
        return;
    }

    // State management
    let currentMode = 'web'; // Default mode

    // =========================================
    // MENU INTERACTIVITY
    // =========================================

    // Toggle Dropdown Visibility
    ui.menuBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent immediate closing
        const isVisible = ui.menuDropdown.style.display === 'block';
        ui.menuDropdown.style.display = isVisible ? 'none' : 'block';
        ui.menuBtn.setAttribute('aria-expanded', !isVisible);
    });

    // Close Dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!ui.menuBtn.contains(e.target) && !ui.menuDropdown.contains(e.target)) {
            ui.menuDropdown.style.display = 'none';
            ui.menuBtn.setAttribute('aria-expanded', 'false');
        }
    });

    // Handle Menu Option Selection
    ui.modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active visual state
            ui.modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Apply Mode Logic
            const mode = btn.dataset.mode;
            setSearchMode(mode);

            // Close menu after selection
            ui.menuDropdown.style.display = 'none';
        });
    });

    // =========================================
    // MODE SWITCHING LOGIC
    // =========================================

    function setSearchMode(mode) {
        currentMode = mode;
        
        // Reset Inputs
        ui.textInput.value = '';
        ui.fileInput.value = '';

        switch (mode) {
            case 'image':
                // Hide text, Show file input
                ui.textInput.classList.add('hidden');
                ui.fileInput.classList.remove('hidden');
                ui.textInput.removeAttribute('required'); // Prevent HTML5 validation blocking
                break;

            case 'store':
                // Show text, Hide file, Update placeholder
                ui.textInput.classList.remove('hidden');
                ui.fileInput.classList.add('hidden');
                ui.textInput.placeholder = "Search the store...";
                ui.textInput.setAttribute('required', '');
                break;

            case 'speech':
                // Basic Web Speech API Implementation (Modern Feature)
                if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                    startDictation();
                } else {
                    alert("Speech recognition is not supported in this browser.");
                }
                // Fallback to text view
                ui.textInput.classList.remove('hidden');
                ui.fileInput.classList.add('hidden');
                break;

            case 'web':
            default:
                // Default Text Search
                ui.textInput.classList.remove('hidden');
                ui.fileInput.classList.add('hidden');
                ui.textInput.placeholder = "Search the internet...";
                ui.textInput.setAttribute('required', '');
                break;
        }
    }

    // =========================================
    // SEARCH EXECUTION & GOOGLE LOGIC
    // =========================================

    ui.form.addEventListener('submit', (e) => {
        e.preventDefault(); // Intercept standard submit

        // 1. Image Search Handling
        if (currentMode === 'image' && ui.fileInput.files.length > 0) {
            handleGoogleReverseImageSearch(ui.fileInput);
        }
        // 2. Standard Text Search Handling
        else {
            const query = ui.textInput.value.trim();
            if (!query) return;

            if (currentMode === 'store') {
                 // Redirect to store search (Example URL)
                 window.location.href = `https://store.swedishstudiosgames.com/search?q=${encodeURIComponent(query)}`;
            } else {
                 // Default BEX Web Search
                 window.location.href = `https://search.swedishstudiosgames.com/search?q=${encodeURIComponent(query)}`;
            }
        }
    });

    /**
     * Helper: Handle Google Reverse Image Search via hidden form submission
     */
    function handleGoogleReverseImageSearch(fileInputElement) {
        const originalParent = fileInputElement.parentNode;
        const nextSibling = fileInputElement.nextSibling;

        // Create dynamic form for Google
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'https://www.google.com/searchbyimage/upload';
        form.enctype = 'multipart/form-data';
        form.target = '_blank';
        form.style.display = 'none';

        // Google requires input name 'encoded_image'
        // (Your HTML already names it 'encoded_image', but we ensure it here just in case)
        const originalName = fileInputElement.name;
        fileInputElement.name = 'encoded_image';

        // Move input to temp form
        form.appendChild(fileInputElement);
        document.body.appendChild(form);

        form.submit();

        // Restore input to original location
        setTimeout(() => {
            if (nextSibling) {
                originalParent.insertBefore(fileInputElement, nextSibling);
            } else {
                originalParent.appendChild(fileInputElement);
            }
            fileInputElement.name = originalName;
            fileInputElement.value = ''; // Clear selection
            document.body.removeChild(form);
        }, 100);
    }

    // =========================================
    // EXTRA: SPEECH RECOGNITION (Modern)
    // =========================================
    function startDictation() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        ui.textInput.placeholder = "Listening...";
        
        recognition.start();

        recognition.onresult = (event) => {
            const speechResult = event.results[0][0].transcript;
            ui.textInput.value = speechResult;
            // Optional: Automatically submit after speaking
            // ui.form.dispatchEvent(new Event('submit')); 
        };

        recognition.onspeechend = () => {
            recognition.stop();
            ui.textInput.placeholder = "Search the internet...";
        };

        recognition.onerror = () => {
            ui.textInput.placeholder = "Error hearing voice.";
        }
    }
});
