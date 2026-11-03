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
      order: [['id', 'ASC']]
    });
    res.json(facilities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch facilities' });
  }
});

// GET single facility
router.get('/manage', authenticateJWT, async (req, res) => {
  try { res.json(await db.Facility.findAll({ where: { location: req.user.location }, order: [['id', 'ASC']] })); }
  catch (error) { console.error(error); res.status(500).json({ error: 'Gagal mengambil data cabang' }); }
});

router.get('/:id', async (req, res) => {
  try {
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
    if (!name || !description) return res.status(400).json({ error: 'Nama dan deskripsi wajib diisi.' });
    
    const newFacility = await db.Facility.create({
            location: req.user.location,
      name,
      description,
      icon: icon || null,
      price,
      imageUrl: req.file ? await processImage(req.file.buffer) : '',
      facilities: parseFacilities(req.body.facilities)
    });

    res.status(201).json(newFacility);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create facility' });
  }
});

// PUT update facility
router.put('/:id', authenticateJWT, upload.single('image'), async (req, res) => {
  try {
      if (req.body.location && req.body.location !== req.user.location) return res.status(403).json({ error: 'Anda hanya dapat mengelola cabang sendiri' });
    const facility = await db.Facility.findByPk(req.params.id);
    if (!facility || facility.location !== req.user.location) return res.status(404).json({ error: 'Facility not found' });

    const { name, description, icon, price } = req.body;
    let imageUrl = facility.imageUrl;
    if (req.file) {
      imageUrl = await processImage(req.file.buffer);
      if (facility.imageUrl && facility.imageUrl.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '../../public', facility.imageUrl);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }
    
    await facility.update({
      name,
      description,
      icon: icon === undefined ? facility.icon : icon,
      price,
      imageUrl,
      facilities: parseFacilities(req.body.facilities, facility.facilities || [])
    });

    res.json(facility);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update facility' });
  }
});

// DELETE facility
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const facility = await db.Facility.findByPk(req.params.id);
    if (!facility || facility.location !== req.user.location) return res.status(404).json({ error: 'Facility not found' });

    if (facility.imageUrl && facility.imageUrl.startsWith('/uploads/')) {
      const imagePath = path.join(__dirname, '../../public', facility.imageUrl);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }
    await facility.destroy();
    res.json({ message: 'Facility deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete facility' });
  }
});

module.exports = router;
