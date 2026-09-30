// utils/network.js
// A phone can't open "localhost" — that means the phone itself. So the QR code
// must contain an address the phone can reach: this computer's Wi-Fi/LAN IP.

const os = require('os');

// Pick the most likely Wi-Fi/LAN address (skips VirtualBox / WSL / Docker style adapters where possible).
function getLanIp() {
  const candidates = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) candidates.push(a.address);
    }
  }
  const rank = (ip) => {
    if (ip.startsWith('192.168.56.')) return 9;                 // VirtualBox host-only
    if (ip.startsWith('192.168.')) return 0;                    // typical home / hostel Wi-Fi
    if (ip.startsWith('10.')) return 1;                         // typical college / office Wi-Fi
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 5;        // often WSL / Docker
    return 7;
  };
  candidates.sort((a, b) => rank(a) - rank(b));
  return candidates[0] || null;
}

// The address to put inside the QR code, without a trailing slash.
//   1. PUBLIC_URL env var wins (e.g. an ngrok link when presenting over the internet)
//   2. if the site was opened via a non-localhost address, reuse that
//   3. otherwise use this computer's LAN IP
function getBaseUrl(req) {
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL.replace(/\/+$/, '');

  const host = req.get('host') || '';
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  if (host && !isLocal) return `${req.protocol}://${host}`;

  const ip = getLanIp();
  const port = process.env.PORT || 3000;
  return ip ? `http://${ip}:${port}` : `${req.protocol}://${host}`;
}

module.exports = { getLanIp, getBaseUrl };
