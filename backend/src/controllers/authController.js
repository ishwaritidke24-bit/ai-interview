const bcrypt = require('bcryptjs');
const User = require('../models/User');

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' }
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        error: { code: 'DUPLICATE_EMAIL', message: 'User with this email already exists.' }
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new User({
      email,
      passwordHash
    });

    await newUser.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error.' } });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' }
      });
    }

    // Find user and explicitly select passwordHash
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    // Set session
    req.session.userId = user._id;

    res.json({
      message: 'Logged in successfully',
      user: {
        id: user._id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error.' } });
  }
};

exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Failed to logout.' } });
    }
    res.clearCookie('connect.sid'); // Default cookie name for express-session
    res.json({ message: 'Logged out successfully' });
  });
};

exports.getMe = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    res.json({
      user: {
        id: req.user._id,
        email: req.user.email
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error.' } });
  }
};
