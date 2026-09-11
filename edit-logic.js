
 let formModificato = false; // Il vero Dirty Flag

        // FIX: Salva nel disco locale istantaneamente ad ogni tocco
        document.addEventListener('input', () => { 
            formModificato = true; 
            if(typeof eseguiAutoSaveInvisibile === 'function') eseguiAutoSaveInvisibile(); 
        });
        document.addEventListener('change', () => { 
            formModificato = true; 
            if(typeof eseguiAutoSaveInvisibile === 'function') eseguiAutoSaveInvisibile(); 
        });
        let ultimoSalvataggio = null; // Memoria del Dirty Flag
        const NOME_SISTEMA = getNomeBrandReale();
        let isDrawerOpen = false;
        let statoUtente = 'in attesa'; 
        let userPlan = 'BASE';
        let isLoadingDati = true;
        
        function getNomeBrandReale() {
            try {
                const params = new URLSearchParams(window.location.search);
                const nomeUrl = params.get('u') || params.get('user');
                if (nomeUrl) return nomeUrl.replace('@', '').trim().toLowerCase();
                
                const utenteLoggato = localStorage.getItem('loggedUser');
                if (utenteLoggato) return utenteLoggato.replace('@', '').trim().toLowerCase();
            } catch(e) {}
            return "tuonome.it";
        }

        // ==========================================
        // MOTORE ANTEPRIMA LIVE (Le Stanze WYSIWYG)
        // ==========================================
        function toggleRoom(roomId) {
            const roomSelezionata = document.getElementById(roomId);
            if (!roomSelezionata || roomSelezionata.innerHTML.trim() === '') return;

            if (roomSelezionata.classList.contains('open')) {
                roomSelezionata.classList.remove('open');
                return;
            }

            const tutteLeStanze = document.querySelectorAll('.room-content');
            tutteLeStanze.forEach(stanza => { stanza.classList.remove('open'); });

            roomSelezionata.classList.add('open');
            if (navigator.vibrate) navigator.vibrate(10);
        }

      // Aggiorna fisicamente il DOM della pagina simulando il design finale
       // Aggiorna fisicamente il DOM della pagina simulando il design finale
        function aggiornaAnteprimaLive() {
            const previewCopertina = document.getElementById('preview-copertina');
            const roomIdentity = document.getElementById('room-identity');
            const roomBusiness = document.getElementById('room-business');
            const roomMedia = document.getElementById('room-media'); 
            const roomNetwork = document.getElementById('room-network');
            const roomAction = document.getElementById('room-action-center');
            
            if(!roomIdentity || !roomBusiness || !roomMedia || !roomNetwork || !roomAction || !previewCopertina) return;

            // Svuota la copertina
            previewCopertina.innerHTML = '';
            
            // --- 1. ZONA COPERTINA (Design Pillole Luxury) ---
            const statusColor = document.getElementById('field-status-color') ? document.getElementById('field-status-color').value : "";
            const statusText = document.getElementById('field-status-text') ? document.getElementById('field-status-text').value.trim() : "";
            if (statusColor !== "") {
                let colorHex = '#10b981'; let borderHex = 'rgba(16, 185, 129, 0.3)'; let bgHex = 'rgba(16, 185, 129, 0.05)';
                if (statusColor === 'yellow') { colorHex = '#f59e0b'; borderHex = 'rgba(245, 158, 11, 0.3)'; bgHex = 'rgba(245, 158, 11, 0.05)'; }
                if (statusColor === 'red') { colorHex = '#ef4444'; borderHex = 'rgba(239, 68, 68, 0.3)'; bgHex = 'rgba(239, 68, 68, 0.05)'; }
                const displayTesto = statusText !== "" ? statusText.toUpperCase() : 'LIVE STATUS';
                
                previewCopertina.innerHTML += `
                <div class="feature-pill" style="border-color: ${borderHex}; background: ${bgHex};" onclick="apriDrawer('drawer-live-status')">
                    <div class="led-dot" style="background-color: ${colorHex}; box-shadow: 0 0 8px ${colorHex};"></div>
                    <span style="color: ${colorHex};">${displayTesto}</span>
                </div>`;
            }

            const flashText = document.getElementById('field-flash-text') ? document.getElementById('field-flash-text').value.trim() : "";
            if (flashText !== "") {
                previewCopertina.innerHTML += `
                <div class="feature-pill pulsing-flash" style="border-color: rgba(229, 193, 88, 0.3); background: rgba(229, 193, 88, 0.05);" onclick="apriDrawer('drawer-flash')">
                    <i class="fas fa-bolt" style="color: #e5c158; font-size: 0.8rem;"></i>
                    <span style="color: #e5c158;">${flashText.toUpperCase()}</span>
                </div>`;
            }

            const qaInput = document.getElementById('field-qa-label');
            const qaCopertina = document.getElementById('input-qa-copertina') && document.getElementById('input-qa-copertina').checked;
            let hasActionInRoom = false;

            if (qaInput && qaInput.value.trim() !== "") {
                const testoScelto = qaInput.value.trim().toUpperCase();
                if (qaCopertina) {
                    previewCopertina.innerHTML += `
                    <div class="feature-pill" style="border-color: rgba(16, 185, 129, 0.4); background: rgba(16, 185, 129, 0.08);" onclick="apriDrawer('drawer-quick')">
                        <i class="fas fa-rocket" style="color: #10b981; font-size: 0.8rem;"></i>
                        <span style="color: #10b981; font-weight: 700;">${testoScelto}</span>
                    </div>`;
                } else {
                    hasActionInRoom = true;
                }
            }

            // --- 2. ACCENSIONE STANZE (Puntano al nuovo overlay 1:1) ---
            const hasBio = document.getElementById('field-bio') && document.getElementById('field-bio').value.trim() !== "";
            const hasCV = document.getElementById('field-cv') && document.getElementById('field-cv').value.trim() !== "";
            roomIdentity.style.display = (hasBio || hasCV) ? 'flex' : 'none';
            roomIdentity.onclick = () => apriMacroAreaAnteprima('identity');

            const hasReview = document.getElementById('field-review-url') && document.getElementById('field-review-url').value.trim() !== "";
            const hasLead = document.getElementById('input-lead-attivo') && document.getElementById('input-lead-attivo').checked;
            roomBusiness.style.display = (hasReview || hasLead) ? 'flex' : 'none';
            roomBusiness.onclick = () => apriMacroAreaAnteprima('business');

            const hasVideo = document.getElementById('field-video-url') && document.getElementById('field-video-url').value.trim() !== "";
            const hasPdf = document.getElementById('field-pdf-url') && document.getElementById('field-pdf-url').value.trim() !== "";
            const galleryData = document.getElementById('field-gallery-data') ? document.getElementById('field-gallery-data').value : "[]";
            const hasGallery = galleryData !== "[]" && galleryData !== "";
            roomMedia.style.display = (hasVideo || hasPdf || hasGallery) ? 'flex' : 'none';
            roomMedia.onclick = () => apriMacroAreaAnteprima('media');

            const hasTel = document.getElementById('field-tel1') && document.getElementById('field-tel1').value.trim() !== "";
            const hasEmail = document.getElementById('field-email') && document.getElementById('field-email').value.trim() !== "";
            const hasSito = document.getElementById('field-sito') && document.getElementById('field-sito').value.trim() !== "";
            const trackSocial = document.getElementById('social-internal-track');
            const hasSocial = trackSocial && trackSocial.children.length > 0;
            const partnersData = document.getElementById('field-partners-data') ? document.getElementById('field-partners-data').value : "[]";
            const hasPartners = partnersData !== "[]" && partnersData !== "";
            roomNetwork.style.display = (hasTel || hasEmail || hasSito || hasSocial || hasPartners) ? 'flex' : 'none';
            roomNetwork.onclick = () => apriMacroAreaAnteprima('network');

            const hasQuickPass = document.getElementById('field-qp-premio-a') && document.getElementById('field-qp-premio-a').value.trim() !== "";
            const hasShop = document.getElementById('input-shop-attivo') && document.getElementById('input-shop-attivo').checked;
            roomAction.style.display = (hasQuickPass || hasShop || hasActionInRoom) ? 'flex' : 'none';
            roomAction.onclick = () => apriMacroAreaAnteprima('action_center');
        }

       let anteprimaMacroAreaCorrente = '';

        // --- 3. RENDERING SECONDO LIVELLO (SOTTOMENU LUXURY) ---
        function apriMacroAreaAnteprima(area) {
            const overlay = document.getElementById('overlaySezione');
            const titolo = document.getElementById('titoloSezione');
            const corpo = document.getElementById('corpoSezione');
            if(!overlay || !titolo || !corpo) return;

            anteprimaMacroAreaCorrente = area; // Salviamo lo stato per il tasto Indietro
            corpo.innerHTML = '';
            let html = '';
            
            // Stili clonati da tag.html per simulare la pulsantiera
            const btnStyle = "display: flex; flex-direction: column; justify-content: center; align-items: center; background: transparent; border: none; border-bottom: 1px solid rgba(255, 255, 255, 0.04); padding: 25px 10px; width: 100%; text-align: center; cursor: pointer;";
            const spanStyle = "font-size: 0.85rem; letter-spacing: 3px; font-weight: 300; color: #e8e8ed; margin-top: 12px; text-transform: uppercase;";
            const iconBase = "font-size: 1.6rem; opacity: 0.9;";

            if(area === 'identity') {
                titolo.textContent = 'IDENTITY';
                html += `<div style="${btnStyle}" onclick="apriSezioneAnteprima('qr')"><i class="fas fa-qrcode" style="${iconBase} color: #d4af37;"></i><span style="${spanStyle}">ACCESS TAG</span></div>`;
                
                const bio = document.getElementById('field-bio') ? document.getElementById('field-bio').value.trim() : "";
                if(bio) {
                    html += `<div style="${btnStyle}" onclick="apriSezioneAnteprima('bio')"><i class="fas fa-pen-nib" style="${iconBase} color: #fff;"></i><span style="${spanStyle}">BIOGRAFIA</span></div>`;
                }
                const cv = document.getElementById('field-cv') ? document.getElementById('field-cv').value.trim() : "";
                if(cv) html += `<div style="${btnStyle}" onclick="apriSezioneAnteprima('cv')"><i class="fas fa-file-alt" style="${iconBase} color: #fff;"></i><span style="${spanStyle}">CURRICULUM VITAE</span></div>`;
            }
            else if(area === 'business') {
                titolo.textContent = 'BUSINESS';
                const review = document.getElementById('field-review-url') ? document.getElementById('field-review-url').value.trim() : "";
                if(review) html += `<div style="${btnStyle}" onclick="apriSezioneAnteprima('review')"><i class="fas fa-star" style="${iconBase} color: #e5c158;"></i><span style="${spanStyle}">LASCIA UN FEEDBACK</span></div>`;
                
                const leadAttivo = document.getElementById('input-lead-attivo') && document.getElementById('input-lead-attivo').checked;
                if(leadAttivo) {
                    const leadTitolo = document.getElementById('input-lead-titolo') ? document.getElementById('input-lead-titolo').value.trim() : "Lascia il tuo contatto";
                    html += `<div style="margin-top: 25px; background: rgba(229, 193, 88, 0.05); border: 1px solid rgba(229, 193, 88, 0.3); padding: 20px; border-radius: 16px; text-align: left; width: 100%; box-sizing: border-box;"><div style="color: #e5c158; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 10px;"><i class="fas fa-bullseye"></i> Richiesta Contatto</div><div style="font-size: 0.8rem; color: #fff; margin-bottom: 16px;">${leadTitolo}</div><div style="background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); padding: 14px; border-radius: 10px; color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-bottom: 10px;">Il tuo Nome</div><div style="background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.15); padding: 14px; border-radius: 10px; color: rgba(255,255,255,0.5); font-size: 0.8rem; margin-bottom: 10px;">Email o Telefono</div><div style="background: #e5c158; color: #000; padding: 14px; border-radius: 10px; font-weight: 800; font-size: 0.8rem; text-align: center;">INVIA ORA</div></div>`;
                }
            }
            else if(area === 'media') {
                titolo.textContent = 'VETRINA';
                const pdfLabel = document.getElementById('field-pdf-label') ? document.getElementById('field-pdf-label').value.trim() : "DOCUMENTO PDF";
                const pdfUrl = document.getElementById('field-pdf-url') ? document.getElementById('field-pdf-url').value.trim() : "";
                if(pdfUrl) html += `<div style="${btnStyle}" onclick="apriSezioneAnteprima('pdf')"><i class="fas fa-file-pdf" style="${iconBase} color: #e5c158;"></i><span style="${spanStyle}">${pdfLabel}</span></div>`;
                
                const videoUrl = document.getElementById('field-video-url') ? document.getElementById('field-video-url').value.trim() : "";
                if(videoUrl) html += `<div style="${btnStyle} border: 1px solid rgba(229, 193, 88, 0.3); background: rgba(229, 193, 88, 0.05); border-radius: 14px; margin-bottom: 15px;" onclick="apriSezioneAnteprima('video')"><i class="fas fa-play-circle" style="${iconBase} color: #e5c158;"></i><span style="${spanStyle} color: #e5c158; font-weight: 600;">GUARDA IL VIDEO</span></div>`;
                
                const galleryData = document.getElementById('field-gallery-data') ? document.getElementById('field-gallery-data').value : "[]";
                let arrayFoto = []; try { arrayFoto = JSON.parse(galleryData); } catch(e){}
                if(arrayFoto.length > 0) html += `<div style="${btnStyle}" onclick="apriSezioneAnteprima('gallery')"><i class="fas fa-images" style="${iconBase} color: #fff;"></i><span style="${spanStyle}">GALLERIA IMMAGINI</span></div>`;
            }
            else if(area === 'network') {
                titolo.textContent = 'NETWORK';
                const sito = document.getElementById('field-sito') ? document.getElementById('field-sito').value.trim() : "";
                if(sito) html += `<div style="${btnStyle}" onclick="apriSezioneAnteprima('sito')"><i class="fas fa-globe" style="${iconBase} color: #fff;"></i><span style="${spanStyle}">SITO WEB UFFICIALE</span></div>`;
                
                const trackSocial = document.getElementById('social-internal-track');
                if(trackSocial && trackSocial.children.length > 0) html += `<div style="${btnStyle}" onclick="apriSezioneAnteprima('social')"><i class="fas fa-share-nodes" style="${iconBase} color: #fff;"></i><span style="${spanStyle}">SOCIAL & LINK</span></div>`;
                
                const tel = document.getElementById('field-tel1') ? document.getElementById('field-tel1').value.trim() : "";
                const email = document.getElementById('field-email') ? document.getElementById('field-email').value.trim() : "";
                if(tel || email) html += `<div style="${btnStyle}" onclick="apriSezioneAnteprima('contatti')"><i class="fas fa-address-card" style="${iconBase} color: #fff;"></i><span style="${spanStyle}">RUBRICA & CONTATTI</span></div>`;
                
                const partnersData = document.getElementById('field-partners-data') ? document.getElementById('field-partners-data').value : "[]";
                let partners = []; try { partners = JSON.parse(partnersData); } catch(e){}
                if(partners.length > 0) {
                    html += `<div style="margin: 20px 0 8px 0; font-size: 0.65rem; color: #e5c158; letter-spacing: 2px; text-transform: uppercase; font-weight: 600; text-align: left; width: 100%;">Cerchia di Fiducia</div>`;
                    partners.forEach(p => {
                        html += `<div style="${btnStyle} border: 1px solid rgba(229, 193, 88, 0.3); background: rgba(229, 193, 88, 0.05); border-radius: 14px; margin-bottom: 10px; cursor: default;"><i class="fas fa-handshake" style="${iconBase} color: #e5c158; margin-bottom: 8px;"></i><span style="font-weight: 600; font-size: 0.85rem; color: #fff; letter-spacing: 0.5px;">${p.nome}</span><span style="font-size: 0.6rem; color: rgba(229, 193, 88, 0.7); margin-top: 4px; letter-spacing: 1px; text-transform: uppercase;">Visita Partner ↗</span></div>`;
                    });
                }
            }
            else if(area === 'action_center') {
                titolo.textContent = 'ACTION CENTER';
                const qaInput = document.getElementById('field-qa-label');
                const qaCopertina = document.getElementById('input-qa-copertina') && document.getElementById('input-qa-copertina').checked;
                if(qaInput && qaInput.value.trim() !== "" && !qaCopertina) {
                    html += `<div style="${btnStyle}"><i class="fas fa-bolt" style="${iconBase} color: #d4af37;"></i><span style="${spanStyle}">${qaInput.value.toUpperCase()}</span></div>`;
                }
                const qpA = document.getElementById('field-qp-premio-a') ? document.getElementById('field-qp-premio-a').value.trim() : "";
                if(qpA) html += `<div style="${btnStyle}" onclick="apriSezioneAnteprima('quickpass')"><i class="fas fa-gift" style="${iconBase} color: #d4af37;"></i><span style="${spanStyle}">QUICK PASS</span></div>`;
                
                const shopAttivo = document.getElementById('input-shop-attivo') && document.getElementById('input-shop-attivo').checked;
                if(shopAttivo) html += `<div style="${btnStyle} border: 1px solid rgba(229, 193, 88, 0.3); background: rgba(229, 193, 88, 0.05); border-radius: 14px;"><i class="fas fa-shopping-cart" style="${iconBase} color: #e5c158;"></i><span style="${spanStyle} color: #e5c158;">ACQUISTO ISTANTANEO</span></div>`;
            }

            corpo.innerHTML = html;
            
            // Tasto Chiudi per le Macro Aree (Riporta alla Copertina)
            const btn = document.querySelector('#overlaySezione button');
            if(btn) {
                btn.innerHTML = '<i class="fas fa-times"></i> CHIUDI';
                btn.onclick = chiudiSezioneAnteprima;
            }

            overlay.style.display = 'flex';
            setTimeout(() => { overlay.style.opacity = '1'; }, 10);
        }

        // --- 4. RENDERING TERZO LIVELLO (IL DETTAGLIO DELLA SEZIONE - 1:1 CON TAG.HTML) ---
        function apriSezioneAnteprima(tipo) {
            const titolo = document.getElementById('titoloSezione');
            const corpo = document.getElementById('corpoSezione');
            
            const btn = document.querySelector('#overlaySezione button');
            if(btn) {
                btn.innerHTML = '<i class="fas fa-chevron-left"></i> INDIETRO';
                btn.onclick = () => apriMacroAreaAnteprima(anteprimaMacroAreaCorrente);
            }

            // Calcolo del colore dinamico del tema per i bordi e le icone (esattamente come su tag.html)
            const theme = document.querySelector('input[name="digital_style"]:checked')?.value || 'black_dna';
            let themeBorder = 'rgba(255, 255, 255, 0.3)';
            if(theme === 'emerald') themeBorder = '#00E680';
            if(theme === 'obsidian_gold') themeBorder = '#e5c158';
            if(theme === 'satin_rose') themeBorder = '#c8968e';
            if(theme === 'titanium') themeBorder = '#b0b0b5';

            // Il bottone di condivisione standard usato in tag.html
            const btnCondividiHTML = `<button style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:#ffffff; padding:7px 10px; border-radius:8px; cursor:default; flex-shrink:0;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg></button>`;

           if (tipo === 'bio') {
                titolo.textContent = 'BIOGRAFIA';
                const bio = document.getElementById('field-bio') ? document.getElementById('field-bio').value.trim() : "";
                corpo.innerHTML = `<div class="testo-lettura">${bio.replace(/\n/g, '<br>')}</div>`;
            }
            else if (tipo === 'qr') {
                titolo.textContent = 'ACCESS TAG';
                corpo.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; gap:20px; padding-top: 20px;">
                        <div style="width:190px; height:190px; border-radius: 20px; padding:10px; background:#fff; display:flex; justify-content:center; align-items:center;">
                            <i class="fas fa-qrcode" style="font-size: 5rem; color: #000;"></i>
                        </div>
                        <div style="font-size: 0.8rem; color: #86868b; text-align: center; line-height: 1.5;">Simulazione QR Code in anteprima.<br>La condivisione è disabilitata.</div>
                    </div>`;
            }
            else if (tipo === 'sito') {
                titolo.textContent = 'SITO WEB';
                const sito = document.getElementById('field-sito') ? document.getElementById('field-sito').value.trim() : "";
                const dominioPulito = sito.replace(/https?:\/\/(www\.)?/, '').split('/')[0];
                corpo.innerHTML = `
                    <div style="display:flex; align-items:center; gap:12px; padding:14px 0; border-bottom:1px solid rgba(255,255,255,0.06); width: 100%;">
                        <div style="display:flex; align-items:center; gap:12px; flex:1; text-decoration:none; color:inherit;">
                            <i class="fas fa-globe" style="font-size:1.1rem; width:22px; text-align:center; color:#ffffff;"></i>
                            <span style="font-size:0.95rem; color:#f5f5f7; font-weight:500;">${dominioPulito || sito}</span>
                        </div>
                        ${btnCondividiHTML}
                    </div>`;
            }
            else if (tipo === 'contatti') {
                titolo.textContent = 'CONTATTI';
                const tel = document.getElementById('field-tel1') ? document.getElementById('field-tel1').value.trim() : "";
                const email = document.getElementById('field-email') ? document.getElementById('field-email').value.trim() : "";
                let html = '';
                
                if(tel) {
                    html += `
                    <div style="display:flex; align-items:center; gap:12px; padding:14px 0; border-bottom:1px solid rgba(255,255,255,0.06); width: 100%;">
                        <div style="display:flex; align-items:center; gap:12px; flex:1; text-decoration:none; color:inherit;">
                            <i class="fas fa-phone" style="font-size:1.1rem; width:22px; text-align:center; color:#ffffff;"></i>
                            <span style="font-size:0.9rem; color:#f5f5f7;">${tel}</span>
                        </div>
                        ${btnCondividiHTML}
                    </div>`;
                }
                if(email) {
                    html += `
                    <div style="display:flex; align-items:center; gap:12px; padding:14px 0; border-bottom:1px solid rgba(255,255,255,0.06); width: 100%;">
                        <div style="display:flex; align-items:center; gap:12px; flex:1; text-decoration:none; color:inherit;">
                            <i class="fas fa-envelope" style="font-size:1.1rem; width:22px; text-align:center; color:#ffffff;"></i>
                            <span style="font-size:0.9rem; color:#f5f5f7;">${email}</span>
                        </div>
                        ${btnCondividiHTML}
                    </div>`;
                }

                // INSERIMENTO 1:1 DEL BOTTONE SALVA IN RUBRICA
                html += `
                <div style="width: 100%; margin-top: 25px; padding: 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid ${themeBorder}; border-radius: 12px; color: #e8e8ed; font-size: 0.8rem; font-weight: 300; letter-spacing: 3px; text-transform: uppercase; cursor: default; display: flex; justify-content: center; align-items: center; gap: 12px; box-shadow: 0 10px 20px rgba(0,0,0,0.2); box-sizing: border-box;">
                    <i class="fas fa-address-book" style="font-size: 1.15rem; color: ${themeBorder};"></i> SALVA IN RUBRICA
                </div>`;

                corpo.innerHTML = html;
            }
            else if (tipo === 'social') {
                titolo.textContent = 'SOCIAL E LINK';
                const trackSocial = document.getElementById('social-internal-track');
                let html = '';
                if(trackSocial) {
                    trackSocial.querySelectorAll('.social-block-live').forEach(block => {
                        const nome = block.getAttribute('data-nome');
                        const icona = block.getAttribute('data-icon') || "fas fa-link";
                        const isVip = block.getAttribute('data-vip') === 'true';
                        const lockHtml = isVip ? `<i class="fas fa-lock" style="color: #e5c158; font-size: 0.8rem; margin-left: 8px;"></i>` : '';

                        html += `
                        <div style="display:flex; align-items:center; gap:12px; padding:14px 0; border-bottom:1px solid rgba(255,255,255,0.06); width: 100%;">
                            <div style="display:flex; align-items:center; gap:12px; flex:1; text-decoration:none; color:inherit;">
                                <i class="${icona}" style="font-size:1.2rem; width:22px; text-align:center; color:#ffffff;"></i>
                                <span style="font-size:0.95rem; font-weight:500;">${nome}</span>${lockHtml}
                            </div>
                            ${btnCondividiHTML}
                        </div>`;
                    });
                }
                corpo.innerHTML = html;
            }
            else if (tipo === 'cv' || tipo === 'pdf') {
                // Legge il link reale direttamente dal campo nascosto dell'editor
                let pdfLink = tipo === 'cv' ? document.getElementById('field-cv').value : document.getElementById('field-pdf-url').value;
                
                if (pdfLink) {
                    // Normalizza l'URL per sicurezza
                    if (pdfLink.startsWith('http://')) {
                        pdfLink = pdfLink.replace('http://', 'https://');
                    } else if (!pdfLink.startsWith('https://') && !pdfLink.startsWith('/')) {
                        pdfLink = 'https://' + pdfLink;
                    }
                    // Apre il PDF in una nuova scheda pulita
                    window.open(pdfLink, '_blank', 'noopener noreferrer');
                }
                
                // Chiude dolcemente la finestra di overlay per non lasciarla bloccata al ritorno
                chiudiSezioneAnteprima();
                return;
            }
            else if (tipo === 'video') {
                titolo.textContent = 'SMART VIDEO';
                corpo.innerHTML = `<div style="padding: 40px; text-align: center;"><i class="fas fa-play-circle" style="font-size: 3rem; color: #10b981; margin-bottom: 15px;"></i><br><span style="color: #fff; font-size: 0.9rem;">Player Video attivo solo nella versione live.</span></div>`;
            }
            else if (tipo === 'gallery') {
                titolo.textContent = 'GALLERY';
                const galleryData = document.getElementById('field-gallery-data') ? document.getElementById('field-gallery-data').value : "[]";
                let arrayFoto = []; try { arrayFoto = JSON.parse(galleryData); } catch(e){}
                let html = '<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; padding: 15px 0;">';
                arrayFoto.forEach(url => {
                    html += `<div style="aspect-ratio: 1; border-radius: 8px; background-image: url('${url}'); background-size: cover; background-position: center; border: 1px solid rgba(255,255,255,0.08);"></div>`;
                });
                html += '</div>';
                corpo.innerHTML = html;
            }
            else if (tipo === 'review') {
                titolo.textContent = 'IL TUO FEEDBACK';
                corpo.innerHTML = `<div style="text-align:center; padding:10px 0; font-size:1.05rem; font-weight:300; color:#fff; line-height:1.6;">Come valuti la tua esperienza?</div><div style="display: flex; justify-content: center; gap: 12px; margin-top: 15px; margin-bottom: 25px;"><i class="far fa-star" style="font-size: 2.2rem; color: rgba(255,255,255,0.2);"></i><i class="far fa-star" style="font-size: 2.2rem; color: rgba(255,255,255,0.2);"></i><i class="far fa-star" style="font-size: 2.2rem; color: rgba(255,255,255,0.2);"></i><i class="far fa-star" style="font-size: 2.2rem; color: rgba(255,255,255,0.2);"></i><i class="far fa-star" style="font-size: 2.2rem; color: rgba(255,255,255,0.2);"></i></div>`;
            }
            else if (tipo === 'quickpass') {
                titolo.textContent = 'QUICK PASS';
                const pB = document.getElementById('field-qp-premio-b') ? document.getElementById('field-qp-premio-b').value : "Regalo";
                const pA = document.getElementById('field-qp-premio-a') ? document.getElementById('field-qp-premio-a').value : "Premio";
                corpo.innerHTML = `<div style="display: flex; flex-direction: column; width: 100%; align-items: center; gap: 20px; padding-top: 15px;"><i class="fas fa-gift" style="font-size: 3.5rem; color: #d4af37;"></i><div style="text-align:center; font-size:1rem; font-weight:300; color:#e8e8ed; line-height:1.6;">Regala <strong style="color:#fff;">${pB}</strong> a un amico.<br>Quando lo utilizzerà, tu sbloccherai:</div><div style="width: 100%; padding: 25px 20px; background: rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.05); border-left: 2px solid #d4af37; border-radius: 20px; display: flex; flex-direction: column; align-items: center;"><span style="font-size: 0.75rem; color: rgba(255,255,255,0.4); letter-spacing: 4px; text-transform: uppercase; margin-bottom: 12px;">IL TUO PREMIO</span><span style="font-size: 1.25rem; font-weight: 600; color: #fff; letter-spacing: 2px; text-align: center; text-transform: uppercase;">${pA}</span></div></div>`;
            }
        }
        function chiudiSezioneAnteprima() {
            const overlay = document.getElementById('overlaySezione');
            if(overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 400);
            }
        }
        function chiudiSezioneAnteprima() {
            const overlay = document.getElementById('overlaySezione');
            if(overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => { overlay.style.display = 'none'; }, 400);
            }
        }
      function sbloccaTagPreview() {
            const container = document.getElementById('profile-content');
            if (!container || !container.classList.contains('locked')) return;
            container.classList.remove('locked');
            container.classList.add('unlocked');
            
            // Nasconde dolcemente il tasto Editor
            const telecomando = document.querySelector('div[onclick="apriDrawer(\'drawer-master\')"]');
            if(telecomando) {
                telecomando.style.transition = 'opacity 0.4s ease';
                telecomando.style.opacity = '0';
                telecomando.style.pointerEvents = 'none';
            }
        }

        function bloccaTagPreview() {
            const container = document.getElementById('profile-content');
            if (!container || !container.classList.contains('unlocked')) return;
            container.classList.remove('unlocked');
            container.classList.add('locked');
            
            // Fa riapparire il tasto Editor
            const telecomando = document.querySelector('div[onclick="apriDrawer(\'drawer-master\')"]');
            if(telecomando) {
                telecomando.style.transition = 'opacity 0.4s ease';
                telecomando.style.opacity = '1';
                telecomando.style.pointerEvents = 'auto';
            }
        }
       
   // 1. MOTORE DI APERTURA (Con Router di Cronologia)
        function apriDrawer(idDrawer) {
            const masterDrawer = document.getElementById('drawer-master');
            
            if (idDrawer === 'drawer-master' && window.entratoDaPreview === true) {
                window.entratoDaPreview = false; 
                chiudiSenzaSalvare(); 
                return; 
            }

            if (idDrawer.startsWith('env-')) {
                if (masterDrawer && !masterDrawer.classList.contains('open')) window.entratoDaPreview = true;
                else if (masterDrawer && masterDrawer.classList.contains('open')) window.entratoDaPreview = false;
            }
            
            const esclusiveGold = ['drawer-review', 'drawer-lead-capture', 'drawer-live-status', 'drawer-flash', 'drawer-shop', 'drawer-quickpass', 'drawer-video', 'drawer-showcase']; 
            if (esclusiveGold.includes(idDrawer) && userPlan !== 'GOLD') {
                mostraPopupPremium("ESCLUSIVA GOLD 👑", "Questa funzione è un'esclusiva del piano GOLD.<br><br>Premi GESTIONE PIANI per sbloccarla e iniziare a monetizzare.", "GOLD");
                return;
            }

            const esclusivePremium = ['drawer-gallery', 'drawer-quick']; 
            if (esclusivePremium.includes(idDrawer) && userPlan === 'BASE') {
                mostraPopupPremium("ESCLUSIVA PREMIUM 🚀", "Questa funzione richiede almeno il piano PREMIUM.<br><br>Premi GESTIONE PIANI per espandere la tua vetrina e i tuoi contatti.", "PREMIUM");
                return;
            } 

            const drawerTarget = document.getElementById(idDrawer);
            const backdrop = document.getElementById('drawer-backdrop');
            
            document.querySelectorAll('#dynamic-trigger-area').forEach(el => {
                el.style.opacity = '0';
                el.style.pointerEvents = 'none';
            });

            if (backdrop) backdrop.classList.add('active');

            if (drawerTarget) {
                drawerTarget.style.zIndex = "9999"; 
                drawerTarget.style.pointerEvents = "auto"; 
                setTimeout(() => { drawerTarget.classList.add('open'); }, 10);
            }

            setTimeout(() => {
                document.querySelectorAll('.drawer-glass').forEach(d => {
                    if (d.id !== idDrawer) {
                        d.classList.remove('open');
                        d.style.zIndex = "2000"; 
                    }
                });
            }, 300);

            // 🎯 IL BISTURI: Registra l'ID esatto del cassetto per creare i "passi" per il tasto indietro
            if (window.location.hash !== '#' + idDrawer) {
                history.pushState({ drawer: idDrawer }, "", "#" + idDrawer);
            }
        }

      // 2. MOTORE DI CHIUSURA (Silenzioso ma con salvataggio garantito)
        function chiudiSenzaSalvare() {
            eseguiChiusuraGrafica();
            
            // FIX: Assicura il salvataggio quando si preme "SALVA"
            if(typeof eseguiAutoSaveInvisibile === 'function') eseguiAutoSaveInvisibile();

            // Promemoria discreto: solo se è stata davvero fatta una modifica
            if (formModificato && typeof mostraPromemoriaPubblica === 'function') {
                mostraPromemoriaPubblica();
                formModificato = false;
            }
            
            // Pulisce l'URL svuotando l'hash in modo silenzioso, senza far scattare falsi ritorni
            if (window.location.hash !== '') {
                history.replaceState(null, "", window.location.pathname + window.location.search);
            }
        }

        // 2b. TOAST: mostra e poi nasconde da solo il promemoria "Applicato"
        function mostraPromemoriaPubblica() {
            const toast = document.getElementById('toast-applica');
            if (!toast) return;
            toast.style.opacity = "1";
            toast.style.transform = "translateX(-50%) translateY(0)";
            clearTimeout(window._toastApplicaTimer);
            window._toastApplicaTimer = setTimeout(() => {
                toast.style.opacity = "0";
                toast.style.transform = "translateX(-50%) translateY(20px)";
            }, 2200);
        }

        // 3. CHIUSURA GRAFICA (Intatta)
        function eseguiChiusuraGrafica() {
            document.querySelectorAll('.drawer-glass').forEach(d => {
                d.classList.remove('open');
                d.style.zIndex = "2000";
            });
            const backdrop = document.getElementById('drawer-backdrop');
            if (backdrop) {
                setTimeout(() => backdrop.classList.remove('active'), 300);
            }
        }

        // 4. IL CERVELLO DEL TASTO ANDROID (Ascolta e naviga a ritroso)
        window.addEventListener('popstate', function(event) {
            const hash = window.location.hash;
            const insightDrawer = document.getElementById('drawer-insight');
            const strategiaDrawer = document.getElementById('drawer-strategia'); 
            const overlayPremium = document.getElementById('premium-alert-overlay');
            const overlayAnteprima = document.getElementById('overlaySezione');

            // Livello Superiore: chiude i popup se aperti
            if (overlayPremium && overlayPremium.style.display === 'flex') {
                chiudiPremiumAlert();
                return;
            }
            if (insightDrawer && insightDrawer.classList.contains('open')) {
                insightDrawer.classList.remove('open');
                return;
            }
            if (strategiaDrawer && strategiaDrawer.classList.contains('open')) { 
                strategiaDrawer.classList.remove('open');
                return;
            }
            if (overlayAnteprima && overlayAnteprima.style.display === 'flex' && hash === '') {
                chiudiSezioneAnteprima();
                return;
            }

            // 🎯 ROUTING DEI CASSETTI (Il fix per il tasto Indietro)
            if (hash === '' || hash === '#') {
                // Hash vuoto: siamo tornati alla base. Chiudi tutto.
                eseguiChiusuraGrafica();
            } else {
                // L'hash ci dice esattamente dove eravamo prima (es. #env-identity)
                const targetId = hash.substring(1); 
                const cassettoDaRiaprire = document.getElementById(targetId);
                
                if (cassettoDaRiaprire && cassettoDaRiaprire.classList.contains('drawer-glass')) {
                    // Chiudi tutti gli altri cassetti
                    document.querySelectorAll('.drawer-glass').forEach(d => {
                        if (d.id !== targetId) {
                            d.classList.remove('open');
                            d.style.zIndex = "2000";
                        }
                    });
                    
                    // Riaccendi solo il cassetto precedente
                    const backdrop = document.getElementById('drawer-backdrop');
                    if (backdrop) backdrop.classList.add('active');
                    
                    cassettoDaRiaprire.style.zIndex = "9999";
                    cassettoDaRiaprire.style.pointerEvents = "auto";
                    cassettoDaRiaprire.classList.add('open');
                }
            }
        });
        // ==========================================
        // 💾 IL MOTORE DI SALVATAGGIO (Riscritto per WYSIWYG)
        // ==========================================
        function raccogliDatiDalForm() {
            const displayVal = document.getElementById("field-username_display")?.value.trim() || "";
            const styleVal = document.querySelector('input[name="digital_style"]:checked')?.value || "black_dna";
            const layoutVal = document.querySelector('input[name="digital_layout"]:checked')?.value || "badge";
            const qaCopertina = document.getElementById('input-qa-copertina') ? document.getElementById('input-qa-copertina').checked : false;

            const vcfObject = {
                telefono1: document.getElementById('field-tel1')?.value.trim() || "",
                telefono2: document.getElementById('field-tel2')?.value.trim() || "",
                indirizzo: document.getElementById('field-indirizzo')?.value.trim() || ""
            };

            const canaliSocial = [];
            const internalTrack = document.getElementById('social-internal-track');
            if (internalTrack) {
                internalTrack.querySelectorAll('.social-block-live').forEach(block => {
                    canaliSocial.push({ 
                        nome: block.getAttribute('data-nome'), url: block.getAttribute('data-url'),
                        vip: block.getAttribute('data-vip') === 'true', pin: block.getAttribute('data-pin') || "",
                        official: block.getAttribute('data-official') === 'true', iconClass: block.getAttribute('data-icon') || "fas fa-link"
                    });
                });
            }

            return { 
                username_system: NOME_SISTEMA, 
                username_display: displayVal ? '@' + displayVal.toUpperCase() : '@' + NOME_SISTEMA.toUpperCase(), 
                digital_style: styleVal, digital_layout: layoutVal, 
                bio: document.getElementById('field-bio')?.value.trim() || "", 
                sito_web: document.getElementById('field-sito')?.value.trim() || "", 
                email: document.getElementById('field-email')?.value.trim() || "",
                quick_action_tipo: document.getElementById('field-qa-tipo')?.value || "", 
                quick_action_label: document.getElementById('field-qa-label')?.value.trim() || "", 
                quick_action_url: document.getElementById('field-qa-url')?.value.trim() || "", 
                quick_action_copertina: qaCopertina ? 'true' : 'false',
                avatar_url: document.getElementById('field-avatar-url')?.value || "", 
                partners_data: document.getElementById('field-partners-data')?.value || "[]",
                live_status_color: document.getElementById('field-status-color')?.value || "", 
                live_status_text: document.getElementById('field-status-text')?.value.trim() || "",   
                live_status_action_type: document.getElementById('field-status-action-type')?.value || "nessuna", 
                live_status_action_label: document.getElementById('field-status-action-label')?.value.trim() || "", 
                live_status_action_url: document.getElementById('field-status-action-url')?.value.trim() || "",
                lead_capture_attivo: document.getElementById('input-lead-attivo')?.checked ? 'true' : 'false', 
                lead_capture_titolo: document.getElementById('input-lead-titolo')?.value.trim() || "", 
                lead_capture_leads: document.getElementById('field-lead-leads-data')?.value || "[]",
                flash_text: document.getElementById('field-flash-text')?.value.trim() || "", 
                flash_expiry: document.getElementById('field-flash-text')?.value.trim() !== "" ? new Date(Date.now() + 86400000).toISOString() : "",
                pdf_label: document.getElementById('field-pdf-label')?.value.trim() || "", 
                pdf_url: document.getElementById('field-pdf-url')?.value || "",      
                gallery_data: document.getElementById('field-gallery-data')?.value || "[]", 
                cv: document.getElementById('field-cv')?.value.trim() || "",
                quickpass_premio_a: document.getElementById('field-qp-premio-a')?.value.trim() || "", 
                quickpass_premio_b: document.getElementById('field-qp-premio-b')?.value.trim() || "", 
                quickpass_limite: document.getElementById('field-qp-limite')?.value || "", 
                quickpass_scadenza: document.getElementById('field-qp-scadenza')?.value || "",
                modulo_vcf: JSON.stringify(vcfObject), 
                config_canali: JSON.stringify(canaliSocial), 
                review_url: document.getElementById('field-review-url')?.value.trim() || "", 
                review_contact: document.getElementById('field-review-contact')?.value.trim() || "", 
                video_url: document.getElementById('field-video-url')?.value.trim() || "", 
                video_cta_text: document.getElementById('field-video-cta-text')?.value.trim() || "", 
                video_cta_url: document.getElementById('field-video-cta-url')?.value.trim() || "",
                shop_attivo: document.getElementById('input-shop-attivo')?.checked ? 'true' : 'false', 
                shop_titolo: document.getElementById('input-shop-titolo')?.value.trim() || "", 
                shop_prezzo: document.getElementById('input-shop-prezzo')?.value.trim() || "", 
                shop_link: document.getElementById('input-shop-link')?.value.trim() || "", 
                shop_scadenza: document.getElementById('input-shop-scadenza')?.value || ""
            }; 
        } 

 let ultimaFotografiaDati = null; 

    async function eseguiAutoSaveInvisibile() {
            if(NOME_SISTEMA === "tuonome.it" || isLoadingDati) return;
            const payloadDati = raccogliDatiDalForm();
            
            // AGGIUNGI QUESTA RIGA: Salva tutto nel disco del telefono
            localStorage.setItem('mqt_draft_full_' + NOME_SISTEMA, JSON.stringify(payloadDati));

            localStorage.setItem('mqt_cache_' + NOME_SISTEMA, payloadDati.username_display);
            localStorage.setItem('mqt_theme_' + NOME_SISTEMA, payloadDati.digital_style);
            localStorage.setItem('mqt_layout_' + NOME_SISTEMA, payloadDati.digital_layout);
            applicaTemaLive();
        }

        // 2. FUNZIONE DI VERIFICA (Recuperata dal vecchio file)
        function verificaCompletamentoBase() {
            const bioVal = document.getElementById('field-bio') ? document.getElementById('field-bio').value.trim() : "";
            const sitoVal = document.getElementById('field-sito') ? document.getElementById('field-sito').value.trim() : "";
            const emailVal = document.getElementById('field-email') ? document.getElementById('field-email').value.trim() : "";
            const tel1Val = document.getElementById('field-tel1') ? document.getElementById('field-tel1').value.trim() : "";
            const internalTrack = document.getElementById('social-internal-track');
            const haSocial = internalTrack && internalTrack.children.length > 0;

            return (bioVal !== "" || sitoVal !== "" || emailVal !== "" || tel1Val !== "" || haSocial);
        }

        // 3. IL TASTONE VERDE (Apre il bivio o manda in cassa)
        function gestisciAzioneMaster() {
            if (statoUtente === 'attivo') {
                apriDrawer('drawer-salvataggio');
            } else {
                if (verificaCompletamentoBase()) {
                    salvaEDirigi('checkout');
                } else {
                    alert("⚠️ Configurazione Incompleta\n\nPrima di procedere devi inserire almeno un contenuto nella tua tag.\nCompila almeno uno di questi campi:\n- Biografia\n- Sito Web\n- Email o Telefono\n- Un Canale Social");
                }
            }
        }

        // 4. IL VERO MOTORE DI SALVATAGGIO API (Su comando manuale)
        async function salvaEDirigi(azione) {
            const payloadDati = raccogliDatiDalForm();
            
            // Chiudiamo graficamente i cassetti
            document.querySelectorAll('.drawer-glass').forEach(d => d.classList.remove('open'));
            const backdrop = document.getElementById('drawer-backdrop');
            if (backdrop) backdrop.classList.remove('active');

            try {
                const btnMasterText = document.getElementById('master-action-text');
                const testoOriginale = btnMasterText ? btnMasterText.innerText : "PUBBLICA ONLINE";
                if(btnMasterText) btnMasterText.innerText = "ELABORAZIONE...";

                let bodyRichiesta = {};
                if (azione === 'pubblica') {
                    // Svuota la bozza e pubblica ufficialmente
                    bodyRichiesta = { ...payloadDati, draft_json: "" }; 
                } else {
                    // Invia i dati SOLO alla colonna draft_json
                    bodyRichiesta = { username_system: NOME_SISTEMA, draft_json: JSON.stringify(payloadDati) };
                }

                const response = await fetch('/api/update-profile', { 
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyRichiesta) 
                });
                
                const data = await response.json();
                
                if (data.success) {
                    window.onbeforeunload = null; // Rimuove eventuali blocchi di uscita
                    localStorage.removeItem('mqt_draft_full_' + NOME_SISTEMA);
                    if (azione === 'checkout') {
                        window.location.href = `/checkout.html?u=${NOME_SISTEMA}`;
                    } else if (azione === 'bozza') {
                        window.location.href = `/profile.html`; 
                    } else if (azione === 'pubblica') {
                        window.location.href = `/tag.html?u=${NOME_SISTEMA}`; 
                    }
                } else {
                    alert("Errore durante il salvataggio. Riprova.");
                    if (btnMasterText) btnMasterText.innerText = testoOriginale;
                }
            } catch (error) { 
                console.error("Errore API:", error); 
                alert("Errore di rete. Controlla la connessione.");
                const btnMasterText = document.getElementById('master-action-text');
                if (btnMasterText) btnMasterText.innerText = "RIPROVA";
            }
        }
        // ==========================================
        // MOTORE DI CARICAMENTO E SUPPORTO (Invariati)
        // ==========================================
        function applicaTemaLive() {
            const temaInput = document.querySelector('input[name="digital_style"]:checked');
            const layoutInput = document.querySelector('input[name="digital_layout"]:checked');
            const profileContent = document.getElementById('profile-content');

            if(temaInput && profileContent) { profileContent.setAttribute('data-theme', temaInput.value); }
            if(layoutInput && profileContent) { profileContent.setAttribute('data-layout', layoutInput.value); }
            
            const fieldDisplay = document.getElementById('field-username_display');
            if(fieldDisplay && fieldDisplay.value.trim() !== '') formattaBadge(fieldDisplay.value);

            aggiornaAnteprimaLive();
        }

       function formattaBadge(testoBruto) {
            const el = document.getElementById('tag-username');
            if(!el) return;
            if (!testoBruto) testoBruto = "TUONOME";
            let testo = testoBruto.replace(/[\s\u00A0]+/g, ' ').trim().toUpperCase();
            if(testo.startsWith('@')) { testo = testo.substring(1).trim(); }

            // L'ancoraggio esatto della @ come in tag.html
            el.innerHTML = `<span class="brand-text" style="position: relative;"><span class="at-symbol" style="position: absolute; right: 100%; padding-right: 4px; opacity: 0.4; font-weight: 300;">@</span>${testo}</span>`;

            el.style.whiteSpace = "normal"; el.style.wordBreak = "normal"; el.style.overflowWrap = "break-word";

            if (testo.length > 25) { el.style.fontSize = "0.85rem"; } 
            else if (testo.length > 18) { el.style.fontSize = "0.95rem"; } 
            else { el.style.fontSize = "1.05rem"; }
            
            // IL BISTURI PER IL DIVIDER: Nessun blocco sugli spazi, segue solo la naturale larghezza dei caratteri
            const wrapper = document.getElementById('name-capsule-wrapper');
            if (wrapper) {
                if (testo.length < 16) {
                    wrapper.classList.add('nome-corto');
                } else {
                    wrapper.classList.remove('nome-corto');
                }
            }
        }
      async function inizializzaPagina() {  
            if(NOME_SISTEMA === "tuonome.it") {
                isLoadingDati = false;
                
                return; 
            }
            try {
                const response = await fetch(`/api/get-profile?u=${NOME_SISTEMA}`);
                const data = await response.json();

                statoUtente = (data.fields?.stato || 'in attesa').toLowerCase().trim();
                userPlan = (data.fields?.plan || 'BASE').toUpperCase().trim();

                const pianoSimulato = localStorage.getItem('mqt_temp_plan_' + NOME_SISTEMA);
                if (pianoSimulato) userPlan = pianoSimulato;
                
               // ========================================================
                // MOTORE SAAS DI SELF-HEALING (Sincronizzazione Intelligente)
                // ========================================================
                let liveData = data.fields || data;
                let f = { ...liveData }; // 1. La roccia: Partiamo dai dati LIVE ufficiali
                const localDraft = localStorage.getItem('mqt_draft_full_' + NOME_SISTEMA);
                if (localDraft) {
                    try { Object.assign(f, JSON.parse(localDraft)); } catch(e) {}
                }

                if (liveData.draft_json && liveData.draft_json.trim() !== "") {
                    try {
                        let draftData = JSON.parse(liveData.draft_json);
                        
                        // 2. DIAGNOSTICA: La bozza è corrotta dal nostro vecchio bug?
                        // Se nel live c'è un logo, ma nella bozza è sparito, è un'anomalia di sistema.
                        let isBozzaCorrotta = !draftData.avatar_url && liveData.avatar_url;

                        if (isBozzaCorrotta) {
                            // 3. AUTO-CURA: Iniettiamo i parametri vitali dal Live alla Bozza
                            console.warn("myquicktag: Rilevata bozza corrotta. Ripristino asset dal database Live.");
                            draftData.avatar_url = liveData.avatar_url;
                            draftData.digital_style = liveData.digital_style;
                            draftData.digital_layout = liveData.digital_layout;
                        }

                        // 4. FUSIONE: La bozza (ora curata) si sovrappone al live
                        f = { ...liveData, ...draftData };

                    } catch(e) {
                        console.error("myquicktag: Errore lettura bozza. Fallback forzato sui dati Live.");
                    }
                }

                // FIX: la bozza locale (non ancora sincronizzata col server) deve avere sempre priorità
                // sull'ultimo merge, altrimenti le modifiche fatte con "SALVA BIO" ecc. spariscono al refresh
                if (localDraft) {
                    try { Object.assign(f, JSON.parse(localDraft)); } catch(e) {}
                }
                // ========================================================

                if (f) {
                    if (f.digital_style) { localStorage.setItem('mqt_theme_' + NOME_SISTEMA, f.digital_style); const radioTheme = document.querySelector(`input[name="digital_style"][value="${f.digital_style}"]`); if (radioTheme) radioTheme.checked = true; }
                    if (f.digital_layout) { localStorage.setItem('mqt_layout_' + NOME_SISTEMA, f.digital_layout); const radioLayout = document.querySelector(`input[name="digital_layout"][value="${f.digital_layout}"]`); if (radioLayout) radioLayout.checked = true; }

                    const nomeDaMostrare = f.username_display || NOME_SISTEMA;
                    if (nomeDaMostrare && nomeDaMostrare !== "tuonome.it") {
                        const inputField = document.getElementById('field-username_display');
                        if (inputField) inputField.value = nomeDaMostrare.replace('@', '');
                        localStorage.setItem('mqt_cache_' + NOME_SISTEMA, nomeDaMostrare); 
                        formattaBadge(nomeDaMostrare);
                    }

                    if (f.bio && document.getElementById('field-bio')) document.getElementById('field-bio').value = f.bio;
                    if (f.sito_web && document.getElementById('field-sito')) document.getElementById('field-sito').value = f.sito_web;
                    if (f.email && document.getElementById('field-email')) document.getElementById('field-email').value = f.email;

                    if (f.quick_action_tipo && document.getElementById('field-qa-tipo')) document.getElementById('field-qa-tipo').value = f.quick_action_tipo;
                    if (f.quick_action_label && document.getElementById('field-qa-label')) document.getElementById('field-qa-label').value = f.quick_action_label;
                    if (f.quick_action_url && document.getElementById('field-qa-url')) document.getElementById('field-qa-url').value = f.quick_action_url;
                    if (document.getElementById('input-qa-copertina')) document.getElementById('input-qa-copertina').checked = (f.quick_action_copertina === 'true');

                    if (f.live_status_color) selezionaStatus(f.live_status_color);
                    if (f.live_status_text && document.getElementById('field-status-text')) document.getElementById('field-status-text').value = f.live_status_text;

                    if (f.live_status_action_type && document.getElementById('field-status-action-type')) {
                        document.getElementById('field-status-action-type').value = f.live_status_action_type;
                        if (f.live_status_action_type !== 'nessuna') {
                            document.getElementById('status-action-container').style.display = 'flex';
                            document.getElementById('status-action-details').style.display = 'flex';
                            if (f.live_status_action_label) document.getElementById('field-status-action-label').value = f.live_status_action_label;
                            if (f.live_status_action_url) document.getElementById('field-status-action-url').value = f.live_status_action_url;
                        }
                    }

                    if (document.getElementById('input-shop-attivo')) document.getElementById('input-shop-attivo').checked = (f.shop_attivo === 'true');
                    if (f.shop_titolo && document.getElementById('input-shop-titolo')) document.getElementById('input-shop-titolo').value = f.shop_titolo;
                    if (f.shop_prezzo && document.getElementById('input-shop-prezzo')) document.getElementById('input-shop-prezzo').value = f.shop_prezzo;
                    if (f.shop_link && document.getElementById('input-shop-link')) document.getElementById('input-shop-link').value = f.shop_link;
                    if (f.shop_scadenza && document.getElementById('input-shop-scadenza')) document.getElementById('input-shop-scadenza').value = f.shop_scadenza;

                    if (f.review_url && document.getElementById('field-review-url')) document.getElementById('field-review-url').value = f.review_url;
                    if (f.review_contact && document.getElementById('field-review-contact')) document.getElementById('field-review-contact').value = f.review_contact;
                    
                    if (f.video_url && document.getElementById('field-video-url')) document.getElementById('field-video-url').value = f.video_url;
                    if (f.video_cta_text && document.getElementById('field-video-cta-text')) document.getElementById('field-video-cta-text').value = f.video_cta_text;
                    if (f.video_cta_url && document.getElementById('field-video-cta-url')) document.getElementById('field-video-cta-url').value = f.video_cta_url; 

                    if (f.flash_text && document.getElementById('field-flash-text')) document.getElementById('field-flash-text').value = f.flash_text;
                    
                    if (f.pdf_label && document.getElementById('field-pdf-label')) document.getElementById('field-pdf-label').value = f.pdf_label;
                    if (f.pdf_url && document.getElementById('field-pdf-url')) {
                        document.getElementById('field-pdf-url').value = f.pdf_url;
                        const pt = document.getElementById('pdf-upload-text');
                        if (pt) { pt.innerHTML = 'PDF CARICATO ✅'; pt.style.color = '#10b981'; }
                    }

                    if (document.getElementById('input-lead-attivo')) document.getElementById('input-lead-attivo').checked = (f.lead_capture_attivo === 'true');
                    if (f.lead_capture_titolo && document.getElementById('input-lead-titolo')) document.getElementById('input-lead-titolo').value = f.lead_capture_titolo;
                    if (f.lead_capture_leads && document.getElementById('field-lead-leads-data')) {
                        document.getElementById('field-lead-leads-data').value = f.lead_capture_leads;
                        try { disegnaListaLeads(JSON.parse(f.lead_capture_leads)); } catch(e) {}
                    }

                    if (f.partners_data && document.getElementById('field-partners-data')) {
                        document.getElementById('field-partners-data').value = f.partners_data;
                        try { disegnaListaPartners(JSON.parse(f.partners_data)); } catch(e) {}
                    }
                    if (f.gallery_data && document.getElementById('field-gallery-data')) {
                        document.getElementById('field-gallery-data').value = f.gallery_data;
                        disegnaGrigliaGalleria();
                    }
                    if (f.cv && document.getElementById('field-cv')) {
                        document.getElementById('field-cv').value = f.cv;
                        const c = document.getElementById('cv-upload-text');
                        if (c) { c.innerHTML = 'CV CARICATO ✅'; c.style.color = '#10b981'; }
                    }

                    if (f.quickpass_premio_a && document.getElementById('field-qp-premio-a')) document.getElementById('field-qp-premio-a').value = f.quickpass_premio_a;
                    if (f.quickpass_premio_b && document.getElementById('field-qp-premio-b')) document.getElementById('field-qp-premio-b').value = f.quickpass_premio_b;
                    if (f.quickpass_limite && document.getElementById('field-qp-limite')) document.getElementById('field-qp-limite').value = f.quickpass_limite;
                    if (f.quickpass_scadenza && document.getElementById('field-qp-scadenza')) document.getElementById('field-qp-scadenza').value = f.quickpass_scadenza;

                   
                      // 1. CARICAMENTO AVATAR (Sganciato e Immediato)
                    if (f.avatar_url && document.getElementById('field-avatar-url')) {
                        document.getElementById('field-avatar-url').value = f.avatar_url;
                        const liveImg = document.getElementById('live-avatar-img');
                        if(liveImg) {
                            liveImg.src = f.avatar_url;
                            document.getElementById('live-avatar-container').style.display = 'flex';
                            const box = document.getElementById('avatar-preview-box');
                            if(box) {
                                box.style.backgroundImage = `url('${f.avatar_url}')`; box.style.backgroundSize = 'cover'; box.style.backgroundPosition = 'center'; box.style.border = '1px solid rgba(255,255,255,0.4)';
                                const icon = document.getElementById('avatar-icon'); if(icon) icon.style.display = 'none';
                            }
                        }
                    }

                    // 2. CARICAMENTO RUBRICA E CONTATTI
                    if (f.modulo_vcf) {
                        try {
                            const vcf = typeof f.modulo_vcf === 'string' ? JSON.parse(f.modulo_vcf) : f.modulo_vcf;
                            if (vcf.telefono1 && document.getElementById('field-tel1')) document.getElementById('field-tel1').value = vcf.telefono1;
                            if (vcf.telefono2 && document.getElementById('field-tel2')) document.getElementById('field-tel2').value = vcf.telefono2;
                            if (vcf.indirizzo && document.getElementById('field-indirizzo')) document.getElementById('field-indirizzo').value = vcf.indirizzo;
                        } catch(e) {}
                    } 

                    // ==========================================================
                    // 3. 🌐 POPOLAMENTO STANZE IN ANTEPRIMA (Contenuti Reali)
                    // ==========================================================
                    const bioContainer = document.getElementById('preview-bio-content');
                    if (bioContainer) {
                        bioContainer.innerHTML = f.bio ? `<p style="color: #cbd5e1; font-size: 0.9rem; line-height: 1.6; text-align: center; padding: 10px;">${f.bio}</p>` : `<p style="color: #64748b; font-size: 0.85rem; text-align: center;">Nessuna biografia inserita.</p>`;
                    }
                    
                    const cvContainer = document.getElementById('preview-cv-content');
                    if (cvContainer) {
                        cvContainer.innerHTML = f.cv ? `<a href="${f.cv}" target="_blank" class="room-link" style="display: block; text-align: center; text-decoration: none; margin-top: 15px;">📄 SCARICA CURRICULUM VITAE</a>` : `<p style="color: #64748b; font-size: 0.85rem; text-align: center;">Nessun CV caricato.</p>`;
                    }
                    // ==========================================================

                    if (f.config_canali) {
                        try {
                            const canali = typeof f.config_canali === 'string' ? JSON.parse(f.config_canali) : f.config_canali;
                            const track = document.getElementById('social-internal-track');
                            if (track) {
                                track.innerHTML = ""; 
                                canali.forEach(canale => {
                                    const blockId = 'social-' + Math.random().toString(36).substr(2, 9);
                                    const block = document.createElement('div'); block.className = 'social-block-live'; block.id = blockId;
                                    const isVip = canale.vip === true || canale.vip === 'true';
                                    const isOfficial = canale.official === true || canale.official === 'true';

                                    block.setAttribute('data-nome', canale.nome); block.setAttribute('data-url', canale.url); block.setAttribute('data-vip', isVip); block.setAttribute('data-pin', canale.pin || ""); block.setAttribute('data-official', isOfficial); block.setAttribute('data-icon', canale.iconClass || "fas fa-link");

                                    let iconaVisualizzata = `<i class="${canale.iconClass || 'fas fa-link'}" style="color: #fff; font-size: 1.2rem; width: 24px; text-align: center;"></i>`;
                                    if (!isOfficial && canale.url && canale.url.startsWith('http')) {
                                        try { const domain = new URL(canale.url).hostname; const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`; iconaVisualizzata = `<img src="${faviconUrl}" style="width: 22px; height: 22px; border-radius: 6px; object-fit: cover; background: #fff; padding: 2px;">`; } catch(e) {}
                                    }

                                    let officialBadge = isOfficial ? `<i class="fas fa-certificate" style="color: #1DA1F2; font-size: 0.75rem; margin-left: 6px;" title="Canale Ufficiale Verificato"></i>` : "";
                                    let vipBadge = isVip ? `<i class="fas fa-lock" style="color: #e5c158; font-size: 0.75rem; margin-left: 6px;" title="Protetto da VIP Vault"></i>` : "";

                                    block.style.cssText = "display: flex; align-items: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 14px 16px; border-radius: 12px;";
                                    block.innerHTML = `
                                        <div class="drag-handle" style="color: rgba(255,255,255,0.3); padding-right: 15px; font-size: 1.2rem; cursor: grab;">⋮⋮</div>
                                        <div class="block-content" style="flex: 1; display: flex; align-items: center; gap: 12px;">
                                            <div style="display:flex; justify-content:center; align-items:center; width:24px;">${iconaVisualizzata}</div>
                                            <div style="display:flex; align-items:center;">
                                                <span style="font-size: 0.95rem; color: #fff; font-weight: 500;">${canale.nome}</span>
                                                ${officialBadge} ${vipBadge}
                                            </div>
                                        </div>
                                        <div class="block-actions" style="padding-left: 10px;">
                                            <i class="fas fa-trash" style="color: #ff4444; cursor: pointer; font-size: 1.1rem; opacity: 0.8;" onclick="rimuoviBlocco('${blockId}')"></i>
                                        </div>
                                    `;
                                    track.appendChild(block);
                                });
                            }
                        } catch(e) {}
                    }
                    aggiornaLucchetti();
                    applicaTemaLive(); 
                    aggiornaLimitiSocial(); 
                }     
            } catch (e) { 
                console.error("Errore caricamento", e); 
      } finally {
                isLoadingDati = false;
                
                // Setta il bottone in base allo stato
                if (statoUtente === 'attivo') {
                    document.getElementById('master-action-text').innerText = "PUBBLICA ONLINE";
                } else {
                    document.getElementById('master-action-text').innerText = "COMPLETA TAG";
                }

                // 🚀 FORZA L'AGGIORNAMENTO GRAFICO (Evita blocchi se ci sono stati errori di rete)
                if (typeof applicaTemaLive === "function") applicaTemaLive();

                // 🚀 Stesso principio: il badge di prenotazione non deve dipendere dal resto del caricamento
                if (typeof initReservationMonitor === "function") initReservationMonitor();

                // 🚀 I DATI SONO CARICATI: APRIAMO IL SIPARIO (FADE IN)
                document.getElementById('profile-content').style.opacity = '1';
                const triggerArea = document.getElementById('dynamic-trigger-area');
                if(triggerArea) triggerArea.style.opacity = '1';

            } 
        }
        // ==========================================
        // ALTRE FUNZIONI ESISTENTI INVARIATE
        // ==========================================
        function accendiIControlli() {
            const fieldDisplay = document.getElementById('field-username_display');
            const labelSistema = document.getElementById('label-nome-sistema');

            if (labelSistema) { labelSistema.innerText = '@' + NOME_SISTEMA.toUpperCase(); }
            if (!fieldDisplay) return;

            fieldDisplay.addEventListener('input', () => {
                const inputVal = fieldDisplay.value;
                const inseritoSenzaSpazi = inputVal.toLowerCase().replace(/\s/g, '');
                if (inputVal.trim() === '') {
                    fieldDisplay.style.borderColor = "rgba(255,255,255,0.1)"; fieldDisplay.style.boxShadow = "none";
                    formattaBadge(NOME_SISTEMA);
                } else if (inseritoSenzaSpazi !== NOME_SISTEMA) {
                    fieldDisplay.style.borderColor = "#ff4444"; fieldDisplay.style.boxShadow = "0 0 8px rgba(255, 68, 68, 0.5)";
                    formattaBadge(NOME_SISTEMA); 
                } else {
                    fieldDisplay.style.borderColor = "rgba(255,255,255,0.1)"; fieldDisplay.style.boxShadow = "none";
                    formattaBadge(inputVal);
                }
            });
        }

        function salvaIdentitaEApriStile() {
            const fieldDisplay = document.getElementById('field-username_display');
            if(!fieldDisplay) return;
            const inputVal = fieldDisplay.value;
            const inseritoSenzaSpazi = inputVal.toLowerCase().replace(/\s/g, '');

            if (inputVal.trim() !== '' && inseritoSenzaSpazi !== NOME_SISTEMA) {
                alert("⚠️ AZIONE NON CONSENTITA ⚠️\n\nIl tuo Tag è registrato come @" + NOME_SISTEMA.toUpperCase() + ".\nNon puoi alterare il brand originario, sono ammessi unicamente gli spazi.");
                fieldDisplay.value = NOME_SISTEMA; formattaBadge(NOME_SISTEMA); return; 
            }
            chiudiSenzaSalvare();
        }

       function sbloccaPianoInAnteprima(nuovoPianoSelezionato) {
            userPlan = nuovoPianoSelezionato; 
            localStorage.setItem('mqt_temp_plan_' + NOME_SISTEMA, userPlan); 
            aggiornaLucchetti();
            
            // Reindirizzamento logico all'Editor principale invece di chiudere i cassetti
            apriDrawer('drawer-master'); 
            
           setTimeout(() => {
                if(nuovoPianoSelezionato === 'BASE') {
                    alert(`Hai impostato il piano BASE.\n\nLe funzioni avanzate sono state nuovamente bloccate per mostrarti l'anteprima reale.`);
                } else {
                    alert(`Fantastico! Hai selezionato il piano ${nuovoPianoSelezionato}.\n\nI lucchetti del tuo piano sono sbloccati. Ora puoi configurare queste funzioni e vedere l'anteprima in tempo reale.`);
                }
            }, 400);
        }

     function aggiornaLucchetti() {
   const cassettiGold = ['drawer-review', 'drawer-lead-capture', 'drawer-live-status', 'drawer-flash', 'drawer-shop', 'drawer-quickpass'];
    const cassettiPremium = ['drawer-gallery', 'drawer-showcase', 'drawer-quick']; 
    
    document.querySelectorAll('.premium-field-container').forEach(container => {
        const overlay = container.querySelector('.premium-lock-overlay');
        if (overlay) {
            const parentDrawer = container.closest('.drawer-glass');
            if (parentDrawer) {
                const drawerId = parentDrawer.id;
                
                if (cassettiGold.includes(drawerId)) {
                    overlay.style.display = (userPlan === 'GOLD') ? 'none' : 'flex';
                } else if (cassettiPremium.includes(drawerId)) {
                    overlay.style.display = (userPlan === 'PREMIUM' || userPlan === 'GOLD') ? 'none' : 'flex';
                } else if (drawerId === 'drawer-contatti') {
                    // Eccezione: i campi Tel2 e Maps dentro Contatti sono Premium
                    overlay.style.display = (userPlan === 'PREMIUM' || userPlan === 'GOLD') ? 'none' : 'flex';
                    const icon = overlay.querySelector('.fa-lock');
                    if(icon) { icon.style.color = '#10b981'; } // Lucchetto verde
                }
            }
        }
    });
    if(typeof aggiornaLimitiSocial === 'function') aggiornaLimitiSocial();
}
        function selezionaStatus(colore) {
            document.getElementById('btn-status-green').style.opacity = '0.3';
            document.getElementById('btn-status-yellow').style.opacity = '0.3';
            document.getElementById('btn-status-red').style.opacity = '0.3';

            const btnSelezionato = document.getElementById('btn-status-' + colore);
            if (btnSelezionato) btnSelezionato.style.opacity = '1';

            const fieldColor = document.getElementById('field-status-color');
            if (fieldColor) fieldColor.value = colore;

            const fieldText = document.getElementById('field-status-text');
            if (fieldText && fieldText.value.trim() === '') {
                if (colore === 'green') fieldText.placeholder = "Es. In ufficio, contattami pure";
                if (colore === 'yellow') fieldText.placeholder = "Es. In cantiere, lasciami un vocale";
                if (colore === 'red') fieldText.placeholder = "Es. In ferie fino al 20 Agosto";
            }
            aggiornaAnteprimaLive();
        }

        function spegniStatus() {
            document.getElementById('btn-status-green').style.opacity = '1';
            document.getElementById('btn-status-yellow').style.opacity = '1';
            document.getElementById('btn-status-red').style.opacity = '1';

            if (document.getElementById('field-status-color')) document.getElementById('field-status-color').value = '';
            
            const fieldText = document.getElementById('field-status-text');
            if (fieldText) { fieldText.value = ''; fieldText.placeholder = "Seleziona uno stato..."; }

            if (document.getElementById('field-status-action-type')) document.getElementById('field-status-action-type').value = 'nessuna';
            if (document.getElementById('field-status-action-label')) document.getElementById('field-status-action-label').value = '';
            if (document.getElementById('field-status-action-url')) document.getElementById('field-status-action-url').value = '';
            
            if (document.getElementById('status-action-details')) document.getElementById('status-action-details').style.display = 'none';
            if (document.getElementById('status-action-container')) document.getElementById('status-action-container').style.display = 'none';

            aggiornaAnteprimaLive();
        }

        function toggleStatusAction() {
            const container = document.getElementById('status-action-container');
            if (!container) return;
            container.style.display = (container.style.display === 'none') ? 'flex' : 'none';
        }

        function autoCompilaAzioneStatus() {
            const selectType = document.getElementById('field-status-action-type');
            const detailsContainer = document.getElementById('status-action-details');
            const labelInput = document.getElementById('field-status-action-label');
            const urlInput = document.getElementById('field-status-action-url');

            if (!selectType || !detailsContainer || !labelInput || !urlInput) return;
            const tipo = selectType.value;

            if (tipo === 'nessuna') { detailsContainer.style.display = 'none'; return; }

            detailsContainer.style.display = 'flex';

            if (tipo === 'whatsapp') {
                labelInput.placeholder = "Es. Mandami un vocale";
                if (labelInput.value === '') labelInput.value = "Scrivimi su WhatsApp";
                const telRubrica = document.getElementById('field-tel1') ? document.getElementById('field-tel1').value : '';
                if (urlInput.value === '') urlInput.value = telRubrica;
            } 
            else if (tipo === 'chiamata') {
                labelInput.placeholder = "Es. Chiamami ora";
                if (labelInput.value === '') labelInput.value = "Chiama il mio studio";
                const telRubrica = document.getElementById('field-tel1') ? document.getElementById('field-tel1').value : '';
                if (urlInput.value === '') urlInput.value = telRubrica;
            }
            else if (tipo === 'email') {
                labelInput.placeholder = "Es. Inviami una richiesta";
                if (labelInput.value === '') labelInput.value = "Mandami un'email";
                const emailRubrica = document.getElementById('field-email') ? document.getElementById('field-email').value : '';
                if (urlInput.value === '') urlInput.value = emailRubrica;
            }
            else if (tipo === 'link') {
                labelInput.placeholder = "Es. Guarda la diretta su Twitch";
                labelInput.value = "";
                urlInput.placeholder = "https://...";
                urlInput.value = "";
            }
        }

     
