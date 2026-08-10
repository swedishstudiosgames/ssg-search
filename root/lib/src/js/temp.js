document.addEventListener('DOMContentLoaded', () => {
        const WORKER_URL = '/upload'; 
        let currentMode = 'web';
        let debounceTimeout;
        let confirmCallback = null;

        const ui = {
            form: document.getElementById('sq'),
            textInput: document.getElementById('q'),
            fileInput: document.getElementById('qim'),
            clearBtn: document.getElementById('clr'),
            menuBtn: document.getElementById('mb'),
            menuDropdown: document.getElementById('mdd'),
            modeBtns: document.querySelectorAll('#mdd button'),
            grid: document.getElementById('shortcuts-grid'),
            addModal: document.getElementById('add-modal'),
            addForm: document.getElementById('add-form'),
            msgModal: document.getElementById('msg-modal'),
            msgTitle: document.getElementById('msg-title'),
            msgText: document.getElementById('msg-text'),
            confirmModal: document.getElementById('confirm-modal'),
            confirmText: document.getElementById('confirm-text')
        };

        if (!ui.form) return;

        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobi/i.test(navigator.userAgent);
        const speechBtn = document.querySelector('button[data-mode="speech"]');
        if (speechBtn && !isMobile) {
            speechBtn.disabled = true;
            speechBtn.innerHTML = `<img class="i" src="https://bexy.se/root/lib/assets/gfx/img/ico/btn/mic.svg" alt="Speech"> Voice Search [Mobile Only]`;
        }

        /* --- MODAL & EVENT DELEGATION --- */
        function showMessage(title, text) {
            ui.msgTitle.innerText = title;
            ui.msgText.innerText = text;
            ui.msgModal.style.display = 'flex';
        }

        function showConfirm(text, callback) {
            ui.confirmText.innerText = text;
            confirmCallback = callback;
            ui.confirmModal.style.display = 'flex';
        }

        document.getElementById('confirm-yes').addEventListener('click', () => {
            ui.confirmModal.style.display = 'none';
            if (confirmCallback) confirmCallback();
        });

        document.body.addEventListener('click', (e) => {
            if (e.target.closest('.close-modal')) {
                e.target.closest('.modal-overlay').style.display = 'none';
                if (e.target.id === 'confirm-no') confirmCallback = null;
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
            const savedData = localStorage.getItem('bex_shortcuts');
            sites = savedData ? JSON.parse(savedData) : defaultSites;
        } catch (e) { sites = defaultSites; }

        function renderShortcuts() {
            ui.grid.innerHTML = '';
            sites.forEach((site, index) => {
                const a = document.createElement('a');
                a.href = site.url;
                a.className = 'shortcut-btn';
                a.title = site.name;
                a.rel = "noopener noreferrer"; 

                let domain = site.url;
                try { domain = new URL(site.url).hostname; } catch(e) {}

                a.innerHTML = `<img src="https://icons.duckduckgo.com/ip3/${domain}.ico" alt="${site.name}" onerror="this.src='https://bexy.se/root/lib/assets/gfx/img/ico/favico/emblem/logo.svg'"><span>${site.name}</span>`;
                
                a.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    showConfirm(`Are you sure you want to remove "${site.name}"?`, () => {
                        sites.splice(index, 1);
                        localStorage.setItem('bex_shortcuts', JSON.stringify(sites));
                        renderShortcuts();
                    });
                });
                ui.grid.appendChild(a);
            });

            const addBtn = document.createElement('button');
            addBtn.className = 'shortcut-btn add-btn';
            addBtn.innerHTML = `<div class="add-icon">+</div><span>Add Site</span>`;
            addBtn.addEventListener('click', (e) => { e.preventDefault(); ui.addModal.style.display = 'flex'; });
            ui.grid.appendChild(addBtn);
        }

        ui.addForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('site-name').value.trim();
            let url = document.getElementById('site-url').value.trim();
            
            if (name && url) {
                if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
                sites.push({ name, url });
                localStorage.setItem('bex_shortcuts', JSON.stringify(sites));
                renderShortcuts();
                ui.addForm.reset();
                ui.addModal.style.display = 'none';
            }
        });

        renderShortcuts();

        /* --- AUTOCOMPLETE --- */
        const acContainer = document.createElement('div');
        acContainer.className = 'autocomplete-items';
        ui.textInput.parentNode.appendChild(acContainer);

        window.bexAutocompleteCallback = (data) => {
            const suggestions = data[1] || []; 
            acContainer.innerHTML = '';
            if (suggestions.length > 0 && ui.textInput.value.trim()) {
                suggestions.forEach(phrase => {
                    const div = document.createElement('div');
                    div.className = 'autocomplete-item';
                    div.innerText = phrase;
                    div.addEventListener('click', (e) => {
                        e.preventDefault();
                        ui.textInput.value = phrase;
                        acContainer.style.display = 'none';
                        ui.form.submit();
                    });
                    acContainer.appendChild(div);
                });
                acContainer.style.display = 'block';
            } else { acContainer.style.display = 'none'; }
        };

        ui.textInput.addEventListener('input', function() {
            const val = this.value;
            ui.clearBtn.classList.toggle('hidden', val.length === 0);
            
            if (!val.trim() || currentMode !== 'web') return acContainer.style.display = 'none';
            
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => {
                const oldScript = document.getElementById('jsonp-script');
                if (oldScript) oldScript.remove();

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
            e.preventDefault(); e.stopPropagation(); 
            const isVisible = ui.menuDropdown.classList.toggle('force-show');
            ui.menuBtn.setAttribute('aria-expanded', isVisible);
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
                
                ui.textInput.classList.toggle('hidden', currentMode === 'image');
                ui.fileInput.classList.toggle('hidden', currentMode !== 'image');
                
                if (currentMode === 'image') ui.textInput.removeAttribute('required');
                else ui.textInput.setAttribute('required', '');

                if (currentMode === 'store') ui.textInput.placeholder = "Search the store...";
                else if (currentMode === 'speech') startDictation();
                else ui.textInput.placeholder = "Search the internet...";

                ui.menuDropdown.classList.remove('force-show');
            });
        });

        /* --- SUBMISSION HANDLERS --- */
        ui.form.addEventListener('submit', (e) => {
            if (currentMode === 'image') {
                e.preventDefault(); 
                const file = ui.fileInput.files[0];
                if (!file || !['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'].includes(file.type)) {
                    showMessage("Invalid File", "Please upload a valid image file.");
                    ui.fileInput.value = ''; return;
                }
                handleSecureProxySearch(file);
            } else if (currentMode === 'store') {
                e.preventDefault(); 
                if (ui.textInput.value.trim()) window.location.href = `https://store.swedishstudiosgames.com/search?q=${encodeURIComponent(ui.textInput.value.trim())}`;
            }
        });

        function handleSecureProxySearch(file) {
            const newTab = window.open('', '_blank');
            if (!newTab) return showMessage("Popup Blocked", "Please allow popups to use the secure image proxy.");
            
            newTab.document.write(`<html style="font-family:sans-serif; text-align:center; padding-top:50px;"><h2>Uploading...</h2><div id="s">Contacting Secure Proxy...</div></html>`);

            const formData = new FormData(); formData.append('image', file);

            fetch(WORKER_URL, { method: 'POST', body: formData })
            .then(res => res.json())
            .then(json => {
                if (!json.success) throw new Error(json.error?.message || "Upload failed");
                newTab.document.getElementById('s').innerText = "Opening...";
                newTab.location.href = json.data.url;
                ui.fileInput.value = ''; 
            })
            .catch(err => {
                newTab.document.body.innerHTML = `<h2 style="color:red">Error</h2><p>${err.message}</p>`;
            });
        }

        function startDictation() {
            const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SR) return showMessage("Not Supported", "Speech recognition is not supported in this browser.");

            const recognition = new SR();
            recognition.lang = navigator.language || 'en-US';
            recognition.interimResults = false;
            
            ui.textInput.placeholder = "Listening... (Speak now)";
            try { recognition.start(); } catch (e) {}

            recognition.onresult = (e) => {
                ui.textInput.value = e.results[0][0].transcript;
                ui.textInput.placeholder = "Search the internet...";
                if (ui.textInput.value.trim()) ui.form.submit();
            };
            recognition.onspeechend = () => { recognition.stop(); ui.textInput.placeholder = "Search the internet..."; };
            recognition.onerror = (e) => {
                ui.textInput.placeholder = "Search the internet...";
                if (e.error !== 'no-speech') showMessage("Microphone Error", "Could not hear you. Check your permissions.");
            };
        }
    });