const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs/promises');
const db = require('../models');
const { authenticateJWT } = require('../middlewares/auth');
const router = express.Router();
const locations = ['padang', 'painan'];
const key = location => `branch_info_${location}`;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ? null : new Error('Format gambar tidak valid'), true) });

async function getBranch(location) {
  const setting = await db.Setting.findOne({ where: { key: key(location) } });
  if (setting) return { ...JSON.parse(setting.value), id: location };
  const label = location === 'padang' ? 'Padang' : 'Painan';
  const room = await db.Room.findOne({ where: { location }, order: [['id', 'ASC']] });
  return { id: location, title: `Hannah Hotel ${label}`, imageUrl: room?.imageUrl || '',
    description: `Nikmati kenyamanan menginap di Hannah Hotel ${label}. Temukan pilihan kamar yang sesuai untuk Anda.`,
    location: label };
}

router.get('/', async (req, res) => {
  try { res.json(await Promise.all(locations.map(getBranch))); }
  catch (error) { console.error(error); res.status(500).json({ error: 'Gagal mengambil informasi cabang' }); }
});

router.put('/:location', authenticateJWT, (req, res, next) => {
  if (!locations.includes(req.params.location)) return res.status(404).json({ error: 'Cabang tidak ditemukan' });
  if (req.params.location !== req.user.location) return res.status(403).json({ error: 'Anda hanya dapat mengubah cabang sendiri' });
  upload.single('image')(req, res, error => {
    if (error) return res.status(400).json({ error: 'Gambar harus JPG, PNG, atau WEBP maksimal 5 MB' });
    if (req.is('multipart/form-data') && !req.file && req.body.image !== undefined) return res.status(400).json({ error: 'Format gambar tidak valid' });
    next();
  });
}, async (req, res) => {
  let uploadedPath;
  try {
    const { title, description, location } = req.body;
    if (![title, description, location].every(value => typeof value === 'string' && value.trim()) ||
      title.length > 150 || description.length > 3000 || location.length > 500) {
      return res.status(400).json({ error: 'Judul, deskripsi, dan lokasi wajib diisi (maksimal 150, 3000, dan 500 karakter)' });
    }
    const branch = await getBranch(req.user.location);
    if (req.file) {
      const filename = `${req.user.location}-${require('crypto').randomUUID()}.webp`;
      const directory = path.join(__dirname, '../../public/uploads/branches');
      await fs.mkdir(directory, { recursive: true });
      uploadedPath = path.join(directory, filename);
      await sharp(req.file.buffer).rotate().resize(1600, 1000, { fit: 'cover', withoutEnlargement: true }).webp({ quality: 85 }).toFile(uploadedPath);
      branch.imageUrl = `/uploads/branches/${filename}`;
    }
    Object.assign(branch, { title: title.trim(), description: description.trim(), location: location.trim() });
    await db.sequelize.transaction(async transaction => {
      const [setting] = await db.Setting.findOrCreate({ where: { key: key(req.user.location) }, defaults: { value: JSON.stringify(branch) }, transaction });
      await setting.update({ value: JSON.stringify(branch) }, { transaction });
    });
    res.json(branch);
  } catch (error) {
    if (uploadedPath) await fs.unlink(uploadedPath).catch(() => {});
    console.error(error); res.status(500).json({ error: 'Gagal menyimpan informasi cabang' });
  }
});
module.exports = router;
