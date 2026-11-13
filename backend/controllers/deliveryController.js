const { validationResult } = require('express-validator');
const pool = require('../config/db');
const { holdPayment } = require('../services/paymentService');

/**
 * POST /api/delivery-requests
 * Sender sends a delivery request to a traveler's journey
 * Body: { packageId, journeyId, message, agreedReward }
 */
const createDeliveryRequest = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      conn.release();
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { packageId, journeyId, message, agreedReward } = req.body;

    await conn.beginTransaction();

    // Fetch package and validate ownership
    const [[pkg]] = await conn.query('SELECT * FROM packages WHERE id = ? FOR UPDATE', [packageId]);
    if (!pkg) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    if (pkg.sender_id !== req.user.id) {
      await conn.rollback();
      conn.release();
      return res.status(403).json({ success: false, error: 'Access denied. Not your package.' });
    }

    if (!['open', 'requested'].includes(pkg.status)) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, error: `Package cannot receive requests in '${pkg.status}' status` });
    }

    // Fetch journey
    const [[journey]] = await conn.query('SELECT * FROM journeys WHERE id = ?', [journeyId]);
    if (!journey) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, error: 'Journey not found' });
    }

    if (journey.status !== 'active') {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, error: 'Journey is not active' });
    }

    if (parseFloat(journey.remaining_capacity) < parseFloat(pkg.weight)) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, error: 'Journey does not have sufficient capacity' });
    }

    // Check for duplicate request
    const [[existing]] = await conn.query(
      'SELECT id FROM delivery_requests WHERE package_id = ? AND journey_id = ?',
      [packageId, journeyId]
    );
    if (existing) {
      await conn.rollback();
      conn.release();
      return res.status(409).json({ success: false, error: 'Request already exists for this package and journey' });
    }

    const travelerId = journey.traveler_id;

    // Insert delivery request
    const [result] = await conn.query(
      `INSERT INTO delivery_requests (package_id, journey_id, traveler_id, sender_id, message, agreed_reward)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [packageId, journeyId, travelerId, req.user.id, message || null, agreedReward ? parseFloat(agreedReward) : null]
    );

    // Update package status to 'requested'
    await conn.query("UPDATE packages SET status = 'requested' WHERE id = ?", [packageId]);

    await conn.commit();
    conn.release();

    const [[dr]] = await pool.query(
      `SELECT dr.*, u.name AS traveler_name, j.from_location, j.to_location, j.departure_date
       FROM delivery_requests dr
       JOIN users u ON u.id = dr.traveler_id
       JOIN journeys j ON j.id = dr.journey_id
       WHERE dr.id = ?`,
      [result.insertId]
    );

    return res.status(201).json({ success: true, data: dr });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('createDeliveryRequest error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create delivery request' });
  }
};

/**
 * GET /api/delivery-requests/sent
 * Sender sees requests they sent
 */
const getSentRequests = async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT dr.*,
              p.title AS package_title, p.weight, p.from_location AS pkg_from, p.to_location AS pkg_to, p.budget,
              j.departure_date, j.departure_time, j.from_location AS journey_from, j.to_location AS journey_to,
              u.name AS traveler_name, u.email AS traveler_email,
              tp.avg_rating AS traveler_rating
       FROM delivery_requests dr
       JOIN packages p ON p.id = dr.package_id
       JOIN journeys j ON j.id = dr.journey_id
       JOIN users u ON u.id = dr.traveler_id
       LEFT JOIN traveler_profiles tp ON tp.user_id = dr.traveler_id
       WHERE dr.sender_id = ?
       ORDER BY dr.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: requests });
  } catch (err) {
    console.error('getSentRequests error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch sent requests' });
  }
};

/**
 * GET /api/delivery-requests/received
 * Traveler sees requests they received
 */
const getReceivedRequests = async (req, res) => {
  try {
    const [requests] = await pool.query(
      `SELECT dr.*,
              p.title AS package_title, p.description AS package_description,
              p.weight, p.dimensions, p.category,
              p.from_location AS pkg_from, p.to_location AS pkg_to, p.budget, p.status AS package_status,
              j.departure_date, j.departure_time,
              u.name AS sender_name, u.email AS sender_email
       FROM delivery_requests dr
       JOIN packages p ON p.id = dr.package_id
       JOIN journeys j ON j.id = dr.journey_id
       JOIN users u ON u.id = dr.sender_id
       WHERE dr.traveler_id = ?
       ORDER BY dr.created_at DESC`,
      [req.user.id]
    );

    const enriched = requests.map((r) => ({
      ...r,
      package: {
        title: r.package_title,
        fromLocation: r.pkg_from,
        toLocation: r.pkg_to,
        from_location: r.pkg_from,
        to_location: r.pkg_to,
        weight: r.weight,
        dimensions: r.dimensions,
        category: r.category,
        budget: r.budget,
        status: r.package_status,
      },
      agreedReward: r.agreed_reward,
      createdAt: r.created_at,
    }));

    return res.status(200).json({ success: true, data: enriched });
  } catch (err) {
    console.error('getReceivedRequests error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch received requests' });
  }
};

/**
 * PUT /api/delivery-requests/:id/accept
 * Traveler accepts a delivery request.
 * - Change package status to 'accepted'
 * - Reject all other pending requests for that package
 * - Hold payment
 * - Reduce journey remaining_capacity
 */
const acceptRequest = async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { id } = req.params;

    await conn.beginTransaction();

    // Fetch and lock delivery request
    const [[dr]] = await conn.query(
      'SELECT * FROM delivery_requests WHERE id = ? FOR UPDATE',
      [id]
    );

    if (!dr) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ success: false, error: 'Delivery request not found' });
    }

    if (dr.traveler_id !== req.user.id) {
      await conn.rollback();
      conn.release();
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (dr.status !== 'pending') {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, error: `Request is already '${dr.status}'` });
    }

    // Fetch package and lock it
    const [[pkg]] = await conn.query('SELECT * FROM packages WHERE id = ? FOR UPDATE', [dr.package_id]);

    if (pkg.status === 'accepted') {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, error: 'Package already accepted by another traveler' });
    }

    if (!['open', 'requested'].includes(pkg.status)) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, error: `Cannot accept package in '${pkg.status}' status` });
    }

    // Fetch journey to verify capacity
    const [[journey]] = await conn.query('SELECT * FROM journeys WHERE id = ? FOR UPDATE', [dr.journey_id]);

    if (parseFloat(journey.remaining_capacity) < parseFloat(pkg.weight)) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ success: false, error: 'Insufficient journey capacity' });
    }

    // Accept this request
    await conn.query(
      "UPDATE delivery_requests SET status = 'accepted', updated_at = NOW() WHERE id = ?",
      [id]
    );

    // Reject all other pending requests for this package
    await conn.query(
      "UPDATE delivery_requests SET status = 'rejected', updated_at = NOW() WHERE package_id = ? AND id != ? AND status = 'pending'",
      [dr.package_id, id]
    );

    // Update package status to 'accepted'
    await conn.query(
      "UPDATE packages SET status = 'accepted', updated_at = NOW() WHERE id = ?",
      [dr.package_id]
    );

    // Reduce journey remaining_capacity
    await conn.query(
      'UPDATE journeys SET remaining_capacity = remaining_capacity - ? WHERE id = ?',
      [pkg.weight, dr.journey_id]
    );

    await conn.commit();
    conn.release();

    // Hold payment (use agreed_reward if set, else package budget)
    const paymentAmount = dr.agreed_reward || pkg.budget;
    await holdPayment(dr.package_id, dr.id, dr.sender_id, dr.traveler_id, paymentAmount);

    const [[updated]] = await pool.query(
      `SELECT dr.*, u.name AS traveler_name, p.title AS package_title
       FROM delivery_requests dr
       JOIN users u ON u.id = dr.traveler_id
       JOIN packages p ON p.id = dr.package_id
       WHERE dr.id = ?`,
      [id]
    );

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error('acceptRequest error:', err);
    return res.status(500).json({ success: false, error: 'Failed to accept request' });
  }
};

/**
 * PUT /api/delivery-requests/:id/reject
 * Traveler rejects a delivery request
 */
const rejectRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const [[dr]] = await pool.query('SELECT * FROM delivery_requests WHERE id = ?', [id]);
    if (!dr) {
      return res.status(404).json({ success: false, error: 'Delivery request not found' });
    }

    if (dr.traveler_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (dr.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Request is already '${dr.status}'` });
    }

    await pool.query(
      "UPDATE delivery_requests SET status = 'rejected', updated_at = NOW() WHERE id = ?",
      [id]
    );

    // If this was the only pending request, revert package to 'open'
    const [[{ pending_count }]] = await pool.query(
      "SELECT COUNT(*) AS pending_count FROM delivery_requests WHERE package_id = ? AND status = 'pending'",
      [dr.package_id]
    );

    if (pending_count === 0) {
      await pool.query("UPDATE packages SET status = 'open' WHERE id = ? AND status = 'requested'", [dr.package_id]);
    }

    return res.status(200).json({ success: true, data: { message: 'Request rejected' } });
  } catch (err) {
    console.error('rejectRequest error:', err);
    return res.status(500).json({ success: false, error: 'Failed to reject request' });
  }
};