function gestisciVIPSwitch(checkbox) {
            if(userPlan !== 'GOLD') {
                checkbox.checked = false;
                mostraPopupPremium("FUNZIONE VIP VAULT", "Il modulo VIP Vault è un'esclusiva del Piano Gold.<br><br>Consente di proteggere link riservati o listini privati tramite PIN protetto.");
                return;
            }
            document.getElementById('vip-pin-container').style.display = checkbox.checked ? 'block' : 'none';
        }
        function rilevaSocialAutomatico() {
            const urlStr = document.getElementById('smart-link-url').value.toLowerCase();
            const nameInput = document.getElementById('smart-link-name');
            const iconEl = document.getElementById('smart-link-icon');

            const mappa = {
                'instagram.com': { n: 'Instagram', i: 'fab fa-instagram' }, 'tiktok.com': { n: 'TikTok', i: 'fab fa-tiktok' },
                'facebook.com': { n: 'Facebook', i: 'fab fa-facebook-f' }, 'linkedin.com': { n: 'LinkedIn', i: 'fab fa-linkedin-in' },
                'x.com': { n: 'X', i: 'fab fa-x-twitter' }, 'twitter.com': { n: 'X', i: 'fab fa-x-twitter' },
                'youtube.com': { n: 'YouTube', i: 'fab fa-youtube' }, 'wa.me': { n: 'WhatsApp', i: 'fab fa-whatsapp' },
                't.me': { n: 'Telegram', i: 'fab fa-telegram-plane' }, 'spotify.com': { n: 'Spotify', i: 'fab fa-spotify' },
                'tripadvisor': { n: 'TripAdvisor', i: 'fab fa-tripadvisor' }, 'thefork': { n: 'TheFork', i: 'fas fa-utensils' },
                'onlyfans.com': { n: 'OnlyFans', i: 'fas fa-star' }, 'github.com': { n: 'GitHub', i: 'fab fa-github' },
                'twitch.tv': { n: 'Twitch', i: 'fab fa-twitch' }, 'strava.com': { n: 'Strava', i: 'fab fa-strava' },
                'pinterest.com': { n: 'Pinterest', i: 'fab fa-pinterest-p' }, 'discord.com': { n: 'Discord', i: 'fab fa-discord' },
                'discord.gg': { n: 'Discord', i: 'fab fa-discord' }, 'snapchat.com': { n: 'Snapchat', i: 'fab fa-snapchat-ghost' },
                'threads.net': { n: 'Threads', i: 'fab fa-threads' }, 'calendly.com': { n: 'Calendly', i: 'far fa-calendar-check' },
                'patreon.com': { n: 'Patreon', i: 'fab fa-patreon' }, 'behance.net': { n: 'Behance', i: 'fab fa-behance' },
                'dribbble.com': { n: 'Dribbble', i: 'fab fa-dribbble' }, 'vimeo.com': { n: 'Vimeo', i: 'fab fa-vimeo-v' },
                'reddit.com': { n: 'Reddit', i: 'fab fa-reddit-alien' }, 'medium.com': { n: 'Medium', i: 'fab fa-medium-m' },
                'soundcloud.com': { n: 'SoundCloud', i: 'fab fa-soundcloud' }, 'apple.com/it/music': { n: 'Apple Music', i: 'fab fa-apple' }
            };

            let trovato = false;
            for (const [key, val] of Object.entries(mappa)) {
                if (urlStr.includes(key)) {
                    nameInput.value = val.n; 
                    iconEl.className = val.i + " smart-detected-icon"; 
                    iconEl.style.color = "#10b981";
                    iconEl.setAttribute('data-official', 'true');
                    trovato = true; break;
                }
            }

            if(!trovato && urlStr.length > 5) {
                if(nameInput.value === "") nameInput.value = "Visita il link";
                iconEl.className = "fas fa-link smart-detected-icon"; 
                iconEl.style.color = "#d4af37";
                iconEl.setAttribute('data-official', 'false');
            } else if (urlStr.length <= 5) { 
                iconEl.className = "fas fa-link"; iconEl.style.color = "#86868b"; iconEl.removeAttribute('data-official');
            }
        }

        function aggiungiLinkSmart() {
            const internalTrack = document.getElementById('social-internal-track');
         let limit = 5; if (userPlan === 'PREMIUM' || userPlan === 'GOLD') limit = 999;
            
            if (internalTrack && internalTrack.children.length >= limit) {
                alert("Avviso di Sistema\n\nIl piano attuale consente l'inserimento di un massimo di " + limit + " canali.\nProcedere all'upgrade per rimuovere questo limite.");
                return;
            }

            const url = document.getElementById('smart-link-url').value.trim();
            let nome = document.getElementById('smart-link-name').value.trim();
            const iconEl = document.getElementById('smart-link-icon');
            const vipSwitch = document.getElementById('smart-link-vip');
            const isVip = vipSwitch ? vipSwitch.checked : false;
            const vipPin = document.getElementById('smart-link-pin') ? document.getElementById('smart-link-pin').value : "";

            if(url === "") { alert("Inserire un URL valido."); return; }
            const isOfficial = iconEl.getAttribute('data-official') === 'true';

            if (!isOfficial) {
                alert("Validazione Link\n\nIn questa sezione è consentito unicamente l'inserimento di piattaforme social riconosciute.\nPer inserire link a siti web o domini aziendali, si prega di utilizzare il modulo dedicato 'SITO WEB'.");
                document.getElementById('smart-link-url').value = ""; document.getElementById('smart-link-name').value = "";
                iconEl.className = "fas fa-link"; iconEl.style.color = "#86868b";
                return; 
            }

            if(nome === "") nome = "Visita il link";
            let iconClass = iconEl.className.replace('smart-detected-icon', '').trim();

            const track = document.getElementById('social-internal-track');
            const blockId = 'social-' + Date.now();
            const block = document.createElement('div');
            block.className = 'social-block-live'; block.id = blockId;

            block.setAttribute('data-nome', nome); block.setAttribute('data-url', url); block.setAttribute('data-vip', isVip); block.setAttribute('data-pin', vipPin); block.setAttribute('data-official', isOfficial); block.setAttribute('data-icon', iconClass);

            block.style.cssText = "display: flex; align-items: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 14px 16px; border-radius: 12px;";

            let iconaVisualizzata = `<i class="${iconClass}" style="color: #fff; font-size: 1.2rem; width: 24px; text-align: center;"></i>`;
            let officialBadge = isOfficial ? `<i class="fas fa-certificate" style="color: #1DA1F2; font-size: 0.75rem; margin-left: 6px;" title="Canale Ufficiale Verificato"></i>` : "";
            let vipBadge = isVip ? `<i class="fas fa-lock" style="color: #e5c158; font-size: 0.75rem; margin-left: 6px;" title="Protetto da VIP Vault"></i>` : "";

            block.innerHTML = `
                <div class="drag-handle" style="color: rgba(255,255,255,0.3); padding-right: 15px; font-size: 1.2rem; cursor: grab;">⋮⋮</div>
                <div class="block-content" style="flex: 1; display: flex; align-items: center; gap: 12px;">
                    <div style="display:flex; justify-content:center; align-items:center; width:24px;">${iconaVisualizzata}</div>
                    <div style="display:flex; align-items:center;"><span style="font-size: 0.95rem; color: #fff; font-weight: 500;">${nome}</span>${officialBadge} ${vipBadge}</div>
                </div>
                <div class="block-actions" style="padding-left: 10px;">
                    <i class="fas fa-trash" style="color: #ff4444; cursor: pointer; font-size: 1.1rem; opacity: 0.8;" onclick="rimuoviBlocco('${blockId}')"></i>
                </div>
            `;

            track.appendChild(block);
            document.getElementById('smart-link-url').value = ""; document.getElementById('smart-link-name').value = "";
            if(vipSwitch) { vipSwitch.checked = false; document.getElementById('vip-pin-container').style.display = "none"; document.getElementById('smart-link-pin').value = ""; }
            iconEl.className = "fas fa-link"; iconEl.style.color = "#86868b"; iconEl.removeAttribute('data-official');

            aggiornaLimitiSocial(); aggiornaAnteprimaLive(); eseguiAutoSaveInvisibile();
        }

        function rimuoviBlocco(id) {
            const block = document.getElementById(id);
            if(block) block.remove();
            aggiornaLimitiSocial(); aggiornaAnteprimaLive(); eseguiAutoSaveInvisibile();
        }

       function aggiornaLimitiSocial() {
    const internalTrack = document.getElementById('social-internal-track');
    if (!internalTrack) return;
    const count = internalTrack.children.length;
    const counterEl = document.getElementById('social-counter');
    const btnAdd = document.getElementById('btn-add-social');

    // --- LA PARTE CENTRALE MODIFICATA (Base a 5, Premium/Gold Illimitati) ---
    let limit = 5; 
    let planName = "Piano Base";
    
    if (userPlan === 'PREMIUM' || userPlan === 'GOLD') { 
        limit = 999; 
        planName = (userPlan === 'GOLD') ? "Piano Gold" : "Piano Premium"; 
    }
    // ------------------------------------------------------------------------

    if (counterEl) {
        if (limit === 999) { counterEl.innerText = `${count}/∞ (${planName})`; } 
        else { counterEl.innerText = `${count}/${limit} (${planName})`; }
    }

    if (btnAdd) {
        if (count >= limit) {
            btnAdd.innerHTML = `<i class="fas fa-lock"></i> LIMITE RAGGIUNTO`;
            btnAdd.style.background = "rgba(255,255,255,0.1)"; btnAdd.style.color = "#ff4444";
            btnAdd.onclick = function(e) { if(e) e.preventDefault(); alert("Avviso di Sistema\n\nHai raggiunto il limite massimo di " + limit + " canali previsto dal tuo piano."); };
        } else {
            btnAdd.innerHTML = `+ AGGIUNGI AL PROFILO`;
            btnAdd.style.background = "#10b981"; btnAdd.style.color = "#000";
            btnAdd.onclick = aggiungiLinkSmart;
        }
    }
}
        function aggiungiPartner() {
            const nomeInput = document.getElementById('input-partner-nome');
            const urlInput = document.getElementById('input-partner-url');
            const hiddenData = document.getElementById('field-partners-data');
            
            if (!nomeInput || !urlInput || !hiddenData) return;

            const nome = nomeInput.value.trim();
            let url = urlInput.value.trim();

            if (nome === '' || url === '') { alert('Inserisci sia il nome che il link.'); return; }
            if (!url.startsWith('http://') && !url.startsWith('https://')) { url = 'https://' + url; }

            let partners = []; try { partners = JSON.parse(hiddenData.value || '[]'); } catch(e) { partners = []; }
            partners.push({ nome: nome, url: url });
            hiddenData.value = JSON.stringify(partners);

            nomeInput.value = ''; urlInput.value = '';
            disegnaListaPartners(partners); aggiornaAnteprimaLive(); eseguiAutoSaveInvisibile();
        }

        function rimuoviPartner(index) {
            const hiddenData = document.getElementById('field-partners-data');
            if (!hiddenData) return;

            let partners = []; try { partners = JSON.parse(hiddenData.value || '[]'); } catch(e) {}
            partners.splice(index, 1);
            hiddenData.value = JSON.stringify(partners);

            disegnaListaPartners(partners); aggiornaAnteprimaLive(); eseguiAutoSaveInvisibile();
        }

        function disegnaListaPartners(partners) {
            const track = document.getElementById('partners-internal-track');
            if (!track) return;
            track.innerHTML = '';
            partners.forEach((p, idx) => {
                const item = document.createElement('div');
                item.style.cssText = "display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 12px 14px; border-radius: 10px;";
                item.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
                        <i class="fas fa-handshake" style="color: #e5c158; font-size: 1rem;"></i>
                        <div style="display: flex; flex-direction: column; overflow: hidden;">
                            <span style="color: #fff; font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.nome}</span>
                            <span style="color: rgba(255,255,255,0.4); font-size: 0.6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.url}</span>
                        </div>
                    </div>
                    <i class="fas fa-trash" style="color: #ff4444; cursor: pointer; font-size: 1rem; opacity: 0.8; padding: 5px;" onclick="rimuoviPartner(${idx})"></i>
                `;
                track.appendChild(item);
            });
        } 

        function disegnaListaLeads(leadsArray) {
            const track = document.getElementById('leads-internal-track');
            const badge = document.getElementById('lead-count-badge');
            if (!track || !badge) return;

            badge.textContent = leadsArray.length;
            track.innerHTML = '';

            if (leadsArray.length === 0) { track.innerHTML = `<div style="font-size: 0.75rem; color: rgba(255,255,255,0.3); text-align: center; padding: 15px;">Nessun contatto raccolto ancora.</div>`; return; }

            leadsArray.forEach((lead) => {
                const item = document.createElement('div');
                item.style.cssText = "display: flex; flex-direction: column; gap: 4px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 12px 14px; border-radius: 10px;";
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: #fff; font-size: 0.85rem; font-weight: 600;">${lead.nome || 'Senza nome'}</span>
                        <span style="font-size: 0.6rem; color: rgba(255,255,255,0.4);">${lead.data || ''}</span>
                    </div>
                    <span style="color: #e5c158; font-size: 0.75rem;">${lead.contatto}</span>
                `;
                track.appendChild(item);
            });
        } 

        function spegniFlash() {
            document.getElementById('field-flash-text').value = '';
            aggiornaAnteprimaLive(); eseguiAutoSaveInvisibile(); chiudiSenzaSalvare();
        }

        function eliminaAsset(tipo) {
            if (tipo === 'sito') { document.getElementById('field-sito').value = ''; } 
            else if (tipo === 'quick') { document.getElementById('field-qa-label').value = ''; document.getElementById('field-qa-url').value = ''; document.getElementById('field-qa-tipo').value = 'whatsapp'; } 
            else if (tipo === 'bio') { document.getElementById('field-bio').value = ''; } 
            else if (tipo === 'pdf') { document.getElementById('field-pdf-url').value = ''; document.getElementById('field-pdf-label').value = ''; const testopdf = document.getElementById('pdf-upload-text'); if (testopdf) { testopdf.innerHTML = 'Seleziona PDF'; testopdf.style.color = '#fff'; } } 
            else if (tipo === 'cv') { document.getElementById('field-cv').value = ''; const testocv = document.getElementById('cv-upload-text'); if (testocv) { testocv.innerHTML = 'Seleziona il PDF del tuo CV'; testocv.style.color = '#fff'; } } 
            else if (tipo === 'social') { const track = document.getElementById('social-internal-track'); if(track) track.innerHTML = ''; aggiornaLimitiSocial(); } 
            else if (tipo === 'contatti') { document.getElementById('field-tel1').value = ''; document.getElementById('field-tel2').value = ''; document.getElementById('field-email').value = ''; document.getElementById('field-indirizzo').value = ''; } 
            else if (tipo === 'gallery') { document.getElementById('field-gallery-data').value = '[]'; const grid = document.getElementById('gallery-preview-grid'); if (grid) grid.innerHTML = ''; } 
            else if (tipo === 'quickpass') { document.getElementById('field-qp-premio-a').value = ''; document.getElementById('field-qp-premio-b').value = ''; document.getElementById('field-qp-limite').value = ''; document.getElementById('field-qp-scadenza').value = ''; } 
            else if (tipo === 'review') { if(document.getElementById('field-review-url')) document.getElementById('field-review-url').value = ''; if(document.getElementById('field-review-contact')) document.getElementById('field-review-contact').value = ''; } 
            else if (tipo === 'video') { if(document.getElementById('field-video-url')) document.getElementById('field-video-url').value = ''; if(document.getElementById('field-video-cta-text')) document.getElementById('field-video-cta-text').value = ''; if(document.getElementById('field-video-cta-url')) document.getElementById('field-video-cta-url').value = ''; } 
            else if (tipo === 'shop') { const checkShop = document.getElementById('input-shop-attivo'); if(checkShop) checkShop.checked = false; if(document.getElementById('input-shop-titolo')) document.getElementById('input-shop-titolo').value = ''; if(document.getElementById('input-shop-prezzo')) document.getElementById('input-shop-prezzo').value = ''; if(document.getElementById('input-shop-link')) document.getElementById('input-shop-link').value = ''; if(document.getElementById('input-shop-scadenza')) document.getElementById('input-shop-scadenza').value = ''; } 
            else if (tipo === 'partners') { document.getElementById('field-partners-data').value = '[]'; const trackP = document.getElementById('partners-internal-track'); if (trackP) trackP.innerHTML = ''; }
            
            aggiornaAnteprimaLive(); eseguiAutoSaveInvisibile(); chiudiSenzaSalvare();
        }

    async function gestisciUploadAvatar(event) {
            const file = event.target.files[0];
            if (!file) return;

            // 1. Anteprima immediata locale nel pannello di modifica
            const previewUrl = URL.createObjectURL(file);
            const box = document.getElementById('avatar-preview-box');
            if (box) { 
                box.style.backgroundImage = `url('${previewUrl}')`; 
                box.style.backgroundSize = 'cover'; 
                box.style.backgroundPosition = 'center'; 
                box.style.border = '1px solid #10b981'; 
            }
            const icon = document.getElementById('avatar-icon');
            if(icon) icon.style.display = 'none';

            // 2. Accende il loader
            const loader = document.getElementById('avatar-loader');
            if(loader) loader.style.display = 'flex';

            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'myquicktag_upload'); 

            try {
                // 3. Invio a Cloudinary
                const response = await fetch('https://api.cloudinary.com/v1_1/etgsaztr/image/upload', { 
                    method: 'POST', 
                    body: formData 
                });
                const data = await response.json();

                if (data.secure_url) {                            
                    const imageUrl = data.secure_url;
                    
                    // Assegna il link al campo nascosto
                    document.getElementById('field-avatar-url').value = imageUrl;

                    // 4. AGGIORNAMENTO FORZATO DELLA COPERTINA PRINCIPALE (Il fix visivo)
                    const liveContainer = document.getElementById('live-avatar-container');
                    const liveImg = document.getElementById('live-avatar-img');
                    
                    if(liveImg && liveContainer) {
                        liveImg.src = imageUrl;
                        liveContainer.style.display = 'flex'; // Rende visibile il cerchio dell'avatar
                    } 

                    // 5. Salva subito in bozza senza perdere tempo
                    await eseguiAutoSaveInvisibile();

                } else { 
                    alert("Errore dal server Cloudinary. Riprova."); 
                }
            } catch (error) { 
                alert("Errore di connessione. Verifica la tua rete.");
            } finally {
                if(loader) loader.style.display = 'none';
                event.target.value = ''; 
            }
        }
        async function gestisciUploadGalleria(event) {
            const files = event.target.files;
            if (!files || files.length === 0) return;

            const hiddenField = document.getElementById('field-gallery-data');
            let arrayAttuale = hiddenField.value && hiddenField.value !== "[]" ? JSON.parse(hiddenField.value) : [];

            const limiteMax = typeof userPlan !== 'undefined' && userPlan === 'GOLD' ? 9 : 6;

            if (arrayAttuale.length + files.length > limiteMax) {
                alert(`Attenzione: Il piano consente un massimo di ${limiteMax} foto.\nNe hai già caricate ${arrayAttuale.length} e stai cercando di aggiungerne ${files.length}.`);
                event.target.value = '';
                return;
            }

            const fileArray = Array.from(files);
            for (let i = 0; i < fileArray.length; i++) {
                if (!fileArray[i].type.startsWith('image/')) { alert("Seleziona solo file immagine."); event.target.value = ''; return; }
            }

            const loader = document.getElementById('gallery-loader');
            loader.style.display = 'block';

            setTimeout(async () => {
                let finalArray = [...arrayAttuale];
                let successCount = 0;

                for (let i = 0; i < fileArray.length; i++) {
                    const formData = new FormData();
                    formData.append('file', fileArray[i]);
                    formData.append('upload_preset', 'myquicktag_upload');

                    try {
                        const response = await fetch('https://api.cloudinary.com/v1_1/etgsaztr/image/upload', { method: 'POST', body: formData });
                        const data = await response.json();
                        
                        if (data.secure_url) {
                            finalArray.push(data.secure_url);
                            successCount++;
                            hiddenField.value = JSON.stringify(finalArray);
                            disegnaGrigliaGalleria();
                        }
                    } catch (error) { console.error("Errore foto " + i, error); }
                }

                if (successCount < fileArray.length) { alert(`Completato con errori: caricate ${successCount} su ${fileArray.length}.`); }

                loader.style.display = 'none';
                event.target.value = ''; 
                aggiornaAnteprimaLive(); eseguiAutoSaveInvisibile();
            }, 100); 
        }

        async function gestisciUploadPDF(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (file.type !== 'application/pdf') { alert("Seleziona un file PDF."); return; }

            document.getElementById('pdf-loader').style.display = 'block';
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'myquicktag_upload'); 

            try {
                const response = await fetch('https://api.cloudinary.com/v1_1/etgsaztr/auto/upload', { method: 'POST', body: formData });
                const data = await response.json();

                if (data.secure_url) {
                    document.getElementById('field-pdf-url').value = data.secure_url;
                    const testopdf = document.getElementById('pdf-upload-text');
                    if (testopdf) { testopdf.innerHTML = 'PDF CARICATO ✅'; testopdf.style.color = '#10b981'; }
                    aggiornaAnteprimaLive(); eseguiAutoSaveInvisibile();
                } else { alert("Errore dal server Cloudinary. Riprova."); }
            } catch (error) { alert("Errore di connessione alla rete.");
            } finally { document.getElementById('pdf-loader').style.display = 'none'; event.target.value = ''; }
        }

        async function gestisciUploadCV(event) {
            const file = event.target.files[0];
            if (!file) return;

            if (file.type !== 'application/pdf') { alert("Seleziona un file PDF."); return; }

            document.getElementById('cv-loader').style.display = 'block';
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'myquicktag_upload'); 

            try {
                const response = await fetch('https://api.cloudinary.com/v1_1/etgsaztr/auto/upload', { method: 'POST', body: formData });
                const data = await response.json();

                if (data.secure_url) {
                    document.getElementById('field-cv').value = data.secure_url;
                    const testocv = document.getElementById('cv-upload-text');
                    if (testocv) { testocv.innerHTML = 'CV CARICATO ✅'; testocv.style.color = '#10b981'; }
                    aggiornaAnteprimaLive(); eseguiAutoSaveInvisibile();
                } else { alert("Errore dal server Cloudinary. Riprova."); }
            } catch (error) { alert("Errore di connessione alla rete.");
            } finally { document.getElementById('cv-loader').style.display = 'none'; event.target.value = ''; }
        }

        function initReservationMonitor() {
            const badge = document.getElementById('reservation-badge');
            const nameUI = document.getElementById('badge-target-name');
            const timerTextUI = document.getElementById('badge-timer-text'); 

            if (!badge || !nameUI) return;

            if (statoUtente === 'attivo') {
                badge.style.display = 'none';
                localStorage.removeItem('mqt_res_expiry_' + NOME_SISTEMA);
                return;
            }

            const RES_STORAGE_KEY = 'mqt_res_expiry_' + NOME_SISTEMA;
            let expiry = localStorage.getItem(RES_STORAGE_KEY);
            
            if (!expiry) {
                expiry = new Date().getTime() + (24 * 60 * 60 * 1000); 
                localStorage.setItem(RES_STORAGE_KEY, expiry);
            }

            nameUI.innerText = '@' + NOME_SISTEMA.toUpperCase();
            badge.style.display = 'flex';

            function aggiornaTestoTimer() {
                const remaining = expiry - new Date().getTime();
                if (remaining <= 0) {
                    eseguiSfrattoScadenza();
                    return;
                }
                
                if (timerTextUI) {
                    const ore = Math.floor(remaining / (1000 * 60 * 60));
                    const minuti = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
                    const secondi = Math.floor((remaining % (1000 * 60)) / 1000);
                    
                    const minStr = minuti < 10 ? "0" + minuti : minuti;
                    const secStr = secondi < 10 ? "0" + secondi : secondi;
                    if (ore > 0) {
                        timerTextUI.innerText = `riservato per ${ore}h ${minStr}m`;
                    } else {
                        timerTextUI.innerText = `riservato per ${minStr}m ${secStr}s`;
                        timerTextUI.style.color = "#ff4444"; 
                     }
                }
            }
            aggiornaTestoTimer(); 
            setInterval(aggiornaTestoTimer, 1000);
        }  

      function eseguiSfrattoScadenza() {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.98); z-index:99999; display:flex; flex-direction:column; justify-content:center; align-items:center; color:#fff; font-family:"Inter", sans-serif;';
            overlay.innerHTML = `
                <i class="fas fa-lock" style="font-size: 3rem; color: #ff4444; margin-bottom: 20px;"></i>
                <h2 style="font-size: 1.2rem; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 10px;">Tempo Scaduto</h2>
                <p style="font-size: 0.8rem; color: rgba(255,255,255,0.6); text-align: center; max-width: 250px; line-height: 1.6;">Le 24 ore riservate per configurare questa identità sono terminate. Il nome è stato rilasciato.</p>
                <!-- 🚀 Bottone aggiornato: ora chiama il reset distruttivo -->
                <button onclick="resetSessioneESci()" style="margin-top: 30px; background: #fff; color: #000; border: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 0.8rem; letter-spacing: 1px; cursor: pointer;">TORNA ALLA HOME</button>
            `;
            document.body.appendChild(overlay);
            localStorage.removeItem('mqt_res_expiry_' + NOME_SISTEMA); localStorage.removeItem('mqt_cache_' + NOME_SISTEMA); localStorage.removeItem('mqt_theme_' + NOME_SISTEMA); localStorage.removeItem('mqt_layout_' + NOME_SISTEMA);
        }

        // ==========================================================
        // 🛑 DISTRUZIONE SESSIONE E USCITA DI SICUREZZA (Anti-Loop)
        // ==========================================================
        function resetSessioneESci() {
            const urlParams = new URLSearchParams(window.location.search);
            const tagCorrente = urlParams.get('u');
            
            if (tagCorrente) {
                // Rimuove la chiave specifica dal portachiavi multiplo
                let chiavi = JSON.parse(localStorage.getItem('myquicktag_keys') || '[]');
                chiavi = chiavi.filter(k => k !== tagCorrente);
                localStorage.setItem('myquicktag_keys', JSON.stringify(chiavi));
                
                // Se l'utente attivo è quello scaduto, scollega anche lui
                if (localStorage.getItem('loggedUser') === tagCorrente) {
                    localStorage.removeItem('loggedUser');
                }
            }
            
            // Rimuove il flag di prenotazione temporanea
            localStorage.removeItem('myquicktag_reserved');
            
            // Reindirizza pulito alla landing page
            window.location.href = '/';
        }
        function initDragAndDrop() {
            const trackSocial = document.getElementById('social-internal-track');
            if(trackSocial) {
                new Sortable(trackSocial, { 
                    handle: '.drag-handle', 
                    animation: 250, 
                    easing: "cubic-bezier(1, 0, 0, 1)", 
                    ghostClass: 'sortable-ghost', 
                    dragClass: 'sortable-drag',
                    // 🚀 FIX MOBILE: Costringe il telefono ad aspettare 100 millisecondi 
                    // per capire che vuoi trascinare e non scorrere la pagina
                    delay: 100, 
                    delayOnTouchOnly: true, 
                    onEnd: function () { 
                        // 🚀 FIX API: Avvisa il sistema che l'ordine è cambiato per far scattare il salvataggio
                        formModificato = true; 
                        aggiornaAnteprimaLive(); 
                        eseguiAutoSaveInvisibile(); 
                    }
                });
            }
        }

        function avviamyquicktag() {
            accendiIControlli(); 
            inizializzaPagina(); 
            initDragAndDrop();
            
            let conteggioTap = 0; let tempoUltimoTap = 0;
            const badgeDiv = document.getElementById('tag-username');

            if (badgeDiv) {
                badgeDiv.addEventListener('click', function(e) {
                    if(e.target.closest('.drawer-glass')) return;
                    const adesso = new Date().getTime();
                    if (adesso - tempoUltimoTap > 800) { conteggioTap = 0; }
                    conteggioTap++; tempoUltimoTap = adesso;

                    if (conteggioTap >= 3) {
                        conteggioTap = 0; window.onbeforeunload = null; 
                        const url = new URL(window.location.href); 
                        url.searchParams.set('ts', adesso); 
                        window.location.href = url.toString();
                    }
                });
            }
        }

        if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', avviamyquicktag); } else { avviamyquicktag(); } 
          // ==========================================
        // MOTORE UNIFICATO: INSIGHT E STRATEGIE
        // ==========================================
        const databaseStrategie = {
            'quickpass': { 
                titolo: "IL MOTORE VIRALE", 
                testo: '<div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">Moltiplicare i Clienti a Costo Zero</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Ogni cliente soddisfatto ha una rubrica WhatsApp piena di potenziali acquirenti. Il Quick Pass serve esattamente a raggiungere quelle persone. Offrendo il giusto incentivo, inneschi una vera e propria reazione a catena: il tuo cliente condivide la tua Tag, i suoi amici la aprono e tu acquisisci nuovi contatti pronti a spendere, senza pagare un centesimo in pubblicità.</div></div><div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Come innescare la condivisione</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6; margin-bottom: 12px;">Le persone inoltrano un link solo se ne traggono un vantaggio reale. Il sistema si basa su una regola semplicissima in cui vincono tutti:</div><ul style="list-style: none; padding: 0; margin: 0; font-size: 0.75rem; color: #9ca3af; line-height: 1.6;"><li style="margin-bottom: 12px;"><i class="fas fa-store" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Attività Locali:</strong> Il tuo cliente ti porta un amico e riceve un omaggio o un upgrade in cassa. L\'amico ottiene a sua volta un vantaggio al suo primo acquisto.</li><li style="margin-bottom: 12px;"><i class="fas fa-laptop" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Servizi e Professionisti:</strong> Chi condivide sblocca una consulenza extra o materiale riservato. Il nuovo contatto ottiene un bonus di benvenuto.</li><li><i class="fas fa-cog" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Controllo Totale:</strong> Sei tu a decidere il valore del premio. Lo imposti in base ai tuoi margini per assicurarti che ogni nuovo cliente ti porti sempre un utile netto.</li></ul></div><div style="background: rgba(229, 193, 88, 0.05); border: 1px solid rgba(229, 193, 88, 0.2); border-radius: 12px; padding: 18px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">L\'Impatto sul Fatturato</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Un contatto che ti viene mandato direttamente da un amico non ha bisogno di essere convinto: si fida già della raccomandazione. Questo ti permette di chiudere le vendite molto più velocemente e di trasformare la tua clientela attuale in una forza vendita automatica che lavora per farti incassare di più.</div></div>' 
            },
            'review': { 
                titolo: "IL FILTRO SALVA-FATTURATO", 
                testo: '<div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">Blindatura del Brand</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Le recensioni negative distruggono la fiducia. L\'80% dei consumatori scarta un\'attività con una media inferiore a 4 stelle. Un singolo commento arrabbiato su Google può costarti migliaia di euro in mancate vendite. Lo Scudo Reputazione ferma l\'emorragia prima che diventi pubblica.</div></div><div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Come funziona? (Il Bivio Intelligente)</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6; margin-bottom: 12px;">Quando un utente preme sullo Scudo, gli viene chiesto di valutare la sua esperienza. L\'algoritmo di myquicktag separa immediatamente il traffico:</div><ul style="list-style: none; padding: 0; margin: 0; font-size: 0.75rem; color: #9ca3af; line-height: 1.6;"><li style="margin-bottom: 12px;"><i class="fas fa-star-half-alt" style="color: #ef4444; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Da 1 a 3 Stelle (Dirottamento):</strong> Il cliente insoddisfatto viene mandato su un modulo di contatto privato. Sfogherà lì la sua frustrazione, permettendoti di rimediare a porte chiuse ed evitando la macchia su internet.</li><li><i class="fas fa-star" style="color: #10b981; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">4 o 5 Stelle (Pubblicazione):</strong> Il cliente entusiasta viene spedito direttamente sul tuo link Google Maps o Trustpilot, pronto a lasciarti una recensione perfetta.</li></ul></div><div style="background: rgba(229, 193, 88, 0.05); border: 1px solid rgba(229, 193, 88, 0.2); border-radius: 12px; padding: 18px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">Il Ritorno Economico (ROI)</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Alzi matematicamente la media delle tue recensioni pubbliche (migliorando il posizionamento SEO locale su Google) e trasformi un potenziale disastro mediatico in un cliente recuperato, isolando i problemi.</div></div>' 
            },
            'lead': { 
                titolo: "LA MACCHINA DEI CONTATTI", 
                testo: '<div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">Il Traffico Anonimo non Genera Fatturato</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Centinaia di persone visitano i tuoi link e spariscono nel nulla. Senza un sistema di acquisizione, stai letteralmente perdendo potenziali clienti ogni giorno. Il modulo Lead Capture trasforma i visitatori anonimi in contatti reali e profilati, permettendoti di costruire un database aziendale di tua esclusiva proprietà, su cui hai il controllo assoluto.</div></div><div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #ffffff; margin-bottom: 12px;">L\'Esca Strategica (Lead Magnet)</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6; margin-bottom: 12px;">Nessuno lascia i propri dati personali senza un motivo valido. Per far funzionare la raccolta, devi offrire un incentivo immediato in cambio del contatto. Ecco come strutturarlo:</div><ul style="list-style: none; padding: 0; margin: 0; font-size: 0.75rem; color: #9ca3af; line-height: 1.6;"><li style="margin-bottom: 12px;"><i class="fas fa-store" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Locali e Negozi:</strong> "Inserisci la tua email per ricevere subito uno sconto del 10% sul tuo primo acquisto".</li><li style="margin-bottom: 12px;"><i class="fas fa-laptop" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Professionisti:</strong> "Lascia i tuoi dati per ricevere gratuitamente la nostra guida in formato PDF" oppure "Prenota un check-up gratuito".</li><li><i class="fas fa-cog" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">La Regola:</strong> L\'offerta deve avere un valore percepito superiore allo "sforzo" di lasciare il contatto.</li></ul></div><div style="background: rgba(229, 193, 88, 0.05); border: 1px solid rgba(229, 193, 88, 0.2); border-radius: 12px; padding: 18px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">Remarketing a Costo Zero</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Questo è il vero vantaggio del sistema: una volta acquisito il dato del cliente, non dovrai più pagare gli algoritmi dei social network per farti vedere da lui. Potrai inviargli offerte mirate, aggiornamenti o promozioni direttamente via mail o telefono, generando vendite ripetute nel tempo con un costo pubblicitario matematicamente azzerato.</div></div>' 
            },
            'status': { 
                titolo: "IL SEMAFORO DELLE VENDITE", 
                testo: '<div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">Psicologia della Scarsità e dell\'Azione</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Il mercato odia l\'incertezza. Un potenziale cliente che atterra su un sito statico non sa se riceverà risposta in 5 minuti o in 2 giorni. Il Live Status abbatte questa frizione psicologica. Il semaforo verde ("Online, chiamami ora") garantisce attenzione immediata e azzera gli ostacoli al contatto. Al contrario, il giallo o rosso ("In cantiere", "Sold out fino a domani") comunicano autorevolezza: dimostrano che sei operativo, che il tuo tempo è richiesto e innescano il principio di scarsità.</div></div><div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #ffffff; margin-bottom: 8px;">L\'Effetto Rete (Il vero moltiplicatore)</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Su una singola Tag, il semaforo è un ottimo filtro per le aspettative. Ma il suo 100% di potenziale esplode solo quando crei un ecosistema su myquicktag.it. Se i tuoi partner e collaboratori adottano il sistema, la "Cerchia di Fiducia" si trasforma in un hub live: puoi vedere in tempo reale quale partner è "Verde" e passargli un cliente all\'istante. Sei tu a dover innescare questa rete, portando a bordo i tuoi contatti chiave per dominare la tua nicchia.</div></div><div style="background: rgba(229, 193, 88, 0.05); border: 1px solid rgba(229, 193, 88, 0.2); border-radius: 12px; padding: 18px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">Gestione Tattica dei Lead</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Rispondere in ritardo brucia i contatti. Impostare uno stato operativo chiaro (es. "In riunione, lasciami un WhatsApp") educa il cliente sul metodo esatto per interagire con te in quel momento. Non perdi il lead per frustrazione e non vieni interrotto da chiamate fuori orario: incanali il traffico esattamente dove e quando vuoi gestirlo, proteggendo il tuo tempo aziendale.</div></div>' 
            },
            'flash': { 
                titolo: "ANNUNCIO IMPERDIBILE", 
                testo: '<div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">Dominare l\'Attenzione Visiva</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Sul web gli utenti soffrono di "banner blindness": ignorano in automatico grafiche complesse e messaggi promozionali standard. MQT Flash utilizza un formato testuale nativo ad alto contrasto posizionato in cima all\'interfaccia. Essendo percepito come un avviso di sistema in tempo reale, aggira i filtri mentali del cliente e garantisce un tasso di lettura assoluto.</div></div><div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Casi d\'Uso Tattici</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6; margin-bottom: 12px;">L\'efficacia di questo strumento risiede nella sua natura temporanea. Se diventa fisso, perde impatto. Si utilizza per comunicazioni fulminee:</div><ul style="list-style: none; padding: 0; margin: 0; font-size: 0.75rem; color: #9ca3af; line-height: 1.6;"><li style="margin-bottom: 12px;"><i class="fas fa-store" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Gestione Imprevisti:</strong> "Tavolo per 4 appena liberato per stasera" oppure "Annullamento: slot delle 15:00 disponibile".</li><li style="margin-bottom: 12px;"><i class="fas fa-laptop" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Lanci Lampo:</strong> "Il nuovo listino invernale è online" o "Webinar live tra 1 ora".</li><li><i class="fas fa-cog" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Servizio Clienti:</strong> "Attenzione: oggi chiusura anticipata alle 18:00". Previene disservizi e lamentele.</li></ul></div><div style="background: rgba(229, 193, 88, 0.05); border: 1px solid rgba(229, 193, 88, 0.2); border-radius: 12px; padding: 18px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">Il Megafono, non il Carrello</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Attenzione a non confondere questa funzione con l\'Acquisto Istantaneo. MQT Flash non serve a far pagare il cliente, ma è il tuo altoparlante digitale. Usalo per dirottare immediatamente l\'attenzione dei visitatori su un\'informazione cruciale o per riempire un buco in agenda all\'ultimo minuto.</div></div>' 
            },
            'shop': { 
                titolo: "VENDITA D'IMPULSO", 
                testo: '<div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">La Psicologia dell\'Urgenza (FOMO)</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Nel mercato digitale, l\'ostacolo più grande alla vendita non è il prezzo, ma la procrastinazione. Un normale link a un listino o a un e-commerce viene guardato e chiuso con la promessa di "comprare più tardi". L\'Acquisto Istantaneo con timer visuale attiva la leva della scarsità. Il cliente sa matematicamente che, se fa scadere il tempo, l\'offerta viene bruciata e persa per sempre.</div></div><div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Architettura dell\'Offerta Flash</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6; margin-bottom: 12px;">Il timer funziona esclusivamente se associato a un\'offerta forte o a un prodotto scarso. Ecco le dinamiche di conversione:</div><ul style="list-style: none; padding: 0; margin: 0; font-size: 0.75rem; color: #9ca3af; line-height: 1.6;"><li style="margin-bottom: 12px;"><i class="fas fa-store" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Retail e Ristorazione:</strong> Promozioni last-minute. Esempio: "Ultimi 3 tavoli disponibili per stasera al 20% di sconto" oppure "Liquidazione stock limitato in 24 ore".</li><li style="margin-bottom: 12px;"><i class="fas fa-laptop" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Servizi e Digital:</strong> "Consulenza strategica a prezzo bloccato. La finestra di iscrizione chiude stasera a mezzanotte".</li><li><i class="fas fa-cog" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Pagamento Diretto:</strong> Il link inserito deve portare l\'utente direttamente al checkout (Stripe, PayPal o carrello). Nessun passaggio intermedio o ostacolo.</li></ul></div><div style="background: rgba(229, 193, 88, 0.05); border: 1px solid rgba(229, 193, 88, 0.2); border-radius: 12px; padding: 18px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">L\'Impatto sul Cashflow</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Questo modulo è progettato per generare liquidità immediata. Costringendo l\'utente a una decisione sotto pressione, si abbattono drasticamente i tassi di abbandono della pagina, convertendo il traffico generato dalla Tag in incassi reali e tracciabili nel brevissimo termine.</div></div>' 
            },
          'video': { 
                titolo: "LO SMART VIDEO VAULT", 
                testo: '<div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">La Trappola degli Algoritmi</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Se mandi un potenziale cliente a guardare un tuo video su una piattaforma pubblica o sui social, lo stai regalando a quell\'ecosistema. Appena finisce il tuo contenuto, l\'algoritmo dirotta la sua attenzione sul video di un competitor o su una distrazione. Lo Smart Video Vault crea invece un ambiente chiuso: niente pubblicità esterne, niente distrazioni, nessun video correlato. L\'attenzione del cliente è matematicamente blindata su di te.</div></div><div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Il Palcoscenico per Creator e Brand</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6; margin-bottom: 12px;">Per chi opera sui social o fa personal branding, questo è lo strumento di posizionamento definitivo. Inserisci un video di presentazione, il lancio di un prodotto o una demo.</div><ul style="list-style: none; padding: 0; margin: 0; font-size: 0.75rem; color: #9ca3af; line-height: 1.6;"><li style="margin-bottom: 12px;"><i class="fas fa-play-circle" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Immersione Totale:</strong> Il player pulito fa respirare il contenuto, elevando la percezione del tuo brand al livello premium.</li><li><i class="fas fa-bullseye" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Traffico Controllato:</strong> Sei tu a decidere cosa guarda l\'utente e, soprattutto, quale sarà il suo prossimo passo. Nessuna fuga verso altri canali.</li></ul></div><div style="background: rgba(229, 193, 88, 0.05); border: 1px solid rgba(229, 193, 88, 0.2); border-radius: 12px; padding: 18px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">Dallo Schermo alla Cassa</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Un video genera emozione, ma l\'emozione senza azione è traffico sprecato. Il vero motore del Video Vault è la Call to Action ancorata. Nel momento esatto in cui il cliente si "scalda" guardando il contenuto, ha il pulsante a un millimetro dal pollice per atterrare sul carrello, iscriversi o scriverti. Converti l\'entusiasmo in fatturato istantaneo.</div></div>' 
            },
            'action': { 
                titolo: "L'AZIONE PRIORITARIA", 
                testo: '<div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">La Dittatura dell\'Attenzione</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Sul web la regola è matematica: troppe scelte equivalgono a nessuna scelta. Se presenti a un potenziale cliente decine di link tutti uguali, la sua attenzione collassa e abbandona la pagina. L\'Azione Rapida (CTA) è il tuo faro direzionale. È il singolo pulsante che spicca su tutto il resto e che urla all\'utente qual è l\'unica azione davvero importante che deve compiere per portarti soldi in cassa.</div></div><div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Posizionamento Strategico</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6; margin-bottom: 12px;">Puoi modulare l\'aggressività di questo bottone scegliendo dove piazzarlo:</div><ul style="list-style: none; padding: 0; margin: 0; font-size: 0.75rem; color: #9ca3af; line-height: 1.6;"><li style="margin-bottom: 12px;"><i class="fas fa-layer-group" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Dentro l\'Action Center:</strong> Ideale per chiudere la vendita o acquisire il contatto dopo che l\'utente ha esplorato con calma la tua vetrina.</li><li><i class="fas fa-thumbtack" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Fissato in Copertina:</strong> La modalità più estrema. Il bottone bypassa i menu ed esplode subito in prima pagina sotto il tuo nome. Da usare per urgenze assolute ("Chiama Ora", "Naviga verso il negozio", "Prenota un Tavolo"). È la corsia di sorpasso verso lo scontrino.</li></ul></div><div style="background: rgba(229, 193, 88, 0.05); border: 1px solid rgba(229, 193, 88, 0.2); border-radius: 12px; padding: 18px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">Attrito Zero e Conversione</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Ogni secondo in più che un cliente impiega per capire come contattarti, le probabilità di chiudere la vendita crollano del 20%. Impostando un collegamento operativo diretto (come un link WhatsApp pre-compilato, un link al tuo gestionale appuntamenti o la chiamata diretta), azzeri le frizioni. L\'utente preme il bottone dorato e sta già parlando con te.</div></div>' 
            },
            'partners': { 
                titolo: "IL NETWORK DI REFERENZE", 
                testo: '<div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">La Dispersione del Traffico</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Sia online che offline, quando un cliente finisce di interagire con te, torna su Google o sui social per cercare il servizio successivo. La "Cerchia di Fiducia" blocca questa emorragia. Creando un ecosistema chiuso con altri business complementari, il traffico circola esclusivamente all\'interno del vostro circuito, azzerando la concorrenza esterna.</div></div><div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 18px; margin-bottom: 15px;"><div style="font-size: 0.95rem; font-weight: 800; color: #ffffff; margin-bottom: 12px;">Connessioni Fisiche e Digitali</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6; margin-bottom: 12px;">Connettere le rispettive Tag genera un trasferimento di fiducia automatico, applicabile a qualsiasi mercato:</div><ul style="list-style: none; padding: 0; margin: 0; font-size: 0.75rem; color: #9ca3af; line-height: 1.6;"><li style="margin-bottom: 12px;"><i class="fas fa-laptop" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Business Digitale:</strong> Un e-commerce di abbigliamento si collega a un brand di accessori. Un web designer raccomanda l\'esperto SEO. Il traffico si scambia online.</li><li style="margin-bottom: 12px;"><i class="fas fa-store" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Business Fisico:</strong> Il centro fitness inserisce la nutrizionista e il negozio di integratori locale. Il cliente viene fidelizzato nel quartiere.</li><li><i class="fas fa-cog" style="color: #e5c158; margin-right: 6px; width: 14px;"></i><strong style="color: #ffffff;">Consulenza e Servizi:</strong> L\'avvocato societario raccomanda il commercialista, passandosi clienti alto-spendenti a vicenda.</li></ul></div><div style="background: rgba(229, 193, 88, 0.05); border: 1px solid rgba(229, 193, 88, 0.2); border-radius: 12px; padding: 18px;"><div style="font-size: 0.95rem; font-weight: 800; color: #e5c158; margin-bottom: 8px;">Acquisizione Passiva (Zero CAC)</div><div style="font-size: 0.8rem; color: #d1d5db; line-height: 1.6;">Il network annulla i costi pubblicitari. Ogni volta che un tuo partner riceve una visita—che sia tramite una Tag fisica su un bancone o tramite un link in bio su Instagram—il tuo brand viene esposto a un cliente già pre-qualificato e pronto a comprare.</div></div>' 
            }
        };

  // 1. Funzione per le INFO BASE
