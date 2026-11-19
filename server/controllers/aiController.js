import { analyzeCivicImage } from '../services/visionClassifierService.js';
import { uploadImageToStorage } from '../config/cloudinary.js';

/**
 * @route   POST /api/ai/classify-image
 * @desc    Analyze uploaded image using Civic Edge Vision Classifier
 * @access  Private / Public
 */
export const classifyImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file to analyze.'
      });
    }

    const userNotes = req.body.description || req.body.notes || '';
    const buffer = req.file.buffer;
    const mimetype = req.file.mimetype;
    const originalName = req.file.originalname || '';

    // Run AI Vision analysis & quality verification
    let analysis;
    try {
      analysis = await analyzeCivicImage(buffer, mimetype, userNotes, originalName);
    } catch (qualityErr) {
      return res.status(400).json({
        success: false,
        code: qualityErr.code || 'IMAGE_REJECTED',
        message: qualityErr.message
      });
    }

    // Also upload image to storage so frontend gets back an image preview/storage URL
    const storageResult = await uploadImageToStorage(
      buffer,
      req.file.originalname,
      'civicconnect/temp'
    );

    res.status(200).json({
      success: true,
      message: 'Photograph successfully analyzed by Civic Vision Classifier.',
      analysis: {
        ...analysis,
        imageUrl: storageResult.url,
        cloudinaryPublicId: storageResult.publicId
      }
    });
  } catch (err) {
    next(err);
  }
};
