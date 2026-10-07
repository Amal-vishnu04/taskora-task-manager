const cloudinary = require('../config/cloudinary');

const APPLICATION_IMAGE_FOLDER = ['taskflow', 'tasks'];
const imageExtensions = /\.(?:jpe?g|png|webp|gif|bmp|tiff?|avif)$/i;

function getTaskCloudinaryPublicId(imageUrl) {
  if (typeof imageUrl !== 'string' || !imageUrl.trim()) {
    return null;
  }

  try {
    const url = new URL(imageUrl);
    const cloudName = cloudinary.config().cloud_name;
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com' || url.port || url.username || url.password || !cloudName) {
      return null;
    }

    const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (segments[0] !== cloudName || segments[1] !== 'image' || segments[2] !== 'upload') {
      return null;
    }

    const uploadSegments = segments.slice(3);
    const versionIndex = uploadSegments.findIndex(segment => /^v\d+$/.test(segment));
    if (versionIndex < 0) {
      return null;
    }

    const publicIdSegments = uploadSegments.slice(versionIndex + 1);
    if (publicIdSegments.length < 3 || publicIdSegments.some(segment => !segment || segment === '.' || segment === '..' || /[\\/]/.test(segment))) {
      return null;
    }

    if (publicIdSegments[0] !== APPLICATION_IMAGE_FOLDER[0] || publicIdSegments[1] !== APPLICATION_IMAGE_FOLDER[1]) {
      return null;
    }

    const lastIndex = publicIdSegments.length - 1;
    publicIdSegments[lastIndex] = publicIdSegments[lastIndex].replace(imageExtensions, '');
    if (!publicIdSegments[lastIndex]) {
      return null;
    }

    return publicIdSegments.join('/');
  } catch {
    return null;
  }
}

module.exports = { getTaskCloudinaryPublicId };