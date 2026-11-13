const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { checkRole } = require('../middleware/roleCheck');
const {
  createJourney,
  getMyJourneys,
  completeJourney,
} = require('../controllers/journeyController');
const {
  getReceivedRequests,
  acceptRequest,
  rejectRequest,
} = require('../controllers/deliveryController');

const router = express.Router();

router.use(auth, checkRole('traveler'));

/**
 * GET /api/traveler/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const travelerId = req.user.id;

    const [[journeyStat]] = await pool.query(
      'SELECT COUNT(*) AS "totalJourneys" FROM journeys WHERE traveler_id = ?',
      [travelerId]
    );

    const [[requestStat]] = await pool.query(
      'SELECT COUNT(*) AS "pendingRequests" FROM delivery_requests WHERE traveler_id = ? AND status = \'pending\'',
      [travelerId]
    );

    const [[deliveryStat]] = await pool.query(
      `SELECT COUNT(*) AS "completedDeliveries"
       FROM delivery_requests dr
       JOIN packages p ON p.id = dr.package_id
       WHERE dr.traveler_id = ? AND p.status = 'delivered'`,
      [travelerId]
    );

    const [[earnedStat]] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) AS "totalEarned" FROM transactions WHERE traveler_id = ? AND status = \'released\'',
      [travelerId]
    );

    return res.status(200).json({
      success: true,
      data: {
        totalJourneys: Number(journeyStat.totalJourneys || 0),
        pendingRequests: Number(requestStat.pendingRequests || 0),
        completedDeliveries: Number(deliveryStat.completedDeliveries || 0),
        totalEarned: Number(earnedStat.totalEarned || 0),
      },
    });
  } catch (err) {
    console.error('traveler stats error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch traveler stats' });
  }
});

// Journeys
router.get('/journeys', getMyJourneys);
router.post('/journeys', createJourney);
router.put('/journeys/:id/complete', completeJourney);

const { holdPayment } = require('../services/paymentService');

/**
 * GET /api/traveler/matching-packages
 * Find all packages matching this traveler's active journeys
 */
router.get('/matching-packages', async (req, res) => {
  try {
    const travelerId = req.user.id;
    const [matchingPackages] = await pool.query(
      `SELECT DISTINCT
         p.id AS id,
         p.id AS package_id,
         p.title,
         p.description,
         p.category,
         p.weight,
         p.dimensions,
         p.from_location,
         p.to_location,
         p.preferred_date,
         p.budget,
         p.status AS package_status,
         u.name AS sender_name,
         u.email AS sender_email,
         j.id AS journey_id,
         j.departure_date,
         j.remaining_capacity,
         j.expected_reward
       FROM journeys j
       JOIN packages p ON (
         LOWER(TRIM(p.from_location)) LIKE CONCAT('%', LOWER(TRIM(j.from_location)), '%')
         OR LOWER(TRIM(j.from_location)) LIKE CONCAT('%', LOWER(TRIM(p.from_location)), '%')
       ) AND (
         LOWER(TRIM(p.to_location)) LIKE CONCAT('%', LOWER(TRIM(j.to_location)), '%')
         OR LOWER(TRIM(j.to_location)) LIKE CONCAT('%', LOWER(TRIM(p.to_location)), '%')
       )
       JOIN users u ON u.id = p.sender_id
       WHERE j.traveler_id = ?
         AND j.status = 'active'
         AND p.status IN ('open', 'requested')
         AND CAST(p.weight AS DECIMAL(5,2)) <= CAST(j.remaining_capacity AS DECIMAL(5,2))
         AND p.sender_id != j.traveler_id
       ORDER BY p.preferred_date ASC, p.created_at DESC`,
      [travelerId]
    );

    return res.status(200).json({ success: true, data: matchingPackages });
  } catch (err) {
    console.error('traveler matching-packages error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch matching packages' });
  }
});

/**
 * POST /api/traveler/claim-package
 * Traveler directly claims / accepts to deliver a matching package
 */
router.post('/claim-package', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { packageId, journeyId } = req.body;
    const travelerId = req.user.id;

    if (!packageId || !journeyId) {
      conn.release();
      return res.status(400).json({ success: false, error: 'packageId and journeyId are required' });
    }

    await conn.beginTransaction();

    const [[pkg]] = await conn.query('SELECT * FROM packages WHERE id = ? FOR UPDATE', [packageId]);
    if (!pkg) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    if (!['open', 'requested'].includes(pkg.status)) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, error: `Package cannot be accepted in '${pkg.status}' status` });
    }

    const [[journey]] = await conn.query('SELECT * FROM journeys WHERE id = ? AND traveler_id = ? FOR UPDATE', [journeyId, travelerId]);
    if (!journey) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, error: 'Valid journey belonging to you was not found' });
    }

    if (parseFloat(journey.remaining_capacity) < parseFloat(pkg.weight)) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, error: 'Insufficient journey capacity' });
    }

    // Check if a request already exists between this package and journey
    const [[existingReq]] = await conn.query(
      'SELECT id FROM delivery_requests WHERE package_id = ? AND journey_id = ?',
      [packageId, journeyId]
    );

    let requestId;
    if (existingReq) {
      requestId = existingReq.id;
      await conn.query("UPDATE delivery_requests SET status = 'accepted', updated_at = NOW() WHERE id = ?", [requestId]);
    } else {
      const [insertRes] = await conn.query(
        `INSERT INTO delivery_requests (package_id, journey_id, traveler_id, sender_id, message, agreed_reward, status)
         VALUES (?, ?, ?, ?, 'Accepted directly by traveler', ?, 'accepted')`,
        [packageId, journeyId, travelerId, pkg.sender_id, pkg.budget]
      );
      requestId = insertRes.insertId;
    }

    // Reject all other pending requests for this package
    await conn.query(
      "UPDATE delivery_requests SET status = 'rejected', updated_at = NOW() WHERE package_id = ? AND id != ? AND status = 'pending'",
      [packageId, requestId]
    );

    // Update package status to 'accepted'
    await conn.query("UPDATE packages SET status = 'accepted', updated_at = NOW() WHERE id = ?", [packageId]);

    // Deduct remaining capacity
    await conn.query(
      'UPDATE journeys SET remaining_capacity = remaining_capacity - ? WHERE id = ?',
      [pkg.weight, journeyId]
    );

    await conn.commit();
    conn.release();

    // Hold payment
    await holdPayment(packageId, requestId, pkg.sender_id, travelerId, pkg.budget);

    return res.status(200).json({
      success: true,
      data: {
        message: 'Package accepted for delivery! Check Active Deliveries to complete pickup.',
        packageId,
        requestId,
      },
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('claim-package error:', err);
    return res.status(500).json({ success: false, error: 'Failed to claim package' });
  }
});

