    document.addEventListener('DOMContentLoaded', () => {
        const WORKER_URL = '/upload'; 
        let currentMode = 'web';
        let debounceTimeout;
        let confirmCallback = null;
        let speechRecognizer = null;

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

        const isMobile = navigator.userAgentData?.mobile ?? /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(navigator.userAgent);
        
        const speechBtn = document.querySelector('button[data-mode="speech"]');
        if (speechBtn && !isMobile) {
            speechBtn.disabled = true;
            speechBtn.innerHTML = `<img class="i" src="https://bexy.se/root/lib/assets/gfx/img/ico/btn/mic.svg" alt="Speech"> Voice Search [Mobile Only]`;
        }

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
            confirmCallback?.();
        });

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
            ui.grid.innerHTML = sites.map((site, i) => {
                let domain = site.url;
                try { domain = new URL(site.url).hostname; } catch {}
                
                return `<a href="${site.url}" class="scbtn" title="${site.name}" rel="noopener noreferrer" data-idx="${i}">
                    <img src="https://icons.duckduckgo.com/ip3/${domain}.ico" alt="${site.name}" loading="lazy" decoding="async" onerror="this.src='https://bexy.se/root/lib/assets/gfx/img/ico/favico/emblem/logo.svg'">
                    <span>${site.name}</span>
                </a>`;
            }).join('') + `<button class="scbtn add-btn"><div class="add-icon">+</div><span>Add Site</span></button>`;
        };

        ui.grid.addEventListener('click', (e) => {
            if (e.target.closest('.add-btn')) {
                e.preventDefault();
                ui.addModal.style.display = 'flex';
            }
        });

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
                if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`;
                sites.push({ name, url });
                localStorage.setItem('bscs', JSON.stringify(sites));
                renderShortcuts();
                ui.addForm.reset();
                ui.addModal.style.display = 'none';
            }
        });

        renderShortcuts();

        /* --- AUTOCOMPLETE & KEYBOARD NAVIGATION --- */
        const acContainer = document.createElement('div');
        acContainer.className = 'acis';
        ui.textInput.after(acContainer);

        let activeSuggestionIndex = -1;
        let originalQuery = "";

        const closeAutocomplete = () => {
            acContainer.style.display = 'none';
            activeSuggestionIndex = -1;
        };

        window.bexAutocompleteCallback = (data) => {
            document.getElementById('jsonp-script')?.remove();
            const suggestions = data[1] || []; 
            activeSuggestionIndex = -1;
            
            if (suggestions.length && ui.textInput.value.trim()) {
                acContainer.innerHTML = suggestions.map(phrase => `<div class="aci">${phrase}</div>`).join('');
                acContainer.style.display = 'block';
            } else { 
                closeAutocomplete(); 
            }
        };

        // Key listener function for navigating suggestions with Up and Down arrows
        ui.textInput.addEventListener('keydown', (e) => {
            const items = acContainer.children; // Optimized: Live HTMLCollection instead of querySelectorAll
            if (acContainer.style.display === 'none' || items.length === 0) return;

            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();

                if (activeSuggestionIndex === -1) {
                    originalQuery = ui.textInput.value;
                }

                if (activeSuggestionIndex >= 0 && activeSuggestionIndex < items.length) {
                    items[activeSuggestionIndex].classList.remove('active-suggestion');
                }

                if (e.key === 'ArrowDown') {
                    activeSuggestionIndex++;
                    if (activeSuggestionIndex >= items.length) activeSuggestionIndex = -1;
                } else if (e.key === 'ArrowUp') {
                    activeSuggestionIndex--;
                    if (activeSuggestionIndex < -1) activeSuggestionIndex = items.length - 1;
                }

                if (activeSuggestionIndex === -1) {
                    ui.textInput.value = originalQuery;
                } else {
                    items[activeSuggestionIndex].classList.add('active-suggestion');
                    ui.textInput.value = items[activeSuggestionIndex].innerText;
                }
            } else if (e.key === 'Escape') {
                closeAutocomplete();
                ui.textInput.value = originalQuery || ui.textInput.value;
            }
        });

        acContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('aci')) {
                e.preventDefault();
                ui.textInput.value = e.target.innerText;
                closeAutocomplete();
                ui.form.requestSubmit();
            }
        });

        ui.textInput.addEventListener('input', function() {
            const val = this.value.trim();
            ui.clearBtn.classList.toggle('hidden', this.value.length === 0);
            
            originalQuery = val;
            activeSuggestionIndex = -1;
            
            if (!val || currentMode !== 'web') return closeAutocomplete();
            
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
            closeAutocomplete();
        });

        ui.menuBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            e.stopPropagation(); 
            ui.menuBtn.setAttribute('aria-expanded', ui.menuDropdown.classList.toggle('force-show'));
        });

        // Consolidated Event Delegation for document clicks (Modals & Dropdowns)
        document.addEventListener('click', (e) => {
            // 1. Modal Close Logic
            const closeBtn = e.target.closest('.close-modal');
            if (closeBtn) {
                const overlay = closeBtn.closest('.modal-overlay');
                if (overlay) overlay.style.display = 'none';
                if (closeBtn.id === 'confirm-no') confirmCallback = null;
            }

            // 2. Dropdown Outside-Click Logic
            if (!ui.menuBtn.contains(e.target) && !ui.menuDropdown.contains(e.target)) {
                ui.menuDropdown.classList.remove('force-show');
                closeAutocomplete();
            }
        });

        // Event Delegation for Mode Buttons (Optimization: 1 listener instead of 4)
        ui.menuDropdown.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn || btn.disabled) return;
            
            e.preventDefault();
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

            ui.textInput.placeholder = currentMode === 'item' ? "Search for products..." 
                                     : currentMode === 'speech' ? (startDictation(), "Listening... (Speak now)") 
                                     : "Search the internet...";

            ui.menuDropdown.classList.remove('force-show');
        });

        ui.form.addEventListener('submit', (e) => {
            const query = ui.textInput.value.trim();
            
            if (currentMode === 'image') {
                e.preventDefault(); 
                const file = ui.fileInput.files[0];
                if (!file || !file.type.startsWith('image/')) {
                    showMessage("Invalid File", "Please upload a valid image file.");
                    ui.fileInput.value = ''; 
                    return;
                }
                handleSecureProxySearch(file);
                
            } else if (currentMode === 'item') {
                e.preventDefault(); 
                if (query) window.location.href = `https://store.swedishstudiosgames.com/search?q=${encodeURIComponent(query)}`;
            }
        });

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
