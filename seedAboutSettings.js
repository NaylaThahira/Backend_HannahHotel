const db = require('./src/models');

const missions = [
  { title: 'Pelayanan Sepenuh Hati', desc: 'Memberikan standar layanan tertinggi yang berfokus pada detail dan kepuasan personal tamu.', icon: 'Heart' },
  { title: 'Inovasi Fasilitas', desc: 'Terus mengembangkan fasilitas modern yang menunjang kenyamanan tanpa melupakan estetika.', icon: 'Star' },
  { title: 'Integritas & Kepercayaan', desc: 'Membangun hubungan jangka panjang dengan tamu melalui layanan yang jujur dan dapat diandalkan.', icon: 'ShieldCheck' },
  { title: 'Kenyamanan Hakiki', desc: 'Menciptakan lingkungan yang tenang, bersih, dan ramah layaknya berada di rumah sendiri.', icon: 'Smile' }
];

const newSettings = {
  history_quote: '"Berawal dari mimpi kecil untuk menciptakan persinggahan yang hangat layaknya rumah, Hannah Hotel kini telah tumbuh melayani ribuan tamu dengan dedikasi dan cinta."',
  history_content: `Perjalanan kami dimulai pada sebuah bangunan klasik yang sederhana. Saat itu, pendiri kami menyadari bahwa apa yang paling dirindukan oleh seorang pelancong bukanlah kemewahan yang kaku, melainkan keramahan, kebersihan, dan perhatian terhadap hal-hal kecil. Itulah yang menjadi fondasi utama berdirinya Hannah Hotel.

Tahun demi tahun, seiring dengan meningkatnya kepercayaan dari para tamu, kami terus berbenah. Mulai dari penambahan fasilitas modern, ekspansi jumlah kamar, hingga pembaruan desain interior yang memadukan estetika lokal dan kenyamanan kontemporer. Walaupun banyak hal yang telah berubah, satu hal yang tetap sama: komitmen kami untuk memberikan pelayanan dari hati.

Setiap sudut di Hannah Hotel menyimpan cerita, dan setiap tamu adalah bagian penting dari perjalanan panjang tersebut.

Hari ini, Hannah Hotel tidak hanya sekadar tempat untuk menginap, melainkan ruang untuk menciptakan memori indah, baik untuk liburan keluarga, perjalanan bisnis, maupun momen-momen istimewa lainnya. Kami berterima kasih kepada Anda yang terus memilih kami sebagai rumah kedua Anda.`,
  vision_text: 'Menjadi pionir dalam industri perhotelan yang menghadirkan harmoni sempurna antara kemewahan modern, kehangatan pelayanan lokal, dan komitmen terhadap pariwisata berkelanjutan.',
  missions_json: JSON.stringify(missions)
};

async function seedSettings() {
  try {
    for (const [key, value] of Object.entries(newSettings)) {
      const [setting, created] = await db.Setting.findOrCreate({
        where: { key },
        defaults: { value }
      });
      if (!created) {
        await setting.update({ value });
      }
    }
    console.log('Successfully seeded About Us settings!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed settings:', err);
    process.exit(1);
  }
}

seedSettings();
