const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Do not return by default
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
