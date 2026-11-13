const express = require('express');
const { body } = require('express-validator');
const {
  createPackage,
  getPackages,
  getMyPackages,
  getPackageById,
  cancelPackage,
  getPackageMatches,
} = require('../controllers/packageController');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// All package routes require authentication
router.use(auth);

// POST /api/packages — sender only
router.post(
  '/',
  checkRole('sender'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('from_location').trim().notEmpty().withMessage('From location is required'),
    body('to_location').trim().notEmpty().withMessage('To location is required'),
    body('preferred_date').isDate().withMessage('Valid preferred date is required'),
    body('weight').isFloat({ min: 0.01 }).withMessage('Weight must be a positive number'),
    body('budget').isFloat({ min: 0 }).withMessage('Budget must be a non-negative number'),
  ],
  createPackage
);

// GET /api/packages — sender sees own, admin sees all
router.get('/', checkRole('sender', 'admin'), getPackages);

// GET /api/packages/my — sender's packages
router.get('/my', checkRole('sender'), getMyPackages);

// GET /api/packages/:id — package detail
router.get('/:id', getPackageById);

// PUT /api/packages/:id/cancel — sender cancels (open/requested only)
router.put('/:id/cancel', checkRole('sender'), cancelPackage);

// GET /api/packages/:id/matches — matching journeys
router.get('/:id/matches', checkRole('sender', 'admin'), getPackageMatches);

module.exports = router;