function mostraInsight(titolo, htmlContent, event) {
    if(event) { event.preventDefault(); event.stopPropagation(); }

    const titleEl = document.getElementById('insight-title');
    const contentEl = document.getElementById('insight-content');
    const insightDrawer = document.getElementById('drawer-insight');

    if (titleEl && contentEl && insightDrawer) {
        titleEl.innerHTML = '<i class="fas fa-info-circle" style="color: #e5c158; margin-right: 8px;"></i>' + titolo;
        contentEl.innerHTML = htmlContent;

        insightDrawer.style.zIndex = "10000"; 
        insightDrawer.style.pointerEvents = "auto";
        setTimeout(() => { insightDrawer.classList.add('open'); }, 10);

        if (window.location.hash !== '#insight') {
            history.pushState(null, "", "#insight");
        }
    }
}

// 2. Funzione per le STRATEGIE PREMIUM
function apriStrategia(idFeature, event) {
    if(event) { event.preventDefault(); event.stopPropagation(); }
    const dati = databaseStrategie[idFeature];
    
    if(dati) {
        const titleEl = document.getElementById('strategia-title');
        const contentEl = document.getElementById('strategia-content');
        const strategiaDrawer = document.getElementById('drawer-strategia');

        if (titleEl && contentEl && strategiaDrawer) {
            titleEl.innerHTML = '<i class="fas fa-bolt" style="color: #e5c158; margin-right: 8px;"></i>' + dati.titolo;
            contentEl.innerHTML = dati.testo;

            // FIX: Nasconde il tasto "Sblocca" se la funzione è gratis (Cerchia di Fiducia)
            const bannerSblocco = strategiaDrawer.lastElementChild;
            if(bannerSblocco) {
                bannerSblocco.style.display = (idFeature === 'partners') ? 'none' : 'block';
            }

            strategiaDrawer.style.zIndex = "10000"; 
            strategiaDrawer.style.pointerEvents = "auto";
            setTimeout(() => { strategiaDrawer.classList.add('open'); }, 10);

            if (window.location.hash !== '#strategia') {
                history.pushState(null, "", "#strategia");
            }
        } else {
             alert("ERRORE CRITICO: L'HTML del cassetto 'drawer-strategia' non è stato trovato.");
        }
    }
}
        function chiudiInsight() {
            const insightDrawer = document.getElementById('drawer-insight');
            if (insightDrawer) insightDrawer.classList.remove('open');
            
            // Torna indietro nella cronologia senza far chiudere l'editor
            if (window.location.hash === '#insight') {
                history.back();
            }
        }
        function chiudiStrategia() {
    const strategiaDrawer = document.getElementById('drawer-strategia');
    if (strategiaDrawer) strategiaDrawer.classList.remove('open');
    
    // Torna indietro nella cronologia per il nuovo cassetto marketing
    if (window.location.hash === '#strategia') {
        history.back();
    }
}
        // ==========================================
