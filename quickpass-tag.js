// ============================================================
// QUICK PASS SULLA TAG PUBBLICA (Fase 1, 29/10/2026) — server: api/quickpass.js
// ============================================================
// Tre momenti, tre schermate:
// 1. CHI CONSIGLIA: Action Center → Quick Pass → scrive il nome → riceve il suo link personale
//    (/u/<tag>?pass=<invito>) da mandare su WhatsApp; vede gli amici portati e i premi sbloccati.
// 2. L'AMICO: apre il link → "Marco ti ha regalato…" → ritira il suo pass personale (codice + QR).
// 3. LA CASSA: il QR del pass apre /u/<tag>?cassa=<codice>; il titolare (con la sua sessione) o un
//    dipendente con il PIN di cassa verifica e convalida. /u/<tag>?cassa=1 apre la cassa vuota.
// Sul telefono restano solo codici casuali (localStorage "mqt_qp_<tag>"): nessun dato personale.
(function () {
    // Oro pieno per i pulsanti e i dettagli: il colore del tema (grigio sul Black DNA) non basta a un invito all'azione
    const ORO = '#e5c158';

    function esc(t) {
        return String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function nomeTag() { return (cacheDatiUtente && cacheDatiUtente.username_system) || usernameCorrente; }
    function nomeVisibile() { return '@' + String((cacheDatiUtente && cacheDatiUtente.username_display) || nomeTag()).replace(/^@+/, ''); }
    function dataBreve(iso) {
        try { return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; }
    }

    // Identificativo casuale di questo telefono (serve al server per "un pass per telefono")
    function dispositivo() {
        try {
            let d = localStorage.getItem('mqt_dispositivo');
            if (!d) {
                d = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/gi, '');
                localStorage.setItem('mqt_dispositivo', d);
            }
            return d;
        } catch (e) { return null; }
    }

    // Memoria locale per questa tag: { invito: {codice, nome}, pass: [codici] }
    function memoria() {
        try { return JSON.parse(localStorage.getItem('mqt_qp_' + nomeTag()) || '{}') || {}; } catch (e) { return {}; }
    }
    function salvaMemoria(m) { try { localStorage.setItem('mqt_qp_' + nomeTag(), JSON.stringify(m)); } catch (e) {} }

    async function chiama(azione, dati = {}) {
        const risposta = await fetch('/api/quickpass', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ u: nomeTag(), azione, ...dati })
        });
        let corpo = {};
        try { corpo = await risposta.json(); } catch (e) {}
        return { status: risposta.status, ...corpo };
    }

    // ---------- Overlay a tutto schermo (pagina dell'amico e cassa) ----------
    function overlay(html) {
        let o = document.getElementById('mqt-qp-overlay');
        if (!o) {
            o = document.createElement('div');
            o.id = 'mqt-qp-overlay';
            o.style.cssText = 'position: fixed; inset: 0; z-index: 100000; background: rgba(0,0,0,0.92); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); display: flex; justify-content: center; align-items: center; padding: 20px; overflow-y: auto;';
            document.body.appendChild(o);
        }
        o.innerHTML = `<div style="position: relative; width: 100%; max-width: 360px; background: #111; border: 1px solid ${ORO}; border-radius: 24px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); overflow: hidden; margin: auto;">
            <button type="button" onclick="mqtQuickPass.chiudi()" aria-label="Chiudi" style="position: absolute; top: 14px; right: 14px; z-index: 2; background: rgba(0,0,0,0.5); border: none; color: #fff; width: 32px; height: 32px; border-radius: 50%; font-size: 1.2rem; cursor: pointer;">&times;</button>
            ${html}
        </div>`;
        o.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        return o;
    }
    function chiudi() {
        const o = document.getElementById('mqt-qp-overlay');
        if (o) o.style.display = 'none';
        document.body.style.overflow = '';
    }

    const stileCampo = 'width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 14px 16px; border-radius: 12px; font-family: Inter, sans-serif; font-size: 16px; outline: none;';
    const stileBottone = `width: 100%; padding: 16px; background: ${ORO}; color: #000; border: none; border-radius: 12px; font-weight: 800; font-size: 0.85rem; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer;`;
    const piede = `<a href="https://myquicktag.it" target="_blank" rel="noopener noreferrer" style="display: block; padding: 16px; background: rgba(0,0,0,0.4); border-top: 1px solid rgba(255,255,255,0.06); text-decoration: none; text-align: center;">
            <div style="font-size: 0.7rem; color: rgba(255,255,255,0.5); letter-spacing: 1px;">Powered by <strong style="color: #fff;">myquicktag</strong></div>
            <div style="font-size: 0.65rem; color: ${ORO}; margin-top: 5px; letter-spacing: 1px; font-weight: 600;">CREA LA TUA TAG &rarr;</div></a>`;

    // Il pass come "biglietto": premio, nome, QR per la cassa, codice da dettare, scadenza
    function htmlPass(p, sottotitolo) {
        const usato = p.stato === 'usato', scaduto = p.scaduto;
        const nota = usato ? `Usato il ${dataBreve(p.usato_il)}` : scaduto ? 'Pass scaduto' : `Valido fino al ${dataBreve(p.scadenza)}`;
        return `<div style="padding: 28px 22px 22px; text-align: center;">
            <div style="font-size: 0.65rem; color: rgba(255,255,255,0.5); letter-spacing: 3px; text-transform: uppercase;">${esc(sottotitolo)}</div>
            <div style="font-size: 1.25rem; color: #fff; font-weight: 600; margin: 10px 0 4px; line-height: 1.35;">${esc(p.premio)}</div>
            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">per ${esc(p.nome)} · ${esc(nomeVisibile())}</div>
            <div style="margin: 20px auto 14px; width: 176px; height: 176px; padding: 12px; background: #fff; border-radius: 14px; ${usato || scaduto ? 'opacity: 0.25;' : ''}" class="mqt-qp-qr" data-codice="${esc(p.codice)}"></div>
            <div style="font-family: monospace; font-size: 1.6rem; letter-spacing: 6px; color: #fff; font-weight: 700;">${esc(p.codice)}</div>
            <div style="font-size: 0.75rem; color: ${usato || scaduto ? '#ef4444' : ORO}; margin-top: 8px; letter-spacing: 0.5px;">${nota}</div>
            ${usato || scaduto ? '' : '<div style="font-size: 0.75rem; color: rgba(255,255,255,0.55); margin-top: 12px; line-height: 1.5;">Mostra questo pass in cassa:<br>lo convaliderà il personale.</div>'}
        </div>`;
    }
    function disegnaQr(contenitore) {
        (contenitore || document).querySelectorAll('.mqt-qp-qr').forEach(el => {
            if (el.dataset.fatto || typeof QRCode === 'undefined') return;
            el.dataset.fatto = '1';
            new QRCode(el, { text: `${window.location.origin}/u/${nomeTag()}?cassa=${el.dataset.codice}`, width: 152, height: 152, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
        });
    }

    // ============================================================
    // 2. L'AMICO: pagina del regalo e ritiro del pass
    // ============================================================
    async function paginaAmico(invito) {
        const m = memoria();
        // Pass già ritirato su questo telefono: si mostra direttamente
        if (m.pass && m.pass.length) {
            const s = await chiama('stato', { codici: m.pass });
            const mio = (s.pass || []).find(p => p.tipo === 'amico');
            if (mio) { mostraPass(mio, 'Il tuo pass'); return; }
        }
        const info = await chiama('info', { invito });
        if (!info.success || !info.attiva) {
            overlay(`<div style="padding: 40px 24px; text-align: center;">
                <i class="fas fa-gift" style="font-size: 2.2rem; color: ${ORO}; margin-bottom: 14px;"></i>
                <div style="color: #fff; font-size: 1.05rem; margin-bottom: 8px;">${info.esauriti ? 'I pass sono esauriti' : 'Questo invito non è più attivo'}</div>
                <div style="color: rgba(255,255,255,0.6); font-size: 0.85rem; line-height: 1.5;">Puoi comunque scoprire ${esc(nomeVisibile())}.</div>
                <button type="button" onclick="mqtQuickPass.chiudi()" style="${stileBottone} margin-top: 22px;">Scopri la tag</button>
            </div>${piede}`);
            return;
        }
        const titolo = info.da ? `${esc(info.da)} ti ha regalato` : 'Hai un regalo';
        overlay(`<div style="padding: 30px 22px 22px; text-align: center;">
            <i class="fas fa-gift" style="font-size: 2.4rem; color: ${ORO}; margin-bottom: 14px; filter: drop-shadow(0 0 12px rgba(212,175,55,0.35));"></i>
            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); letter-spacing: 2px; text-transform: uppercase;">${titolo}</div>
            <div style="font-size: 1.35rem; color: #fff; font-weight: 600; margin: 10px 0 6px; line-height: 1.35;">${esc(info.premio)}</div>
            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin-bottom: 22px;">da ${esc(nomeVisibile())}${info.posti_rimasti ? ` · ultimi ${info.posti_rimasti} pass` : ''}</div>
            <div style="display: flex; flex-direction: column; gap: 10px; text-align: left;">
                <input type="text" id="qp-nome" maxlength="40" placeholder="Il tuo nome" autocomplete="given-name" style="${stileCampo}">
                <input type="text" id="qp-contatto" maxlength="120" placeholder="Telefono o email (facoltativo)" autocomplete="tel" style="${stileCampo}">
                <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 0.72rem; color: rgba(255,255,255,0.75); line-height: 1.45; cursor: pointer;">
                    <input type="checkbox" id="qp-consenso" style="margin-top: 2px; width: 16px; height: 16px; accent-color: #e5c158; flex-shrink: 0;">
                    <span id="qp-consenso-testo">Accetto di ricevere offerte e novità da ${esc(nomeVisibile())}</span>
                </label>
                <div id="qp-errore" role="status" style="color: #ef4444; font-size: 0.8rem; min-height: 1em;"></div>
                <button type="button" id="qp-ritira" onclick="mqtQuickPass.ritira('${esc(invito || '')}')" style="${stileBottone}">Ritira il tuo pass</button>
            </div>
            <div style="font-size: 0.65rem; color: rgba(255,255,255,0.4); margin-top: 12px; line-height: 1.4;">Il pass è personale e vale una volta. I tuoi dati arrivano solo a ${esc(nomeVisibile())}. <a href="/privacy.html" target="_blank" rel="noopener" style="color: inherit;">Privacy</a></div>
        </div>${piede}`);
    }

    async function ritira(invito) {
        const nome = (document.getElementById('qp-nome') || {}).value || '';
        const errore = document.getElementById('qp-errore');
        if (!nome.trim()) { if (errore) errore.textContent = 'Scrivi il tuo nome: il pass è personale.'; return; }
        const btn = document.getElementById('qp-ritira');
        if (btn) { btn.disabled = true; btn.textContent = 'Un attimo…'; }
        const r = await chiama('ritira', {
            invito: invito || undefined, nome, dispositivo: dispositivo(),
            contatto: (document.getElementById('qp-contatto') || {}).value || '',
            consenso: !!(document.getElementById('qp-consenso') || {}).checked,
            consenso_testo: (document.getElementById('qp-consenso-testo') || {}).textContent || ''
        });
        if (r.success && r.pass) {
            const m = memoria();
            m.pass = [r.pass.codice, ...((m.pass || []).filter(c => c !== r.pass.codice))].slice(0, 20);
            salvaMemoria(m);
            if (typeof tracciaClickSezione === 'function') tracciaClickSezione('QUICK PASS RITIRATO');
            mostraPass(r.pass, 'Il tuo pass');
            return;
        }
        if (errore) errore.textContent = r.error || 'Non è stato possibile ritirare il pass. Riprova.';
        if (btn) { btn.disabled = false; btn.textContent = 'Ritira il tuo pass'; }
    }

    function mostraPass(p, sottotitolo) {
        const o = overlay(htmlPass(p, sottotitolo) + piede);
        disegnaQr(o);
    }

    // ============================================================
    // 1. CHI CONSIGLIA: la sezione Quick Pass dell'Action Center
    // ============================================================
    async function sezione(corpo, titolo) {
        titolo.textContent = 'QUICK PASS';
        corpo.innerHTML = '<div style="text-align: center; padding: 40px 0; color: rgba(255,255,255,0.5); font-size: 0.85rem;">Caricamento…</div>';
        const m = memoria();
        const s = await chiama('stato', { codici: m.pass || [], invito: m.invito ? m.invito.codice : undefined });
        const premioA = esc(cacheDatiUtente.quickpass_premio_a || '');
        const premioB = esc(cacheDatiUtente.quickpass_premio_b || '');
        const perPremio = parseInt(cacheDatiUtente.quickpass_amici_per_premio, 10) > 1 ? parseInt(cacheDatiUtente.quickpass_amici_per_premio, 10) : 1;
        let html = '<div style="display: flex; flex-direction: column; gap: 18px; width: 100%; padding-top: 6px;">';

        // Pass e premi conservati su questo telefono, ancora da usare
        const daUsare = [...(s.pass || []), ...((s.invito && s.invito.premi) || [])].filter(p => p.stato === 'attivo' && !p.scaduto);
        daUsare.forEach(p => {
            html += `<div style="border: 1px solid ${ORO}; border-radius: 20px; background: rgba(0,0,0,0.5);">${htmlPass(p, p.tipo === 'premio' ? 'Il tuo premio' : 'Il tuo pass')}</div>`;
        });

        if (s.invito) {
            const link = `${window.location.origin}/u/${nomeTag()}?pass=${s.invito.codice}`;
            const usati = s.invito.amici_usati || 0;
            const mancano = perPremio - (usati % perPremio);
            html += `<div style="text-align: center; padding: 22px 18px; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; background: rgba(255,255,255,0.03);">
                <div style="font-size: 0.65rem; color: rgba(255,255,255,0.5); letter-spacing: 3px; text-transform: uppercase;">Il tuo invito personale</div>
                <div style="font-size: 0.95rem; color: #fff; margin: 12px 0 18px; line-height: 1.5;">Regala <strong>${premioB}</strong>.<br>Per ${perPremio > 1 ? `ogni ${perPremio} amici che lo usano` : 'ogni amico che lo usa'} in cassa ricevi <strong style="color: ${ORO};">${premioA}</strong>.</div>
                <button type="button" onclick="mqtQuickPass.invia()" style="${stileBottone} display: flex; align-items: center; justify-content: center; gap: 10px;"><i class="fab fa-whatsapp" style="font-size: 1.2rem;"></i> Invia su WhatsApp</button>
                <button type="button" onclick="mqtQuickPass.condividi()" style="width: 100%; margin-top: 10px; padding: 14px; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 12px; font-size: 0.75rem; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer;">Altre app</button>
                <div style="font-size: 0.7rem; color: rgba(255,255,255,0.4); margin-top: 12px; word-break: break-all;">${esc(link)}</div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08);">
                    <div><div style="font-size: 1.4rem; color: #fff; font-weight: 600;">${s.invito.amici_ritirati || 0}</div><div style="font-size: 0.65rem; color: rgba(255,255,255,0.5); letter-spacing: 1px;">PASS RITIRATI</div></div>
                    <div><div style="font-size: 1.4rem; color: ${ORO}; font-weight: 600;">${usati}</div><div style="font-size: 0.65rem; color: rgba(255,255,255,0.5); letter-spacing: 1px;">AMICI ARRIVATI</div></div>
                </div>
                ${perPremio > 1 && s.attiva ? `<div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); margin-top: 12px;">Ancora ${mancano} ${mancano === 1 ? 'amico' : 'amici'} per il prossimo premio</div>` : ''}
            </div>`;
        } else if (s.attiva) {
            html += `<div style="text-align: center; padding: 10px 6px 0;">
                <i class="fas fa-gift" style="font-size: 3rem; color: ${ORO}; filter: drop-shadow(0 0 20px rgba(212,175,55,0.2)); margin-bottom: 18px;"></i>
                <div style="font-size: 1rem; color: #e8e8ed; line-height: 1.6; font-weight: 300;">Regala <strong style="color: #fff; font-weight: 500;">${premioB}</strong> a un amico.<br>${perPremio > 1 ? `Ogni ${perPremio} amici che lo usano` : 'Quando lo userà'} in cassa, ricevi:</div>
                <div style="margin: 18px auto; max-width: 320px; padding: 26px 18px; border: 1px solid ${ORO}; border-radius: 20px; background: rgba(0,0,0,0.5);">
                    <div style="font-size: 0.65rem; color: rgba(255,255,255,0.45); letter-spacing: 4px; text-transform: uppercase; margin-bottom: 10px;">Il tuo premio</div>
                    <div style="font-size: 1.15rem; color: #fff; font-weight: 600; letter-spacing: 1px;">${premioA}</div>
                </div>
                <input type="text" id="qp-mio-nome" maxlength="40" placeholder="Il tuo nome" autocomplete="given-name" style="${stileCampo} margin-bottom: 10px;">
                <div id="qp-mio-errore" role="status" style="color: #ef4444; font-size: 0.8rem; min-height: 1em; margin-bottom: 6px;"></div>
                <button type="button" id="qp-crea" onclick="mqtQuickPass.creaInvito()" style="${stileBottone}">Crea il tuo invito</button>
                <div style="font-size: 0.7rem; color: rgba(255,255,255,0.4); margin-top: 10px; line-height: 1.4;">Il tuo nome compare sul regalo che ricevono i tuoi amici.</div>
            </div>`;
        } else if (!daUsare.length) {
            html += '<div style="text-align: center; padding: 30px 10px; color: rgba(255,255,255,0.6); font-size: 0.9rem;">Il Quick Pass non è attivo in questo momento.</div>';
        }
        html += '</div>';
        corpo.innerHTML = html;
        disegnaQr(corpo);
    }

    async function creaInvito() {
        const nome = (document.getElementById('qp-mio-nome') || {}).value || '';
        const errore = document.getElementById('qp-mio-errore');
        if (!nome.trim()) { if (errore) errore.textContent = 'Scrivi il tuo nome.'; return; }
        const btn = document.getElementById('qp-crea');
        if (btn) { btn.disabled = true; btn.textContent = 'Un attimo…'; }
        const r = await chiama('invito', { nome, dispositivo: dispositivo() });
        if (r.success && r.invito) {
            const m = memoria(); m.invito = r.invito; salvaMemoria(m);
            if (typeof tracciaClickSezione === 'function') tracciaClickSezione('QUICK PASS INVITO');
            const corpo = document.getElementById('corpoSezione'), titolo = document.getElementById('titoloSezione');
            if (corpo && titolo) await sezione(corpo, titolo);
            return;
        }
        if (errore) errore.textContent = r.error || 'Non è stato possibile creare l\'invito. Riprova.';
        if (btn) { btn.disabled = false; btn.textContent = 'Crea il tuo invito'; }
    }

    function messaggioInvito() {
        const m = memoria();
        const link = `${window.location.origin}/u/${nomeTag()}?pass=${m.invito ? m.invito.codice : ''}`;
        return { link, testo: `Ho un regalo per te da ${nomeVisibile()}: ${cacheDatiUtente.quickpass_premio_b || ''}. Ritira il tuo pass personale qui:` };
    }
    function invia() {
        const { link, testo } = messaggioInvito();
        if (typeof tracciaClickSezione === 'function') tracciaClickSezione('QUICK PASS INVIATO');
        window.open(`https://wa.me/?text=${encodeURIComponent(`${testo} ${link}`)}`, '_blank', 'noopener');
    }
    function condividi() {
        const { link, testo } = messaggioInvito();
        if (navigator.share) {
            navigator.share({ title: nomeVisibile(), text: testo, url: link }).catch(() => {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(`${testo} ${link}`).then(() => { if (typeof mostraToast === 'function') mostraToast('Invito copiato!'); });
        }
    }

    // ============================================================
    // 3. LA CASSA: verifica e convalida
    // ============================================================
    function pinSalvato() { try { return localStorage.getItem('mqt_qp_pin_' + nomeTag()) || ''; } catch (e) { return ''; } }

    function cassa(codiceIniziale) {
        overlay(`<div style="padding: 30px 22px 24px; text-align: center;">
            <div style="font-size: 0.65rem; color: ${ORO}; letter-spacing: 3px; text-transform: uppercase; font-weight: 700;">Cassa · Quick Pass</div>
            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin: 8px 0 20px;">${esc(nomeVisibile())}</div>
            <div style="display: flex; flex-direction: column; gap: 10px; text-align: left;">
                <input type="text" id="qp-cassa-codice" maxlength="6" placeholder="CODICE" autocapitalize="characters" value="${esc(codiceIniziale || '')}" style="${stileCampo} text-transform: uppercase; letter-spacing: 4px; font-family: monospace; text-align: center;">
                <div id="qp-cassa-pin-box" style="display: none;">
                    <input type="password" id="qp-cassa-pin" inputmode="numeric" maxlength="6" placeholder="PIN di cassa" style="${stileCampo} text-align: center; letter-spacing: 6px;">
                    <label style="display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 0.72rem; color: rgba(255,255,255,0.6);"><input type="checkbox" id="qp-cassa-ricorda" checked style="accent-color: #e5c158;"> Ricorda il PIN su questo telefono</label>
                </div>
                <div id="qp-cassa-esito" role="status" style="min-height: 1em; font-size: 0.85rem; text-align: center;"></div>
                <button type="button" id="qp-cassa-azione" onclick="mqtQuickPass.verifica()" style="${stileBottone}">Verifica il pass</button>
            </div>
        </div>`);
        if (codiceIniziale && codiceIniziale.length === 6) verifica();
    }

    function datiCassa() {
        const codice = ((document.getElementById('qp-cassa-codice') || {}).value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const campoPin = document.getElementById('qp-cassa-pin');
        const pin = (campoPin && campoPin.value) || pinSalvato();
        return { codice, pin: pin || undefined };
    }
    function ricordaPin() {
        const campoPin = document.getElementById('qp-cassa-pin'), ricorda = document.getElementById('qp-cassa-ricorda');
        try { if (campoPin && campoPin.value && ricorda && ricorda.checked) localStorage.setItem('mqt_qp_pin_' + nomeTag(), campoPin.value); } catch (e) {}
    }
    function esitoErrore(r) {
        const esito = document.getElementById('qp-cassa-esito');
        if (r.serve_pin) {
            document.getElementById('qp-cassa-pin-box').style.display = 'block';
            try { if (r.error === 'PIN di cassa errato') localStorage.removeItem('mqt_qp_pin_' + nomeTag()); } catch (e) {}
            esito.style.color = r.error === 'PIN di cassa errato' ? '#ef4444' : 'rgba(255,255,255,0.7)';
            esito.textContent = r.pin_impostato === false ? 'Riservato alla cassa: il titolare non ha ancora impostato il PIN. Accedi come titolare.' : (r.error === 'PIN di cassa errato' ? 'PIN errato' : 'Inserisci il PIN di cassa');
            return;
        }
        esito.style.color = '#ef4444';
        const p = r.pass;
        esito.innerHTML = esc(r.usato && p ? `Pass già usato il ${dataBreve(p.usato_il)}` : r.scaduto && p ? `Pass scaduto il ${dataBreve(p.scadenza)}` : (r.error || 'Errore, riprova'));
    }

    async function verifica() {
        const d = datiCassa();
        const esito = document.getElementById('qp-cassa-esito');
        if (d.codice.length !== 6) { esito.style.color = '#ef4444'; esito.textContent = 'Il codice ha 6 caratteri'; return; }
        const r = await chiama('verifica', d);
        if (!r.success) { esitoErrore(r); return; }
        ricordaPin();
        const p = r.pass;
        esito.style.color = '#fff';
        esito.innerHTML = `<div style="border: 1px solid ${ORO}; border-radius: 14px; padding: 16px; margin: 6px 0; background: rgba(0,0,0,0.4);">
            <div style="font-size: 0.65rem; color: rgba(255,255,255,0.5); letter-spacing: 2px; text-transform: uppercase;">${p.tipo === 'premio' ? 'Premio di chi ha consigliato' : 'Pass di un nuovo cliente'}</div>
            <div style="font-size: 1.1rem; font-weight: 600; margin: 6px 0;">${esc(p.premio)}</div>
            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.65);">${esc(p.nome)} · valido fino al ${dataBreve(p.scadenza)}</div></div>`;
        const btn = document.getElementById('qp-cassa-azione');
        btn.textContent = 'Convalida e consegna';
        btn.onclick = convalida;
    }

    async function convalida() {
        const btn = document.getElementById('qp-cassa-azione');
        btn.disabled = true;
        const r = await chiama('convalida', datiCassa());
        btn.disabled = false;
        if (!r.success) { esitoErrore(r); return; }
        if (navigator.vibrate) navigator.vibrate([30, 40, 30]);
        const esito = document.getElementById('qp-cassa-esito');
        esito.style.color = '#10b981';
        esito.innerHTML = `<div style="font-size: 2.2rem; margin: 6px 0;">✓</div><div style="font-size: 1rem; font-weight: 600;">Pass convalidato</div>
            <div style="color: #fff; font-size: 0.85rem; margin-top: 6px;">Consegna: ${esc(r.pass.premio)}</div>
            ${r.premio_sbloccato ? `<div style="color: ${ORO}; font-size: 0.8rem; margin-top: 10px; line-height: 1.5;">${esc(r.premio_sbloccato.nome)} ha sbloccato il suo premio: ${esc(r.premio_sbloccato.premio)}. Lo troverà sulla tag.</div>` : ''}`;
        document.getElementById('qp-cassa-codice').value = '';
        btn.textContent = 'Convalida un altro pass';
        btn.onclick = () => cassa('');
    }

    // ============================================================
    // AVVIO: link dell'amico (?pass= o il vecchio ?qp_ref=invito) e link della cassa (?cassa=)
    // ============================================================
    function avvio(fields) {
        const p = new URLSearchParams(window.location.search);
        const cassaParam = p.get('cassa');
        if (cassaParam) {
            const codice = cassaParam.toUpperCase().replace(/[^A-Z0-9]/g, '');
            cassa(codice.length === 6 ? codice : '');
            return;
        }
        if (String((fields && fields.stato) || '').toLowerCase() !== 'attivo') return;
        const invito = (p.get('pass') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (invito.length === 8 || p.get('qp_ref') === 'invito') paginaAmico(invito.length === 8 ? invito : '');
    }

    window.mqtQuickPass = { avvio, sezione, ritira, creaInvito, invia, condividi, cassa, verifica, chiudi };
})();
