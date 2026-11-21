const express = require('express');
const router = express.Router();
const db = require('../models');
const { authenticateJWT } = require('../middlewares/auth');
const { revalidateFrontend } = require('../services/revalidate');
const { isPositiveIntId, safeDeleteUpload } = require('../utils/security');
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
    safeDeleteUpload(imageUrl, 'packages');
}

router.get('/', async (req, res) => {
    try {
        const location = req.query.location;
        if (location && !['padang', 'painan'].includes(location)) return res.status(400).json({ error: 'Lokasi tidak valid' });
        res.json(await db.Package.findAll({
            where: location ? { location } : {},
            attributes: ['id', 'name', 'location', 'description', 'imageUrl'],
            order: [['id', 'ASC']]
        }));
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
        if (!isPositiveIntId(req.params.id)) return res.status(400).json({ error: 'ID paket tidak valid' });
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
        if (typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.length > 200 || typeof req.body.description !== 'string' || !req.body.description.trim() || req.body.description.length > 5000) {
            return res.status(400).json({ error: 'Nama (maks 200 karakter) dan deskripsi (maks 5000 karakter) wajib diisi.' });
        }
        const item = await db.Package.create({
            location: req.user.location,
            name: req.body.name.trim(),
            description: req.body.description.trim(),
            included: parseIncluded(req.body.included),
            imageUrl: req.file ? await processImage(req.file.buffer) : ''
        });
        await revalidateFrontend(['packages']);
        res.status(201).json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create package' });
    }
});

router.put('/:id', authenticateJWT, upload.single('image'), async (req, res) => {
    try {
        if (!isPositiveIntId(req.params.id)) return res.status(400).json({ error: 'ID paket tidak valid' });
        if (req.body.location && req.body.location !== req.user.location) return res.status(403).json({ error: 'Anda hanya dapat mengelola cabang sendiri' });
        const item = await db.Package.findByPk(req.params.id);
        if (!item || item.location !== req.user.location) return res.status(404).json({ error: 'Package not found' });
        if (req.body.name !== undefined && (typeof req.body.name !== 'string' || !req.body.name.trim() || req.body.name.length > 200)) {
            return res.status(400).json({ error: 'Nama paket tidak valid (maks 200 karakter).' });
        }
        if (req.body.description !== undefined && (typeof req.body.description !== 'string' || !req.body.description.trim() || req.body.description.length > 5000)) {
            return res.status(400).json({ error: 'Deskripsi paket tidak valid (maks 5000 karakter).' });
        }
        let imageUrl = item.imageUrl;
        if (req.file) {
            imageUrl = await processImage(req.file.buffer);
            removeImage(item.imageUrl);
        }
        await item.update({
            name: req.body.name !== undefined ? req.body.name.trim() : item.name,
            description: req.body.description !== undefined ? req.body.description.trim() : item.description,
            included: parseIncluded(req.body.included, item.included || []),
            imageUrl
        });
        await revalidateFrontend(['packages']);
        res.json(item);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to update package' });
    }
});

router.delete('/:id', authenticateJWT, async (req, res) => {
    try {
        if (!isPositiveIntId(req.params.id)) return res.status(400).json({ error: 'ID paket tidak valid' });
        const item = await db.Package.findByPk(req.params.id);
        if (!item || item.location !== req.user.location) return res.status(404).json({ error: 'Package not found' });
        removeImage(item.imageUrl);
        await item.destroy();
        await revalidateFrontend(['packages']);
        res.json({ message: 'Package deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete package' });
    }
});

module.exports = router;
