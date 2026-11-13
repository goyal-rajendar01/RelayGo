const { validationResult } = require('express-validator');
const pool = require('../config/db');

/**
 * POST /api/journeys
 * Create a journey (traveler only)
 */
const createJourney = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const {
      from_location, to_location, departure_date, departure_time,
      available_capacity, expected_reward, notes,
    } = req.body;

    const capacity = parseFloat(available_capacity);

    const [result] = await pool.query(
      `INSERT INTO journeys
         (traveler_id, from_location, to_location, departure_date, departure_time,
          available_capacity, remaining_capacity, expected_reward, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        from_location.trim(),
        to_location.trim(),
        departure_date,
        departure_time || null,
        capacity,
        capacity,
        parseFloat(expected_reward),
        notes || null,
      ]
    );

    const [journeys] = await pool.query('SELECT * FROM journeys WHERE id = ?', [result.insertId]);

    return res.status(201).json({ success: true, data: journeys[0] });
  } catch (err) {
    console.error('createJourney error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create journey' });
  }
};

/**
 * GET /api/journeys/my
 * Traveler's own journeys with delivery request count
 */
const getMyJourneys = async (req, res) => {
  try {
    const [journeys] = await pool.query(
      `SELECT j.*,
              COUNT(dr.id) AS total_requests,
              SUM(CASE WHEN dr.status = 'accepted' THEN 1 ELSE 0 END) AS accepted_requests
       FROM journeys j
       LEFT JOIN delivery_requests dr ON dr.journey_id = j.id
       WHERE j.traveler_id = ?
       GROUP BY j.id
       ORDER BY j.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: journeys });
  } catch (err) {
    console.error('getMyJourneys error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch journeys' });
  }
};

/**
 * GET /api/journeys/:id
 * Journey detail with traveler info
 */
const getJourneyById = async (req, res) => {
  try {
    const { id } = req.params;

    const [journeys] = await pool.query(
      `SELECT j.*,
              u.name AS traveler_name, u.email AS traveler_email, u.phone AS traveler_phone,
              tp.avg_rating, tp.total_deliveries, tp.verification_status
       FROM journeys j
       JOIN users u ON u.id = j.traveler_id
       LEFT JOIN traveler_profiles tp ON tp.user_id = j.traveler_id
       WHERE j.id = ?`,
      [id]
    );

    if (journeys.length === 0) {
      return res.status(404).json({ success: false, error: 'Journey not found' });
    }

    // Fetch associated delivery requests for traveler's own journey
    let deliveryRequests = [];
    if (req.user.role === 'traveler' && journeys[0].traveler_id === req.user.id) {
      const [dr] = await pool.query(
        `SELECT dr.*,
                p.title AS package_title, p.weight, p.from_location AS pkg_from, p.to_location AS pkg_to,
                u.name AS sender_name, u.email AS sender_email
         FROM delivery_requests dr
         JOIN packages p ON p.id = dr.package_id
         JOIN users u ON u.id = dr.sender_id
         WHERE dr.journey_id = ?
         ORDER BY dr.created_at DESC`,
        [id]
      );
      deliveryRequests = dr;
    }

    return res.status(200).json({
      success: true,
      data: { journey: journeys[0], deliveryRequests },
    });
  } catch (err) {
    console.error('getJourneyById error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch journey' });
  }
};

/**
 * PUT /api/journeys/:id
 * Update journey (traveler, own only, only if active)
 */
const updateJourney = async (req, res) => {
  try {
    const { id } = req.params;

    const [journeys] = await pool.query('SELECT * FROM journeys WHERE id = ?', [id]);
    if (journeys.length === 0) {
      return res.status(404).json({ success: false, error: 'Journey not found' });
    }

    const journey = journeys[0];

    if (journey.traveler_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (journey.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Only active journeys can be updated' });
    }

    const {
      from_location, to_location, departure_date, departure_time,
      available_capacity, expected_reward, notes,
    } = req.body;

    const fields = [];
    const values = [];

    if (from_location !== undefined) { fields.push('from_location = ?'); values.push(from_location.trim()); }
    if (to_location !== undefined) { fields.push('to_location = ?'); values.push(to_location.trim()); }
    if (departure_date !== undefined) { fields.push('departure_date = ?'); values.push(departure_date); }
    if (departure_time !== undefined) { fields.push('departure_time = ?'); values.push(departure_time); }
    if (available_capacity !== undefined) {
      const cap = parseFloat(available_capacity);
      fields.push('available_capacity = ?');
      values.push(cap);
      fields.push('remaining_capacity = ?');
      values.push(cap);
    }
    if (expected_reward !== undefined) { fields.push('expected_reward = ?'); values.push(parseFloat(expected_reward)); }
    if (notes !== undefined) { fields.push('notes = ?'); values.push(notes); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    values.push(id);
    await pool.query(`UPDATE journeys SET ${fields.join(', ')} WHERE id = ?`, values);

    const [updated] = await pool.query('SELECT * FROM journeys WHERE id = ?', [id]);
    return res.status(200).json({ success: true, data: updated[0] });
  } catch (err) {
    console.error('updateJourney error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update journey' });
  }
};

/**
 * PUT /api/journeys/:id/complete
 * Mark journey as completed (traveler, own only)
 */
const completeJourney = async (req, res) => {
  try {
    const { id } = req.params;

    const [journeys] = await pool.query('SELECT * FROM journeys WHERE id = ?', [id]);
    if (journeys.length === 0) {
      return res.status(404).json({ success: false, error: 'Journey not found' });
    }

    const journey = journeys[0];

    if (journey.traveler_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (journey.status !== 'active') {
      return res.status(400).json({ success: false, error: 'Journey is not active' });
    }

    await pool.query("UPDATE journeys SET status = 'completed' WHERE id = ?", [id]);

    return res.status(200).json({ success: true, data: { message: 'Journey marked as completed' } });
  } catch (err) {
    console.error('completeJourney error:', err);
    return res.status(500).json({ success: false, error: 'Failed to complete journey' });
  }
};

module.exports = {
  createJourney,
  getMyJourneys,
  getJourneyById,
  updateJourney,
  completeJourney,
};
