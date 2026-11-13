const express = require('express');
const {
  getStats,
  getUsers,
  toggleSuspend,
  getAdminPackages,
  getAdminJourneys,
  getAdminDeliveries,
  getTravelerVerifications,
  approveTraveler,
  rejectTraveler,
  getAdminReports,
  getAdminDisputes,
  resolveDispute,
  getAdminTransactions,
} = require('../controllers/adminController');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');

const router = express.Router();

// All admin routes require auth + admin role
router.use(auth, checkRole('admin'));

// GET  /api/admin/stats
router.get('/stats', getStats);

// GET  /api/admin/users
router.get('/users', getUsers);

// PUT  /api/admin/users/:id/suspend
router.put('/users/:id/suspend', toggleSuspend);

// GET  /api/admin/packages
router.get('/packages', getAdminPackages);

// GET  /api/admin/journeys
router.get('/journeys', getAdminJourneys);

// GET  /api/admin/deliveries
router.get('/deliveries', getAdminDeliveries);

// GET  /api/admin/traveler-verifications
router.get('/traveler-verifications', getTravelerVerifications);

// PUT  /api/admin/traveler-verifications/:id/approve
router.put('/traveler-verifications/:id/approve', approveTraveler);

// PUT  /api/admin/traveler-verifications/:id/reject
router.put('/traveler-verifications/:id/reject', rejectTraveler);

// GET  /api/admin/reports
router.get('/reports', getAdminReports);

// GET  /api/admin/disputes
router.get('/disputes', getAdminDisputes);

// PUT  /api/admin/disputes/:id/resolve
router.put('/disputes/:id/resolve', resolveDispute);

// GET  /api/admin/transactions
router.get('/transactions', getAdminTransactions);

module.exports = router;
