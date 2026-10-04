// ============================================================
// MIGRAZIONE CHIAVI LOCALSTORAGE AL NUOVO STANDARD "mqt_"
// ============================================================
// Va incluso come PRIMO script in ogni pagina, prima di qualsiasi
// altro codice che legga/scriva localStorage.
//
// Sicuro da eseguire ad ogni caricamento pagina: dopo la prima
// migrazione le vecchie chiavi non esistono più, quindi i controlli
// successivi non fanno nulla (nessun costo per gli utenti già migrati).
(function() {
    const MAPPA_MIGRAZIONE = {
        'loggedUser': 'mqt_logged_user',
        'myquicktag_keys': 'mqt_keys',
        'myquicktag_reserved': 'mqt_reserved',
        'myquicktag_pending': 'mqt_pending',
        'scrollPos': 'mqt_scroll_pos',
        'haVistoAnteprima': 'mqt_ha_visto_anteprima',
        'justPublished': 'mqt_just_published'
    };

    Object.entries(MAPPA_MIGRAZIONE).forEach(([vecchiaChiave, nuovaChiave]) => {
        const valoreVecchio = localStorage.getItem(vecchiaChiave);
        if (valoreVecchio === null) return; // Niente da migrare per questa chiave

        // Copia il valore solo se la nuova chiave non è già stata popolata
        // (protezione extra in caso di esecuzioni parallele da più tab)
        if (localStorage.getItem(nuovaChiave) === null) {
            localStorage.setItem(nuovaChiave, valoreVecchio);
        }
        localStorage.removeItem(vecchiaChiave);
    });
})();
