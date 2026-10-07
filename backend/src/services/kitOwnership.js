const Kit = require('../models/Kit');

/**
 * Finds a single kit ensuring that it belongs to the authenticated user.
 * @param {string} kitId - The ID of the kit to retrieve.
 * @param {string} userId - The ID of the authenticated user from req.session.
 * @returns {Promise<Object|null>} The kit document, or null if not found/unauthorized.
 */
exports.getUserKit = async (kitId, userId) => {
  return await Kit.findOne({
    _id: kitId,
    userId: userId
  });
};

/**
 * Ensures a kit can only be deleted or modified if it belongs to the user.
 * @param {string} kitId - The ID of the kit to modify/delete.
 * @param {string} userId - The ID of the authenticated user.
 * @param {Object} updateData - Data to update the kit with.
 * @returns {Promise<Object|null>} The updated kit, or null if not found/unauthorized.
 */
exports.updateUserKit = async (kitId, userId, updateData) => {
  return await Kit.findOneAndUpdate(
    { _id: kitId, userId: userId },
    updateData,
    { new: true, runValidators: true }
  );
};
