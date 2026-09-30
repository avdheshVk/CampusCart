// routes/payment.js
// DEMO payment gateway ("CampusPay") — no real money is ever moved.
//   GET  /pay/:id          -> payment page (scan QR or pay by test card)
//   POST /pay/:id/upi      -> customer says they've scanned & paid via the QR
//   POST /pay/:id/card     -> validates a test card, then marks the order paid
//
// Card details are validated and thrown away — they are NEVER stored.

const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const { db } = require('../db/database');
const { requireLogin } = require('../middleware/auth');
const { toSvg } = require('../utils/qr');

const MERCHANT_VPA = 'campuscart@demobank'; // fake UPI id

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
  // This string is what the QR code contains. It follows the real UPI deep-link
  // format, so phone cameras / UPI apps recognise it, but the merchant id is fake.
  const txnRef = 'CC' + String(order.id).padStart(6, '0');
  const upiLink =
    `upi://pay?pa=${MERCHANT_VPA}&pn=${encodeURIComponent('Campus Cart')}` +
    `&am=${order.total.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Order #' + order.id)}&tr=${txnRef}`;

  res.render('payment', {
    order,
    qrSvg: toSvg(upiLink, { size: 240 }),
    upiLink,
    merchantVpa: MERCHANT_VPA,
    tab: 'upi',
    error: null,
    form: {},
    ...extra
  });
}

router.get('/pay/:id', requireLogin, (req, res) => {
  const order = getOwnOrder(req, res);
  if (!order) return;
  if (order.payment_status === 'paid') return res.redirect(`/orders?placed=${order.id}`);
  renderPayPage(req, res, order);
});

// "I've paid" after scanning the QR (simulated — there is no bank to check with).
router.post('/pay/:id/upi', requireLogin, (req, res) => {
  const order = getOwnOrder(req, res);
  if (!order) return;
  if (order.payment_status === 'paid') return res.redirect(`/orders?placed=${order.id}`);

  markPaid(order.id, 'UPI QR');
  res.redirect(`/orders?placed=${order.id}`);
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
