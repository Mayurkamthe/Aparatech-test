/**
 * Auth Controller
 * ===============
 * Handles OTP-based login for students.
 * Admin uses hardcoded credentials from .env.
 */

const User     = require('../models/User');
const OtpStore = require('../models/OtpStore');
const { sendOTPEmail } = require('../services/emailService');
const { generateOTP }  = require('../utils/codeGenerator');

// OTP expiry in minutes
const OTP_EXPIRY = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;

// ── GET /login ────────────────────────────────────────
exports.getLogin = (req, res) => {
  res.render('login', { title: 'Login — APARAITECH Test Portal' });
};

// ── POST /login/send-otp ──────────────────────────────
exports.sendOTP = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      req.flash('error_msg', 'Please enter a valid email address.');
      return res.redirect('/login');
    }

    // ── Admin shortcut: check hardcoded admin email from .env ──
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (email === adminEmail) {
      req.flash('error_msg', 'Admin: please use the Admin Login tab with your credentials.');
      return res.redirect('/login');
    }

    // ── Generate OTP ──────────────────────────────────
    const otp    = generateOTP();
    const expiry = new Date(Date.now() + OTP_EXPIRY * 60 * 1000);

    // Upsert OTP in database (replace any existing OTP for this email)
    await OtpStore.findOneAndUpdate(
      { email },
      { otp, expiry, attempts: 0 },
      { upsert: true, new: true }
    );

    // ── Create student user if not exists ─────────────
    await User.findOneAndUpdate(
      { email },
      { email, role: 'student' },
      { upsert: true, new: true }
    );

    // ── Send OTP email ────────────────────────────────
    await sendOTPEmail(email, otp);

    // Store email in session temporarily for OTP verify step
    req.session.pendingEmail = email;

    req.flash('success_msg', `OTP sent to ${email}. Check your inbox.`);
    res.redirect('/login/verify-otp');

  } catch (err) {
    console.error('Send OTP error:', err.message);
    req.flash('error_msg', err.message || 'Failed to send OTP. Please try again.');
    res.redirect('/login');
  }
};

// ── GET /login/verify-otp ─────────────────────────────
exports.getVerifyOTP = (req, res) => {
  if (!req.session.pendingEmail) {
    req.flash('error_msg', 'Session expired. Please start again.');
    return res.redirect('/login');
  }
  res.render('verify-otp', {
    title: 'Verify OTP — APARAITECH',
    email: req.session.pendingEmail
  });
};

// ── POST /login/verify-otp ────────────────────────────
exports.verifyOTP = async (req, res) => {
  try {
    const email       = req.session.pendingEmail;
    const enteredOTP  = req.body.otp?.trim();

    if (!email) {
      req.flash('error_msg', 'Session expired. Please start again.');
      return res.redirect('/login');
    }

    if (!enteredOTP || enteredOTP.length !== 6) {
      req.flash('error_msg', 'Please enter a valid 6-digit OTP.');
      return res.redirect('/login/verify-otp');
    }

    // Fetch OTP record
    const otpRecord = await OtpStore.findOne({ email });

    if (!otpRecord) {
      req.flash('error_msg', 'OTP not found or expired. Please request a new one.');
      return res.redirect('/login');
    }

    // Check expiry
    if (new Date() > otpRecord.expiry) {
      await OtpStore.deleteOne({ email });
      req.flash('error_msg', 'OTP has expired. Please request a new one.');
      return res.redirect('/login');
    }

    // Too many attempts (max 5)
    if (otpRecord.attempts >= 5) {
      await OtpStore.deleteOne({ email });
      req.flash('error_msg', 'Too many failed attempts. Please request a new OTP.');
      return res.redirect('/login');
    }

    // Verify OTP match
    if (otpRecord.otp !== enteredOTP) {
      await OtpStore.findOneAndUpdate({ email }, { $inc: { attempts: 1 } });
      req.flash('error_msg', `Invalid OTP. ${4 - otpRecord.attempts} attempts remaining.`);
      return res.redirect('/login/verify-otp');
    }

    // ── Success: Clean up OTP, create session ─────────
    await OtpStore.deleteOne({ email });
    const user = await User.findOne({ email });

    req.session.pendingEmail = null;
    req.session.user = {
      _id:   user._id.toString(),
      email: user.email,
      name:  user.name || '',
      role:  user.role
    };

    req.flash('success_msg', `Welcome back, ${user.name || user.email}!`);
    res.redirect('/student/dashboard');

  } catch (err) {
    console.error('Verify OTP error:', err.message);
    req.flash('error_msg', 'OTP verification failed. Please try again.');
    res.redirect('/login/verify-otp');
  }
};

// ── POST /admin/login ─────────────────────────────────
exports.adminLogin = async (req, res) => {
  try {
    const email    = req.body.email?.toLowerCase().trim();
    const password = req.body.password?.trim();

    const adminEmail    = process.env.ADMIN_EMAIL?.toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (email !== adminEmail || password !== adminPassword) {
      req.flash('error_msg', 'Invalid admin credentials.');
      return res.redirect('/login');
    }

    // Upsert admin user in DB
    const admin = await User.findOneAndUpdate(
      { email },
      { email, role: 'admin', name: 'Administrator' },
      { upsert: true, new: true }
    );

    req.session.user = {
      _id:   admin._id.toString(),
      email: admin.email,
      name:  admin.name,
      role:  'admin'
    };

    req.flash('success_msg', 'Welcome, Admin!');
    res.redirect('/admin/dashboard');

  } catch (err) {
    console.error('Admin login error:', err.message);
    req.flash('error_msg', 'Login failed. Please try again.');
    res.redirect('/login');
  }
};

// ── GET /logout ───────────────────────────────────────
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
};
