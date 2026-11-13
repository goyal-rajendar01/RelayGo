const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const pool = require('../config/db');

const SALT_ROUNDS = 10;

/**
 * Generate a signed JWT for the given user object.
 */
const signToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || 'relaygo_jwt_secret_key_2024',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * POST /api/auth/register
 * Body: { name, email, password, phone, role }
 */
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { name, email, password, phone, role } = req.body;

    // Validate role
    const allowedRoles = ['sender', 'traveler'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid role. Must be sender or traveler.' });
    }

    // Check if email already exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insert user
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), password_hash, phone || null, role || 'sender']
    );

    const userId = result.insertId;

    // If traveler, create a traveler profile
    if (role === 'traveler') {
      await pool.query(
        'INSERT INTO traveler_profiles (user_id) VALUES (?)',
        [userId]
      );
    }

    // Fetch created user
    const [users] = await pool.query(
      'SELECT id, name, email, phone, role, is_active, is_suspended, created_at FROM users WHERE id = ?',
      [userId]
    );

    const user = users[0];
    const token = signToken(user);

    return res.status(201).json({
      success: true,
      data: { token, user },
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, error: 'Registration failed' });
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase().trim()]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const user = users[0];

    if (!user.is_active) {
      return res.status(403).json({ success: false, error: 'Account is deactivated' });
    }

    if (user.is_suspended) {
      return res.status(403).json({ success: false, error: 'Account is suspended' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const token = signToken(user);

    // Return user without password hash
    const { password_hash, ...safeUser } = user;

    return res.status(200).json({
      success: true,
      data: { token, user: safeUser },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
};

/**
 * GET /api/auth/me
 * Returns current authenticated user (with traveler profile if applicable)
 */
const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    const [users] = await pool.query(
      'SELECT id, name, email, phone, role, is_active, is_suspended, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = users[0];

    let travelerProfile = null;
    if (user.role === 'traveler') {
      const [profiles] = await pool.query(
        'SELECT * FROM traveler_profiles WHERE user_id = ?',
        [userId]
      );
      travelerProfile = profiles[0] || null;
    }

    return res.status(200).json({
      success: true,
      data: { user, travelerProfile },
    });
  } catch (err) {
    console.error('GetMe error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};

/**
 * PUT /api/auth/profile
 * Update name, phone (and traveler bio/id fields)
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, phone, bio } = req.body;
    const id_type = req.body.id_type || req.body.idType;
    const id_number = req.body.id_number || req.body.idNumber;

    // Update users table
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name.trim());
    }
    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }

    if (updateFields.length > 0) {
      updateValues.push(userId);
      await pool.query(
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
    }

    // If traveler, optionally update profile
    if (req.user.role === 'traveler') {
      const tpFields = [];
      const tpValues = [];

      if (bio !== undefined) {
        tpFields.push('bio = ?');
        tpValues.push(bio);
      }
      if (id_type !== undefined) {
        tpFields.push('id_type = ?');
        tpValues.push(id_type);
      }
      if (id_number !== undefined) {
        tpFields.push('id_number = ?');
        tpValues.push(id_number);
      }

      if (tpFields.length > 0) {
        tpValues.push(userId);
        // Set status back to pending if uploading new ID
        if (id_number !== undefined || id_type !== undefined) {
          tpFields.push("verification_status = 'pending'");
        }
        await pool.query(
          `UPDATE traveler_profiles SET ${tpFields.join(', ')} WHERE user_id = ?`,
          tpValues
        );
      }
    }

    // Return updated user
    const [users] = await pool.query(
      'SELECT id, name, email, phone, role, is_active, is_suspended, created_at, updated_at FROM users WHERE id = ?',
      [userId]
    );

    let travelerProfile = null;
    if (req.user.role === 'traveler') {
      const [profiles] = await pool.query(
        'SELECT * FROM traveler_profiles WHERE user_id = ?',
        [userId]
      );
      travelerProfile = profiles[0] || null;
    }

    return res.status(200).json({
      success: true,
      data: { user: users[0], travelerProfile },
    });
  } catch (err) {
    console.error('UpdateProfile error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

module.exports = { register, login, getMe, updateProfile };
