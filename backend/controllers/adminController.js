const pool = require('../config/db');

/**
 * GET /api/admin/stats
 * Platform-wide statistics.
 */
const getStats = async (req, res) => {
  try {
    const [[userStats]] = await pool.query(`
      SELECT
        COUNT(*) AS totalUsers,
        SUM(CASE WHEN role = 'sender' THEN 1 ELSE 0 END) AS totalSenders,
        SUM(CASE WHEN role = 'traveler' THEN 1 ELSE 0 END) AS totalTravelers,
        SUM(CASE WHEN is_suspended = TRUE THEN 1 ELSE 0 END) AS suspendedUsers
      FROM users WHERE role != 'admin'
    `);

    const [[packageStats]] = await pool.query(`
      SELECT
        COUNT(*) AS totalPackages,
        SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS openPackages,
        SUM(CASE WHEN status IN ('accepted','in_transit') THEN 1 ELSE 0 END) AS activeDeliveries,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS completedDeliveries,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelledPackages,
        SUM(CASE WHEN status = 'disputed' THEN 1 ELSE 0 END) AS disputedPackages
      FROM packages
    `);

    const [[journeyStats]] = await pool.query(`
      SELECT COUNT(*) AS totalJourneys,
             SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS activeJourneys
      FROM journeys
    `);

    const [[revenueStats]] = await pool.query(`
      SELECT COALESCE(SUM(amount), 0) AS totalRevenue,
             COALESCE(SUM(CASE WHEN status = 'held' THEN amount ELSE 0 END), 0) AS heldAmount,
             COALESCE(SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END), 0) AS releasedAmount
      FROM transactions
    `);

    const [[reportStats]] = await pool.query(`
      SELECT COUNT(*) AS totalReports,
             SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS openReports
      FROM reports
    `);

    const [[disputeStats]] = await pool.query(`
      SELECT COUNT(*) AS totalDisputes,
             SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS openDisputes
      FROM disputes
    `);

    return res.status(200).json({
      success: true,
      data: {
        users: userStats,
        packages: packageStats,
        journeys: journeyStats,
        revenue: revenueStats,
        reports: reportStats,
        disputes: disputeStats,
      },
    });
  } catch (err) {
    console.error('getStats error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
};

/**
 * GET /api/admin/users
 * All users with pagination and optional role filter.
 */
const getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.is_suspended, u.created_at,
             tp.verification_status, tp.avg_rating, tp.total_deliveries
      FROM users u
      LEFT JOIN traveler_profiles tp ON tp.user_id = u.id
    `;
    const params = [];
    const conditions = [];

    if (role) { conditions.push('u.role = ?'); params.push(role); }
    if (search) {
      conditions.push('(u.name LIKE ? OR u.email LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [users] = await pool.query(query, params);

    // Count
    let countQuery = 'SELECT COUNT(*) AS total FROM users u';
    const countParams = [];
    const countConditions = [];
    if (role) { countConditions.push('u.role = ?'); countParams.push(role); }
    if (search) {
      countConditions.push('(u.name LIKE ? OR u.email LIKE ?)');
      countParams.push(`%${search}%`, `%${search}%`);
    }
    if (countConditions.length > 0) countQuery += ' WHERE ' + countConditions.join(' AND ');
    const [[{ total }]] = await pool.query(countQuery, countParams);

    return res.status(200).json({
      success: true,
      data: { users, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};

/**
 * PUT /api/admin/users/:id/suspend
 * Toggle suspend status for a user.
 */
const toggleSuspend = async (req, res) => {
  try {
    const { id } = req.params;

    const [[user]] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, error: 'Cannot suspend an admin' });
    }

    const newStatus = !user.is_suspended;
    await pool.query('UPDATE users SET is_suspended = ? WHERE id = ?', [newStatus, id]);

    return res.status(200).json({
      success: true,
      data: {
        message: newStatus ? 'User suspended' : 'User unsuspended',
        is_suspended: newStatus,
        userId: parseInt(id),
      },
    });
  } catch (err) {
    console.error('toggleSuspend error:', err);
    return res.status(500).json({ success: false, error: 'Failed to toggle suspend' });
  }
};

/**
 * GET /api/admin/packages
 * All packages with optional status filter.
 */
const getAdminPackages = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT p.*, u.name AS sender_name, u.email AS sender_email
      FROM packages p
      JOIN users u ON u.id = p.sender_id
    `;
    const params = [];
    if (status) { query += ' WHERE p.status = ?'; params.push(status); }
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [packages] = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) AS total FROM packages';
    const countParams = [];
    if (status) { countQuery += ' WHERE status = ?'; countParams.push(status); }
    const [[{ total }]] = await pool.query(countQuery, countParams);

    return res.status(200).json({
      success: true,
      data: { packages, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    console.error('getAdminPackages error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch packages' });
  }
};

/**
 * GET /api/admin/journeys
 * All journeys with traveler info.
 */
const getAdminJourneys = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT j.*, u.name AS traveler_name, u.email AS traveler_email,
             tp.avg_rating, tp.verification_status
      FROM journeys j
      JOIN users u ON u.id = j.traveler_id
      LEFT JOIN traveler_profiles tp ON tp.user_id = j.traveler_id
    `;
    const params = [];
    if (status) { query += ' WHERE j.status = ?'; params.push(status); }
    query += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [journeys] = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) AS total FROM journeys';
    const countParams = [];
    if (status) { countQuery += ' WHERE status = ?'; countParams.push(status); }
    const [[{ total }]] = await pool.query(countQuery, countParams);

    return res.status(200).json({
      success: true,
      data: { journeys, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    console.error('getAdminJourneys error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch journeys' });
  }
};

/**
 * GET /api/admin/deliveries
 * All delivery requests with full details.
 */
const getAdminDeliveries = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT dr.*,
             p.title AS package_title, p.weight, p.from_location AS pkg_from, p.to_location AS pkg_to, p.status AS package_status,
             j.departure_date, j.from_location AS journey_from, j.to_location AS journey_to,
             s.name AS sender_name, s.email AS sender_email,
             t.name AS traveler_name, t.email AS traveler_email
      FROM delivery_requests dr
      JOIN packages p ON p.id = dr.package_id
      JOIN journeys j ON j.id = dr.journey_id
      JOIN users s ON s.id = dr.sender_id
      JOIN users t ON t.id = dr.traveler_id
    `;
    const params = [];
    if (status) { query += ' WHERE dr.status = ?'; params.push(status); }
    query += ' ORDER BY dr.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [deliveries] = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) AS total FROM delivery_requests';
    const countParams = [];
    if (status) { countQuery += ' WHERE status = ?'; countParams.push(status); }
    const [[{ total }]] = await pool.query(countQuery, countParams);

    return res.status(200).json({
      success: true,
      data: { deliveries, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    console.error('getAdminDeliveries error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch deliveries' });
  }
};

/**
 * GET /api/admin/traveler-verifications
 * Traveler profiles pending verification.
 */
const getTravelerVerifications = async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    const [profiles] = await pool.query(
      `SELECT tp.*, u.name, u.email, u.phone, u.created_at AS user_created_at
       FROM traveler_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE tp.verification_status = ?
       ORDER BY tp.created_at ASC`,
      [status]
    );

    return res.status(200).json({ success: true, data: profiles });
  } catch (err) {
    console.error('getTravelerVerifications error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch verifications' });
  }
};

