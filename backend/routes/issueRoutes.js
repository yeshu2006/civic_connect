const express = require('express');
const { createIssue, getIssues, getIssueById, supportIssue, analyzeImageController, updateIssueStatus } = require('../controllers/issueController');
const { protect, admin } = require('../middleware/authMiddleware');
const { upload } = require('../services/cloudinary');

const router = express.Router();

router.route('/')
  .post(protect, createIssue)
  .get(getIssues);

router.route('/:id')
  .get(getIssueById);
  
router.put('/:id/status', protect, admin, updateIssueStatus);

router.post('/:id/support', protect, supportIssue);

router.post('/analyze-image', protect, analyzeImageController);

// Image Upload Endpoint (can be called before submitting the form)
router.post('/upload', protect, upload.array('images', 5), (req, res) => {
  try {
    const imageUrls = req.files.map(file => file.path);
    res.json({ imageUrls });
  } catch (error) {
    res.status(500).json({ message: 'Image upload failed' });
  }
});

module.exports = router;
