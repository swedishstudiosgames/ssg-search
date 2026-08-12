document.addEventListener('DOMContentLoaded', () => {
    const WORKER_URL = '/upload'; 
    let currentMode = 'web';
    let debounceTimeout;
    let confirmCallback = null;
    let speechRecognizer = null; // Singleton for speech engine

    const ui = {
        form: document.getElementById('sq'),
        textInput: document.getElementById('q'),
        fileInput: document.getElementById('qim'),
        clearBtn: document.getElementById('clr'),
        menuBtn: document.getElementById('mb'),
        menuDropdown: document.getElementById('mdd'),
        modeBtns: document.querySelectorAll('#mdd button'),
        grid: document.getElementById('scsg'),
        addModal: document.getElementById('add-modal'),
        addForm: document.getElementById('add-form'),
        siteNameIn: document.getElementById('site-name'),
        siteUrlIn: document.getElementById('site-url'),
        msgModal: document.getElementById('msg-modal'),
        msgTitle: document.getElementById('msg-title'),
        msgText: document.getElementById('msg-text'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmText: document.getElementById('confirm-text')
    };

    if (!ui.form) return;

    // Modern mobile detection with legacy regex fallback
    const isMobile = navigator.userAgentData?.mobile ?? /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(navigator.userAgent);
    
    const speechBtn = document.querySelector('button[data-mode="speech"]');
    if (speechBtn && !isMobile) {
        speechBtn.disabled = true;
        speechBtn.innerHTML = `<img class="i" src="https://bexy.se/root/lib/assets/gfx/img/ico/btn/mic.svg" alt="Speech"> Voice Search [Mobile Only]`;
    }

    /* --- MODAL & EVENT DELEGATION --- */
    const showMessage = (title, text) => {
        ui.msgTitle.innerText = title;
        ui.msgText.innerText = text;
        ui.msgModal.style.display = 'flex';
    };

    const showConfirm = (text, callback) => {
        ui.confirmText.innerText = text;
        confirmCallback = callback;
        ui.confirmModal.style.display = 'flex';
    };

    document.getElementById('confirm-yes').addEventListener('click', () => {
        ui.confirmModal.style.display = 'none';
        confirmCallback?.(); // Optional chaining execution
    });

    document.body.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('.close-modal');
        if (closeBtn) {
            const overlay = closeBtn.closest('.modal-overlay');
            if (overlay) overlay.style.display = 'none';
            if (closeBtn.id === 'confirm-no') confirmCallback = null;
        }
    });

    /* --- SHORTCUTS --- */
    const defaultSites = [
        { name: "YouTube", url: "https://youtube.com" },
        { name: "Reddit", url: "https://reddit.com" },
        { name: "GitHub", url: "https://github.com" },
        { name: "Wikipedia", url: "https://wikipedia.org" }
    ];

    let sites = [];
    try {
        sites = JSON.parse(localStorage.getItem('bscs')) || defaultSites;
    } catch { 
        sites = defaultSites; 
    }

    const renderShortcuts = () => {
        // Build the entire grid in one DOM paint for max performance
        ui.grid.innerHTML = sites.map((site, i) => {
            let domain = site.url;
            try { domain = new URL(site.url).hostname; } catch {}
            
            return `<a href="${site.url}" class="scbtn" title="${site.name}" rel="noopener noreferrer" data-idx="${i}">
                <img src="https://icons.duckduckgo.com/ip3/${domain}.ico" alt="${site.name}" onerror="this.src='https://bexy.se/root/lib/assets/gfx/img/ico/favico/emblem/logo.svg'">
                <span>${site.name}</span>
            </a>`;
        }).join('') + `<button class="scbtn add-btn"><div class="add-icon">+</div><span>Add Site</span></button>`;
    };

    // Centralized event listener for grid clicks (Adding sites)
    ui.grid.addEventListener('click', (e) => {
        if (e.target.closest('.add-btn')) {
            e.preventDefault();
            ui.addModal.style.display = 'flex';
        }
    });

    // Centralized event listener for grid right-clicks (Removing sites)
    ui.grid.addEventListener('contextmenu', (e) => {
        const link = e.target.closest('.scbtn[data-idx]');
        if (link) {
            e.preventDefault();
            const idx = link.dataset.idx;
            showConfirm(`Are you sure you want to remove "${sites[idx].name}"?`, () => {
                sites.splice(idx, 1);
                localStorage.setItem('bscs', JSON.stringify(sites));
                renderShortcuts();
            });
        }
    });

    ui.addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = ui.siteNameIn.value.trim();
        let url = ui.siteUrlIn.value.trim();
        
        if (name && url) {
            if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
            sites.push({ name, url });
            localStorage.setItem('bscs', JSON.stringify(sites));
            renderShortcuts();
            ui.addForm.reset();
            ui.addModal.style.display = 'none';
        }
    });

    renderShortcuts();

    /* --- AUTOCOMPLETE --- */
    const acContainer = document.createElement('div');
    acContainer.className = 'acis';
    ui.textInput.after(acContainer); // Modern insertion

    window.bexAutocompleteCallback = (data) => {
        document.getElementById('jsonp-script')?.remove();
        const suggestions = data[1] || []; 
        
        if (suggestions.length && ui.textInput.value.trim()) {
            // Build the autocomplete list in one DOM paint
            acContainer.innerHTML = suggestions.map(phrase => `<div class="aci">${phrase}</div>`).join('');
            acContainer.style.display = 'block';
        } else { 
            acContainer.style.display = 'none'; 
        }
    };

    // Centralized event listener for autocomplete clicks
    acContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('aci')) {
            e.preventDefault();
            ui.textInput.value = e.target.innerText;
            acContainer.style.display = 'none';
            ui.form.requestSubmit();
        }
    });

    ui.textInput.addEventListener('input', function() {
        const val = this.value.trim();
        ui.clearBtn.classList.toggle('hidden', this.value.length === 0);
        
        if (!val || currentMode !== 'web') return acContainer.style.display = 'none';
        
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            document.getElementById('jsonp-script')?.remove();
            
            const script = document.createElement('script');
            script.id = 'jsonp-script';
            script.src = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(val)}&callback=bexAutocompleteCallback`;
            document.body.appendChild(script);
        }, 150); 
    });

    ui.clearBtn.addEventListener('click', () => {
        ui.textInput.value = '';
        ui.clearBtn.classList.add('hidden');
        ui.textInput.focus();
    });

    /* --- MENU & SEARCH MODES --- */
    ui.menuBtn.addEventListener('click', (e) => {
        e.preventDefault(); 
        e.stopPropagation(); 
        ui.menuBtn.setAttribute('aria-expanded', ui.menuDropdown.classList.toggle('force-show'));
    });

    document.addEventListener('click', (e) => {
        if (!ui.menuBtn.contains(e.target) && !ui.menuDropdown.contains(e.target)) {
            ui.menuDropdown.classList.remove('force-show');
            acContainer.style.display = 'none';
        }
    });

    ui.modeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            if (btn.disabled) return; 

            ui.modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentMode = btn.dataset.mode;
            ui.textInput.value = '';
            ui.fileInput.value = '';
            ui.clearBtn.classList.add('hidden');
            
            const isImageMode = currentMode === 'image';
            ui.textInput.classList.toggle('hidden', isImageMode);
            ui.fileInput.classList.toggle('hidden', !isImageMode);
            ui.textInput.required = !isImageMode;

            ui.textInput.placeholder = currentMode === 'store' ? "Search the store..." 
                                     : currentMode === 'speech' ? (startDictation(), "Listening... (Speak now)") 
                                     : "Search the internet...";

            ui.menuDropdown.classList.remove('force-show');
        });
    });

    /* --- SUBMISSION HANDLERS --- */
    ui.form.addEventListener('submit', (e) => {
        const query = ui.textInput.value.trim();
        
        if (currentMode === 'image') {
            e.preventDefault(); 
            const file = ui.fileInput.files[0];
            // Cleaner mime type check
            if (!file || !file.type.startsWith('image/')) {
                showMessage("Invalid File", "Please upload a valid image file.");
                ui.fileInput.value = ''; 
                return;
            }
            handleSecureProxySearch(file);
            
        } else if (currentMode === 'store') {
            e.preventDefault(); 
            if (query) window.location.href = `https://store.swedishstudiosgames.com/search?q=${encodeURIComponent(query)}`;
        }
    });

    // Modernized to Async/Await for cleaner execution flow
    const handleSecureProxySearch = async (file) => {
        const newTab = window.open('', '_blank');
        if (!newTab) return showMessage("Popup Blocked", "Please allow popups to use the secure image proxy.");
        
        newTab.document.write(`<html style="font-family:sans-serif; text-align:center; padding-top:50px;"><h2>Uploading...</h2><div id="s">Contacting Secure Proxy...</div></html>`);

        const formData = new FormData(); 
        formData.append('image', file);

        try {
            const res = await fetch(WORKER_URL, { method: 'POST', body: formData });
            const json = await res.json();
            
            if (!json.success) throw new Error(json.error?.message || "Upload failed");
            
            if (!newTab.closed) {
                newTab.document.getElementById('s').innerText = "Opening...";
                newTab.location.href = json.data.url;
            }
            ui.fileInput.value = ''; 
        } catch (err) {
            if (!newTab.closed) {
                newTab.document.body.innerHTML = `<h2 style="color:red">Error</h2><p>${err.message}</p>`;
            }
        }
    };

    // Speech engine singleton logic
    function startDictation() {
        if (!speechRecognizer) {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) return showMessage("Not Supported", "Speech recognition is not supported in this browser.");
            
            speechRecognizer = new SR();
            speechRecognizer.lang = navigator.language || 'en-US';
            speechRecognizer.interimResults = false;
            
            speechRecognizer.onresult = (e) => {
                ui.textInput.value = e.results[0][0].transcript;
                ui.textInput.placeholder = "Search the internet...";
                if (ui.textInput.value.trim()) ui.form.requestSubmit(); 
            };
            
            speechRecognizer.onspeechend = () => { 
                speechRecognizer.stop(); 
                ui.textInput.placeholder = "Search the internet..."; 
            };
            
            speechRecognizer.onerror = (e) => {
                ui.textInput.placeholder = "Search the internet...";
                if (e.error !== 'no-speech') showMessage("Microphone Error", "Could not hear you. Check your permissions.");
            };
        }
        
        try { speechRecognizer.start(); } catch (e) { console.warn("Dictation already started", e); }
    }
});
