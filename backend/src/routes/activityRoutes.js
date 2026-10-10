const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const activityController = require('../controllers/activityController');

const router = express.Router();

router.get('/', authMiddleware, activityController.getRecentActivity);
router.get('/task/:id', authMiddleware, activityController.getTaskActivity);

module.exports = router;
