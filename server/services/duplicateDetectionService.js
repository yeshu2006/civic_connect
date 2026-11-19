import Issue from '../models/Issue.js';

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export function calculateHaversineDistance(lon1, lat1, lon2, lat2) {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Simple token-based Jaccard similarity between two texts
 */
function calculateTextSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;
  const words1 = new Set(
    text1
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const words2 = new Set(
    text2
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  if (words1.size === 0 || words2.size === 0) return 0;

  let intersection = 0;
  for (const w of words1) {
    if (words2.has(w)) intersection++;
  }

  const union = new Set([...words1, ...words2]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Checks for duplicate or similar civic issues
 * @param {Object} params
 * @param {number} params.longitude
 * @param {number} params.latitude
 * @param {string} params.department
 * @param {string} params.title
 * @param {string} params.description
 * @param {number} params.radiusMeters - Default 400 meters
 * @param {string} [params.excludeIssueId] - For updates, exclude current issue
 * @returns {Promise<Array>} Array of matching issues with similarity score and distance
 */
export async function findDuplicateIssues({
  longitude,
  latitude,
  department,
  title = '',
  description = '',
  radiusMeters = 500,
  excludeIssueId = null
}) {
  if (longitude === undefined || latitude === undefined) {
    return [];
  }

  const lon = parseFloat(longitude);
  const lat = parseFloat(latitude);

  if (isNaN(lon) || isNaN(lat)) return [];

  // Query issues within the radius using MongoDB $near or $geoWithin $centerSphere
  // radius in radians = meters / 6378100
  const radiusInRadians = radiusMeters / 6378100;

  const query = {
    location: {
      $geoWithin: {
        $centerSphere: [[lon, lat], radiusInRadians]
      }
    },
    // Exclude resolved or rejected issues older than 30 days if desired, or prioritize active
    status: { $nin: ['Rejected'] }
  };

  if (excludeIssueId) {
    query._id = { $ne: excludeIssueId };
  }

  const candidateIssues = await Issue.find(query)
    .populate('reportedBy', 'name email avatarUrl')
    .limit(20)
    .lean();

  const scoredDuplicates = candidateIssues.map((issue) => {
    const issueLon = issue.location.coordinates[0];
    const issueLat = issue.location.coordinates[1];
    const distanceMeters = calculateHaversineDistance(lon, lat, issueLon, issueLat);

    // Proximity score (0 to 1, 1 if very close)
    const proximityScore = Math.max(0, 1 - distanceMeters / radiusMeters);

    // Department match
    const deptMatch = issue.department === department ? 1 : 0.2;

    // Text similarity
    const titleSim = calculateTextSimilarity(title, issue.title);
    const descSim = calculateTextSimilarity(description, issue.description);
    const textSim = titleSim * 0.7 + descSim * 0.3;

    // Combined similarity score (0 to 100%)
    // Weightings: proximity 40%, department 30%, text 30%
    const compositeScore = Math.round(
      (proximityScore * 0.4 + deptMatch * 0.3 + textSim * 0.3) * 100
    );

    return {
      ...issue,
      distanceMeters,
      similarityScore: Math.min(100, Math.max(0, compositeScore))
    };
  });

  // Filter for meaningful similarity threshold (e.g. >= 35% or distance < 100m in same dept)
  return scoredDuplicates
    .filter((item) => item.similarityScore >= 35 || (item.distanceMeters < 150 && item.department === department))
    .sort((a, b) => b.similarityScore - a.similarityScore);
}
