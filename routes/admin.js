// routes/admin.js
// Admin panel: add / edit / delete products.

const express = require('express');
const router = express.Router();
const { db } = require('../db/database');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

router.get('/admin/products', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY id DESC').all();
  res.render('admin/products', { products });
});

router.get('/admin/products/new', (req, res) => {
  res.render('admin/product-form', { product: null, error: null });
});

router.post('/admin/products/new', (req, res) => {
  const { name, description, price, category, image_url, stock } = req.body;

  if (!name || !price || !category) {
    return res.render('admin/product-form', { product: req.body, error: 'Name, price and category are required.' });
  }

  db.prepare(`
    INSERT INTO products (name, description, price, category, image_url, stock)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, description || '', parseFloat(price), category, image_url || 'https://picsum.photos/400/300', parseInt(stock) || 0);

  res.redirect('/admin/products');
});

router.get('/admin/products/:id/edit', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).send('Product not found');
  res.render('admin/product-form', { product, error: null });
});

router.post('/admin/products/:id/edit', (req, res) => {
  const { name, description, price, category, image_url, stock } = req.body;

  db.prepare(`
    UPDATE products SET name = ?, description = ?, price = ?, category = ?, image_url = ?, stock = ?
    WHERE id = ?
  `).run(name, description || '', parseFloat(price), category, image_url, parseInt(stock) || 0, req.params.id);

  res.redirect('/admin/products');
});

router.post('/admin/products/:id/delete', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.redirect('/admin/products');
});

module.exports = router;
