const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const {
  createPackage,
  getPackages,
  getPackageById,
  cancelPackage,
  getPackageMatches,
} = require('../controllers/packageController');
const {
  createDeliveryRequest,
  getSentRequests,
  cancelRequest,
} = require('../controllers/deliveryController');

const router = express.Router();

router.use(auth, checkRole('sender'));

const { releasePayment } = require('../services/paymentService');

/**
 * GET /api/sender/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const senderId = req.user.id;
    const [[stats]] = await pool.query(
      `SELECT
         COUNT(*) AS "totalPackages",
         SUM(CASE WHEN status IN ('accepted', 'in_transit', 'delivered_pending_confirmation') THEN 1 ELSE 0 END) AS "activePackages",
         SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS "deliveredPackages",
         COALESCE(SUM(budget), 0) AS "totalSpent"
       FROM packages
       WHERE sender_id = ?`,
      [senderId]
    );

    return res.status(200).json({
      success: true,
      data: {
        totalPackages: Number(stats.totalPackages || 0),
        activePackages: Number(stats.activePackages || 0),
        deliveredPackages: Number(stats.deliveredPackages || 0),
        totalSpent: Number(stats.totalSpent || 0),
      },
    });
  } catch (err) {
    console.error('sender stats error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch sender stats' });
  }
});

const { getPickupOTP, getDeliveryOTP } = require('../controllers/otpController');

// Packages
router.get('/packages', getPackages);
router.post('/packages', createPackage);
router.get('/packages/:id', getPackageById);
router.put('/packages/:id/cancel', cancelPackage);
router.get('/packages/:id/matching-journeys', getPackageMatches);
router.get('/packages/:packageId/pickup-otp', getPickupOTP);
router.get('/packages/:packageId/delivery-otp', getDeliveryOTP);

/**
 * POST /api/sender/packages/:packageId/confirm-delivery
 * Sender confirms package delivery has arrived safely.
 * Status transitions: delivered_pending_confirmation (or in_transit) -> delivered
 * Releases escrow payment to traveler & increments traveler's delivery count.
 */
router.post('/packages/:packageId/confirm-delivery', async (req, res) => {
  try {
    const { packageId } = req.params;
    const senderId = req.user.id;

    const [[pkg]] = await pool.query('SELECT * FROM packages WHERE id = ?', [packageId]);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    if (pkg.sender_id !== senderId) {
      return res.status(403).json({ success: false, error: 'Access denied. You are not the sender of this package.' });
    }

    if (!['in_transit', 'delivered_pending_confirmation'].includes(pkg.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot confirm delivery for package with status '${pkg.status}'`,
      });
    }

    // Update package status to 'delivered'
    await pool.query(
      "UPDATE packages SET status = 'delivered', updated_at = NOW() WHERE id = ?",
      [packageId]
    );

    // Release escrow payment
    await releasePayment(parseInt(packageId));

    // Update traveler total deliveries
    const [[dr]] = await pool.query(
      "SELECT traveler_id FROM delivery_requests WHERE package_id = ? AND status = 'accepted'",
      [packageId]
    );

    if (dr) {
      await pool.query(
        'UPDATE traveler_profiles SET total_deliveries = total_deliveries + 1 WHERE user_id = ?',
        [dr.traveler_id]
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        message: 'Delivery confirmed successfully! Escrow payment released to the traveler.',
        packageStatus: 'delivered',
      },
    });
  } catch (err) {
    console.error('confirm-delivery error:', err);
    return res.status(500).json({ success: false, error: 'Failed to confirm delivery' });
  }
});

// Delivery Requests
router.post('/delivery-requests', createDeliveryRequest);
router.get('/delivery-requests', getSentRequests);
router.put('/delivery-requests/:id/cancel', cancelRequest);

// Transactions
router.get('/transactions', async (req, res) => {
  try {
    const senderId = req.user.id;
    const [transactions] = await pool.query(
      `SELECT t.*, p.title AS package_title, p.from_location, p.to_location, u.name AS traveler_name
       FROM transactions t
       JOIN packages p ON p.id = t.package_id
       JOIN users u ON u.id = t.traveler_id
       WHERE t.sender_id = ?
       ORDER BY t.held_at DESC`,
      [senderId]
    );

    return res.status(200).json({ success: true, data: transactions });
  } catch (err) {
    console.error('sender transactions error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
});

module.exports = router;

