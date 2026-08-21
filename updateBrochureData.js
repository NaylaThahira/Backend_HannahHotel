const { Room, Setting } = require('./src/models');

async function updateBrochureData() {
  try {
    console.log('Updating Rooms...');
    
    // Superior Room
    let superior = await Room.findOne({ where: { name: 'Kamar Superior' } });
    if (superior) {
      await superior.update({ name: 'Superior Room', price: 'Rp396.000,-/RN' });
      console.log('Updated Superior Room');
    } else {
      let supEn = await Room.findOne({ where: { name: 'Superior Room' } });
      if (supEn) {
        await supEn.update({ price: 'Rp396.000,-/RN' });
        console.log('Updated Superior Room price');
      }
    }

    // Deluxe Room
    let deluxe = await Room.findOne({ where: { name: 'Kamar Deluxe' } });
    if (deluxe) {
      await deluxe.update({ name: 'Deluxe Room', price: 'Rp466.000,-/RN' });
      console.log('Updated Deluxe Room');
    } else {
      let delEn = await Room.findOne({ where: { name: 'Deluxe Room' } });
      if (delEn) {
        await delEn.update({ price: 'Rp466.000,-/RN' });
        console.log('Updated Deluxe Room price');
      }
    }

    // Executive Room (replace Family/Suite)
    let family = await Room.findOne({ where: { name: 'Kamar Family' } });
    if (family) {
      await family.update({ name: 'Executive Room', price: 'Rp858.000,-/RN' });
      console.log('Updated Kamar Family to Executive Room');
    } else {
      let exec = await Room.findOne({ where: { name: 'Executive Room' } });
      if (exec) {
        await exec.update({ price: 'Rp858.000,-/RN' });
        console.log('Updated Executive Room price');
      }
    }
    
    let suite = await Room.findOne({ where: { name: 'Kamar Suite' } });
    if (suite) {
      await suite.destroy();
      console.log('Removed extra Kamar Suite');
    }

    console.log('Updating Settings...');
    let about = await Setting.findOne({ where: { key: 'footer_about' } });
    if (about) {
      await about.update({ value: 'Hannah Hotel Syariah dengan Fasilitas terlengkap dikelasnya. Tengah kota. Akses ke tempat Wisata lebih dekat. Kenyamanan anda lebih kami utamakan.' });
    }
    
    let address = await Setting.findOne({ where: { key: 'footer_address' } });
    if (address) {
      await address.update({ value: 'Jl.Ilyas yakup no.24 Painan' });
    }

    let phone = await Setting.findOne({ where: { key: 'footer_phone' } });
    if (phone) {
      await phone.update({ value: '0811 661 7717' });
    }
    
    console.log('Settings updated successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating data:', error);
    process.exit(1);
  }
}

updateBrochureData();
