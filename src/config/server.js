const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Require models to trigger DB connection test from models/index.js
const db = require("../models");
const authRoutes = require("../routes/auth");

const cookieParser = require("cookie-parser");

const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:3000",
  credentials: true,
  maxAge: 86400
}));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

const { authenticateJWT } = require('../middlewares/auth');
app.use((req, res, next) => {
  const match = req.url.match(/^\/(padang|painan)(\/api(?:\/.*|\?.*|$))/);
  if (match) {
    req.adminLocation = match[1];
    req.url = match[2];
  } else if (['padang', 'painan'].includes(req.headers['x-admin-location'])) {
    req.adminLocation = req.headers['x-admin-location'];
  }
  next();
});
const PADANG_SETTINGS_KEYS = new Set([
  'rooms_subtitle_padang',
  'facilities_subtitle_padang',
  'galleries_subtitle_padang',
  'tourist_attractions_padang_json',
  'history_subtitle_padang',
  'history_quote_padang',
  'history_content_padang',
  'vision_subtitle_padang',
  'vision_text_padang',
  'missions_padang_json',
  'footer_about_padang',
  'footer_address_padang',
  'footer_phone_padang',
  'footer_email_padang',
  'footer_links_padang',
  'footer_show_newsletter_padang',
  'home_hero_title_padang',
  'home_hero_subtitle_padang',
  'home_hero_image_padang',
  'home_whatsapp_number_padang',
  'home_review_url_padang',
  'home_sections_order_padang',
]);

function isPadangSettingKey(key) {
  return PADANG_SETTINGS_KEYS.has(key) || /^contact_padang_(hotel_name|address|phone|email|map_latitude|map_longitude|map_url|map_label)$/.test(key);
}

app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path.startsWith('/auth/') || req.path === '/contact') return next();
  authenticateJWT(req, res, () => {
    if (
      req.user.location === 'padang' &&
      !req.path.startsWith('/rooms') &&
      !req.path.startsWith('/branches/') &&
      !/^\/(facilities|packages|galleries)(\/|$)/.test(req.path) &&
      req.path !== '/settings/upload-hero' &&
      !(req.path === '/settings' && req.method === 'PUT' && Object.keys(req.body).every(isPadangSettingKey))
    ) {
      return res.status(403).json({ error: 'Admin Padang hanya dapat mengelola data cabang Padang.' });
    }
    next();
  });
});
// Register API Routes
app.use("/api/auth", authRoutes);
const roomsRoutes = require("../routes/rooms");
app.use("/api/rooms", roomsRoutes);
app.use("/api/branches", require("../routes/branches"));
app.use("/api/settings", require("../routes/settings"));
app.use("/api/contact", require("../routes/contact"));
app.use("/api/galleries", require("../routes/galleries"));
app.use("/api/facilities", require("../routes/facilities"));
app.use("/api/packages", require("../routes/packages"));

// Serve static files for image uploads with long-term cache headers
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, '../../public/uploads'), {
  maxAge: '30d',
  immutable: true
}));
app.use(express.static(path.join(__dirname, '../../public')));
app.get("/", (req, res) => {
  res.send("Backend Express berjalan dengan Sequelize");
});

app.get("/api/health", async (req, res) => {
  try {
    // Test Sequelize connection
    await db.sequelize.authenticate();
    res.json({
      message: "Backend dan database berhasil terhubung via Sequelize",
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check DB error:", error.code || "DB_ERROR");
    res.status(500).json({
      message: "Gagal koneksi database",
    });
  }
});

// Global JSON error handler (handles Multer errors, invalid JSON, etc. without leaking stack traces)
app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.name === "MulterError") {
    const message = err.code === "LIMIT_FILE_SIZE"
      ? "Ukuran file maksimal 5 MB."
      : "Format unggahan tidak valid.";
    return res.status(400).json({ error: message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Format JSON tidak valid." });
  }
  if (err.message === "Only image files are allowed!" || err.message === "Format gambar tidak valid") {
    return res.status(400).json({ error: "Hanya file gambar JPG, PNG, atau WEBP yang diperbolehkan." });
  }
  console.error("Unhandled Express error:", err.message || err);
  return res.status(500).json({ error: "Terjadi kesalahan pada server." });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  try {
    await db.sequelize.authenticate();
    console.log('Connection to database has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});
