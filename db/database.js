// db/database.js
// Sets up the SQLite database, creates tables if they don't exist,
// and seeds some sample data on first run.
//
// Uses Node's built-in `node:sqlite` module (available in Node 22.5+),
// so there is NO native module to compile — avoids the classic
// "better-sqlite3 bindings not found" install problem on Windows.

const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');

const db = new DatabaseSync(path.join(__dirname, 'app.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// ---------- Create tables ----------
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'placed',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

// ---------- Payment columns (safe to run on an existing database) ----------
// Adds payment info to the orders table only if it isn't there yet.
const orderCols = db.prepare('PRAGMA table_info(orders)').all().map(c => c.name);
const paymentCols = {
  payment_status: 'TEXT',   // 'pending' | 'paid'
  payment_method: 'TEXT',   // 'UPI QR' | 'Card'
  payment_ref:    'TEXT',   // fake gateway transaction id
  paid_at:        'TEXT'
};
for (const [col, type] of Object.entries(paymentCols)) {
  if (!orderCols.includes(col)) db.exec(`ALTER TABLE orders ADD COLUMN ${col} ${type}`);
}

// Small helper: run a function inside a transaction (BEGIN/COMMIT/ROLLBACK).
// node:sqlite doesn't ship a db.transaction() helper like better-sqlite3 did,
// so we provide a tiny equivalent and reuse it everywhere.
function runInTransaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// ---------- Seed sample data (only if empty) ----------
const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;

if (productCount === 0) {
  const insertProduct = db.prepare(`
    INSERT INTO products (name, description, price, category, image_url, stock)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const sampleProducts = [
    ['Wireless Headphones', 'Over-ear Bluetooth headphones with noise cancellation.', 2499, 'Electronics', 'https://picsum.photos/seed/headphones/400/300', 25],
    ['Smart Watch', 'Fitness tracking smartwatch with heart-rate monitor.', 3499, 'Electronics', 'https://picsum.photos/seed/smartwatch/400/300', 15],
    ['Mechanical Keyboard', 'RGB backlit mechanical keyboard, blue switches.', 1899, 'Electronics', 'https://picsum.photos/seed/keyboard/400/300', 30],
    ['Cotton T-Shirt', 'Comfortable 100% cotton round-neck t-shirt.', 499, 'Fashion', 'https://picsum.photos/seed/tshirt/400/300', 100],
    ['Denim Jacket', 'Classic blue denim jacket, unisex fit.', 1799, 'Fashion', 'https://picsum.photos/seed/jacket/400/300', 40],
    ['Running Shoes', 'Lightweight running shoes with cushioned sole.', 2199, 'Fashion', 'https://picsum.photos/seed/shoes/400/300', 50],
    ['Data Structures Textbook', 'Comprehensive guide to data structures and algorithms.', 699, 'Books', 'https://picsum.photos/seed/dsbook/400/300', 20],
    ['Web Development Guide', 'Beginner-friendly book on modern web development.', 599, 'Books', 'https://picsum.photos/seed/webbook/400/300', 20],
    ['Table Lamp', 'Minimalist LED table lamp with adjustable brightness.', 899, 'Home', 'https://picsum.photos/seed/lamp/400/300', 35],
    ['Coffee Mug Set', 'Set of 2 ceramic coffee mugs.', 399, 'Home', 'https://picsum.photos/seed/mug/400/300', 60],
  ];

  runInTransaction(() => {
    for (const row of sampleProducts) insertProduct.run(...row);
  });

  console.log('Seeded sample products.');
}

// ---------- Seed a default admin account ----------
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@campuscart.com');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (name, email, password_hash, is_admin)
    VALUES (?, ?, ?, 1)
  `).run('Admin', 'admin@campuscart.com', hash);
  console.log('Seeded default admin account: admin@campuscart.com / admin123');
}

module.exports = { db, runInTransaction };
