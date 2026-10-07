const express = require('express');
const router = express.Router();
const kitController = require('../controllers/kitController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.post('/', kitController.createKit);
router.get('/', kitController.getKits);
router.get('/:id/status', kitController.getKitStatus);
router.get('/:id', kitController.getKitById);
router.put('/:id', kitController.updateKit);
router.post('/:id/regenerate', kitController.regenerateSection);
router.post('/:id/retry', kitController.retryGeneration);

const practiceRouter = require('./practice');
router.use('/:kitId/practice', practiceRouter);

module.exports = router;
