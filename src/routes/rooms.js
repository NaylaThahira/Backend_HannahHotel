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

// GET all rooms
router.get('/', async (req, res) => {
  try {
    const rooms = await db.Room.findAll({
      order: [['id', 'ASC']]
    });
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// GET single room
router.get('/:id', async (req, res) => {
  try {
    const room = await db.Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch room' });
  }
});

// Helper function to process image
const processImage = async (buffer) => {
  const uploadPath = path.join(__dirname, '../../public/uploads/rooms');
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
    
  return '/uploads/rooms/' + filename;
};

// POST new room
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, price, description, isFeatured, facilities } = req.body;
    let imageUrl = '';
    
    if (req.file) {
      imageUrl = await processImage(req.file.buffer);
    }

    let parsedFacilities = [];
    if (facilities) {
      try {
        parsedFacilities = JSON.parse(facilities);
      } catch (e) {
        console.error("Failed to parse facilities", e);
      }
    }

    const newRoom = await db.Room.create({
      name,
      price,
      description,
      imageUrl,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      facilities: parsedFacilities
    });

    res.status(201).json(newRoom);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// PUT update room
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const room = await db.Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const { name, price, description, isFeatured, facilities } = req.body;
    
    // Check limit if trying to set as featured
    const tryingToFeature = isFeatured === 'true' || isFeatured === true;
    if (tryingToFeature && !room.isFeatured) {
      const featuredCount = await db.Room.count({ where: { isFeatured: true } });
      if (featuredCount >= 2) {
        return res.status(400).json({ error: 'Maximum 2 featured rooms allowed.' });
      }
    }

    let imageUrl = room.imageUrl; // Keep old image by default
    if (req.file) {
      imageUrl = await processImage(req.file.buffer);
      
      // Delete old image from disk
      if (room.imageUrl && room.imageUrl.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '../../public', room.imageUrl);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      }
    }

    let parsedFacilities = room.facilities || [];
    if (facilities !== undefined) {
      try {
        parsedFacilities = typeof facilities === 'string' ? JSON.parse(facilities) : facilities;
      } catch (e) {
        console.error("Failed to parse facilities in PUT", e);
      }
    }

    await room.update({
      name,
      price,
      description,
      imageUrl,
      isFeatured: tryingToFeature,
      facilities: parsedFacilities
    });

    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// DELETE room
router.delete('/:id', async (req, res) => {
  try {
    const room = await db.Room.findByPk(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });

    // Optional: Delete image from disk
    if (room.imageUrl && room.imageUrl.startsWith('/uploads/')) {
      const oldPath = path.join(__dirname, '../../public', room.imageUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await room.destroy();
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

module.exports = router;
