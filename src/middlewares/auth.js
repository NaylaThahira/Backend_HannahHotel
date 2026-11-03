const jwt = require('jsonwebtoken');
const db = require('../models');

const authenticateJWT = async (req, res, next) => {
  const token = req.cookies[process.env.HOTEL_LOCATION === 'padang' ? 'token_padang' : 'token_painan'];
  if (!token) return res.status(401).json({ success: false, message: 'Silakan masuk sebagai admin.' });
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET || 'fallback-jwt-secret-for-dev'); }
  catch { return res.status(403).json({ success: false, message: 'Sesi tidak valid atau kedaluwarsa.' }); }
  try {
    const admin = await db.Admin.findByPk(payload.id, { attributes: ['id', 'name', 'email', 'role', 'location'] });
    if (!admin) return res.status(401).json({ success: false, message: 'Akun tidak ditemukan.' });
    if (admin.location !== (process.env.HOTEL_LOCATION || 'painan')) return res.status(403).json({ success: false, message: 'Akses lokasi ditolak.' });
    req.user = admin.get({ plain: true });
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal memeriksa sesi.' });
  }
};
module.exports = { authenticateJWT };
