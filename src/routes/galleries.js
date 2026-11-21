const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const db = require('../models');
const { authenticateJWT } = require('../middlewares/auth');
const { revalidateFrontend } = require('../services/revalidate');
const { isPositiveIntId, safeDeleteUpload } = require('../utils/security');

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

// GET all gallery images (supports optional ?location=padang|painan and ?limit=N)
router.get('/', async (req, res) => {
  try {
    const location = req.query.location;
    if (location && !['padang', 'painan'].includes(location)) {
      return res.status(400).json({ error: 'Lokasi tidak valid' });
    }
    const rawLimit = req.query.limit ? parseInt(req.query.limit, 10) : NaN;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : undefined;
    const images = await db.Gallery.findAll({
      where: location ? { location } : {},
      attributes: ['id', 'title', 'imageUrl', 'location', 'createdAt'],
      order: [['createdAt', 'DESC']],
      ...(limit ? { limit } : {})
    });
    res.json(images);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch gallery images' });
  }
});

// GET manage gallery images for logged-in admin branch
router.get('/manage', authenticateJWT, async (req, res) => {
  try {
    const images = await db.Gallery.findAll({
      where: { location: req.user.location },
      attributes: ['id', 'title', 'imageUrl', 'location', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    res.json(images);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Gagal mengambil data galeri cabang' });
  }
});

// Helper function to process image
const processImage = async (buffer) => {
  const uploadPath = path.join(__dirname, '../../public/uploads/galleries');
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }
  
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const filename = `${uniqueSuffix}.webp`;
  const filePath = path.join(uploadPath, filename);

  await sharp(buffer)
    .resize(1920, null, { withoutEnlargement: true }) // max width 1920px
    .webp({ quality: 80 })
    .toFile(filePath);
    
  return '/uploads/galleries/' + filename;
};

// POST new gallery image
router.post('/', authenticateJWT, upload.single('image'), async (req, res) => {
  try {
    if (req.body.location && req.body.location !== req.user.location) {
      return res.status(403).json({ error: 'Anda hanya dapat mengelola cabang sendiri' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const { title } = req.body;
    if (title !== undefined && (typeof title !== 'string' || title.length > 200)) {
      return res.status(400).json({ error: 'Judul foto maksimal 200 karakter' });
    }

    const imageUrl = await processImage(req.file.buffer);

    const newImage = await db.Gallery.create({
      location: req.user.location,
      title: typeof title === 'string' ? title.trim() : '',
      imageUrl
    });

    await revalidateFrontend(['galleries', `galleries-${req.user.location}`]);
    res.status(201).json(newImage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload gallery image' });
  }
});

// DELETE gallery image
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    if (!isPositiveIntId(req.params.id)) {
      return res.status(400).json({ error: 'ID galeri tidak valid' });
    }
    const image = await db.Gallery.findByPk(req.params.id);
    if (!image || image.location !== req.user.location) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete file safely from disk
    safeDeleteUpload(image.imageUrl, 'galleries');

    await image.destroy();
    await revalidateFrontend(['galleries', `galleries-${req.user.location}`]);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete gallery image' });
  }
});

module.exports = router;
