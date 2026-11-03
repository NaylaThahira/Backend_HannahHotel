const express = require('express');
const router = express.Router();
const db = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Configure Multer for memory upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  }
});

// GET all settings (returns as key-value pairs)
router.get('/', async (req, res) => {
  try {
    const settings = await db.Setting.findAll();
    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.key] = s.value;
    });
    res.json(settingsObj);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT update multiple settings
router.put('/', async (req, res) => {
  try {
    if (Object.keys(req.body).some(key => key.startsWith('branch_info_'))) {
      return res.status(403).json({ error: 'Gunakan pengaturan informasi cabang untuk mengubah kartu cabang' });
    }
    for (const key of Object.keys(req.body).filter(key => key.startsWith('contact_'))) {
      if ((req.user.location === 'padang') !== key.startsWith('contact_padang_')) {
        return res.status(403).json({ error: 'Anda hanya dapat mengubah informasi kontak cabang sendiri' });
      }
      const value = req.body[key];
      if (typeof value !== 'string') return res.status(400).json({ error: 'Informasi kontak harus berupa teks' });
      if (/contact_(padang_)?map_(latitude|longitude)$/.test(key)) {
        const limit = key.endsWith('latitude') ? 90 : 180;
        if (!value.trim() || !Number.isFinite(Number(value)) || Math.abs(Number(value)) > limit) return res.status(400).json({ error: 'Koordinat peta tidak valid' });
      }
      if (/contact_(padang_)?map_url$/.test(key)) {
        try { if (!['https:', 'http:'].includes(new URL(value).protocol)) throw new Error(); }
        catch { return res.status(400).json({ error: 'Link peta harus berupa URL http atau https yang valid' }); }
      }
      if (/contact_(padang_)?email$/.test(key) && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return res.status(400).json({ error: 'Alamat email tidak valid' });
    }
    const ownAttractionsKey = req.user.location === 'padang' ? 'tourist_attractions_padang_json' : 'tourist_attractions_json';
    for (const key of Object.keys(req.body).filter(key => key.startsWith('tourist_attractions'))) {
      if (key !== ownAttractionsKey) return res.status(403).json({ error: 'Anda hanya dapat mengubah area akomodasi cabang sendiri' });
      let attractions;
      try { attractions = JSON.parse(req.body[key]); }
      catch { return res.status(400).json({ error: 'Area akomodasi tidak valid' }); }
      if (!Array.isArray(attractions) || attractions.length > 50 ||
        !attractions.every(item => typeof item === 'string' && item.trim() && item.length <= 200) ||
        new Set(attractions.map(item => item.trim())).size !== attractions.length) {
        return res.status(400).json({ error: 'Maksimal 50 area akomodasi unik dengan nama sepanjang 200 karakter' });
      }
      req.body[key] = JSON.stringify(attractions.map(item => item.trim()));
    }
    if (req.user.location !== 'padang' && Object.hasOwn(req.body, 'facilities_subtitle_padang')) {
      return res.status(403).json({ error: 'Anda hanya dapat mengelola cabang sendiri' });
    }
    const updates = req.body; // e.g. { footer_about: '...', footer_address: '...' }
    if (Object.prototype.hasOwnProperty.call(updates, 'contact_fields_json')) {
      let fields;
      try {
        fields = JSON.parse(updates.contact_fields_json);
      } catch {
        return res.status(400).json({ error: 'Data field formulir tidak valid' });
      }
      const types = ['text', 'email', 'tel', 'textarea', 'number', 'date'];
      if (!Array.isArray(fields) || fields.length > 5 || !fields.some(field => field && field.type === 'email') || !fields.every(field =>
        field && typeof field.id === 'string' && field.id.trim() &&
        typeof field.label === 'string' && field.label.trim() && types.includes(field.type) &&
        typeof field.placeholder === 'string' && typeof field.required === 'boolean'
      ) || new Set(fields.map(field => field.id)).size !== fields.length) {
        return res.status(400).json({ error: 'Maksimal 5 field dengan nama, jenis, dan ID unik yang valid' });
      }
    }
    const keys = Object.keys(updates);
    
    // Update each setting one by one
    for (const key of keys) {
      const [setting, created] = await db.Setting.findOrCreate({
        where: { key },
        defaults: { value: updates[key] }
      });
      if (!created) {
        await setting.update({ value: updates[key] });
      }
    }
    
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST upload hero image
router.post('/upload-hero', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const uploadDir = path.join(__dirname, '../../public/uploads/hero');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `hero-${Date.now()}.webp`;
    const filepath = path.join(uploadDir, filename);

    await sharp(req.file.buffer)
      .resize(1920, 1080, { fit: 'cover', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filepath);

    const imageUrl = `/uploads/hero/${filename}`;
    
    // Save to settings
    const [setting, created] = await db.Setting.findOrCreate({
      where: { key: 'home_hero_image' },
      defaults: { value: imageUrl }
    });
    
    if (!created) {
      // Try to delete old image
      if (setting.value && setting.value.startsWith('/uploads/hero/')) {
        const oldFile = path.join(__dirname, '../../public', setting.value);
        if (fs.existsSync(oldFile)) {
          fs.unlinkSync(oldFile);
        }
      }
      await setting.update({ value: imageUrl });
    }

    res.status(201).json({ message: 'Hero image uploaded', imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Failed to upload hero image' });
  }
});

module.exports = router;
