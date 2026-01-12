/**
 * SSG Website - Search Functionality
 * Method: Secure Proxy Upload (Frontend)
 * Privacy: Best (API Key is hidden on server; Image deletes after 5 mins)
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================
    // CONFIGURATION
    // Points to the file 'functions/upload.js' automatically
    // =========================================================
    const WORKER_URL = '/upload'; 
    // =========================================================

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
    // SUBMISSION HANDLER
    // =========================================
    ui.form.addEventListener('submit', (e) => {
        e.preventDefault();

        // 1. Image Search (Send to Proxy)
        if (currentMode === 'image') {
            const file = ui.fileInput.files[0];
            if (!file) return;

            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
            if (!validTypes.includes(file.type)) {
                alert("Please upload a valid image file.");
                ui.fileInput.value = ''; 
                return;
            }

            handleSecureProxySearch(file);
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

    // =========================================
    // SECURE PROXY UPLOAD LOGIC
    // =========================================
    function handleSecureProxySearch(file) {
        // Step A: Open tab immediately to bypass Popup Blockers
        const newTab = window.open('', '_blank');
        
        if (newTab) {
            newTab.document.write(`
                <html>
                    <head><title>Secure Search...</title></head>
                    <body style="font-family:sans-serif; text-align:center; padding-top:50px;">
                        <h2>Uploading encrypted image...</h2>
                        <p>Your image will automatically expire in 5 minutes.</p>
                        <div id="status" style="color:#666;">Contacting Secure Proxy...</div>
                    </body>
                </html>
            `);
        } else {
            alert("Please allow popups for this site to use Image Search.");
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        // Step B: Send to YOUR Cloudflare Pages Function
        fetch(WORKER_URL, {
            method: 'POST',
            body: formData
        })
        .then(res => res.json())
        .then(json => {
            if (!json.success) throw new Error(json.error?.message || "Upload failed");

            const imgUrl = json.data.url;

            // Step C: Redirect the new tab
            if (newTab) {
                newTab.document.getElementById('status').innerText = "Opening image...";
                newTab.location.href = imgUrl;
            }
            
            ui.fileInput.value = ''; 
            console.log(`Secure upload successful. Server auto-delete active.`);
        })
        .catch(err => {
            console.error('Error:', err);
            if (newTab) {
                newTab.document.body.innerHTML = `
                    <h2 style="color:red">Error</h2>
                    <p>Failed to connect to secure proxy.</p>
                    <p>${err.message}</p>
                    <p>Please close this tab and try again.</p>
                `;
            } else {
                alert("Failed to upload image.");
            }
        });
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
            ui.textInput.value = event.results[0][0].transcript;
            toggleClearBtn(); 
        };
        recognition.onspeechend = () => recognition.stop();
        recognition.onerror = () => { ui.textInput.placeholder = "Error hearing voice."; }
    }
});
