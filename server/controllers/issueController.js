import Issue, { DEPARTMENTS, SEVERITIES, STATUSES } from '../models/Issue.js';
import Vote from '../models/Vote.js';
import { uploadImageToStorage } from '../config/cloudinary.js';
import { findDuplicateIssues, calculateHaversineDistance } from '../services/duplicateDetectionService.js';

/**
 * @route   POST /api/issues
 * @desc    Report a new civic issue
 * @access  Private (citizen, admin, super_admin)
 */
export const createIssue = async (req, res, next) => {
  try {
    const {
      title,
      description,
      department,
      severity = 'Medium',
      category = 'General',
      address = '',
      latitude,
      longitude,
      aiAnalysis
    } = req.body;

    if (!title || !description || !department) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and department are required.'
      });
    }

    if (!DEPARTMENTS.includes(department)) {
      return res.status(400).json({
        success: false,
        message: `Invalid department. Must be one of: ${DEPARTMENTS.join(', ')}`
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({
        success: false,
        message: 'Valid latitude (-90 to 90) and longitude (-180 to 180) are required.'
      });
    }

    let imageUrl = '';
    let cloudinaryPublicId = '';

    // Handle image upload if a file was sent
    if (req.file) {
      const uploadResult = await uploadImageToStorage(
        req.file.buffer,
        req.file.originalname,
        'civicconnect/issues'
      );
      imageUrl = uploadResult.url;
      cloudinaryPublicId = uploadResult.publicId;
    } else if (req.body.imageUrl) {
      imageUrl = req.body.imageUrl;
    }

    // Parse aiAnalysis if it came as string
    let parsedAi = null;
    if (aiAnalysis) {
      try {
        parsedAi = typeof aiAnalysis === 'string' ? JSON.parse(aiAnalysis) : aiAnalysis;
      } catch (e) {
        parsedAi = null;
      }
    }

    const initialHistory = [
      {
        status: 'Reported',
        updatedBy: req.user._id,
        updatedByName: req.user.name,
        note: 'Issue officially reported by citizen.',
        timestamp: new Date()
      }
    ];

    const issue = await Issue.create({
      title: title.trim(),
      description: description.trim(),
      imageUrl,
      cloudinaryPublicId,
      category: category.trim(),
      department,
      severity: SEVERITIES.includes(severity) ? severity : 'Medium',
      status: 'Reported',
      location: {
        type: 'Point',
        coordinates: [lon, lat] // GeoJSON format: [longitude, latitude]
      },
      address: address.trim(),
      reportedBy: req.user._id,
      votes: 0,
      supporters: [],
      statusHistory: initialHistory,
      aiAnalysis: parsedAi || {}
    });

    const populatedIssue = await Issue.findById(issue._id)
      .populate('reportedBy', 'name email avatarUrl')
      .lean();

    res.status(201).json({
      success: true,
      message: 'Civic issue reported successfully.',
      issue: populatedIssue
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/issues
 * @desc    Get all issues with filters, pagination, and sorting
 * @access  Public (optional auth to flag user's votes)
 */
export const getIssues = async (req, res, next) => {
  try {
    const {
      department,
      status,
      severity,
      search,
      myReports,
      sortBy = 'newest',
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    if (department && department !== 'all') {
      query.department = department;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (severity && severity !== 'all') {
      query.severity = severity;
    }

    if (myReports === 'true' && req.user) {
      query.reportedBy = req.user._id;
    }

    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { address: searchRegex },
        { category: searchRegex }
      ];
    }

    // Sorting
    let sort = {};
    if (sortBy === 'votes') {
      sort = { votes: -1, createdAt: -1 };
    } else if (sortBy === 'oldest') {
      sort = { createdAt: 1 };
    } else if (sortBy === 'severity') {
      // Custom severity priority
      sort = { severity: -1, createdAt: -1 };
    } else {
      // Default: newest
      sort = { createdAt: -1 };
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [issues, total] = await Promise.all([
      Issue.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('reportedBy', 'name email avatarUrl')
        .populate('assignedTo', 'name email department')
        .lean(),
      Issue.countDocuments(query)
    ]);

    // Check voting status if user is authenticated
    let userVotedIssueIds = new Set();
    if (req.user) {
      const issueIds = issues.map((i) => i._id);
      const userVotes = await Vote.find({
        user: req.user._id,
        issue: { $in: issueIds }
      }).select('issue');
      userVotedIssueIds = new Set(userVotes.map((v) => v.issue.toString()));
    }

    const enhancedIssues = issues.map((issue) => ({
      ...issue,
      hasVoted: req.user ? userVotedIssueIds.has(issue._id.toString()) : false
    }));

    res.status(200).json({
      success: true,
      count: enhancedIssues.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      issues: enhancedIssues
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/issues/nearby
 * @desc    Get nearby issues within radius for map & heatmap
 * @access  Public
 */
export const getNearbyIssues = async (req, res, next) => {
  try {
    const {
      longitude,
      latitude,
      radius = 10000, // default 10km
      department,
      status,
      severity
    } = req.query;

    const lon = parseFloat(longitude);
    const lat = parseFloat(latitude);

    const query = {};

    if (department && department !== 'all') {
      query.department = department;
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (severity && severity !== 'all') {
      query.severity = severity;
    }

    // If valid coordinates are provided, apply geospatial proximity filter
    if (!isNaN(lon) && !isNaN(lat)) {
      const radiusMeters = Math.min(50000, Math.max(100, parseFloat(radius) || 10000));
      const radiusInRadians = radiusMeters / 6378100;
      query.location = {
        $geoWithin: {
          $centerSphere: [[lon, lat], radiusInRadians]
        }
      };
    }

    const issues = await Issue.find(query)
      .populate('reportedBy', 'name avatarUrl')
      .populate('assignedTo', 'name department')
      .limit(200)
      .lean();

    // Attach distance calculation if user coordinates were provided
    const withDistance = issues.map((issue) => {
      let distanceMeters = null;
      if (!isNaN(lon) && !isNaN(lat) && issue.location?.coordinates) {
        distanceMeters = calculateHaversineDistance(
          lon,
          lat,
          issue.location.coordinates[0],
          issue.location.coordinates[1]
        );
      }
      return {
        ...issue,
        distanceMeters
      };
    });

    // If coordinates were given, sort by distance
    if (!isNaN(lon) && !isNaN(lat)) {
      withDistance.sort((a, b) => (a.distanceMeters || 0) - (b.distanceMeters || 0));
    }

    res.status(200).json({
      success: true,
      count: withDistance.length,
      issues: withDistance
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   POST /api/issues/check-duplicates
 * @desc    Check for similar/duplicate issues based on GPS & text similarity
 * @access  Public
 */
export const checkDuplicates = async (req, res, next) => {
  try {
    const { longitude, latitude, department, title, description, radiusMeters = 500 } = req.body;

    if (longitude === undefined || latitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Longitude and latitude are required to check for duplicates.'
      });
    }

    const duplicates = await findDuplicateIssues({
      longitude,
      latitude,
      department,
      title,
      description,
      radiusMeters: parseFloat(radiusMeters) || 500
    });

    res.status(200).json({
      success: true,
      count: duplicates.length,
      duplicates
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   GET /api/issues/:id
 * @desc    Get single issue details by ID
 * @access  Public (with optional auth for hasVoted)
 */
export const getIssueById = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id)
      .populate('reportedBy', 'name email avatarUrl phone')
      .populate('assignedTo', 'name email department')
      .populate('statusHistory.updatedBy', 'name role department');

    if (!issue) {
      return res.status(404).json({
        success: false,
        message: 'Civic issue not found.'
      });
    }

    let hasVoted = false;
    if (req.user) {
      const voteExists = await Vote.exists({
        user: req.user._id,
        issue: issue._id
      });
      hasVoted = Boolean(voteExists);
    }

    res.status(200).json({
      success: true,
      issue: {
        ...issue.toObject(),
        hasVoted
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   PUT /api/issues/:id
 * @desc    Update basic issue details (by reporter or admin)
 * @access  Private
 */
export const updateIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    const isReporter = issue.reportedBy.toString() === req.user._id.toString();
    const isSuperAdmin = req.user.role === 'super_admin';
    const isDeptAdmin = req.user.role === 'department_admin' && req.user.department === issue.department;

    if (!isReporter && !isSuperAdmin && !isDeptAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to update this issue.'
      });
    }

    // Reporters can only edit if status is still 'Reported'
    if (isReporter && !isSuperAdmin && !isDeptAdmin && issue.status !== 'Reported') {
      return res.status(400).json({
        success: false,
        message: 'You cannot edit this report once it has been verified or processed.'
      });
    }

    const { title, description, address, category, severity, department } = req.body;

    if (title) issue.title = title.trim();
    if (description) issue.description = description.trim();
    if (address !== undefined) issue.address = address.trim();
    if (category) issue.category = category.trim();

    // Only admins can change severity or department here
    if ((isSuperAdmin || isDeptAdmin) && severity && SEVERITIES.includes(severity)) {
      issue.severity = severity;
    }
    if (isSuperAdmin && department && DEPARTMENTS.includes(department)) {
      issue.department = department;
    }

    await issue.save();

    res.status(200).json({
      success: true,
      message: 'Issue details updated successfully.',
      issue
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @route   DELETE /api/issues/:id
 * @desc    Delete an issue
 * @access  Private (Super Admin, or reporter if still Reported)
 */
export const deleteIssue = async (req, res, next) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found.' });
    }

    const isReporter = issue.reportedBy.toString() === req.user._id.toString();
    const isSuperAdmin = req.user.role === 'super_admin';

    if (!isSuperAdmin && (!isReporter || issue.status !== 'Reported')) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Only Super Admins or the original reporter (for unverified reports) can delete this.'
      });
    }

    await Promise.all([
      Issue.findByIdAndDelete(issue._id),
      Vote.deleteMany({ issue: issue._id })
    ]);

    res.status(200).json({
      success: true,
      message: 'Issue removed successfully.'
    });
  } catch (err) {
    next(err);
  }
};
