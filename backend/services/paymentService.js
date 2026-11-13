const pool = require('../config/db');

/**
 * Hold payment for a package delivery.
 * Creates a transaction record with 'held' status.
 *
 * @param {number} packageId
 * @param {number} deliveryRequestId
 * @param {number} senderId
 * @param {number} travelerId
 * @param {number} amount
 * @returns {object} Created transaction record
 */
const holdPayment = async (packageId, deliveryRequestId, senderId, travelerId, amount) => {
  const [result] = await pool.query(
    `INSERT INTO transactions (package_id, delivery_request_id, sender_id, traveler_id, amount, status)
     VALUES (?, ?, ?, ?, ?, 'held')`,
    [packageId, deliveryRequestId, senderId, travelerId, amount]
  );

  const [rows] = await pool.query(
    'SELECT * FROM transactions WHERE id = ?',
    [result.insertId]
  );

  return rows[0];
};

/**
 * Release held payment for a package (upon delivery confirmation).
 * Updates transaction status to 'released' and records release time.
 *
 * @param {number} packageId
 * @returns {object} Updated transaction record
 */
const releasePayment = async (packageId) => {
  await pool.query(
    `UPDATE transactions
     SET status = 'released', released_at = NOW()
     WHERE package_id = ? AND status = 'held'`,
    [packageId]
  );

  const [rows] = await pool.query(
    'SELECT * FROM transactions WHERE package_id = ? ORDER BY id DESC LIMIT 1',
    [packageId]
  );

  return rows[0] || null;
};

/**
 * Refund payment for a package (upon cancellation/dispute resolution).
 *
 * @param {number} packageId
 * @returns {object} Updated transaction record
 */
const refundPayment = async (packageId) => {
  await pool.query(
    `UPDATE transactions
     SET status = 'refunded', released_at = NOW()
     WHERE package_id = ? AND status = 'held'`,
    [packageId]
  );

  const [rows] = await pool.query(
    'SELECT * FROM transactions WHERE package_id = ? ORDER BY id DESC LIMIT 1',
    [packageId]
  );

  return rows[0] || null;
};

module.exports = { holdPayment, releasePayment, refundPayment };
