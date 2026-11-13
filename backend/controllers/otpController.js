const pool = require('../config/db');
const { generateOTP, verifyOTP } = require('../services/otpService');
const { releasePayment } = require('../services/paymentService');

/**
 * GET /api/otp/pickup/:packageId
 * Sender gets (or re-fetches) the pickup OTP for a package.
 * Package must be in 'accepted' status.
 */
const getPickupOTP = async (req, res) => {
  try {
    const { packageId } = req.params;

    const [[pkg]] = await pool.query('SELECT * FROM packages WHERE id = ?', [packageId]);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    if (pkg.sender_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (pkg.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        error: `Pickup OTP is only available when package is accepted (current: '${pkg.status}')`,
      });
    }

    const otp = await generateOTP(parseInt(packageId), 'pickup');

    return res.status(200).json({
      success: true,
      data: {
        otpCode: otp,
        otp: otp,
        message: 'Share this OTP with the traveler when handing over the package.',
        packageId: parseInt(packageId),
        type: 'pickup',
      },
    });
  } catch (err) {
    console.error('getPickupOTP error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate pickup OTP' });
  }
};

/**
 * GET /api/otp/delivery/:packageId
 * Sender gets (or re-fetches) the delivery OTP.
 * Package must be in 'in_transit' status.
 */
const getDeliveryOTP = async (req, res) => {
  try {
    const { packageId } = req.params;

    const [[pkg]] = await pool.query('SELECT * FROM packages WHERE id = ?', [packageId]);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    if (pkg.sender_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (pkg.status !== 'in_transit' && pkg.status !== 'delivered_pending_confirmation') {
      return res.status(400).json({
        success: false,
        error: `Delivery OTP is only available when package is in transit or awaiting confirmation (current: '${pkg.status}')`,
      });
    }

    const otp = await generateOTP(parseInt(packageId), 'delivery');

    return res.status(200).json({
      success: true,
      data: {
        otpCode: otp,
        otp: otp,
        message: 'Share this OTP with the traveler upon receiving the package.',
        packageId: parseInt(packageId),
        type: 'delivery',
      },
    });
  } catch (err) {
    console.error('getDeliveryOTP error:', err);
    return res.status(500).json({ success: false, error: 'Failed to generate delivery OTP' });
  }
};

/**
 * POST /api/otp/verify-pickup
 * Traveler enters pickup OTP to confirm package handover.
 * Package: accepted → in_transit
 * Body: { packageId, otpCode }
 */
const verifyPickup = async (req, res) => {
  try {
    const { packageId, otpCode } = req.body;

    if (!packageId) {
      return res.status(400).json({ success: false, error: 'packageId is required' });
    }
    if (!otpCode) {
      return res.status(400).json({ success: false, error: 'otpCode is required' });
    }

    // Fetch package
    const [[pkg]] = await pool.query('SELECT * FROM packages WHERE id = ?', [packageId]);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    if (pkg.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        error: `Package must be in 'accepted' status for pickup verification (current: '${pkg.status}')`,
      });
    }

    // Verify traveler is the assigned one
    const [[dr]] = await pool.query(
      "SELECT * FROM delivery_requests WHERE package_id = ? AND status = 'accepted' AND traveler_id = ?",
      [packageId, req.user.id]
    );

    if (!dr) {
      return res.status(403).json({ success: false, error: 'You are not the assigned traveler for this package' });
    }

    // Pseudo verify — just check OTP record is valid, ignore actual code
    const valid = await verifyOTP(parseInt(packageId), 'pickup', otpCode);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'OTP is invalid or expired' });
    }

    // Update package to 'in_transit'
    await pool.query(
      "UPDATE packages SET status = 'in_transit', updated_at = NOW() WHERE id = ?",
      [packageId]
    );

    // Auto-generate delivery OTP
    const deliveryOtp = await generateOTP(parseInt(packageId), 'delivery');

    return res.status(200).json({
      success: true,
      data: {
        message: 'Pickup confirmed. Package is now in transit.',
        packageStatus: 'in_transit',
        deliveryOtp,
      },
    });
  } catch (err) {
    console.error('verifyPickup error:', err);
    return res.status(500).json({ success: false, error: 'Failed to verify pickup OTP' });
  }
};

/**
 * POST /api/otp/verify-delivery
 * Sender enters delivery OTP to confirm receipt.
 * Package: in_transit → delivered
 * Releases payment, updates traveler stats.
 * Body: { packageId, otpCode }
 */
const verifyDelivery = async (req, res) => {
  try {
    const { packageId, otpCode } = req.body;

    if (!packageId) {
      return res.status(400).json({ success: false, error: 'packageId is required' });
    }
    if (!otpCode) {
      return res.status(400).json({ success: false, error: 'otpCode is required' });
    }

    // Fetch package
    const [[pkg]] = await pool.query('SELECT * FROM packages WHERE id = ?', [packageId]);
    if (!pkg) {
      return res.status(404).json({ success: false, error: 'Package not found' });
    }

    // Check if requester is the sender or assigned traveler or admin
    const isSender = pkg.sender_id === req.user.id;
    let isTraveler = false;
    const [[drCheck]] = await pool.query(
      "SELECT id FROM delivery_requests WHERE package_id = ? AND status = 'accepted' AND traveler_id = ?",
      [packageId, req.user.id]
    );
    if (drCheck) isTraveler = true;

    if (!isSender && !isTraveler && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied. Only the assigned traveler or sender can confirm delivery.' });
    }

    if (pkg.status !== 'in_transit' && pkg.status !== 'delivered_pending_confirmation') {
      return res.status(400).json({
        success: false,
        error: `Package must be 'in_transit' or 'delivered_pending_confirmation' for delivery verification (current: '${pkg.status}')`,
      });
    }

    // Pseudo verify — just check OTP record is valid
    const valid = await verifyOTP(parseInt(packageId), 'delivery', otpCode);
    if (!valid) {
      return res.status(400).json({ success: false, error: 'OTP is invalid or expired' });
    }

    // Update package to 'delivered'
    await pool.query(
      "UPDATE packages SET status = 'delivered', updated_at = NOW() WHERE id = ?",
      [packageId]
    );

    // Release payment
    await releasePayment(parseInt(packageId));

    // Update traveler stats (total_deliveries + 1)
    const [[dr]] = await pool.query(
      "SELECT * FROM delivery_requests WHERE package_id = ? AND status = 'accepted'",
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
        message: 'Delivery confirmed! Payment released to traveler.',
        packageStatus: 'delivered',
      },
    });
  } catch (err) {
    console.error('verifyDelivery error:', err);
    return res.status(500).json({ success: false, error: 'Failed to verify delivery OTP' });
  }
};

module.exports = { getPickupOTP, getDeliveryOTP, verifyPickup, verifyDelivery };
