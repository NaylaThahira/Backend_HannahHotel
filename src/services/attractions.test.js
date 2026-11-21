const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../models');

test('tourist attractions preserve Painan data and enforce separate branch editing', async () => {
  db.sequelize.options.logging = false;
  const backups = {};
  const keys = { painan: 'tourist_attractions_json', padang: 'tourist_attractions_padang_json' };
  try {
    for (const key of Object.values(keys)) {
      const setting = await db.Setting.findOne({ where: { key } });
      backups[key] = setting ? setting.value : null;
    }
    for (const location of ['padang', 'painan']) {
      const api = `http://localhost:5000/${location}`;
      const login = await fetch(`${api}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: `admin${location}`, password: '12345' }) });
      assert.equal(login.status, 200);
      const cookie = login.headers.get('set-cookie').split(';')[0];
      const put = body => fetch(`${api}/api/settings`, { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const other = location === 'padang' ? 'painan' : 'padang';
      assert.equal((await put({ [keys[other]]: JSON.stringify(['Forbidden change']) })).status, 403);
      assert.equal((await put({ [keys[location]]: '{}' })).status, 400);
      assert.equal((await put({ [keys[location]]: JSON.stringify(['Duplicate', 'Duplicate']) })).status, 400);
      const name = `Wisata uji ${location}`;
      assert.equal((await put({ [keys[location]]: JSON.stringify([name]) })).status, 200);
      if (location === 'padang') {
        const unchanged = await db.Setting.findOne({ where: { key: keys.painan } });
        assert.equal(unchanged ? unchanged.value : null, backups[keys.painan]);
      }
      const publicSettings = await (await fetch('http://localhost:5000/api/settings')).json();
      assert.deepEqual(JSON.parse(publicSettings[keys[location]]), [name]);
      const html = await (await fetch('http://localhost:3000/')).text();
      assert.ok(html.includes(name));
      assert.ok(html.includes('Hannah Hotel <!-- -->Padang'));
      assert.ok(html.includes('Hannah Hotel <!-- -->Painan'));
      assert.equal((await put({ [keys[location]]: '[]' })).status, 200);
      const empty = await (await fetch('http://localhost:3000/')).text();
      assert.ok(!empty.includes(name));
      if (location === 'painan') assert.ok(!empty.includes('Pantai Carocok'));
    }
  } finally {
    for (const [key, value] of Object.entries(backups)) {
      if (value === null) await db.Setting.destroy({ where: { key } });
      else await db.Setting.update({ value }, { where: { key } });
    }
    await db.sequelize.close();
  }
});
