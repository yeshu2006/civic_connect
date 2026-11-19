import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiNavigation, FiHelpCircle } from 'react-icons/fi';
import LeafletMap from '../components/LeafletMap.jsx';
import DuplicateModal from '../components/DuplicateModal.jsx';
import IssueImageUpload from '../components/IssueImageUpload.jsx';
import ClassificationResult from '../components/ClassificationResult.jsx';
import { DEPARTMENTS, SEVERITIES } from '../utils/constants.js';
import { compressImageForLowBandwidth } from '../utils/imageCompressor.js';
import { validateCivicPhotograph } from '../utils/imageQualityChecker.js';
import { createIssue, checkDuplicates, voteIssue } from '../services/issueService.js';
import { useImageClassification } from '../hooks/useImageClassification.js';
import { CIVIC_CATEGORIES, getCategoryByNameOrId } from '../config/issueCategories.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';

export default function ReportIssuePage() {
  const { isAuthenticated } = useAuth();
  const { success, error, info } = useToast();
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('Roads and Infrastructure');
  const [severity, setSeverity] = useState('Medium');
  const [category, setCategory] = useState('General');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(37.7749);
  const [longitude, setLongitude] = useState(-122.4194);

  // Image Upload & Validation State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [compressionInfo, setCompressionInfo] = useState(null);
  const [imageValidationError, setImageValidationError] = useState(null);
  const [confirmedCategory, setConfirmedCategory] = useState('');

  // Transformers.js CLIP In-Browser Classification Hook
  const {
    classify: classifyWithCLIP,
    reclassify: reclassifyCLIP,
    clearClassification,
    isModelLoading,
    modelProgress,
    isClassifying,
    classificationResult,
    error: classificationError
  } = useImageClassification();

  // Duplicate Detection State
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateIssues, setDuplicateIssues] = useState([]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);

  // Submission State
  const [submitting, setSubmitting] = useState(false);

  // On mount, ask browser for current GPS position
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(parseFloat(pos.coords.latitude.toFixed(6)));
          setLongitude(parseFloat(pos.coords.longitude.toFixed(6)));
        },
        (err) => {
          console.warn('Geolocation access denied or timed out:', err.message);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, []);

  // Handle Image Selection with Quality Check, Low-Bandwidth Compression & In-Browser CLIP
  const handleImageSelected = async (originalFile) => {
    if (!originalFile) return;

    setImageValidationError(null);
    setConfirmedCategory('');
    clearClassification();

    // 1. Pre-flight Quality & Exposure Validation (blur, dark, overexposed)
    const quality = await validateCivicPhotograph(originalFile);
    if (!quality.valid) {
      setImageValidationError(quality.error);
      error(quality.error);
      // Still display preview so citizen sees what photo was uploaded
      try {
        const compressed = await compressImageForLowBandwidth(originalFile);
        setImageFile(compressed);
        setImagePreview(URL.createObjectURL(compressed));
      } catch (e) {}
      return;
    }

    if (quality.isWarning) {
      info(quality.error);
    }

    // 2. Compress image for low-bandwidth upload optimization
    const origKb = Math.round(originalFile.size / 1024);
    const compressed = await compressImageForLowBandwidth(originalFile);
    const compKb = Math.round(compressed.size / 1024);
    const savings = origKb > compKb ? Math.round(((origKb - compKb) / origKb) * 100) : 0;

    setCompressionInfo({ origKb, compKb, savings });
    setImageFile(compressed);
    setImagePreview(URL.createObjectURL(compressed));

    // 3. Execute in-browser CLIP / Edge Vision Zero-Shot Classification
    const clipResult = await classifyWithCLIP(compressed);

    if (clipResult) {
      if (clipResult.isCivicIssue) {
        setCategory(clipResult.predictedCategory);
        if (clipResult.suggestedDepartment) {
          setDepartment(clipResult.suggestedDepartment);
        }
        if (clipResult.suggestedSeverity) {
          setSeverity(clipResult.suggestedSeverity);
        }
        if (!title.trim() && clipResult.suggestedTitle) {
          setTitle(clipResult.suggestedTitle);
        }
        if (!description.trim() && clipResult.suggestedDescription) {
          setDescription(clipResult.suggestedDescription);
        }
        success(
          `AI classified image as "${clipResult.predictedCategory}" (${clipResult.similarityPercent}% match). Please verify below.`
        );
      } else {
        setCategory('Not a Civic Issue');
        info('Notice: Image flagged as non-civic. You can choose a category manually below if this is a mistake.');
      }
    }
  };

  // Handle Clearing Image
  const handleImageCleared = () => {
    setImageFile(null);
    setImagePreview('');
    setCompressionInfo(null);
    setImageValidationError(null);
    clearClassification();
    setConfirmedCategory('');
  };

  // Handle User Confirming the AI Category
  const handleConfirmCategory = (catName, dept, sev) => {
    setConfirmedCategory(catName);
    setCategory(catName);
    if (dept) setDepartment(dept);
    if (sev) setSeverity(sev);
    success(`Category confirmed as "${catName}"!`);
  };

  // Handle User Manually Changing Category
  const handleSelectCategory = (catObj) => {
    const categoryName = catObj.name || catObj.label || catObj;
    const cat = getCategoryByNameOrId(categoryName);

    setCategory(cat.name);
    setConfirmedCategory(cat.name);
    if (cat.department) setDepartment(cat.department);
    if (cat.defaultSeverity) setSeverity(cat.defaultSeverity);
    if (!title.trim() && cat.suggestedTitle) {
      setTitle(cat.suggestedTitle);
    }
    if (!description.trim() && cat.suggestedDescription) {
      setDescription(cat.suggestedDescription);
    }
    success(`Category updated to "${cat.name}". Assigned to ${cat.department}.`);
  };

  // Handle Reclassifying Photo
  const handleReclassify = async () => {
    if (imageFile) {
      setConfirmedCategory('');
      await reclassifyCLIP(imageFile);
    }
  };

  // Map Click Picker handler
  const handleLocationPick = (coords) => {
    setLatitude(coords.latitude);
    setLongitude(coords.longitude);
  };

  // Fetch current GPS location manually
  const handleUseCurrentGPS = () => {
    if (!navigator.geolocation) {
      error('Geolocation is not supported by your browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lon = parseFloat(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lon);
        success(`Pinned to your GPS coordinates (${lat}, ${lon})`);
      },
      (err) => {
        error(`Could not retrieve GPS location: ${err.message}`);
      },
      { enableHighAccuracy: true }
    );
  };

  // Handle Form Submission with Duplicate Detection Check
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      error('Please sign in or register to officially report a civic issue.');
      navigate('/login');
      return;
    }

    if (!title.trim() || !description.trim()) {
      error('Please provide both an issue title and description.');
      return;
    }

    // Check for duplicates in proximity
    setIsCheckingDuplicates(true);
    try {
      const dupRes = await checkDuplicates({
        longitude,
        latitude,
        department,
        title,
        description,
        radiusMeters: 500
      });

      if (dupRes.success && dupRes.duplicates && dupRes.duplicates.length > 0) {
        setDuplicateIssues(dupRes.duplicates);
        setIsDuplicateModalOpen(true);
        setIsCheckingDuplicates(false);
        return; // Pause and let user decide in modal!
      }
    } catch (dupErr) {
      console.warn('Duplicate check skipped:', dupErr);
    } finally {
      setIsCheckingDuplicates(false);
    }

    // If no duplicates, execute submission
    await executeSubmission();
  };

  // Final API submission to backend
  const executeSubmission = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('department', department);
      formData.append('severity', severity);
      formData.append('category', category.trim());
      formData.append('address', address.trim());
      formData.append('latitude', latitude.toString());
      formData.append('longitude', longitude.toString());

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (classificationResult) {
        formData.append(
          'aiAnalysis',
          JSON.stringify({
            model: 'Xenova/clip-vit-base-patch32',
            predictedCategory: classificationResult.predictedCategory,
            confidenceScore: classificationResult.confidenceScore,
            similarityPercent: classificationResult.similarityPercent,
            similarityLevel: classificationResult.similarityLevel,
            deviceUsed: classificationResult.deviceUsed,
            isConfirmedByUser: confirmedCategory === classificationResult.predictedCategory
          })
        );
      }

      const res = await createIssue(formData);
      if (res.success) {
        success('Civic issue reported successfully! Municipal team notified.');
        navigate(`/issues/${res.issue._id}`);
      }
    } catch (err) {
      error(err.response?.data?.message || 'Failed to submit civic report');
    } finally {
      setSubmitting(false);
      setIsDuplicateModalOpen(false);
    }
  };

  // User chooses to support existing issue from duplicate modal
  const handleSupportExisting = async (existingIssue) => {
    try {
      await voteIssue(existingIssue._id);
      success(`Your vote of support was added to "${existingIssue.title}"!`);
      setIsDuplicateModalOpen(false);
      navigate(`/issues/${existingIssue._id}`);
    } catch (err) {
      error(err.response?.data?.message || 'Failed to support existing issue');
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 960 }}>
      {/* Title */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ marginBottom: 4 }}>Report a Civic Issue</h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Submit public infrastructure defects with photos, GPS coordinates, and in-browser AI classification.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid-2" style={{ alignItems: 'start', gap: 24 }}>
          {/* Left Column: Image Upload & AI Card */}
          <div>
            {/* Photographic Evidence Card */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <div>
                  <div className="card-title">1. Photographic Evidence</div>
                  <div className="card-subtitle">Upload clear photo of the infrastructure defect</div>
                </div>
              </div>

              {/* Modular Image Upload Component */}
              <IssueImageUpload
                imagePreview={imagePreview}
                onImageSelected={handleImageSelected}
                onImageCleared={handleImageCleared}
                compressionInfo={compressionInfo}
                disabled={submitting || isClassifying}
                error={imageValidationError}
              />

              {/* In-Browser CLIP Classification Result Component */}
              <ClassificationResult
                result={classificationResult}
                isLoading={isModelLoading}
                loadingProgress={modelProgress}
                isClassifying={isClassifying}
                error={classificationError}
                confirmedCategory={confirmedCategory}
                onConfirmCategory={handleConfirmCategory}
                onSelectCategory={handleSelectCategory}
                onReclassify={imageFile ? handleReclassify : null}
              />
            </div>

            {/* GPS Location & Map Picker */}
            <div className="card">
              <div className="card-header">
                <div>
                  <div className="card-title">2. Incident Location</div>
                  <div className="card-subtitle">Pin exact geographical coordinates on map</div>
                </div>
                <button
                  type="button"
                  onClick={handleUseCurrentGPS}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11.5px' }}
                >
                  <FiNavigation size={12} /> My GPS
                </button>
              </div>

              <LeafletMap
                height="220px"
                center={[latitude, longitude]}
                zoom={14}
                isPicker={true}
                pickedLocation={{ latitude, longitude }}
                onLocationPick={handleLocationPick}
              />

              <div className="grid-2" style={{ marginTop: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11.5px' }}>Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="form-input"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '11.5px' }}>Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="form-input"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: 12, marginBottom: 0 }}>
                <label className="form-label">Street Address / Nearby Landmark</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 501 Market St, corner of 5th Ave"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Issue Details Review & Submission */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">3. Issue Details</div>
                <div className="card-subtitle">Review and adjust details before submitting</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                Issue Title <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. Deep Pothole on Market Street"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Detailed Description <span style={{ color: 'var(--danger)' }}>*</span>
              </label>
              <textarea
                className="form-textarea"
                rows={4}
                required
                placeholder="Describe what is broken, physical extent, surrounding hazards, and vehicle/pedestrian impact..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">
                  Assigned Department <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <select
                  className="form-select"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Assessed Severity</label>
                <select
                  className="form-select"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  {SEVERITIES.map((sev) => (
                    <option key={sev} value={sev}>
                      {sev}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirmed Issue Category</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Pothole / Damaged Road, Water Leakage"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div
              style={{
                background: 'var(--bg-subtle)',
                borderRadius: 6,
                padding: '12px 14px',
                marginBottom: 20,
                fontSize: '12px',
                color: 'var(--text-secondary)',
                lineHeight: 1.5
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
                ℹ️ Municipal Verification Notice
              </div>
              Your report is analyzed locally with in-browser CLIP vision AI. No image data is sent to external AI servers. Once submitted, municipal dispatchers review and verify the ticket.
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={submitting || isCheckingDuplicates || isClassifying}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '14.5px', fontWeight: 600 }}
            >
              {submitting
                ? 'Submitting Civic Report...'
                : isCheckingDuplicates
                ? 'Checking Nearby Duplicates...'
                : 'Submit Civic Report'}
            </button>
          </div>
        </div>
      </form>

      {/* Duplicate Detection Modal */}
      {isDuplicateModalOpen && (
        <DuplicateModal
          isOpen={isDuplicateModalOpen}
          duplicates={duplicateIssues}
          onClose={() => setIsDuplicateModalOpen(false)}
          onSupportExisting={handleSupportExisting}
          onContinueSubmit={executeSubmission}
        />
      )}
    </div>
  );
}
