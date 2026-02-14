const nodemailer = require('nodemailer');
require('dotenv').config();
(async () => {
  try {
    const smtpConfigured = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
    console.log('SMTP config:', { host: process.env.EMAIL_HOST, port: process.env.EMAIL_PORT, user: process.env.EMAIL_USER ? 'set' : 'unset', pass: process.env.EMAIL_PASS ? 'set' : 'unset' });
    if (!smtpConfigured) return console.log('SMTP not configured in env');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT, 10) : 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' }
    });

    console.log('verifying transporter...');
    await transporter.verify();
    console.log('transporter verified');

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@pms.edu',
      to: 'ishu02315@gmail.com',
      subject: 'Test send script',
      text: 'Test from test_send.js',
    });

    console.log('send success:', info);
    const preview = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
    console.log('preview:', preview);
  } catch (err) {
    console.error('send failed:', err);
    if (err.response) console.error('response:', err.response);
  }
})();