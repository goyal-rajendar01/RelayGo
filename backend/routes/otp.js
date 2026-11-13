const express = require('express');
const { getPickupOTP, getDeliveryOTP, verifyPickup, verifyDelivery } = require('../controllers/otpController');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

router.use(auth);

// GET /api/otp/pickup/:packageId — sender gets pickup OTP
router.get('/pickup/:packageId', checkRole('sender'), getPickupOTP);

// GET /api/otp/delivery/:packageId — sender gets delivery OTP
router.get('/delivery/:packageId', checkRole('sender'), getDeliveryOTP);

// POST /api/otp/verify-pickup — traveler confirms pickup
router.post('/verify-pickup', checkRole('traveler'), verifyPickup);

// POST /api/otp/verify-delivery — traveler or sender confirms delivery
router.post('/verify-delivery', checkRole('sender', 'traveler'), verifyDelivery);

module.exports = router;
