const express = require("express");
const cors = require("cors");
require("dotenv").config();

// Require models to trigger DB connection test from models/index.js
const db = require("../models");
const authRoutes = require("../routes/auth");

const cookieParser = require("cookie-parser");

const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const { authenticateJWT } = require('../middlewares/auth');
app.use('/api', (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path.startsWith('/auth/') || req.path === '/contact') return next();
  authenticateJWT(req, res, () => {
    if (req.user.location === 'padang' && !req.path.startsWith('/rooms') && !req.path.startsWith('/branches/') && !/^\/(facilities|packages)(\/|$)/.test(req.path) && !(req.path === '/settings' && req.method === 'PUT' && Object.keys(req.body).every(key => (['rooms_subtitle_padang', 'tourist_attractions_padang_json', 'facilities_subtitle_padang'].includes(key) || /^contact_padang_(hotel_name|address|phone|email|map_latitude|map_longitude|map_url|map_label)$/.test(key))))) {
      return res.status(403).json({ error: 'Admin Padang hanya dapat mengelola kamar dan informasi cabang Padang.' });
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

// Serve static files for image uploads
const path = require('path');
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
    res.status(500).json({
      message: "Gagal koneksi database",
      error: error.message,
    });
  }
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