// FUNZIONI MANCANTI GALLERIA (Fix Errore Caricamento)
// ==========================================
function disegnaGrigliaGalleria() {
    const hiddenField = document.getElementById('field-gallery-data');
    const grid = document.getElementById('gallery-preview-grid');
    if (!hiddenField || !grid) return;
    
    let arrayAttuale = [];
    try { arrayAttuale = JSON.parse(hiddenField.value || '[]'); } catch(e) {}
    
    grid.innerHTML = '';
    arrayAttuale.forEach((url, i) => {
        grid.innerHTML += `
        <div style="position:relative; aspect-ratio:1/1; border-radius:8px; overflow:hidden; border: 1px solid rgba(255,255,255,0.1);">
            <img src="${url}" style="width:100%; height:100%; object-fit:cover;">
            <div style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.7); width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="rimuoviFotoGalleria(${i})">
                <i class="fas fa-trash" style="color:#ff4444; font-size:0.7rem;"></i>
            </div>
        </div>`;
    });
}

function rimuoviFotoGalleria(index) {
    const hiddenField = document.getElementById('field-gallery-data');
    let arrayAttuale = [];
    try { arrayAttuale = JSON.parse(hiddenField.value || '[]'); } catch(e) {}
    arrayAttuale.splice(index, 1);
    if(hiddenField) hiddenField.value = JSON.stringify(arrayAttuale);
    disegnaGrigliaGalleria();
    aggiornaAnteprimaLive(); 
    eseguiAutoSaveInvisibile();
}

