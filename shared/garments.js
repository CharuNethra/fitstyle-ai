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
  kurta: {
    h: 290,
    shoulders: [58, 142],
    d: 'M58 14 L84 6 Q100 24 116 6 L142 14 L174 40 L190 150 L168 154 L150 72 L156 280 Q100 288 44 280 L50 72 L32 154 L10 150 L26 40 Z',
    details: ['M100 14 L100 96', 'M50 230 Q100 238 150 230'],
    buttons: [[100, 40], [100, 60], [100, 80]],
  },
  bra: {
    h: 112,
    shoulders: [56, 144],
    d: 'M16 60 Q22 36 56 30 Q96 30 100 70 Q104 30 144 30 Q178 36 184 60 L184 96 Q100 110 16 96 Z',
    details: ['M56 30 L64 2', 'M144 30 L136 2', 'M100 70 L100 100', 'M18 84 Q100 98 182 84'],
  },
  brief: {
    h: 118,
    shoulders: [40, 160],
    d: 'M10 10 L190 10 L186 40 Q150 60 122 112 L78 112 Q50 60 14 40 Z',
    details: ['M12 24 L188 24'],
  },
  heels: {
    h: 140,
    d: 'M10 112 Q18 66 58 72 Q108 82 148 42 Q170 30 188 42 L190 72 L176 74 L172 132 L162 132 L160 80 Q120 98 80 120 Q40 130 12 126 Z',
    details: ['M14 118 Q60 114 100 100'],
  },
  sneaker: {
    h: 110,
    d: 'M8 72 Q10 42 40 36 L70 30 Q90 50 120 50 Q150 50 172 60 Q194 70 192 86 L192 98 L8 98 Z',
    details: ['M8 86 L192 86', 'M60 40 L80 56', 'M74 36 L94 52', 'M88 34 L108 50'],
  },
  sandal: {
    h: 96,
    d: 'M10 74 Q20 60 100 62 Q180 60 190 74 Q190 88 100 88 Q10 88 10 74 Z M46 66 Q66 18 100 20 Q134 18 154 66 L140 66 Q124 34 100 34 Q76 34 60 66 Z',
    details: ['M76 64 Q100 46 124 64'],
  },
  loafer: {
    h: 100,
    d: 'M8 76 Q10 46 50 42 L110 40 Q160 42 184 62 Q194 72 192 86 L8 86 Z',
    details: ['M70 48 Q100 64 130 48', 'M8 80 L192 80'],
  },
  boot: {
    h: 210,
    d: 'M60 8 L130 8 L132 140 Q170 150 188 170 Q196 186 192 200 L40 200 L52 140 Z',
    details: ['M48 188 L192 188', 'M110 20 L114 120'],
  },
  bag: {
    h: 170,
    d: 'M24 62 L176 62 L190 162 L10 162 Z M56 62 Q56 8 100 8 Q144 8 144 62 L132 62 Q132 20 100 20 Q68 20 68 62 Z',
    details: ['M24 62 L100 104 L176 62'],
    buttons: [[100, 104]],
  },
  necklace: {
    h: 170,
    d: 'M20 10 Q100 150 180 10 L172 10 Q100 136 28 10 Z M100 128 A18 22 0 1 1 99.9 128 Z',
    details: [],
  },
  watch: {
    h: 220,
    d: 'M78 0 L122 0 L122 220 L78 220 Z M100 62 A48 48 0 1 1 99.9 62 Z',
    details: ['M100 76 A34 34 0 1 1 99.9 76', 'M100 110 L100 88', 'M100 110 L116 120'],
  },
  sunglasses: {
    h: 90,
    d: 'M4 20 L196 20 L196 30 L182 30 Q180 82 138 82 Q108 82 106 40 L94 40 Q92 82 62 82 Q20 82 18 30 L4 30 Z',
    details: ['M30 40 Q50 34 70 44', 'M130 40 Q150 34 170 44'],
  },
  belt: {
    h: 64,
    d: 'M0 20 L200 20 L200 44 L0 44 Z',
    details: ['M68 10 L112 10 L112 54 L68 54 Z', 'M90 32 L130 32'],
    buttons: [[150, 32], [166, 32], [182, 32]],
  },
  scarf: {
    h: 260,
    d: 'M40 0 L160 0 L150 250 L100 230 L50 250 Z',
    details: ['M60 0 L56 236', 'M140 0 L144 236'],
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
