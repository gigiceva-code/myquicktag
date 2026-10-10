// ============================================================
// ACCOUNT E SESSIONI (Supabase Auth) + PORTACHIAVI DELLE TAG
// ============================================================
// L'accesso dei titolari è un ACCOUNT (email verificata + password) gestito da Supabase Auth:
// registrazione, verifica, recupero e cambio password li fa la libreria ufficiale di Supabase
// (caricata solo quando serve) e la password non passa mai dal nostro server.
// - Ogni chiamata a /api/ parte con la sessione dell'account (intestazione Authorization): il
//   server verifica con Supabase chi sei e se la tag è tua (lib/sessione.js).
// - mqt_session_tokens conserva solo le RICEVUTE di prenotazione (tag in attesa, 24 ore).
// - mqt_keys / mqt_logged_user ricordano su questo dispositivo quali tag apri (comodità, non
//   sono una prova di identità).
(function () {
    // Progetto Supabase: produzione solo sul dominio pubblico, il progetto di prova altrove
    // (anteprime Vercel e prove in locale). Le chiavi "publishable" sono pubbliche per natura.
    const PRODUZIONE = location.hostname === 'myquicktag.it' || location.hostname === 'www.myquicktag.it';
    const CONFIG = PRODUZIONE
        ? { url: 'https://atlhrkkfovblkhgzfeuo.supabase.co', chiave: 'sb_publishable_HrX_oradnt5sRX6YHqGB-w_gYZe0u4U' }
        : { url: 'https://lmxxoxrsrwmtunyqlpbh.supabase.co', chiave: 'sb_publishable_mCn8LbCxhDoNZMJS-E043Q_hKEte5F0' };
    const LIBRERIA = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/dist/umd/supabase.js';
    const INTEGRITA = 'sha384-BWcjm9OdFth9TbhCxZPdm+gAOUMAzQy9nmTs12ioXdCcbVnJaPMn+fMUoQCLt60R';
    const CHIAVE_SESSIONE = 'sb-' + new URL(CONFIG.url).hostname.split('.')[0] + '-auth-token';

    function leggiTokens() {
        try { return JSON.parse(localStorage.getItem('mqt_session_tokens') || '{}') || {}; }
        catch (e) { return {}; }
    }
    function normalizza(tag) {
        return String(tag || '').replace('@', '').trim().toLowerCase();
    }
    // C'è una sessione dell'account salvata su questo dispositivo? (la validità la decide Supabase)
    function haSessioneSalvata() {
        try {
            const s = JSON.parse(localStorage.getItem(CHIAVE_SESSIONE) || 'null');
            return !!(s && (s.refresh_token || (s.currentSession && s.currentSession.refresh_token)));
        } catch (e) { return false; }
    }

    let promessaClient = null;
    function client() {
        if (promessaClient) return promessaClient;
        promessaClient = new Promise(function (risolvi, rifiuta) {
            function crea() {
                try {
                    risolvi(window.supabase.createClient(CONFIG.url, CONFIG.chiave, {
                        auth: { flowType: 'implicit', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: CHIAVE_SESSIONE }
                    }));
                } catch (e) { rifiuta(e); }
            }
            if (window.supabase && window.supabase.createClient) return crea();
            const s = document.createElement('script');
            s.src = LIBRERIA; s.integrity = INTEGRITA; s.crossOrigin = 'anonymous';
            s.onload = crea;
            s.onerror = function () { promessaClient = null; rifiuta(new Error('Libreria di accesso non disponibile')); };
            document.head.appendChild(s);
        });
        return promessaClient;
    }

    // Token di accesso aggiornato (la libreria lo rinnova da sola se è scaduto), oppure null
    async function tokenAccount() {
        if (!haSessioneSalvata()) return null;
        try {
            const sb = await client();
            const { data } = await sb.auth.getSession();
            return data && data.session ? data.session.access_token : null;
        } catch (e) { return null; }
    }

    // Ogni chiamata alle nostre API parte con la sessione dell'account, se c'è
    const fetchOriginale = window.fetch.bind(window);
    window.fetch = async function (risorsa, opzioni) {
        try {
            const url = typeof risorsa === 'string' ? risorsa : (risorsa && risorsa.url) || '';
            const nostra = url.startsWith('/api/') || url.startsWith(location.origin + '/api/');
            if (nostra) {
                const token = await tokenAccount();
                if (token) {
                    opzioni = Object.assign({}, opzioni || {});
                    const h = new Headers(opzioni.headers || (typeof risorsa !== 'string' && risorsa.headers) || {});
                    if (!h.has('Authorization')) h.set('Authorization', 'Bearer ' + token);
                    opzioni.headers = h;
                }
            }
        } catch (e) { /* in caso di problemi la chiamata parte comunque, senza sessione */ }
        return fetchOriginale(risorsa, opzioni);
    };

    function aggiungiChiave(tag) {
        tag = normalizza(tag);
        if (!tag) return;
        let chiavi = [];
        try { chiavi = JSON.parse(localStorage.getItem('mqt_keys') || '[]'); } catch (e) {}
        if (!chiavi.includes(tag)) chiavi.push(tag);
        try { localStorage.setItem('mqt_keys', JSON.stringify(chiavi)); } catch (e) {}
    }

    window.mqtSessione = {
        config: CONFIG,
        client: client,
        tokenAccount: tokenAccount,
        haAccount: haSessioneSalvata,

        // Ricevuta di prenotazione della tag (le vecchie sessioni "@nome + password" non valgono più)
        token: function (tag) {
            return leggiTokens()[normalizza(tag)] || '';
        },

        salva: function (tag, token) {
            tag = normalizza(tag);
            if (!tag || !token) return;
            const tokens = leggiTokens();
            tokens[tag] = token;
            try { localStorage.setItem('mqt_session_tokens', JSON.stringify(tokens)); } catch (e) {}
        },

        // Puoi provare a lavorare su questa tag da qui? Account collegato su questo dispositivo, oppure
        // ricevuta di prenotazione non scaduta. L'ultima parola è del server (proprietario o no).
        valida: function (tag) {
            if (haSessioneSalvata()) return true;
            const parti = this.token(tag).split('.');
            return parti.length === 3 && Number(parti[1]) > Date.now();
        },

        // Ricorda su questo dispositivo le tag dell'account (dashboard, login)
        ricordaTags: function (tags) {
            (tags || []).forEach(aggiungiChiave);
        },
        ricorda: aggiungiChiave,

        // Toglie la tag dal portachiavi del dispositivo. Bozze locali e Pocket restano.
        rimuovi: function (tag) {
            tag = normalizza(tag);
            try {
                let chiavi = [];
                try { chiavi = JSON.parse(localStorage.getItem('mqt_keys') || '[]'); } catch (e) {}
                localStorage.setItem('mqt_keys', JSON.stringify(chiavi.filter(k => normalizza(k) !== tag)));
                const tokens = leggiTokens();
                delete tokens[tag];
                localStorage.setItem('mqt_session_tokens', JSON.stringify(tokens));
                if (normalizza(localStorage.getItem('mqt_logged_user')) === tag) localStorage.removeItem('mqt_logged_user');
            } catch (e) {}
        },

        // Esci dall'account su questo dispositivo (ovunque = tutti i dispositivi)
        esci: async function (ovunque) {
            try { const sb = await client(); await sb.auth.signOut({ scope: ovunque ? 'global' : 'local' }); } catch (e) {}
            try {
                localStorage.removeItem(CHIAVE_SESSIONE);
                localStorage.removeItem('mqt_keys');
                localStorage.removeItem('mqt_logged_user');
            } catch (e) {}
        },

        // Pagine del proprietario: il server dice se la tag è dell'account (fields.sei_proprietario).
        // false → si va alle proprie tag (o all'accesso, se su questo dispositivo non c'è un account).
        proprietarioOppureEsci: function (fields, tag) {
            if (!fields || !fields.has_password || fields.sei_proprietario) return true;
            if (haSessioneSalvata()) window.location.href = '/dashboard.html?avviso=non-tua';
            else this.scaduta(tag);
            return false;
        },

        // Sessione scaduta o mancante: avvisa e porta all'accesso, poi si torna qui
        scaduta: function (tag) {
            alert('Accedi al tuo account\n\nPer sicurezza entra di nuovo con la tua email e la tua password. Le modifiche non pubblicate restano salvate su questo dispositivo.');
            window.location.href = '/accesso.html?motivo=sessione&torna=' + encodeURIComponent(location.pathname + location.search);
        }
    };

    // Se c'è una sessione salvata, la libreria si prepara subito (rinnovo del token in anticipo)
    if (haSessioneSalvata()) client().catch(function () {});
})();

