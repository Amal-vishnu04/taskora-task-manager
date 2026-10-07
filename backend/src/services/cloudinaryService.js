const cloudinary = require('../config/cloudinary');

async function deleteCloudinaryImage(publicId) {
  if (typeof publicId !== 'string' || !publicId.startsWith('taskflow/tasks/')) {
    return false;
  }

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
    invalidate: true,
  });

  if (result?.result === 'ok') {
    return true;
  }
  if (result?.result === 'not found') {
    return false;
  }

  throw new Error('Cloudinary image cleanup failed');
}

module.exports = { deleteCloudinaryImage };