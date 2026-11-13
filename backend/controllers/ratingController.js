const { validationResult } = require('express-validator');
const pool = require('../config/db');

/**
 * POST /api/ratings
 * Submit a rating for a completed delivery (sender only).
 * Package must be 'delivered'. One rating per package.
 * Body: { packageId, rating, review }
 */
const submitRating = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { packageId, rating, review } = req.body;

    // Validate rating value
    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
    }

    // Fetch package
    const [[pkg]] = await pool.query('SELECT * FROM packages WHERE id = ?', [packageId]);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    if (pkg.sender_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied. Not your package.' });
    }

    if (pkg.status !== 'delivered') {
      return res.status(400).json({ success: false, error: 'Package must be delivered before rating' });
    }

    // Find the accepted delivery request to get traveler_id
    const [[dr]] = await pool.query(
      "SELECT * FROM delivery_requests WHERE package_id = ? AND status = 'accepted'",
      [packageId]
    );

    if (!dr) {
      return res.status(400).json({ success: false, error: 'No accepted delivery request found for this package' });
    }

    // Check if already rated
    const [[existingRating]] = await pool.query(
      'SELECT id FROM ratings_reviews WHERE package_id = ?',
      [packageId]
    );

    if (existingRating) {
      return res.status(409).json({ success: false, error: 'You have already rated this delivery' });
    }

    // Insert rating
    const [result] = await pool.query(
      `INSERT INTO ratings_reviews (package_id, sender_id, traveler_id, rating, review)
       VALUES (?, ?, ?, ?, ?)`,
      [packageId, req.user.id, dr.traveler_id, ratingNum, review || null]
    );

    // Recalculate traveler's avg_rating
    const [[avgResult]] = await pool.query(
      'SELECT AVG(rating) AS avg_rating, COUNT(*) AS total FROM ratings_reviews WHERE traveler_id = ?',
      [dr.traveler_id]
    );

    await pool.query(
      'UPDATE traveler_profiles SET avg_rating = ? WHERE user_id = ?',
      [parseFloat(avgResult.avg_rating).toFixed(2), dr.traveler_id]
    );

    const [[newRating]] = await pool.query('SELECT * FROM ratings_reviews WHERE id = ?', [result.insertId]);

    return res.status(201).json({ success: true, data: newRating });
  } catch (err) {
    console.error('submitRating error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit rating' });
  }
};

/**
 * GET /api/ratings/traveler/:travelerId
 * Get all ratings for a traveler.
 */
const getTravelerRatings = async (req, res) => {
  try {
    const { travelerId } = req.params;

    // Verify traveler exists
    const [[traveler]] = await pool.query(
      `SELECT u.id, u.name, tp.avg_rating, tp.total_deliveries
       FROM users u
       LEFT JOIN traveler_profiles tp ON tp.user_id = u.id
       WHERE u.id = ? AND u.role = 'traveler'`,
      [travelerId]
    );

    if (!traveler) {
      return res.status(404).json({ success: false, error: 'Traveler not found' });
    }

    const [ratings] = await pool.query(
      `SELECT rr.*,
              u.name AS sender_name,
              p.title AS package_title, p.from_location, p.to_location
       FROM ratings_reviews rr
       JOIN users u ON u.id = rr.sender_id
       JOIN packages p ON p.id = rr.package_id
       WHERE rr.traveler_id = ?
       ORDER BY rr.created_at DESC`,
      [travelerId]
    );

    return res.status(200).json({
      success: true,
      data: { traveler, ratings },
    });
  } catch (err) {
    console.error('getTravelerRatings error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch ratings' });
  }
};

module.exports = { submitRating, getTravelerRatings };
