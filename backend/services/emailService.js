const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const { OTP_VALIDITY_MINUTES } = require('../config/constants');

// ---- Startup credential check -----------------------------------------------
console.log(`[EmailService] RESEND_API_KEY: ${process.env.RESEND_API_KEY ? 'SET ✅' : '⚠️ NOT SET — falling back to Gmail SMTP'}`);
console.log(`[EmailService] GMAIL_USER: ${process.env.GMAIL_USER || '⚠️ NOT SET'}`);
console.log(`[EmailService] GMAIL_PASS: ${process.env.GMAIL_PASS ? `SET (${process.env.GMAIL_PASS.length} chars) ✅` : '⚠️ NOT SET'}`);

// ---- Email sender -----------------------------------------------------------
/**
 * Sends an email using Resend API (preferred, HTTPS-based, works on all cloud hosts)
 * or falls back to Gmail SMTP if RESEND_API_KEY is not configured.
 */
const sendMail = async ({ from, to, subject, html }) => {
  // ── Primary: Resend API (works on Render, Vercel, Railway, etc.) ──
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM || 'TOM.AI <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
    if (error) {
      console.error('[EmailService] Resend error:', error);
      throw new Error(`Resend API error: ${error.message}`);
    }
    console.log(`[EmailService] ✅ Email sent via Resend to: ${to}`);
    return;
  }

  // ── Fallback: Gmail SMTP (works locally) ──
  console.warn('[EmailService] RESEND_API_KEY not set — using Gmail SMTP fallback');
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      await transporter.sendMail({ from, to, subject, html });
      console.log(`[EmailService] ✅ Email sent via Gmail SMTP to: ${to}`);
      return;
    } catch (err) {
      console.error(`[EmailService] Gmail SMTP attempt ${attempt + 1} failed:`, err.message);
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
};

// ---- HTML Templates ---------------------------------------------------------

const otpEmailTemplate = (otp, title, subtitle) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Arial, sans-serif; background: #0f0f1a; margin: 0; padding: 20px; }
    .container { max-width: 520px; margin: auto; background: #1a1a2e; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center; }
    .header h1 { color: #fff; margin: 0; font-size: 28px; letter-spacing: 1px; }
    .body { padding: 32px; color: #d1d5db; }
    .body p { line-height: 1.7; }
    .otp-box { background: #0f0f1a; border: 2px solid #6366f1; border-radius: 10px;
               text-align: center; padding: 20px; margin: 24px 0; }
    .otp { font-size: 42px; font-weight: 700; letter-spacing: 10px; color: #a78bfa; }
    .validity { font-size: 13px; color: #9ca3af; margin-top: 8px; }
    .footer { padding: 20px 32px; text-align: center; font-size: 12px; color: #4b5563; border-top: 1px solid #2d2d4a; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🤖 TOM.AI</h1></div>
    <div class="body">
      <h2 style="color:#e5e7eb;">${title}</h2>
      <p>${subtitle}</p>
      <div class="otp-box">
        <div class="otp">${otp}</div>
        <div class="validity">Valid for ${OTP_VALIDITY_MINUTES} minutes</div>
      </div>
      <p>If you did not request this, you can safely ignore this email.</p>
    </div>
    <div class="footer">© ${new Date().getFullYear()} TOM.AI · Do not reply to this email.</div>
  </div>
</body>
</html>
`;

// ---- Exported Functions -----------------------------------------------------

const sendOTPEmail = async (email, otp) => {
  await sendMail({
    from: `"TOM.AI" <${process.env.GMAIL_USER || 'noreply@tomai.com'}>`,
    to: email,
    subject: '🔐 TOM.AI - Email Verification OTP',
    html: otpEmailTemplate(
      otp,
      'Verify Your Email',
      'Use the one-time password below to verify your email address and complete your TOM.AI account setup.'
    ),
  });
};

const sendPasswordResetEmail = async (email, otp) => {
  await sendMail({
    from: `"TOM.AI" <${process.env.GMAIL_USER || 'noreply@tomai.com'}>`,
    to: email,
    subject: '🔐 TOM.AI - Password Reset OTP',
    html: otpEmailTemplate(
      otp,
      'Reset Your Password',
      'You requested a password reset for your TOM.AI account. Use the OTP below to proceed.'
    ),
  });
};

const sendConfirmationEmail = async (email) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: Arial, sans-serif; background: #0f0f1a; margin: 0; padding: 20px; }
      .container { max-width: 520px; margin: auto; background: #1a1a2e; border-radius: 12px; overflow: hidden; }
      .header { background: linear-gradient(135deg, #10b981, #059669); padding: 32px; text-align: center; }
      .header h1 { color: #fff; margin: 0; font-size: 28px; }
      .body { padding: 32px; color: #d1d5db; line-height: 1.7; }
      .footer { padding: 20px 32px; text-align: center; font-size: 12px; color: #4b5563; border-top: 1px solid #2d2d4a; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header"><h1>✅ TOM.AI</h1></div>
      <div class="body">
        <h2 style="color:#e5e7eb;">Password Reset Successful</h2>
        <p>Your TOM.AI account password has been successfully reset.</p>
        <p>If you did not perform this action, please contact support immediately.</p>
      </div>
      <div class="footer">© ${new Date().getFullYear()} TOM.AI</div>
    </div>
  </body>
  </html>`;

  await sendMail({
    from: `"TOM.AI" <${process.env.GMAIL_USER || 'noreply@tomai.com'}>`,
    to: email,
    subject: '✅ TOM.AI - Password Reset Successful',
    html,
  });
};

const sendTaskReminderEmail = async (email, task) => {
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: Arial, sans-serif; background: #0f0f1a; margin: 0; padding: 20px; }
      .container { max-width: 520px; margin: auto; background: #1a1a2e; border-radius: 12px; overflow: hidden; }
      .header { background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px; text-align: center; }
      .header h1 { color: #fff; margin: 0; font-size: 28px; }
      .body { padding: 32px; color: #d1d5db; line-height: 1.7; }
      .task-box { background: #0f0f1a; border: 2px solid #f59e0b; border-radius: 10px; padding: 20px; margin: 24px 0; }
      .task-title { font-size: 20px; font-weight: bold; color: #fbbf24; margin-bottom: 8px; }
      .task-desc { font-size: 14px; color: #9ca3af; }
      .footer { padding: 20px 32px; text-align: center; font-size: 12px; color: #4b5563; border-top: 1px solid #2d2d4a; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header"><h1>⏰ Task Reminder</h1></div>
      <div class="body">
        <h2 style="color:#e5e7eb;">It's time for your task!</h2>
        <p>This is a friendly reminder from TOM.AI for your scheduled task.</p>
        <div class="task-box">
          <div class="task-title">${task.taskName}</div>
          ${task.description ? `<div class="task-desc">${task.description}</div>` : ''}
        </div>
        <p>Head over to TOM.AI to mark it as complete!</p>
      </div>
      <div class="footer">© ${new Date().getFullYear()} TOM.AI</div>
    </div>
  </body>
  </html>`;

  await sendMail({
    from: `"TOM.AI" <${process.env.GMAIL_USER || 'noreply@tomai.com'}>`,
    to: email,
    subject: `⏰ Reminder: ${task.taskName}`,
    html,
  });
};

module.exports = { sendOTPEmail, sendPasswordResetEmail, sendConfirmationEmail, sendTaskReminderEmail };
