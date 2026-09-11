
// ============================================================
// GESTIONE VIP VAULT E VARIABILI GLOBALI
// ============================================================
let urlRiservato = "";
let pinRiservato = "";
let cacheDatiUtente = {};
let usernameCorrente = "";
let macroAreaCorrente = ""; // Variabile di stato essenziale

function apriVipVault(url, pin, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    urlRiservato = url;
    pinRiservato = pin;
    
    const overlay = document.getElementById('vip-vault-overlay');
    const input = document.getElementById('vip-pin-input');
    
    if (overlay && input) {
        input.value = "";
        input.placeholder = "****";
        input.style.borderColor = "rgba(229, 193, 88, 0.3)";
        overlay.style.display = 'flex';
        setTimeout(() => input.focus(), 100);
    }
}

function chiudiVipVault() {
    const overlay = document.getElementById('vip-vault-overlay');
    if (overlay) overlay.style.display = 'none';
    urlRiservato = "";
    pinRiservato = "";
}

function verificaPinVip() {
    const input = document.getElementById('vip-pin-input');
    if (!input) return;
    
    if (input.value === pinRiservato) {
        chiudiVipVault();
        window.open(urlRiservato, '_blank', 'noopener noreferrer');
    } else {
        input.style.borderColor = "#ff4444";
        input.value = "";
        input.placeholder = "ERRATO";
        setTimeout(() => {
            input.style.borderColor = "rgba(229, 193, 88, 0.3)";
            input.placeholder = "****";
        }, 1500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const pinInput = document.getElementById('vip-pin-input');
    if (pinInput) {
        pinInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                verificaPinVip();
            }
        });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const urlParams = new URLSearchParams(window.location.search);
    usernameCorrente = (urlParams.get("u") || "").toLowerCase().trim();

    if (!usernameCorrente) {
        const pathParts = window.location.pathname.split('/');
        const uIndex = pathParts.indexOf('u');
        if (uIndex !== -1 && pathParts[uIndex + 1]) {
            usernameCorrente = pathParts[uIndex + 1].toLowerCase().trim();
        }
    }
    
    document.getElementById("dynamic-manifest").href = `/api/manifest?u=${usernameCorrente}`;
    document.getElementById("dynamic-icon").href = `/api/generate-icons?u=${usernameCorrente}`;
    
    if (!usernameCorrente) {
        mostraErrore("Nessun profilo specificato.");
        return;
    }

    avviaFlusso(usernameCorrente);
});

