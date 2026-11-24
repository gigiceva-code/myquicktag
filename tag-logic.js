
// ============================================================
// VIP VAULT, PIANO EFFETTIVO E VARIABILI GLOBALI
// ============================================================
let vaultRiservato = null; // posizione del canale riservato: link e PIN restano sul server
let cacheDatiUtente = {};
let usernameCorrente = "";
let macroAreaCorrente = ""; // Variabile di stato essenziale
let sezioneCorrente = ""; // Sezione aperta dentro la stanza (per "Condividi" e i link ?sezione=)

// PIANO EFFETTIVO (modello C, 17/11/2026): lo decide il server (lib/abbonamento.js → pianoEffettivo) e ai visitatori
// arrivano già solo le sezioni del piano. Il proprietario riceve tutti i suoi contenuti: per fargli vedere la tag come
// la vedono gli altri, qui si applica la STESSA regola (test/api.test.mjs controlla che gli elenchi coincidano).
const PIANI_TAG = ['BASE', 'PREMIUM', 'GOLD'];
const CAMPI_GOLD_TAG = ['review_url', 'review_contact', 'lead_capture_attivo', 'lead_capture_titolo',
    'live_status_color', 'live_status_text', 'live_status_micro', 'live_status_action_type', 'live_status_action_label', 'live_status_action_url',
    'flash_text', 'flash_micro', 'flash_expiry', 'shop_attivo', 'shop_titolo', 'shop_prezzo', 'shop_link', 'shop_scadenza',
    'quickpass_premio_a', 'quickpass_premio_b', 'quickpass_limite', 'quickpass_scadenza', 'quickpass_amici_per_premio', 'quickpass_modo', 'quickpass_contatto',
    'video_url', 'video_cta_text', 'video_cta_url', 'pdf_label', 'pdf_url'];
const CAMPI_PREMIUM_TAG = ['gallery_data', 'quick_action_tipo', 'quick_action_label', 'quick_action_url', 'quick_action_copertina'];
const VCF_PREMIUM_TAG = ['telefono2', 'email2', 'indirizzo', 'piva'];
const LINK_BASE_TAG = 5;
function pianoTag() { return (cacheDatiUtente && cacheDatiUtente.piano_effettivo) || 'BASE'; }
function pianoConsente(minimo, piano = pianoTag()) { return PIANI_TAG.indexOf(piano) >= PIANI_TAG.indexOf(minimo); }
function filtraCampiPiano(fields, piano) {
    const out = { ...fields };
    if (!pianoConsente('GOLD', piano)) CAMPI_GOLD_TAG.forEach(c => delete out[c]);
    if (!pianoConsente('PREMIUM', piano)) {
        CAMPI_PREMIUM_TAG.forEach(c => delete out[c]);
        try { const v = typeof out.modulo_vcf === 'string' ? JSON.parse(out.modulo_vcf || '{}') : (out.modulo_vcf || {}); VCF_PREMIUM_TAG.forEach(k => delete v[k]); out.modulo_vcf = JSON.stringify(v); } catch (e) {}
    }
    let canali = [];
    try { canali = JSON.parse(out.config_canali || '[]'); } catch (e) {}
    if (Array.isArray(canali)) {
        let lista = canali.map((c, i) => (c && (c.vip === true || c.vip === 'true')) ? { ...c, url: '', pin: '', vip: true, vault: i } : c);
        if (!pianoConsente('GOLD', piano)) lista = lista.filter(c => !c.vip);
        if (!pianoConsente('PREMIUM', piano)) lista = lista.slice(0, LINK_BASE_TAG);
        out.config_canali = JSON.stringify(lista);
    }
    return out;
}

// VIP VAULT (17/11/2026): il browser non conosce né il link né il PIN. Il PIN si invia al server
// (api/get-profile.js, azione "vault"), che con il PIN giusto restituisce solo il link di quel canale.
function apriVipVault(indice, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    vaultRiservato = indice;
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
    vaultRiservato = null;
}

function erroreVip(testo) {
    const input = document.getElementById('vip-pin-input');
    if (!input) return;
    input.style.borderColor = "#ff4444";
    input.value = "";
    input.placeholder = testo;
    setTimeout(() => {
        input.style.borderColor = "rgba(229, 193, 88, 0.3)";
        input.placeholder = "****";
    }, 1800);
}

