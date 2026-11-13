const express = require('express');
const { body } = require('express-validator');
const {
  createJourney,
  getMyJourneys,
  getJourneyById,
  updateJourney,
  completeJourney,
} = require('../controllers/journeyController');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

router.use(auth);

// POST /api/journeys — traveler only
router.post(
  '/',
  checkRole('traveler'),
  [
    body('from_location').trim().notEmpty().withMessage('From location is required'),
    body('to_location').trim().notEmpty().withMessage('To location is required'),
    body('departure_date').isDate().withMessage('Valid departure date is required'),
    body('available_capacity').isFloat({ min: 0.01 }).withMessage('Capacity must be a positive number'),
    body('expected_reward').isFloat({ min: 0 }).withMessage('Expected reward must be non-negative'),
  ],
  createJourney
);

// GET /api/journeys/my — traveler's journeys
router.get('/my', checkRole('traveler'), getMyJourneys);

// GET /api/journeys/:id — journey detail (any authenticated user)
router.get('/:id', getJourneyById);

// PUT /api/journeys/:id — update journey (traveler only)
router.put('/:id', checkRole('traveler'), updateJourney);

// PUT /api/journeys/:id/complete — mark complete (traveler only)
router.put('/:id/complete', checkRole('traveler'), completeJourney);

module.exports = router;
