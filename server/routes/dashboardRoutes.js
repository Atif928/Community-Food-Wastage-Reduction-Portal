/**
 * Dashboard routes: /api/dashboard/*
 * Each endpoint is guarded by the role that owns that dashboard.
 */
const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/donor', requireRole('DONOR'), dashboardController.donorDashboard);
router.get('/recipient', requireRole('RECIPIENT'), dashboardController.recipientDashboard);

module.exports = router;
