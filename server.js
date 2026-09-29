// server.js
// Entry point: wires up Express, sessions, view engine, static files and routes.

const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing + static files
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Sessions (in-memory store — fine for a college project / local demo)
app.use(session({
  secret: 'campus-cart-secret-key-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// Make current user + cart item count available in every view
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  const cart = req.session.cart || {};
  res.locals.cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  res.locals.currentPath = req.path;
  next();
});

// Routes
app.use('/', require('./routes/index'));
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/cart'));
app.use('/', require('./routes/orders'));
app.use('/', require('./routes/admin'));

app.listen(PORT, () => {
  console.log(`Campus Cart running at http://localhost:${PORT}`);
});
