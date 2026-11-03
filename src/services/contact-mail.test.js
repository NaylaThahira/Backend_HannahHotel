const test = require('node:test');
const assert = require('node:assert/strict');
const { buildContactMessage, sendContactMail } = require('./contact-mail');

test('fixed hotel recipient and visitor reply-to with all default fields', () => {
  const message = buildContactMessage({}, { 'full-name': 'Tamu', email: 'tamu@example.com', phone: '08123456789', message: 'Tanya kamar' });
  assert.equal(message.to, 'hannahotelsyariah@gmail.com');
  assert.equal(message.replyTo, 'tamu@example.com');
  assert.match(message.text, /Tanya kamar/);
  assert.equal(message.from, undefined);
});
const settings = { contact_fields_json: JSON.stringify([{ id: 'custom-email', label: 'Email tamu', type: 'email', required: false }, { id: 'question', label: 'Pertanyaan', type: 'textarea', required: true }]) };
test('custom fields are rendered and email is required even if configured optional', () => {
  assert.throws(() => buildContactMessage(settings, { question: 'Halo' }));
  const message = buildContactMessage(settings, { 'custom-email': 'tamu@example.com', question: 'Halo', to: 'other@example.com' });
  assert.equal(message.to, 'hannahotelsyariah@gmail.com');
  assert.match(message.text, /Pertanyaan:\nHalo/);
});
test('invalid email, header injection, missing fields and oversized values are rejected', () => {
  for (const email of ['invalid', 'a@example.com\r\nBcc: b@example.com']) {
    assert.throws(() => buildContactMessage(settings, { 'custom-email': email, question: 'Halo' }));
  }
  assert.throws(() => buildContactMessage(settings, { 'custom-email': 'a@example.com' }));
  assert.throws(() => buildContactMessage(settings, { 'custom-email': 'a@example.com', question: 'a'.repeat(5001) }));
});
test('missing SMTP configuration fails without claiming delivery', async () => {
  const saved = process.env.SMTP_PASS;
  delete process.env.SMTP_PASS;
  try {
    await assert.rejects(sendContactMail({}), { code: 'MAIL_NOT_CONFIGURED' });
  } finally {
    if (saved !== undefined) process.env.SMTP_PASS = saved;
  }
});
