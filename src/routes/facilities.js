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
  fileFilter: (req, file, cb) => /jpeg|jpg|png|webp/.test(file.mimetype) && /jpeg|jpg|png|webp/.test(path.extname(file.originalname).toLowerCase()) ? cb(null, true) : cb(new Error('Only image files are allowed!'))
});

async function processImage(buffer) {
  const uploadPath = path.join(__dirname, '../../public/uploads/facilities');
  if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  await sharp(buffer).resize(1920, null, { withoutEnlargement: true }).webp({ quality: 80 }).toFile(path.join(uploadPath, filename));
  return `/uploads/facilities/${filename}`;
}

function parseFacilities(value, fallback = []) {
  if (value === undefined) return fallback;
  try { return typeof value === 'string' ? JSON.parse(value) : value; } catch { return fallback; }
}

// GET all facilities
router.get('/', async (req, res) => {
  try {
    const location = req.query.location;
    if (location && !['padang', 'painan'].includes(location)) return res.status(400).json({ error: 'Lokasi tidak valid' });
    const facilities = await db.Facility.findAll({
      where: location ? { location } : {},
      attributes: ['id', 'name', 'location', 'description', 'icon', 'imageUrl', 'price', 'facilities'],
      order: [['id', 'ASC']]
    });
    res.json(facilities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch facilities' });
  }
});

// GET manage facilities
router.get('/manage', authenticateJWT, async (req, res) => {
  try { res.json(await db.Facility.findAll({ where: { location: req.user.location }, order: [['id', 'ASC']] })); }
  catch (error) { console.error(error); res.status(500).json({ error: 'Gagal mengambil data cabang' }); }
});

router.get('/:id', async (req, res) => {
  try {
    if (!isPositiveIntId(req.params.id)) return res.status(400).json({ error: 'ID fasilitas tidak valid' });
    const facility = await db.Facility.findByPk(req.params.id);
    if (!facility) return res.status(404).json({ error: 'Facility not found' });
    res.json(facility);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch facility' });
  }
});

// POST new facility
router.post('/', authenticateJWT, upload.single('image'), async (req, res) => {
  try {
    if (req.body.location && req.body.location !== req.user.location) return res.status(403).json({ error: 'Anda hanya dapat mengelola cabang sendiri' });
    const { name, description, icon, price } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.length > 200 || typeof description !== 'string' || !description.trim() || description.length > 5000) {
      return res.status(400).json({ error: 'Nama (maks 200 karakter) dan deskripsi (maks 5000 karakter) wajib diisi.' });
    }
    if (price !== undefined && (typeof price !== 'string' || price.length > 100)) {
      return res.status(400).json({ error: 'Format harga tidak valid.' });
    }

    const newFacility = await db.Facility.create({
      location: req.user.location,
      name: name.trim(),
      description: description.trim(),
      icon: icon || null,
      price: typeof price === 'string' ? price.trim() : '',
      imageUrl: req.file ? await processImage(req.file.buffer) : '',
      facilities: parseFacilities(req.body.facilities)
    });

    await revalidateFrontend(['facilities']);
    res.status(201).json(newFacility);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create facility' });
  }
});

// PUT update facility
router.put('/:id', authenticateJWT, upload.single('image'), async (req, res) => {
  try {
    if (!isPositiveIntId(req.params.id)) return res.status(400).json({ error: 'ID fasilitas tidak valid' });
    if (req.body.location && req.body.location !== req.user.location) return res.status(403).json({ error: 'Anda hanya dapat mengelola cabang sendiri' });
    const facility = await db.Facility.findByPk(req.params.id);
    if (!facility || facility.location !== req.user.location) return res.status(404).json({ error: 'Facility not found' });

    const { name, description, icon, price } = req.body;
    if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 200)) {
      return res.status(400).json({ error: 'Nama fasilitas tidak valid (maks 200 karakter).' });
    }
    if (description !== undefined && (typeof description !== 'string' || !description.trim() || description.length > 5000)) {
      return res.status(400).json({ error: 'Deskripsi fasilitas tidak valid (maks 5000 karakter).' });
    }
    if (price !== undefined && (typeof price !== 'string' || price.length > 100)) {
      return res.status(400).json({ error: 'Format harga tidak valid.' });
    }
    let imageUrl = facility.imageUrl;
    if (req.file) {
      imageUrl = await processImage(req.file.buffer);
      safeDeleteUpload(facility.imageUrl, 'facilities');
    }

    await facility.update({
      name: name !== undefined ? name.trim() : facility.name,
      description: description !== undefined ? description.trim() : facility.description,
      icon: icon === undefined ? facility.icon : icon,
      price: price !== undefined ? price.trim() : facility.price,
      imageUrl,
      facilities: parseFacilities(req.body.facilities, facility.facilities || [])
    });

    await revalidateFrontend(['facilities']);
    res.json(facility);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update facility' });
  }
});

// DELETE facility
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    if (!isPositiveIntId(req.params.id)) return res.status(400).json({ error: 'ID fasilitas tidak valid' });
    const facility = await db.Facility.findByPk(req.params.id);
    if (!facility || facility.location !== req.user.location) return res.status(404).json({ error: 'Facility not found' });

    safeDeleteUpload(facility.imageUrl, 'facilities');
    await facility.destroy();
    await revalidateFrontend(['facilities']);
    res.json({ message: 'Facility deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete facility' });
  }
});

module.exports = router;
