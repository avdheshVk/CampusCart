// utils/qr.js
// Turns any text into an inline <svg> QR code — no npm package needed.
// The encoder in lib/qrcode/ is the MIT-licensed "QRCode for JavaScript"
// by Kazuhiko Arase (bundled so the project has zero extra dependencies).

const QRCode = require('../lib/qrcode');

// Error-correction levels used by the encoder: L=1, M=0, Q=3, H=2
const LEVEL_M = 0;

function toSvg(text, { size = 240, margin = 4 } = {}) {
  // typeNumber 0 would be "auto" in some libs; this one needs a number,
  // so try increasing versions until the text fits.
  let qr = null;
  for (let type = 4; type <= 20; type++) {
    try {
      qr = new QRCode(type, LEVEL_M);
      qr.addData(text);
      qr.make();
      break;
    } catch (e) {
      qr = null;
    }
  }
  if (!qr) throw new Error('Text too long for QR code');

  const n = qr.getModuleCount();
  const total = n + margin * 2;
  let path = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) path += `M${c + margin},${r + margin}h1v1h-1z`;
    }
  }

  // White background + quiet zone are required for phone cameras to scan it.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" ` +
    `width="${size}" height="${size}" shape-rendering="crispEdges" role="img" aria-label="Payment QR code">` +
    `<rect width="${total}" height="${total}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#000000"/></svg>`;
}

module.exports = { toSvg };