// ============================================================
// FLUSSO PRINCIPALE E RENDERING DELLA TAG (OTTIMIZZATO MULTI-TAG)
// ============================================================
async function avviaFlusso(username) {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = (urlParams.get('mode') || '').toLowerCase().trim();
        const modeDraft = mode === 'draft';

        // 1. PORTACHIAVI MULTI-TAG CON FALLBACK DI TRANSIZIONE
        let chiaviSalvate = [];
        try {
            chiaviSalvate = JSON.parse(localStorage.getItem('myquicktag_keys') || '[]');
        } catch(e) {
            chiaviSalvate = [];
        }
        
        const singleLoggedUser = localStorage.getItem('loggedUser');
        
        // Verifica se l'utente è proprietario tramite array multiplo O tramite il vecchio login
        const isOwner = chiaviSalvate.some(u => u.toLowerCase() === username.toLowerCase()) || 
                        (singleLoggedUser && singleLoggedUser.toLowerCase() === username.toLowerCase());

        if (modeDraft) {
            if (!isOwner) {
                window.location.href = `/profile.html?u=${username}`;
                return;
            }
        }

        // 2. FETCH DATI CON CACHE BUSTER
        const cacheBuster = Date.now();
        const response = await fetch(`/api/get-profile?u=${username}&_cb=${cacheBuster}`);
        const data = await response.json();
        
        if (!data.success || !data.fields) {
            mostraShowroom(username);
            return;
        }

        let fields = data.fields;
        const stato = (fields.stato || "").toLowerCase().trim();

        // (NOTA: Nessun altro doppione di isOwner più in basso: usiamo quello calcolato sopra)

        if ((modeDraft || mode === 'new' || mode === 'public' || isOwner) && fields.draft_json) {
            try {
                const bozza = JSON.parse(fields.draft_json);
                fields = { ...bozza, username_system: fields.username_system, stato: fields.stato, draft_json: fields.draft_json };
            } catch (e) {
                console.error("Errore parsing draft_json:", e);
            }
        }

        cacheDatiUtente = fields;
        usernameCorrente = fields.username_system;

      if (stato === "attivo") {
            renderizzaTagCompleta(fields);
            
            // ============================================================
            // 📊 MOTORE TRACCIAMENTO VISITE (SILENZIOSO)
            // ============================================================
            // Se NON è il proprietario a guardare e NON siamo in modalità anteprima
            if (!isOwner && !modeDraft && mode !== 'public' && mode !== 'new') {
                // Spara il ping al server in background senza usare await (Zero lag per l'utente)
                fetch(`/api/track-view?u=${usernameCorrente}`, { method: 'POST' })
                    .catch(e => console.error("Tracking invisibile fallito:", e));
            }

        } else if (stato === "in attesa") {
            if (mode === 'new' || mode === 'draft' || mode === 'public' || isOwner) {
                renderizzaTagCompleta(fields);
                mostraOverlayAcquisto();
            } else {
                mostraMessaggioPersuasivo(fields);
            }
        } else {
            mostraShowroom(username);
        }

    } catch (err) {
        console.error("Errore critico avviaFlusso:", err);
        mostraErrore("Errore di connessione. Riprova tra qualche istante.");
    }
} 
function formattaBadge(testoBruto) {
    const el = document.getElementById('tag-username');
    if(!el) return;
    if (!testoBruto) testoBruto = "TUONOME";
    let testo = testoBruto.replace(/[\s\u00A0]+/g, ' ').trim().toUpperCase();
    if(testo.startsWith('@')) { testo = testo.substring(1).trim(); }

    // BLINDAGGIO XSS: Usiamo una struttura sicura con textContent per il nome
    el.innerHTML = `<span class="brand-text" style="position: relative;"><span class="at-symbol" style="position: absolute; right: 100%; padding-right: 4px; opacity: 0.4; font-weight: 300;">@</span><span id="safe-username-span"></span></span>`;
    
    const safeSpan = document.getElementById('safe-username-span');
    if (safeSpan) safeSpan.textContent = testo; // Protezione totale contro script malevoli

    el.style.whiteSpace = "normal"; el.style.wordBreak = "normal"; el.style.overflowWrap = "break-word";

    if (testo.length > 25) { el.style.fontSize = "0.85rem"; } 
    else if (testo.length > 18) { el.style.fontSize = "0.95rem"; } 
    else { el.style.fontSize = "1.05rem"; }
    
    const wrapper = document.getElementById('name-capsule-wrapper');
    if (wrapper) {
        if (testo.length < 16) {
            wrapper.classList.add('nome-corto');
        } else {
            wrapper.classList.remove('nome-corto');
        }
    }
}
function renderizzaTagCompleta(fields) {
    const container = document.getElementById('profile-content');
    if (container) {
        container.setAttribute('data-theme', fields.digital_style || 'black_dna');
        container.setAttribute('data-layout', fields.digital_layout || 'badge');
        document.body.setAttribute('data-qr-theme', fields.digital_style || 'black_dna'); 
    }

    const nomeDaMostrare = fields.username_display || fields.username_system;
    formattaBadge(nomeDaMostrare);

    const liveContainer = document.getElementById('live-avatar-container');
    const liveImg = document.getElementById('live-avatar-img');
    
    if (fields.avatar_url && liveImg && liveContainer) {
        liveImg.src = fields.avatar_url;
        liveContainer.style.display = 'flex';
    } else if (liveContainer) {
        liveContainer.style.display = 'none';
    }

    const urlPubblico = `${window.location.origin}/tag.html?u=${fields.username_system}`;
    generaQR(urlPubblico);
    renderizzaSitoWeb(fields.sito_web);
    gestisciVisibilitaCaselle(fields);
    
    if (container) {
        container.classList.add('ready');
        container.classList.add('locked');
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('welcome') === '1') { mostraWelcomeOverlay(); }
    if (urlParams.get('mode') === 'draft') {
        if (fields.stato === 'attivo') {
            const ctaPubblica = document.getElementById('cta-pubblica-container');
            if (ctaPubblica) ctaPubblica.style.display = 'block';
        } else {
            mostraOverlayAcquisto();
        }
    }
    controllaInvitoQuickPass(fields);
   controllaAcquistoIstantaneo(); 
}
// ============================================================
// MOTORE VISIVO: VISIBILITÀ STANZE E ACTION CENTER
// ============================================================
function gestisciVisibilitaCaselle(fields) {
    // 1. GESTIONE LIVE STATUS (Rimane in alto, unico e centrato)
    const pillStatus = document.getElementById('pill-live-status');
    if (pillStatus && fields.live_status_color) {
        const dot = document.getElementById('pill-status-dot');
        const txt = document.getElementById('pill-status-text');

        let colorHex = '#10b981'; let label = 'ONLINE';
        if (fields.live_status_color === 'yellow') { colorHex = '#f59e0b'; label = 'BUSY'; }
        if (fields.live_status_color === 'red') { colorHex = '#ef4444'; label = 'OFFLINE'; }

        dot.style.backgroundColor = colorHex;
        dot.style.boxShadow = `0 0 8px ${colorHex}`;

        let microCopy = label;
        if (fields.live_status_micro && fields.live_status_micro.trim() !== '') {
            microCopy = fields.live_status_micro.trim();
        }
        txt.innerText = microCopy.toUpperCase();
        txt.style.color = colorHex;

        pillStatus.style.display = 'flex';
    } else if (pillStatus) {
        pillStatus.style.display = 'none';
    }

    // 2. GESTIONE STANZE STANDARD
    const elIdentity = document.getElementById('room-identity');
    if (elIdentity) elIdentity.style.display = 'flex';

    // --- MODIFICA: Business ora mostra solo Scudo Reputazione e Lead Capture (Vasetto) ---
    const hasBusiness = !!fields.review_url || (fields.lead_capture_attivo === 'true' || fields.lead_capture_attivo === true);
    const elBusiness = document.getElementById('room-business');
    if (elBusiness) elBusiness.style.display = hasBusiness ? 'flex' : 'none';

    // --- MODIFICA: Vetrina (ex Media) ora si accende anche se c'è un PDF ---
    let galleryData = [];
    try { galleryData = JSON.parse(fields.gallery_data || '[]'); } catch(e) {}
    const hasMedia = galleryData.length > 0 || !!fields.video_url || !!fields.pdf_url;
    const elMedia = document.getElementById('room-media');
    if (elMedia) elMedia.style.display = hasMedia ? 'flex' : 'none';

    let canali = [];
    try { canali = JSON.parse(fields.config_canali || '[]'); } catch(e) {}
    const hasNetwork = !!fields.sito_web || !!fields.telefono1 || !!fields.email || (fields.config_canali && fields.config_canali !== '[]') || (fields.partners_data && fields.partners_data !== '[]');
    const elNetwork = document.getElementById('room-network');
    if (elNetwork) elNetwork.style.display = hasNetwork ? 'flex' : 'none';

    // ==========================================
    // 3. CONTROLLO QUINTA STANZA (ACTION CENTER)
    // ==========================================
    let hasActionCenter = false;

    // Controllo A: Azione Rapida
    const piano = (fields.plan || '').toUpperCase();
    if (fields.quick_action_tipo && fields.quick_action_url && piano !== 'BASE') {
        hasActionCenter = true;
    }

    // Controllo B: Quick Pass
    const qpA = fields.quickpass_premio_a;
    const qpB = fields.quickpass_premio_b;
    if (qpA && qpB && qpA.trim() !== '' && qpB.trim() !== '') {
        let quickPassValido = true;
        if (fields.quickpass_scadenza && fields.quickpass_scadenza.trim() !== '') {
            if (new Date() > new Date(fields.quickpass_scadenza)) quickPassValido = false; 
        }
        if (fields.quickpass_limite && parseInt(fields.quickpass_limite) <= 0) {
            quickPassValido = false;
        }
        if (quickPassValido) hasActionCenter = true;
    }

    // Controllo C: Flash Promo
    const isFlashExpired = fields.flash_expiry && new Date(fields.flash_expiry) < new Date();
    if (fields.flash_text && !isFlashExpired) {
        hasActionCenter = true;
    }

    // Accensione Action Center
    const elActionCenter = document.getElementById('room-action-center');
    if (elActionCenter) elActionCenter.style.display = hasActionCenter ? 'flex' : 'none';
}
// ============================================================
// BOTTOM SHEET (KILLER FEATURES)
// ============================================================
function apriDettaglio(tipo) {
    const sheet = document.getElementById('feature-bottom-sheet');
    const backdrop = document.getElementById('feature-backdrop');
    const title = document.getElementById('sheet-title');
    const icon = document.getElementById('sheet-icon');
    const body = document.getElementById('sheet-body');

    if (!sheet || !backdrop) return;
    if (navigator.vibrate) navigator.vibrate(20);

  if (tipo === 'status') {
        let colorHex = '#10b981'; let label = 'ONLINE';
        if (cacheDatiUtente.live_status_color === 'yellow') { colorHex = '#f59e0b'; label = 'BUSY'; }
        if (cacheDatiUtente.live_status_color === 'red') { colorHex = '#ef4444'; label = 'OFFLINE'; }

        icon.style.background = 'transparent';
        icon.innerHTML = `<div style="width:14px; height:14px; border-radius:50%; background:${colorHex}; box-shadow:0 0 12px ${colorHex};"></div>`;
        title.innerText = label;
        title.style.color = colorHex;
        
        const testoEsteso = cacheDatiUtente.live_status_text || 'Attualmente online e disponibile.';
        
        // --- MOTORE AZIONE CONTESTUALE DINAMICA ---
        let bottoneAzioneHTML = '';
        const actionType = cacheDatiUtente.live_status_action_type || 'nessuna';
        const actionLabel = cacheDatiUtente.live_status_action_label || 'CONTATTA ORA';
        const actionUrl = cacheDatiUtente.live_status_action_url || '';

        // Se l'utente ha configurato un'azione reale per questo stato
        if (actionType !== 'nessuna' && actionUrl !== '') {
            let destinazione = actionUrl;
            let iconaBottone = '<i class="fas fa-link"></i>';

            // Mappatura dei protocolli in base alla scelta dell'editor
            if (actionType === 'whatsapp') {
                destinazione = `https://wa.me/${actionUrl.replace(/\D/g,'')}`;
                iconaBottone = '<i class="fab fa-whatsapp"></i>';
            } else if (actionType === 'chiamata') {
                destinazione = `tel:${actionUrl}`;
                iconaBottone = '<i class="fas fa-phone-alt"></i>';
            } else if (actionType === 'email') {
                destinazione = `mailto:${actionUrl}`;
                iconaBottone = '<i class="far fa-envelope"></i>';
            } else if (actionType === 'link') {
                if (!destinazione.startsWith('http://') && !destinazione.startsWith('https://')) {
                    destinazione = 'https://' + destinazione;
                }
                iconaBottone = '<i class="fas fa-external-link-alt"></i>';
            }

            // Generazione del Ghost Button Luxury perfettamente integrato nel design
            bottoneAzioneHTML = `
                <a href="${destinazione}" target="_blank" rel="noopener noreferrer" style="width: 100%; margin-top: 20px; padding: 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid ${colorHex}; border-radius: 12px; color: #fff; font-size: 0.8rem; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; display: flex; justify-content: center; align-items: center; gap: 10px; box-shadow: 0 10px 20px rgba(0,0,0,0.2); transition: transform 0.2s;">
                    ${iconaBottone} ${actionLabel.toUpperCase()}
                </a>
            `;
        }

        // Iniettiamo l'avviso testuale ed il bottone dinamico (se presente)
        body.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%; align-items: center;">
                <div style="text-align:center; padding:10px 0; font-size:1.05rem; font-weight:400; color:#fff; line-height:1.6;">
                    ${testoEsteso}
                </div>
                ${bottoneAzioneHTML}
            </div>
        `;
    } 
    else if (tipo === 'flash') {
        icon.style.background = 'rgba(229, 193, 88, 0.1)';
        icon.innerHTML = `<i class="fas fa-bolt" style="color: #e5c158;"></i>`;
        title.innerText = cacheDatiUtente.flash_micro || 'PROMO';
        title.style.color = '#e5c158';

        const testoEsteso = cacheDatiUtente.flash_text || '';
        body.innerHTML = `
            <div style="text-align:center; padding:20px 15px; background:rgba(229,193,88,0.05); border:1px solid rgba(229,193,88,0.2); border-radius:16px; color:#e5c158; font-weight:400; font-size:1.05rem; line-height:1.5;">
                ${testoEsteso}
            </div>
        `;
    }
 if (tipo === 'quickpass') {
        titolo.textContent = 'QUICK PASS';
        const premioA = cacheDatiUtente.quickpass_premio_a;
        const premioB = cacheDatiUtente.quickpass_premio_b;
        
        const urlTagCorrente = window.location.href.split('?')[0]; 
        const linkCondivisione = `${urlTagCorrente}?qp_ref=invito`;
        const testoWhatsApp = encodeURIComponent(`Ti ho regalato: ${premioB}! 🎁\n\nMostra questo Quick Pass alla cassa per sbloccarlo: ${linkCondivisione}`);
        const apiWhatsApp = `https://wa.me/?text=${testoWhatsApp}`;

        corpo.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%; align-items: center; gap: 30px; padding-top: 15px;">
                <i class="fas fa-gift" style="font-size: 3.5rem; color: var(--theme-border, #d4af37); filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.2));"></i>
                
                <div style="text-align:center; font-size:1rem; font-weight:300; color:#e8e8ed; line-height:1.6; padding: 0 10px;">
                    Regala <strong style="color:#fff; font-weight: 500;">${premioB}</strong> a un amico.<br>
                    Quando lo utilizzerà, tu sbloccherai:
                </div>

                <div style="width: 100%; max-width: 320px; padding: 35px 20px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.05); border-left: 2px solid var(--theme-border, #d4af37); border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
                    <span style="font-size: 0.75rem; color: rgba(255,255,255,0.4); letter-spacing: 4px; text-transform: uppercase; margin-bottom: 12px;">IL TUO PREMIO</span>
                    <span style="font-size: 1.25rem; font-weight: 600; color: #fff; letter-spacing: 2px; text-align: center; text-transform: uppercase;">${premioA}</span>
                </div>
                
                <a href="${apiWhatsApp}" target="_blank" rel="noopener noreferrer" style="width: 100%; max-width: 320px; padding: 20px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--theme-border, #d4af37); border-radius: 14px; color: #fff; font-size: 0.9rem; font-weight: 500; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; display: flex; justify-content: center; align-items: center; gap: 12px; box-shadow: 0 15px 30px rgba(0,0,0,0.3); transition: transform 0.2s; margin-top: 15px;">
                    <i class="fab fa-whatsapp" style="font-size: 1.4rem; color: var(--theme-border, #d4af37);"></i> INVITA E SBLOCCA
                </a>
            </div>
        `;
        
        const btnCondividiSezione = document.getElementById('btnCondividiLink');
        if (btnCondividiSezione) btnCondividiSezione.style.display = 'none';

      const elementi = corpo.children;
        Array.from(elementi).forEach((el, index) => {
            el.classList.add('cascade-item');
            el.style.animationDelay = `${index * 0.08}s`; 
            setTimeout(() => {
                el.classList.add('overlay-boot-active');
            }, 10);
        });

    }
    
    backdrop.classList.add('active');
    sheet.classList.add('active');
} 

function chiudiDettaglio() {
    const sheet = document.getElementById('feature-bottom-sheet');
    const backdrop = document.getElementById('feature-backdrop');
    if (sheet) sheet.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
}

// ============================================================
// SYSTEM NAVIGATION (MOTORE LIQUIDO E SINCRONIZZATO)
// ============================================================
function sbloccaTag() {
    const container = document.getElementById('profile-content');
    if (!container || !container.classList.contains('locked')) return;
    if (navigator.vibrate) navigator.vibrate(30);

    history.pushState(null, null, '#ecosistema');
    document.documentElement.classList.add('no-pull-refresh');
    document.body.classList.add('no-pull-refresh');

    container.classList.remove('locked');
    container.classList.add('unlocked');

    // Anima la riga intera delle pillole seguita dalle stanze
    setTimeout(() => {
        const caselle = document.querySelectorAll('#action-bar-features, #mainGrid .room-link');
        let moduliVisibili = 0;
        caselle.forEach((casella) => {
            if (window.getComputedStyle(casella).display !== 'none') {
                casella.classList.remove('boot-module-closing');
                void casella.offsetWidth; // Forza il rendering fluido
                casella.classList.add('boot-module-active');
                casella.style.animationDelay = (moduliVisibili * 0.1) + 's';
                moduliVisibili++;
            }
        });
    }, 150); 
}

function bloccaTag() {
    history.back(); 
}

function eseguiBloccoVisivo() {
    if (navigator.vibrate) navigator.vibrate(20);
    document.documentElement.classList.remove('no-pull-refresh');
    document.body.classList.remove('no-pull-refresh');

    const container = document.getElementById('profile-content');
    
    // Fai sprofondare nel buio il blocco pillole e le stanze
    const caselle = document.querySelectorAll('#action-bar-features, #mainGrid .room-link');
    caselle.forEach(c => {
        c.classList.remove('boot-module-active');
        c.classList.add('boot-module-closing');
        c.style.animationDelay = '0s'; 
    });

    // Attendi l'uscita di scena, poi scende il brand
    setTimeout(() => {
        container.classList.remove('unlocked');
        container.classList.add('locked');
    }, 600); 
}
// ============================================================
// LIGHTBOX COMPONENT
// ============================================================
function apriLightbox(indice) {
    const lightbox = document.getElementById('mqt-lightbox');
    const track = document.getElementById('lightbox-track');
    if(!lightbox || !track) return;

    // Registra lo stato Lightbox (Livello Profondo)
    history.pushState(null, null, '#lightbox');
    lightbox.style.display = 'flex';
    document.documentElement.classList.add('no-pull-refresh');
    document.body.classList.add('no-pull-refresh');
    
    setTimeout(() => {
        const larghezzaSchermo = track.offsetWidth;
        track.scrollLeft = larghezzaSchermo * indice;
        aggiornaContatoreLightbox();
    }, 50);
}

function chiudiLightbox() { 
    history.back(); 
}

function aggiornaContatoreLightbox() {
    const track = document.getElementById('lightbox-track');
    const totale = track.children.length;
    if(totale === 0) return;
    const indiceAttuale = Math.round(track.scrollLeft / track.offsetWidth) + 1;
    document.getElementById('lightbox-counter').innerText = `${indiceAttuale}/${totale}`;
}

function scorriLightbox(direzione) {
    const track = document.getElementById('lightbox-track');
    track.scrollBy({ left: track.offsetWidth * direzione, behavior: 'smooth' });
}

// ============================================================
// QR CODE & SITO WEB
// ============================================================
function generaQR(url) {
    const wrapper = document.querySelector('.qr-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    new QRCode(wrapper, { text: url, width: 84, height: 84, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
}

function renderizzaSitoWeb(url) {
    const casella = document.getElementById('casella-sito');
    if (!casella) return;
    if (!url || url.trim() === "") {
        casella.style.display = 'none';
        return;
    }
    casella.style.display = 'flex';
}

// ============================================================
// OVERLAY DI SISTEMA
// ============================================================
function mostraOverlayAcquisto() {
    const overlay = document.getElementById("showroom-overlay");
    const titolo = document.getElementById("conversion-title");
    const btn = document.getElementById("showroom-action-btn");
    if (!overlay) return;
    if (titolo) {
        const nome = (cacheDatiUtente.username_display || usernameCorrente).replace('@', '');
        titolo.innerText = `@${nome} è riservata.\nSolo tu puoi attivarla — gratis per 3 mesi.`;
    }
    if (btn) {
        const nome = (cacheDatiUtente.username_display || usernameCorrente).replace('@', '');
        btn.textContent = `Attiva @${nome}`;
        btn.onclick = () => { window.location.href = `/checkout.html?u=${usernameCorrente}`; };
    }
    overlay.style.display = "flex";
    document.body.style.overflow = "hidden";
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.style.overflow = 'hidden';
    const backBtn = document.getElementById('back-to-dashboard');
    if (backBtn) backBtn.style.display = 'block';
    const content = document.querySelector(".conversion-content");
    if (content) content.style.opacity = "1"; 
} 

function chiudiOverlayAcquisto() {
    const backBtn = document.getElementById('back-to-dashboard');
    if (backBtn) backBtn.style.display = 'none';
    document.body.style.overflow = 'auto';
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.style.overflow = 'auto';
    window.location.href = `/profile.html?u=${usernameCorrente}`;
}

function mostraShowroom(username) {
    const overlay = document.getElementById("showroom-overlay");
    const titolo = document.getElementById("conversion-title");
    const btn = document.getElementById("showroom-action-btn");
    if (!overlay) return;
    if (titolo) { titolo.innerText = `Nessun altro potrà essere @${username.replace('@', '')}`; }
    if (btn) {
        btn.textContent = "Attiva la tua myquicktag";
        btn.onclick = () => { window.location.href = `/index.html?u=${username}`; };
    }
    overlay.style.display = "flex";
    const container = document.querySelector('.app-container');
    if (container) container.classList.add('ready');
    const content = document.querySelector(".conversion-content");
    if (content) content.style.opacity = "1";
} 

function mostraErrore(messaggio) {
    const container = document.querySelector('.app-container');
    if (container) {
        container.innerHTML = `<p style="color:#86868b; text-align:center; padding:40px;">${messaggio}</p>`;
        container.classList.add('ready');
    }
}

function mostraMessaggioPersuasivo(fields) {
    const container = document.querySelector('.app-container');
    const nomeBrand = fields.username_display || fields.username_system;
    if (container) {
        container.innerHTML = `
            <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; text-align: center; padding: 20px;">
                <div style="font-size: 1.1rem; font-weight: 300; letter-spacing: 2px; color: #ffffff; margin-bottom: 24px;">
                    BENVENUTO IN <span style="font-weight: 600;">MYQUICKTAG</span>
                </div>
                <div style="width: 30px; height: 1px; background: rgba(212, 175, 55, 0.5); margin-bottom: 24px;"></div>
                <div style="font-size: 0.95rem; color: #86868b; line-height: 1.8;">
                    La tag <span style="color: #ffffff; font-weight: 500;">@${nomeBrand.replace('@', '')}</span> non è ancora attiva.<br><br>
                    Completa la configurazione per sfruttare tutta la potenza del tuo ecosistema.
                </div>
            </div>
        `;
        container.classList.add('ready');
    }
}

// ============================================================
// SOCIAL, QUICK ACTION & VCF
// ============================================================
const quickActionConfig = {
    'appuntamento': { icon: '<i class="far fa-calendar-alt"></i>', label: 'Prenota appuntamento' },
    'whatsapp':     { icon: '<i class="fab fa-whatsapp"></i>', label: 'Scrivimi su WhatsApp' },
    'preventivo':   { icon: '<i class="fas fa-file-signature"></i>', label: 'Richiedi preventivo' },
    'chiamata':     { icon: '<i class="fas fa-phone-alt"></i>', label: 'Chiama ora' },
    'maps':         { icon: '<i class="fas fa-map-marker-alt"></i>', label: 'Trovami su Maps' },
    'demo':         { icon: '<i class="fas fa-music"></i>', label: 'Ascolta demo' }
};

const socialIcons = {
    "instagram": "fab fa-instagram", "tiktok": "fab fa-tiktok", "facebook": "fab fa-facebook-f", "linkedin": "fab fa-linkedin-in",
    "x": "fab fa-x-twitter", "twitter": "fab fa-x-twitter", "youtube": "fab fa-youtube", "whatsapp": "fab fa-whatsapp",
    "telegram": "fab fa-telegram-plane", "spotify": "fab fa-spotify", "tripadvisor": "fab fa-tripadvisor", "thefork": "fas fa-utensils",
    "onlyfans": "fas fa-star", "github": "fab fa-github", "twitch": "fab fa-twitch", "strava": "fab fa-strava",
    "pinterest": "fab fa-pinterest-p", "discord": "fab fa-discord", "snapchat": "fab fa-snapchat-ghost", "threads": "fab fa-threads",
    "calendly": "far fa-calendar-check", "patreon": "fab fa-patreon", "behance": "fab fa-behance", "dribbble": "fab fa-dribbble",
    "vimeo": "fab fa-vimeo-v", "reddit": "fab fa-reddit-alien", "medium": "fab fa-medium-m", "soundcloud": "fab fa-soundcloud",
    "apple music": "fab fa-apple", "default": "fas fa-link"
};

// ============================================================
// ⚡ KILLER FEATURE: SMART STATUS ROUTING (CENTRALINO INTELLIGENTE)
// ============================================================
function renderizzaQuickAction(tipo, url) {
    const btnQA = document.getElementById('room-quick-action');
    if (!btnQA) return;

    const piano = (cacheDatiUtente.plan || '').toUpperCase();
    if (!tipo || !url || piano === 'BASE') {
        btnQA.style.display = 'none';
        return;
    }

    // Nessun controllo del semaforo qui, la Quick Action è indipendente
    const cfg = quickActionConfig[tipo.toLowerCase()] || { icon: '<i class="fas fa-bolt"></i>', label: 'AZIONE RAPIDA' };
    
    // Ripristiniamo lo stile originale luxury
    btnQA.style.pointerEvents = "auto";
    btnQA.style.opacity = "1";
    btnQA.style.border = '1px solid var(--theme-border, #d4af37)';
    btnQA.style.color = '#ffffff';

    btnQA.innerHTML = `${cfg.icon} &nbsp; ${cacheDatiUtente.quick_action_label || cfg.label}`;
    btnQA.style.display = 'flex';
}

function eseguiQuickAction() {
    tracciaClickSezione('QUICK ACTION');
    const tipo = (cacheDatiUtente.quick_action_tipo || '').toLowerCase();
    const url  = cacheDatiUtente.quick_action_url || '';
    if (!url) return;

    // Logica pura: fa esattamente quello che gli dice l'editor, senza deviazioni
    const mappaProtocollo = {
        'whatsapp':  `https://wa.me/${url.replace(/\D/g,'')}`,
        'chiamata':  `tel:${url}`,
        'maps':      `https://maps.google.com/?q=${encodeURIComponent(url)}`,
        'appuntamento': url,
        'preventivo':   url,
        'demo':         url
    };

    const destinazione = mappaProtocollo[tipo] || url;
    window.open(destinazione, '_blank', 'noopener noreferrer');
}
function scaricaVCF(vcf, fields) {
    const nome = vcf.nome || fields.username_display || fields.username_system || '';
    const tel1 = vcf.telefono1 || '';
    const tel2 = vcf.telefono2 || '';
    const email1 = vcf.email1 || fields.email || '';
    const email2 = vcf.email2 || '';
    const sito = vcf.sito || fields.sito_web || '';
    const indirizzo = vcf.indirizzo || '';
    const piva = vcf.piva || '';

   const vcfContent = [
        'BEGIN:VCARD', 'VERSION:3.0', `N:;${nome};;;`, `FN:${nome}`,
        tel1 ? `TEL;TYPE=CELL:${tel1}` : '', tel2 ? `TEL;TYPE=WORK:${tel2}` : '',
        email1 ? `EMAIL;TYPE=WORK:${email1}` : '', email2 ? `EMAIL;TYPE=HOME:${email2}` : '',
        sito ? `URL:${sito}` : '', indirizzo ? `ADR:;;${indirizzo};;;;` : '',
        piva ? `NOTE:P.IVA ${piva}` : '', 'END:VCARD'
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([vcfContent], { type: 'text/vcard' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nome || 'contatto'}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
}

// ============================================================
// APERTURA MACRO AREE E CASCATA SOTTOMENU
// ============================================================
function apriMacroArea(area, skipHistory = false) {
    const overlay = document.getElementById('overlaySezione');
    const titolo  = document.getElementById('titoloSezione');
    const corpo   = document.getElementById('corpoSezione');
    if (!overlay || !titolo || !corpo) return;
    
    // --- ACCENDI LA TOP BAR (Livello Vetro) ---
    const topBar = document.getElementById('mqt-top-bar-layer');
    if (topBar) topBar.style.display = 'block';
    
    // --- NASCONDI TASTO SALVA (Dissolvenza per non coprire il titolo) ---
    const btnSalva = document.getElementById('btn-salva-pocket');
    if (btnSalva) {
        btnSalva.style.opacity = '0';
        btnSalva.style.pointerEvents = 'none';
    }
    
    // Salva il riferimento per il tasto indietro
    macroAreaCorrente = area;
    
    document.getElementById('testo-chiudi').innerText = 'CHIUDI';
    document.getElementById('icona-chiudi').className = 'fas fa-times';

    corpo.innerHTML = '';
    let sottomenuHTML = '';

    if (area === 'identity') {
        titolo.textContent = 'IDENTITY';
        sottomenuHTML += `<button class="btn-social cascade-item" onclick="apriSezione('qr')"><i class="fas fa-qrcode" style="font-size:1.2rem; width:25px; color:var(--accent-gold);"></i> <span style="flex:1; text-align:left;">ACCESS TAG</span></button>`;
        if (cacheDatiUtente.bio) {
            sottomenuHTML += `<button class="btn-social cascade-item" onclick="apriSezione('bio')"><i class="fas fa-pen-nib" style="font-size:1.2rem; width:25px; color:#fff;"></i> <span style="flex:1; text-align:left;">BIOGRAFIA</span></button>`;
        }
        // --- SPOSTATO QUI: CV ---
        if (cacheDatiUtente.cv) {
            sottomenuHTML += `<button class="btn-social cascade-item" onclick="apriSezione('cv')"><i class="fas fa-file-alt" style="font-size:1.2rem; width:25px; color:#fff;"></i> <span style="flex:1; text-align:left;">CURRICULUM VITAE</span></button>`;
        }
    }
    else if (area === 'business') {
        titolo.textContent = 'BUSINESS';
        
        if (cacheDatiUtente.review_url) {
            sottomenuHTML += `<button class="btn-social cascade-item" onclick="apriScudoReputazione()"><i class="fas fa-star" style="font-size:1.2rem; width:25px; color:#e5c158;"></i> <span style="flex:1; text-align:left;">LASCIA UN FEEDBACK</span></button>`;
        }
   
      // --- LEAD CAPTURE (IL VASETTO PUBBLICO) ---
        if (cacheDatiUtente.lead_capture_attivo === 'true' || cacheDatiUtente.lead_capture_attivo === true) {
            const titoloVasetto = cacheDatiUtente.lead_capture_titolo || "Lascia il tuo contatto per essere ricontattato";
            sottomenuHTML += `
                <div style="margin-top: 25px; background: rgba(229, 193, 88, 0.05); border: 1px solid rgba(229, 193, 88, 0.3); padding: 20px; border-radius: 16px; text-align: left; box-shadow: inset 0 0 20px rgba(229, 193, 88, 0.02);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: #e5c158; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
                        <i class="fas fa-bullseye"></i> Richiesta Contatto
                    </div>
                    <div style="font-size: 0.8rem; color: #fff; margin-bottom: 16px; line-height: 1.5;">${titoloVasetto}</div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <input type="text" id="visitor-lead-nome" placeholder="Il tuo Nome" style="width: 100%; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 14px 16px; border-radius: 10px; font-family: 'Inter', sans-serif; font-size: 0.85rem; outline: none;">
                        <input type="text" id="visitor-lead-contatto" placeholder="Email o Telefono" style="width: 100%; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 14px 16px; border-radius: 10px; font-family: 'Inter', sans-serif; font-size: 0.85rem; outline: none;">
                        <button type="button" onclick="inviaLeadVisitatore()" style="margin-top: 5px; background: #e5c158; color: #000; border: none; padding: 14px; border-radius: 10px; font-weight: 800; font-size: 0.8rem; letter-spacing: 1px; text-transform: uppercase; cursor: pointer; transition: all 0.2s;" onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'">INVIA ORA</button>
                    </div>
                </div>
            `;
        }  
    }  
    else if (area === 'media') {
        titolo.textContent = 'VETRINA'; // --- CAMBIATO IN VETRINA ---
        
        // --- SPOSTATO QUI: PDF ---
        if (cacheDatiUtente.pdf_url) {
            const label = (cacheDatiUtente.pdf_label || 'DOCUMENTO PDF').toUpperCase();
            sottomenuHTML += `<button class="btn-social cascade-item" onclick="apriSezione('pdf')"><i class="fas fa-file-pdf" style="font-size:1.2rem; width:25px; color:#e5c158;"></i> <span style="flex:1; text-align:left;">${label}</span></button>`;
        }

        // NUOVO: SMART VIDEO VAULT
        if (cacheDatiUtente.video_url) {
            sottomenuHTML += `<button class="btn-social cascade-item" onclick="apriSmartVideo()" style="border: 1px solid rgba(229, 193, 88, 0.3); background: rgba(229, 193, 88, 0.05); margin-bottom: 15px;"><i class="fas fa-play-circle" style="font-size:1.2rem; width:25px; color:#e5c158;"></i> <span style="flex:1; text-align:left; color:#e5c158; font-weight:600;">GUARDA IL VIDEO</span></button>`;
        }

        const galleryDataStr = cacheDatiUtente.gallery_data || "[]";
        let arrayGalleria = [];
        try { arrayGalleria = JSON.parse(galleryDataStr); } catch(e) {}
        
        if (arrayGalleria.length > 0) {
            sottomenuHTML += `<button class="btn-social cascade-item" onclick="apriSezione('gallery')"><i class="fas fa-images" style="font-size:1.2rem; width:25px; color:#fff;"></i> <span style="flex:1; text-align:left;">GALLERIA IMMAGINI</span></button>`;
        }
    }
    else if (area === 'network') {
        titolo.textContent = 'NETWORK';
        if (cacheDatiUtente.sito_web) {
            sottomenuHTML += `<button class="btn-social cascade-item" onclick="apriSezione('sito')"><i class="fas fa-globe" style="font-size:1.2rem; width:25px; color:#fff;"></i> <span style="flex:1; text-align:left;">SITO WEB UFFICIALE</span></button>`;
        }
        let canali = [];
        try { canali = JSON.parse(cacheDatiUtente.config_canali || '[]'); } catch(e) {}
        if (canali.length > 0) {
            sottomenuHTML += `<button class="btn-social cascade-item" onclick="apriSezione('social')"><i class="fas fa-share-nodes" style="font-size:1.2rem; width:25px; color:#fff;"></i> <span style="flex:1; text-align:left;">SOCIAL & LINK</span></button>`;
        }
        if (cacheDatiUtente.email || cacheDatiUtente.modulo_vcf) {
            sottomenuHTML += `<button class="btn-social cascade-item" onclick="apriSezione('contatti')"><i class="fas fa-address-card" style="font-size:1.2rem; width:25px; color:#fff;"></i> <span style="flex:1; text-align:left;">RUBRICA & CONTATTI</span></button>`;
        }

       // --- CERCHIA DI FIDUCIA (PARTNERS) ---
        const partnersStr = cacheDatiUtente.partners_data || "[]";
        let arrayPartners = [];
        try { arrayPartners = JSON.parse(partnersStr); } catch(e) {}
        
        if (arrayPartners.length > 0) {
            sottomenuHTML += `<div style="margin: 20px 0 8px 0; font-size: 0.65rem; color: #e5c158; letter-spacing: 2px; text-transform: uppercase; font-weight: 600; text-align: left;">Cerchia di Fiducia</div>`;
            arrayPartners.forEach(p => {
                sottomenuHTML += `<a href="${p.url}" target="_blank" rel="noopener noreferrer" class="btn-social cascade-item" style="border: 1px solid rgba(229, 193, 88, 0.3); background: rgba(229, 193, 88, 0.05); text-decoration: none; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; border-radius: 14px; margin-bottom: 10px;"><i class="fas fa-handshake" style="font-size: 1.3rem; color: #e5c158; margin-bottom: 8px;"></i><span style="color: #fff; font-weight: 600; font-size: 0.85rem; text-align: center; letter-spacing: 0.5px;">${p.nome}</span><span style="font-size: 0.6rem; color: rgba(229, 193, 88, 0.7); margin-top: 4px; letter-spacing: 1px; text-transform: uppercase;">Visita Partner ↗</span></a>`;
            });
        }
        // -------------------------------------
    }
    else if (area === 'action_center') {
        titolo.textContent = 'ACTION CENTER';
        
        // 1. Inserimento Azione Rapida
        const piano = (cacheDatiUtente.plan || '').toUpperCase();
        if (cacheDatiUtente.quick_action_tipo && cacheDatiUtente.quick_action_url && piano !== 'BASE') {
            const qaTipo = cacheDatiUtente.quick_action_tipo.toLowerCase();
            const cfg = quickActionConfig[qaTipo] || { icon: '<i class="fas fa-bolt"></i>', label: 'Azione Rapida' };
            const label = cacheDatiUtente.quick_action_label || cfg.label;
            sottomenuHTML += `<button class="btn-social cascade-item" onclick="eseguiQuickAction()"><span style="font-size:1.2rem; width:25px; text-align:center; color:var(--theme-border, #d4af37);">${cfg.icon}</span> <span style="flex:1; text-align:left;">${label.toUpperCase()}</span></button>`;
        }

        // 2. Inserimento Quick Pass
        const qpA = cacheDatiUtente.quickpass_premio_a;
        const qpB = cacheDatiUtente.quickpass_premio_b;
        if (qpA && qpB && qpA.trim() !== '' && qpB.trim() !== '') {
            let quickPassValido = true;
            if (cacheDatiUtente.quickpass_scadenza && cacheDatiUtente.quickpass_scadenza.trim() !== '') {
                if (new Date() > new Date(cacheDatiUtente.quickpass_scadenza)) quickPassValido = false; 
            }
            if (cacheDatiUtente.quickpass_limite && parseInt(cacheDatiUtente.quickpass_limite) <= 0) {
                quickPassValido = false;
            }
            if (quickPassValido) {
                sottomenuHTML += `<button class="btn-social cascade-item" onclick="apriSezione('quickpass')"><i class="fas fa-gift" style="font-size:1.2rem; width:25px; text-align:center; color:var(--theme-border, #d4af37);"></i> <span style="flex:1; text-align:left;">QUICK PASS</span></button>`;
            }
        }

        // 3. Inserimento Flash Promo (Ora è DENTRO la stanza giusta!)
        const isFlashExpired = cacheDatiUtente.flash_expiry && new Date(cacheDatiUtente.flash_expiry) < new Date();
        if (cacheDatiUtente.flash_text && !isFlashExpired) {
            const flashLabel = (cacheDatiUtente.flash_micro || 'PROMO FLASH').toUpperCase();
            sottomenuHTML += `<button class="btn-social cascade-item" onclick="apriSezione('flash')"><i class="fas fa-bolt" style="font-size:1.2rem; width:25px; text-align:center; color:#e5c158;"></i> <span style="flex:1; text-align:left;">${flashLabel}</span></button>`;
        }
    }

    corpo.innerHTML = sottomenuHTML;
    
    const items = corpo.querySelectorAll('.cascade-item');
    items.forEach((item, index) => {
        item.style.animationDelay = `${index * 0.1}s`;
        item.classList.add('overlay-boot-active');
    });
    
    const btnCondividiSezione = document.getElementById('btnCondividiLink');
    if (btnCondividiSezione) btnCondividiSezione.style.display = 'none';

    overlay.classList.add('attiva');
    
    // Registra lo stato Sottomenu (Livello 1)
    if (!skipHistory) {
        history.pushState(null, null, '#sezione');
    }
}
// ============================================================
// APERTURA SEZIONE INTERNA E CONTENUTI
// ============================================================
function apriSezione(tipo) {
    // Accensione Radar Analytics
    tracciaClickSezione(tipo.toUpperCase());
    const overlay = document.getElementById('overlaySezione');
    const titolo  = document.getElementById('titoloSezione');
    const corpo   = document.getElementById('corpoSezione');
    if (!overlay || !titolo || !corpo) return;
    
    // --- SPEGNI LA TOP BAR NEL LIVELLO PROFONDO ---
    const topBar = document.getElementById('mqt-top-bar-layer');
    if (topBar) topBar.style.display = 'none';
    
    document.getElementById('testo-chiudi').innerText = 'INDIETRO';
    document.getElementById('icona-chiudi').className = 'fas fa-chevron-left';

    if (tipo === 'pdf' || tipo === 'cv') {
        let pdfLink = tipo === 'cv' ? cacheDatiUtente.cv : cacheDatiUtente.pdf_url;
        if (pdfLink) {
            if (pdfLink.startsWith('http://')) {
                pdfLink = pdfLink.replace('http://', 'https://');
            } else if (!pdfLink.startsWith('https://') && !pdfLink.startsWith('/')) {
                pdfLink = 'https://' + pdfLink;
            }
            window.open(pdfLink, '_blank', 'noopener noreferrer');
        }
        return;
    }

    history.pushState(null, null, '#dettaglio');

    document.getElementById('testo-chiudi').innerText = 'INDIETRO';
    document.getElementById('icona-chiudi').className = 'fas fa-chevron-left';

    if (tipo === 'qr') {
        titolo.textContent = 'ACCESS TAG';
        const url = `${window.location.origin}/tag.html?u=${cacheDatiUtente.username_system}`;
        corpo.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:20px; padding-top: 20px;">
                <div class="qr-wrapper" id="qr-container-interno" style="width:190px !important; height:190px !important; border-radius: 20px !important; padding:10px !important; background:#fff !important;"></div>
                <div style="font-size: 0.8rem; color: #86868b; text-align: center; line-height: 1.5;">Questo è il tuo pass digitale.<br>Inquadralo per salvare il profilo.</div>
            </div>
        `;
        const qrContainer = document.getElementById('qr-container-interno');
        new QRCode(qrContainer, { text: url, width: 170, height: 170, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
        return;
    }

    if (tipo === 'status') {
        titolo.textContent = 'LIVE STATUS';
        let colorHex = '#10b981'; let icona = '🟢';
        if (cacheDatiUtente.live_status_color === 'yellow') { colorHex = '#f59e0b'; icona = '🟡'; }
        if (cacheDatiUtente.live_status_color === 'red') { colorHex = '#ef4444'; icona = '🔴'; }
        
        corpo.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:20px; padding-top: 20px; text-align:center;">
                <div style="font-size: 3.5rem;">${icona}</div>
                <div style="font-size: 1.1rem; color: ${colorHex}; font-weight: 600; letter-spacing: 2px; text-transform: uppercase;">${cacheDatiUtente.live_status_color === 'green' ? 'ONLINE' : cacheDatiUtente.live_status_color === 'yellow' ? 'BUSY' : 'OFFLINE'}</div>
                <div style="font-size: 1rem; color: #fff; line-height: 1.6; padding: 0 10px;">${cacheDatiUtente.live_status_text || 'Attualmente online.'}</div>
            </div>
        `;
        return;
    }
 if (tipo === 'quickpass') {
        titolo.textContent = 'QUICK PASS';
        const premioA = cacheDatiUtente.quickpass_premio_a;
        const premioB = cacheDatiUtente.quickpass_premio_b;
        
        const urlTagCorrente = window.location.href.split('?')[0]; 
        const linkCondivisione = `${urlTagCorrente}?qp_ref=invito`;
        const testoWhatsApp = encodeURIComponent(`Ti ho regalato: ${premioB}! 🎁\n\nMostra questo Quick Pass alla cassa per sbloccarlo: ${linkCondivisione}`);
        const apiWhatsApp = `https://wa.me/?text=${testoWhatsApp}`;

        corpo.innerHTML = `
            <div style="display: flex; flex-direction: column; width: 100%; align-items: center; gap: 30px; padding-top: 15px;">
                <i class="fas fa-gift" style="font-size: 3.5rem; color: var(--theme-border, #d4af37); filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.2));"></i>
                
                <div style="text-align:center; font-size:1rem; font-weight:300; color:#e8e8ed; line-height:1.6; padding: 0 10px;">
                    Regala <strong style="color:#fff; font-weight: 500;">${premioB}</strong> a un amico.<br>
                    Quando lo utilizzerà, tu sbloccherai:
                </div>

                <!-- Box Premio Luxury a tutto schermo (Cornice unificata) -->
                <div style="width: 100%; max-width: 320px; padding: 35px 20px; background: rgba(0,0,0,0.5); border: 1px solid var(--theme-border, #d4af37); border-radius: 20px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 25px 50px rgba(0,0,0,0.5);">
                    <span style="font-size: 0.75rem; color: rgba(255,255,255,0.4); letter-spacing: 4px; text-transform: uppercase; margin-bottom: 12px;">IL TUO PREMIO</span>
                    <span style="font-size: 1.25rem; font-weight: 600; color: #fff; letter-spacing: 2px; text-align: center; text-transform: uppercase;">${premioA}</span>
                </div>
                
                <a href="${apiWhatsApp}" target="_blank" rel="noopener noreferrer" style="width: 100%; max-width: 320px; padding: 20px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--theme-border, #d4af37); border-radius: 14px; color: #fff; font-size: 0.9rem; font-weight: 500; letter-spacing: 3px; text-transform: uppercase; text-decoration: none; display: flex; justify-content: center; align-items: center; gap: 12px; box-shadow: 0 15px 30px rgba(0,0,0,0.3); transition: transform 0.2s; margin-top: 15px;">
                    <i class="fab fa-whatsapp" style="font-size: 1.4rem; color: var(--theme-border, #d4af37);"></i> INVITA E SBLOCCA
                </a>
            </div>
        `;
        
        const btnCondividiSezione = document.getElementById('btnCondividiLink');
        if (btnCondividiSezione) btnCondividiSezione.style.display = 'none';

        const elementi = corpo.children;
        Array.from(elementi).forEach((el, index) => {
            el.classList.add('cascade-item');
            el.style.animationDelay = `${index * 0.08}s`; 
            setTimeout(() => {
                el.classList.add('overlay-boot-active');
            }, 10);
        });

        return;
    }
    if (tipo === 'flash') {
        titolo.textContent = 'MQT FLASH';
        corpo.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:20px; padding-top: 20px; text-align:center;">
                <i class="fas fa-bolt" style="font-size: 3rem; color: #e5c158; margin-bottom: 10px;"></i>
                <div style="font-size: 1.05rem; color: #e5c158; font-weight: 600; line-height: 1.6; padding: 25px 20px; background: rgba(229,193,88,0.1); border: 1px solid rgba(229,193,88,0.3); border-radius: 16px; width: 100%;">
                    ${cacheDatiUtente.flash_text}
                </div>
            </div>
        `;
        return;
    }

    if (tipo === 'gallery') {
        titolo.textContent = 'GALLERY';
        corpo.innerHTML = '';
        let arrayFoto = [];
        try { arrayFoto = JSON.parse(cacheDatiUtente.gallery_data || '[]'); } catch(e) {}

        if (arrayFoto.length === 0) {
            corpo.textContent = 'Nessuna immagine presente nella galleria.';
        } else {
            let grigliaHTML = '<div class="gallery-grid">';
            let trackHTML = '';
            
            arrayFoto.forEach((urlOriginale, index) => {
                const urlMiniatura = urlOriginale.replace('/upload/', '/upload/c_fill,w_300,h_300,q_auto,f_auto/');
                const urlHD = urlOriginale.replace('/upload/', '/upload/w_1200,q_auto,f_auto/');
                
                grigliaHTML += `<div class="gallery-thumb" style="background-image: url('${urlMiniatura}');" onclick="apriLightbox(${index})"></div>`;
                trackHTML += `<div class="lightbox-slide"><img src="${urlHD}" loading="lazy"></div>`;
            });
            grigliaHTML += '</div>';
            
            corpo.innerHTML = grigliaHTML;
            
            const lightboxTrack = document.getElementById('lightbox-track');
            if(lightboxTrack) lightboxTrack.innerHTML = trackHTML;
        }
        return;
    }

    if (tipo === 'sito') {
        titolo.textContent = 'Sito Web';
        corpo.innerHTML = '';

        const urlSito = cacheDatiUtente.sito_web || '';
        const dominioPulito = urlSito.replace(/https?:\/\/(www\.)?/, '').split('/')[0];

        if (!urlSito) {
            corpo.textContent = 'Nessun sito web configurato.';
        } else {
            const riga = document.createElement('div');
            riga.style.cssText = 'display:flex; align-items:center; gap:12px; padding:14px 0; border-bottom:1px solid rgba(255,255,255,0.06); width: 100%;';

            const link = document.createElement('a');
            link.href = urlSito;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.style.cssText = 'display:flex; align-items:center; gap:12px; flex:1; text-decoration:none; color:inherit;';
            link.innerHTML = `<i class="fas fa-globe" style="font-size:1.1rem; width:22px; text-align:center; color:#ffffff;"></i><span style="font-size:0.95rem; color:#f5f5f7; font-weight:500;">${dominioPulito || urlSito}</span>`;

            const btnCopia = document.createElement('button');
            btnCopia.style.cssText = 'background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#ffffff; padding:7px 10px; border-radius:8px; cursor:pointer; flex-shrink:0;';
            btnCopia.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
            btnCopia.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                _condividi(dominioPulito || urlSito, urlSito);
            };

            riga.appendChild(link);
            riga.appendChild(btnCopia);
            corpo.appendChild(riga);
        }

        const btnCondividiSezione = document.getElementById('btnCondividiLink');
        if (btnCondividiSezione) btnCondividiSezione.style.display = 'none';
        return;
    }

    if (tipo === 'contatti') {
        titolo.textContent = 'Contatti';
        corpo.innerHTML = '';
        const piano = (cacheDatiUtente.plan || '').toUpperCase();
        let vcf = {};
        try { 
            const raw = cacheDatiUtente.modulo_vcf;
            vcf = typeof raw === 'object' ? raw : JSON.parse(raw || '{}');
        } catch(e) {}

        const email = cacheDatiUtente.email || vcf.email1 || '';
        const tel1 = vcf.telefono1 || '';
        const tel2 = vcf.telefono2 || '';
        const email2 = vcf.email2 || '';
        const indirizzo = vcf.indirizzo || '';
        const piva = vcf.piva || '';

        const campiBase = [];
        if (tel1) campiBase.push({ icona: 'fas fa-phone', label: tel1, azione: `tel:${tel1}`, copia: tel1 });
        if (email) campiBase.push({ icona: 'fas fa-envelope', label: email, azione: `mailto:${email}`, copia: email });

        const campiPremium = [];
        if (tel2) campiPremium.push({ icona: 'fas fa-phone', label: tel2, azione: `tel:${tel2}`, copia: tel2 });
        if (email2) campiPremium.push({ icona: 'fas fa-envelope', label: email2, azione: `mailto:${email2}`, copia: email2 });
        if (indirizzo) campiPremium.push({ icona: 'fas fa-map-marker-alt', label: indirizzo, azione: `https://maps.google.com/?q=${encodeURIComponent(indirizzo)}`, copia: indirizzo });
        if (piva) campiPremium.push({ icona: 'fas fa-file-invoice', label: 'P.IVA: ' + piva, azione: null, copia: piva });

        const tuttiCampi = piano === 'BASE' ? campiBase : [...campiBase, ...campiPremium];

        if (tuttiCampi.length === 0) {
            corpo.textContent = 'Nessun contatto configurato.';
        } else {
            tuttiCampi.forEach(campo => {
                const riga = document.createElement('div');
                riga.style.cssText = 'display:flex; align-items:center; gap:12px; padding:14px 0; border-bottom:1px solid rgba(255,255,255,0.06); width: 100%;';

                const sinistro = document.createElement(campo.azione ? 'a' : 'div');
                if (campo.azione) {
                    sinistro.href = campo.azione;
                    if (campo.azione.startsWith('http')) sinistro.target = '_blank';
                    sinistro.rel = 'noopener noreferrer';
                }
                sinistro.style.cssText = 'display:flex; align-items:center; gap:12px; flex:1; text-decoration:none; color:inherit;';
                sinistro.innerHTML = `<i class="${campo.icona}" style="font-size:1.1rem; width:22px; text-align:center; color:#ffffff;"></i><span style="font-size:0.9rem; color:#f5f5f7;">${campo.label}</span>`;

                const btnCopia = document.createElement('button');
                btnCopia.style.cssText = 'background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#ffffff; padding:7px 10px; border-radius:8px; cursor:pointer; flex-shrink:0;';
                btnCopia.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
                btnCopia.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    _condividi(campo.label, campo.copia);
                };

                riga.appendChild(sinistro);
                riga.appendChild(btnCopia);
                corpo.appendChild(riga);
            });

            if (piano !== 'BASE') {
                const btnVcf = document.createElement('button');
                btnVcf.className = 'btn-salva-rubrica';
                btnVcf.innerHTML = '<i class="fas fa-address-book"></i> Salva in rubrica';
                btnVcf.onclick = () => scaricaVCF(vcf, cacheDatiUtente);
                corpo.appendChild(btnVcf);
            }
        }

        const btnCondividiSezione = document.getElementById('btnCondividiLink');
        if (btnCondividiSezione) btnCondividiSezione.style.display = 'none';
        return;
    }

    if (tipo === 'social') {
        titolo.textContent = 'Canali social';
        corpo.innerHTML = '';
        
        let canali = [];
        try { canali = JSON.parse(cacheDatiUtente.config_canali || '[]'); } catch(e) {}

        if (canali.length === 0) {
            corpo.textContent = 'Nessun canale configurato.';
        } else {
            canali.forEach(canale => {
                const nomeLower = canale.nome.toLowerCase();
                const iconClass = socialIcons[nomeLower] || socialIcons["default"];
                const isVip = (canale.vip === true || canale.vip === 'true');
                const lockHtml = isVip ? `<i class="fas fa-lock" style="color: #e5c158; font-size: 0.8rem; margin-left: 8px;"></i>` : '';

                const riga = document.createElement('div');
                riga.style.cssText = 'display:flex; align-items:center; gap:12px; padding:14px 0; border-bottom:1px solid rgba(255,255,255,0.06); width: 100%;';

                const link = document.createElement('a');
                if (isVip) {
                    link.href = "#";
                    link.onclick = (e) => apriVipVault(canale.url, canale.pin, e);
                } else {
                    link.href = canale.url;
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                }
                
                link.style.cssText = 'display:flex; align-items:center; gap:12px; flex:1; text-decoration:none; color:inherit;';
                link.innerHTML = `<i class="${iconClass}" style="font-size:1.2rem; width:22px; text-align:center; color:#ffffff;"></i><span style="font-size:0.95rem; font-weight:500;">${canale.nome}</span>${lockHtml}`;

                const btnCondividi = document.createElement('button');
                btnCondividi.style.cssText = 'background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#ffffff; padding:7px 10px; border-radius:8px; cursor:pointer; flex-shrink:0;';
                btnCondividi.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>';
                btnCondividi.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    _condividi(canale.nome, canale.url);
                };

                riga.appendChild(link);
                riga.appendChild(btnCondividi);
                corpo.appendChild(riga);
            });
        }

        const btnCondividiSezione = document.getElementById('btnCondividiLink');
        if (btnCondividiSezione) btnCondividiSezione.style.display = 'none';
        return;
    }

   const contenuti = {
        'bio': { t: 'Biografia', c: cacheDatiUtente.bio || 'Nessuna bio disponibile.' },
    };

    if (!contenuti[tipo]) return;

    titolo.textContent = contenuti[tipo].t;
    
    // BLINDAGGIO SICUREZZA: Creazione sicura del testo senza rischi XSS
    corpo.innerHTML = '';
    const divTesto = document.createElement('div');
    divTesto.className = 'testo-lettura';
    divTesto.textContent = contenuti[tipo].c; // Il browser mostra il testo in modo sicuro
    corpo.appendChild(divTesto);
    const btnCondividiSezione = document.getElementById('btnCondividiLink');
    if (btnCondividiSezione) {
        btnCondividiSezione.style.display = tipo === 'cv' ? 'block' : 'none';
    }

    const elementi = corpo.children;
    Array.from(elementi).forEach((el, index) => {
        el.classList.add('cascade-item');
        el.style.animationDelay = `${index * 0.08}s`; 
        setTimeout(() => {
            el.classList.add('overlay-boot-active');
        }, 10);
    }); 
}
function chiudiSezione() {
    history.back();
}

