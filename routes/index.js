// routes/index.js
// Home page (product listing with search/category filter) and product detail page.

const express = require('express');
const router = express.Router();
const { db } = require('../db/database');

router.get('/', (req, res) => {
  const { q, category } = req.query;

  let sql = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (q) {
    sql += ' AND name LIKE ?';
    params.push(`%${q}%`);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += ' ORDER BY id DESC';

  const products = db.prepare(sql).all(...params);
  const categories = db.prepare('SELECT DISTINCT category FROM products').all().map(r => r.category);

  res.render('index', {
    products,
    categories,
    q: q || '',
    activeCategory: category || ''
  });
});

router.get('/product/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!product) return res.status(404).send('Product not found');
  res.render('product', { product });
});

module.exports = router;
