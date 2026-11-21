const jwt = require('jsonwebtoken');
const db = require('../models');
const { getJwtSecret } = require('../utils/security');

const adminSessionCache = new Map();
const revokedTokenIds = new Map();
const CACHE_TTL_MS = 60000;
const REVOKED_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

const revokedCleanup = setInterval(() => {
  const now = Date.now();
  for (const [jti, expiresAt] of revokedTokenIds.entries()) {
    if (expiresAt <= now) revokedTokenIds.delete(jti);
  }
}, REVOKED_CLEANUP_INTERVAL_MS);
if (typeof revokedCleanup.unref === 'function') {
  revokedCleanup.unref();
}

function primeAdminSessionCache(adminData) {
  if (!adminData || !adminData.id) return;
  adminSessionCache.set(adminData.id, {
    admin: {
      id: adminData.id,
      name: adminData.name,
      email: adminData.email,
      role: adminData.role,
      location: adminData.location,
    },
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

function invalidateAdminSessionCache(adminId) {
  if (adminId !== undefined && adminId !== null) {
    adminSessionCache.delete(adminId);
  }
}

function revokeAdminToken(token) {
  if (!token || typeof token !== 'string') return;
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    if (decoded && decoded.jti) {
      const expiresAt = decoded.exp ? decoded.exp * 1000 : Date.now() + 24 * 60 * 60 * 1000;
      revokedTokenIds.set(decoded.jti, expiresAt);
    }
    if (decoded && decoded.id) {
      invalidateAdminSessionCache(decoded.id);
    }
  } catch {
    // Token already invalid/expired; nothing to revoke
  }
}

function isTokenRevoked(jti) {
  if (!jti) return false;
  const expiresAt = revokedTokenIds.get(jti);
  if (!expiresAt) return false;
  if (expiresAt <= Date.now()) {
    revokedTokenIds.delete(jti);
    return false;
  }
  return true;
}

const authenticateJWT = async (req, res, next) => {
  if (req.user) return next();
  if (req.cookies?.token_padang && req.cookies?.token_painan) {
    return res.status(401).json({ success: false, message: 'Sesi ganda terdeteksi. Silakan masuk kembali.' });
  }
  const expectedLocation = req.adminLocation === 'padang' ? 'padang' : 'painan';
  const token = req.cookies?.[expectedLocation === 'padang' ? 'token_padang' : 'token_painan'];
  if (!token) return res.status(401).json({ success: false, message: 'Silakan masuk sebagai admin.' });
  let payload;
  try {
    payload = jwt.verify(token, getJwtSecret());
  } catch {
    return res.status(401).json({ success: false, message: 'Sesi tidak valid atau kedaluwarsa.' });
  }
  if (payload.jti && isTokenRevoked(payload.jti)) {
    return res.status(401).json({ success: false, message: 'Sesi telah berakhir. Silakan masuk kembali.' });
  }
  try {
    const now = Date.now();
    const cached = adminSessionCache.get(payload.id);
    let plainAdmin = cached && cached.expiresAt > now ? cached.admin : null;
    if (!plainAdmin) {
      const admin = await db.Admin.findByPk(payload.id, { attributes: ['id', 'name', 'email', 'role', 'location'] });
      if (!admin) return res.status(401).json({ success: false, message: 'Akun tidak ditemukan.' });
      plainAdmin = admin.get({ plain: true });
      adminSessionCache.set(payload.id, { admin: plainAdmin, expiresAt: now + CACHE_TTL_MS });
    }
    if (plainAdmin.location !== expectedLocation) {
      return res.status(403).json({ success: false, message: 'Akses lokasi ditolak.' });
    }
    req.user = plainAdmin;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Gagal memeriksa sesi.' });
  }
};

module.exports = {
  authenticateJWT,
  primeAdminSessionCache,
  invalidateAdminSessionCache,
  revokeAdminToken,
  isTokenRevoked,
};
