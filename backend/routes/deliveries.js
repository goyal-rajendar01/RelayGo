const express = require('express');
const { body } = require('express-validator');
const {
  createDeliveryRequest,
  getSentRequests,
  getReceivedRequests,
  acceptRequest,
  rejectRequest,
  cancelRequest,
} = require('../controllers/deliveryController');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

router.use(auth);

// POST /api/delivery-requests — sender creates a request
router.post(
  '/',
  checkRole('sender'),
  [
    body('packageId').isInt({ min: 1 }).withMessage('Valid packageId is required'),
    body('journeyId').isInt({ min: 1 }).withMessage('Valid journeyId is required'),
    body('agreedReward')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('agreedReward must be a non-negative number'),
  ],
  createDeliveryRequest
);

// GET /api/delivery-requests/sent — sender sees their outgoing requests
router.get('/sent', checkRole('sender'), getSentRequests);

// GET /api/delivery-requests/received — traveler sees incoming requests
router.get('/received', checkRole('traveler'), getReceivedRequests);

// PUT /api/delivery-requests/:id/accept — traveler accepts
router.put('/:id/accept', checkRole('traveler'), acceptRequest);

// PUT /api/delivery-requests/:id/reject — traveler rejects
router.put('/:id/reject', checkRole('traveler'), rejectRequest);

// PUT /api/delivery-requests/:id/cancel — sender cancels (pending only)
router.put('/:id/cancel', checkRole('sender'), cancelRequest);

module.exports = router;
