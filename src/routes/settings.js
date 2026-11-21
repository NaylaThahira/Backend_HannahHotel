const express = require('express');
const router = express.Router();
const db = require('../models');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { authenticateJWT } = require('../middlewares/auth');
const { revalidateFrontend } = require('../services/revalidate');
const { safeDeleteUpload, isSafeHttpUrl } = require('../utils/security');

const PADANG_SETTINGS_KEYS = new Set([
  'rooms_subtitle_padang',
  'facilities_subtitle_padang',
  'galleries_subtitle_padang',
  'tourist_attractions_padang_json',
  'history_subtitle_padang',
  'history_quote_padang',
  'history_content_padang',
  'vision_subtitle_padang',
  'vision_text_padang',
  'missions_padang_json',
  'footer_about_padang',
  'footer_address_padang',
  'footer_phone_padang',
  'footer_email_padang',
  'footer_links_padang',
  'footer_show_newsletter_padang',
  'home_hero_title_padang',
  'home_hero_subtitle_padang',
  'home_hero_image_padang',
  'home_whatsapp_number_padang',
  'home_review_url_padang',
  'home_sections_order_padang',
  'contact_padang_hotel_name',
  'contact_padang_address',
  'contact_padang_phone',
  'contact_padang_email',
  'contact_padang_map_latitude',
  'contact_padang_map_longitude',
  'contact_padang_map_url',
  'contact_padang_map_label',
]);

const PAINAN_SETTINGS_KEYS = new Set([
  'rooms_subtitle',
  'facilities_subtitle',
  'galleries_subtitle',
  'tourist_attractions_json',
  'history_subtitle',
  'history_quote',
  'history_content',
  'vision_subtitle',
  'vision_text',
  'missions_json',
  'footer_about',
  'footer_address',
  'footer_phone',
  'footer_email',
  'footer_links',
  'footer_show_newsletter',
  'home_hero_title',
  'home_hero_subtitle',
  'home_hero_image',
  'home_whatsapp_number',
  'home_review_url',
  'home_sections_order',
  'contact_title',
  'contact_description',
  'contact_hotel_name',
  'contact_address',
  'contact_phone',
  'contact_email',
  'contact_map_latitude',
  'contact_map_longitude',
  'contact_map_url',
  'contact_map_label',
  'contact_fields_json',
]);

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

// GET all settings (or filtered by ?keys=k1,k2) as key-value pairs
router.get('/', async (req, res) => {
  try {
    const where = {};
    if (typeof req.query.keys === 'string' && req.query.keys.trim()) {
      const requestedKeys = req.query.keys.split(',').map(k => k.trim()).filter(Boolean);
      if (requestedKeys.length > 0) {
        where.key = requestedKeys;
      }
    }
    const settings = await db.Setting.findAll({
      where,
      attributes: ['key', 'value']
    });
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
router.put('/', authenticateJWT, async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Payload pengaturan tidak valid' });
    }
    const keys = Object.keys(req.body);
    if (keys.some(key => key.startsWith('branch_info_'))) {
      return res.status(403).json({ error: 'Gunakan pengaturan informasi cabang untuk mengubah kartu cabang' });
    }

    const allowedKeys = req.user.location === 'padang' ? PADANG_SETTINGS_KEYS : PAINAN_SETTINGS_KEYS;
    for (const key of keys) {
      if (!allowedKeys.has(key)) {
        return res.status(403).json({ error: 'Anda hanya dapat mengelola pengaturan cabang sendiri yang diizinkan' });
      }
    }

    for (const key of keys.filter(k => k.startsWith('contact_') && k !== 'contact_fields_json')) {
      const value = req.body[key];
      if (typeof value !== 'string') return res.status(400).json({ error: 'Informasi kontak harus berupa teks' });
      if (/contact_(padang_)?map_(latitude|longitude)$/.test(key)) {
        const limit = key.endsWith('latitude') ? 90 : 180;
        if (!value.trim() || !Number.isFinite(Number(value)) || Math.abs(Number(value)) > limit) return res.status(400).json({ error: 'Koordinat peta tidak valid' });
      }
      if (/contact_(padang_)?map_url$/.test(key)) {
        if (!isSafeHttpUrl(value)) {
          return res.status(400).json({ error: 'Link peta harus berupa URL http atau https yang valid' });
        }
      }
      if (/contact_(padang_)?email$/.test(key) && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return res.status(400).json({ error: 'Alamat email tidak valid' });
    }

    for (const key of keys.filter(k => k === 'home_review_url' || k === 'home_review_url_padang')) {
      const value = req.body[key];
      if (typeof value !== 'string' || !isSafeHttpUrl(value, { allowEmpty: true })) {
        return res.status(400).json({ error: 'URL ulasan harus berupa tautan http atau https yang valid' });
      }
    }

    for (const key of keys.filter(k => k === 'footer_links' || k === 'footer_links_padang')) {
      let parsedLinks;
      try {
        parsedLinks = JSON.parse(req.body[key]);
      } catch {
        return res.status(400).json({ error: 'Format tautan footer tidak valid' });
      }
      if (
        !Array.isArray(parsedLinks) ||
        parsedLinks.length > 12 ||
        !parsedLinks.every(
          item =>
            item &&
            typeof item.label === 'string' &&
            item.label.trim().length > 0 &&
            item.label.length <= 80 &&
            typeof item.url === 'string' &&
            isSafeHttpUrl(item.url, { allowRelative: true })
        )
      ) {
        return res.status(400).json({ error: 'Tautan footer harus berupa URL http/https atau path internal yang valid (maksimal 12 tautan)' });
      }
    }

    const ownAttractionsKey = req.user.location === 'padang' ? 'tourist_attractions_padang_json' : 'tourist_attractions_json';
    for (const key of keys.filter(k => k.startsWith('tourist_attractions'))) {
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

    const updates = req.body;
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
    const rows = Object.entries(updates).map(([key, value]) => ({
      key,
      value: value === null || value === undefined ? '' : String(value)
    }));

    if (rows.length > 0) {
      await db.sequelize.transaction(async (transaction) => {
        await db.Setting.bulkCreate(rows, {
          updateOnDuplicate: ['value', 'updatedAt'],
          conflictAttributes: ['key'],
          transaction
        });
      });
    }

    await revalidateFrontend(['settings']);
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// POST upload hero image
router.post('/upload-hero', authenticateJWT, upload.single('image'), async (req, res) => {
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

    const heroSettingKey = req.user.location === 'padang' ? 'home_hero_image_padang' : 'home_hero_image';
    // Save to settings
    const [setting, created] = await db.Setting.findOrCreate({
      where: { key: heroSettingKey },
      defaults: { value: imageUrl }
    });

    if (!created) {
      safeDeleteUpload(setting.value, 'hero');
      await setting.update({ value: imageUrl });
    }

    await revalidateFrontend(['settings']);
    res.status(201).json({ message: 'Hero image uploaded', imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload hero image' });
  }
});

module.exports = router;
