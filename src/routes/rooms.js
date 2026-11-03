const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const db = require('../models');
const { authenticateJWT } = require('../middlewares/auth');

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
    const location = req.query.location || (process.env.HOTEL_LOCATION === 'padang' ? 'padang' : undefined);
    if (location && !['padang', 'painan'].includes(location)) return res.status(400).json({ error: 'Lokasi tidak valid' });
    if (process.env.HOTEL_LOCATION === 'padang' && location !== 'padang') return res.status(403).json({ error: 'Akses lokasi ditolak' });
    const rooms = await db.Room.findAll({
      where: location ? { location } : {},
      order: [['id', 'ASC']]
    });
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

router.get('/manage', authenticateJWT, async (req, res) => {
  try { res.json(await db.Room.findAll({ where: { location: req.user.location }, order: [['id', 'ASC']] })); }
  catch (error) { console.error(error); res.status(500).json({ error: 'Gagal mengambil kamar' }); }
});

// GET single room
router.get('/:id', async (req, res) => {
  try {
    const room = await db.Room.findByPk(req.params.id);
    if (!room || (req.user && room.location !== req.user.location) || (process.env.HOTEL_LOCATION === 'padang' && room.location !== 'padang')) return res.status(404).json({ error: 'Room not found' });
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

const normalizeDetailImageUrls = (input) => {
  if (Array.isArray(input)) {
    return input.slice(0, 4);
  }

  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return Array.isArray(parsed) ? parsed.slice(0, 4) : [];
    } catch (error) {
      return [];
    }
  }

  return [];
};

const getUploadedDetailImages = async (files = []) => {
  if (!files || files.length === 0) return [];

  const imageUrls = [];
  for (const file of files.slice(0, 4)) {
    imageUrls.push(await processImage(file.buffer));
  }

  return imageUrls;
};

// POST new room
router.post('/', authenticateJWT, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'detailImages', maxCount: 4 }
]), async (req, res) => {
  try {
    const { name, price, description, isFeatured, facilities, detailImageUrls } = req.body;
    if (isFeatured === 'true' || isFeatured === true) {
      const count = await db.Room.count({ where: { location: req.user.location, isFeatured: true } });
      if (count >= 2) return res.status(400).json({ error: 'Maksimal 2 kamar pilihan per lokasi.' });
    }
    let imageUrl = '';

    if (req.files && req.files.image && req.files.image[0]) {
      imageUrl = await processImage(req.files.image[0].buffer);
    }

    let parsedFacilities = [];
    if (facilities) {
      try {
        parsedFacilities = JSON.parse(facilities);
      } catch (e) {
        console.error("Failed to parse facilities", e);
      }
    }

    let parsedDetailImageUrls = normalizeDetailImageUrls(detailImageUrls);
    if (req.files && req.files.detailImages && req.files.detailImages.length > 0) {
      parsedDetailImageUrls = await getUploadedDetailImages(req.files.detailImages);
    }

    const roomPayload = {
      location: req.user.location,
      createdByAdminId: req.user.id,
      name,
      price,
      description,
      imageUrl,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      facilities: parsedFacilities
    };

    if (db.Room.rawAttributes && db.Room.rawAttributes.detailImageUrls) {
      roomPayload.detailImageUrls = parsedDetailImageUrls;
    }

    const newRoom = await db.Room.create(roomPayload);

    res.status(201).json(newRoom);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create room' });
  }
});

// PUT update room
router.put('/:id', authenticateJWT, upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'detailImages', maxCount: 4 }
]), async (req, res) => {
  try {
    const room = await db.Room.findByPk(req.params.id);
    if (!room || (req.user && room.location !== req.user.location) || (process.env.HOTEL_LOCATION === 'padang' && room.location !== 'padang')) return res.status(404).json({ error: 'Room not found' });

    const { name, price, description, isFeatured, facilities, detailImageUrls } = req.body;

    // Check limit if trying to set as featured
    const tryingToFeature = isFeatured === 'true' || isFeatured === true;
    if (tryingToFeature && !room.isFeatured) {
      const featuredCount = await db.Room.count({ where: { isFeatured: true, location: req.user.location } });
      if (featuredCount >= 2) {
        return res.status(400).json({ error: 'Maximum 2 featured rooms allowed.' });
      }
    }

    let imageUrl = room.imageUrl; // Keep old image by default
    if (req.files && req.files.image && req.files.image[0]) {
      imageUrl = await processImage(req.files.image[0].buffer);

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

    let parsedDetailImageUrls = room.detailImageUrls || [];
    if (req.files && req.files.detailImages && req.files.detailImages.length > 0) {
      const uploadedDetailImages = await getUploadedDetailImages(req.files.detailImages);
      parsedDetailImageUrls = uploadedDetailImages;

      const oldUrls = Array.isArray(room.detailImageUrls) ? room.detailImageUrls : [];
      for (const oldUrl of oldUrls) {
        if (oldUrl && oldUrl.startsWith('/uploads/')) {
          const oldPath = path.join(__dirname, '../../public', oldUrl);
          if (fs.existsSync(oldPath)) {
            fs.unlinkSync(oldPath);
          }
        }
      }
    } else if (detailImageUrls !== undefined) {
      parsedDetailImageUrls = normalizeDetailImageUrls(detailImageUrls);
    }

    const roomPayload = {
      name,
      price,
      description,
      imageUrl,
      isFeatured: isFeatured === undefined ? room.isFeatured : tryingToFeature,
      facilities: parsedFacilities
    };

    if (db.Room.rawAttributes && db.Room.rawAttributes.detailImageUrls) {
      roomPayload.detailImageUrls = parsedDetailImageUrls;
    }

    await room.update(roomPayload);

    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// DELETE room
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const room = await db.Room.findByPk(req.params.id);
    if (!room || (req.user && room.location !== req.user.location) || (process.env.HOTEL_LOCATION === 'padang' && room.location !== 'padang')) return res.status(404).json({ error: 'Room not found' });

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
