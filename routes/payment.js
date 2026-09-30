// routes/payment.js
// DEMO payment gateway ("CampusPay") — no real money is ever moved.
//   GET  /pay/:id          -> payment page: shows a QR code (or a test-card form)
//   GET  /pay/:id/status   -> tiny JSON the payment page polls: { paid: true/false }
//   GET  /pay/scan/:token  -> opened by the PHONE that scans the QR; pays the order automatically
//   POST /pay/:id/card     -> validates a test card, then marks the order paid
//
// How the QR flow works: the QR contains a link like http://192.168.1.5:3000/pay/scan/<secret>.
// When a phone scans it, the server marks that order paid. Meanwhile the payment page on the
// computer keeps asking /status every 2 seconds, sees "paid", and jumps to the orders page.
//
// Card details are validated and thrown away — they are NEVER stored.

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { db } = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const { toSvg } = require('../utils/qr');
const { getBaseUrl } = require('../utils/network');

// Load an order and make sure it belongs to the logged-in user.
function getOwnOrder(req, res) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.user.id);
  if (!order) {
    res.status(404).send('Order not found');
    return null;
  }
  return order;
}

// Fake gateway reference, e.g. CP-7F3A9C21B4
function newPaymentRef() {
  return 'CP-' + crypto.randomBytes(5).toString('hex').toUpperCase();
}

function markPaid(orderId, method) {
  const ref = newPaymentRef();
  db.prepare(`
    UPDATE orders
    SET status = 'placed', payment_status = 'paid', payment_method = ?,
        payment_ref = ?, paid_at = datetime('now')
    WHERE id = ? AND payment_status = 'pending'
  `).run(method, ref, orderId);
  return ref;
}

// Standard card-number checksum (Luhn) — 4242 4242 4242 4242 passes.
function luhnValid(num) {
  let sum = 0, alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = parseInt(num[i], 10);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function renderPayPage(req, res, order, extra = {}) {
  // Every order gets its own unguessable token; it is the "key" inside the QR code.
  let token = order.pay_token;
  if (!token) {
    token = crypto.randomBytes(16).toString('hex');
    db.prepare('UPDATE orders SET pay_token = ? WHERE id = ?').run(token, order.id);
  }

  const baseUrl = getBaseUrl(req);
  const scanUrl = `${baseUrl}/pay/scan/${token}`;

  res.render('payment', {
    order,
    qrSvg: toSvg(scanUrl, { size: 240 }),
    scanUrl,
    baseUrl,
    tab: 'qr',
    error: null,
    form: {},
    ...extra
  });
}

// Opened by the phone that scans the QR code. No login needed on the phone:
// the secret token in the link is what proves it's the right order.
// (Declared before /pay/:id so "scan" is never mistaken for an order id.)
router.get('/pay/scan/:token', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE pay_token = ?').get(req.params.token);
  if (!order) return res.status(404).render('scan-result', { state: 'invalid', order: null });

  if (order.payment_status === 'paid') {
    return res.render('scan-result', { state: 'already', order });
  }

  markPaid(order.id, 'QR Scan');
  const paid = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  res.render('scan-result', { state: 'success', order: paid });
});

// The payment page asks this every couple of seconds: "has the QR been scanned yet?"
router.get('/pay/:id/status', requireLogin, (req, res) => {
  const order = getOwnOrder(req, res);
  if (!order) return;
  res.set('Cache-Control', 'no-store');
  res.json({ paid: order.payment_status === 'paid' });
});

router.get('/pay/:id', requireLogin, (req, res) => {
  const order = getOwnOrder(req, res);
  if (!order) return;
  if (order.payment_status === 'paid') return res.redirect(`/orders?placed=${order.id}`);
  renderPayPage(req, res, order);
});

router.post('/pay/:id/card', requireLogin, (req, res) => {
  const order = getOwnOrder(req, res);
  if (!order) return;
  if (order.payment_status === 'paid') return res.redirect(`/orders?placed=${order.id}`);

  const name   = (req.body.card_name || '').trim();
  const number = (req.body.card_number || '').replace(/\s+/g, '');
  const expiry = (req.body.card_expiry || '').trim();
  const cvv    = (req.body.card_cvv || '').trim();

  // Keep what they typed (except the CVV) so the form doesn't reset on error.
  const form = { card_name: name, card_number: req.body.card_number || '', card_expiry: expiry };
  const fail = (msg) => renderPayPage(req, res, order, { tab: 'card', error: msg, form });

  if (!name) return fail('Please enter the name on the card.');
  if (!/^\d{13,19}$/.test(number) || !luhnValid(number)) {
    return fail('That card number is not valid. Use the test card 4242 4242 4242 4242.');
  }

  const m = expiry.match(/^(\d{2})\s*\/\s*(\d{2})$/);
  if (!m) return fail('Enter the expiry date as MM/YY.');
  const month = parseInt(m[1], 10);
  const year = 2000 + parseInt(m[2], 10);
  if (month < 1 || month > 12) return fail('Enter a valid expiry month (01-12).');
  const now = new Date();
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
    return fail('That card has expired.');
  }

  if (!/^\d{3,4}$/.test(cvv)) return fail('Enter a 3 or 4 digit CVV.');

  // Demo rule: a card ending in 0002 is always "declined" so you can show the failure case in a viva.
  if (number.endsWith('0002')) return fail('Payment declined by the (demo) bank. Try card 4242 4242 4242 4242.');

  markPaid(order.id, 'Card');
  res.redirect(`/orders?placed=${order.id}`);
});

module.exports = router;
