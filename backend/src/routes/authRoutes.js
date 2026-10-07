const express = require('express');
const { register, login } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/protected-test', authMiddleware, (req, res) => {
	res.json({
		success: true,
		message: 'Authentication successful',
		userId: req.userId,
	});
});

module.exports = router;