const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const uploadMiddleware = require('../middleware/uploadMiddleware');
const { uploadImage } = require('../controllers/uploadController');

const router = express.Router();

router.post('/', authMiddleware, uploadMiddleware, uploadImage);

module.exports = router;