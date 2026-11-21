const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../models');

test('facilities and packages support both branches, stored addresses, and ownership', async () => {
  db.sequelize.options.logging = false;
  const created = [];
  const backups = {};
  const cookies = {};
  const api = location => `http://localhost:5000/${location}`;
  const call = (location, endpoint, method = 'GET', body) => fetch(`${api(location)}/api/${endpoint}`, {
    method, headers: { cookie: cookies[location], 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined
  });
  try {
    for (const location of ['padang', 'painan']) {
      const response = await fetch(`${api(location)}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: `admin${location}`, password: '12345' }) });
      assert.equal(response.status, 200);
      cookies[location] = response.headers.get('set-cookie').split(';')[0];
      const key = `branch_info_${location}`;
      const setting = await db.Setting.findOne({ where: { key } });
      backups[key] = setting ? setting.value : null;
      const value = JSON.stringify({ id: location, title: `Hannah Hotel ${location}`, imageUrl: '', description: 'Branch info', location: `Alamat tersimpan uji ${location}` });
      const [entry] = await db.Setting.findOrCreate({ where: { key }, defaults: { value } });
      await entry.update({ value });
    }
    for (const location of ['padang', 'painan']) {
      const other = location === 'padang' ? 'painan' : 'padang';
      for (const [endpoint, model] of [['facilities', 'Facility'], ['packages', 'Package']]) {
        const data = { name: `Integration ${endpoint} ${location}`, description: `Description ${location}`, location, included: ['Lunch'], facilities: [] };
        assert.equal((await call(location, endpoint, 'POST', { ...data, location: other })).status, 403);
        const response = await call(location, endpoint, 'POST', data);
        assert.equal(response.status, 201);
        const item = await response.json();
        created.push({ model, id: item.id });
        assert.equal(item.location, location);
        const managed = await (await call(location, `${endpoint}/manage`)).json();
        assert.ok(managed.some(entry => entry.id === item.id));
        assert.ok(managed.every(entry => entry.location === location));
        for (const method of ['PUT', 'DELETE']) assert.equal((await call(other, `${endpoint}/${item.id}`, method, method === 'PUT' ? { ...data, location: other } : undefined)).status, 404);
        const updated = await call(location, `${endpoint}/${item.id}`, 'PUT', { ...data, description: 'Updated description' });
        assert.equal(updated.status, 200);
        const list = await (await fetch(`http://localhost:5000/api/${endpoint}?location=${location}`)).json();
        assert.ok(list.every(entry => entry.location === location));
        assert.ok(list.some(entry => entry.id === item.id && entry.description === 'Updated description'));
        const otherList = await (await fetch(`http://localhost:5000/api/${endpoint}?location=${other}`)).json();
        assert.ok(!otherList.some(entry => entry.id === item.id));
        const html = await (await fetch(`http://localhost:3000/${endpoint}?location=${location}`)).text();
        assert.ok(html.includes(data.name));
        assert.ok(!html.includes(`Alamat tersimpan uji ${location}`));
        assert.ok(html.includes('value="padang"'));
        assert.ok(html.includes('value="painan"'));
        const base = location === 'padang' ? '/adminPadang' : '/adminPainan';
        const dashboard = await fetch(`http://localhost:3000${base}/${endpoint}`, { headers: { cookie: cookies[location] }, redirect: 'manual' });
        assert.equal(dashboard.status, 200);
        if (endpoint === 'packages') {
          const detail = await (await fetch(`http://localhost:3000/packages/${item.id}`)).text();
          assert.ok(detail.includes(`Alamat tersimpan uji ${location}`));
        }
        assert.equal((await call(location, `${endpoint}/${item.id}`, 'DELETE')).status, 200);
      }
    }
  } finally {
    for (const { model, id } of created) await db[model].destroy({ where: { id } });
    for (const [key, value] of Object.entries(backups)) {
      if (value === null) await db.Setting.destroy({ where: { key } });
      else await db.Setting.update({ value }, { where: { key } });
    }
    await db.sequelize.close();
  }
});
