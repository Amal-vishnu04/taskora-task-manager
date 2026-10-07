const multer = require('multer');

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    callback(null, allowedMimeTypes.has(file.mimetype));
  },
});

function uploadMiddleware(req, res, next) {
  imageUpload.single('image')(req, res, (error) => {
    if (error) {
      const message = error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE'
        ? 'Image must be 5 MB or smaller'
        : 'Invalid image upload';

      return res.status(400).json({
        success: false,
        message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'A supported image file is required',
      });
    }

    return next();
  });
}

module.exports = uploadMiddleware;