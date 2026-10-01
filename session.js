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
