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
    const updates = req.body; // e.g. { footer_about: '...', footer_address: '...' }
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
