const express = require('express');
const router  = express.Router();
const wc = require('../controllers/workshopController');
const ac = require('../controllers/attendanceController');
const { requireAdmin, requireStudent } = require('../middleware/authMiddleware');

// ── Admin workshop routes ──────────────────────────────────────
router.get('/admin/workshops',                     requireAdmin, wc.adminGetWorkshops);
router.get('/admin/workshops/create',              requireAdmin, wc.adminGetCreateWorkshop);
router.post('/admin/workshops/create',             requireAdmin, wc.adminPostCreateWorkshop);
router.get('/admin/workshops/:id/submissions',     requireAdmin, wc.adminGetSubmissions);
router.get('/admin/workshops/:id/download',        requireAdmin, wc.adminDownloadEnrollments);
router.post('/admin/workshops/:id/material',       requireAdmin, wc.adminAddMaterial);
router.post('/admin/workshops/:id/delete',         requireAdmin, wc.adminDeleteWorkshop);
router.post('/admin/submissions/:id/review',       requireAdmin, wc.adminReviewSubmission);

// ── Admin attendance routes ────────────────────────────────────
router.get('/admin/workshops/:id/attendance',             requireAdmin, ac.adminGetAttendance);
router.post('/admin/workshops/:id/attendance/create',     requireAdmin, ac.adminCreateSession);
router.post('/admin/attendance/:sessionId/open',          requireAdmin, ac.adminOpenSession);
router.post('/admin/attendance/:sessionId/close',         requireAdmin, ac.adminCloseSession);
router.get('/admin/attendance/:sessionId/report',         requireAdmin, ac.adminSessionReport);
router.get('/admin/attendance/:sessionId/download',       requireAdmin, ac.adminDownloadAttendance);

// ── Admin wildcard (must be after specific routes) ─────────────
router.get('/admin/workshops/:id',                 requireAdmin, wc.adminGetWorkshopDetail);

// ── Student routes (specific before :id) ──────────────────────
router.get('/student/workshops',                   requireStudent, wc.studentGetWorkshops);
router.post('/student/workshops/verify-payment',   requireStudent, wc.verifyPayment);   // MUST be before /:id
router.get('/student/workshops/:id/receipt',       requireStudent, wc.downloadReceipt);
router.post('/student/workshops/:id/create-order', requireStudent, wc.createOrder);
router.get('/student/workshops/:id',               requireStudent, wc.studentGetWorkshopRoom);

// ── Student task + attendance ──────────────────────────────────
router.post('/student/workshops/:workshopId/tasks/:materialId/submit', requireStudent, wc.submitTask);
router.post('/student/workshops/:workshopId/attendance/mark',          requireStudent, ac.studentMarkAttendance);

module.exports = router;
