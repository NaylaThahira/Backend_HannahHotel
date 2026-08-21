const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const db = require('../models');

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

// GET all gallery images
router.get('/', async (req, res) => {
  try {
    const images = await db.Gallery.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(images);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch gallery images' });
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
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image file is required' });
    }

    const { title } = req.body;
    
    const imageUrl = await processImage(req.file.buffer);

    const newImage = await db.Gallery.create({
      title: title || '',
      imageUrl
    });

    res.status(201).json(newImage);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to upload gallery image' });
  }
});

// DELETE gallery image
router.delete('/:id', async (req, res) => {
  try {
    const image = await db.Gallery.findByPk(req.params.id);
    if (!image) return res.status(404).json({ error: 'Image not found' });

    // Delete file from disk
    if (image.imageUrl && image.imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '../../public', image.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await image.destroy();
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete gallery image' });
  }
});

module.exports = router;
