const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const { loginRateLimiter, recordFailedLogin, recordSuccessfulLogin, recordLogout } = require('../middleware/rateLimiter');

// POST /api/auth/login
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password harus diisi' });
    }

    const admin = await db.Admin.findOne({ where: { email } });
    if (!admin) {
      recordFailedLogin(req);
      return res.status(401).json({ success: false, message: 'Kredensial tidak valid' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      recordFailedLogin(req);
      return res.status(401).json({ success: false, message: 'Kredensial tidak valid' });
    }

    recordSuccessfulLogin(req);

    // Sign JWT
    const payload = {
      id: admin.id,
      role: admin.role
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET || 'fallback-jwt-secret-for-dev', { expiresIn: '1d' });

    // Set HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });

    const adminData = {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role
    };

    res.json({ success: true, data: adminData, message: 'Login berhasil' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Terjadi kesalahan pada server' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  recordLogout(req);
  res.clearCookie('token');
  res.json({ success: true, message: 'Logout berhasil' });
});

module.exports = router;
