/**
 * SSG Website - Search Functionality (temp.js)
 * Approach: Direct Form Submission to Google Lens (Option A)
 * Security: Uses 'no-referrer' to attempt to bypass 403 Forbidden checks.
 * Privacy: Highest (No third-party storage).
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
    function toggleClearBtn() {
        if (ui.textInput.value.length > 0) {
            ui.clearBtn.classList.remove('hidden');
        } else {
            ui.clearBtn.classList.add('hidden');
        }
    }

    ui.textInput.addEventListener('input', toggleClearBtn);
    
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
        toggleClearBtn();

        ui.textInput.classList.remove('hidden');
        ui.fileInput.classList.add('hidden');
        ui.clearBtn.classList.add('hidden');

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
                ui.textInput.classList.remove('hidden'); 
                break;
            default: 
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

        // 1. Image Search (Direct Upload)
        if (currentMode === 'image') {
            const file = ui.fileInput.files[0];
            if (!file) return;

            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                alert("Please upload a valid image file (JPG, PNG, GIF, WEBP).");
                ui.fileInput.value = ''; 
                return;
            }

            handleGoogleLensDirectUpload(ui.fileInput);
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

    /**
     * Handles the secure form-based upload to Google Lens.
     * Uses 'no-referrer' to prevent Google from blocking the request.
     */
    function handleGoogleLensDirectUpload(fileInput) {
        const form = document.createElement('form');
        form.method = 'POST';
        // 'ep=ccm' stands for Chrome Context Menu, often whitelisted for uploads
        form.action = 'https://lens.google.com/upload?ep=ccm'; 
        form.enctype = 'multipart/form-data';
        form.target = '_blank'; // Opens in new tab
        form.style.display = 'none';
        
        // CRITICAL SECURITY FIX:
        // Tells the browser NOT to send the "Referer: swedishstudiosgames.com" header.
        // This makes Google think the request is a direct user action.
        form.referrerPolicy = 'no-referrer'; 

        const originalName = fileInput.name;
        // Google Lens requires the file input to be named 'encoded_image'
        fileInput.name = 'encoded_image'; 
        
        const parent = fileInput.parentNode;
        const sibling = fileInput.nextSibling;

        // Move the file input into the form temporarily
        form.appendChild(fileInput);
        document.body.appendChild(form);
        
        form.submit();

        // Restore the file input to its original place
        setTimeout(() => {
            if (sibling) {
                parent.insertBefore(fileInput, sibling);
            } else {
                parent.appendChild(fileInput);
            }
            
            fileInput.name = originalName;
            fileInput.value = ''; // Reset the input so the user can upload again if needed
            document.body.removeChild(form);
        }, 500);
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
            toggleClearBtn(); 
        };

        recognition.onspeechend = () => {
            recognition.stop();
        };

        recognition.onerror = () => {
            ui.textInput.placeholder = "Error hearing voice.";
        }
    }
});
