// ============================================================
// SESSIONI MULTI-TAG (portachiavi del dispositivo)
// ============================================================
// Regola unica: su questo dispositivo sei proprietario di una tag solo se hai il suo
// token di sessione (mqt_session_tokens) e non è scaduto. mqt_keys e mqt_logged_user
// restano per compatibilità, ma da soli non bastano più.
//
// Il token ha la forma "tag.scadenzaMs.firma": la scadenza si legge senza chiamare il
// server. Il server lo rinnova a ogni utilizzo (sessione scorrevole, 90 giorni).
(function () {
    function leggiTokens() {
        try { return JSON.parse(localStorage.getItem('mqt_session_tokens') || '{}') || {}; }
        catch (e) { return {}; }
    }

    function normalizza(tag) {
        return String(tag || '').replace('@', '').trim().toLowerCase();
    }

    window.mqtSessione = {
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

        valida: function (tag) {
            const parti = this.token(tag).split('.');
            if (parti.length !== 3) return false;
            return Number(parti[1]) > Date.now();
        },

        // Toglie la tag dal portachiavi del dispositivo (chiave, token, utente attivo).
        // Bozze locali e Pocket restano: dopo il nuovo login il lavoro non è perso.
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

        // Sessione scaduta: avvisa e porta al login con la tag già compilata
        scaduta: function (tag) {
            tag = normalizza(tag);
            this.rimuovi(tag);
            alert('Sessione scaduta\n\nPer sicurezza accedi di nuovo con la tua password. Le modifiche non pubblicate restano salvate su questo dispositivo.');
            window.location.href = '/index.html?login=' + encodeURIComponent(tag);
        }
    };
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
