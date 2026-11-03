const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../models');

test('contact page has two editable branches, Padang map, and no message form', async () => {
  db.sequelize.options.logging = false;
  const backups = {};
  const api = location => `http://localhost:${location === 'padang' ? 5001 : 5000}`;
  const key = (location, field) => `contact_${location === 'padang' ? 'padang_' : ''}${field}`;
  try {
    const initial = await (await fetch('http://localhost:5000/api/settings')).json();
    assert.equal(initial.contact_padang_map_latitude, '-0.9381099');
    assert.equal(initial.contact_padang_map_longitude, '100.3867207');
    assert.ok(initial.contact_padang_map_url.includes('Hannah+Guest+House+Syariah'));
    for (const location of ['padang', 'painan']) {
      const login = await fetch(`${api(location)}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: `admin${location}`, password: '12345' }) });
      assert.equal(login.status, 200);
      const cookie = login.headers.get('set-cookie').split(';')[0];
      const put = body => fetch(`${api(location)}/api/settings`, { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const other = location === 'padang' ? 'painan' : 'padang';
      assert.equal((await put({ [key(other, 'address')]: 'must not change' })).status, 403);
      assert.equal((await put({ [key(location, 'map_latitude')]: '999' })).status, 400);
      assert.equal((await put({ [key(location, 'map_url')]: 'javascript:alert(1)' })).status, 400);
      const values = { address: `Alamat uji kontak ${location}`, phone: location === 'padang' ? '081234567801' : '081234567802', email: `${location}@example.com`, map_latitude: location === 'padang' ? '-0.9381099' : '-1.3447921', map_longitude: location === 'padang' ? '100.3867207' : '100.5782687', map_url: `https://maps.google.com/?q=${location}` };
      const changes = Object.fromEntries(Object.entries(values).map(([field, value]) => [key(location, field), value]));
      for (const fieldKey of Object.keys(changes)) {
        const existing = await db.Setting.findOne({ where: { key: fieldKey } });
        backups[fieldKey] = existing ? existing.value : null;
      }
      assert.equal((await put(changes)).status, 200);
      const html = await (await fetch(`http://localhost:3000/contact?location=${location}`)).text();
      assert.ok(html.includes('Cabang <!-- -->Padang'));
      assert.ok(html.includes('Cabang <!-- -->Painan'));
      assert.ok(html.includes('role="tabpanel"'));
      assert.ok(html.includes('>Telepon sekarang</a>'));
      assert.ok(html.includes(values.address));
      assert.ok(html.includes(`href="tel:${values.phone}"`));
      assert.ok(html.includes(`href="mailto:${values.email}"`));
      assert.ok(html.includes(values.map_url));
      assert.ok(!html.includes('id="contact-full-name"'));
      assert.ok(!html.includes('id="contact-message"'));
      assert.ok(!html.includes('>Kirim Pesan<'));
      const panel = await fetch(`http://localhost:3000/admin${location === 'padang' ? 'Padang' : 'Painan'}/contact`, { headers: { cookie }, redirect: 'manual' });
      assert.equal(panel.status, 200);
      const adminHtml = await panel.text();
      assert.ok(adminHtml.includes('Alamat lengkap'));
      assert.ok(adminHtml.includes('Link Google Maps'));
      assert.ok(!adminHtml.includes('Formulir Kontak'));
    }
  } finally {
    for (const [fieldKey, value] of Object.entries(backups)) {
      if (value === null) await db.Setting.destroy({ where: { key: fieldKey } });
      else await db.Setting.update({ value }, { where: { key: fieldKey } });
    }
    await db.sequelize.close();
  }
});