// ============================================================
// GESTIONE GLOBALE DEL TASTO INDIETRO E DELLA CRONOLOGIA
// ============================================================
window.addEventListener('popstate', (e) => {
    const hash = window.location.hash;
    const lightbox = document.getElementById('mqt-lightbox');
    const overlaySezione = document.getElementById('overlaySezione');
    const container = document.getElementById('profile-content');
    
    // --- RIACCENDI LA TOP BAR SE NON SIAMO NEL LIVELLO PROFONDO ---
    const topBar = document.getElementById('mqt-top-bar-layer');
    if (topBar && hash !== '#dettaglio' && hash !== '#lightbox') {
        topBar.style.display = 'block';
    } 
    
    // --- MOSTRA TASTO SALVA AL RITORNO IN HOME ---
    const btnSalva = document.getElementById('btn-salva-pocket');
    if (btnSalva) {
        if (hash === '' || hash === '#ecosistema') {
            btnSalva.style.opacity = '1';
            btnSalva.style.pointerEvents = 'auto';
        }
    }

    // Livello 3 (Profondo): Modale Foto o Dettaglio Features
    if (lightbox && lightbox.style.display === 'flex') {
        lightbox.style.display = 'none';
        return; 
    }

    // Livello 2: Ritorno dal dettaglio interno (es. QR/Gallery) al sottomenu
    if (hash === '#sezione') {
        if (macroAreaCorrente) {
            apriMacroArea(macroAreaCorrente, true); // Riapre la stanza senza duplicare l'hash
        }
    } 
    // Livello 1: Ritorno dal sottomenu all'Ecosistema principale
    else if (hash === '#ecosistema') {
        if (overlaySezione && overlaySezione.classList.contains('attiva')) {
            overlaySezione.classList.remove('attiva');
        }
    } 
    // Livello 0: Ritorno dall'Ecosistema alla Copertina
    else if (hash === '') {
        if (overlaySezione && overlaySezione.classList.contains('attiva')) overlaySezione.classList.remove('attiva');
        if (container && container.classList.contains('unlocked')) eseguiBloccoVisivo();
        
        ['showroom-overlay', 'tag-welcome-overlay', 'vip-vault-overlay'].forEach(id => {
            const el = document.getElementById(id);
            if (el && el.style.display === 'flex') el.style.display = 'none';
        });
    }
});

