import api from './api.js';
import { validateCivicPhotograph } from '../utils/imageQualityChecker.js';

export const CIVIC_CATEGORIES = [
  {
    id: 'pothole',
    label: 'Pothole / Road Defect',
    icon: '🕳️',
    department: 'Roads and Infrastructure',
    defaultSeverity: 'High',
    description: 'Damaged asphalt, road craters, and pavement fractures affecting vehicles.'
  },
  {
    id: 'water_leak',
    label: 'Water Pipeline Leakage',
    icon: '💧',
    department: 'Water Supply',
    defaultSeverity: 'High',
    description: 'Burst pipeline, leaking municipal valve, or wasted drinking water stream.'
  },
  {
    id: 'electrical_wire',
    label: 'Electrical Hazard / Downed Wire',
    icon: '⚡',
    department: 'Electricity',
    defaultSeverity: 'Critical',
    description: 'Low-hanging power lines, exposed cables, sparking transformer, or shock risk.'
  },
  {
    id: 'garbage_overflow',
    label: 'Solid Waste / Garbage Overflow',
    icon: '🗑️',
    department: 'Sanitation and Waste Management',
    defaultSeverity: 'Medium',
    description: 'Uncollected community dumpster, open waste accumulation, or roadside trash.'
  },
  {
    id: 'streetlight_broken',
    label: 'Broken Streetlight',
    icon: '💡',
    department: 'Street Lighting',
    defaultSeverity: 'Medium',
    description: 'Non-functioning street lamp, damaged pole fixture, or unlit public roadway.'
  },
  {
    id: 'blocked_drainage',
    label: 'Blocked Drainage / Open Manhole',
    icon: '🌊',
    department: 'Drainage',
    defaultSeverity: 'Critical',
    description: 'Clogged storm drain, missing sewer lid, or street waterlogging hazard.'
  },
  {
    id: 'public_safety',
    label: 'Public Safety Hazard',
    icon: '⚠️',
    department: 'Public Safety',
    defaultSeverity: 'High',
    description: 'Broken pedestrian guardrails, structural cracks, or imminent physical danger.'
  },
  {
    id: 'other',
    label: 'Other Civic Defect',
    icon: '📌',
    department: 'Other',
    defaultSeverity: 'Low',
    description: 'Other civic or municipal maintenance issues not categorized above.'
  }
];

/**
 * Finds category object by label or ID
 */
export function findCategoryInfo(categoryNameOrId) {
  if (!categoryNameOrId) return CIVIC_CATEGORIES[0];
  const query = categoryNameOrId.toLowerCase();
  return (
    CIVIC_CATEGORIES.find(
      (c) =>
        c.id.toLowerCase() === query ||
        c.label.toLowerCase().includes(query) ||
        query.includes(c.id.toLowerCase())
    ) || {
      id: 'custom',
      label: categoryNameOrId,
      icon: '📌',
      department: 'Other',
      defaultSeverity: 'Medium'
    }
  );
}

/**
 * Validates photograph quality and classifies using Civic Vision Classifier.
 * Rejects selfies, blurry images, digital screenshots, and food/unrelated photos.
 *
 * @param {File} imageFile
 * @param {string} userNotes
 * @returns {Promise<{ success: boolean, analysis?: object, message?: string, code?: string }>}
 */
export const classifyImageWithAI = async (imageFile, userNotes = '') => {
  // Step 1: Client-Side Quality & Relevance Pre-Flight Check
  const quality = await validateCivicPhotograph(imageFile);
  if (!quality.valid) {
    return {
      success: false,
      code: quality.code,
      message: quality.error,
      metrics: quality.metrics
    };
  }

  // Step 2: Server-Side Edge Vision Classification & Cloud Storage Staging
  const formData = new FormData();
  formData.append('image', imageFile);
  if (userNotes) {
    formData.append('description', userNotes);
  }

  try {
    const response = await api.post('/ai/classify-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    return {
      success: true,
      message: response.data.message || 'Image classified successfully.',
      analysis: response.data.analysis,
      metrics: quality.metrics
    };
  } catch (err) {
    const errorMsg =
      err.response?.data?.message || err.message || 'Classification service failed.';
    const errorCode = err.response?.data?.code || 'CLASSIFICATION_FAILED';
    return {
      success: false,
      code: errorCode,
      message: errorMsg
    };
  }
};