/**
 * PUT /api/delivery-requests/:id/cancel
 * Sender cancels a pending delivery request
 */
const cancelRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const [[dr]] = await pool.query('SELECT * FROM delivery_requests WHERE id = ?', [id]);
    if (!dr) {
      return res.status(404).json({ success: false, error: 'Delivery request not found' });
    }

    if (dr.sender_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (dr.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Can only cancel pending requests (current: '${dr.status}')` });
    }

    await pool.query(
      "UPDATE delivery_requests SET status = 'cancelled', updated_at = NOW() WHERE id = ?",
      [id]
    );

    // If no pending requests remain, revert package to 'open'
    const [[{ pending_count }]] = await pool.query(
      "SELECT COUNT(*) AS pending_count FROM delivery_requests WHERE package_id = ? AND status = 'pending'",
      [dr.package_id]
    );

    if (pending_count === 0) {
      await pool.query("UPDATE packages SET status = 'open' WHERE id = ? AND status = 'requested'", [dr.package_id]);
    }

    return res.status(200).json({ success: true, data: { message: 'Request cancelled' } });
  } catch (err) {
    console.error('cancelRequest error:', err);
    return res.status(500).json({ success: false, error: 'Failed to cancel request' });
  }
};

module.exports = {
  createDeliveryRequest,
  getSentRequests,
  getReceivedRequests,
  acceptRequest,
  rejectRequest,
  cancelRequest,
};
