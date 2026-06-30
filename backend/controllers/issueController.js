const Issue = require('../models/Issue');
const { classifyIssue, detectDuplicate } = require('../services/gemini');

const createIssue = async (req, res) => {
  try {
    const { title, description, category, severity, location, address, images } = req.body;
    
    // location should be { lat, lng }
    const point = {
      type: 'Point',
      coordinates: [location.lng, location.lat]
    };

    // 1. AI Classification
    const aiAnalysis = await classifyIssue(title, description, images);

    // 2. Duplicate Detection
    const radiusInMeters = 500;
    const nearbyIssues = await Issue.find({
      location: {
        $near: {
          $geometry: point,
          $maxDistance: radiusInMeters
        }
      },
      status: { $ne: 'Resolved' }
    }).limit(10);

    const duplicateCheck = await detectDuplicate(
      { title, description }, 
      nearbyIssues
    );

    // 3. Save Issue
    const issue = new Issue({
      title,
      description,
      category: category || aiAnalysis.category,
      severity: severity || aiAnalysis.severity,
      location: point,
      address,
      images,
      reportedBy: req.user._id,
      aiSummary: aiAnalysis.summary,
      aiCategory: aiAnalysis.category,
      aiSeverity: aiAnalysis.severity,
      duplicateScore: duplicateCheck.confidenceScore,
      duplicateIssueId: duplicateCheck.duplicateIssueId
    });

    await issue.save();

    // 4. Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.emit('new-issue', issue);
    }

    res.status(201).json({
      issue,
      isDuplicate: duplicateCheck.isDuplicate,
      duplicateId: duplicateCheck.duplicateIssueId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getIssues = async (req, res) => {
  try {
    const issues = await Issue.find().populate('reportedBy', 'name avatar').sort('-createdAt');
    res.json(issues);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const getIssueById = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reportedBy', 'name avatar')
      .populate('assignedOfficer', 'name')
      .populate('supporters', 'name avatar');
      
    if (issue) {
      res.json(issue);
    } else {
      res.status(404).json({ message: 'Issue not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const supportIssue = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    
    if (issue) {
      if (issue.supporters.includes(req.user._id)) {
        return res.status(400).json({ message: 'Already supported this issue' });
      }
      
      issue.supporters.push(req.user._id);
      await issue.save();
      
      const io = req.app.get('io');
      if (io) {
        io.emit('issue-updated', issue);
      }
      
      res.json({ message: 'Issue supported successfully', issue });
    } else {
      res.status(404).json({ message: 'Issue not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const analyzeImageController = async (req, res) => {
  try {
    const { imageUrl } = req.body;
    const { analyzeImage } = require('../services/gemini');
    const result = await analyzeImage(imageUrl);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Image analysis failed' });
  }
};

const updateIssueStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const issue = await Issue.findById(req.params.id);
    
    if (issue) {
      issue.status = status;
      await issue.save();
      
      const io = req.app.get('io');
      if (io) {
        io.emit('issue-updated', issue);
      }
      
      res.json(issue);
    } else {
      res.status(404).json({ message: 'Issue not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { createIssue, getIssues, getIssueById, supportIssue, analyzeImageController, updateIssueStatus };
