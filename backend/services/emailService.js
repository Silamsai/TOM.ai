const nodemailer = require('nodemailer');
const { OTP_VALIDITY_MINUTES } = require('../config/constants');

/** Reusable Gmail transporter */
const createTransporter = () =>
  nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

/** Shared email wrapper with retry logic */
const sendMail = async (mailOptions, retries = 2) => {
  const transporter = createTransporter();
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await transporter.sendMail(mailOptions);
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
};

// ---- HTML Templates -------------------------------------------------------

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

// ---- Exported Functions ---------------------------------------------------

/**
 * Sends an OTP email for email verification during signup.
 */
const sendOTPEmail = async (email, otp) => {
  await sendMail({
    from: `"TOM.AI" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: '🔐 TOM.AI - Email Verification OTP',
    html: otpEmailTemplate(
      otp,
      'Verify Your Email',
      'Use the one-time password below to verify your email address and complete your TOM.AI account setup.'
    ),
  });
};

/**
 * Sends a password reset OTP email.
 */
const sendPasswordResetEmail = async (email, otp) => {
  await sendMail({
    from: `"TOM.AI" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: '🔐 TOM.AI - Password Reset OTP',
    html: otpEmailTemplate(
      otp,
      'Reset Your Password',
      'You requested a password reset for your TOM.AI account. Use the OTP below to proceed.'
    ),
  });
};

/**
 * Sends a confirmation email after a successful password reset.
 */
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
    from: `"TOM.AI" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: '✅ TOM.AI - Password Reset Successful',
    html,
  });
};

/**
 * Sends a reminder email for a scheduled task.
 */
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
    from: `"TOM.AI" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `⏰ Reminder: ${task.taskName}`,
    html,
  });
};

module.exports = { sendOTPEmail, sendPasswordResetEmail, sendConfirmationEmail, sendTaskReminderEmail };
