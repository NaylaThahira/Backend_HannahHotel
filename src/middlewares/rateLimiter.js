const loginAttempts = new Map();
const logoutTimes = new Map();

const LOGOUT_COOLDOWN_MS = 7000; // 7 seconds
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Use Express req.ip (never read spoofable x-forwarded-for directly)
const getClientIp = (req) => {
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const getRateKeys = (req) => {
  const keys = [`ip:${getClientIp(req)}`];
  const rawUsername = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
  if (rawUsername && rawUsername.length <= 100) {
    keys.push(`user:${rawUsername}`);
  }
  return keys;
};

const loginRateLimiter = (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();

  for (const key of getRateKeys(req)) {
    const record = loginAttempts.get(key);
    if (record && record.penaltyUntil > now) {
      const remainingSeconds = Math.ceil((record.penaltyUntil - now) / 1000);
      const minutes = Math.floor(remainingSeconds / 60);
      const seconds = remainingSeconds % 60;
      const timeStr = minutes > 0 ? `${minutes} menit ${seconds} detik` : `${seconds} detik`;
      return res.status(429).json({
        success: false,
        message: `Terlalu banyak percobaan gagal. Silakan coba lagi dalam ${timeStr}.`
      });
    }
  }

  // Check logout cooldown per IP
  const logoutTime = logoutTimes.get(ip);
  if (logoutTime) {
    const timeSinceLogout = now - logoutTime;
    if (timeSinceLogout < LOGOUT_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((LOGOUT_COOLDOWN_MS - timeSinceLogout) / 1000);
      return res.status(429).json({
        success: false,
        message: `Silakan tunggu ${remainingSeconds} detik sebelum login kembali.`
      });
    }
  }

  next();
};

const recordFailedLogin = (req) => {
  const now = Date.now();

  for (const key of getRateKeys(req)) {
    let record = loginAttempts.get(key);
    if (!record) {
      record = { attempts: 0, penaltyUntil: 0, penaltyLevel: 0 };
      loginAttempts.set(key, record);
    }

    if (record.penaltyUntil > 0 && record.penaltyUntil <= now) {
      record.attempts = 0;
      record.penaltyUntil = 0;
    }

    record.attempts += 1;

    if (record.attempts >= 5) {
      if (record.penaltyLevel === 0) {
        record.penaltyLevel = 1;
        record.penaltyUntil = now + 5 * 60 * 1000;
      } else {
        record.penaltyLevel = 2;
        record.penaltyUntil = now + 15 * 60 * 1000;
      }
    }
  }
};

const recordSuccessfulLogin = (req) => {
  for (const key of getRateKeys(req)) {
    loginAttempts.delete(key);
  }
};

const recordLogout = (req) => {
  const ip = getClientIp(req);
  logoutTimes.set(ip, Date.now());
};

// Periodic cleanup to prevent unbounded in-memory Map growth
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    if (record.penaltyUntil > 0 && record.penaltyUntil <= now) {
      loginAttempts.delete(key);
    }
  }
  for (const [ip, time] of logoutTimes.entries()) {
    if (now - time >= LOGOUT_COOLDOWN_MS) {
      logoutTimes.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);
if (typeof cleanupInterval.unref === 'function') {
  cleanupInterval.unref();
}

module.exports = {
  loginRateLimiter,
  recordFailedLogin,
  recordSuccessfulLogin,
  recordLogout
};
