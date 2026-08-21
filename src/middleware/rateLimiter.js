const loginAttempts = new Map();
const logoutTimes = new Map();

// Helper to get client IP
const getClientIp = (req) => {
  return req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.ip;
};

const loginRateLimiter = (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();
  
  if (!loginAttempts.has(ip)) {
    loginAttempts.set(ip, { attempts: 0, penaltyUntil: 0, penaltyLevel: 0 });
  }

  const record = loginAttempts.get(ip);

  // Check if currently under penalty
  if (record.penaltyUntil > now) {
    const remainingSeconds = Math.ceil((record.penaltyUntil - now) / 1000);
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    const timeStr = minutes > 0 ? `${minutes} menit ${seconds} detik` : `${seconds} detik`;
    return res.status(429).json({ 
      success: false, 
      message: `Terlalu banyak percobaan gagal. Silakan coba lagi dalam ${timeStr}.` 
    });
  }

  // Check logout cooldown
  const logoutTime = logoutTimes.get(ip);
  if (logoutTime) {
    const timeSinceLogout = now - logoutTime;
    if (timeSinceLogout < 15000) { // 15 seconds
      const remainingSeconds = Math.ceil((15000 - timeSinceLogout) / 1000);
      return res.status(429).json({
        success: false,
        message: `Silakan tunggu ${remainingSeconds} detik sebelum login kembali.`
      });
    }
  }

  next();
};

const recordFailedLogin = (req) => {
  const ip = getClientIp(req);
  const now = Date.now();
  
  let record = loginAttempts.get(ip);
  if (!record) {
    record = { attempts: 0, penaltyUntil: 0, penaltyLevel: 0 };
    loginAttempts.set(ip, record);
  }

  // If they were penalized and time passed, reset attempts but keep level
  if (record.penaltyUntil > 0 && record.penaltyUntil <= now) {
    record.attempts = 0;
    record.penaltyUntil = 0;
  }

  record.attempts += 1;

  if (record.attempts >= 5) {
    if (record.penaltyLevel === 0) {
      // First 5 failures -> 5 mins
      record.penaltyLevel = 1;
      record.penaltyUntil = now + 5 * 60 * 1000;
    } else {
      // Next 5 failures -> 15 mins
      record.penaltyLevel = 2;
      record.penaltyUntil = now + 15 * 60 * 1000;
    }
  }
};

const recordSuccessfulLogin = (req) => {
  const ip = getClientIp(req);
  loginAttempts.delete(ip); // clear failures
};

const recordLogout = (req) => {
  const ip = getClientIp(req);
  logoutTimes.set(ip, Date.now());
};

module.exports = {
  loginRateLimiter,
  recordFailedLogin,
  recordSuccessfulLogin,
  recordLogout
};
