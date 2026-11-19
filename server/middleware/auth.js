import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'civicconnect_secure_jwt_secret_key_2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generates signed JWT token for user
 */
export const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      department: user.department || ''
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Middleware: Verifies JWT token from Authorization header
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authorization token.'
    });
  }
};

/**
 * Middleware: Optional authentication (attaches user if present, proceeds otherwise)
 */
export const optionalAuth = async (req, res, next) => {
  try {
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
      }
    }
  } catch (err) {
    // Ignore error for optional auth
  }
  next();
};

/**
 * Middleware: Authorize by role(s)
 * @param  {...string} roles - e.g. 'department_admin', 'super_admin'
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}]. Your role is '${req.user.role}'.`
      });
    }

    next();
  };
};

/**
 * Middleware: Authorize department admin access for an issue
 */
export const authorizeDepartmentAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  // Super Admin has access to all departments
  if (req.user.role === 'super_admin') {
    return next();
  }

  if (req.user.role === 'department_admin') {
    // If request contains department in body or issue is checked in controller
    if (req.body.department && req.body.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You only have administrative access to the '${req.user.department}' department.`
      });
    }
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Department administrator or Super Admin access required.'
  });
};
