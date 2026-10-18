/**
 * Notification routes: /api/notifications/*
 */
const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { idParamRules } = require('../validators/commonValidators');

const router = express.Router();

router.use(authenticate);

router.get('/', notificationController.list);

// Polled every VITE_NOTIFICATION_POLL_MS by the navbar badge.
router.get('/unread-count', notificationController.unreadCount);

router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', idParamRules, validate, notificationController.markRead);
router.delete('/:id', idParamRules, validate, notificationController.remove);

module.exports = router;
