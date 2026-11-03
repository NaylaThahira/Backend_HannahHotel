'use strict';
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async transaction => {
      const [rows] = await queryInterface.sequelize.query('SELECT key, value FROM "Settings"', { transaction });
      const settings = Object.fromEntries(rows.map(row => [row.key, row.value]));
      let address = '';
      try { address = JSON.parse(settings.branch_info_padang || '{}').location || ''; } catch {}
      const values = {
        contact_padang_hotel_name: "Hannah Hotel Syari'ah Padang",
        contact_padang_address: address,
        contact_padang_phone: '', contact_padang_email: '',
        contact_padang_map_latitude: '-0.9381099', contact_padang_map_longitude: '100.3867207',
        contact_padang_map_url: 'https://www.google.com/maps/place/Hannah+Guest+House+Syariah/@-0.9381099,100.3867207,793m/data=!3m2!1e3!4b1!4m9!3m8!1s0x2fd4b9c5113c0d27:0x6092b8a1f60a81ad!5m2!4m1!1i2!8m2!3d-0.9381099!4d100.3867207!16s%2Fg%2F11wjbcb_h_?entry=ttu',
        contact_padang_map_label: 'Buka di Google Maps'
      };
      for (const [key, value] of Object.entries(values)) {
        if (Object.hasOwn(settings, key)) continue;
        await queryInterface.bulkInsert('Settings', [{ key, value, createdAt: new Date(), updatedAt: new Date() }], { transaction });
      }
      if (settings.contact_description && /formulir/i.test(settings.contact_description)) {
        await queryInterface.bulkUpdate('Settings', { value: 'Hubungi cabang Padang atau Painan untuk pertanyaan, kebutuhan khusus, atau reservasi.', updatedAt: new Date() }, { key: 'contact_description' }, { transaction });
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Settings', { key: { [Sequelize.Op.like]: 'contact_padang_%' } });
  }
};
