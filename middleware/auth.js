// middleware/auth.js
// Simple auth guards used by routes.

function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.session.redirectTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || !req.session.user.is_admin) {
    return res.status(403).send('Access denied. Admins only.');
  }
  next();
}

module.exports = { requireLogin, requireAdmin };