/**
 * PUT /api/admin/traveler-verifications/:id/approve
 * Approve a traveler's verification (id = traveler_profiles.id).
 */
const approveTraveler = async (req, res) => {
  try {
    const { id } = req.params;

    const [[profile]] = await pool.query('SELECT * FROM traveler_profiles WHERE id = ?', [id]);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Traveler profile not found' });
    }

    await pool.query(
      "UPDATE traveler_profiles SET verification_status = 'verified', verified_at = NOW() WHERE id = ?",
      [id]
    );

    return res.status(200).json({ success: true, data: { message: 'Traveler approved', profileId: parseInt(id) } });
  } catch (err) {
    console.error('approveTraveler error:', err);
    return res.status(500).json({ success: false, error: 'Failed to approve traveler' });
  }
};

/**
 * PUT /api/admin/traveler-verifications/:id/reject
 * Reject a traveler's verification.
 */
const rejectTraveler = async (req, res) => {
  try {
    const { id } = req.params;

    const [[profile]] = await pool.query('SELECT * FROM traveler_profiles WHERE id = ?', [id]);
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Traveler profile not found' });
    }

    await pool.query(
      "UPDATE traveler_profiles SET verification_status = 'rejected' WHERE id = ?",
      [id]
    );

    return res.status(200).json({ success: true, data: { message: 'Traveler rejected', profileId: parseInt(id) } });
  } catch (err) {
    console.error('rejectTraveler error:', err);
    return res.status(500).json({ success: false, error: 'Failed to reject traveler' });
  }
};

