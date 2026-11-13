const express = require('express');
const { body } = require('express-validator');
const { submitRating, getTravelerRatings } = require('../controllers/ratingController');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

router.use(auth);

// POST /api/ratings — sender submits rating
router.post(
  '/',
  checkRole('sender'),
  [
    body('packageId').isInt({ min: 1 }).withMessage('Valid packageId is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().isString(),
  ],
  submitRating
);

// GET /api/ratings/traveler/:travelerId — public traveler ratings
router.get('/traveler/:travelerId', getTravelerRatings);

module.exports = router;
