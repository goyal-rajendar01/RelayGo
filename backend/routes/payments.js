const express = require('express');
const { getMyTransactions, getTransactionByPackage } = require('../controllers/paymentController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// GET /api/payments/my — user's transactions (role-aware)
router.get('/my', getMyTransactions);

// GET /api/payments/package/:packageId — transaction for a specific package
router.get('/package/:packageId', getTransactionByPackage);

module.exports = router;
