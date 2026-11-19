import express from 'express';
import { classifyImage } from '../controllers/aiController.js';
import { uploadOptionalImage } from '../middleware/upload.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/classify-image', optionalAuth, uploadOptionalImage, classifyImage);

export default router;
