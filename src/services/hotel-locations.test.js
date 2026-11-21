// Integration checks: PostgreSQL, both API servers and the frontend must be running.
const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models');

test('hotel accounts, room ownership, public filters and admin routes', async () => {
  db.sequelize.options.logging = false;
  const created = [];
  try {
    const accounts = {};
    const cookies = {};
    for (const location of ['painan', 'padang']) {
      const account = await db.Admin.findOne({ where: { email: `admin@hannahhotel${location}.com` } });
      assert.ok(account, `Missing ${location} account`);
      assert.equal(account.location, location);
      accounts[location] = account;
      const token = jwt.sign({ id: account.id }, process.env.JWT_SECRET || 'fallback-jwt-secret-for-dev', { expiresIn: '5m' });
      cookies[location] = `token_${location}=${token}`;
    }
    for (const location of ['padang', 'painan']) {
      assert.equal(accounts[location].username, `admin${location}`);
      assert.ok(await bcrypt.compare('12345', accounts[location].password));
    }
    const api = location => `http://localhost:5000/${location}`;
    const call = (location, path, init = {}) => fetch(`${api(location)}${path}`, { ...init, headers: { cookie: cookies[location], 'content-type': 'application/json', ...init.headers } });

    for (const location of ['painan', 'padang']) {
      {
        const login = await call(location, '/api/auth/login', { method: 'POST', body: JSON.stringify({ username: accounts[location].username, password: '12345' }) });
        assert.equal(login.status, 200);
        assert.match(login.headers.get('set-cookie'), new RegExp(`token_${location}=`));
        const other = location === 'padang' ? 'painan' : 'padang';
        const wrong = await call(location, '/api/auth/login', { method: 'POST', body: JSON.stringify({ username: accounts[other].username, password: '12345' }) });
        assert.equal(wrong.status, 403);
      }
      const response = await call(location, '/api/rooms', { method: 'POST', body: JSON.stringify({ name: `Location integration ${location}`, price: 'Rp100.000', description: 'Temporary integration room', facilities: '[]', location: location === 'padang' ? 'painan' : 'padang' }) });
      assert.equal(response.status, 201);
      const room = await response.json();
      created.push(room);
      assert.equal(room.location, location, 'Ownership must ignore client-supplied location');
      assert.equal(room.createdByAdminId, accounts[location].id);
      const managed = await (await call(location, '/api/rooms/manage')).json();
      assert.ok(managed.every(item => item.location === location));
      const updated = await call(location, `/api/rooms/${room.id}`, { method: 'PUT', body: JSON.stringify({ name: room.name + ' updated', price: room.price, description: room.description }) });
      assert.equal(updated.status, 200);
      const other = location === 'padang' ? 'painan' : 'padang';
      for (const method of ['PUT', 'DELETE']) {
        const denied = await call(other, `/api/rooms/${room.id}`, { method, body: method === 'PUT' ? JSON.stringify({ name: 'must not change' }) : undefined });
        assert.equal(denied.status, 404);
      }
      const publicRooms = await (await fetch(`http://localhost:5000/api/rooms?location=${location}`)).json();
      assert.ok(publicRooms.every(item => item.location === location));
      assert.ok(publicRooms.some(item => item.id === room.id));
      const base = `/admin${location === 'padang' ? 'Padang' : 'Painan'}`;
      const panel = await fetch(`http://localhost:3000${base}/rooms`, { headers: { cookie: cookies[location] } });
      assert.equal(panel.status, 200);
      assert.ok((await panel.text()).includes(`Manajemen Kamar <!-- -->${location === 'padang' ? 'Padang' : 'Painan'}`));
      const anonymous = await fetch(`http://localhost:3000${base}`, { redirect: 'manual' });
      assert.equal(anonymous.status, 307);
      assert.ok(anonymous.headers.get('location').endsWith(`/admin`));
      const listing = await fetch(`http://localhost:3000/rooms/${location}`);
      assert.equal(listing.status, 200);
      assert.ok((await listing.text()).includes(room.name));
    }
    assert.equal((await fetch('http://localhost:5000/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })).status, 401);
    assert.equal((await call('padang', '/api/settings', { method: 'PUT', body: JSON.stringify({ footer_about: 'must not change' }) })).status, 403);
    assert.equal((await fetch('http://localhost:5000/api/rooms/manage', { headers: { cookie: cookies.padang } })).status, 401);
    const legacy = await fetch('http://localhost:3000/admin', { redirect: 'manual' });
    assert.equal(legacy.status, 200);
    const html = await legacy.text();
    assert.ok(html.includes('Masukkan username'));
    assert.ok(!html.includes('Pilih lokasi admin'));
    for (const path of ['/admin/login', '/adminPadang/login', '/adminPainan/login']) {
      const oldLogin = await fetch(`http://localhost:3000${path}`, { redirect: 'manual' });
      assert.equal(oldLogin.status, 307);
      assert.ok(oldLogin.headers.get('location').endsWith('/admin'));
    }
    for (const room of created) assert.equal((await call(room.location, `/api/rooms/${room.id}`, { method: 'DELETE' })).status, 200);
  } finally {
    for (const room of created) await db.Room.destroy({ where: { id: room.id } });
    await db.sequelize.close();
  }
});
