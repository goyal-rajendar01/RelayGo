const pool = require('../config/db');

/**
 * GET /api/payments/my
 * Get current user's transactions.
 * - Sender: transactions where sender_id = user.id
 * - Traveler: transactions where traveler_id = user.id
 * - Admin: all transactions
 */
const getMyTransactions = async (req, res) => {
  try {
    let query = `
      SELECT t.*,
             p.title AS package_title,
             p.from_location, p.to_location,
             s.name AS sender_name, s.email AS sender_email,
             tr.name AS traveler_name, tr.email AS traveler_email
      FROM transactions t
      JOIN packages p ON p.id = t.package_id
      JOIN users s ON s.id = t.sender_id
      JOIN users tr ON tr.id = t.traveler_id
    `;
    const params = [];

    if (req.user.role === 'sender') {
      query += ' WHERE t.sender_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'traveler') {
      query += ' WHERE t.traveler_id = ?';
      params.push(req.user.id);
    }
    // admin: no WHERE clause — all transactions

    query += ' ORDER BY t.held_at DESC';

    const [transactions] = await pool.query(query, params);

    return res.status(200).json({ success: true, data: transactions });
  } catch (err) {
    console.error('getMyTransactions error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
  }
};

/**
 * GET /api/payments/package/:packageId
 * Get the transaction for a specific package.
 * Access: sender of package, assigned traveler, or admin.
 */
const getTransactionByPackage = async (req, res) => {
  try {
    const { packageId } = req.params;

    const [[pkg]] = await pool.query('SELECT * FROM packages WHERE id = ?', [packageId]);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    // Access control
    if (req.user.role === 'sender' && pkg.sender_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (req.user.role === 'traveler') {
      const [[dr]] = await pool.query(
        'SELECT id FROM delivery_requests WHERE package_id = ? AND traveler_id = ?',
        [packageId, req.user.id]
      );
      if (!dr) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }
    }

    const [transactions] = await pool.query(
      `SELECT t.*,
              p.title AS package_title,
              s.name AS sender_name,
              tr.name AS traveler_name
       FROM transactions t
       JOIN packages p ON p.id = t.package_id
       JOIN users s ON s.id = t.sender_id
       JOIN users tr ON tr.id = t.traveler_id
       WHERE t.package_id = ?
       ORDER BY t.held_at DESC`,
      [packageId]
    );

    return res.status(200).json({ success: true, data: transactions });
  } catch (err) {
    console.error('getTransactionByPackage error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch transaction' });
  }
};

module.exports = { getMyTransactions, getTransactionByPackage };
