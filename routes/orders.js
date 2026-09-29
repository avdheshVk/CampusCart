// routes/orders.js
// Order history for the logged-in user.

const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireLogin } = require('../middleware/auth');

router.get('/orders', requireLogin, (req, res) => {
  const orders = db.prepare(`
    SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC
  `).all(req.session.user.id);

  const itemsStmt = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
  for (const order of orders) {
    order.items = itemsStmt.all(order.id);
  }

  res.render('orders', { orders, placedId: req.query.placed || null });
});

module.exports = router;
