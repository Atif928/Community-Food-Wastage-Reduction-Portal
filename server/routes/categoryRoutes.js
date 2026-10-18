/**
 * Category routes: /api/categories/*
 *
 * Reading is open to any signed-in user (the listing form needs the list);
 * writing is admin only.
 */
const express = require('express');
const categoryController = require('../controllers/categoryController');
const { authenticate, requireRole, optionalAuthenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { categoryRules } = require('../validators/adminValidators');
const { idParamRules } = require('../validators/commonValidators');

const router = express.Router();

router.get('/', optionalAuthenticate, categoryController.list);

router.post('/', authenticate, requireRole('ADMIN'), categoryRules, validate, categoryController.create);
router.put('/:id', authenticate, requireRole('ADMIN'), idParamRules, categoryRules, validate, categoryController.update);
router.delete('/:id', authenticate, requireRole('ADMIN'), idParamRules, validate, categoryController.remove);

module.exports = router;
