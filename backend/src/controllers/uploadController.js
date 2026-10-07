const cloudinary = require('../config/cloudinary');

function uploadImage(req, res) {
  let responseSent = false;

  const failUpload = (error) => {
    if (responseSent || res.headersSent) {
      return;
    }

    responseSent = true;
    const isInvalidImage = error?.http_code === 400;
    res.status(isInvalidImage ? 400 : 500).json({
      success: false,
      message: isInvalidImage ? 'Invalid image file' : 'Unable to upload image',
    });
  };

  try {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'taskflow/tasks',
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          return failUpload(error);
        }

        responseSent = true;
        return res.status(200).json({
          success: true,
          message: 'Image uploaded successfully',
          imageUrl: result.secure_url,
        });
      },
    );

    uploadStream.on('error', failUpload);
    uploadStream.end(req.file.buffer);
  } catch {
    failUpload();
  }
}

module.exports = { uploadImage };