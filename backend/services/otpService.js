const pool = require('../config/db');

/**
 * Generate (or regenerate) a pseudo OTP for a package/type.
 * Always stores '000000' as the OTP code.
 * Expires 24 hours from now.
 *
 * @param {number} packageId
 * @param {'pickup'|'delivery'} type
 * @returns {string} The OTP code (always '000000' in pseudo mode)
 */
const generateOTP = async (packageId, type) => {
  const otpCode = '000000';
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Upsert: if entry exists for this package+type, replace it
  await pool.query(
    `INSERT INTO otp_verifications (package_id, otp_type, otp_code, is_used, expires_at)
     VALUES (?, ?, ?, FALSE, ?)
     ON CONFLICT (package_id, otp_type) DO UPDATE SET
       otp_code   = EXCLUDED.otp_code,
       is_used    = FALSE,
       expires_at = EXCLUDED.expires_at,
       used_at    = NULL`,
    [packageId, type, otpCode, expiresAt]
  );

  return otpCode;
};

/**
 * Verify a pseudo OTP.
 * In pseudo mode: accepts any non-empty string; only validates package state.
 * Returns true if the OTP record exists, is not used, and has not expired.
 *
 * @param {number} packageId
 * @param {'pickup'|'delivery'} type
 * @param {string} _code  (ignored in pseudo mode)
 * @returns {boolean}
 */
const verifyOTP = async (packageId, type, _code) => {
  // In pseudo mode: any entered OTP works immediately.
  // Record or update the OTP verification as used.
  try {
    await pool.query(
      `INSERT INTO otp_verifications (package_id, otp_type, otp_code, is_used, expires_at, used_at)
       VALUES (?, ?, '000000', TRUE, NOW() + INTERVAL '1 day', NOW())
       ON CONFLICT (package_id, otp_type) DO UPDATE SET is_used = TRUE, used_at = NOW()`,
      [packageId, type]
    );
  } catch (err) {
    console.error('verifyOTP warning:', err.message);
  }

  return true;
};

module.exports = { generateOTP, verifyOTP };
