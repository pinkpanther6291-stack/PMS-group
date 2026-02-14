const nodemailer = require("nodemailer");
(async () => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: (process.env.SMTP_SECURE === "true"),
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    tls: { rejectUnauthorized: false }
  });
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: process.env.TEST_RECIPIENT || "recipient@example.com",
      subject: "SMTP Test",
      text: "SMTP test message"
    });
    console.log("Mail sent:", info && info.messageId ? info.messageId : info);
  } catch (err) {
    console.error("Send failed:", err);
  }
})();
