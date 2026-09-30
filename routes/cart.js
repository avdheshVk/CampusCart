// routes/cart.js
// Cart is stored in the session as { productId: quantity }.
// Checkout requires login and converts the cart into a pending order,
// which is then paid for on /pay/:orderId (see routes/payment.js).

const express = require('express');
const router = express.Router();
const { db, runInTransaction } = require('../db/database');
const { requireLogin } = require('../middleware/auth');

function getCartWithProducts(req) {
  const cart = req.session.cart || {};
  const items = [];
  let total = 0;

  for (const [productId, quantity] of Object.entries(cart)) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (product) {
      const subtotal = product.price * quantity;
      total += subtotal;
      items.push({ product, quantity, subtotal });
    }
  }

  return { items, total };
}

router.get('/cart', (req, res) => {
  const { items, total } = getCartWithProducts(req);
  res.render('cart', { items, total });
});

router.post('/cart/add/:id', (req, res) => {
  const productId = req.params.id;
  const qty = parseInt(req.body.quantity) || 1;

  if (!req.session.cart) req.session.cart = {};
  req.session.cart[productId] = (req.session.cart[productId] || 0) + qty;

  res.redirect('back');
});

router.post('/cart/update/:id', (req, res) => {
  const productId = req.params.id;
  const qty = parseInt(req.body.quantity);

  if (req.session.cart) {
    if (qty > 0) {
      req.session.cart[productId] = qty;
    } else {
      delete req.session.cart[productId];
    }
  }

  res.redirect('/cart');
});

router.post('/cart/remove/:id', (req, res) => {
  if (req.session.cart) delete req.session.cart[req.params.id];
  res.redirect('/cart');
});

router.post('/cart/checkout', requireLogin, (req, res) => {
  const { items, total } = getCartWithProducts(req);

  if (items.length === 0) {
    return res.redirect('/cart');
  }

  const insertOrder = db.prepare(`
    INSERT INTO orders (user_id, total, status, payment_status) VALUES (?, ?, 'pending_payment', 'pending')
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
    VALUES (?, ?, ?, ?, ?)
  `);

  const orderId = runInTransaction(() => {
    const orderResult = insertOrder.run(req.session.user.id, total);
    const newOrderId = orderResult.lastInsertRowid;

    for (const item of items) {
      insertItem.run(newOrderId, item.product.id, item.product.name, item.quantity, item.product.price);
    }

    return newOrderId;
  });

  req.session.cart = {};

  // Order is saved but unpaid — send the customer to the payment gateway.
  res.redirect(`/pay/${orderId}`);
});

module.exports = router;