// ============================================================
// GESTIONE TAG POCKET (IBRIDA: LOCALE + CLOUD SYNC)
// ============================================================
function salvaNelPocketCorrente() {
    const usernameTag = cacheDatiUtente.username_system || window.location.pathname.split('u=')[1] || "Sconosciuto";
    const nomeVisualizzato = cacheDatiUtente.username_display || cacheDatiUtente.username_system || "myquicktag";
    
    let pocketLocale = [];
    try {
        pocketLocale = JSON.parse(localStorage.getItem('mqt_pocket') || '[]');
    } catch(e) {
        pocketLocale = [];
    }
    
    const giaEsistente = pocketLocale.find(item => item.username === usernameTag);
    
    if (!giaEsistente) {
        // 1. NON ESISTE: LO SALVIAMO IN MEMORIA LOCALE (Veloce)
        pocketLocale.push({
            username: usernameTag,
            nome: nomeVisualizzato,
            url: window.location.href.split('?')[0] + '?u=' + usernameTag,
            dataSalvataggio: new Date().toISOString()
        });
        localStorage.setItem('mqt_pocket', JSON.stringify(pocketLocale));
        
        // 2. CLOUD SYNC: Se c'è un utente loggato, salva su Airtable in background
        const utenteLoggato = localStorage.getItem('loggedUser');
        if (utenteLoggato) {
            sincronizzaPocketCloud(utenteLoggato, pocketLocale);
        }
        
        // 3. Aggiorniamo visivamente il led
        const btnPocketText = document.getElementById('testo-salva-top');
        const dotSalva = document.getElementById('dot-salva');
        if (btnPocketText && dotSalva) {
            btnPocketText.innerHTML = 'SALVATO ✓';
            btnPocketText.style.color = 'var(--theme-border, #d4af37)';
            dotSalva.style.animation = 'none';
            dotSalva.style.backgroundColor = 'var(--theme-border, #d4af37)';
            dotSalva.style.boxShadow = '0 0 8px var(--theme-border, #d4af37)';
        }
        
        mostraOverlayPocket("TAG SALVATA", "Contatto salvato con successo nel tuo archivio.");
    } else {
        mostraOverlayPocket("TAG PRESENTE", "Questa tag si trova già nel tuo archivio.");
    }
}

