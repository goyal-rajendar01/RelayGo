const { validationResult } = require('express-validator');
const pool = require('../config/db');
const { findMatchesForPackage } = require('../services/matchingEngine');

/**
 * POST /api/packages
 * Create a new package (sender only)
 */
const createPackage = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const {
      title, description, from_location, to_location,
      preferred_date, weight, dimensions, category, budget,
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO packages
         (sender_id, title, description, from_location, to_location,
          preferred_date, weight, dimensions, category, budget)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id, title.trim(), description || null,
        from_location.trim(), to_location.trim(),
        preferred_date, parseFloat(weight), dimensions || null,
        category || null, parseFloat(budget),
      ]
    );

    const [packages] = await pool.query('SELECT * FROM packages WHERE id = ?', [result.insertId]);

    return res.status(201).json({ success: true, data: packages[0] });
  } catch (err) {
    console.error('createPackage error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create package' });
  }
};

/**
 * GET /api/packages
 * - Admin: all packages with optional filters (status, sender_id)
 * - Sender: own packages (same as /my)
 */
const getPackages = async (req, res) => {
  try {
    const { status, sender_id, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT p.*, u.name AS sender_name, u.email AS sender_email
      FROM packages p
      JOIN users u ON u.id = p.sender_id
    `;
    const params = [];
    const conditions = [];

    if (req.user.role !== 'admin') {
      conditions.push('p.sender_id = ?');
      params.push(req.user.id);
    } else {
      if (sender_id) {
        conditions.push('p.sender_id = ?');
        params.push(sender_id);
      }
    }

    if (status) {
      conditions.push('p.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [packages] = await pool.query(query, params);

    // Count total
    let countQuery = 'SELECT COUNT(*) AS total FROM packages p';
    const countParams = [];
    const countConditions = [];
    if (req.user.role !== 'admin') {
      countConditions.push('p.sender_id = ?');
      countParams.push(req.user.id);
    } else if (sender_id) {
      countConditions.push('p.sender_id = ?');
      countParams.push(sender_id);
    }
    if (status) {
      countConditions.push('p.status = ?');
      countParams.push(status);
    }
    if (countConditions.length > 0) {
      countQuery += ' WHERE ' + countConditions.join(' AND ');
    }
    const [[{ total }]] = await pool.query(countQuery, countParams);

    return res.status(200).json({
      success: true,
      data: { packages, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    console.error('getPackages error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch packages' });
  }
};

/**
 * GET /api/packages/my
 * Sender's own packages
 */
const getMyPackages = async (req, res) => {
  try {
    const [packages] = await pool.query(
      `SELECT p.*, u.name AS sender_name
       FROM packages p
       JOIN users u ON u.id = p.sender_id
       WHERE p.sender_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: packages });
  } catch (err) {
    console.error('getMyPackages error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch packages' });
  }
};

/**
 * GET /api/packages/:id
 * Package detail (owner, assigned traveler, or admin)
 */
const getPackageById = async (req, res) => {
  try {
    const { id } = req.params;

    const [packages] = await pool.query(
      `SELECT p.*,
              u.name AS sender_name, u.email AS sender_email, u.phone AS sender_phone
       FROM packages p
       JOIN users u ON u.id = p.sender_id
       WHERE p.id = ?`,
      [id]
    );

    if (packages.length === 0) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    const pkg = packages[0];

    // Access control: sender (own), admin, or traveler involved in delivery
    if (req.user.role === 'sender' && pkg.sender_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (req.user.role === 'traveler') {
      // Check if traveler has a delivery request for this package
      const [dr] = await pool.query(
        'SELECT id FROM delivery_requests WHERE package_id = ? AND traveler_id = ?',
        [id, req.user.id]
      );
      if (dr.length === 0) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    // Fetch associated delivery request if any
    const [deliveryRequests] = await pool.query(
      `SELECT dr.*, u.name AS traveler_name, u.email AS traveler_email, u.phone AS traveler_phone,
              tp.avg_rating AS traveler_rating
       FROM delivery_requests dr
       JOIN users u ON u.id = dr.traveler_id
       LEFT JOIN traveler_profiles tp ON tp.user_id = u.id
       WHERE dr.package_id = ?
       ORDER BY dr.created_at DESC`,
      [id]
    );

    const acceptedDr = deliveryRequests.find((d) => d.status === 'accepted');

    const enrichedPkg = {
      ...pkg,
      fromLocation: pkg.from_location,
      toLocation: pkg.to_location,
      preferredDate: pkg.preferred_date,
      assignedTraveler: acceptedDr
        ? {
            id: acceptedDr.traveler_id,
            name: acceptedDr.traveler_name,
            email: acceptedDr.traveler_email,
            phone: acceptedDr.traveler_phone || '—',
            averageRating: acceptedDr.traveler_rating ? parseFloat(acceptedDr.traveler_rating) : null,
          }
        : null,
      package: pkg,
      deliveryRequests,
    };

    return res.status(200).json({
      success: true,
      data: enrichedPkg,
    });
  } catch (err) {
    console.error('getPackageById error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch package' });
  }
};

/**
 * PUT /api/packages/:id/cancel
 * Cancel a package (sender only, status must be 'open')
 */
const cancelPackage = async (req, res) => {
  try {
    const { id } = req.params;

    const [packages] = await pool.query('SELECT * FROM packages WHERE id = ?', [id]);
    if (packages.length === 0) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    const pkg = packages[0];

    if (pkg.sender_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (!['open', 'requested'].includes(pkg.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot cancel package with status '${pkg.status}'`,
      });
    }

    await pool.query("UPDATE packages SET status = 'cancelled' WHERE id = ?", [id]);

    // Cancel any pending delivery requests for this package
    await pool.query(
      "UPDATE delivery_requests SET status = 'cancelled' WHERE package_id = ? AND status = 'pending'",
      [id]
    );

    return res.status(200).json({ success: true, data: { message: 'Package cancelled successfully' } });
  } catch (err) {
    console.error('cancelPackage error:', err);
    return res.status(500).json({ success: false, error: 'Failed to cancel package' });
  }
};

/**
 * GET /api/packages/:id/matches
 * Get matching journeys for a package (sender only)
 */
const getPackageMatches = async (req, res) => {
  try {
    const { id } = req.params;

    const [packages] = await pool.query('SELECT * FROM packages WHERE id = ?', [id]);
    if (packages.length === 0) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    const pkg = packages[0];

    if (pkg.sender_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const matches = await findMatchesForPackage(parseInt(id));

    return res.status(200).json({ success: true, data: matches });
  } catch (err) {
    console.error('getPackageMatches error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch matches' });
  }
};

module.exports = {
  createPackage,
  getPackages,
  getMyPackages,
  getPackageById,
  cancelPackage,
  getPackageMatches,
};
