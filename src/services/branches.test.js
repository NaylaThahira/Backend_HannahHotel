// Requires both API servers, PostgreSQL, and the frontend on localhost.
const test = require('node:test');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');
const db = require('../models');

test('branch cards persist text and images, link to branch rooms, and enforce ownership', async () => {
  db.sequelize.options.logging = false;
  const backups = {};
  const images = [];
  const api = location => `http://localhost:5000/${location}`;
  try {
    for (const location of ['padang', 'painan']) {
      const key = `branch_info_${location}`;
      const existing = await db.Setting.findOne({ where: { key } });
      backups[key] = existing ? existing.value : null;
      const login = await fetch(`${api(location)}/api/auth/login`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: `admin${location}`, password: '12345' })
      });
      assert.equal(login.status, 200);
      const cookie = login.headers.get('set-cookie').split(';')[0];
      const other = location === 'padang' ? 'painan' : 'padang';
      const text = { title: `Test Hannah ${location}`, description: `Informasi uji ${location}`, location: `Alamat ${location}` };
      const denied = await fetch(`${api(location)}/api/branches/${other}`, { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(text) });
      assert.equal(denied.status, 403);
      const bypass = await fetch(`${api(location)}/api/settings`, { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ [`branch_info_${other}`]: '{}' }) });
      assert.equal(bypass.status, 403);
      const invalid = await fetch(`${api(location)}/api/branches/${location}`, { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ ...text, title: '' }) });
      assert.equal(invalid.status, 400);
      const form = new FormData();
      for (const [field, value] of Object.entries(text)) form.set(field, value);
      const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: '#00522a' } }).png().toBuffer();
      form.set('image', new Blob([png], { type: 'image/png' }), 'branch.png');
      const saved = await fetch(`${api(location)}/api/branches/${location}`, { method: 'PUT', headers: { cookie }, body: form });
      assert.equal(saved.status, 200);
      const branch = await saved.json();
      images.push(branch.imageUrl);
      assert.equal(branch.id, location);
      assert.equal(branch.title, text.title);
      assert.equal(branch.description, text.description);
      assert.equal(branch.location, text.location);
      const publicData = await (await fetch('http://localhost:5000/api/branches')).json();
      assert.deepEqual(publicData.find(item => item.id === location), branch);
      const imageResponse = await fetch(`http://localhost:5000${branch.imageUrl}`);
      assert.equal(imageResponse.status, 200);
      assert.match(imageResponse.headers.get('content-type'), /image\/webp/);
      const html = await (await fetch('http://localhost:3000/')).text();
      assert.ok(html.includes(text.title));
      assert.ok(html.includes(text.description));
      assert.ok(html.includes(text.location));
      assert.ok(html.includes(`href="/rooms/${location}"`));
      assert.ok(!html.includes('Kamar Pilihan Kami'));
      const dashboard = await fetch(`http://localhost:3000/admin${location === 'padang' ? 'Padang' : 'Painan'}`, { headers: { cookie } });
      assert.equal(dashboard.status, 200);
      assert.ok((await dashboard.text()).includes('Informasi Cabang Hotel'));
    }
    assert.equal((await fetch('http://localhost:5000/api/branches/painan', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 401);
  } finally {
    for (const [key, value] of Object.entries(backups)) {
      if (value === null) await db.Setting.destroy({ where: { key } });
      else await db.Setting.update({ value }, { where: { key } });
    }
    for (const image of images) await fs.unlink(path.join(__dirname, '../../public', image)).catch(() => {});
    await db.sequelize.close();
  }
});
