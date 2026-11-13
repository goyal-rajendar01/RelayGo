const express = require('express');
const { body } = require('express-validator');
const { submitReport, getMyReports } = require('../controllers/reportController');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

// POST /api/reports — any authenticated user can report
router.post(
  '/',
  [
    body('reason').trim().notEmpty().withMessage('Reason is required'),
    body('reportedUserId').optional().isInt({ min: 1 }),
    body('packageId').optional().isInt({ min: 1 }),
    body('description').optional().isString(),
  ],
  submitReport
);

// GET /api/reports/my — user's submitted reports
router.get('/my', getMyReports);

module.exports = router;
