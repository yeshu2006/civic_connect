import User, { DEPARTMENTS, ROLES } from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 */
export const signup = async (req, res, next) => {
  try {
    const { name, email, password, role = 'citizen', department = '', phone = '' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    // Role validation
    const assignedRole = ROLES.includes(role) ? role : 'citizen';

    if (assignedRole === 'department_admin' && (!department || !DEPARTMENTS.includes(department))) {
      return res.status(400).json({
        success: false,
        message: `Department is required for Department Admin. Choose from: ${DEPARTMENTS.join(', ')}`
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: assignedRole,
      department: assignedRole === 'department_admin' ? department : '',
      phone
    });

    const token = generateToken(user);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/auth/profile
 * @desc    Update current user profile
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatarUrl } = req.body;
    const updates = {};
    if (name) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl.trim();

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/auth/departments
 * @desc    List available department categories
 * @access  Public
 */
export const getDepartments = async (req, res) => {
  res.status(200).json({
    success: true,
    departments: DEPARTMENTS
  });
};
