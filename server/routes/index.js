/**
 * API root: every resource router mounted under /api.
 *
 * Full route list lives in README.md; this file is the single source of truth
 * for what is mounted where.
 */
const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const donationRoutes = require('./donationRoutes');
const claimRoutes = require('./claimRoutes');
const notificationRoutes = require('./notificationRoutes');
const feedbackRoutes = require('./feedbackRoutes');
const categoryRoutes = require('./categoryRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

/** Liveness probe used by the client on start-up and by deployment tooling. */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'community-food-portal-api',
      time: new Date().toISOString(),
      env: process.env.NODE_ENV || 'development',
    },
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/donations', donationRoutes);
router.use('/claims', claimRoutes);
router.use('/notifications', notificationRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/categories', categoryRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
