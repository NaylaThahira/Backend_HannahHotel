const fs = require('fs');
const path = require('path');

const PUBLIC_ROOT = path.resolve(__dirname, '../../public');
const UPLOADS_ROOT = path.resolve(PUBLIC_ROOT, 'uploads');

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.length < 32) {
      throw new Error('FATAL: JWT_SECRET must be set (>= 32 characters) in production.');
    }
    return secret;
  }
  return secret || 'fallback-jwt-secret-for-dev';
}

function getRevalidateSecret() {
  const secret = process.env.REVALIDATE_SECRET;
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.length < 32) {
      throw new Error('FATAL: REVALIDATE_SECRET must be set (>= 32 characters) in production.');
    }
    return secret;
  }
  return secret || 'hannah-hotel-revalidate-secret';
}

function isPositiveIntId(value) {
  if (value === undefined || value === null) return false;
  const str = String(value).trim();
  if (!/^\d+$/.test(str)) return false;
  const num = Number(str);
  return Number.isSafeInteger(num) && num > 0;
}

function isSafeUploadUrl(url, expectedSubdir) {
  if (typeof url !== 'string' || !expectedSubdir) return false;
  if (url.includes('..') || url.includes('\\') || url.includes('\0')) return false;
  const pattern = new RegExp(`^/uploads/${expectedSubdir}/[a-zA-Z0-9._-]+$`);
  return pattern.test(url);
}

function safeDeleteUpload(imageUrl, expectedSubdir) {
  if (!isSafeUploadUrl(imageUrl, expectedSubdir)) return false;
  const allowedDir = path.resolve(UPLOADS_ROOT, expectedSubdir);
  const resolved = path.resolve(PUBLIC_ROOT, imageUrl.replace(/^\/+/, ''));
  if (!resolved.startsWith(allowedDir + path.sep)) return false;
  try {
    if (fs.existsSync(resolved)) {
      fs.unlinkSync(resolved);
      return true;
    }
  } catch (err) {
    console.error('Failed to delete upload:', err.code || 'UNLINK_ERROR');
  }
  return false;
}

function isSafeHttpUrl(value, { allowRelative = false, allowEmpty = false } = {}) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return allowEmpty;
  if (allowRelative && trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return !/[\r\n\0]/.test(trimmed);
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

module.exports = {
  COOKIE_OPTIONS,
  getJwtSecret,
  getRevalidateSecret,
  isPositiveIntId,
  isSafeUploadUrl,
  safeDeleteUpload,
  isSafeHttpUrl,
};
