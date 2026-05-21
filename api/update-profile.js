export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Metodo non consentito');

  const body = req.body;
  const { username_system } = body; 

  if (!username_system) {
    return res.status(400).json({ error: "username_system mancante" });
  }

  try {
    // 1. Ricerca utente con URL encoding sicuro per i caratteri speciali
    const formula = `{username_system}='${username_system}'`;
    const searchUrl = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}?filterByFormula=${encodeURIComponent(formula)}`;
    
    const response = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}` }
    });
    const data = await response.json();

    // 2. Definiamo i campi fissi/nativi che vanno nelle colonne reali di Airtable
    const fieldsToSave = {};
    const nativeFields = ["username_system", "username_display", "bio", "plan", "digital_style", "stato", "password", "email", "modulo_vcf"];
    
    nativeFields.forEach(f => {
      if (body[f] !== undefined) fieldsToSave[f] = body[f];
    });

    // 3. Logica Dinamica: Tutto quello che NON è un campo nativo finisce nel JSON dei canali
    const canaliObj = {};
    Object.keys(body).forEach(key => {
      // Se il campo non è tra quelli nativi e non è vuoto, lo infiliamo nel contenitore
      if (!nativeFields.includes(key) && body[key] !== undefined) {
        canaliObj[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
      }
    });
    
    // Salviamo l'intero pacchetto dinamico come stringa JSON nella colonna dedicata
    fieldsToSave.config_canali = JSON.stringify(canaliObj);

    if (data.records && data.records.length > 0) {
      // --- LOGICA UPDATE ---
      const recordId = data.records[0].id;
      const update = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}/${recordId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: fieldsToSave })
      });

      if (update.ok) return res.status(200).json({ success: true, action: 'updated' });
      
    } else {
      // --- LOGICA CREATE ---
      if (!fieldsToSave.stato) fieldsToSave.stato = "in attesa";
      fieldsToSave.views = 0; // Inizializza il contatore se nuovo utente

      const create = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_ID}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields: fieldsToSave })
      });

      if (create.ok) return res.status(200).json({ success: true, action: 'created' });
    }

    return res.status(500).json({ error: "Errore durante l'operazione su Airtable" });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
