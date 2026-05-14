export default function handler(req, res) {
    const { u } = req.query;
    const username = (u || 'user').toUpperCase();

    // Design: Nero profondo, testo bianco, font pulitissimo
    const svg = `
    <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" fill="black"/>
        <text 
            x="50%" 
            y="50%" 
            font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
            font-size="80" 
            font-weight="200"
            fill="white" 
            text-anchor="middle" 
            dominant-baseline="central"
            letter-spacing="5"
        >
            @${username}
        </text>
    </svg>
    `;

    res.setHeader('Content-Type', 'image/svg+xml');
    res.status(200).send(svg);
}
