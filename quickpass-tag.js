// ============================================================
// QUICKGIFT SULLA TAG PUBBLICA (nato come Quick Pass, 29/10/2026; nome QuickGift dal 04/11/2026) — server: api/quickpass.js
// Il nome tecnico resta "quickpass" (file, API, colonne, chiavi del telefono): cambiano solo le parole che si vedono.
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

    // Caratteristiche del telefono uguali in ogni browser (Chrome, il browser interno di WhatsApp…):
    // il server ne conserva solo un'impronta, per riconoscere chi ritira il pass con il proprio invito
    async function telefono() {
        try {
            const n = navigator, sc = window.screen || {};
            const dati = [sc.width, sc.height, sc.colorDepth, window.devicePixelRatio, n.hardwareConcurrency, n.deviceMemory, n.maxTouchPoints,
                (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone, (n.languages || [n.language]).join(','), n.platform].join('|');
            const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(dati));
            return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) { return undefined; }
    }
    // Il titolare della tag (con la sua sessione) concede i premi: niente link personali né regali per lui (ha il suo link regalo)
    function seiTitolare() { return !!(cacheDatiUtente && cacheDatiUtente.sei_proprietario); }

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

    // ---------- Parole fisse di QuickGift ----------
    // REGALO = quello dell'amico invitato · PREMIO = quello del cliente che condivide. Mai mescolate.
    // Dove si usa (negozio / online / entrambi) e il link "Usa il regalo" verso il titolare, con un messaggio
    // già scritto che contiene il codice e il link della cassa (lo tocca il titolare e conferma)
    // Dove si usa: di persona (QR in cassa), online (il codice personale si indica quando si ordina, si prenota o si
    // richiede il regalo; il titolare lo verifica e lo conferma nella cassa di myquicktag), entrambi. Parole neutre:
    // il regalo può essere qualsiasi cosa, non per forza uno sconto (richiesta del titolare, 09/11/2026). Niente WhatsApp: si resta in myquicktag.
    function modoUso() {
        const m = (cacheDatiUtente && cacheDatiUtente.quickpass_modo) || 'negozio';
        return { modo: m === 'online' || m === 'entrambi' ? m : 'negozio', link: linkNegozio() };
    }
    // Link facoltativo dove si compra o si prenota (casella quickpass_contatto). I vecchi recapiti (numero o email) non sono un link.
    function linkNegozio() {
        let v = String((cacheDatiUtente && cacheDatiUtente.quickpass_contatto) || '').trim();
        if (!v || v.includes('@') || /\s/.test(v) || !/[a-z]{2,}\.[a-z]{2,}/i.test(v)) return '';
        if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
        try { const u = new URL(v); return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : ''; } catch (e) { return ''; }
    }
    function parola(p) { return p && p.tipo === 'premio' ? 'premio' : 'regalo'; }
    function copiaCodice(codice) {
        const fatto = () => { if (typeof mostraToast === 'function') mostraToast('Codice copiato!'); };
        if (navigator.clipboard) navigator.clipboard.writeText(codice).then(fatto).catch(() => {}); else fatto();
        if (typeof tracciaClickSezione === 'function') tracciaClickSezione('QUICKGIFT CODICE COPIATO');
    }
    // Come si usa, in parole semplici: nessuno deve indovinare cosa fare con un QR
    function comeSiUsa(modo) {
        const negozio = `<div><strong style="color: #fff;">Di persona:</strong> mostra il QR o detta il codice a ${esc(nomeVisibile())}, prima di pagare se c'è un acquisto.</div>`;
        const online = `<div><strong style="color: #fff;">Online:</strong> indica questo codice quando ordini, prenoti o richiedi il regalo: ${esc(nomeVisibile())} lo verifica e lo conferma.</div>`;
        return modo === 'online' ? online : modo === 'entrambi' ? negozio + online : negozio;
    }

    // Il regalo (o il premio) come "biglietto": cosa, per chi, QR, codice, scadenza e come si usa
    function htmlPass(p, sottotitolo) {
        const usato = p.stato === 'usato', scaduto = p.scaduto;
        const { modo, link } = modoUso();
        const conQr = modo !== 'online';
        // Online: si copia il codice personale e (se il titolare l'ha indicato) si va dove si usa
        const bottoneOnline = modo === 'negozio' || usato || scaduto ? '' : `<button type="button" onclick="mqtQuickPass.copiaCodice('${esc(p.codice)}')" style="display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; margin-top: 16px; padding: 15px; background: ${ORO}; color: #000; border: none; border-radius: 12px; font-weight: 800; font-size: 0.8rem; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer;"><i class="fas fa-copy" style="font-size: 1rem;"></i> Copia il codice</button>` +
            (link ? `<a href="${esc(link)}" target="_blank" rel="noopener noreferrer" onclick="if (typeof tracciaClickSezione === 'function') tracciaClickSezione('QUICKGIFT VAI AL NEGOZIO')" style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 10px; padding: 14px; background: transparent; border: 1px solid ${ORO}; color: ${ORO}; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 0.78rem; letter-spacing: 1.5px; text-transform: uppercase;"><i class="fas fa-arrow-up-right-from-square"></i> Vai dove usarlo</a>` : '');
        const nota = usato ? `Usato il ${dataBreve(p.usato_il)}` : scaduto ? 'Scaduto' : `Valido fino al ${dataBreve(p.scadenza)}`;
        return `<div style="padding: 28px 22px 22px; text-align: center;">
            <div style="font-size: 0.65rem; color: rgba(255,255,255,0.5); letter-spacing: 3px; text-transform: uppercase;">${esc(sottotitolo)}</div>
            <div style="font-size: 1.3rem; color: #fff; font-weight: 600; margin: 10px 0 4px; line-height: 1.35;">${esc(p.premio)}</div>
            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6);">per ${esc(p.nome)} · da ${esc(nomeVisibile())}</div>
            ${conQr ? `<div style="margin: 20px auto 14px; width: 176px; height: 176px; padding: 12px; background: #fff; border-radius: 14px; ${usato || scaduto ? 'opacity: 0.25;' : ''}" class="mqt-qp-qr" data-codice="${esc(p.codice)}"></div>` : '<div style="height: 18px;"></div>'}
            <div style="font-family: monospace; font-size: 1.6rem; letter-spacing: 6px; color: #fff; font-weight: 700;">${esc(p.codice)}</div>
            <div style="font-size: 0.75rem; color: ${usato || scaduto ? '#ef4444' : ORO}; margin-top: 8px; letter-spacing: 0.5px;">${nota}</div>
            ${usato || scaduto ? '' : `<div style="text-align: left; margin-top: 16px; padding: 14px 16px; border-radius: 14px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);">
                <div style="font-size: 0.6rem; color: ${ORO}; letter-spacing: 2px; font-weight: 700; margin-bottom: 8px;">COME SI USA</div>
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.78rem; color: rgba(255,255,255,0.7); line-height: 1.5;">${comeSiUsa(modo)}</div>
                <div style="font-size: 0.7rem; color: rgba(255,255,255,0.45); margin-top: 8px;">Vale una volta sola.</div></div>`}
            ${bottoneOnline}
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
    // 2. L'AMICO: la pagina del regalo (chi te lo manda → cosa ricevi → come si usa → ricevilo)
    // ============================================================
    async function paginaAmico(invito) {
        if (seiTitolare()) { pannelloTitolareOverlay(); return; }
        const m = memoria();
        // Regalo già ricevuto su questo telefono: si mostra direttamente
        if (m.pass && m.pass.length) {
            const s = await chiama('stato', { codici: m.pass });
            const mio = (s.pass || []).find(p => p.tipo === 'amico');
            if (mio) { mostraPass(mio, 'Il tuo regalo'); return; }
        }
        const info = await chiama('info', { invito });
        if (!info.success || !info.attiva) {
            overlay(`<div style="padding: 40px 24px; text-align: center;">
                <i class="fas fa-gift" style="font-size: 2.2rem; color: ${ORO}; margin-bottom: 14px;"></i>
                <div style="color: #fff; font-size: 1.05rem; margin-bottom: 8px;">${info.esauriti ? 'I regali sono esauriti' : 'Questo regalo non è più disponibile'}</div>
                <div style="color: rgba(255,255,255,0.6); font-size: 0.85rem; line-height: 1.5;">Puoi comunque scoprire ${esc(nomeVisibile())}.</div>
                <button type="button" onclick="mqtQuickPass.chiudi()" style="${stileBottone} margin-top: 22px;">Scopri la tag</button>
            </div>${piede}`);
            return;
        }
        const { modo } = modoUso();
        const dove = modo === 'online' ? 'Lo usi online, con il tuo codice personale.' : modo === 'entrambi' ? 'Lo usi di persona o online, con un codice personale.' : 'Lo usi di persona: basta mostrare il tuo codice personale.';
        const titolo = info.da ? `${esc(info.da)} ti ha fatto un regalo` : 'Hai ricevuto un regalo';
        overlay(`<div style="padding: 32px 22px 22px; text-align: center;">
            <i class="fas fa-gift" style="font-size: 2.6rem; color: ${ORO}; margin-bottom: 14px; filter: drop-shadow(0 0 14px rgba(212,175,55,0.4));"></i>
            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.65); letter-spacing: 2px; text-transform: uppercase;">${titolo}</div>
            <div style="margin: 16px 0 10px; padding: 22px 16px; border: 1px solid ${ORO}; border-radius: 18px; background: rgba(229,193,88,0.06);">
                <div style="font-size: 1.4rem; color: #fff; font-weight: 600; line-height: 1.35;">${esc(info.premio)}</div>
                <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin-top: 8px;">da ${esc(nomeVisibile())}${info.posti_rimasti ? ` · ultimi ${info.posti_rimasti} regali` : ''}</div>
            </div>
            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.7); line-height: 1.5; margin-bottom: 20px;">${dove}</div>
            <div style="display: flex; flex-direction: column; gap: 10px; text-align: left;">
                <input type="text" id="qp-nome" maxlength="40" placeholder="Il tuo nome" autocomplete="given-name" style="${stileCampo}">
                <div id="qp-errore" role="status" style="color: #ef4444; font-size: 0.8rem; min-height: 1em;"></div>
                <button type="button" id="qp-ritira" onclick="mqtQuickPass.ritira('${esc(invito || '')}')" style="${stileBottone}">Ricevi il tuo regalo</button>
                <div style="margin-top: 10px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; gap: 10px;">
                    <div style="font-size: 0.6rem; color: rgba(255,255,255,0.4); letter-spacing: 2px;">FACOLTATIVO</div>
                    <input type="text" id="qp-contatto" maxlength="120" placeholder="Telefono o email" autocomplete="tel" style="${stileCampo}">
                    <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 0.72rem; color: rgba(255,255,255,0.75); line-height: 1.45; cursor: pointer;">
                        <input type="checkbox" id="qp-consenso" style="margin-top: 2px; width: 16px; height: 16px; accent-color: #e5c158; flex-shrink: 0;">
                        <span id="qp-consenso-testo">Accetto di ricevere offerte e novità da ${esc(nomeVisibile())}</span>
                    </label>
                </div>
            </div>
            <div style="font-size: 0.65rem; color: rgba(255,255,255,0.4); margin-top: 14px; line-height: 1.4;">Il regalo è personale e vale una volta. I tuoi dati arrivano solo a ${esc(nomeVisibile())}. <a href="/privacy.html" target="_blank" rel="noopener" style="color: inherit;">Privacy</a></div>
        </div>${piede}`);
    }

    async function ritira(invito) {
        const nome = (document.getElementById('qp-nome') || {}).value || '';
        const errore = document.getElementById('qp-errore');
        if (!nome.trim()) { if (errore) errore.textContent = 'Scrivi il tuo nome: il regalo è personale.'; return; }
        const btn = document.getElementById('qp-ritira');
        if (btn) { btn.disabled = true; btn.textContent = 'Un attimo…'; }
        const r = await chiama('ritira', {
            invito: invito || undefined, nome, dispositivo: dispositivo(), telefono: await telefono(),
            contatto: (document.getElementById('qp-contatto') || {}).value || '',
            consenso: !!(document.getElementById('qp-consenso') || {}).checked,
            consenso_testo: (document.getElementById('qp-consenso-testo') || {}).textContent || ''
        });
        if (r.success && r.pass) {
            const m = memoria();
            m.pass = [r.pass.codice, ...((m.pass || []).filter(c => c !== r.pass.codice))].slice(0, 20);
            salvaMemoria(m);
            if (typeof tracciaClickSezione === 'function') tracciaClickSezione('QUICKGIFT RICEVUTO');
            mostraPass(r.pass, 'Il tuo regalo');
            return;
        }
        if (errore) errore.textContent = r.error || 'Non è stato possibile ricevere il regalo. Riprova.';
        if (btn) { btn.disabled = false; btn.textContent = 'Ricevi il tuo regalo'; }
    }

    function mostraPass(p, sottotitolo) {
        const o = overlay(htmlPass(p, sottotitolo) + piede);
        disegnaQr(o);
    }

    // ============================================================
    // 1. IL CLIENTE CHE CONDIVIDE: la sezione QuickGift dell'Action Center
    // ============================================================
    // Pannello del titolare: al posto del link da condividere, la cassa e i numeri
    async function htmlTitolare() {
        let n = {};
        try { const r = await chiama('riepilogo'); n = r.numeri || {}; } catch (e) {}
        const cifra = (v, e) => `<div><div style="font-size: 1.3rem; color: #fff; font-weight: 600;">${v || 0}</div><div style="font-size: 0.55rem; color: rgba(255,255,255,0.5); letter-spacing: 1px; line-height: 1.3; margin-top: 2px;">${e}</div></div>`;
        return `<div style="text-align: center; padding: 6px 4px;">
            <div style="font-size: 0.65rem; color: ${ORO}; letter-spacing: 3px; text-transform: uppercase; font-weight: 700;">Sei il titolare</div>
            <div style="font-size: 0.9rem; color: #e8e8ed; line-height: 1.6; margin: 12px 0 18px;">Qui chi ti segue condivide il tuo regalo. Quando qualcuno ti mostra o ti manda il suo codice, confermalo dalla cassa.</div>
            <button type="button" onclick="mqtQuickPass.cassa('')" style="${stileBottone}">Apri la cassa</button>
            <div style="margin-top: 20px; padding: 16px; border: 1px solid rgba(255,255,255,0.12); border-radius: 16px; background: rgba(255,255,255,0.03); text-align: left;">
                <div style="font-size: 0.6rem; color: ${ORO}; letter-spacing: 2px; font-weight: 700;">IL TUO LINK REGALO</div>
                <div style="font-size: 0.8rem; color: rgba(255,255,255,0.75); line-height: 1.5; margin: 8px 0 12px;">Pubblicalo dove vuoi: storia, bio, post, newsletter. Chi lo apre riceve il regalo con un codice personale.</div>
                <button type="button" onclick="mqtQuickPass.condividiLinkTitolare()" style="width: 100%; padding: 13px; background: transparent; border: 1px solid ${ORO}; color: ${ORO}; border-radius: 12px; font-size: 0.75rem; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer;"><i class="fas fa-share-nodes" style="margin-right: 6px;"></i>Condividi il link regalo</button>
                <div style="font-size: 0.68rem; color: rgba(255,255,255,0.4); margin-top: 10px; word-break: break-all;">${esc(linkTitolare())}</div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 20px;">${cifra(n.inviti, 'LINK CREATI')}${cifra(n.pass_ritirati, 'REGALI RICHIESTI')}${cifra(n.pass_usati, 'REGALI USATI')}${cifra(n.premi_maturati, 'PREMI DATI')}</div>
            <div style="font-size: 0.7rem; color: rgba(255,255,255,0.45); margin-top: 14px; line-height: 1.5;">In cassa, più veloce: inquadra con la fotocamera il QR del regalo.</div>
        </div>`;
    }
    // Link regalo del titolare (es. un influencer nella sua storia): chi lo apre riceve il regalo, senza premio a nessuno
    function linkTitolare() { return `${window.location.origin}/u/${nomeTag()}?regalo=1`; }
    function condividiLinkTitolare() {
        const link = linkTitolare(), testo = `Ho un regalo per te: ${(cacheDatiUtente && cacheDatiUtente.quickpass_premio_b) || ''}. Lo ricevi qui:`;
        if (typeof tracciaClickSezione === 'function') tracciaClickSezione('QUICKGIFT LINK TITOLARE');
        if (navigator.share) navigator.share({ title: nomeVisibile(), text: testo, url: link }).catch(() => {});
        else if (navigator.clipboard) navigator.clipboard.writeText(`${testo} ${link}`).then(() => { if (typeof mostraToast === 'function') mostraToast('Link copiato!'); });
    }
    async function pannelloTitolareOverlay() {
        overlay(`<div style="padding: 34px 22px 24px;">${await htmlTitolare()}</div>`);
    }

    // I tre momenti in parole semplici, uguali nell'editor (anteprima) e sulla tag
    function htmlTrePassi(premioB, premioA, perPremio) {
        const riga = (n, testo) => `<div style="display: flex; gap: 12px; align-items: flex-start; text-align: left;">
            <div style="flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; border: 1px solid ${ORO}; color: ${ORO}; font-size: 0.72rem; font-weight: 700; display: flex; align-items: center; justify-content: center;">${n}</div>
            <div style="font-size: 0.86rem; color: #e8e8ed; line-height: 1.5; padding-top: 2px;">${testo}</div></div>`;
        return `<div style="display: flex; flex-direction: column; gap: 12px; margin: 18px 0;">
            ${riga(1, 'Mandi il regalo a chi vuoi, con un clic')}
            ${riga(2, `Chi lo riceve ottiene <strong style="color: #fff;">${premioB}</strong>`)}
            ${riga(3, `${perPremio > 1 ? `Ogni ${perPremio} persone che lo usano` : 'Quando viene usato'}, tu guadagni <strong style="color: ${ORO};">${premioA}</strong>`)}
        </div>`;
    }

    async function sezione(corpo, titolo) {
        titolo.textContent = 'QUICKGIFT';
        if (seiTitolare()) { corpo.innerHTML = `<div style="width: 100%; padding-top: 10px;">${await htmlTitolare()}</div>`; return; }
        corpo.innerHTML = '<div style="text-align: center; padding: 40px 0; color: rgba(255,255,255,0.5); font-size: 0.85rem;">Caricamento…</div>';
        const m = memoria();
        const s = await chiama('stato', { codici: m.pass || [], invito: m.invito ? m.invito.codice : undefined });
        const premioA = esc(cacheDatiUtente.quickpass_premio_a || '');
        const premioB = esc(cacheDatiUtente.quickpass_premio_b || '');
        const perPremio = parseInt(cacheDatiUtente.quickpass_amici_per_premio, 10) > 1 ? parseInt(cacheDatiUtente.quickpass_amici_per_premio, 10) : 1;
        let html = '<div style="display: flex; flex-direction: column; gap: 18px; width: 100%; padding-top: 6px;">';

        // Regali e premi conservati su questo telefono, ancora da usare
        const daUsare = [...(s.pass || []), ...((s.invito && s.invito.premi) || [])].filter(p => p.stato === 'attivo' && !p.scaduto);
        daUsare.forEach(p => {
            html += `<div style="border: 1px solid ${ORO}; border-radius: 20px; background: rgba(0,0,0,0.5);">${htmlPass(p, p.tipo === 'premio' ? 'Il tuo premio' : 'Il tuo regalo')}</div>`;
        });

        if (s.invito) {
            const link = `${window.location.origin}/u/${nomeTag()}?pass=${s.invito.codice}`;
            const usati = s.invito.amici_usati || 0;
            const guadagnati = s.invito.premi_totali ?? ((s.invito.premi || []).length);
            const fatti = usati % perPremio, mancano = perPremio - fatti;
            const avanzamento = s.attiva ? `<div style="margin-top: 16px; text-align: left;">
                    <div style="height: 6px; border-radius: 3px; background: rgba(255,255,255,0.1); overflow: hidden;"><div style="height: 100%; width: ${Math.round(fatti / perPremio * 100)}%; background: ${ORO}; border-radius: 3px;"></div></div>
                    <div style="font-size: 0.78rem; color: rgba(255,255,255,0.75); margin-top: 8px; text-align: center;">${perPremio > 1 ? `Ti ${mancano === 1 ? 'manca 1 utilizzo' : `mancano ${mancano} utilizzi`} per il tuo prossimo premio` : 'Al prossimo utilizzo del regalo guadagni il tuo premio'}</div></div>` : '';
            html += `<div style="text-align: center; padding: 22px 18px; border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; background: rgba(255,255,255,0.03);">
                <div style="font-size: 0.65rem; color: rgba(255,255,255,0.5); letter-spacing: 3px; text-transform: uppercase;">Il tuo link da condividere</div>
                ${htmlTrePassi(premioB, premioA, perPremio)}
                <button type="button" onclick="mqtQuickPass.condividiSu('whatsapp')" style="${stileBottone} display: flex; align-items: center; justify-content: center; gap: 10px;"><i class="fab fa-whatsapp" style="font-size: 1.2rem;"></i> Manda il regalo su WhatsApp</button>
                ${htmlCanali()}
                <div style="font-size: 0.7rem; color: rgba(255,255,255,0.4); margin-top: 12px; word-break: break-all;">${esc(link)}</div>
                ${avanzamento}
                <div style="display: grid; grid-template-columns: repeat(${guadagnati ? 3 : 2}, 1fr); gap: 10px; margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08);">
                    <div><div style="font-size: 1.4rem; color: #fff; font-weight: 600;">${s.invito.amici_ritirati || 0}</div><div style="font-size: 0.6rem; color: rgba(255,255,255,0.5); letter-spacing: 1px; line-height: 1.35;">PERSONE CHE HANNO RICHIESTO IL REGALO</div></div>
                    <div><div style="font-size: 1.4rem; color: ${ORO}; font-weight: 600;">${usati}</div><div style="font-size: 0.6rem; color: rgba(255,255,255,0.5); letter-spacing: 1px; line-height: 1.35;">PERSONE CHE L'HANNO USATO</div></div>
                    ${guadagnati ? `<div><div style="font-size: 1.4rem; color: ${ORO}; font-weight: 600;">${guadagnati}</div><div style="font-size: 0.6rem; color: rgba(255,255,255,0.5); letter-spacing: 1px; line-height: 1.35;">PREMI CHE HAI GUADAGNATO</div></div>` : ''}
                </div>
            </div>`;
        } else if (s.attiva) {
            html += `<div style="text-align: center; padding: 6px 4px 0;">
                <i class="fas fa-gift" style="font-size: 2.8rem; color: ${ORO}; filter: drop-shadow(0 0 20px rgba(212,175,55,0.2)); margin-bottom: 14px;"></i>
                <div style="font-size: 1.05rem; color: #fff; font-weight: 500; line-height: 1.45;">Un regalo da condividere.<br><span style="color: ${ORO};">Un premio da guadagnare.</span></div>
                ${htmlTrePassi(premioB, premioA, perPremio)}
                <input type="text" id="qp-mio-nome" maxlength="40" placeholder="Il tuo nome" autocomplete="given-name" style="${stileCampo} margin-bottom: 10px;">
                <div id="qp-mio-errore" role="status" style="color: #ef4444; font-size: 0.8rem; min-height: 1em; margin-bottom: 6px;"></div>
                <button type="button" id="qp-crea" onclick="mqtQuickPass.creaInvito()" style="${stileBottone}">Crea il tuo link regalo</button>
                <div style="font-size: 0.7rem; color: rgba(255,255,255,0.4); margin-top: 10px; line-height: 1.4;">Il tuo nome compare sul regalo: chi lo riceve sa che arriva da te.</div>
            </div>`;
        } else if (!daUsare.length) {
            html += '<div style="text-align: center; padding: 30px 10px; color: rgba(255,255,255,0.6); font-size: 0.9rem;">QuickGift non è attivo in questo momento.</div>';
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
        const r = await chiama('invito', { nome, dispositivo: dispositivo(), telefono: await telefono() });
        if (r.success && r.invito) {
            const m = memoria(); m.invito = r.invito; salvaMemoria(m);
            if (typeof tracciaClickSezione === 'function') tracciaClickSezione('QUICKGIFT LINK CREATO');
            const corpo = document.getElementById('corpoSezione'), titolo = document.getElementById('titoloSezione');
            if (corpo && titolo) await sezione(corpo, titolo);
            return;
        }
        if (errore) errore.textContent = r.error || 'Non è stato possibile creare il tuo link. Riprova.';
        if (btn) { btn.disabled = false; btn.textContent = 'Crea il tuo link regalo'; }
    }

    function messaggioInvito() {
        const m = memoria();
        const link = `${window.location.origin}/u/${nomeTag()}?pass=${m.invito ? m.invito.codice : ''}`;
        return { link, testo: `Ho un regalo per te da ${nomeVisibile()}: ${cacheDatiUtente.quickpass_premio_b || ''}. Lo ricevi qui:` };
    }
    // Tutti i modi di condividere il link (l'amico A può usare il canale che preferisce: più canali, più persone su myquicktag)
    const CANALI = [
        ['telegram', 'fab fa-telegram', 'Telegram'], ['facebook', 'fab fa-facebook', 'Facebook'], ['sms', 'fas fa-comment-sms', 'SMS'],
        ['email', 'fas fa-envelope', 'Email'], ['copia', 'fas fa-link', 'Copia link'], ['qr', 'fas fa-qrcode', 'Mostra QR']
    ];
    function htmlCanali() {
        const bottone = ([id, icona, nome]) => `<button type="button" onclick="mqtQuickPass.condividiSu('${id}')" style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 4px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.12); color: #fff; border-radius: 12px; font-size: 0.66rem; letter-spacing: 0.5px; cursor: pointer;"><i class="${icona}" style="font-size: 1.15rem; color: ${ORO};"></i>${nome}</button>`;
        return `<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px;">${CANALI.map(bottone).join('')}</div>` +
            (navigator.share ? `<button type="button" onclick="mqtQuickPass.condividiSu('altre')" style="width: 100%; margin-top: 8px; padding: 12px; background: transparent; border: 1px solid rgba(255,255,255,0.2); color: #fff; border-radius: 12px; font-size: 0.72rem; letter-spacing: 1.5px; text-transform: uppercase; cursor: pointer;"><i class="fas fa-share-nodes" style="margin-right: 6px;"></i>Altre app (Instagram, Messenger…)</button>` : '');
    }
    function condividiSu(canale) {
        const { link, testo } = messaggioInvito();
        const tutto = `${testo} ${link}`, e = encodeURIComponent;
        if (typeof tracciaClickSezione === 'function') tracciaClickSezione('QUICKGIFT CONDIVISO ' + canale.toUpperCase());
        const apri = url => window.open(url, '_blank', 'noopener');
        if (canale === 'whatsapp') apri(`https://wa.me/?text=${e(tutto)}`);
        else if (canale === 'telegram') apri(`https://t.me/share/url?url=${e(link)}&text=${e(testo)}`);
        else if (canale === 'facebook') apri(`https://www.facebook.com/sharer/sharer.php?u=${e(link)}`);
        else if (canale === 'sms') window.location.href = `sms:?&body=${e(tutto)}`;
        else if (canale === 'email') window.location.href = `mailto:?subject=${e('Un regalo per te da ' + nomeVisibile())}&body=${e(tutto)}`;
        else if (canale === 'copia') { if (navigator.clipboard) navigator.clipboard.writeText(tutto).then(() => { if (typeof mostraToast === 'function') mostraToast('Link copiato!'); }); }
        else if (canale === 'qr') mostraQrLink(link);
        else if (canale === 'altre') condividi();
    }
    // QR del link da mostrare sullo schermo: l'amico B lo inquadra dal vivo
    function mostraQrLink(link) {
        const o = overlay(`<div style="padding: 32px 22px 24px; text-align: center;">
            <div style="font-size: 0.65rem; color: ${ORO}; letter-spacing: 3px; text-transform: uppercase; font-weight: 700;">Il tuo link regalo</div>
            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.75); margin: 10px 0 18px; line-height: 1.5;">Fallo inquadrare con la fotocamera: chi lo apre riceve il regalo.</div>
            <div class="mqt-qp-qr-link" style="margin: 0 auto; width: 216px; height: 216px; padding: 12px; background: #fff; border-radius: 14px;"></div>
            <button type="button" onclick="mqtQuickPass.chiudi()" style="${stileBottone} margin-top: 22px;">Fatto</button>
        </div>`);
        const el = o.querySelector('.mqt-qp-qr-link');
        if (el && typeof QRCode !== 'undefined') new QRCode(el, { text: link, width: 192, height: 192, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
    }
    function invia() { condividiSu('whatsapp'); }
    function condividi() {
        const { link, testo } = messaggioInvito();
        if (navigator.share) {
            navigator.share({ title: nomeVisibile(), text: testo, url: link }).catch(() => {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(`${testo} ${link}`).then(() => { if (typeof mostraToast === 'function') mostraToast('Link copiato!'); });
        }
    }

    // ============================================================
    // 3. LA CASSA: verifica, consegna, conferma (in quest'ordine)
    // ============================================================
    function pinSalvato() { try { return localStorage.getItem('mqt_qp_pin_' + nomeTag()) || ''; } catch (e) { return ''; } }

    function cassa(codiceIniziale) {
        overlay(`<div style="padding: 30px 22px 24px; text-align: center;">
            <div style="font-size: 0.65rem; color: ${ORO}; letter-spacing: 3px; text-transform: uppercase; font-weight: 700;">Cassa · QuickGift</div>
            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.6); margin: 8px 0 20px;">${esc(nomeVisibile())}</div>
            <div style="display: flex; flex-direction: column; gap: 10px; text-align: left;">
                <input type="text" id="qp-cassa-codice" maxlength="6" placeholder="CODICE" autocapitalize="characters" value="${esc(codiceIniziale || '')}" style="${stileCampo} text-transform: uppercase; letter-spacing: 4px; font-family: monospace; text-align: center;">
                <div id="qp-cassa-pin-box" style="display: none;">
                    <input type="password" id="qp-cassa-pin" inputmode="numeric" maxlength="6" placeholder="PIN di cassa" style="${stileCampo} text-align: center; letter-spacing: 6px;">
                    <label style="display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 0.72rem; color: rgba(255,255,255,0.6);"><input type="checkbox" id="qp-cassa-ricorda" checked style="accent-color: #e5c158;"> Ricorda il PIN su questo telefono</label>
                </div>
                <div id="qp-cassa-esito" role="status" style="min-height: 1em; font-size: 0.85rem; text-align: center;"></div>
                <button type="button" id="qp-cassa-azione" onclick="mqtQuickPass.verifica()" style="${stileBottone}">Verifica il codice</button>
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
        esito.innerHTML = esc(r.usato && p ? `Codice già usato il ${dataBreve(p.usato_il)}: non consegnare` : r.usato ? 'Codice già usato: non consegnare' : r.scaduto && p ? `Codice scaduto il ${dataBreve(p.scadenza)}` : (r.error || 'Errore, riprova'));
    }

    async function verifica() {
        const d = datiCassa();
        const esito = document.getElementById('qp-cassa-esito');
        if (d.codice.length !== 6) { esito.style.color = '#ef4444'; esito.textContent = 'Il codice ha 6 caratteri'; return; }
        const r = await chiama('verifica', d);
        if (!r.success) { esitoErrore(r); return; }
        ricordaPin();
        const p = r.pass;
        const premio = p.tipo === 'premio';
        esito.style.color = '#fff';
        esito.innerHTML = `<div style="border: 1px solid ${ORO}; border-radius: 14px; padding: 16px; margin: 6px 0; background: rgba(0,0,0,0.4); text-align: center;">
            <div style="display: inline-block; font-size: 0.65rem; font-weight: 700; letter-spacing: 2px; color: #10b981; border: 1px solid rgba(16,185,129,0.5); border-radius: 20px; padding: 4px 10px;">✓ VALIDO</div>
            <div style="font-size: 0.62rem; color: rgba(255,255,255,0.5); letter-spacing: 2px; margin-top: 14px;">DA CONSEGNARE</div>
            <div style="font-size: 1.2rem; font-weight: 600; margin: 6px 0;">${esc(p.premio)}</div>
            <div style="font-size: 0.8rem; color: rgba(255,255,255,0.7);">${premio ? `Premio di <strong>${esc(p.nome)}</strong>, che ha condiviso il tuo regalo` : `Regalo di <strong>${esc(p.nome)}</strong>`}</div>
            ${p.consigliato_da ? `<div style="font-size: 0.8rem; color: rgba(255,255,255,0.7); margin-top: 4px;">Glielo ha mandato <strong>${esc(p.consigliato_da)}</strong></div>` : ''}
            <div style="font-size: 0.72rem; color: rgba(255,255,255,0.45); margin-top: 6px;">Valido fino al ${dataBreve(p.scadenza)}</div>
            ${p.sospetto ? `<div style="font-size: 0.78rem; color: #f59e0b; margin-top: 10px; line-height: 1.45; text-align: left;">⚠ Questo regalo sembra richiesto da chi l'ha mandato (stesso telefono o stesso nome). Verifica che sia davvero una persona nuova prima di confermare.</div>` : ''}
            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.65); margin-top: 12px; line-height: 1.45;">Prima consegna il ${premio ? 'premio' : 'regalo'}, poi conferma qui sotto.</div></div>`;
        const btn = document.getElementById('qp-cassa-azione');
        btn.textContent = 'Ho consegnato: conferma';
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
        esito.innerHTML = `<div style="font-size: 2.2rem; margin: 6px 0;">✓</div><div style="font-size: 1rem; font-weight: 600;">Confermato</div>
            <div style="color: #fff; font-size: 0.85rem; margin-top: 6px;">${esc(r.pass.premio)}</div>
            <div style="color: rgba(255,255,255,0.55); font-size: 0.75rem; margin-top: 4px;">Il codice ora non è più utilizzabile.</div>
            ${r.premio_sbloccato ? `<div style="color: ${ORO}; font-size: 0.8rem; margin-top: 10px; line-height: 1.5;">${esc(r.premio_sbloccato.nome)} ha guadagnato il suo premio: ${esc(r.premio_sbloccato.premio)}. Lo troverà sulla tag.</div>` : ''}`;
        document.getElementById('qp-cassa-codice').value = '';
        btn.textContent = 'Verifica un altro codice';
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
        // ?regalo=1: link del titolare (storia, bio, post) · ?qp_ref=invito: i primi link generici, ancora validi
        if (invito.length === 8 || p.get('regalo') || p.get('qp_ref') === 'invito') paginaAmico(invito.length === 8 ? invito : '');
    }

    window.mqtQuickPass = { avvio, sezione, ritira, creaInvito, invia, condividi, condividiSu, copiaCodice, cassa, verifica, chiudi, condividiLinkTitolare };
})();
