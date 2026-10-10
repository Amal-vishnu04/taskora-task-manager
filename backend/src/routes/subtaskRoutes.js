const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const subtaskController = require('../controllers/subtaskController');

const router = express.Router();

router.get('/subtasks/summary', authMiddleware, subtaskController.getSubtaskSummary);
router.get('/tasks/:taskId/subtasks', authMiddleware, subtaskController.listSubtasks);
router.post('/tasks/:taskId/subtasks', authMiddleware, subtaskController.createSubtask);
router.patch('/tasks/:taskId/subtasks/:subtaskId', authMiddleware, subtaskController.updateSubtask);
router.delete('/tasks/:taskId/subtasks/:subtaskId', authMiddleware, subtaskController.deleteSubtask);

module.exports = router;
