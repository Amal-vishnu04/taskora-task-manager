const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const taskController = require('../controllers/taskController');

const router = express.Router();

router.post('/', authMiddleware, taskController.createTask);
router.get('/', authMiddleware, taskController.getTasks);
router.get('/:id', authMiddleware, taskController.getTask);
router.put('/:id', authMiddleware, taskController.updateTask);
router.delete('/:id', authMiddleware, taskController.deleteTask);

module.exports = router;