// Delivery Requests
router.get('/delivery-requests', getReceivedRequests);
router.put('/delivery-requests/:id/accept', acceptRequest);
router.put('/delivery-requests/:id/reject', rejectRequest);

// Active Deliveries
router.get('/deliveries', async (req, res) => {
  try {
    const travelerId = req.user.id;
    const [deliveries] = await pool.query(
      `SELECT
         dr.id AS request_id,
         dr.agreed_reward,
         dr.status AS request_status,
         p.id AS id,
         p.title,
         p.description,
         p.category,
         p.weight,
         p.dimensions,
         p.from_location,
         p.to_location,
         p.preferred_date,
         p.budget,
         p.status,
         u.name AS sender_name,
         u.email AS sender_email
       FROM delivery_requests dr
       JOIN packages p ON p.id = dr.package_id
       JOIN users u ON u.id = dr.sender_id
       WHERE dr.traveler_id = ? AND dr.status = 'accepted'
       ORDER BY dr.created_at DESC`,
      [travelerId]
    );

    return res.status(200).json({ success: true, data: deliveries });
  } catch (err) {
    console.error('traveler deliveries error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch active deliveries' });
  }
});

/**
 * PUT /api/traveler/deliveries/:packageId/mark-delivered
 * Traveler marks package as delivered when arriving at destination.
 * Status transitions: in_transit -> delivered_pending_confirmation
 */
router.put('/deliveries/:packageId/mark-delivered', async (req, res) => {
  try {
    const { packageId } = req.params;
    const travelerId = req.user.id;

    const [[pkg]] = await pool.query('SELECT * FROM packages WHERE id = ?', [packageId]);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    // Verify traveler is assigned to this package
    const [[dr]] = await pool.query(
      "SELECT * FROM delivery_requests WHERE package_id = ? AND traveler_id = ? AND status = 'accepted'",
      [packageId, travelerId]
    );

    if (!dr) {
      return res.status(403).json({ success: false, error: 'Access denied. You are not the assigned traveler for this package.' });
    }

    if (pkg.status !== 'in_transit') {
      return res.status(400).json({
        success: false,
        error: `Only packages in transit can be marked as delivered (current status: '${pkg.status}')`,
      });
    }

    await pool.query(
      "UPDATE packages SET status = 'delivered_pending_confirmation', updated_at = NOW() WHERE id = ?",
      [packageId]
    );

    return res.status(200).json({
      success: true,
      data: {
        message: 'Delivery marked as complete! Waiting for sender confirmation.',
        packageStatus: 'delivered_pending_confirmation',
      },
    });
  } catch (err) {
    console.error('mark-delivered error:', err);
    return res.status(500).json({ success: false, error: 'Failed to mark delivery as complete' });
  }
});

// Earnings
router.get('/earnings', async (req, res) => {
  try {
    const travelerId = req.user.id;

    const [[releasedStat]] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) AS "totalEarned" FROM transactions WHERE traveler_id = ? AND status = \'released\'',
      [travelerId]
    );

    const [[heldStat]] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) AS "pendingPayment" FROM transactions WHERE traveler_id = ? AND status = \'held\'',
      [travelerId]
    );

    const [[profileStat]] = await pool.query(
      'SELECT avg_rating, total_deliveries FROM traveler_profiles WHERE user_id = ?',
      [travelerId]
    );

    const [transactions] = await pool.query(
      `SELECT t.*, p.title AS package_title, u.name AS sender_name
       FROM transactions t
       JOIN packages p ON p.id = t.package_id
       JOIN users u ON u.id = t.sender_id
       WHERE t.traveler_id = ?
       ORDER BY t.held_at DESC`,
      [travelerId]
    );

    return res.status(200).json({
      success: true,
      data: {
        totalEarned: Number(releasedStat.totalEarned || 0),
        pendingPayment: Number(heldStat.pendingPayment || 0),
        completedDeliveries: profileStat?.total_deliveries || 0,
        avgRating: Number(profileStat?.avg_rating || 0),
        transactions,
      },
    });
  } catch (err) {
    console.error('traveler earnings error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch earnings' });
  }
});

module.exports = router;

