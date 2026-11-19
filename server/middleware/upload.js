import multer from 'multer';

// In-memory storage allows direct piping to Vision Classifier & Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WEBP, and GIF images are allowed'), false);
  }
};

export const uploadSingleImage = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max
  },
  fileFilter
}).single('image');

export const uploadOptionalImage = (req, res, next) => {
  uploadSingleImage(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};
