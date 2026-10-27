// Vector garment illustrations used for catalog imagery and for the local
// mock virtual try-on pipeline (rasterised server-side and composited).

const SHAPES = {
  dress: {
    h: 250,
    shoulders: [60, 140],
    d: 'M60 12 L80 8 Q100 36 120 8 L140 12 L138 60 Q134 84 136 100 L178 236 Q100 256 22 236 L64 100 Q66 84 62 60 Z',
    details: ['M64 100 Q100 108 136 100'],
  },
  gown: {
    h: 330,
    shoulders: [60, 140],
    d: 'M60 12 L80 8 Q100 36 120 8 L140 12 L138 60 Q134 84 136 100 L190 312 Q100 336 10 312 L64 100 Q66 84 62 60 Z',
    details: ['M64 100 Q100 108 136 100', 'M100 112 L84 318', 'M100 112 L118 318'],
  },
  top: {
    h: 170,
    shoulders: [58, 142],
    d: 'M58 14 L82 6 Q100 30 118 6 L142 14 L172 36 L160 70 L140 58 L142 160 Q100 168 58 160 L60 58 L40 70 L28 36 Z',
    details: ['M60 58 Q50 50 44 62', 'M140 58 Q150 50 156 62'],
  },
  tee: {
    h: 170,
    shoulders: [56, 144],
    d: 'M56 14 L84 6 Q100 22 116 6 L144 14 L176 48 L156 68 L142 56 L144 162 L56 162 L58 56 L44 68 L24 48 Z',
    details: [],
  },
  knit: {
    h: 190,
    shoulders: [56, 144],
    d: 'M56 14 L84 6 Q100 22 116 6 L144 14 L172 40 L190 168 L168 172 L148 70 L146 182 L54 182 L52 70 L32 172 L10 168 L28 40 Z',
    details: ['M54 168 L146 168', 'M54 174 L146 174', 'M84 6 Q100 30 116 6'],
  },
  blazer: {
    h: 210,
    shoulders: [56, 144],
    d: 'M56 14 L84 6 L100 70 L116 6 L144 14 L174 40 L192 190 L170 194 L152 80 L150 200 L50 200 L48 80 L30 194 L8 190 L26 40 Z',
    details: ['M84 6 L72 60 L100 110', 'M116 6 L128 60 L100 110', 'M100 110 L100 200', 'M66 150 L86 150', 'M114 150 L134 150'],
    buttons: [[106, 124], [106, 150]],
  },
  coat: {
    h: 290,
    shoulders: [56, 144],
    d: 'M56 14 L84 6 L100 60 L116 6 L144 14 L174 40 L194 220 L172 224 L154 86 L158 282 L42 282 L46 86 L28 224 L6 220 L26 40 Z',
    details: ['M84 6 L68 64 L96 120', 'M116 6 L132 64 L104 120', 'M100 120 L100 282', 'M46 150 Q100 160 154 150'],
    buttons: [[88, 140], [112, 140], [88, 180], [112, 180]],
  },
  jacket: {
    h: 180,
    shoulders: [56, 144],
    d: 'M56 14 L84 6 L100 40 L116 6 L144 14 L174 40 L190 160 L168 164 L150 76 L150 172 L50 172 L50 76 L32 164 L10 160 L26 40 Z',
    details: ['M100 40 L100 172', 'M62 90 L90 90 L90 114 L62 114 Z', 'M110 90 L138 90 L138 114 L110 114 Z', 'M50 156 L150 156'],
    buttons: [[100, 70], [100, 100], [100, 130]],
  },
};

export const GARMENT_SHAPES = SHAPES;

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function garmentSvg(product, { background = false } = {}) {
  const shape = SHAPES[product.type] || SHAPES.dress;
  const { h, d } = shape;
  const pad = background ? 30 : 0;
  const vbW = 200 + pad * 2;
  const vbH = h + pad * 2;
  const light = luminance(product.color) > 0.6;
  const ink = light ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.22)';
  const patternFill = light ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.28)';
  const id = product.id.replace(/[^a-z0-9]/gi, '');

  let pattern = '';
  if (product.pattern === 'stripes') {
    pattern = `<pattern id="pt-${id}" width="200" height="16" patternUnits="userSpaceOnUse"><rect width="200" height="7" fill="${patternFill}"/></pattern>`;
  } else if (product.pattern === 'dots') {
    pattern = `<pattern id="pt-${id}" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="2.6" fill="${patternFill}"/></pattern>`;
  }

  const bg = background
    ? `<rect width="${vbW}" height="${vbH}" fill="url(#bg-${id})"/>`
    : '';
  const bgGrad = background
    ? `<radialGradient id="bg-${id}" cx="50%" cy="40%" r="75%"><stop offset="0%" stop-color="#ffffff"/><stop offset="100%" stop-color="${light ? '#e9e2d8' : '#f3eee8'}"/></radialGradient>`
    : '';

  const details = (shape.details || [])
    .map((dd) => `<path d="${dd}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`)
    .join('');
  const buttons = (shape.buttons || [])
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="3.2" fill="${light ? '#b8954a' : '#d9c08a'}"/>`)
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vbW} ${vbH}" width="${vbW * 2}" height="${vbH * 2}">
<defs>${bgGrad}${pattern}
<linearGradient id="sh-${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stop-color="#000" stop-opacity="0.22"/><stop offset="35%" stop-color="#fff" stop-opacity="0.16"/><stop offset="60%" stop-color="#fff" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.26"/></linearGradient>
<linearGradient id="sv-${id}" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#fff" stop-opacity="0.12"/><stop offset="100%" stop-color="#000" stop-opacity="0.18"/></linearGradient>
</defs>${bg}
<g transform="translate(${pad} ${pad})">
<path d="${d}" fill="${product.color}"/>
${pattern ? `<path d="${d}" fill="url(#pt-${id})"/>` : ''}
<path d="${d}" fill="url(#sh-${id})"/>
<path d="${d}" fill="url(#sv-${id})"/>
${details}${buttons}
<path d="${d}" fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="1.2"/>
</g></svg>`;
}

export function garmentDataUri(product, opts) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(garmentSvg(product, opts))}`;
}
