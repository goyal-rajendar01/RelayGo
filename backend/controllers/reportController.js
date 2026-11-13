const { validationResult } = require('express-validator');
const pool = require('../config/db');

/**
 * POST /api/reports
 * Submit a report about a user or a package.
 * Body: { reportedUserId, packageId, reason, description }
 */
const submitReport = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { reportedUserId, packageId, reason, description } = req.body;

    if (!reportedUserId && !packageId) {
      return res.status(400).json({ success: false, error: 'Must provide reportedUserId or packageId' });
    }

    // Cannot report yourself
    if (reportedUserId && parseInt(reportedUserId) === req.user.id) {
      return res.status(400).json({ success: false, error: 'You cannot report yourself' });
    }

    // Validate reported user exists (if provided)
    if (reportedUserId) {
      const [[u]] = await pool.query('SELECT id FROM users WHERE id = ?', [reportedUserId]);
      if (!u) {
        return res.status(404).json({ success: false, error: 'Reported user not found' });
      }
    }

    // Validate package exists (if provided)
    if (packageId) {
      const [[p]] = await pool.query('SELECT id FROM packages WHERE id = ?', [packageId]);
      if (!p) {
        return res.status(404).json({ success: false, error: 'Package not found' });
      }
    }

    const [result] = await pool.query(
      `INSERT INTO reports (reporter_id, reported_user_id, package_id, reason, description)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.user.id,
        reportedUserId || null,
        packageId || null,
        reason.trim(),
        description || null,
      ]
    );

    const [[report]] = await pool.query('SELECT * FROM reports WHERE id = ?', [result.insertId]);

    return res.status(201).json({ success: true, data: report });
  } catch (err) {
    console.error('submitReport error:', err);
    return res.status(500).json({ success: false, error: 'Failed to submit report' });
  }
};

/**
 * GET /api/reports/my
 * Get reports submitted by the current user.
 */
const getMyReports = async (req, res) => {
  try {
    const [reports] = await pool.query(
      `SELECT r.*,
              ru.name AS reported_user_name,
              p.title AS package_title
       FROM reports r
       LEFT JOIN users ru ON ru.id = r.reported_user_id
       LEFT JOIN packages p ON p.id = r.package_id
       WHERE r.reporter_id = ?
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: reports });
  } catch (err) {
    console.error('getMyReports error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch reports' });
  }
};

module.exports = { submitReport, getMyReports };
