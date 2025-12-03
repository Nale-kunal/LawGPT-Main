import { uploadToCloudinary, uploadFileToCloudinary, deleteFromCloudinary, getCloudinaryUrl } from '../backend/src/config/cloudinary.js';

/**
 * Initialise Cloudinary configuration is already handled inside
 * backend/src/config/cloudinary.js. This thin wrapper exists so that
 * scripts and tooling have a stable import path: `./cloudinary`.
 */

export function uploadFile(filePathOrBuffer, options = {}) {
  if (Buffer.isBuffer(filePathOrBuffer)) {
    const {
      fileName = 'upload',
      folder = 'lawyer-zen',
      ...rest
    } = options;
    return uploadToCloudinary(filePathOrBuffer, fileName, folder, rest);
  }

  const {
    folder = 'lawyer-zen',
    ...rest
  } = options;
  return uploadFileToCloudinary(filePathOrBuffer, folder, rest);
}

export function deleteAsset(publicId, resourceType = 'auto') {
  return deleteFromCloudinary(publicId, resourceType);
}

export function generateUrl(publicId, options = {}) {
  return getCloudinaryUrl(publicId, options);
}

export default {
  uploadFile,
  deleteAsset,
  generateUrl,
};


