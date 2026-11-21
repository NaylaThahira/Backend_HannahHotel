const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const db = require('../models');
const { authenticateJWT } = require('../middlewares/auth');
const { revalidateFrontend } = require('../services/revalidate');
const { isPositiveIntId, isSafeUploadUrl, safeDeleteUpload } = require('../utils/security');

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

// GET all rooms (listing attributes only)
router.get('/', async (req, res) => {
  try {
    const location = req.query.location || (req.adminLocation === 'padang' ? 'padang' : undefined);
    if (location && !['padang', 'painan'].includes(location)) return res.status(400).json({ error: 'Lokasi tidak valid' });
    if (req.adminLocation === 'padang' && location !== 'padang') return res.status(403).json({ error: 'Akses lokasi ditolak' });
    const rooms = await db.Room.findAll({
      where: location ? { location } : {},
      attributes: ['id', 'name', 'location', 'price', 'description', 'imageUrl', 'facilities', 'isFeatured'],
      order: [['id', 'ASC']]
    });
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

// GET room count
router.get('/count', async (req, res) => {
  try {
    const location = req.query.location || (req.adminLocation === 'padang' ? 'padang' : undefined);
    if (location && !['padang', 'painan'].includes(location)) return res.status(400).json({ error: 'Lokasi tidak valid' });
    if (req.adminLocation === 'padang' && location !== 'padang') return res.status(403).json({ error: 'Akses lokasi ditolak' });
    const count = await db.Room.count({
      where: location ? { location } : {}
    });
    res.json({ count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to count rooms' });
  }
});

router.get('/manage', authenticateJWT, async (req, res) => {
  try { res.json(await db.Room.findAll({ where: { location: req.user.location }, order: [['id', 'ASC']] })); }
  catch (error) { console.error(error); res.status(500).json({ error: 'Gagal mengambil kamar' }); }
});

// GET single room
router.get('/:id', async (req, res) => {
  try {
    if (!isPositiveIntId(req.params.id)) return res.status(400).json({ error: 'ID kamar tidak valid' });
    const room = await db.Room.findByPk(req.params.id);
    if (!room || (req.user && room.location !== req.user.location) || (req.adminLocation === 'padang' && room.location !== 'padang')) return res.status(404).json({ error: 'Room not found' });
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

const normalizeDetailImageUrls = (input, allowedExistingUrls = []) => {
  const allowedSet = new Set(
    (Array.isArray(allowedExistingUrls) ? allowedExistingUrls : []).filter((u) => isSafeUploadUrl(u, 'rooms'))
  );
  let candidates = [];
  if (Array.isArray(input)) {
    candidates = input;
  } else if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) candidates = parsed;
    } catch {
      return [];
    }
  }
  return candidates
    .filter((u) => typeof u === 'string' && isSafeUploadUrl(u, 'rooms') && allowedSet.has(u))
    .slice(0, 4);
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
    const { name, price, description, isFeatured, facilities } = req.body;
    if (typeof name !== 'string' || !name.trim() || name.length > 200 || typeof description !== 'string' || !description.trim() || description.length > 5000) {
      return res.status(400).json({ error: 'Nama (maks 200 karakter) dan deskripsi (maks 5000 karakter) wajib diisi.' });
    }
    if (price !== undefined && (typeof price !== 'string' || price.length > 100)) {
      return res.status(400).json({ error: 'Format harga tidak valid.' });
    }
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

    let parsedDetailImageUrls = [];
    if (req.files && req.files.detailImages && req.files.detailImages.length > 0) {
      parsedDetailImageUrls = await getUploadedDetailImages(req.files.detailImages);
    }

    const roomPayload = {
      location: req.user.location,
      createdByAdminId: req.user.id,
      name: name.trim(),
      price: typeof price === 'string' ? price.trim() : '',
      description: description.trim(),
      imageUrl,
      isFeatured: isFeatured === 'true' || isFeatured === true,
      facilities: parsedFacilities
    };

    if (db.Room.rawAttributes && db.Room.rawAttributes.detailImageUrls) {
      roomPayload.detailImageUrls = parsedDetailImageUrls;
    }

    const newRoom = await db.Room.create(roomPayload);
    await revalidateFrontend(['rooms', 'branches']);

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
    if (!isPositiveIntId(req.params.id)) return res.status(400).json({ error: 'ID kamar tidak valid' });
    const room = await db.Room.findByPk(req.params.id);
    if (!room || (req.user && room.location !== req.user.location) || (req.adminLocation === 'padang' && room.location !== 'padang')) return res.status(404).json({ error: 'Room not found' });

    const { name, price, description, isFeatured, facilities, detailImageUrls } = req.body;
    if (name !== undefined && (typeof name !== 'string' || !name.trim() || name.length > 200)) {
      return res.status(400).json({ error: 'Nama kamar tidak valid (maks 200 karakter).' });
    }
    if (description !== undefined && (typeof description !== 'string' || !description.trim() || description.length > 5000)) {
      return res.status(400).json({ error: 'Deskripsi kamar tidak valid (maks 5000 karakter).' });
    }
    if (price !== undefined && (typeof price !== 'string' || price.length > 100)) {
      return res.status(400).json({ error: 'Format harga tidak valid.' });
    }

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
      safeDeleteUpload(room.imageUrl, 'rooms');
    }

    let parsedFacilities = room.facilities || [];
    if (facilities !== undefined) {
      try {
        parsedFacilities = typeof facilities === 'string' ? JSON.parse(facilities) : facilities;
      } catch (e) {
        console.error("Failed to parse facilities in PUT", e);
      }
    }

    const existingDetailUrls = Array.isArray(room.detailImageUrls) ? room.detailImageUrls : [];
    let parsedDetailImageUrls = existingDetailUrls;
    if (req.files && req.files.detailImages && req.files.detailImages.length > 0) {
      const retainedUrls = detailImageUrls !== undefined
        ? normalizeDetailImageUrls(detailImageUrls, existingDetailUrls)
        : [];
      const uploadedDetailImages = await getUploadedDetailImages(req.files.detailImages);
      parsedDetailImageUrls = [...retainedUrls, ...uploadedDetailImages].slice(0, 4);

      const retainedSet = new Set(parsedDetailImageUrls);
      for (const oldUrl of existingDetailUrls) {
        if (!retainedSet.has(oldUrl)) {
          safeDeleteUpload(oldUrl, 'rooms');
        }
      }
    } else if (detailImageUrls !== undefined) {
      parsedDetailImageUrls = normalizeDetailImageUrls(detailImageUrls, existingDetailUrls);
    }

    const roomPayload = {
      name: name !== undefined ? name.trim() : room.name,
      price: price !== undefined ? price.trim() : room.price,
      description: description !== undefined ? description.trim() : room.description,
      imageUrl,
      isFeatured: isFeatured === undefined ? room.isFeatured : tryingToFeature,
      facilities: parsedFacilities
    };

    if (db.Room.rawAttributes && db.Room.rawAttributes.detailImageUrls) {
      roomPayload.detailImageUrls = parsedDetailImageUrls;
    }

    await room.update(roomPayload);
    await revalidateFrontend(['rooms', 'branches']);

    res.json(room);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// DELETE room
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    if (!isPositiveIntId(req.params.id)) return res.status(400).json({ error: 'ID kamar tidak valid' });
    const room = await db.Room.findByPk(req.params.id);
    if (!room || (req.user && room.location !== req.user.location) || (req.adminLocation === 'padang' && room.location !== 'padang')) return res.status(404).json({ error: 'Room not found' });

    // Delete main image and detail images safely from disk
    const imagesToDelete = [
      room.imageUrl,
      ...(Array.isArray(room.detailImageUrls) ? room.detailImageUrls : [])
    ];
    for (const imgUrl of imagesToDelete) {
      safeDeleteUpload(imgUrl, 'rooms');
    }

    await room.destroy();
    await revalidateFrontend(['rooms', 'branches']);
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

module.exports = router;