// MOTORE DI SINCRONIZZAZIONE SILENZIOSA (Lusso)
async function sincronizzaPocketCloud(utente, pocketArray) {
    try {
        await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username_system: utente,
                pocket_cloud: JSON.stringify(pocketArray) // Inietta l'intero archivio nella colonna
            })
        });
    } catch (error) {
        console.error("Cloud Sync fallito, il dato resta comunque al sicuro sul telefono.", error);
    }
}
// MOTORE DELL'OVERLAY IMMERSIVO (Puro lusso fluttuante)
function mostraOverlayPocket(titolo, messaggio) {
    let overlay = document.getElementById('pocket-immersive-overlay');
    
    // Se non esiste ancora, lo creiamo al volo
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'pocket-immersive-overlay';
        
        // Sfondo scuro a tutto schermo, niente "scatola" centrale
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100vh; background: rgba(0, 0, 0, 0.92); backdrop-filter: blur(15px); display: flex; flex-direction: column; justify-content: center; align-items: center; z-index: 99999; opacity: 0; transition: opacity 0.4s ease; padding: 20px; box-sizing: border-box;';
        
        overlay.innerHTML = `
            <div style="text-align: center; display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 300px; transform: translateY(15px); transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);">
                
                <i class="far fa-address-book" style="font-size: 3.5rem; color: var(--theme-border, #d4af37); margin-bottom: 24px; font-weight: 300; filter: drop-shadow(0 0 15px rgba(255,255,255,0.05));"></i>
                
                <h3 id="pocket-overlay-titolo" style="color: #fff; font-size: 1.05rem; font-weight: 300; margin-bottom: 20px; letter-spacing: 4px; text-transform: uppercase;"></h3>
                
                <!-- Separatore chirurgico colorato dinamicamente -->
                <div style="width: 30px; height: 1px; background: var(--theme-border, rgba(212, 175, 55, 0.5)); margin-bottom: 20px;"></div>
                
                <p id="pocket-overlay-msg" style="color: #86868b; font-size: 0.95rem; font-weight: 300; line-height: 1.8; margin-bottom: 45px; padding: 0 10px;"></p>
                
                <div style="display: flex; flex-direction: column; gap: 15px; width: 100%;">
                    <button onclick="window.location.href='/pocket.html'" style="width: 100%; padding: 18px; background: transparent; border: 1px solid var(--theme-border, #d4af37); border-radius: 12px; color: #fff; font-size: 0.8rem; font-weight: 400; letter-spacing: 4px; cursor: pointer; transition: transform 0.2s; text-transform: uppercase;">Apri Pocket</button>
                    
                    <button onclick="chiudiOverlayPocket()" style="width: 100%; padding: 18px; background: transparent; border: none; color: #86868b; font-size: 0.75rem; font-weight: 300; letter-spacing: 3px; cursor: pointer; transition: color 0.2s; text-transform: uppercase;">Chiudi</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    // Inseriamo i testi dinamici
    document.getElementById('pocket-overlay-titolo').innerText = titolo;
    document.getElementById('pocket-overlay-msg').innerText = messaggio;
    
    // Lo mostriamo con una transizione fluida
    overlay.style.display = 'flex';
    void overlay.offsetWidth; 
    overlay.style.opacity = '1';
    
    // Applica animazione interna
    const content = overlay.querySelector('div');
    setTimeout(() => { content.style.transform = 'translateY(0)'; }, 50);
}

// Assicurati di eliminare qualsiasi vecchia funzione chiudiPromptPocket o mostraPromptPocket
function chiudiOverlayPocket() {
    const overlay = document.getElementById('pocket-immersive-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        const content = overlay.querySelector('div');
        content.style.transform = 'translateY(15px)';
        setTimeout(() => { overlay.style.display = 'none'; }, 400);
    }
}
// MOTORE DEL POPUP LUXURY (Generato dinamicamente)
function mostraPromptPocket(titolo, messaggio) {
    let prompt = document.getElementById('pocket-prompt-overlay');
    
    // Se non esiste ancora, lo creiamo al volo
    if (!prompt) {
        prompt = document.createElement('div');
        prompt.id = 'pocket-prompt-overlay';
        prompt.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100vh; background: rgba(0, 0, 0, 0.85); display: flex; justify-content: center; align-items: center; z-index: 99999; opacity: 0; transition: opacity 0.3s ease; padding: 20px; box-sizing: border-box;';
        prompt.innerHTML = `
            <div style="background: rgba(15, 15, 18, 0.95); border: 1px solid var(--theme-border, #d4af37); border-radius: 24px; padding: 32px 24px; text-align: center; width: 100%; max-width: 340px; box-shadow: 0 25px 50px rgba(0,0,0,0.6); transform: scale(0.95); transition: transform 0.3s ease; display: flex; flex-direction: column; align-items: center;">
                <i class="far fa-address-book" style="font-size: 3rem; color: var(--theme-border, #d4af37); margin-bottom: 20px; filter: drop-shadow(0 0 10px rgba(212, 175, 55, 0.2));"></i>
                <h3 id="pocket-prompt-titolo" style="color: #fff; font-size: 1.05rem; font-weight: 500; margin-bottom: 12px; letter-spacing: 2px; text-transform: uppercase;"></h3>
                <p id="pocket-prompt-msg" style="color: #86868b; font-size: 0.95rem; font-weight: 300; line-height: 1.6; margin-bottom: 28px;"></p>
                <div style="display: flex; gap: 12px; width: 100%;">
                    <button onclick="chiudiPromptPocket()" style="flex: 1; padding: 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; color: #fff; font-size: 0.85rem; font-weight: 400; letter-spacing: 2px; cursor: pointer; transition: background 0.2s;">CHIUDI</button>
                    <button onclick="window.location.href='/pocket.html'" style="flex: 1; padding: 14px; background: #fff; border: none; border-radius: 12px; color: #000; font-size: 0.85rem; font-weight: 600; letter-spacing: 2px; cursor: pointer; transition: transform 0.2s;">APRI</button>
                </div>
            </div>
        `;
        document.body.appendChild(prompt);
    }
    
    // Inseriamo il testo dinamico
    document.getElementById('pocket-prompt-titolo').innerText = titolo;
    document.getElementById('pocket-prompt-msg').innerText = messaggio;
    
    // Lo mostriamo con una transizione fluida
    prompt.style.display = 'flex';
    void prompt.offsetWidth; // Forza il browser a registrare il display:flex prima di animare
    prompt.style.opacity = '1';
    prompt.querySelector('div').style.transform = 'scale(1)';
}

function chiudiPromptPocket() {
    const prompt = document.getElementById('pocket-prompt-overlay');
    if (prompt) {
        prompt.style.opacity = '0';
        prompt.querySelector('div').style.transform = 'scale(0.95)';
        setTimeout(() => { prompt.style.display = 'none'; }, 300);
    }
} 

// ============================================================
// CONDIVISIONE, TOAST E CHECKOUT
// ============================================================
function condividiProfilo(event) {
    if (event) event.stopPropagation();
    const stato = (cacheDatiUtente.stato || '').toLowerCase().trim();
    if (stato === 'in attesa') {
        mostraToast('Attiva la tua tag per condividerla');
        return;
    }
    const url = `${window.location.origin}/tag.html?u=${usernameCorrente}`;
    const nome = cacheDatiUtente.username_display || usernameCorrente;
    _condividi('myquicktag di @' + nome, url);
}

function condividiSezione() {
    const titolo = document.getElementById('titoloSezione').textContent;
    const url = `${window.location.origin}/tag.html?u=${usernameCorrente}&sezione=${encodeURIComponent(titolo)}`;
    _condividi('MyQuickTag - ' + titolo, url);
}

function _condividi(titolo, url) {
    if (navigator.share) {
        navigator.share({ title: titolo, url: url }).catch(err => {
            if (err.name !== 'AbortError') console.error("Errore condivisione:", err);
        });
    } else {
        navigator.clipboard.writeText(url)
            .then(() => mostraToast('🔗 Link copiato!'))
            .catch(() => mostraToast('Errore nella copia del link'));
    }
}

function mostraToast(messaggio) {
    const toast = document.getElementById('toastNotifica');
    if (!toast) return;
    toast.textContent = messaggio;
    toast.classList.add('mostra');
    setTimeout(() => toast.classList.remove('mostra'), 2800);
}

function vaiAlCheckout() {
    window.location.href = `/checkout.html?u=${usernameCorrente}`;
}

// ============================================================
// PUBBLICAZIONE BOZZA (VERSIONE LUXURY DEFINITIVA)
// ============================================================
async function pubblicaBozza() {
    const btn = document.querySelector('button[onclick="pubblicaBozza()"]');
    const originalText = btn ? btn.innerHTML : 'Pubblica la tua tag';
    
    // Feedback visivo immediato (Lusso)
    if(btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Pubblicazione in corso...';
    
    try {
        const bozza = JSON.parse(cacheDatiUtente.draft_json || '{}');
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username_system: usernameCorrente,
                ...bozza,
                draft_json: ""
            })
        });

        const data = await response.json();
        
        if (data.success) {
            if(btn) {
                btn.innerHTML = 'PUBBLICATA ✓';
                btn.style.background = '#10b981';
                btn.style.color = '#000';
            }
            mostraToast('Tag pubblicata con successo!');
            // Ricarica la pagina dopo un istante
            setTimeout(() => { window.location.href = `/tag.html?u=${usernameCorrente}`; }, 1200);
        } else {
            console.error("Errore Airtable nascosto:", data);
            if(btn) btn.innerHTML = originalText;
            mostraToast('Errore di salvataggio');
        }
    } catch (err) {
        console.error("Errore di rete:", err);
        if(btn) btn.innerHTML = originalText;
        mostraToast('Errore di connessione al server');
    }
}
function chiudiWelcomeEMostraTag() {
    const welcome = document.getElementById('tag-welcome-overlay');
    if (welcome) welcome.style.display = 'none';
    const container = document.querySelector('.app-container');
    if (container) container.classList.add('ready');
    document.body.style.overflow = 'auto';
}

// ============================================================
// INSTALLAZIONE PWA E SERVICE WORKER
// ============================================================
let pwaInstallEvent = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); 
    pwaInstallEvent = e; 
    const btnInstall = document.getElementById('trigger-pwa-install');
    if (btnInstall) btnInstall.style.display = 'block';
});

async function installaPWA() {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
        mostraIstruzioniIOS();
        return;
    }

    if (pwaInstallEvent) {
        try {
            pwaInstallEvent.prompt();
            const { outcome } = await pwaInstallEvent.userChoice;
            if (outcome === 'accepted') {
                pwaInstallEvent = null;
                chiudiWelcomeEMostraTag();
            } else {
                mostraToast('Installazione annullata');
            }
        } catch (err) {
            console.error("Errore installazione PWA:", err);
            mostraToast('Errore durante l\'installazione');
        }
        return;
    }
    mostraToast('Apri dal browser Chrome per installare');
}

function mostraIstruzioniIOS() {
    const overlay = document.getElementById('tag-welcome-overlay');
    if (!overlay) return;
    const corpo = document.getElementById('welcome-corpo');
    if (corpo) corpo.innerHTML = 'Tocca <strong>Condividi</strong> in basso nel browser,<br>poi <strong>"Aggiungi a schermata Home"</strong>.';
    const btn = document.getElementById('trigger-pwa-install');
    if (btn) btn.style.display = 'none';
    overlay.style.display = 'flex';
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => { console.log('Service Worker registrato:', reg.scope); })
            .catch(err => { console.error('Errore registrazione Service Worker:', err); });
    });
}

window.addEventListener('appinstalled', () => {
    pwaInstallEvent = null;
    mostraToast('myquicktag installata');
});

function mostraWelcomeOverlay() {
    const urlPulita = `${window.location.origin}/tag.html?u=${usernameCorrente}`;
    window.history.replaceState({}, '', urlPulita);
    
    const overlay = document.getElementById('tag-welcome-overlay');
    if (!overlay) return;

    const nome = cacheDatiUtente.username_display || usernameCorrente;
    const titoloEl = overlay.querySelector('.titolo-sezione');
    if (titoloEl) titoloEl.textContent = '@' + nome.replace('@', '') + ' è attiva'; 

    overlay.style.display = 'flex';
}
    // ============================================================
// GESTIONE ATTERRAGGIO QUICK PASS (Nuovo Cliente B)
// ============================================================
function controllaInvitoQuickPass(fields) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('qp_ref') === 'invito') {
        const qpB = fields.quickpass_premio_b;
        
        // Se c'è un premio B configurato dal titolare
        if (qpB && qpB.trim() !== '') {
            
            // Controlli di sicurezza (Scadenza e Limite)
            if (fields.quickpass_scadenza && new Date() > new Date(fields.quickpass_scadenza)) return;
            if (fields.quickpass_limite && parseInt(fields.quickpass_limite) <= 0) return;

            const overlay = document.getElementById('qp-landing-overlay');
            const txtPremio = document.getElementById('qp-landing-premio');
            const qrContainer = document.getElementById('qp-landing-qr');
            
            if (overlay && txtPremio && qrContainer) {
                txtPremio.innerText = qpB;
                
                // Pulisce e Genera il QR Code. 
                // NOTA: Per ora inseriamo nel QR un link fittizio "action=valida". 
                // Nella fase successiva collegheremo questo link alla funzione di validazione del barista.
                qrContainer.innerHTML = '';
                const scanUrl = `${window.location.origin}/tag.html?u=${fields.username_system}&action=valida`;
                new QRCode(qrContainer, { text: scanUrl, width: 160, height: 160, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
                
                overlay.style.display = 'flex';
                
                // Impediamo lo scroll dietro la modale
                document.body.style.overflow = 'hidden';
            }
        }
    }
}

function chiudiQPLanding() {
    const overlay = document.getElementById('qp-landing-overlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = 'auto'; // Ripristiniamo lo scroll
}
// ============================================================
// QUICK QR SCANNER (LUXURY TRIGGER)
// ============================================================
function apriQRRapido() {
    if (navigator.vibrate) navigator.vibrate(15);
    apriMacroArea('identity', true);
    setTimeout(() => {
        apriSezione('qr');
    }, 50);
}      
// ============================================================
// ⚡ KILLER FEATURE: SCUDO REPUTAZIONE (SMART REVIEW GATE)
// ============================================================
function apriScudoReputazione() {
    const sheet = document.getElementById('feature-bottom-sheet');
    const backdrop = document.getElementById('feature-backdrop');
    const title = document.getElementById('sheet-title');
    const icon = document.getElementById('sheet-icon');
    const body = document.getElementById('sheet-body');

    if (!sheet || !backdrop) return;
    tracciaClickSezione('SCUDO REPUTAZIONE');
    if (navigator.vibrate) navigator.vibrate(20);

    icon.style.background = 'rgba(229, 193, 88, 0.1)';
    icon.innerHTML = `<i class="fas fa-star" style="color: #e5c158;"></i>`;
    title.innerText = 'IL TUO FEEDBACK';
    title.style.color = '#e5c158';

    // Generiamo l'interfaccia a 5 stelle vergini
    let htmlStelle = `
        <div style="text-align:center; padding:10px 0; font-size:1.05rem; font-weight:300; color:#fff; line-height:1.6;">
            Come valuti la tua esperienza?
        </div>
        <div style="display: flex; justify-content: center; gap: 12px; margin-top: 15px; margin-bottom: 25px;" id="star-container">
    `;
    for(let i=1; i<=5; i++) {
        htmlStelle += `<i class="far fa-star star-rating" onclick="selezionaStelle(${i})" style="font-size: 2.2rem; color: #86868b; cursor: pointer; transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.2s;"></i>`;
    }
    htmlStelle += `</div><div id="feedback-action-container" style="min-height: 80px; display: flex; flex-direction: column; justify-content: flex-end;"></div>`;

    body.innerHTML = htmlStelle;

    backdrop.classList.add('active');
    sheet.classList.add('active');
}

function selezionaStelle(valore) {
    if (navigator.vibrate) navigator.vibrate(15);
    
    // Anima e colora le stelle
    const stars = document.querySelectorAll('.star-rating');
    stars.forEach((s, index) => {
        if(index < valore) {
            s.className = 'fas fa-star star-rating'; // Stella piena
            s.style.color = '#e5c158';
            s.style.transform = 'scale(1.15)';
        } else {
            s.className = 'far fa-star star-rating'; // Stella vuota
            s.style.color = 'rgba(255,255,255,0.2)';
            s.style.transform = 'scale(1)';
        }
    });

    const actionContainer = document.getElementById('feedback-action-container');
    
    // LOGICA DI SMISTAMENTO (IL VERO SCUDO)
    if(valore <= 3) {
        // RECENSIONE NEGATIVA -> Deviazione in privato
        const contatto = cacheDatiUtente.review_contact || '';
        let destinazione = '';
        let iconaBtn = '';
        let testoBtn = '';
        
        // Capisce automaticamente se è un'email o un numero di telefono
        if(contatto.includes('@')) {
            destinazione = `mailto:${contatto}`;
            iconaBtn = '<i class="fas fa-envelope"></i>';
            testoBtn = 'INVIACI UN MESSAGGIO';
        } else {
            destinazione = `https://wa.me/${contatto.replace(/\D/g,'')}`;
            iconaBtn = '<i class="fab fa-whatsapp"></i>';
            testoBtn = 'SCRIVICI SU WHATSAPP';
        }
        
        actionContainer.innerHTML = `
            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7); text-align: center; margin-bottom: 15px; font-weight: 300; line-height: 1.5;">Ci dispiace che l'esperienza non sia stata a 5 stelle.<br>Contattaci per permetterci di rimediare.</div>
            <a href="${destinazione}" target="_blank" rel="noopener noreferrer" style="width: 100%; padding: 16px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; color: #fff; font-size: 0.85rem; font-weight: 500; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; display: flex; justify-content: center; align-items: center; gap: 10px; transition: transform 0.2s;">
                ${iconaBtn} ${testoBtn}
            </a>
        `;
    } else {
        // RECENSIONE POSITIVA (4 o 5) -> Via libera a Google
        const linkPubblico = cacheDatiUtente.review_url || '#';
        actionContainer.innerHTML = `
            <div style="font-size: 0.85rem; color: #10b981; text-align: center; margin-bottom: 15px; font-weight: 400; line-height: 1.5;">Fantastico! Grazie mille.<br>Se ti va, condividi la tua esperienza pubblicamente.</div>
            <a href="${linkPubblico}" target="_blank" rel="noopener noreferrer" style="width: 100%; padding: 16px; background: #10b981; border: none; border-radius: 12px; color: #000; font-size: 0.85rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; display: flex; justify-content: center; align-items: center; gap: 10px; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.3); transition: transform 0.2s;">
                <i class="fab fa-google"></i> LASCIA UNA RECENSIONE
            </a>
        `;
    }
}
    // ============================================================
