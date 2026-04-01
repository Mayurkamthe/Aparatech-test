/**
 * Auth Routes
 * ===========
 * Handles login, OTP flow, logout.
 */

const express = require('express');
const router  = express.Router();
const authController = require('../controllers/authController');
const { redirectIfLoggedIn } = require('../middleware/authMiddleware');

// ── Root redirect ─────────────────────────────────────
router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard');
  }
  res.redirect('/login');
});

// ── Login page ────────────────────────────────────────
router.get('/login', redirectIfLoggedIn, authController.getLogin);

// ── Student OTP flow ──────────────────────────────────
router.post('/login/send-otp',    redirectIfLoggedIn, authController.sendOTP);
router.get('/login/verify-otp',   authController.getVerifyOTP);
router.post('/login/verify-otp',  authController.verifyOTP);

// ── Admin login ───────────────────────────────────────
router.post('/admin/login', redirectIfLoggedIn, authController.adminLogin);

// ── Logout ────────────────────────────────────────────
router.get('/logout', authController.logout);

module.exports = router;
