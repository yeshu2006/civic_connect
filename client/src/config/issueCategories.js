/**
 * CivicConnect AI Classification Configuration
 * Configurable categories, descriptive prompts for CLIP zero-shot classification,
 * department mappings, and similarity calibration thresholds.
 */

export const CIVIC_CATEGORIES = [
  {
    id: 'pothole',
    name: 'Pothole / Damaged Road',
    prompt: 'A photograph showing a large pothole, asphalt crater, or damaged road surface.',
    icon: '🕳️',
    department: 'Roads and Infrastructure',
    defaultSeverity: 'High',
    isCivicIssue: true,
    suggestedTitle: 'Pothole / Damaged Asphalt on Public Road',
    suggestedDescription: 'Sunken road surface crater and broken asphalt creating hazard for vehicular traffic.'
  },
  {
    id: 'garbage',
    name: 'Garbage Accumulation',
    prompt: 'A photograph showing uncollected garbage, overflowing trash dump, or solid waste on a public street.',
    icon: '🗑️',
    department: 'Sanitation and Waste Management',
    defaultSeverity: 'Medium',
    isCivicIssue: true,
    suggestedTitle: 'Uncollected Garbage and Waste Accumulation',
    suggestedDescription: 'Overflowing community trash and uncollected roadside waste posing hygiene and sanitation risk.'
  },
  {
    id: 'drainage',
    name: 'Overflowing Drainage',
    prompt: 'A photograph showing an overflowing open drainage gutter, sewage flood, or blocked storm canal.',
    icon: '🌊',
    department: 'Drainage',
    defaultSeverity: 'High',
    isCivicIssue: true,
    suggestedTitle: 'Overflowing Storm Drainage / Sewage Canal',
    suggestedDescription: 'Blocked stormwater gutter overflowing onto the public street, causing standing dirty water.'
  },
  {
    id: 'streetlight',
    name: 'Broken Streetlight',
    prompt: 'A photograph showing a broken streetlight, damaged pole fixture, or unlit public roadway lamp.',
    icon: '💡',
    department: 'Street Lighting',
    defaultSeverity: 'Medium',
    isCivicIssue: true,
    suggestedTitle: 'Non-Functional / Broken Streetlight Fixture',
    suggestedDescription: 'Damaged or inactive street lamp leaving the public road dark and unsafe at night.'
  },
  {
    id: 'water_leak',
    name: 'Water Leakage',
    prompt: 'A photograph showing a leaking clean water pipeline, burst pipe, or water supply hydrant gushing water.',
    icon: '💧',
    department: 'Water Supply',
    defaultSeverity: 'High',
    isCivicIssue: true,
    suggestedTitle: 'Municipal Clean Water Pipeline Leak',
    suggestedDescription: 'Burst or cracked municipal pipeline wasting potable water and creating localized street flooding.'
  },
  {
    id: 'footpath',
    name: 'Damaged Footpath',
    prompt: 'A photograph showing a damaged pedestrian footpath, cracked sidewalk tiles, or broken walkway curb.',
    icon: '🚶',
    department: 'Roads and Infrastructure',
    defaultSeverity: 'Medium',
    isCivicIssue: true,
    suggestedTitle: 'Broken Pedestrian Sidewalk / Footpath',
    suggestedDescription: 'Displaced paving slabs and broken curb on pedestrian walkway creating tripping hazard.'
  },
  {
    id: 'manhole',
    name: 'Open Manhole',
    prompt: 'A photograph showing an open, uncovered, or missing sewer manhole cover on a road or footpath.',
    icon: '⚠️',
    department: 'Drainage',
    defaultSeverity: 'Critical',
    isCivicIssue: true,
    suggestedTitle: 'Open / Missing Sewer Manhole Cover Hazard',
    suggestedDescription: 'Exposed open manhole hole without safety cover, creating severe danger for pedestrians and vehicles.'
  },
  {
    id: 'fallen_tree',
    name: 'Fallen Tree',
    prompt: 'A photograph showing a fallen tree or heavy broken branch blocking a public road or sidewalk.',
    icon: '🌳',
    department: 'Roads and Infrastructure',
    defaultSeverity: 'High',
    isCivicIssue: true,
    suggestedTitle: 'Fallen Tree / Heavy Branch Blocking Roadway',
    suggestedDescription: 'Fallen tree obstructing vehicular lane and pedestrian passage, requiring clearing intervention.'
  },
  {
    id: 'other',
    name: 'Other / Unrecognized',
    prompt: 'A photograph showing another public municipal infrastructure defect or civic maintenance issue.',
    icon: '📌',
    department: 'Other',
    defaultSeverity: 'Low',
    isCivicIssue: true,
    suggestedTitle: 'Reported Municipal Public Infrastructure Defect',
    suggestedDescription: 'Public infrastructure issue requiring inspection and maintenance by municipal authorities.'
  },
  {
    id: 'not_civic',
    name: 'Not a Civic Issue',
    prompt: 'A personal selfie portrait of a human face, a plate of food, indoor domestic furniture, pets, or screenshot.',
    icon: '🚫',
    department: null,
    defaultSeverity: 'Low',
    isCivicIssue: false,
    suggestedTitle: '',
    suggestedDescription: ''
  }
];

/**
 * Configurable CLIP similarity calibration thresholds
 */
export const CLASSIFICATION_THRESHOLDS = {
  HIGH_SIMILARITY: 0.28,     // Above 28% softmax weight -> High confidence suggestion
  MEDIUM_SIMILARITY: 0.16,   // Between 16% - 28% -> Show top alternatives
  LOW_SIMILARITY: 0.11,      // Below 16% -> Advise manual review
  NON_CIVIC_PENALTY_RATIO: 1.15 // If not_civic is higher or within 15% of top civic category, flag as non-civic
};

/**
 * Array of text prompts passed to zero-shot classification pipeline
 */
export const CANDIDATE_PROMPTS = CIVIC_CATEGORIES.map((c) => c.prompt);

/**
 * Maps a prompt back to its full category configuration
 */
export function getCategoryByPrompt(promptText) {
  return CIVIC_CATEGORIES.find((c) => c.prompt === promptText) || CIVIC_CATEGORIES.find((c) => c.id === 'other');
}

/**
 * Maps an ID or Name to its full category configuration
 */
export function getCategoryByNameOrId(identifier) {
  if (!identifier) return CIVIC_CATEGORIES[0];
  const query = identifier.toLowerCase().trim();
  return (
    CIVIC_CATEGORIES.find(
      (c) =>
        c.id.toLowerCase() === query ||
        c.name.toLowerCase() === query ||
        c.name.toLowerCase().includes(query) ||
        query.includes(c.name.toLowerCase())
    ) || CIVIC_CATEGORIES.find((c) => c.id === 'other')
  );
}

/**
 * Maps category name to municipal department
 */
export function mapCategoryToDepartment(categoryName) {
  const cat = getCategoryByNameOrId(categoryName);
  return cat ? cat.department : 'Other';
}
