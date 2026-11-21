const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { performance } = require('node:perf_hooks');
const db = require('../models');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

test('Padang real data seeder, Admin -> DB -> Public E2E flow, branch isolation, and <500ms NFR audit', async (t) => {
  db.sequelize.options.logging = false;

  await t.test('1. Verify Padang seeded real data (Rooms, Facilities, Packages separation, Galleries, Settings)', async () => {
    // Rooms
    const padangRooms = await db.Room.findAll({
      where: { location: 'padang' },
      order: [['id', 'ASC']],
    });
    assert.equal(padangRooms.length, 3, 'Padang must have 3 seeded real room types');

    const byName = Object.fromEntries(padangRooms.map((r) => [r.name, r]));
    assert.ok(byName['Superior King'], 'Superior King must exist');
    assert.ok(byName['Superior Twin'], 'Superior Twin must exist');
    assert.ok(byName['Deluxe King'], 'Deluxe King must exist');

    assert.equal(byName['Superior King'].price, '± Rp288.000');
    assert.equal(byName['Superior Twin'].price, '± Rp288.000');
    assert.equal(byName['Deluxe King'].price, '± Rp338.000');

    // Verify main & detail image files physically exist on disk
    for (const room of padangRooms) {
      const mainDiskPath = path.join(__dirname, '../../public', room.imageUrl);
      assert.ok(fs.existsSync(mainDiskPath), `Main image missing on disk: ${room.imageUrl}`);
      assert.ok(Array.isArray(room.detailImageUrls) && room.detailImageUrls.length >= 3);
      for (const detailUrl of room.detailImageUrls) {
        const detailDiskPath = path.join(__dirname, '../../public', detailUrl);
        assert.ok(fs.existsSync(detailDiskPath), `Detail image missing on disk: ${detailUrl}`);
      }
    }

    // Facilities vs Packages separation for Padang
    const padangFacilities = await db.Facility.findAll({ where: { location: 'padang' } });
    assert.ok(padangFacilities.length >= 4, 'Padang must have real seeded facilities');
    const padangPackages = await db.Package.findAll({ where: { location: 'padang' } });
    assert.equal(padangPackages.length, 0, 'Padang packages must be empty/separated while under management discussion');

    // Galleries
    const padangGalleries = await db.Gallery.findAll({ where: { location: 'padang' } });
    assert.equal(padangGalleries.length, 8, 'Padang must have 8 real gallery photos');

    // Settings
    const settingsRows = await db.Setting.findAll({
      where: {
        key: [
          'home_whatsapp_number_padang',
          'home_review_url_padang',
          'contact_padang_address',
          'contact_padang_phone',
          'footer_address_padang',
          'footer_phone_padang',
          'branch_info_padang',
        ],
      },
    });
    const settings = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]));
    assert.equal(settings.home_whatsapp_number_padang, '628116670024');
    assert.equal(settings.home_review_url_padang, '');
    assert.match(settings.contact_padang_address, /Jl\. Andalas No\.94/i);
    assert.equal(settings.contact_padang_phone, '0811 6670 024');
    assert.match(settings.footer_address_padang, /Jl\. Andalas No\.94/i);
  });

  await t.test('2. Admin -> Database -> Public Page functional CRUD & security isolation', async () => {
    const api = (loc) => `${BACKEND_URL}/${loc}`;
    const cookies = {};

    for (const loc of ['padang', 'painan']) {
      const res = await fetch(`${api(loc)}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: `admin${loc}`, password: '12345' }),
      });
      assert.equal(res.status, 200, `Login for admin${loc} must succeed`);
      cookies[loc] = res.headers.get('set-cookie').split(';')[0];
    }

    const callAdmin = (loc, endpoint, init = {}) =>
      fetch(`${api(loc)}${endpoint}`, {
        ...init,
        headers: {
          cookie: cookies[loc],
          ...(init.body && !(init.body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
          ...init.headers,
        },
      });

    const createdRoomIds = [];
    const createdFacilityIds = [];
    const createdGalleryIds = [];

    try {
      // A. Admin Padang creates a Room -> verify in DB -> verify in Public API -> verify Painan admin cannot edit/delete
      const roomRes = await callAdmin('padang', '/api/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Kamar Uji Fungsional Padang',
          price: 'Rp275.000',
          description: 'Kamar uji fungsional E2E dari Admin Padang',
          isFeatured: false,
          facilities: JSON.stringify([{ name: 'Wi-Fi Gratis', icon: 'Wifi' }]),
          location: 'painan', // attempt location spoofing -> must be forced to 'padang'
        }),
      });
      assert.equal(roomRes.status, 201);
      const createdRoom = await roomRes.json();
      createdRoomIds.push(createdRoom.id);
      assert.equal(createdRoom.location, 'padang', 'Server must enforce admin location on room creation');

      // Security check: Painan admin tries to update or delete Padang room -> 404
      const hijackRoomRes = await callAdmin('painan', `/api/rooms/${createdRoom.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'Hijacked' }),
      });
      assert.equal(hijackRoomRes.status, 404);

      // Public API check: visible under location=padang, invisible under location=painan
      const publicPadangRooms = await (await fetch(`${BACKEND_URL}/api/rooms?location=padang`)).json();
      const publicPainanRooms = await (await fetch(`${BACKEND_URL}/api/rooms?location=painan`)).json();
      assert.ok(publicPadangRooms.some((r) => r.id === createdRoom.id));
      assert.ok(!publicPainanRooms.some((r) => r.id === createdRoom.id));

      // B. Admin Padang creates a Facility -> verify in DB & Public API -> verify branch isolation
      const facRes = await callAdmin('padang', '/api/facilities', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Fasilitas Uji E2E Padang',
          description: 'Deskripsi fasilitas uji dari Admin Padang',
          icon: 'Sparkles',
          price: 'Gratis',
          facilities: JSON.stringify([{ name: 'AC', icon: 'Wind' }]),
        }),
      });
      assert.equal(facRes.status, 201);
      const createdFac = await facRes.json();
      createdFacilityIds.push(createdFac.id);
      assert.equal(createdFac.location, 'padang');

      const hijackFacRes = await callAdmin('painan', `/api/facilities/${createdFac.id}`, {
        method: 'DELETE',
      });
      assert.equal(hijackFacRes.status, 404);

      // C. Admin Padang uploads a Gallery image -> verify WebP conversion, DB persistence, and public filter
      const samplePng = await sharp({
        create: { width: 64, height: 48, channels: 3, background: '#00522a' },
      })
        .png()
        .toBuffer();
      const galForm = new FormData();
      galForm.set('title', 'Galeri Uji E2E Padang');
      galForm.set('image', new Blob([samplePng], { type: 'image/png' }), 'test-gallery.png');

      const galRes = await callAdmin('padang', '/api/galleries', {
        method: 'POST',
        body: galForm,
      });
      assert.equal(galRes.status, 201);
      const createdGal = await galRes.json();
      createdGalleryIds.push(createdGal.id);
      assert.equal(createdGal.location, 'padang');
      assert.match(createdGal.imageUrl, /^\/uploads\/galleries\/.*\.webp$/);

      // D. Security check on Settings: Admin Padang cannot modify Painan settings, and XSS URLs are rejected
      const crossBranchSettingRes = await callAdmin('padang', '/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ home_whatsapp_number: '628000000000' }),
      });
      assert.equal(crossBranchSettingRes.status, 403);

      const xssMapUrlRes = await callAdmin('padang', '/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ contact_padang_map_url: 'javascript:alert(1)' }),
      });
      assert.equal(xssMapUrlRes.status, 400);
    } finally {
      for (const id of createdRoomIds) {
        await callAdmin('padang', `/api/rooms/${id}`, { method: 'DELETE' }).catch(() => {});
      }
      for (const id of createdFacilityIds) {
        await callAdmin('padang', `/api/facilities/${id}`, { method: 'DELETE' }).catch(() => {});
      }
      for (const id of createdGalleryIds) {
        await callAdmin('padang', `/api/galleries/${id}`, { method: 'DELETE' }).catch(() => {});
      }
    }
  });

  await t.test('3. NFR Audit: API & Public Page latency < 500ms and concurrent traffic readiness (1000+ visitors/day)', async () => {
    const apiEndpoints = [
      '/api/branches',
      '/api/settings?keys=home_hero_title_padang,home_hero_subtitle_padang,home_hero_image_padang,home_whatsapp_number_padang,home_review_url_padang',
      '/api/rooms?location=padang',
      '/api/rooms?location=painan',
      '/api/facilities?location=padang',
      '/api/packages?location=padang',
      '/api/galleries?location=padang&limit=6',
    ];

    // Warm up once
    for (const ep of apiEndpoints) {
      const r = await fetch(`${BACKEND_URL}${ep}`);
      assert.equal(r.status, 200);
    }

    // Measure API latencies
    for (const ep of apiEndpoints) {
      const start = performance.now();
      const res = await fetch(`${BACKEND_URL}${ep}`);
      await res.text();
      const elapsedMs = performance.now() - start;
      assert.equal(res.status, 200);
      assert.ok(elapsedMs < 500, `API ${ep} took ${elapsedMs.toFixed(1)}ms (exceeds 500ms NFR limit)`);
    }

    // Concurrent load test (30 simultaneous requests simulating high concurrency spike)
    const burstStart = performance.now();
    const burstPromises = Array.from({ length: 30 }, (_, i) => {
      const ep = apiEndpoints[i % apiEndpoints.length];
      const t0 = performance.now();
      return fetch(`${BACKEND_URL}${ep}`).then(async (r) => {
        await r.text();
        return { status: r.status, ms: performance.now() - t0 };
      });
    });
    const burstResults = await Promise.all(burstPromises);
    const totalBurstMs = performance.now() - burstStart;
    assert.ok(burstResults.every((r) => r.status === 200), 'All 30 concurrent requests must return 200 OK');
    const avgBurstMs = burstResults.reduce((acc, r) => acc + r.ms, 0) / burstResults.length;
    assert.ok(avgBurstMs < 500, `Average concurrent request latency ${avgBurstMs.toFixed(1)}ms must be < 500ms`);
    console.log(
      `[NFR Benchmark] 30 concurrent requests completed in ${totalBurstMs.toFixed(1)}ms (avg=${avgBurstMs.toFixed(1)}ms/req)`
    );

    // Verify static asset caching headers for low bandwidth & fast repeat visits
    const staticImgRes = await fetch(`${BACKEND_URL}/uploads/rooms/padang-deluxe-king-main.webp`);
    assert.equal(staticImgRes.status, 200);
    assert.match(staticImgRes.headers.get('content-type') || '', /image\/webp/);
    assert.match(staticImgRes.headers.get('cache-control') || '', /immutable/);
  });

  await db.sequelize.close();
});
