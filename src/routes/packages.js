const express = require('express');
const router = express.Router();
const db = require('../models');
const { authenticateJWT } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => /jpeg|jpg|png|webp/.test(file.mimetype) && /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase())
        ? cb(null, true)
        : cb(new Error('Only image files are allowed!'))
});

async function processImage(buffer) {
    const uploadPath = path.join(__dirname, '../../public/uploads/packages');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
    await sharp(buffer).resize(1920, null, { withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(uploadPath, filename));
    return `/uploads/packages/${filename}`;
}

function parseIncluded(value, fallback = []) {
    if (value === undefined) return fallback;
    try {
        const parsed = typeof value === 'string' ? JSON.parse(value) : value;
        return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string' && item.trim()) : fallback;
    } catch {
        return fallback;
    }
}

function removeImage(imageUrl) {
    if (!imageUrl || !imageUrl.startsWith('/uploads/')) return;
    const imagePath = path.join(__dirname, '../../public', imageUrl);
    if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
}

router.get('/', async (req, res) => {
    try {
        const location = req.query.location;
        if (location && !['padang', 'painan'].includes(location)) return res.status(400).json({ error: 'Lokasi tidak valid' });
        res.json(await db.Package.findAll({ where: location ? { location } : {}, order: [['id', 'ASC']] }));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch packages' });
    }
});

router.get('/manage', authenticateJWT, async (req, res) => {
  try { res.json(await db.Package.findAll({ where: { location: req.user.location }, order: [['id', 'ASC']] })); }
  catch (error) { console.error(error); res.status(500).json({ error: 'Gagal mengambil data cabang' }); }
});

router.get('/:id', async (req, res) => {
    try {
        const item = await db.Package.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: 'Package not found' });
        res.json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch package' });
    }
});

router.post('/', authenticateJWT, upload.single('image'), async (req, res) => {
    try {
      if (req.body.location && req.body.location !== req.user.location) return res.status(403).json({ error: 'Anda hanya dapat mengelola cabang sendiri' });
        if (!req.body.name || !req.body.description) return res.status(400).json({ error: 'Nama dan deskripsi wajib diisi.' });
        const item = await db.Package.create({
            location: req.user.location,
            name: req.body.name,
            description: req.body.description,
            included: parseIncluded(req.body.included),
            imageUrl: req.file ? await processImage(req.file.buffer) : ''
        });
        res.status(201).json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create package' });
    }
});

router.put('/:id', authenticateJWT, upload.single('image'), async (req, res) => {
    try {
      if (req.body.location && req.body.location !== req.user.location) return res.status(403).json({ error: 'Anda hanya dapat mengelola cabang sendiri' });
        const item = await db.Package.findByPk(req.params.id);
        if (!item || item.location !== req.user.location) return res.status(404).json({ error: 'Package not found' });
        let imageUrl = item.imageUrl;
        if (req.file) {
            imageUrl = await processImage(req.file.buffer);
            removeImage(item.imageUrl);
        }
        await item.update({
            name: req.body.name,
            description: req.body.description,
            included: parseIncluded(req.body.included, item.included || []),
            imageUrl
        });
        res.json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update package' });
    }
});

router.delete('/:id', authenticateJWT, async (req, res) => {
    try {
        const item = await db.Package.findByPk(req.params.id);
        if (!item || item.location !== req.user.location) return res.status(404).json({ error: 'Package not found' });
        removeImage(item.imageUrl);
        await item.destroy();
        res.json({ message: 'Package deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete package' });
    }
});

module.exports = router;