// ⚡ KILLER FEATURE: SMART VIDEO VAULT
// ============================================================
function convertiUrlInEmbed(url) {
    if (!url) return '';
    // Converte i link YouTube normali
    if (url.includes('youtube.com/watch?v=')) {
        const videoId = url.split('v=')[1].split('&')[0];
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } 
    // Converte i link YouTube corti
    else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    } 
    // Converte i link Vimeo
    else if (url.includes('vimeo.com/')) {
        const videoId = url.split('vimeo.com/')[1].split('?')[0];
        return `https://player.vimeo.com/video/${videoId}?autoplay=1`;
    }
    return url; // Ritorna l'url base se non è YT/Vimeo
}

function apriSmartVideo() {
    if (navigator.vibrate) navigator.vibrate(20);
tracciaClickSezione('SMART VIDEO');
    
    const overlay = document.getElementById('video-vault-overlay');
    const iframe = document.getElementById('video-vault-iframe');
    const ctaContainer = document.getElementById('video-vault-cta-container');
    const ctaBtn = document.getElementById('video-vault-cta-btn');

    // Mette il link corretto nel player
    iframe.src = convertiUrlInEmbed(cacheDatiUtente.video_url);

    // Controlla se il professionista ha impostato un bottone CTA
    if (cacheDatiUtente.video_cta_text && cacheDatiUtente.video_cta_url) {
        ctaBtn.innerText = cacheDatiUtente.video_cta_text;
        ctaBtn.href = cacheDatiUtente.video_cta_url;
        ctaContainer.style.display = 'block';
    } else {
        ctaContainer.style.display = 'none';
    }

    // Effetto comparsa
    overlay.style.display = 'flex';
    setTimeout(() => {
        overlay.style.opacity = '1';
    }, 10);
}

