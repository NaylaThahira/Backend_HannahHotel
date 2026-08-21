const jwt = require('jsonwebtoken');

const authenticateJWT = (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || 'fallback-jwt-secret-for-dev', (err, user) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Token tidak valid atau sudah kedaluwarsa' });
      }
      req.user = user;
      next();
    });
  } else {
    res.status(401).json({ success: false, message: 'Akses ditolak. Token tidak ditemukan.' });
  }
};

module.exports = { authenticateJWT };
