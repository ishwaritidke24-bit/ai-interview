const express = require('express');
const router = express.Router();
const kitController = require('../controllers/kitController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.post('/', kitController.createKit);
router.get('/', kitController.getKits);
router.get('/:id', kitController.getKitById);

const practiceRouter = require('./practice');
router.use('/:kitId/practice', practiceRouter);

module.exports = router;