async function verificaPinVip() {
    const input = document.getElementById('vip-pin-input');
    if (!input || vaultRiservato === null || !input.value) return;
    // La finestra si apre subito (gesto dell'utente), così il browser non la blocca; il link arriva dopo la verifica
    const finestra = window.open('', '_blank');
    let r = {};
    try {
        const risposta = await fetch('/api/get-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ azione: 'vault', u: usernameCorrente, vault: vaultRiservato, pin: input.value }) });
        r = await risposta.json();
        r.status = risposta.status;
    } catch (e) { r = {}; }
    if (r.success && r.url) {
        chiudiVipVault();
        if (finestra) { finestra.opener = null; finestra.location.href = r.url; }
        else window.location.href = r.url;
        return;
    }
    if (finestra) finestra.close();
    erroreVip(r.status === 429 ? 'RIPROVA PIÙ TARDI' : r.status === 403 ? 'ERRATO' : 'NON DISPONIBILE');
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
    const titoloApp = document.getElementById("apple-app-title");
    if (titoloApp && usernameCorrente) titoloApp.content = "@" + usernameCorrente.toUpperCase();
    
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
            chiaviSalvate = JSON.parse(localStorage.getItem('mqt_keys') || '[]');
        } catch(e) {
            chiaviSalvate = [];
        }
        
        const singleLoggedUser = localStorage.getItem('mqt_logged_user');
        
        // Verifica se l'utente è proprietario tramite array multiplo O tramite il vecchio login
        // Proprietario = la tag è nel portachiavi del dispositivo E la sua sessione non è scaduta
        let isOwner = (chiaviSalvate.some(u => u.toLowerCase() === username.toLowerCase()) || 
                        (singleLoggedUser && singleLoggedUser.toLowerCase() === username.toLowerCase())) &&
                        mqtSessione.valida(username);

        if (modeDraft) {
            if (!isOwner) {
                window.location.href = '/dashboard.html';
                return;
            }
        }

        // 2. FETCH DATI CON CACHE BUSTER
const cacheBuster = Date.now();
// Il token serve solo al proprietario, per poter leggere la propria bozza privata (draft_json).
let tokenPerBozza = '';
if (isOwner) {
    try {
        const tokenSalvatiTag = JSON.parse(localStorage.getItem('mqt_session_tokens') || '{}');
        tokenPerBozza = tokenSalvatiTag[username] || '';
    } catch (e) {
        tokenPerBozza = '';
    }
}
const tokenParam = tokenPerBozza ? `&token=${encodeURIComponent(tokenPerBozza)}` : '';
const response = await fetch(`/api/get-profile?u=${username}&_cb=${cacheBuster}${tokenParam}`);
        const data = await response.json();
        // Il proprietario lo conferma il server (sessione dell'account che possiede la tag)
        if (data.fields && data.fields.has_password && !data.fields.sei_proprietario) isOwner = false;
        
        if (!data.success || !data.fields) {
            mostraShowroom(username);
            return;
        }

        let fields = data.fields;
        const stato = (fields.stato || "").toLowerCase().trim();

        // (NOTA: Nessun altro doppione di isOwner più in basso: usiamo quello calcolato sopra)

               if (isOwner && fields.draft_json) {
            try {
                const bozza = JSON.parse(fields.draft_json);
                fields = { ...fields, ...bozza };
            } catch (e) {
                console.error("Errore parsing draft_json:", e);
            }
        } 

        // Testi del proprietario ripuliti prima di mostrarli (session.js → mqtPulisci):
        // nessun codice nascosto può partire sul telefono di chi apre la tag
        fields = mqtPulisci.campi(fields);
        // Il proprietario vede la tag come i visitatori: sezioni del suo piano, VIP Vault chiuso (si apre col PIN)
        if (isOwner) fields = filtraCampiPiano(fields, fields.piano_effettivo || 'BASE');
        cacheDatiUtente = fields;
        usernameCorrente = fields.username_system;
        // Il titolare (confermato dal server) al posto di SALVA vede GESTISCI: porta alla Identity Console.
        // Serve soprattutto dall'app installata, che si apre sulla tag (19/11/2026).
        if (isOwner && data.fields.sei_proprietario) mostraTastoGestisci();
        // Nell'app installata (soprattutto iPhone, che non condivide l'accesso con Safari e non ha la barra degli
        // indirizzi) chi non è entrato vede ACCEDI: dopo l'accesso torna qui e, se è il titolare, trova GESTISCI.
        else if (appInstallata()) mostraTastoAccedi();

      // DURATA DELLA PROVA (90 giorni + 14 di tolleranza): fase calcolata dal server. Modello C: la tag resta sempre online,
      // finita la prova con il piano Base (le sezioni avanzate sono nascoste, non cancellate).
      const faseTag = data.abbonamento ? data.abbonamento.fase : 'attiva';

      if (stato === "attivo") {
            renderizzaTagCompleta(fields);
            if (isOwner && faseTag === 'scaduta' && fields.piano_effettivo === 'BASE') {
                setTimeout(() => mostraToast('Prova terminata: la tag resta online con il piano Base. Le sezioni avanzate sono nascoste, non cancellate'), 800);
            } else if (isOwner && faseTag === 'grazia') {
                setTimeout(() => mostraToast(`Prova in chiusura: tutto sbloccato ancora ${data.abbonamento.giorni_alla_disattivazione} giorni, poi piano Base`), 800);
            }
            
            // ============================================================
            // 📊 MOTORE TRACCIAMENTO VISITE (SILENZIOSO)
            // ============================================================
            // Se NON è il proprietario a guardare e NON siamo in modalità anteprima
                        if (!isOwner) {
                // Spara il ping al server in background senza usare await (Zero lag per l'utente)
                fetch(`/api/track-view?u=${usernameCorrente}`, { method: 'POST' })
                    .catch(e => console.error("Tracking invisibile fallito:", e));
            }

        } else if (stato === "in attesa") {
                       if (isOwner) {
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
    // Nome scritto in modo sicuro e adattato alla larghezza della capsula (session.js)
    mqtBadgeNome.scrivi(el, testoBruto);

    // Rombo sotto o tra le righe (forma "divider"): lo decide mqtBadgeNome misurando il nome
}
function renderizzaTagCompleta(fields) {
    const container = document.getElementById('profile-content');
    if (container) {
        container.setAttribute('data-theme', stileTag(fields.digital_style));
        // Alone dietro la cornice (tablet e computer): lo stesso colore della tag
        try { const alone = document.getElementById('alone-tag'); if (alone) alone.style.setProperty('--alone-tag', getComputedStyle(container).getPropertyValue('--core-glow').trim() || 'rgba(255,255,255,0.08)'); } catch (e) {}
        container.setAttribute('data-layout', fields.digital_layout || 'badge');
        document.body.setAttribute('data-qr-theme', stileTag(fields.digital_style)); 
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

    const urlPubblico = `${window.location.origin}/u/${fields.username_system}`;
    generaQR(urlPubblico);
    renderizzaSitoWeb(fields.sito_web);
    gestisciVisibilitaCaselle(fields);
    renderizzaCopertina(fields);
    
    if (container) {
        container.classList.add('ready');
        container.classList.add('locked');
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    // Invito a installare (subito dopo l'attivazione): il checkout lo chiede con un segno in sessionStorage,
    // NON nell'indirizzo. Su iPhone l'icona sulla schermata Home conserva l'indirizzo da cui è stata creata:
    // con "?welcome=1" l'invito ricompariva a ogni apertura. Mai dentro l'app già installata.
    let benvenuto = false;
    try {
        benvenuto = sessionStorage.getItem('mqt_benvenuto') === usernameCorrente;
        sessionStorage.removeItem('mqt_benvenuto');
    } catch (e) {}
    // Icone create prima della correzione con "?welcome=1" nell'indirizzo: si pulisce e basta
    if (urlParams.get('welcome') === '1') window.history.replaceState({}, '', `${window.location.origin}/u/${usernameCorrente}`);
    if (benvenuto && !appInstallata()) mostraWelcomeOverlay();
    // CONDIVIDI in alto: solo per le tag attive (una tag "in attesa" non si condivide)
    const btnCondividiTop = document.getElementById('btn-condividi-top');
    if (btnCondividiTop) btnCondividiTop.style.display = tagAttiva() ? 'flex' : 'none';
    // Link condiviso di una sezione: la tag si apre direttamente lì
    if (urlParams.get('sezione') && !benvenuto) apriSezioneDaLink(urlParams.get('sezione'));
    if (urlParams.get('mode') === 'draft') {
        if (fields.stato === 'attivo') {
            const ctaPubblica = document.getElementById('cta-pubblica-container');
            // Fuori dalla card, così resta fisso in basso sullo schermo (la card ha animazioni che lo sposterebbero)
            if (ctaPubblica) { document.body.appendChild(ctaPubblica); ctaPubblica.style.display = 'block'; }
        } else {
            mostraOverlayAcquisto();
        }
    }
    mqtQuickPass.avvio(fields); // link dell'amico (?pass=) e della cassa (?cassa=), quickpass-tag.js
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
    // Telefoni e indirizzo stanno dentro modulo_vcf (testo JSON): basta un valore compilato
    let haRubrica = false;
    try { haRubrica = Object.values(JSON.parse(fields.modulo_vcf || '{}')).some(v => String(v || '').trim() !== ''); } catch (e) {}
    const hasNetwork = !!fields.sito_web || haRubrica || !!fields.email || (fields.config_canali && fields.config_canali !== '[]') || (fields.partners_data && fields.partners_data !== '[]');
    const elNetwork = document.getElementById('room-network');
    if (elNetwork) elNetwork.style.display = hasNetwork ? 'flex' : 'none';

    // ==========================================
    // 3. CONTROLLO QUINTA STANZA (ACTION CENTER)
    // ==========================================
    let hasActionCenter = false;

    // Controllo A: Azione Rapida
    const piano = fields.piano_effettivo || 'BASE';
    if (fields.quick_action_tipo && fields.quick_action_url && piano !== 'BASE' && fields.quick_action_copertina !== 'true') {
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

    
    backdrop.classList.add('active');
    sheet.classList.add('active');
} 

// ============================================================
// SEGNALA QUESTA TAG (imitazioni, marchi, contenuti offensivi, truffe) → api/segnala.js
// ============================================================
const MOTIVI_SEGNALAZIONE = [
    ['impersonazione', "Si spaccia per me o per un'altra persona o attività"],
    ['marchio', 'Usa un marchio o un nome che non è suo'],
    ['offensivo', 'Contenuti offensivi o illegali'],
    ['truffa', 'Truffa o spam'],
    ['altro', 'Altro']
];

function apriSegnalazione() {
    const sheet = document.getElementById('feature-bottom-sheet');
    const backdrop = document.getElementById('feature-backdrop');
    const title = document.getElementById('sheet-title');
    const icon = document.getElementById('sheet-icon');
    const body = document.getElementById('sheet-body');
    if (!sheet || !backdrop || !cacheDatiUtente.username_system) return;
    if (navigator.vibrate) navigator.vibrate(15);

    icon.style.background = 'rgba(255, 69, 58, 0.1)';
    icon.innerHTML = '<i class="far fa-flag" style="color: #ff453a;"></i>';
    title.innerText = 'Segnala questa tag';
    title.style.color = '#fff';

    // Costruito con elementi e textContent: nessun testo diventa codice
    body.textContent = '';
    const form = document.createElement('form');
    form.id = 'form-segnalazione';
    form.style.cssText = 'display: flex; flex-direction: column; gap: 10px;';
    const intro = document.createElement('p');
    intro.style.cssText = 'margin: 0; font-size: 0.85rem; color: #86868b;';
    intro.textContent = 'Cosa non va in @' + (cacheDatiUtente.username_display || cacheDatiUtente.username_system).replace(/^@+/, '') + '?';
    form.appendChild(intro);
    MOTIVI_SEGNALAZIONE.forEach(([valore, testo]) => {
        const riga = document.createElement('label');
        riga.style.cssText = 'display: flex; align-items: center; gap: 10px; font-size: 0.9rem; line-height: 1.35; color: #fff; cursor: pointer; flex-shrink: 0;';
        const radio = document.createElement('input');
        radio.type = 'radio'; radio.name = 'motivo'; radio.value = valore;
        radio.style.cssText = 'accent-color: #ff453a; width: 18px; height: 18px; flex-shrink: 0;';
        riga.appendChild(radio);
        riga.appendChild(document.createTextNode(testo));
        form.appendChild(riga);
    });
    const stileCampo = 'flex-shrink: 0; width: 100%; box-sizing: border-box; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 12px; color: #fff; font-size: 0.9rem; padding: 12px; font-family: inherit;';
    const descrizione = document.createElement('textarea');
    descrizione.name = 'descrizione'; descrizione.maxLength = 1000; descrizione.rows = 3;
    descrizione.placeholder = 'Spiega in breve (facoltativo)';
    descrizione.style.cssText = stileCampo + ' resize: none;';
    form.appendChild(descrizione);
    const email = document.createElement('input');
    email.type = 'email'; email.name = 'email'; email.maxLength = 200; email.autocomplete = 'email';
    email.placeholder = 'La tua email (facoltativa)';
    email.style.cssText = stileCampo;
    form.appendChild(email);
    const messaggio = document.createElement('p');
    messaggio.setAttribute('role', 'status');
    messaggio.style.cssText = 'margin: 0; font-size: 0.85rem; min-height: 1em;';
    form.appendChild(messaggio);
    const invia = document.createElement('button');
    invia.type = 'submit'; invia.textContent = 'Invia segnalazione';
    invia.style.cssText = 'flex-shrink: 0; width: 100%; padding: 16px; background: #ff453a; border: none; border-radius: 14px; color: #fff; font-size: 0.85rem; font-weight: 600; letter-spacing: 1px; cursor: pointer;';
    form.appendChild(invia);
    form.addEventListener('submit', inviaSegnalazione);
    form.addEventListener('change', e => { if (e.target.name === 'motivo') messaggio.textContent = ''; });
    body.appendChild(form);

    // Modulo più alto degli altri pannelli: se non sta nello schermo scorre il pannello intero
    // (il pulsante "Invia" non resta mai nascosto). chiudiDettaglio toglie questi stili.
    sheet.style.maxHeight = 'calc(100svh - 40px - var(--mqt-sa-top) - var(--mqt-sa-bottom))';
    sheet.style.overflowY = 'auto';

    backdrop.classList.add('active');
    sheet.classList.add('active');
}

async function inviaSegnalazione(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const messaggio = form.querySelector('[role=status]');
    const invia = form.querySelector('button[type=submit]');
    const scelto = form.querySelector('input[name=motivo]:checked');
    const scrivi = (testo, ok) => { messaggio.textContent = testo; messaggio.style.color = ok ? '#30d158' : '#ff453a'; };
    if (!scelto) return scrivi('Scegli un motivo.', false);
    invia.disabled = true; invia.textContent = 'Invio…';
    try {
        const r = await fetch('/api/segnala', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ u: cacheDatiUtente.username_system, motivo: scelto.value, descrizione: form.descrizione.value, email: form.email.value })
        });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.success) {
            form.textContent = '';
            const grazie = document.createElement('p');
            grazie.style.cssText = 'margin: 0; text-align: center; color: #fff; line-height: 1.6;';
            grazie.textContent = 'Grazie, abbiamo ricevuto la segnalazione. La controlleremo al più presto.';
            form.appendChild(grazie);
            return;
        }
        scrivi(r.status === 429 ? 'Hai già inviato diverse segnalazioni: riprova più tardi.' : (d.error || 'Invio non riuscito. Riprova tra poco.'), false);
    } catch (err) {
        scrivi('Connessione assente: riprova.', false);
    }
    invia.disabled = false; invia.textContent = 'Invia segnalazione';
}

function chiudiDettaglio() {
    const sheet = document.getElementById('feature-bottom-sheet');
    const backdrop = document.getElementById('feature-backdrop');
    if (sheet) { sheet.classList.remove('active'); sheet.style.maxHeight = ''; sheet.style.overflowY = ''; }
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
// Una tag "in attesa" non deve essere condivisibile: QR e condivisione solo dopo il checkout
function tagAttiva() {
    return ((cacheDatiUtente && cacheDatiUtente.stato) || '').toLowerCase().trim() === 'attivo';
}

const QR_SIMULATO_HTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:20px; padding-top: 20px;">
                <div style="width:190px; height:190px; border-radius: 20px; padding:10px; background:#fff; display:flex; justify-content:center; align-items:center;">
                    <i class="fas fa-qrcode" style="font-size: 5rem; color: #000;"></i>
                </div>
                <div style="font-size: 0.8rem; color: #86868b; text-align: center; line-height: 1.5;">Simulazione QR Code in anteprima.<br>La condivisione è disabilitata.</div>
            </div>`;

function generaQR(url) {
    const wrapper = document.querySelector('.qr-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';
    if (!tagAttiva()) {
        wrapper.innerHTML = '<i class="fas fa-qrcode" style="font-size: 3rem; color: #000;"></i>';
        return;
    }
    new QRCode(wrapper, { text: url, width: 84, height: 84, colorDark: "#000000", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
}

// Indirizzo del sito scritto a mano ("www.miosito.it"): senza https:// il telefono lo aprirebbe come
// pagina di myquicktag (404). Si completa; solo indirizzi web http/https.
function indirizzoWeb(url) {
    url = String(url || '').trim();
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return '';
    return 'https://' + url.replace(/^\/+/, '');
}

// Link esterno scritto a mano (bottone rapido, social, recensioni, video, shop): "www.sito.it" o "instagram.com/x"
// diventano https://…; tel:, mailto:, sms: restano; javascript: e simili vengono scartati.
function linkEsterno(url) {
    url = String(url || '').trim();
    if (!url) return '';
    if (/^(https?:|mailto:|tel:|sms:)/i.test(url)) return url;
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return '';
    // Un'email o un numero di telefono scritti in un campo "link" (20/11/2026): si apre la posta o la chiamata
    if (/^[^\s@/]+@[^\s@/]+\.[a-z]{2,}$/i.test(url)) return 'mailto:' + url;
    if (/^\+?[\d\s().-]{6,}$/.test(url) && url.replace(/\D/g, '').length >= 6) return 'tel:' + url.replace(/[^\d+]/g, '');
    if (/^[\w.-]+\.[a-z]{2,}(\/|\?|#|$)/i.test(url.replace(/^\/+/, ''))) return 'https://' + url.replace(/^\/+/, '');
    return url;
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
    window.location.href = '/dashboard.html';
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
    'demo':         { icon: '<i class="fas fa-music"></i>', label: 'Ascolta demo' },
    // Nomi usati dall'editor (edit.html → field-qa-tipo)
    'calling':      { icon: '<i class="fas fa-phone-alt"></i>', label: 'Chiama ora' },
    'appointment':  { icon: '<i class="far fa-calendar-alt"></i>', label: 'Prenota appuntamento' },
    'quote':        { icon: '<i class="fas fa-file-signature"></i>', label: 'Richiedi preventivo' },
    'email':        { icon: '<i class="far fa-envelope"></i>', label: 'Scrivimi una email' },
    'link':         { icon: '<i class="fas fa-external-link-alt"></i>', label: 'Apri il link' }
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

    const piano = pianoTag();
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

// COPERTINA CHE CONVERTE (21/11/2026): riga sotto il nome, azione principale fissata in copertina
// ("Fissa in copertina" nell'editor: prima la tag pubblica la ignorava) e "Salva in rubrica"
function vcfDellaTag(fields) {
    try { const raw = fields.modulo_vcf; return (typeof raw === 'object' && raw) ? raw : JSON.parse(raw || '{}'); } catch (e) { return {}; }
}
function renderizzaCopertina(fields) {
    const box = document.getElementById('copertina-azioni');
    if (!box) return;
    const piano = fields.piano_effettivo || 'BASE';

    const sottotitolo = String(fields.sottotitolo || '').trim();
    const elSotto = document.getElementById('copertina-sottotitolo');
    elSotto.textContent = sottotitolo;
    elSotto.hidden = !sottotitolo;

    const cta = document.getElementById('copertina-cta');
    const haCta = fields.quick_action_copertina === 'true' && !!fields.quick_action_tipo && !!fields.quick_action_url && piano !== 'BASE';
    cta.textContent = '';
    if (haCta) {
        const cfg = quickActionConfig[String(fields.quick_action_tipo).toLowerCase()] || { icon: '<i class="fas fa-bolt"></i>', label: 'Contattami' };
        cta.insertAdjacentHTML('afterbegin', cfg.icon);
        const testo = document.createElement('span');
        testo.textContent = String(fields.quick_action_label || '').trim() || cfg.label;
        cta.appendChild(testo);
    }
    cta.hidden = !haCta;

    const vcf = vcfDellaTag(fields);
    // Come la stanza dei contatti: vale anche l'email del campo Email, non solo quella della scheda (21/11/2026)
    const haRubrica = piano !== 'BASE' && (['telefono1', 'telefono2', 'email1'].some(k => String(vcf[k] || '').trim() !== '') || String(fields.email || '').trim() !== '');
    document.getElementById('copertina-rubrica').hidden = !haRubrica;

    box.hidden = !(sottotitolo || haCta || haRubrica);
    const container = document.getElementById('profile-content');
    if (container) container.classList.toggle('con-copertina', haCta || haRubrica);
}
function salvaRubricaCopertina() {
    if (!tagAttiva()) { mostraToast('Funzionerà quando la tag sarà attiva'); return; }
    tracciaClickSezione('SALVA RUBRICA');
    scaricaVCF(vcfDellaTag(cacheDatiUtente), cacheDatiUtente);
}

function eseguiQuickAction() {
    // Tag non ancora attivata (anteprima prima del checkout): il bottone si vede ma non apre nulla (21/11/2026)
    if (!tagAttiva()) { mostraToast('Funzionerà quando la tag sarà attiva'); return; }
    tracciaClickSezione('QUICK ACTION');
    const tipo = (cacheDatiUtente.quick_action_tipo || '').toLowerCase();
    const url  = cacheDatiUtente.quick_action_url || '';
    if (!url) return;

    // Tipi dell'editor (edit.html → field-qa-tipo) più i vecchi nomi italiani. Prima "calling" e i link
    // senza https:// finivano su una pagina 404 di myquicktag (20/11/2026).
    const telefono = `tel:${url.replace(/[^\d+]/g, '')}`;
    const mappaProtocollo = {
        'whatsapp':  `https://wa.me/${url.replace(/\D/g,'')}`,
        'calling':   telefono,
        'chiamata':  telefono,
        'maps':      /^https?:\/\//i.test(url) ? url : `https://maps.google.com/?q=${encodeURIComponent(url)}`,
        'email':     `mailto:${url.replace(/^mailto:/i, '').trim()}`
    };
    const destinazione = mappaProtocollo[tipo] || linkEsterno(url);
    if (!destinazione) return;
    if (/^(tel|mailto):/i.test(destinazione)) { window.location.href = destinazione; return; }
    window.open(destinazione, '_blank', 'noopener noreferrer');
}
// Numero di telefono leggibile (24/11/2026): la tastiera numerica di Android non ha lo spazio, quindi
// "3385630421" diventa "338 5630421" e "+393385630421" diventa "+39 338 5630421". I fissi italiani
// (prefisso di lunghezza variabile) e i numeri esteri restano come sono, con solo gli spazi in ordine.
function formattaTelefono(valore) {
    const grezzo = String(valore || '').trim();
    if (!grezzo) return '';
    let n = grezzo.replace(/[\s.\-\/()]/g, '');
    if (/^0039/.test(n)) n = '+39' + n.slice(4);
    let prefisso = '';
    if (n.startsWith('+39')) { prefisso = '+39'; n = n.slice(3); }
    else if (n.startsWith('+')) return grezzo.replace(/\s+/g, ' ');
    if (!/^\d+$/.test(n)) return grezzo.replace(/\s+/g, ' ');
    if (!/^3\d{8,9}$/.test(n)) return grezzo.replace(/\s+/g, ' ');
    const corpo = n.slice(0, 3) + ' ' + n.slice(3);
    return (prefisso ? prefisso + ' ' : '') + corpo;
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
    
    // --- NASCONDI SALVA E CONDIVIDI IN ALTO (Dissolvenza per non coprire il titolo) ---
    // Dentro le stanze si condivide dal pulsante in basso, accanto a CHIUDI
    ['btn-salva-pocket', 'btn-condividi-top'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) { btn.style.opacity = '0'; btn.style.pointerEvents = 'none'; }
    });
    const btnCondSez = document.getElementById('btn-condividi-sezione');
    if (btnCondSez) btnCondSez.style.display = tagAttiva() ? 'flex' : 'none';

    // Salva il riferimento per il tasto indietro
    macroAreaCorrente = area;
    sezioneCorrente = '';
    
    document.getElementById('testo-chiudi').innerText = 'CHIUDI';
    document.getElementById('icona-chiudi').className = 'fas fa-times';

    corpo.innerHTML = '';
    let sottomenuHTML = '';

    if (area === 'identity') {
        titolo.textContent = 'IDENTITY';
        sottomenuHTML += `<button class="btn-social cascade-item" onclick="apriSezione('qr')"><i class="fas fa-qrcode" style="font-size:1.2rem; width:25px; color:var(--accent-gold);"></i> <span style="flex:1; text-align:left;">IL MIO QR</span></button>`;
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
            const nomeVasetto = '@' + String(cacheDatiUtente.username_display || cacheDatiUtente.username_system || '').replace(/^@+/, '');
            sottomenuHTML += `
                <div style="margin-top: 25px; background: rgba(229, 193, 88, 0.05); border: 1px solid rgba(229, 193, 88, 0.3); padding: 20px; border-radius: 16px; text-align: left; box-shadow: inset 0 0 20px rgba(229, 193, 88, 0.02);">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: #e5c158; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
                        <i class="fas fa-bullseye"></i> Richiesta Contatto
                    </div>
                    <div style="font-size: 0.8rem; color: #fff; margin-bottom: 16px; line-height: 1.5;">${titoloVasetto}</div>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        <input type="text" id="visitor-lead-nome" placeholder="Il tuo Nome" style="width: 100%; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 14px 16px; border-radius: 10px; font-family: 'Inter', sans-serif; font-size: 0.85rem; outline: none;">
                        <input type="text" id="visitor-lead-contatto" placeholder="Email o Telefono" style="width: 100%; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 14px 16px; border-radius: 10px; font-family: 'Inter', sans-serif; font-size: 0.85rem; outline: none;">
                        <!-- Consenso alle offerte: facoltativo e MAI già spuntato (GDPR); il testo esatto viene salvato con il contatto -->
                        <label style="display: flex; align-items: flex-start; gap: 10px; margin-top: 2px; font-size: 0.75rem; font-weight: 400; letter-spacing: normal; text-transform: none; text-align: left; color: rgba(255,255,255,0.8); line-height: 1.45; cursor: pointer;">
                            <input type="checkbox" id="visitor-lead-consenso" style="margin-top: 2px; width: 16px; height: 16px; accent-color: #e5c158; flex-shrink: 0;">
                            <span id="visitor-lead-consenso-testo" style="font-size: 0.75rem !important; letter-spacing: normal !important;">Accetto di ricevere offerte e novità da ${nomeVasetto}</span>
                        </label>
                        <div style="font-size: 0.65rem; letter-spacing: normal; text-transform: none; color: rgba(255,255,255,0.4); line-height: 1.4;">Facoltativo. I tuoi dati arrivano solo a ${nomeVasetto}, che li usa per ricontattarti. <a href="/privacy.html" target="_blank" rel="noopener" style="color: inherit;">Privacy</a></div>
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
        titolo.textContent = 'PER TE';
        
        // 1. Inserimento Azione Rapida
        const piano = pianoTag();
        // Fissata in copertina: lì c'è già, qui non si ripete
        if (cacheDatiUtente.quick_action_tipo && cacheDatiUtente.quick_action_url && piano !== 'BASE' && cacheDatiUtente.quick_action_copertina !== 'true') {
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
                sottomenuHTML += `<button class="btn-social cascade-item" onclick="apriSezione('quickpass')"><i class="fas fa-gift" style="font-size:1.2rem; width:25px; text-align:center; color:var(--theme-border, #d4af37);"></i> <span style="flex:1; text-align:left;">CONDIVIDI UN REGALO</span></button>`;
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
    sezioneCorrente = tipo;
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
        titolo.textContent = 'IL MIO QR';
        // Tag non ancora attivata (checkout non completato): niente QR reale, come nell'editor
        if (!tagAttiva()) {
            corpo.innerHTML = QR_SIMULATO_HTML;
            return;
        }
        const url = `${window.location.origin}/u/${cacheDatiUtente.username_system}`;
        corpo.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; gap:20px; padding-top: 20px;">
                <div class="qr-wrapper" id="qr-container-interno" style="width:190px !important; height:190px !important; border-radius: 20px !important; padding:10px !important; background:#fff !important;"></div>
                <div style="font-size: 0.8rem; color: #86868b; text-align: center; line-height: 1.5;">Questo è il tuo pass digitale.<br>Inquadralo per salvare il profilo.</div>
                <button type="button" onclick="apriSegnalazione()" style="margin-top: 10px; background: none; border: none; color: #6e6e73; font-size: 0.75rem; letter-spacing: 0.5px; cursor: pointer; padding: 8px;"><i class="far fa-flag" style="margin-right: 6px;"></i>Segnala questa tag</button>
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
        // QuickGift (ex Quick Pass): link da condividere, amici arrivati e premi (quickpass-tag.js)
        mqtQuickPass.sezione(corpo, titolo);
        return;
    }
    if (tipo === 'flash') {
        titolo.textContent = 'ANNUNCIO FLASH';
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
            // Fino a 4 foto due per riga (più grandi), da 5 in su tre per riga
            let grigliaHTML = `<div class="gallery-grid${arrayFoto.length <= 4 ? ' poche' : ''}">`;
            let trackHTML = '';
            
            arrayFoto.forEach((urlOriginale, index) => {
                const urlMiniatura = urlOriginale.replace('/upload/', '/upload/c_fill,g_auto,w_320,h_400,q_auto,f_auto/');
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

        const urlSito = indirizzoWeb(cacheDatiUtente.sito_web);
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
        const piano = pianoTag();
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
        if (tel1) campiBase.push({ icona: 'fas fa-phone', label: formattaTelefono(tel1), azione: `tel:${tel1.replace(/[^\d+]/g, '')}`, copia: formattaTelefono(tel1) });
        if (email) campiBase.push({ icona: 'fas fa-envelope', label: email, azione: `mailto:${email}`, copia: email });

        const campiPremium = [];
        if (tel2) campiPremium.push({ icona: 'fas fa-phone', label: formattaTelefono(tel2), azione: `tel:${tel2.replace(/[^\d+]/g, '')}`, copia: formattaTelefono(tel2) });
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
                    condividiContatto(campo.copia);
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
                    link.onclick = (e) => apriVipVault(canale.vault, e);
                } else {
                    link.href = linkEsterno(canale.url) || '#';
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
                // Canale VIP (protetto da PIN): il suo indirizzo è privato e non si condivide
                if (!isVip) riga.appendChild(btnCondividi);
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
    
    // --- MOSTRA SALVA E CONDIVIDI AL RITORNO IN HOME ---
    if (hash === '' || hash === '#ecosistema') {
        ['btn-salva-pocket', 'btn-condividi-top'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
        });
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
// POCKET DEL VISITATORE (solo su questo telefono, senza account)
// ============================================================
// Stile della tag come lo usa style.css (minuscolo, "TITANIUM" o "OBSIDIAN GOLD" salvati in passato compresi)
function stileTag(valore) {
    const v = String(valore || '').trim().toLowerCase().replace(/\s+/g, '_');
    const stile = ({ black: 'black_dna', obsidian: 'obsidian_gold' })[v] || v;
    return ['black_dna', 'titanium', 'obsidian_gold', 'satin_rose', 'emerald'].includes(stile) ? stile : 'black_dna';
}

function appInstallata() {
    try { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { return false; }
}
function mostraTastoAccedi() {
    const btn = document.getElementById('btn-salva-pocket');
    const testo = document.getElementById('testo-salva-top');
    const dot = document.getElementById('dot-salva');
    if (!btn || !testo) return;
    // Già dentro con un altro account (es. un'altra tag dello stesso titolare): si passa da "motivo=sessione",
    // che porta alla Identity Console con l'avviso e il tasto per entrare con l'account giusto
    btn.onclick = () => {
        const giaDentro = !!(window.mqtSessione && mqtSessione.haAccount());
        window.location.href = '/accesso.html?' + (giaDentro ? 'motivo=sessione&' : '') + 'torna=' + encodeURIComponent(location.pathname + location.search);
    };
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', 'Accedi al tuo account');
    testo.textContent = 'ACCEDI';
    if (dot) { dot.style.animation = 'none'; dot.style.backgroundColor = '#e5c158'; }
    btn.style.display = 'flex';
}

function mostraTastoGestisci() {
    const btn = document.getElementById('btn-salva-pocket');
    const testo = document.getElementById('testo-salva-top');
    const dot = document.getElementById('dot-salva');
    if (!btn || !testo) return;
    btn.onclick = () => { window.location.href = '/dashboard.html'; };
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-label', 'Gestisci la tua tag: apri la Identity Console');
    testo.textContent = 'GESTISCI';
    if (dot) { dot.style.animation = 'none'; dot.style.backgroundColor = '#e5c158'; dot.style.boxShadow = '0 0 8px #e5c158'; }
    btn.style.display = 'flex';
    tagDelTitolare = true;
}

// ============================================================
// MENU ⋯ DELLA TAG (20/11/2026): salva questa tag (→ Pocket), QR, segnala
// ============================================================
let tagDelTitolare = false;
function apriMenuTag() {
    if (navigator.vibrate) navigator.vibrate(10);
    let menu = document.getElementById('menu-tag');
    if (!menu) {
        menu = document.createElement('div');
        menu.id = 'menu-tag';
        menu.setAttribute('role', 'dialog');
        menu.setAttribute('aria-label', 'Opzioni della tag');
        menu.style.cssText = 'position:fixed; inset:0; z-index:12000; background:rgba(0,0,0,0.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); display:flex; align-items:flex-end; justify-content:center;';
        menu.addEventListener('click', e => { if (e.target === menu) chiudiMenuTag(); });
        document.body.appendChild(menu);
    }
    const voce = (id, icona, titolo, sotto) => `<button type="button" id="${id}" style="width:100%; display:flex; align-items:center; gap:14px; padding:16px; margin-bottom:8px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; color:#fff; text-align:left; cursor:pointer; font-family:inherit;">${icona}<span style="flex:1;"><span style="display:block; font-size:0.9rem; font-weight:600;">${titolo}</span><span style="display:block; font-size:0.72rem; color:#8e8e93; margin-top:3px;">${sotto}</span></span></button>`;
    const ico = d => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e5c158" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
    menu.innerHTML = `<div style="width:100%; max-width:440px; background:#111; border:1px solid rgba(255,255,255,0.1); border-bottom:none; border-radius:22px 22px 0 0; padding:18px 16px calc(18px + env(safe-area-inset-bottom));">
        <div style="width:40px; height:4px; background:rgba(255,255,255,0.2); border-radius:2px; margin:0 auto 16px;"></div>
        ${tagDelTitolare ? '' : voce('menu-salva', ico('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'), 'Salva questa tag', 'La ritrovi nel tuo Pocket, insieme alle altre')}
        ${tagAttiva() ? voce('menu-qr', ico('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>'), 'Mostra il QR', 'Fallo inquadrare per aprire questa tag') : ''}
        ${voce('menu-segnala', ico('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>'), 'Segnala questa tag', 'Imitazioni, truffe o contenuti offensivi')}
        <button type="button" id="menu-chiudi" style="width:100%; padding:14px; background:none; border:none; color:#8e8e93; font-size:0.85rem; cursor:pointer; font-family:inherit;">Chiudi</button>
    </div>`;
    const su = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = () => { chiudiMenuTag(); fn(); }; };
    su('menu-salva', salvaNelPocketCorrente);
    su('menu-qr', apriQRRapido);
    su('menu-segnala', apriSegnalazione);
    su('menu-chiudi', () => {});
    menu.style.display = 'flex';
}
function chiudiMenuTag() {
    const menu = document.getElementById('menu-tag');
    if (menu) menu.style.display = 'none';
}

// Il visitatore salva la tag dal menu ⋯ ("Salva questa tag") e la ritrova nel Pocket (/pocket.html) insieme alle altre.
// Senza account l'elenco resta nel browser (mqt_pocket); con un account va anche nell'account e si ritrova
// su ogni dispositivo (session.js → mqtSessione.pocket, 23/11/2026).
async function salvaNelPocketCorrente() {
    const usernameTag = String(cacheDatiUtente.username_system || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!usernameTag) return;
    const nomeVisualizzato = cacheDatiUtente.username_display || cacheDatiUtente.username_system;

    let pocket = [];
    try { pocket = JSON.parse(localStorage.getItem('mqt_pocket') || '[]'); } catch (e) { pocket = []; }
    if (!Array.isArray(pocket)) pocket = [];

    const gia = pocket.some(item => item.username === usernameTag);
    const voce = { username: usernameTag, nome: nomeVisualizzato, url: `${window.location.origin}/u/${usernameTag}`, dataSalvataggio: new Date().toISOString() };
    let nellAccount = false;
    if (window.mqtSessione && mqtSessione.pocket) {
        // Con l'account si aspetta il salvataggio (al massimo 4 secondi): se la rete non risponde resta nel browser
        try { nellAccount = await Promise.race([mqtSessione.pocket.aggiungi(voce), new Promise(r => setTimeout(() => r(false), 4000))]); } catch (e) { nellAccount = false; }
    } else if (!gia) {
        pocket.push(voce);
        try { localStorage.setItem('mqt_pocket', JSON.stringify(pocket)); } catch (e) {
            mostraToast('Non riesco a salvare su questo browser');
            return;
        }
    }
    // Si apre il Pocket, con la spiegazione (per chi ha un account e per chi no) e il ritorno a questa tag
    window.location.href = `/pocket.html?salvata=${encodeURIComponent(usernameTag)}${gia ? '&gia=1' : ''}${nellAccount ? '&account=1' : ''}`;
}
// MOTORE DELL'OVERLAY IMMERSIVO (Puro lusso fluttuante)
// nome (facoltativo): la tag salvata, mostrata in evidenza all'inizio del messaggio
function mostraOverlayPocket(titolo, messaggio, invito, nome) {
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
                <p id="pocket-overlay-invito" style="display: none; color: #c7c7cc; font-size: 0.85rem; font-weight: 300; line-height: 1.7; margin: -25px 0 35px; padding: 0 10px;"></p>
                
                <div style="display: flex; flex-direction: column; gap: 15px; width: 100%;">
                    <button onclick="window.location.href='/pocket.html'" style="width: 100%; padding: 18px; background: transparent; border: 1px solid var(--theme-border, #d4af37); border-radius: 12px; color: #fff; font-size: 0.8rem; font-weight: 400; letter-spacing: 4px; cursor: pointer; transition: transform 0.2s; text-transform: uppercase;">Apri il Pocket</button>
                    
                    <button onclick="chiudiOverlayPocket()" style="width: 100%; padding: 18px; background: transparent; border: none; color: #86868b; font-size: 0.75rem; font-weight: 300; letter-spacing: 3px; cursor: pointer; transition: color 0.2s; text-transform: uppercase;">Chiudi</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
    }
    
    // Inseriamo i testi dinamici
    document.getElementById('pocket-overlay-titolo').innerText = titolo;
    const msgEl = document.getElementById('pocket-overlay-msg');
    msgEl.textContent = '';
    if (nome) {
        const nomeEl = document.createElement('strong');
        nomeEl.style.cssText = 'color: #fff; font-weight: 500; word-break: break-word;';
        nomeEl.textContent = nome;
        msgEl.appendChild(nomeEl);
    }
    msgEl.appendChild(document.createTextNode(messaggio));
    const invitoEl = document.getElementById('pocket-overlay-invito');
    invitoEl.textContent = invito || '';
    invitoEl.style.display = invito ? 'block' : 'none';
    
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
    // Indirizzo /u/<nome>: è quello che WhatsApp & co. trasformano nell'anteprima con nome, bio e foto (vercel.json)
    const url = `${window.location.origin}/u/${usernameCorrente}`;
    const nome = String(cacheDatiUtente.username_display || usernameCorrente).replace(/^@+/, '');
    // Il messaggio dice subito cosa c'è dietro il link: chi lo riceve sa perché aprirlo
    _condividi(`@${nome} · myquicktag`, url, `@${nome}: contatti, social e servizi in un solo clic.`, 'CONDIVISIONE TAG');
}

// Condivide la stanza (es. NETWORK) o la sezione aperta (es. NETWORK → Rubrica & contatti):
// il link /u/<nome>?sezione=network.contatti riapre la tag direttamente lì (apriSezioneDaLink)
function condividiSezione() {
    if (!tagAttiva()) { mostraToast('Attiva la tua tag per condividerla'); return; }
    if (!macroAreaCorrente) { condividiProfilo(); return; }
    const chiave = sezioneCorrente ? `${macroAreaCorrente}.${sezioneCorrente}` : macroAreaCorrente;
    const url = `${window.location.origin}/u/${usernameCorrente}?sezione=${encodeURIComponent(chiave)}`;
    const nome = String(cacheDatiUtente.username_display || usernameCorrente).replace(/^@+/, '');
    const titolo = document.getElementById('titoloSezione').textContent;
    const sezione = titolo.charAt(0).toUpperCase() + titolo.slice(1).toLowerCase();
    _condividi(`@${nome} · ${sezione}`, url, `@${nome} · ${sezione}`, 'CONDIVISIONE ' + titolo.toUpperCase());
}

// Apertura da un link condiviso (?sezione=stanza oppure stanza.sezione): solo stanze e sezioni
// che questa tag mostra davvero, altrimenti resta la copertina
const STANZE_LINK = ['identity', 'business', 'media', 'network', 'action_center'];
function apriSezioneDaLink(valore) {
    const [stanza, sezione] = String(valore || '').toLowerCase().split('.');
    if (!STANZE_LINK.includes(stanza) || !tagAttiva()) return;
    const pulsante = document.getElementById(stanza === 'action_center' ? 'room-action-center' : `room-${stanza}`);
    if (!pulsante || pulsante.style.display === 'none') return;
    sbloccaTag();
    setTimeout(() => {
        apriMacroArea(stanza);
        const corpo = document.getElementById('corpoSezione');
        if (sezione && /^[a-z_]+$/.test(sezione) && corpo && corpo.innerHTML.includes(`apriSezione('${sezione}')`)) {
            setTimeout(() => apriSezione(sezione), 300);
        }
    }, 400);
}

// Un singolo recapito (numero, email, indirizzo, P.IVA) non è un indirizzo web: si condivide come testo,
// insieme al link che riapre i contatti della tag (prima il numero finiva come link e dava "404")
function condividiContatto(valore) {
    const nome = String(cacheDatiUtente.username_display || usernameCorrente).replace(/^@+/, '');
    const chiave = macroAreaCorrente ? `${macroAreaCorrente}.contatti` : '';
    const url = `${window.location.origin}/u/${usernameCorrente}${chiave ? `?sezione=${encodeURIComponent(chiave)}` : ''}`;
    if (!tagAttiva()) { mostraToast('Attiva la tua tag per condividerla'); return; }
    if (navigator.share) {
        tracciaClickSezione('CONDIVISIONE CONTATTO');
        navigator.share({ title: `@${nome}`, text: `@${nome}: ${valore}`, url: url }).catch(err => {
            if (err.name !== 'AbortError') console.error("Errore condivisione:", err);
        });
    } else {
        navigator.clipboard.writeText(valore)
            .then(() => mostraToast('Copiato!'))
            .catch(() => mostraToast('Errore nella copia'));
    }
}

// testo: il messaggio che accompagna il link (WhatsApp, Messaggi…). statistica: se indicata, la condivisione
// di un visitatore si conta nelle statistiche del proprietario (il passaparola), come l'apertura di una sezione
function _condividi(titolo, url, testo, statistica) {
    // Indirizzi scritti a mano senza https:// ("instagram.com/pizzeria"): il telefono li tratterebbe come
    // pagine di myquicktag (404). Se non sembrano un sito, si condividono come semplice testo.
    if (url && !/^https?:\/\//i.test(url)) {
        if (/^[a-z0-9.-]+\.[a-z]{2,}(\/|$)/i.test(url)) url = 'https://' + url;
        else { testo = testo || url; url = ''; }
    }
    if (statistica) tracciaClickSezione(statistica);
    if (navigator.share) {
        const dati = { title: titolo };
        if (testo) dati.text = testo;
        if (url) dati.url = url;
        navigator.share(dati).catch(err => {
            if (err.name !== 'AbortError') console.error("Errore condivisione:", err);
        });
    } else {
        navigator.clipboard.writeText(url || testo || '')
            .then(() => mostraToast(url ? '🔗 Link copiato!' : 'Copiato!'))
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
                    let tokenSalvatiPubblica = {};
        try {
            tokenSalvatiPubblica = JSON.parse(localStorage.getItem('mqt_session_tokens') || '{}');
        } catch(e) {
            tokenSalvatiPubblica = {};
        }
        const response = await fetch('/api/update-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username_system: usernameCorrente,
                ...bozza,
                draft_json: "",
                sessionToken: tokenSalvatiPubblica[usernameCorrente]
            })
        }); 
        if (response.status === 401) { mqtSessione.scaduta(usernameCorrente); return; }
        const data = await response.json();
        if (data.sessionToken) mqtSessione.salva(usernameCorrente, data.sessionToken);
        
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

// La tag è aperta come app dalla schermata Home (iPhone: navigator.standalone; Android: display-mode)
function appInstallata() {
    return window.navigator.standalone === true ||
        ['standalone', 'fullscreen', 'minimal-ui'].some(m => window.matchMedia(`(display-mode: ${m})`).matches);
}

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
    if (corpo) corpo.innerHTML = 'Fai clic su <strong>Condividi</strong> in basso nel browser,<br>poi <strong>"Aggiungi a schermata Home"</strong>.';
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
    // Indirizzo pulito /u/<nome> (lo stesso del manifest): è quello che l'iPhone salva con "Aggiungi a Home"
    window.history.replaceState({}, '', `${window.location.origin}/u/${usernameCorrente}`);

    const overlay = document.getElementById('tag-welcome-overlay');
    if (!overlay) return;

    const nome = cacheDatiUtente.username_display || usernameCorrente;
    const titoloEl = overlay.querySelector('.titolo-sezione');
    if (titoloEl) titoloEl.textContent = '@' + nome.replace('@', '') + ' è attiva'; 

    overlay.style.display = 'flex';
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
    // Regole di Google sulle recensioni: non si possono chiedere solo ai clienti soddisfatti ("review gating").
    // A chi dà 1-3 stelle si propone PRIMA il contatto diretto per rimediare, ma il link pubblico resta sempre.
    const linkPubblicoScudo = linkEsterno(cacheDatiUtente.review_url);
    if(valore <= 3) {
        // RECENSIONE NEGATIVA -> prima il contatto diretto, poi (più discreto) la recensione pubblica
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
            ${linkPubblicoScudo ? `<a href="${linkPubblicoScudo}" target="_blank" rel="noopener noreferrer" style="display: block; margin-top: 14px; text-align: center; color: rgba(255,255,255,0.45); font-size: 0.75rem; text-decoration: underline;">Preferisci lasciare una recensione pubblica?</a>` : ''}
        `;
    } else {
        // RECENSIONE POSITIVA (4 o 5) -> Via libera a Google
        const linkPubblico = linkEsterno(cacheDatiUtente.review_url) || '#';
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
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`;
    } 
    // Converte i link YouTube corti
    else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0];
        return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&playsinline=1`;
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
        ctaBtn.href = linkEsterno(cacheDatiUtente.video_cta_url) || '#';
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

    // Si invia SOLO il nuovo contatto: il server lo aggiunge all'elenco del proprietario
    // (api/add-lead.js). L'elenco dei contatti già raccolti non arriva mai ai visitatori.
    try {
        const response = await fetch('/api/add-lead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                u: cacheDatiUtente.username_system || getNomeBrandReale(),
                nome: nome,
                contatto: contatto,
                // Consenso alle offerte: si invia anche il testo esatto mostrato, che il server conserva come prova
                consenso: !!(document.getElementById('visitor-lead-consenso') || {}).checked,
                consenso_testo: (document.getElementById('visitor-lead-consenso-testo') || {}).textContent || ''
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            btn.innerText = "CONTATTO INVIATO ✅";
            btn.style.background = "#10b981";
            btn.style.color = "#fff";
            nomeInput.value = '';
            contattoInput.value = '';
            const casella = document.getElementById('visitor-lead-consenso');
            if (casella) casella.checked = false;
            setTimeout(() => {
                btn.innerText = testoOriginale;
                btn.style.background = "#e5c158";
                btn.style.color = "#000";
                btn.style.pointerEvents = "auto";
                btn.style.opacity = "1";
            }, 3000);
        } else {
            throw new Error(data.error || "Risposta server non ok");
        }
    } catch(err) {
        console.error("Errore salvataggio lead:", err);
        alert(err.message && err.message !== "Risposta server non ok" && err.message !== "Failed to fetch"
            ? err.message
            : 'Si è verificato un errore di connessione. Riprova tra poco.');
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
    const link = linkEsterno(cacheDatiUtente.shop_link) || "#";

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
    const utenteLoggato = localStorage.getItem('mqt_logged_user');
    if (utenteLoggato && utenteLoggato.toLowerCase() === usernameCorrente.toLowerCase()) return;
    if (usernameCorrente === "tuonome.it") return;

    try {
        // Si invia solo la sezione aperta: il server aggiunge la voce al registro
        // (api/track-click.js), senza leggere né riscrivere i click degli altri visitatori.
        fetch('/api/track-click', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ u: usernameCorrente, sezione: nomeSezione })
        }).catch(() => {}); // Fallisce in silenzio se manca la rete

    } catch (e) {}
} 

// COPERTINA CLICCABILE (20/11/2026): chi tocca la foto o il nome entra nella tag, come con "ESPLORA TAG"
(function () {
    function collega() {
        ['live-avatar-container', 'name-capsule-wrapper'].forEach(id => {
            const el = document.getElementById(id);
            if (!el || el.dataset.esplora) return;
            el.dataset.esplora = '1';
            el.style.cursor = 'pointer';
            el.addEventListener('click', () => {
                const c = document.getElementById('profile-content');
                if (c && c.classList.contains('locked')) sbloccaTag();
            });
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', collega); else collega();
})();
