ng/**
 * SSG Website - Search Functionality (temp.js)
 * Method: Imgur Upload -> Google Lens -> Immediate Deletion
 * Privacy: High (Image exists on Imgur for only ~2 seconds)
 * Note: Requires valid Imgur Client ID
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================
    // CONFIGURATION
    // Get a free Client ID from https://api.imgur.com/oauth2/addclient
    // Select "Anonymous usage without user authorization"
    // =========================================================
    const IMGUR_CLIENT_ID = 'YOUR_IMGUR_CLIENT_ID_HERE'; 
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

        // 1. Image Search (Secure Imgur -> Google Lens)
        if (currentMode === 'image') {
            const file = ui.fileInput.files[0];
            if (!file) return;

            // Basic validation
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                alert("Please upload a valid image file (JPG, PNG, GIF, WEBP).");
                ui.fileInput.value = ''; 
                return;
            }

            if (IMGUR_CLIENT_ID === 'YOUR_IMGUR_CLIENT_ID_HERE') {
                alert("Configuration Error: Missing Imgur Client ID in temp.js");
                return;
            }

            handleSecureImgurSearch(file);
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
    // SECURE UPLOAD & DELETE LOGIC
    // =========================================
    function handleSecureImgurSearch(file) {
        // Step A: Open the tab IMMEDIATELY (Synchronously) to bypass Popup Blockers
        const newTab = window.open('', '_blank');
        
        // Step B: Set initial content in the new tab so the user knows what's happening
        if (newTab) {
            newTab.document.write(`
                <html>
                    <head><title>Processing Image...</title></head>
                    <body style="font-family:sans-serif; text-align:center; padding-top:50px;">
                        <h2>Uploading your image securely...</h2>
                        <p>Please wait. This may take a few seconds.</p>
                        <div id="status" style="color:#666;">Contacting Imgur...</div>
                    </body>
                </html>
            `);
        } else {
            alert("Please allow popups for this site to use Image Search.");
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        // Step C: Upload to Imgur
        fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: { 'Authorization': `Client-ID ${IMGUR_CLIENT_ID}` },
            body: formData
        })
        .then(res => res.json())
        .then(json => {
            if (!json.success) throw new Error(json.data.error || "Upload failed");

            const imgUrl = json.data.link;
            const deleteHash = json.data.deletehash; // <--- The deletion key

            // Step D: Redirect the new tab to Google Lens
            if (newTab) {
                newTab.document.getElementById('status').innerText = "Redirecting to Google Lens...";
                newTab.location.href = `https://lens.google.com/uploadbyurl?url=${encodeURIComponent(imgUrl)}`;
            }

            // Step E: IMMEDIATELY Delete the image from Imgur
            // We verify the delete happened for our own logging
            console.log("Image uploaded. Initiating privacy cleanup...");
            
            return fetch(`https://api.imgur.com/3/image/${deleteHash}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Client-ID ${IMGUR_CLIENT_ID}` }
            });
        })
        .then(res => res.json())
        .then(json => {
            if (json.success) {
                console.log("PRIVACY SUCCESS: Image permanently deleted from server.");
            } else {
                console.warn("PRIVACY WARNING: Auto-delete failed. Manual cleanup may be required.");
            }
            
            // Clear input on success
            ui.fileInput.value = '';
        })
        .catch(err => {
            console.error('Error:', err);
            if (newTab) {
                newTab.document.body.innerHTML = `
                    <h2 style="color:red">Error</h2>
                    <p>Failed to process image. ${err.message}</p>
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
