
export default function handler(req, res) {
  try {
    // Il codice SVG geometrico del tuo iconico Logo Q con la @ fusa all'interno
    const svgLogo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <rect width="512" height="512" fill="#000000"/>
  
  <g transform="translate(106, 106)">
    <circle cx="150" cy="150" r="120" stroke="#50C878" stroke-width="24" fill="none" />
    
    <path d="M 235 235 L 285 285" stroke="#50C878" stroke-width="24" stroke-linecap="round" />
    
    <text x="150" y="166" 
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
          font-size="115" 
          font-weight="900" 
          fill="#FFFFFF" 
          text-anchor="middle" 
          dominant-baseline="middle">@</text>
  </g>
</svg>`;

    // Diciamo al browser che questa è un'immagine vettoriale SVG ufficiale
    res.setHeader('Content-Type', 'image/svg+xml');
    
    // Cache aggressiva: il logo del brand non cambia mai, così l'icona si carica all'istante
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    
    return res.status(200).send(svgLogo);
  } catch (error) {
    console.error("Errore generazione icona:", error);
    return res.status(500).send("Errore");
  }
}
