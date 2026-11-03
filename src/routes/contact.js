const router = require('express').Router();
const db = require('../models');
const { buildContactMessage, sendContactMail } = require('../services/contact-mail');

const attempts = new Map();
const windowMs = 10 * 60 * 1000;
const cleanup = setInterval(() => {
  for (const [ip, entry] of attempts) if (entry.expires <= Date.now()) attempts.delete(ip);
}, windowMs);
cleanup.unref();

router.post('/', async (req, res) => {
  const now = Date.now();
  const entry = attempts.get(req.ip);
  const current = entry && entry.expires > now ? entry : { count: 0, expires: now + windowMs };
  if (current.count >= 5) {
    res.set('Retry-After', String(Math.ceil((current.expires - now) / 1000)));
    return res.status(429).json({ error: 'Terlalu banyak percobaan. Silakan coba lagi dalam beberapa menit.' });
  }
  current.count++;
  attempts.set(req.ip, current);
  try {
    const rows = await db.Setting.findAll();
    const settings = Object.fromEntries(rows.map(row => [row.key, row.value]));
    let message;
    try {
      message = buildContactMessage(settings, req.body?.values);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
    await sendContactMail(message);
    return res.json({ message: 'Pesan berhasil dikirim. Terima kasih telah menghubungi kami.' });
  } catch (error) {
    console.error('Contact email failed:', error.code || 'SEND_FAILED');
    return res.status(503).json({ error: 'Pesan belum terkirim. Layanan email sedang tidak tersedia. Silakan hubungi hotel melalui WhatsApp.' });
  }
});

module.exports = router;
