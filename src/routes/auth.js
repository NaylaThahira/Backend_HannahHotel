const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const { COOKIE_OPTIONS, getJwtSecret } = require('../utils/security');
const { authenticateJWT, primeAdminSessionCache, revokeAdminToken } = require('../middlewares/auth');
const { loginRateLimiter, recordFailedLogin, recordSuccessfulLogin, recordLogout } = require('../middlewares/rateLimiter');

// POST /api/auth/login
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !username.trim() ||
      !password ||
      username.length > 100 ||
      password.length > 200
    ) {
      return res.status(400).json({ success: false, message: 'Username dan password harus diisi' });
    }

    const admin = await db.Admin.findOne({ where: { username: username.trim().toLowerCase() } });
    if (!admin) {
      recordFailedLogin(req);
      return res.status(401).json({ success: false, message: 'Kredensial tidak valid' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      recordFailedLogin(req);
      return res.status(401).json({ success: false, message: 'Kredensial tidak valid' });
    }

    const expectedLocation = req.adminLocation || req.body.location || admin.location;
    if ((req.body.location && req.body.location !== admin.location) || (expectedLocation !== admin.location)) {
      return res.status(403).json({ success: false, message: 'Akun ini tidak memiliki akses ke admin lokasi tersebut.' });
    }
    recordSuccessfulLogin(req);

    // Revoke any previous branch session tokens before issuing a fresh single active session
    if (req.cookies?.token_padang) revokeAdminToken(req.cookies.token_padang);
    if (req.cookies?.token_painan) revokeAdminToken(req.cookies.token_painan);

    const payload = {
      id: admin.id,
      role: admin.role,
      location: admin.location,
      jti: crypto.randomUUID(),
    };

    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '1d' });

    const activeCookie = admin.location === 'padang' ? 'token_padang' : 'token_painan';
    const otherCookie = admin.location === 'padang' ? 'token_painan' : 'token_padang';

    res.clearCookie(otherCookie, COOKIE_OPTIONS);
    res.cookie(activeCookie, token, {
      ...COOKIE_OPTIONS,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    const adminData = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      location: admin.location,
    };
    primeAdminSessionCache(adminData);

    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: adminData, message: 'Login berhasil' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
});

router.get('/me', authenticateJWT, (req, res) => {
  const { id, name, email, role, location } = req.user;
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, data: { id, name, email, role, location } });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  if (req.cookies?.token_padang) revokeAdminToken(req.cookies.token_padang);
  if (req.cookies?.token_painan) revokeAdminToken(req.cookies.token_painan);
  recordLogout(req);
  res.clearCookie('token_padang', COOKIE_OPTIONS);
  res.clearCookie('token_painan', COOKIE_OPTIONS);
  res.set('Cache-Control', 'no-store');
  res.json({ success: true, message: 'Logout berhasil' });
});

module.exports = router;