// ============================================================
// PULIZIA DEI TESTI DEGLI UTENTI PRIMA DI MOSTRARLI (stessa logica di lib/pulizia.js)
// ============================================================
// Protegge anche i dati salvati prima della pulizia lato server e le bozze locali:
// niente caratteri per scrivere codice HTML, niente link "javascript:" e simili.
(function () {
    const SOSTITUZIONI = { '<': '‹', '>': '›', '"': '”', '`': "'" };
    const ENTITA = { colon: ':', tab: '\t', newline: '\n', sol: '/', lpar: '(', rpar: ')', period: '.', comma: ',', excl: '!', num: '#', amp: '&', semi: ';' };

    function decodificaEntita(s) {
        return s
            .replace(/&#x([0-9a-f]+);?/gi, (m, h) => String.fromCodePoint(parseInt(h, 16) || 32))
            .replace(/&#(\d+);?/g, (m, d) => String.fromCodePoint(Number(d) || 32))
            .replace(/&([a-z]+);/gi, (m, n) => (ENTITA[n.toLowerCase()] !== undefined ? ENTITA[n.toLowerCase()] : m));
    }

    function linkPericoloso(s) {
        const normale = decodificaEntita(s).replace(/[\s\u0000-\u001f\u007f-\u009f]+/g, '').toLowerCase();
        return /^(javascript|vbscript|livescript):/.test(normale) || /^data:(text|application|image\/svg)/.test(normale);
    }

    function testo(valore) {
        if (typeof valore !== 'string') return valore;
        if (linkPericoloso(valore)) return '';
        return valore.replace(/[<>"`]/g, c => SOSTITUZIONI[c]);
    }

    function valore(v) {
        if (typeof v === 'string') return testo(v);
        if (Array.isArray(v)) return v.map(valore);
        if (v && typeof v === 'object') {
            const pulito = {};
            Object.keys(v).forEach(k => { pulito[k] = valore(v[k]); });
            return pulito;
        }
        return v;
    }

    // Campi di una tag: i testi JSON (canali, partner, galleria...) si puliscono dentro
    function campi(fields) {
        const pulito = {};
        Object.keys(fields || {}).forEach(k => {
            const v = fields[k];
            const t = typeof v === 'string' ? v.trim() : '';
            if (t && (t[0] === '[' || t[0] === '{')) {
                try { pulito[k] = JSON.stringify(valore(JSON.parse(t))); return; } catch (e) {}
            }
            pulito[k] = valore(v);
        });
        return pulito;
    }

    window.mqtPulisci = { testo, valore, campi };
})();

// ============================================================
// ANTEPRIMA DELLA FORMA CANONICA DEL @NOME (solo aiuto per l'utente)
// ============================================================
// Stessa trasformazione di lib/nome-canonico.js: "Cristiáno Ronaldo" → "cristianoronaldo".
// La decisione vera la prende sempre il server (api/check-and-create.js).
(function () {
    function canonico(v) {
        const nome = String(v == null ? '' : v)
            .normalize('NFKD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .trim()
            .replace(/^@+/, '')
            .replace(/[\s._-]+/g, '');
        if (!nome) return { errore: 'Scrivi un @nome.' };
        if (/[^a-z0-9]/.test(nome)) return { errore: 'Il @nome può contenere solo lettere e numeri (spazi, punti, trattini e accenti vengono adattati automaticamente).' };
        if (nome.length > 30) return { errore: 'Il @nome può avere al massimo 30 caratteri.' };
        return { nome };
    }
    window.mqtNome = { canonico };
})();
