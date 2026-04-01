/**
 * APARAITECH TEST PORTAL - Main Server Entry Point
 * ================================================
 * Express.js server with EJS templating, MongoDB, Sessions & JWT
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const mongoose = require('mongoose');

// ── Import Routes ─────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');

// ── Initialize Express ────────────────────────────────
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// ── Database Connection ───────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// ── View Engine Setup ─────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Middleware ────────────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'aparaitech_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Render handles HTTPS at proxy level
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Flash messages
app.use(flash());

// ── Global template variables ─────────────────────────
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg   = req.flash('error_msg');
  res.locals.error       = req.flash('error');
  res.locals.user        = req.session.user || null;
  res.locals.companyName = process.env.COMPANY_NAME || 'APARAITECH';
  next();
});

// ── Routes ────────────────────────────────────────────
app.use('/', authRoutes);
app.use('/admin', adminRoutes);
app.use('/student', studentRoutes);

// ── 404 Handler ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found' });
});

// ── Global Error Handler ──────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).render('error', {
    title: 'Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong!'
  });
});

// ── Start Server ──────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 APARAITECH Test Portal running at http://localhost:${PORT}`);
  console.log(`📌 Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
