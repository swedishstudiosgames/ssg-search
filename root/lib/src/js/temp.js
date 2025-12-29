/**
 * SSG Website - Search Functionality (temp.js)
 * Updated with Google Lens support
 */

document.addEventListener('DOMContentLoaded', () => {
    const ui = {
        form: document.getElementById('sq'),
        textInput: document.getElementById('q'),
        fileInput: document.getElementById('qim'),
        clearBtn: document.getElementById('clr'),
        menuBtn: document.getElementById('mb'),
        menuDropdown: document.getElementById('mdd'),
        modeBtns: document.querySelectorAll('#mdd button')
    };

    if (!ui.form) return;

    let currentMode = 'web';

    // =========================================
    // CLEAR BUTTON LOGIC
    // =========================================
    
    // Toggle "X" button visibility based on input
    function toggleClearBtn() {
        if (ui.textInput.value.length > 0) {
            ui.clearBtn.classList.remove('hidden');
        } else {
            ui.clearBtn.classList.add('hidden');
        }
    }

    // Listen for typing
    ui.textInput.addEventListener('input', toggleClearBtn);
    
    // Handle Click: Clear text and focus input
    ui.clearBtn.addEventListener('click', () => {
        ui.textInput.value = '';
        toggleClearBtn();
        ui.textInput.focus();
    });

    // =========================================
    // MENU & MODE LOGIC
    // =========================================

    ui.menuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = ui.menuDropdown.style.display === 'block';
        ui.menuDropdown.style.display = isVisible ? 'none' : 'block';
        ui.menuBtn.setAttribute('aria-expanded', !isVisible);
    });

    document.addEventListener('click', (e) => {
        if (!ui.menuBtn.contains(e.target) && !ui.menuDropdown.contains(e.target)) {
            ui.menuDropdown.style.display = 'none';
        }
    });

    ui.modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ui.modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setSearchMode(btn.dataset.mode);
            ui.menuDropdown.style.display = 'none';
        });
    });

    function setSearchMode(mode) {
        currentMode = mode;
        ui.textInput.value = '';
        ui.fileInput.value = '';
        toggleClearBtn(); // Hide X button on reset

        // Reset UI states
        ui.textInput.classList.remove('hidden');
        ui.fileInput.classList.add('hidden');
        ui.clearBtn.classList.add('hidden'); // Default hide

        switch (mode) {
            case 'image':
                ui.textInput.classList.add('hidden');
                ui.fileInput.classList.remove('hidden');
                ui.textInput.removeAttribute('required');
                break;
            case 'store':
                ui.textInput.placeholder = "Search the store...";
                ui.textInput.setAttribute('required', '');
                break;
            case 'speech':
                if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                    startDictation();
                } else {
                    alert("Speech not supported.");
                }
                // Keep text input visible for fallback/result
                ui.textInput.classList.remove('hidden'); 
                break;
            default: // web
                ui.textInput.placeholder = "Search the internet...";
                ui.textInput.setAttribute('required', '');
                break;
        }
    }

    // =========================================
    // SUBMISSION & VALIDATION
    // =========================================

    ui.form.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Image Search + Strict Validation
        if (currentMode === 'image') {
            const file = ui.fileInput.files[0];
            
            // Check if file exists
            if (!file) return;

            // Strict Mime Type Check
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                alert("Please upload a valid image file (JPG, PNG, GIF, WEBP).");
                ui.fileInput.value = ''; // Clear invalid file
                return;
            }

            handleGoogleReverseImageSearch(ui.fileInput);
        }
        // 2. Text Search
        else {
            const query = ui.textInput.value.trim();
            if (!query) return;

            const baseUrl = currentMode === 'store' 
                ? 'https://store.swedishstudiosgames.com/search' 
                : 'https://search.swedishstudiosgames.com/search';
            
            window.location.href = `${baseUrl}?q=${encodeURIComponent(query)}`;
        }
    });

    function handleGoogleReverseImageSearch(fileInput) {
        const form = document.createElement('form');
        form.method = 'POST';
        // UPDATED: Points to Google Lens upload endpoint (Chrome Context Menu flavor)
        form.action = 'https://lens.google.com/upload?ep=ccm'; 
        form.enctype = 'multipart/form-data';
        form.target = '_blank';
        form.style.display = 'none';

        const originalName = fileInput.name;
        fileInput.name = 'encoded_image'; // Required key for Google Lens
        
        const parent = fileInput.parentNode;
        const sibling = fileInput.nextSibling;

        // Move input to temp form to submit
        form.appendChild(fileInput);
        document.body.appendChild(form);
        
        form.submit();

        // Restore input to original location
        setTimeout(() => {
            if (sibling) parent.insertBefore(fileInput, sibling);
            else parent.appendChild(fileInput);
            
            fileInput.name = originalName;
            fileInput.value = ''; // Clear after upload to reset state
            document.body.removeChild(form);
        }, 100);
    }
    
    // =========================================
    // SPEECH RECOGNITION
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
            toggleClearBtn(); // Show 'X' button since we now have text
            // ui.form.dispatchEvent(new Event('submit')); // Optional auto-submit
        };

        recognition.onspeechend = () => {
            recognition.stop();
        };

        recognition.onerror = () => {
            ui.textInput.placeholder = "Error hearing voice.";
        }
    }
});
