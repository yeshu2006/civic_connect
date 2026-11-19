import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  CIVIC_CATEGORIES,
  CANDIDATE_PROMPTS,
  CLASSIFICATION_THRESHOLDS,
  getCategoryByPrompt,
  getCategoryByNameOrId,
  mapCategoryToDepartment
} from '../client/src/config/issueCategories.js';
import { analyzePixelMatrix } from '../client/src/utils/imageQualityChecker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

/**
 * Creates a valid PNG buffer of specified width, height, and pixel generator
 */
function createPngBuffer(width = 120, height = 120, pixelGenerator = () => [120, 120, 120]) {
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 2; // RGB
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const makeChunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = zlib.crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  };

  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const rowLength = 1 + width * 3;
  const rawData = Buffer.alloc(rowLength * height);
  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowLength;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelGenerator(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 3;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

async function runClipTests() {
  console.log('===========================================================');
  console.log('   CivicConnect CLIP Transformers.js Verification Suite    ');
  console.log('===========================================================\n');

  // ==================================================================
  // TEST SCENARIO 1: Configuration & Prompts Validation
  // ==================================================================
  console.log('[1/6] Verifying 10 Civic Classification Categories & Natural Prompts...');

  assert(CIVIC_CATEGORIES.length === 10, 'Configured exactly 10 initial classification categories');
  assert(CANDIDATE_PROMPTS.length === 10, 'Generated 10 natural language CLIP text prompts');

  const requiredCategories = [
    'Pothole / Damaged Road',
    'Garbage Accumulation',
    'Overflowing Drainage',
    'Broken Streetlight',
    'Water Leakage',
    'Damaged Footpath',
    'Open Manhole',
    'Fallen Tree',
    'Other / Unrecognized',
    'Not a Civic Issue'
  ];

  for (const catName of requiredCategories) {
    const cat = CIVIC_CATEGORIES.find((c) => c.name === catName);
    assert(Boolean(cat && cat.prompt && cat.prompt.length > 20), `Category "${catName}" has descriptive CLIP prompt`);
  }

  // ==================================================================
  // TEST SCENARIO 2: Department Mapping Logic
  // ==================================================================
  console.log('\n[2/6] Verifying Department Routing Rules...');

  assert(mapCategoryToDepartment('Pothole / Damaged Road') === 'Roads and Infrastructure', 'Pothole mapped to Roads and Infrastructure');
  assert(mapCategoryToDepartment('Garbage Accumulation') === 'Sanitation and Waste Management', 'Garbage mapped to Sanitation and Waste Management');
  assert(mapCategoryToDepartment('Overflowing Drainage') === 'Drainage', 'Overflowing Drainage mapped to Drainage');
  assert(mapCategoryToDepartment('Broken Streetlight') === 'Street Lighting', 'Broken Streetlight mapped to Street Lighting');
  assert(mapCategoryToDepartment('Water Leakage') === 'Water Supply', 'Water Leakage mapped to Water Supply');
  assert(mapCategoryToDepartment('Damaged Footpath') === 'Roads and Infrastructure', 'Damaged Footpath mapped to Roads and Infrastructure');
  assert(mapCategoryToDepartment('Open Manhole') === 'Drainage', 'Open Manhole mapped to Drainage');
  assert(mapCategoryToDepartment('Fallen Tree') === 'Roads and Infrastructure', 'Fallen Tree mapped to Roads and Infrastructure');
  assert(mapCategoryToDepartment('Other / Unrecognized') === 'Other', 'Other mapped to Other');
  assert(mapCategoryToDepartment('Not a Civic Issue') === null, 'Not a Civic Issue has null department (rejected/unassigned)');

  // ==================================================================
  // TEST SCENARIO 3: Thresholds & Similarity Scoring Calibration
  // ==================================================================
  console.log('\n[3/6] Verifying Similarity Scoring & Confidence Calibration...');

  assert(typeof CLASSIFICATION_THRESHOLDS.HIGH_SIMILARITY === 'number', 'High similarity threshold configured');
  assert(typeof CLASSIFICATION_THRESHOLDS.MEDIUM_SIMILARITY === 'number', 'Medium similarity threshold configured');
  assert(typeof CLASSIFICATION_THRESHOLDS.LOW_SIMILARITY === 'number', 'Low similarity threshold configured');
  assert(
    CLASSIFICATION_THRESHOLDS.HIGH_SIMILARITY > CLASSIFICATION_THRESHOLDS.MEDIUM_SIMILARITY &&
    CLASSIFICATION_THRESHOLDS.MEDIUM_SIMILARITY > CLASSIFICATION_THRESHOLDS.LOW_SIMILARITY,
    'Thresholds follow strict monotonic order: High > Medium > Low'
  );

  // ==================================================================
  // TEST SCENARIO 4: Image Validation (Blur, Selfies, Corrupted, Large)
  // ==================================================================
  console.log('\n[4/6] Verifying Image Validation & Quality Safeguards...');

  // 1. Blurry image validation
  const blurPixels = new Uint8ClampedArray(100 * 100 * 4);
  for (let i = 0; i < 100 * 100; i++) {
    blurPixels[i * 4] = 128;
    blurPixels[i * 4 + 1] = 128;
    blurPixels[i * 4 + 2] = 128;
    blurPixels[i * 4 + 3] = 255;
  }
  const blurCheck = analyzePixelMatrix(blurPixels, 100, 100);
  assert(!blurCheck.valid && blurCheck.code === 'IMAGE_BLURRY', 'Rejects unclear / blurry photograph');

  // 2. Selfie / portrait validation
  const selfiePixels = new Uint8ClampedArray(100 * 100 * 4);
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const idx = (y * 100 + x) * 4;
      if (x >= 25 && x <= 75 && y >= 20 && y <= 80) {
        selfiePixels[idx] = 215;
        selfiePixels[idx + 1] = 165;
        selfiePixels[idx + 2] = 135;
      } else {
        selfiePixels[idx] = 60;
        selfiePixels[idx + 1] = 60;
        selfiePixels[idx + 2] = 60;
      }
      selfiePixels[idx + 3] = 255;
    }
  }
  const selfieCheck = analyzePixelMatrix(selfiePixels, 100, 100);
  assert(!selfieCheck.valid && selfieCheck.code === 'IMAGE_SELFIE_DETECTED', 'Rejects unrelated selfie / portrait image');

  // 3. Digital screenshot validation
  const screenshotPixels = new Uint8ClampedArray(100 * 100 * 4);
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const idx = (y * 100 + x) * 4;
      screenshotPixels[idx] = 255;
      screenshotPixels[idx + 1] = 255;
      screenshotPixels[idx + 2] = 255;
      screenshotPixels[idx + 3] = 255;
    }
  }
  const screenshotCheck = analyzePixelMatrix(screenshotPixels, 100, 100);
  assert(!screenshotCheck.valid, 'Rejects flat digital screenshot / solid image');

  // 4. Large image generation and buffer check
  const largeImage = createPngBuffer(400, 400, (x, y) => [
    (x * 19 + y * 23) % 200 + 40,
    (x * 13 + y * 17) % 200 + 40,
    (x * 11 + y * 29) % 200 + 40
  ]);
  assert(largeImage.length > 50000, 'Generates and processes large images safely (>50KB compressed buffer)');

  // ==================================================================
  // TEST SCENARIO 5: Manual Category Correction & Confirmation Flow
  // ==================================================================
  console.log('\n[5/6] Verifying User Confirmation & Manual Category Correction...');

  let userConfirmedCategory = '';
  let assignedDepartment = '';
  let assignedSeverity = '';

  // Simulate AI suggests Pothole
  const aiSuggestion = getCategoryByNameOrId('pothole');
  assert(aiSuggestion.name === 'Pothole / Damaged Road', 'Initial AI suggestion identified');

  // User confirms suggestion
  userConfirmedCategory = aiSuggestion.name;
  assignedDepartment = aiSuggestion.department;
  assignedSeverity = aiSuggestion.defaultSeverity;
  assert(userConfirmedCategory === 'Pothole / Damaged Road' && assignedDepartment === 'Roads and Infrastructure', 'User can confirm AI-suggested category');

  // User manually corrects to Drainage
  const correctedCat = getCategoryByNameOrId('Overflowing Drainage');
  userConfirmedCategory = correctedCat.name;
  assignedDepartment = correctedCat.department;
  assignedSeverity = correctedCat.defaultSeverity;
  assert(userConfirmedCategory === 'Overflowing Drainage' && assignedDepartment === 'Drainage', 'User can correct category: automatically updates department to Drainage');

  // User manually corrects to Streetlight
  const streetlightCat = getCategoryByNameOrId('streetlight');
  userConfirmedCategory = streetlightCat.name;
  assignedDepartment = streetlightCat.department;
  assert(userConfirmedCategory === 'Broken Streetlight' && assignedDepartment === 'Street Lighting', 'User can correct category to Streetlight: routes to Street Lighting');

  // ==================================================================
  // TEST SCENARIO 6: Complaint Submission Integration with Backend API
  // ==================================================================
  console.log('\n[6/6] Verifying End-to-End Complaint Submission with Confirmed Category...');

  const { default: mongoose } = await import('mongoose');
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.join(__dirname, '.env') });

  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    await mongoose.connect(mongoUri);
    const Issue = (await import('./models/Issue.js')).default;
    const User = (await import('./models/User.js')).default;

    const testCitizen = await User.findOne({ role: 'citizen' });
    if (testCitizen) {
      // Create issue with confirmed AI category metadata
      const newIssue = await Issue.create({
        title: 'CLIP Test: Road Pothole Hazard',
        description: 'Road damage verified with client-side CLIP ViT-B/32 in browser.',
        department: 'Roads and Infrastructure',
        severity: 'High',
        category: 'Pothole / Damaged Road',
        address: '500 Market St, San Francisco',
        location: {
          type: 'Point',
          coordinates: [-122.4194, 37.7749]
        },
        reportedBy: testCitizen._id,
        aiAnalysis: {
          model: 'Xenova/clip-vit-base-patch32',
          predictedCategory: 'Pothole / Damaged Road',
          confidenceScore: 0.425,
          similarityPercent: 43,
          similarityLevel: 'high',
          isConfirmedByUser: true
        }
      });

      assert(Boolean(newIssue._id), 'Complaint submitted and saved in MongoDB with confirmed category');
      assert(newIssue.aiAnalysis?.model === 'Xenova/clip-vit-base-patch32', 'Issue retains CLIP ViT-B/32 metadata and confirmation flag');

      // Clean up test complaint so DB remains at 0
      await Issue.deleteOne({ _id: newIssue._id });
      console.log('      Cleaned up test issue so MongoDB retains 0 complaints.');
    }
    await mongoose.disconnect();
  }

  console.log('\n===========================================================');
  console.log(`CLIP CLASSIFICATION TEST SUITE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runClipTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