function chiudiSmartVideo() {
    if (navigator.vibrate) navigator.vibrate(10);
    const overlay = document.getElementById('video-vault-overlay');
    const iframe = document.getElementById('video-vault-iframe');
    
    // Effetto scomparsa
    overlay.style.opacity = '0';
    setTimeout(() => {
        overlay.style.display = 'none';
        iframe.src = ''; // Questo blocca l'audio del video in background!
    }, 300);
}
    // ============================================================
// ⚡ INVIO LEAD DA PARTE DEL VISITATORE (VASETTO)
// ============================================================
async function inviaLeadVisitatore() {
    if (navigator.vibrate) navigator.vibrate(20);
    const nomeInput = document.getElementById('visitor-lead-nome');
    const contattoInput = document.getElementById('visitor-lead-contatto');
    
    if (!nomeInput || !contattoInput) return;
    const nome = nomeInput.value.trim();
    const contatto = contattoInput.value.trim();

    if (!nome || !contatto) {
        alert('Inserisci sia il nome che un recapito valido per continuare.');
        return;
    }
tracciaClickSezione('LEAD ACQUISITO');
    
    // Blocca il bottone per evitare doppi invii
    const btn = event.currentTarget;
    const testoOriginale = btn.innerText;
    btn.innerText = "INVIO IN CORSO...";
    btn.style.pointerEvents = "none";
    btn.style.opacity = "0.7";

    let leads = [];
    try {
        leads = JSON.parse(cacheDatiUtente.lead_capture_leads || '[]');
    } catch(e) {
        leads = [];
    }

    const nuovoLead = {
        nome: nome,
        contatto: contatto,
        data: new Date().toLocaleDateString('it-IT') + ' ' + new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'})
    };

    leads.unshift(nuovoLead); // Aggiunge il nuovo contatto in cima alla lista
    cacheDatiUtente.lead_capture_leads = JSON.stringify(leads);

    // Salva i dati aggiornati sul server usando l'API di update-profile
    try {
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username_system: cacheDatiUtente.username_system || getNomeBrandReale(),
                lead_capture_leads: cacheDatiUtente.lead_capture_leads
                // Nota: In un'app normale qui andrebbe gestita la sicurezza (es. un endpoint separato /api/add-lead) 
                // ma per ora sfruttiamo update-profile per salvare la stringa JSON diretta su Airtable come hai richiesto.
            })
        });
        
        const data = await response.json();
        
        if (data.success || response.ok) {
            btn.innerText = "CONTATTO INVIATO ✅";
            btn.style.background = "#10b981";
            btn.style.color = "#fff";
            nomeInput.value = '';
            contattoInput.value = '';
            setTimeout(() => {
                btn.innerText = testoOriginale;
                btn.style.background = "#e5c158";
                btn.style.color = "#000";
                btn.style.pointerEvents = "auto";
                btn.style.opacity = "1";
            }, 3000);
        } else {
            throw new Error("Risposta server non ok");
        }
    } catch(err) {
        console.error("Errore salvataggio lead:", err);
        alert('Si è verificato un errore di connessione. Riprova tra poco.');
        btn.innerText = testoOriginale;
        btn.style.pointerEvents = "auto";
        btn.style.opacity = "1";
    }
}
   // ============================================================
