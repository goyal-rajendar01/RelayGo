const jwt = require('jsonwebtoken');
const pool = require('../config/db');

/**
 * Middleware: Verify JWT token and attach user to req.user
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'relaygo_jwt_secret_key_2024');
    } catch (err) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    // Fetch user from DB to ensure they still exist and are not suspended
    const [rows] = await pool.query(
      'SELECT id, name, email, phone, role, is_active, is_suspended FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User no longer exists' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'Account is deactivated' });
    }

    if (user.is_suspended) {
      return res.status(403).json({ success: false, error: 'Account is suspended' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ success: false, error: 'Authentication error' });
  }
};

module.exports = auth;
