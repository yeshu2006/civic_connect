import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export const isCloudinaryConfigured = () => {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
    process.env.CLOUDINARY_API_KEY !== 'your_cloudinary_key'
  );
};

export function ensureCloudinaryConfigured() {
  if (isCloudinaryConfigured()) {
    try {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
      });
      return true;
    } catch (e) {
      console.warn('Could not configure Cloudinary:', e.message);
      return false;
    }
  }
  return false;
}

// Initial configuration attempt
ensureCloudinaryConfigured();

/**
 * Uploads an image buffer or file to Cloudinary, or safely falls back to local uploads directory.
 * Guaranteed never to crash with "Must supply api_key".
 *
 * @param {Buffer} buffer File buffer
 * @param {string} originalname Original filename
 * @param {string} folder Target folder name
 * @returns {Promise<{url: string, publicId: string}>}
 */
export const uploadImageToStorage = async (buffer, originalname, folder = 'civicconnect/issues') => {
  if (ensureCloudinaryConfigured()) {
    try {
      const result = await new Promise((resolve) => {
        try {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder,
              resource_type: 'image',
              transformation: [{ width: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }]
            },
            (error, res) => {
              if (error || !res) {
                console.warn('Cloudinary upload returned error, falling back to local storage:', error?.message || error);
                return fallbackToLocal(buffer, originalname, resolve);
              }
              resolve({
                url: res.secure_url,
                publicId: res.public_id
              });
            }
          );

          uploadStream.on('error', (streamErr) => {
            console.warn('Cloudinary upload stream emitted error, falling back to local storage:', streamErr.message);
            fallbackToLocal(buffer, originalname, resolve);
          });

          uploadStream.end(buffer);
        } catch (initErr) {
          console.warn('Cloudinary upload_stream init failed, falling back to local storage:', initErr.message);
          fallbackToLocal(buffer, originalname, resolve);
        }
      });

      if (result && result.url) {
        return result;
      }
    } catch (outerErr) {
      console.warn('Cloudinary upload exception, using local storage fallback:', outerErr.message);
    }
  }

  return new Promise((resolve) => {
    fallbackToLocal(buffer, originalname, resolve);
  });
};

function fallbackToLocal(buffer, originalname, resolve) {
  try {
    const ext = path.extname(originalname) || '.jpg';
    const filename = `issue_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    const localUrl = `/uploads/${filename}`;
    resolve({
      url: localUrl,
      publicId: `local_${filename}`
    });
  } catch (err) {
    console.error('Local fallback storage write failed:', err);
    // In extreme fallback, provide an inline data URI so submission proceeds
    const mime = originalname?.endsWith('.png') ? 'image/png' : 'image/jpeg';
    resolve({
      url: `data:${mime};base64,${buffer.toString('base64')}`,
      publicId: `data_${Date.now()}`
    });
  }
}

export default cloudinary;
