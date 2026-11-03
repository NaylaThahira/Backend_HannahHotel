const nodemailer = require('nodemailer');

const RECIPIENT = 'hannahotelsyariah@gmail.com';
const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

function buildContactMessage(settings, values) {
  let fields = [
    { id: 'full-name', label: settings.contact_name_label || 'Nama Lengkap', type: 'text', required: true },
    { id: 'email', label: settings.contact_email_label || 'Email', type: 'email', required: true },
    { id: 'phone', label: settings.contact_phone_label || 'Nomor HP / WhatsApp', type: 'tel', required: true },
    { id: 'message', label: settings.contact_message_label || 'Pesan Anda', type: 'textarea', required: true },
  ];
  if (settings.contact_fields_json) fields = JSON.parse(settings.contact_fields_json);
  if (!Array.isArray(fields) || fields.length > 5 || !fields.some(field => field.type === 'email')) {
    throw new Error('Formulir harus memiliki field email. Hubungi hotel melalui nomor telepon.');
  }
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new Error('Isian formulir tidak valid.');
  let replyTo;
  const lines = fields.map(field => {
    const raw = values[field.id];
    if (raw !== undefined && typeof raw !== 'string') throw new Error('Isian formulir tidak valid.');
    const value = (raw || '').trim();
    if ((field.required || field.type === 'email') && !value) throw new Error(`Lengkapi ${field.label}.`);
    if (value.length > 5000) throw new Error('Maksimal 5000 karakter per field.');
    if (field.type === 'email') {
      if (value.length > 254 || !emailPattern.test(value)) throw new Error('Alamat email tidak valid.');
      if (!replyTo) replyTo = value;
    }
    return `${field.label}:\n${value || '-'}`;
  });
  return { to: RECIPIENT, replyTo, subject: 'Pesan baru dari formulir Hannah Hotel', text: `Email pengunjung: ${replyTo}\n\n${lines.join('\n\n')}` };
}

async function sendContactMail(message) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    const error = new Error('Email service is not configured');
    error.code = 'MAIL_NOT_CONFIGURED';
    throw error;
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    requireTLS: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 20000,
  });
  const result = await transport.sendMail({ ...message, from: { name: 'Website Hannah Hotel', address: process.env.SMTP_USER } });
  if (!result.accepted || !result.accepted.length) throw new Error('Email was not accepted');
}

module.exports = { buildContactMessage, sendContactMail };
