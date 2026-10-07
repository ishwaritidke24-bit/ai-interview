const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not defined.');
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
