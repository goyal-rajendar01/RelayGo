/**
 * Middleware factory: check that req.user has a specific role.
 * Usage: router.get('/path', auth, checkRole('admin'), handler)
 *
 * @param {...string} roles - One or more allowed roles
 */
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`,
      });
    }

    next();
  };
};

module.exports = { checkRole };
