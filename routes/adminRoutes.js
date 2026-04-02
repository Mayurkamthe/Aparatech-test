/**
 * Admin Routes
 * ============
 */

const express = require('express');
const router  = express.Router();
const adminController   = require('../controllers/adminController');
const studentController = require('../controllers/studentController');
const { requireAdmin } = require('../middleware/authMiddleware');

// All admin routes require admin session
router.use(requireAdmin);

// ── Dashboard ─────────────────────────────────────────
router.get('/dashboard', adminController.getDashboard);

// ── Tests ─────────────────────────────────────────────
router.get('/tests',             adminController.getTests);
router.get('/tests/create',      adminController.getCreateTest);
router.post('/tests/create',     adminController.postCreateTest);
router.get('/tests/:id/toggle',  adminController.toggleTestStatus);
router.post('/tests/:id/delete', adminController.deleteTest);

// ── Questions ─────────────────────────────────────────
router.get('/tests/:id/questions',  adminController.getAddQuestions);
router.post('/tests/:id/questions', adminController.postAddQuestion);
router.post('/questions/:id/delete', adminController.deleteQuestion);

// ── Results ───────────────────────────────────────────
router.get('/results',         adminController.getAllResults);
router.get('/results/:id',     adminController.getResultDetail);
router.get('/results/:id/pdf', studentController.adminDownloadPDF);

router.get("/users", adminController.getUsers);
router.post("/users/:id/delete", adminController.deleteUser);

module.exports = router;

// ── Users ─────────────────────────────────────────────
