'use strict';

const fs = require('fs');
const path = require('path');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const frontendPadangAssetsDir = path.resolve(
      __dirname,
      '../../../frontend/src/assets/room/Padang'
    );
    const frontendPainanAssetsDir = path.resolve(
      __dirname,
      '../../../frontend/src/assets/room/Painan'
    );
    const backendUploadsDir = path.resolve(__dirname, '../../public/uploads');

    const ensureDir = (dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    };

    const copyAsset = (baseDir, relativeSrc, relativeDest) => {
      const srcPath = path.join(baseDir, relativeSrc);
      const destPath = path.join(backendUploadsDir, relativeDest);
      ensureDir(path.dirname(destPath));
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, destPath);
      }
      return `/uploads/${relativeDest.replace(/\\/g, '/')}`;
    };

    // 1. Copy real WebP images from frontend/src/assets/room/Padang to backend/public/uploads
    const superiorKingMain = copyAsset(
      frontendPadangAssetsDir,
      'superior_king/WhatsApp Image 2026-11-20 at 13.23.14.webp',
      'rooms/padang-superior-king-main.webp'
    );
    const superiorKingDetails = [
      copyAsset(
        frontendPadangAssetsDir,
        'superior_king/WhatsApp Image 2026-11-20 at 13.23.14 (1).webp',
        'rooms/padang-superior-king-1.webp'
      ),
      copyAsset(
        frontendPadangAssetsDir,
        'superior_king/WhatsApp Image 2026-11-20 at 13.23.15 (1).webp',
        'rooms/padang-superior-king-2.webp'
      ),
      copyAsset(
        frontendPadangAssetsDir,
        'superior_king/WhatsApp Image 2026-11-20 at 13.23.15.webp',
        'rooms/padang-superior-king-3.webp'
      ),
    ];

    const superiorTwinMain = copyAsset(
      frontendPadangAssetsDir,
      'super_twin/WhatsApp Image 2026-11-20 at 13.23.15.webp',
      'rooms/padang-superior-twin-main.webp'
    );
    const superiorTwinDetails = [
      copyAsset(
        frontendPadangAssetsDir,
        'super_twin/WhatsApp Image 2026-11-20 at 13.23.15 (1).webp',
        'rooms/padang-superior-twin-1.webp'
      ),
      copyAsset(
        frontendPadangAssetsDir,
        'super_twin/WhatsApp Image 2026-11-20 at 13.23.16.webp',
        'rooms/padang-superior-twin-2.webp'
      ),
      copyAsset(
        frontendPadangAssetsDir,
        'super_twin/WhatsApp Image 2026-11-20 at 13.23.16 (2).webp',
        'rooms/padang-superior-twin-3.webp'
      ),
      copyAsset(
        frontendPadangAssetsDir,
        'super_twin/WhatsApp Image 2026-11-20 at 13.23.16 (1).webp',
        'rooms/padang-superior-twin-4.webp'
      ),
    ];

    const deluxeKingMain = copyAsset(
      frontendPadangAssetsDir,
      'deluxe_king/WhatsApp Image 2026-11-20 at 13.23.17.webp',
      'rooms/padang-deluxe-king-main.webp'
    );
    const deluxeKingDetails = [
      copyAsset(
        frontendPadangAssetsDir,
        'deluxe_king/WhatsApp Image 2026-11-20 at 13.23.17 (1).webp',
        'rooms/padang-deluxe-king-1.webp'
      ),
      copyAsset(
        frontendPadangAssetsDir,
        'deluxe_king/WhatsApp Image 2026-11-20 at 13.23.17 (3).webp',
        'rooms/padang-deluxe-king-2.webp'
      ),
      copyAsset(
        frontendPadangAssetsDir,
        'deluxe_king/WhatsApp Image 2026-11-20 at 13.23.17 (2).webp',
        'rooms/padang-deluxe-king-3.webp'
      ),
    ];

    // Facilities images
    const facilityMusholaImg = copyAsset(
      frontendPadangAssetsDir,
      'mushola/WhatsApp Image 2026-11-20 at 13.23.18.webp',
      'facilities/padang-mushola.webp'
    );
    const facilityResepsionisImg = copyAsset(
      frontendPadangAssetsDir,
      'resepsionis/WhatsApp Image 2026-11-20 at 13.23.14.webp',
      'facilities/padang-resepsionis.webp'
    );
    const facilityLoungeImg = copyAsset(
      frontendPadangAssetsDir,
      'resepsionis/WhatsApp Image 2026-11-20 at 13.23.14 (1).webp',
      'facilities/padang-lounge-parkir.webp'
    );
    const facilitySmartTvImg = copyAsset(
      frontendPadangAssetsDir,
      'deluxe_king/WhatsApp Image 2026-11-20 at 13.23.17 (1).webp',
      'facilities/padang-smart-tv-wifi.webp'
    );

    // Branch & Hero images (Padang & Painan)
    const branchPadangImg = copyAsset(
      frontendPadangAssetsDir,
      'resepsionis/WhatsApp Image 2026-11-20 at 13.23.14.webp',
      'branches/padang-lobby.webp'
    );
    const heroPadangImg = copyAsset(
      frontendPadangAssetsDir,
      'resepsionis/WhatsApp Image 2026-11-20 at 13.23.14.webp',
      'hero/padang-hero.webp'
    );
    const branchPainanImg = copyAsset(
      frontendPainanAssetsDir,
      'painan-hero.webp',
      'branches/painan-hero.webp'
    );
    const heroPainanImg = copyAsset(
      frontendPainanAssetsDir,
      'painan-hero.webp',
      'hero/painan-hero.webp'
    );

    // Gallery images (8 real photos)
    const galleryItems = [
      {
        title: 'Lobi & Resepsionis',
        imageUrl: copyAsset(
          frontendPadangAssetsDir,
          'resepsionis/WhatsApp Image 2026-11-20 at 13.23.14.webp',
          'galleries/padang-gallery-lobby-1.webp'
        ),
      },
      {
        title: 'Area Penerimaan Tamu',
        imageUrl: copyAsset(
          frontendPadangAssetsDir,
          'resepsionis/WhatsApp Image 2026-11-20 at 13.23.13.webp',
          'galleries/padang-gallery-lobby-2.webp'
        ),
      },
      {
        title: 'Ruang Tunggu Lobi',
        imageUrl: copyAsset(
          frontendPadangAssetsDir,
          'resepsionis/WhatsApp Image 2026-11-20 at 13.23.14 (1).webp',
          'galleries/padang-gallery-lobby-3.webp'
        ),
      },
      {
        title: "Mushola Syari'ah",
        imageUrl: copyAsset(
          frontendPadangAssetsDir,
          'mushola/WhatsApp Image 2026-11-20 at 13.23.18.webp',
          'galleries/padang-gallery-mushola-1.webp'
        ),
      },
      {
        title: 'Interior Mushola',
        imageUrl: copyAsset(
          frontendPadangAssetsDir,
          'mushola/WhatsApp Image 2026-11-20 at 13.23.18 (1).webp',
          'galleries/padang-gallery-mushola-2.webp'
        ),
      },
      {
        title: 'Kamar Deluxe King',
        imageUrl: copyAsset(
          frontendPadangAssetsDir,
          'deluxe_king/WhatsApp Image 2026-11-20 at 13.23.17.webp',
          'galleries/padang-gallery-deluxe-king.webp'
        ),
      },
      {
        title: 'Kamar Superior King',
        imageUrl: copyAsset(
          frontendPadangAssetsDir,
          'superior_king/WhatsApp Image 2026-11-20 at 13.23.14.webp',
          'galleries/padang-gallery-superior-king.webp'
        ),
      },
      {
        title: 'Kamar Superior Twin',
        imageUrl: copyAsset(
          frontendPadangAssetsDir,
          'super_twin/WhatsApp Image 2026-11-20 at 13.23.15.webp',
          'galleries/padang-gallery-superior-twin.webp'
        ),
      },
    ];

    const now = new Date();

    await queryInterface.sequelize.transaction(async (transaction) => {
      const [padangAdmins] = await queryInterface.sequelize.query(
        'SELECT id FROM "Admins" WHERE location = :location ORDER BY id ASC LIMIT 1',
        { replacements: { location: 'padang' }, transaction }
      );
      const padangAdminId = padangAdmins[0]?.id || null;

      // 2. Seed Rooms for Padang (Clean UI, concise descriptions, approximate ± price)
      await queryInterface.bulkDelete('Rooms', { location: 'padang' }, { transaction });
      await queryInterface.bulkInsert(
        'Rooms',
        [
          {
            name: 'Superior King',
            location: 'padang',
            createdByAdminId: padangAdminId,
            price: '± Rp288.000',
            description:
              "Kamar modern dengan tempat tidur King, Smart TV, meja kerja, dan suasana tenang berprinsip Syari'ah.",
            imageUrl: superiorKingMain,
            detailImageUrls: JSON.stringify(superiorKingDetails),
            isFeatured: true,
            facilities: JSON.stringify([
              { name: 'Tempat Tidur King', icon: 'Bed' },
              { name: 'AC', icon: 'Wind' },
              { name: 'Smart TV', icon: 'Tv' },
              { name: 'Wi-Fi Gratis', icon: 'Wifi' },
              { name: 'Ketel Listrik & Air Mineral', icon: 'Coffee' },
              { name: 'Kamar Mandi Shower', icon: 'Droplets' },
              { name: 'Bebas Asap Rokok', icon: 'CigaretteOff' },
            ]),
            createdAt: now,
            updatedAt: now,
          },
          {
            name: 'Superior Twin',
            location: 'padang',
            createdByAdminId: padangAdminId,
            price: '± Rp288.000',
            description:
              'Kamar praktis dengan dua tempat tidur single, ideal untuk rekan perjalanan bisnis maupun keluarga.',
            imageUrl: superiorTwinMain,
            detailImageUrls: JSON.stringify(superiorTwinDetails),
            isFeatured: false,
            facilities: JSON.stringify([
              { name: '2 Tempat Tidur Twin', icon: 'Bed' },
              { name: 'AC', icon: 'Wind' },
              { name: 'Smart TV', icon: 'Tv' },
              { name: 'Wi-Fi Gratis', icon: 'Wifi' },
              { name: 'Ketel Listrik & Air Mineral', icon: 'Coffee' },
              { name: 'Kamar Mandi Shower', icon: 'Droplets' },
              { name: 'Bebas Asap Rokok', icon: 'CigaretteOff' },
            ]),
            createdAt: now,
            updatedAt: now,
          },
          {
            name: 'Deluxe King',
            location: 'padang',
            createdByAdminId: padangAdminId,
            price: '± Rp338.000',
            description:
              'Kamar lebih luas dengan tempat tidur King dan ruang gerak ekstra untuk kenyamanan istirahat maksimal.',
            imageUrl: deluxeKingMain,
            detailImageUrls: JSON.stringify(deluxeKingDetails),
            isFeatured: true,
            facilities: JSON.stringify([
              { name: 'Tempat Tidur King Luas', icon: 'Bed' },
              { name: 'Ruang Lebih Lega', icon: 'Check' },
              { name: 'AC', icon: 'Wind' },
              { name: 'Smart TV', icon: 'Tv' },
              { name: 'Wi-Fi Gratis', icon: 'Wifi' },
              { name: 'Ketel Listrik & Air Mineral', icon: 'Coffee' },
              { name: 'Kamar Mandi Shower', icon: 'Droplets' },
              { name: 'Bebas Asap Rokok', icon: 'CigaretteOff' },
            ]),
            createdAt: now,
            updatedAt: now,
          },
        ],
        { transaction }
      );

      // 3. Seed Facilities for Padang (concise, clean UI, strictly separated from Packages)
      await queryInterface.bulkDelete('Facilities', { location: 'padang' }, { transaction });
      await queryInterface.bulkInsert(
        'Facilities',
        [
          {
            name: "Mushola Syari'ah",
            location: 'padang',
            description:
              'Ruang ibadah luas, sejuk, dan bersih dengan perlengkapan salat serta akses wudhu yang nyaman.',
            icon: 'Sparkles',
            price: '',
            imageUrl: facilityMusholaImg,
            facilities: JSON.stringify([
              { name: 'Karpet Sajadah Bersih', icon: 'Check' },
              { name: 'Ruangan Sejuk', icon: 'Wind' },
              { name: 'Perlengkapan Ibadah', icon: 'Sparkles' },
            ]),
            createdAt: now,
            updatedAt: now,
          },
          {
            name: 'Lobi & Resepsionis 24 Jam',
            location: 'padang',
            description:
              'Area tunggu ber-AC dengan sofa nyaman serta layanan resepsionis yang siap melayani setiap saat.',
            icon: 'ShieldCheck',
            price: '',
            imageUrl: facilityResepsionisImg,
            facilities: JSON.stringify([
              { name: 'Resepsionis 24 Jam', icon: 'ShieldCheck' },
              { name: 'Sofa Ruang Tunggu', icon: 'Check' },
              { name: 'Lobi Ber-AC', icon: 'Wind' },
            ]),
            createdAt: now,
            updatedAt: now,
          },
          {
            name: 'Area Parkir Tamu',
            location: 'padang',
            description:
              'Fasilitas parkir kendaraan tamu di area belakang gedung yang tertata dan aman.',
            icon: 'Car',
            price: '',
            imageUrl: facilityLoungeImg,
            facilities: JSON.stringify([
              { name: 'Parkir Belakang Gedung', icon: 'Car' },
              { name: 'Lingkungan Aman', icon: 'ShieldCheck' },
            ]),
            createdAt: now,
            updatedAt: now,
          },
          {
            name: 'Smart TV & Wi-Fi Cepat',
            location: 'padang',
            description:
              'Hiburan Smart TV di setiap kamar serta koneksi internet nirkabel cepat di seluruh area hotel.',
            icon: 'Wifi',
            price: '',
            imageUrl: facilitySmartTvImg,
            facilities: JSON.stringify([
              { name: 'Smart TV', icon: 'Tv' },
              { name: 'Wi-Fi Gratis', icon: 'Wifi' },
            ]),
            createdAt: now,
            updatedAt: now,
          },
        ],
        { transaction }
      );

      // 4. Keep Packages for Padang empty (separated from Facilities; under management discussion)
      await queryInterface.bulkDelete('Packages', { location: 'padang' }, { transaction });

      // 5. Seed Galleries for Padang
      await queryInterface.bulkDelete('Galleries', { location: 'padang' }, { transaction });
      await queryInterface.bulkInsert(
        'Galleries',
        galleryItems.map((item, idx) => ({
          title: item.title,
          imageUrl: item.imageUrl,
          location: 'padang',
          createdAt: new Date(now.getTime() - idx * 1000),
          updatedAt: now,
        })),
        { transaction }
      );

      // 6. Seed/Upsert Settings for Padang & Painan Hero/Branch Optimization
      const padangAddress =
        'Jl. Andalas No.94, Andalas, Kec. Padang Tim., Kota Padang, Sumatera Barat 25171';
      const padangBranchInfo = {
        id: 'padang',
        title: "Hannah Hotel Syari'ah Padang",
        imageUrl: branchPadangImg,
        description:
          "Nikmati kenyamanan menginap di pusat Kota Padang dalam suasana tenang, bersih, dan mengedepankan nilai-nilai Syari'ah dengan akses strategis ke berbagai pusat aktivitas kota.",
        location: padangAddress,
      };
      const painanBranchInfo = {
        id: 'painan',
        title: "Hannah Hotel Syari'ah Painan",
        imageUrl: branchPainanImg,
        description:
          "Tempat peristirahatan yang hangat dan damai di pusat Kota Painan, dekat dengan berbagai destinasi bahari terbaik Pesisir Selatan.",
        location: 'Jl. Ilyas Yakub No.24, Painan, Pesisir Selatan',
      };

      const padangMissions = [
        {
          title: 'Pelayanan Sepenuh Hati',
          desc: 'Memberikan standar layanan tertinggi yang berfokus pada detail dan kepuasan personal tamu.',
          icon: 'Heart',
        },
        {
          title: 'Inovasi Fasilitas',
          desc: 'Terus mengembangkan fasilitas modern yang menunjang kenyamanan tanpa melupakan estetika.',
          icon: 'Star',
        },
        {
          title: 'Integritas & Kepercayaan',
          desc: 'Membangun hubungan jangka panjang dengan tamu melalui layanan yang jujur dan dapat diandalkan.',
          icon: 'ShieldCheck',
        },
        {
          title: 'Kenyamanan Hakiki',
          desc: 'Menciptakan lingkungan yang tenang, bersih, dan ramah layaknya berada di rumah sendiri.',
          icon: 'Smile',
        },
      ];

      const padangAttractions = [
        'Stasiun Kereta Api Simpang Haru',
        'Masjid Raya Syekh Ahmad Khatib Al-Minangkabawi',
        'Pantai Padang',
        'Museum Adityawarman',
        'Jembatan Siti Nurbaya & Kota Tua',
        'Pantai Air Manis',
      ];

      const settingsPayload = {
        branch_info_padang: JSON.stringify(padangBranchInfo),
        branch_info_painan: JSON.stringify(painanBranchInfo),
        home_hero_image: heroPainanImg,
        home_hero_title_padang: "Hannah Hotel Syari'ah Padang",
        home_hero_subtitle_padang:
          'Harmoni ketenangan dan keramahan Islami di jantung Kota Padang. Ruang istirahat modern yang dirancang untuk kenyamanan keluarga maupun perjalanan bisnis Anda.',
        home_hero_image_padang: heroPadangImg,
        home_whatsapp_number_padang: '628116670024',
        home_review_url_padang: '',
        rooms_subtitle_padang:
          "Pilihan ruang istirahat bersih dan tenang yang dirancang untuk kenyamanan menginap sesuai prinsip Syari'ah.",
        facilities_subtitle_padang:
          "Fasilitas penunjang kenyamanan dan ibadah tamu di Hannah Hotel Syari'ah Padang.",
        galleries_subtitle_padang:
          "Dokumentasi suasana kamar, lobi, dan mushola di Hannah Hotel Syari'ah Padang.",
        tourist_attractions_padang_json: JSON.stringify(padangAttractions),
        contact_padang_hotel_name: "Hannah Hotel Syari'ah Padang",
        contact_padang_address: padangAddress,
        contact_padang_phone: '0811 6670 024',
        contact_padang_email: '',
        contact_padang_map_latitude: '-0.9381099',
        contact_padang_map_longitude: '100.3867207',
        contact_padang_map_url:
          'https://www.google.com/maps/place/Hannah+Guest+House+Syariah/@-0.9381099,100.3867207,793m/data=!3m2!1e3!4b1!4m9!3m8!1s0x2fd4b9c5113c0d27:0x6092b8a1f60a81ad!5m2!4m1!1i2!8m2!3d-0.9381099!4d100.3867207!16s%2Fg%2F11wjbcb_h_?entry=ttu',
        contact_padang_map_label: 'Buka di Google Maps',
        footer_about_padang:
          "Akomodasi nyaman dan tenang berprinsip Syari'ah di jantung Kota Padang.",
        footer_address_padang: padangAddress,
        footer_phone_padang: '0811 6670 024',
        footer_email_padang: '',
        history_subtitle_padang:
          'Mengenal lebih dekat perjalanan Hannah Hotel sejak awal berdiri hingga menjadi pilihan utama untuk pengalaman menginap terbaik Anda.',
        history_quote_padang:
          '"Berawal dari mimpi kecil untuk menciptakan persinggahan yang hangat layaknya rumah, Hannah Hotel kini telah tumbuh melayani ribuan tamu dengan dedikasi dan cinta."',
        history_content_padang:
          'Perjalanan kami dimulai pada sebuah bangunan klasik yang sederhana. Saat itu, pendiri kami menyadari bahwa apa yang paling dirindukan oleh seorang pelancong bukanlah kemewahan yang kaku, melainkan keramahan, kebersihan, dan perhatian terhadap hal-hal kecil. Itulah yang menjadi fondasi utama berdirinya Hannah Hotel.\n\nTahun demi tahun, seiring dengan meningkatnya kepercayaan dari para tamu, kami terus berbenah. Mulai dari penambahan fasilitas modern, ekspansi jumlah kamar, hingga pembaruan desain interior yang memadukan estetika lokal dan kenyamanan kontemporer. Walaupun banyak hal yang telah berubah, satu hal yang tetap sama: komitmen kami untuk memberikan pelayanan dari hati.\n\nSetiap sudut di Hannah Hotel menyimpan cerita, dan setiap tamu adalah bagian penting dari perjalanan panjang tersebut.\n\nHari ini, Hannah Hotel tidak hanya sekadar tempat untuk menginap, melainkan ruang untuk menciptakan memori indah, baik untuk liburan keluarga, perjalanan bisnis, maupun momen-momen istimewa lainnya. Kami berterima kasih kepada Anda yang terus memilih kami sebagai rumah kedua Anda.',
        vision_subtitle_padang:
          'Mendedikasikan diri untuk selalu memberikan layanan perhotelan terbaik dan pengalaman tak terlupakan bagi setiap tamu kami.',
        vision_text_padang:
          'Menjadi pionir dalam industri perhotelan yang menghadirkan harmoni sempurna antara kemewahan modern, kehangatan pelayanan lokal, dan komitmen terhadap pariwisata berkelanjutan.',
        missions_padang_json: JSON.stringify(padangMissions),
      };

      for (const [key, value] of Object.entries(settingsPayload)) {
        const [existing] = await queryInterface.sequelize.query(
          'SELECT id FROM "Settings" WHERE key = :key LIMIT 1',
          { replacements: { key }, transaction }
        );
        if (existing.length > 0) {
          await queryInterface.bulkUpdate(
            'Settings',
            { value, updatedAt: now },
            { key },
            { transaction }
          );
        } else {
          await queryInterface.bulkInsert(
            'Settings',
            [{ key, value, createdAt: now, updatedAt: now }],
            { transaction }
          );
        }
      }
    });

    try {
      const { revalidateFrontend } = require('../services/revalidate');
      await revalidateFrontend(['settings', 'rooms', 'branches', 'facilities', 'packages', 'galleries']);
    } catch {}
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.bulkDelete('Rooms', { location: 'padang' }, { transaction });
      await queryInterface.bulkDelete('Facilities', { location: 'padang' }, { transaction });
      await queryInterface.bulkDelete('Galleries', { location: 'padang' }, { transaction });
    });
  },
};
