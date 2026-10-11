export const dynamic = 'force-static';

// Square icon for the Blink card: the mochi on a lavender-to-teal tile.
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a18bff"/><stop offset="1" stop-color="#7fdcd0"/></linearGradient>
<linearGradient id="m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf1"/><stop offset="1" stop-color="#f4e8d6"/></linearGradient></defs>
<rect width="512" height="512" rx="96" fill="url(#g)"/>
<ellipse cx="256" cy="300" rx="170" ry="130" fill="url(#m)"/>
<circle cx="206" cy="290" r="13" fill="#3a2633"/><circle cx="306" cy="290" r="13" fill="#3a2633"/>
<ellipse cx="176" cy="322" rx="24" ry="11" fill="#ffa078" opacity=".6"/><ellipse cx="336" cy="322" rx="24" ry="11" fill="#ffa078" opacity=".6"/>
<text x="256" y="150" text-anchor="middle" font-family="system-ui, sans-serif" font-size="88" font-weight="800" fill="#22182a">◎ pot</text>
</svg>`;

export function GET() {
  return new Response(SVG, { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400', 'Access-Control-Allow-Origin': '*' } });
}