// ⚡ ACQUISTO ISTANTANEO (GATE DA PALCO CON TIMER FOMO)
// ============================================================
function controllaAcquistoIstantaneo() {
    if (!cacheDatiUtente) return;

    // Verifica se il professionista ha acceso l'interruttore
    const isAttivo = cacheDatiUtente.shop_attivo === 'true' || cacheDatiUtente.shop_attivo === true;
    const scadenzaStr = cacheDatiUtente.shop_scadenza;
    
    if (!isAttivo || !scadenzaStr) return;

    const scadenzaTime = new Date(scadenzaStr).getTime();
    const now = new Date().getTime();

    // Se la data è già passata, annulla tutto e mostra la Tag normale
    if (now > scadenzaTime) return;

    // Se è attivo e valido, costruiamo il Muro di Vendita a tutto schermo
    const overlay = document.createElement('div');
    overlay.id = "shop-overlay-fomo";
    overlay.style.cssText = "position: fixed; inset: 0; background: #050505; z-index: 999999; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; font-family: 'Inter', sans-serif; text-align: center;";

    const titolo = cacheDatiUtente.shop_titolo || "Offerta Esclusiva";
    const prezzo = cacheDatiUtente.shop_prezzo || "Acquista Ora";
    const link = cacheDatiUtente.shop_link || "#";

    overlay.innerHTML = `
        <i class="fas fa-bolt" style="color: #e5c158; font-size: 3rem; margin-bottom: 20px; filter: drop-shadow(0 0 15px rgba(229, 193, 88, 0.5));"></i>
        <div style="color: #e5c158; font-size: 0.75rem; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px;">VENDITA FLASH IN CORSO</div>
        <h1 style="color: #fff; font-size: 1.8rem; font-weight: 800; margin-bottom: 15px; line-height: 1.2;">${titolo}</h1>
        <div style="background: rgba(229, 193, 88, 0.1); border: 1px solid rgba(229, 193, 88, 0.4); color: #e5c158; font-size: 1.4rem; font-weight: 800; padding: 12px 24px; border-radius: 12px; margin-bottom: 30px;">
            ${prezzo}
        </div>
        <div style="color: rgba(255,255,255,0.5); font-size: 0.75rem; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">L'offerta scade tra:</div>
        
        <div id="fomo-timer" style="display: flex; gap: 15px; margin-bottom: 40px; justify-content: center;">
            <!-- Il timer verrà iniettato qui -->
        </div>
        
        <a href="${link}" target="_blank" rel="noopener noreferrer" onclick="tracciaClickSezione('ACQUISTO FOMO')" style="background: #e5c158; color: #000; width: 100%; max-width: 320px; padding: 18px; border-radius: 14px; text-decoration: none; font-weight: 800; font-size: 1.1rem; letter-spacing: 1px; text-transform: uppercase; box-shadow: 0 10px 30px rgba(229, 193, 88, 0.3); transition: transform 0.2s;">
            ACQUISTA ORA
        </a>
        <div style="margin-top: 30px; color: rgba(255,255,255,0.3); font-size: 0.65rem; text-decoration: underline; cursor: pointer; letter-spacing: 0.5px;" onclick="chiudiGateShop()">
            Voglio solo salvare il contatto
        </div>
    `;

    document.body.appendChild(overlay);

    // Blocca lo scorrimento della pagina sotto
    document.body.style.overflow = 'hidden';

    // Innesca il Timer che si aggiorna ogni secondo
    const interval = setInterval(() => {
        const ora = new Date().getTime();
        const distanza = scadenzaTime - ora;

        // Se scade mentre l'utente sta guardando
        if (distanza < 0) {
            clearInterval(interval);
            chiudiGateShop();
            return;
        }

        const ore = Math.floor((distanza % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minuti = Math.floor((distanza % (1000 * 60 * 60)) / (1000 * 60));
        const secondi = Math.floor((distanza % (1000 * 60)) / 1000);

        const timerContainer = document.getElementById('fomo-timer');
        if(timerContainer) {
            timerContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <div style="color: #fff; font-size: 2.5rem; font-weight: 800; font-variant-numeric: tabular-nums;">${ore.toString().padStart(2, '0')}</div>
                    <div style="color: rgba(255,255,255,0.4); font-size: 0.6rem; letter-spacing: 1px;">ORE</div>
                </div>
                <div style="color: rgba(255,255,255,0.2); font-size: 2.2rem; font-weight: 800;">:</div>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <div style="color: #fff; font-size: 2.5rem; font-weight: 800; font-variant-numeric: tabular-nums;">${minuti.toString().padStart(2, '0')}</div>
                    <div style="color: rgba(255,255,255,0.4); font-size: 0.6rem; letter-spacing: 1px;">MIN</div>
                </div>
                <div style="color: rgba(255,255,255,0.2); font-size: 2.2rem; font-weight: 800;">:</div>
                <div style="display: flex; flex-direction: column; align-items: center;">
                    <div style="color: #e5c158; font-size: 2.5rem; font-weight: 800; font-variant-numeric: tabular-nums;">${secondi.toString().padStart(2, '0')}</div>
                    <div style="color: rgba(229, 193, 88, 0.4); font-size: 0.6rem; letter-spacing: 1px;">SEC</div>
                </div>
            `;
        }
    }, 1000);
}

// Funzione per distruggere il muro se l'utente clicca su "Voglio solo il contatto"
window.chiudiGateShop = function() {
    const overlay = document.getElementById('shop-overlay-fomo');
    if (overlay) {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.4s ease';
        setTimeout(() => {
            overlay.remove();
            document.body.style.overflow = 'auto'; // Ripristina lo scorrimento
        }, 400);
    }
} 
   // ============================================================
// 📊 RADAR ANALYTICS SILENZIOSO (TRACKING DEI CLICK)
// ============================================================
function tracciaClickSezione(nomeSezione) {
    // Evitiamo di tracciare il proprietario per non falsare le statistiche
    const utenteLoggato = localStorage.getItem('loggedUser');
    if (utenteLoggato && utenteLoggato.toLowerCase() === usernameCorrente.toLowerCase()) return;
    if (usernameCorrente === "tuonome.it") return;

    try {
        const now = new Date();
        const dataFormattata = now.toLocaleDateString('it-IT'); 
        const oraFormattata = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
        const timestamp = now.getTime();

        const nuovoClick = {
            sezione: nomeSezione,
            data: dataFormattata,
            ora: oraFormattata,
            timestamp: timestamp
        };

        // Recuperiamo il log esistente 
        let logAttuale = [];
        try {
            if (cacheDatiUtente.analytics_log) {
                logAttuale = JSON.parse(cacheDatiUtente.analytics_log);
            }
        } catch (e) {
            logAttuale = [];
        }

        // Aggiungiamo il click in cima alla lista (massimo 1000 per non appesantire)
        logAttuale.unshift(nuovoClick);
        if (logAttuale.length > 1000) logAttuale = logAttuale.slice(0, 1000);

        cacheDatiUtente.analytics_log = JSON.stringify(logAttuale);

        // Sparo silenzioso ad Airtable (senza await, così l'utente non aspetta)
        fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username_system: usernameCorrente,
                analytics_log: cacheDatiUtente.analytics_log
            })
        }).catch(() => {}); // Fallisce in silenzio se manca la rete

    } catch (e) {}
} 
