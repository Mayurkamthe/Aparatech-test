/**
 * Email Service
 * =============
 * Handles all email communication using Nodemailer SMTP.
 * - OTP emails for login
 * - Result emails after test submission
 */

const nodemailer = require('nodemailer');

// ── SMTP Transporter Setup ────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    rejectUnauthorized: false // Allow self-signed certs in dev
  }
});

// ── Company branding constants ────────────────────────
const COMPANY = {
  name:    process.env.COMPANY_NAME    || 'APARAITECH',
  email:   process.env.COMPANY_EMAIL   || 'info@aparaitechsoftware.org',
  reg:     process.env.COMPANY_REG     || '2431000320445474',
  address: process.env.COMPANY_ADDRESS || 'Baramati, Maharashtra 413102'
};

// ── Email Header HTML (reusable) ──────────────────────
const getEmailHeader = () => `
  <div style="background: linear-gradient(135deg, #0d47a1, #1565c0); padding: 30px 40px; text-align:center; border-radius: 10px 10px 0 0;">
    <h1 style="color:#fff; margin:0; font-family:'Segoe UI',Arial,sans-serif; font-size:28px; letter-spacing:2px;">
      ${COMPANY.name}
    </h1>
    <p style="color:#90caf9; margin:5px 0 0; font-size:13px; font-family:Arial,sans-serif;">
      Online Test Portal
    </p>
  </div>
`;

// ── Email Footer HTML (reusable) ──────────────────────
const getEmailFooter = () => `
  <div style="background:#f5f5f5; padding:20px 40px; text-align:center; border-radius:0 0 10px 10px; border-top:1px solid #e0e0e0;">
    <p style="margin:0; font-size:12px; color:#757575; font-family:Arial,sans-serif;">
      ${COMPANY.name} | Reg No: ${COMPANY.reg}<br>
      ${COMPANY.address}<br>
      <a href="mailto:${COMPANY.email}" style="color:#1565c0;">${COMPANY.email}</a>
    </p>
    <p style="margin:10px 0 0; font-size:11px; color:#9e9e9e; font-family:Arial,sans-serif;">
      This is an automated email. Please do not reply to this message.
    </p>
  </div>
`;

// ─────────────────────────────────────────────────────
// SEND OTP EMAIL
// ─────────────────────────────────────────────────────
/**
 * @param {string} toEmail - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} name - User name (optional)
 */
