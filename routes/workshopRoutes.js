const express = require('express');
const router  = express.Router();
const wc = require('../controllers/workshopController');
const { requireAdmin, requireStudent } = require('../middleware/authMiddleware');

// ── Admin routes ──────────────────────────────────────
router.get('/admin/workshops',                     requireAdmin, wc.adminGetWorkshops);
router.get('/admin/workshops/create',              requireAdmin, wc.adminGetCreateWorkshop);
router.post('/admin/workshops/create',             requireAdmin, wc.adminPostCreateWorkshop);
router.get('/admin/workshops/:id',                 requireAdmin, wc.adminGetWorkshopDetail);
router.post('/admin/workshops/:id/material',       requireAdmin, wc.adminAddMaterial);
router.post('/admin/workshops/:id/delete',         requireAdmin, wc.adminDeleteWorkshop);
router.get('/admin/workshops/:id/submissions',     requireAdmin, wc.adminGetSubmissions);
router.post('/admin/submissions/:id/review',       requireAdmin, wc.adminReviewSubmission);
router.get('/admin/workshops/:id/download',        requireAdmin, wc.adminDownloadEnrollments);

// ── Student routes ────────────────────────────────────
router.get('/student/workshops',                   requireStudent, wc.studentGetWorkshops);
router.get('/student/workshops/:id',               requireStudent, wc.studentGetWorkshopRoom);
router.post('/student/workshops/:id/create-order', requireStudent, wc.createOrder);
router.post('/student/workshops/verify-payment',   requireStudent, wc.verifyPayment);
router.post('/student/workshops/:workshopId/tasks/:materialId/submit', requireStudent, wc.submitTask);

module.exports = router;