/**
 * GET /api/admin/reports
 * All reports with reporter/reported info.
 */
const getAdminReports = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT r.*,
             u1.name AS reporter_name, u1.email AS reporter_email,
             u2.name AS reported_user_name, u2.email AS reported_user_email,
             p.title AS package_title
      FROM reports r
      JOIN users u1 ON u1.id = r.reporter_id
      LEFT JOIN users u2 ON u2.id = r.reported_user_id
      LEFT JOIN packages p ON p.id = r.package_id
    `;
    const params = [];
    if (status) { query += ' WHERE r.status = ?'; params.push(status); }
    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [reports] = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) AS total FROM reports';
    const countParams = [];
    if (status) { countQuery += ' WHERE status = ?'; countParams.push(status); }
    const [[{ total }]] = await pool.query(countQuery, countParams);

    return res.status(200).json({
      success: true,
      data: { reports, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    console.error('getAdminReports error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
};

/**
 * GET /api/admin/disputes
 * All disputes.
 */
const getAdminDisputes = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT d.*,
             p.title AS package_title,
             u1.name AS raised_by_name, u1.email AS raised_by_email,
             u2.name AS resolved_by_name
      FROM disputes d
      JOIN packages p ON p.id = d.package_id
      JOIN users u1 ON u1.id = d.raised_by
      LEFT JOIN users u2 ON u2.id = d.resolved_by
    `;
    const params = [];
    if (status) { query += ' WHERE d.status = ?'; params.push(status); }
    query += ' ORDER BY d.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [disputes] = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) AS total FROM disputes';
    const countParams = [];
    if (status) { countQuery += ' WHERE status = ?'; countParams.push(status); }
    const [[{ total }]] = await pool.query(countQuery, countParams);

    return res.status(200).json({
      success: true,
      data: { disputes, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    console.error('getAdminDisputes error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch disputes' });
  }
};

/**
 * PUT /api/admin/disputes/:id/resolve
 * Resolve a dispute. Body: { resolution }
 */
const resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    if (!resolution || !resolution.trim()) {
      return res.status(400).json({ success: false, error: 'Resolution text is required' });
    }

    const [[dispute]] = await pool.query('SELECT * FROM disputes WHERE id = ?', [id]);
    if (!dispute) {
      return res.status(404).json({ success: false, error: 'Dispute not found' });
    }

    if (dispute.status === 'resolved' || dispute.status === 'closed') {
      return res.status(400).json({ success: false, error: 'Dispute is already resolved or closed' });
    }

    await pool.query(
      `UPDATE disputes
       SET status = 'resolved', resolution = ?, resolved_by = ?, resolved_at = NOW()
       WHERE id = ?`,
      [resolution.trim(), req.user.id, id]
    );

    const [[updated]] = await pool.query('SELECT * FROM disputes WHERE id = ?', [id]);

    return res.status(200).json({ success: true, data: updated });
  } catch (err) {
    console.error('resolveDispute error:', err);
    return res.status(500).json({ success: false, error: 'Failed to resolve dispute' });
  }
};

/**
 * GET /api/admin/transactions
 * All transactions with full details.
 */
const getAdminTransactions = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT t.*,
             p.title AS package_title,
             s.name AS sender_name, s.email AS sender_email,
             tr.name AS traveler_name, tr.email AS traveler_email
      FROM transactions t
      JOIN packages p ON p.id = t.package_id
      JOIN users s ON s.id = t.sender_id
      JOIN users tr ON tr.id = t.traveler_id
    `;
    const params = [];
    if (status) { query += ' WHERE t.status = ?'; params.push(status); }
    query += ' ORDER BY t.held_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const [transactions] = await pool.query(query, params);

    let countQuery = 'SELECT COUNT(*) AS total FROM transactions';
    const countParams = [];
    if (status) { countQuery += ' WHERE status = ?'; countParams.push(status); }
    const [[{ total }]] = await pool.query(countQuery, countParams);

    return res.status(200).json({
      success: true,
      data: { transactions, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    console.error('getAdminTransactions error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
};

module.exports = {
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
};