async function sendOTPEmail(toEmail, otp, name = '') {
  const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || 10;
  const greeting = name ? `Hello, <strong>${name}</strong>!` : 'Hello!';

  const mailOptions = {
    from: `"${COMPANY.name} Test Portal" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: `🔐 Your Login OTP - ${COMPANY.name} Test Portal`,
    html: `
      <div style="max-width:560px; margin:0 auto; font-family:'Segoe UI',Arial,sans-serif; border:1px solid #e0e0e0; border-radius:10px; overflow:hidden;">
        ${getEmailHeader()}
        <div style="padding:40px; background:#fff;">
          <p style="font-size:16px; color:#333; margin-top:0;">${greeting}</p>
          <p style="font-size:15px; color:#555;">
            You requested to log in to the <strong>${COMPANY.name} Test Portal</strong>.
            Use the OTP below to verify your identity:
          </p>
          
          <div style="text-align:center; margin:30px 0;">
            <div style="display:inline-block; background:linear-gradient(135deg,#0d47a1,#1565c0); 
                        border-radius:12px; padding:20px 40px;">
              <span style="font-size:42px; font-weight:bold; color:#fff; 
                           letter-spacing:10px; font-family:'Courier New',monospace;">
                ${otp}
              </span>
            </div>
          </div>
          
          <div style="background:#fff3e0; border-left:4px solid #ff9800; padding:15px 20px; border-radius:4px; margin:20px 0;">
            <p style="margin:0; font-size:13px; color:#e65100;">
              ⏰ <strong>This OTP expires in ${expiryMinutes} minutes.</strong><br>
              🔒 Do not share this OTP with anyone. ${COMPANY.name} will never ask for your OTP.
            </p>
          </div>
          
          <p style="font-size:13px; color:#9e9e9e;">
            If you did not request this OTP, please ignore this email. 
            Your account is safe.
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${toEmail}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send OTP email to ${toEmail}:`, err.message);
    throw new Error('Failed to send OTP email. Please try again.');
  }
}

// ─────────────────────────────────────────────────────
// SEND RESULT EMAIL
// ─────────────────────────────────────────────────────
/**
 * @param {Object} result - Result document from MongoDB
 */
async function sendResultEmail(result) {
  const {
    studentEmail, studentName, testTitle, testDomain,
    score, totalMarks, percentage, isPassed,
    correctCount, incorrectCount, unattempted
  } = result;

  const statusColor  = isPassed ? '#2e7d32' : '#c62828';
  const statusBg     = isPassed ? '#e8f5e9' : '#ffebee';
  const statusText   = isPassed ? '✅ PASSED' : '❌ FAILED';
  const percentBar   = Math.round(percentage);

  const mailOptions = {
    from: `"${COMPANY.name} Test Portal" <${process.env.SMTP_USER}>`,
    to: studentEmail,
    subject: `📊 Test Result: ${testTitle} — ${COMPANY.name}`,
    html: `
      <div style="max-width:600px; margin:0 auto; font-family:'Segoe UI',Arial,sans-serif; border:1px solid #e0e0e0; border-radius:10px; overflow:hidden;">
        ${getEmailHeader()}
        <div style="padding:40px; background:#fff;">
          <h2 style="color:#0d47a1; margin-top:0; font-size:20px;">Test Result Summary</h2>
          
          <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
            <tr><td style="padding:8px; color:#555; font-size:14px; border-bottom:1px solid #f0f0f0;"><strong>Student Name</strong></td>
                <td style="padding:8px; color:#333; font-size:14px; border-bottom:1px solid #f0f0f0;">${studentName || 'N/A'}</td></tr>
            <tr><td style="padding:8px; color:#555; font-size:14px; border-bottom:1px solid #f0f0f0;"><strong>Email</strong></td>
                <td style="padding:8px; color:#333; font-size:14px; border-bottom:1px solid #f0f0f0;">${studentEmail}</td></tr>
            <tr><td style="padding:8px; color:#555; font-size:14px; border-bottom:1px solid #f0f0f0;"><strong>Test</strong></td>
                <td style="padding:8px; color:#333; font-size:14px; border-bottom:1px solid #f0f0f0;">${testTitle}</td></tr>
            <tr><td style="padding:8px; color:#555; font-size:14px;"><strong>Domain</strong></td>
                <td style="padding:8px; color:#333; font-size:14px;">${testDomain}</td></tr>
          </table>
          
          <!-- Score Box -->
          <div style="background:${statusBg}; border:2px solid ${statusColor}; border-radius:12px; padding:25px; text-align:center; margin:20px 0;">
            <div style="font-size:48px; font-weight:bold; color:${statusColor};">${score} / ${totalMarks}</div>
            <div style="font-size:18px; color:${statusColor}; margin:5px 0;">${percentage.toFixed(1)}%</div>
            <div style="font-size:20px; font-weight:bold; color:${statusColor}; margin-top:10px;">${statusText}</div>
          </div>

          <!-- Progress Bar -->
          <div style="background:#e0e0e0; border-radius:50px; overflow:hidden; margin:15px 0;">
            <div style="width:${percentBar}%; background:linear-gradient(90deg,#1565c0,#42a5f5); 
                        height:12px; border-radius:50px; transition:width 0.5s;"></div>
          </div>
          
          <!-- Stats Grid -->
          <table style="width:100%; border-collapse:collapse; margin:20px 0;">
            <tr>
              <td style="text-align:center; padding:15px; background:#e8f5e9; border-radius:8px; margin:5px;">
                <div style="font-size:24px; font-weight:bold; color:#2e7d32;">${correctCount}</div>
                <div style="font-size:12px; color:#555; margin-top:4px;">✅ Correct</div>
              </td>
              <td style="width:10px;"></td>
              <td style="text-align:center; padding:15px; background:#ffebee; border-radius:8px;">
                <div style="font-size:24px; font-weight:bold; color:#c62828;">${incorrectCount}</div>
                <div style="font-size:12px; color:#555; margin-top:4px;">❌ Incorrect</div>
              </td>
              <td style="width:10px;"></td>
              <td style="text-align:center; padding:15px; background:#fff8e1; border-radius:8px;">
                <div style="font-size:24px; font-weight:bold; color:#f57f17;">${unattempted}</div>
                <div style="font-size:12px; color:#555; margin-top:4px;">⬜ Skipped</div>
              </td>
            </tr>
          </table>

          <p style="font-size:13px; color:#9e9e9e; margin-top:20px;">
            Your detailed PDF report has been generated. Please log in to the portal to download it.
          </p>
        </div>
        ${getEmailFooter()}
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Result email sent to ${studentEmail}: ${info.messageId}`);
    return { success: true };
  } catch (err) {
    console.error(`❌ Failed to send result email to ${studentEmail}:`, err.message);
    // Don't throw — result email failure shouldn't break the flow
    return { success: false, error: err.message };
  }
}

module.exports = { sendOTPEmail, sendResultEmail };