// ==========================================
// MOTORE POPUP CUSTOM BLINDATO (Creato via JS)
// ==========================================
// ==========================================
// MOTORE POPUP CUSTOM BLINDATO (Dinamico per Premium e Gold)
// ==========================================
function mostraPopupPremium(titolo, messaggio, livello = 'GOLD') {
    let overlay = document.getElementById('premium-alert-overlay');
    
    // Scegliamo il colore in base al piano richiesto
    const coloreAccento = (livello === 'PREMIUM') ? '#10b981' : '#d4af37';
    const ombraAccento = (livello === 'PREMIUM') ? 'rgba(16, 185, 129, 0.4)' : 'rgba(212, 175, 55, 0.4)';

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'premium-alert-overlay';
        document.body.appendChild(overlay);
    } else {
        document.body.appendChild(overlay); 
    }

    overlay.style.cssText = 'display: flex !important; position: fixed !important; top: 0 !important; left: 0 !important; width: 100vw !important; height: 100vh !important; background: rgba(0, 0, 0, 0.92) !important; backdrop-filter: blur(2px) !important; z-index: 2147483647 !important; justify-content: center !important; align-items: center !important; padding: 20px !important; box-sizing: border-box !important; opacity: 0; transition: opacity 0.3s ease; pointer-events: auto !important;';
    
    overlay.innerHTML = `
        <div style="background: #15151a !important; border: 2px solid ${coloreAccento} !important; border-radius: 24px !important; padding: 32px 24px !important; text-align: center !important; width: 100% !important; max-width: 340px !important; box-shadow: 0 25px 60px rgba(0,0,0,0.9) !important; transform: scale(0.95); transition: transform 0.3s ease; box-sizing: border-box !important; position: relative !important;">
            <button onclick="chiudiPremiumAlert()" style="position: absolute !important; top: 15px !important; right: 15px !important; background: rgba(255,255,255,0.1) !important; border: none !important; color: #fff !important; width: 32px !important; height: 32px !important; border-radius: 50% !important; font-size: 1.2rem !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; z-index: 10 !important; outline: none !important;">&times;</button>
            <i class="fas fa-lock" style="font-size: 2.5rem !important; color: ${coloreAccento} !important; margin-bottom: 20px !important; filter: drop-shadow(0 0 10px ${ombraAccento}) !important;"></i>
            <h3 style="color: #fff !important; font-size: 1.05rem !important; font-weight: 600 !important; margin-bottom: 12px !important; letter-spacing: 2px !important; text-transform: uppercase !important; font-family: 'Inter', sans-serif !important; margin-top:0 !important;">${titolo}</h3>
            <p style="color: #a0a0a5 !important; font-size: 0.9rem !important; font-weight: 300 !important; line-height: 1.6 !important; margin-bottom: 28px !important; font-family: 'Inter', sans-serif !important;">${messaggio}</p>
            <button onclick="confermaPremiumAlert()" style="width: 100% !important; padding: 16px !important; background: ${coloreAccento} !important; border: none !important; border-radius: 12px !important; color: #000 !important; font-size: 0.85rem !important; font-weight: 700 !important; letter-spacing: 2px !important; cursor: pointer !important; text-transform: uppercase !important; outline: none !important;">GESTIONE PIANI</button>
        </div>
    `;

    setTimeout(() => {
        overlay.style.setProperty('opacity', '1', 'important');
        overlay.children[0].style.setProperty('transform', 'scale(1)', 'important');
    }, 10);
}
function chiudiPremiumAlert() {
    const overlay = document.getElementById('premium-alert-overlay');
    if (overlay) {
        overlay.style.setProperty('opacity', '0', 'important');
        if (overlay.children[0]) {
            overlay.children[0].style.setProperty('transform', 'scale(0.95)', 'important');
        }
        setTimeout(() => { 
            overlay.style.setProperty('display', 'none', 'important');
            overlay.style.setProperty('pointer-events', 'none', 'important');
        }, 300);
    }
}

function confermaPremiumAlert() {
    chiudiPremiumAlert(); 
    setTimeout(() => { apriDrawer('drawer-piani'); }, 300); 
}
