const User = require('../models/User');

exports.requireAuth = async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'You must be logged in to access this resource.' }
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHENTICATED', message: 'User not found.' }
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Internal server error.' } });
  }
};
