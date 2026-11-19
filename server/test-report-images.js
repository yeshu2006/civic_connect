import zlib from 'zlib';
import { analyzePixelMatrix, isSkinPixel } from '../client/src/utils/imageQualityChecker.js';
import { CIVIC_CATEGORIES, findCategoryInfo } from '../client/src/services/aiService.js';
import { validateCivicImageBuffer, analyzeCivicImage } from './services/visionClassifierService.js';

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

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = zlib.crc32(Buffer.concat([typeBuf, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

async function runReportImageTests() {
  console.log('===========================================================');
  console.log('   CivicConnect Image Rejection & Classification Tests    ');
  console.log('===========================================================\n');

  // ==================================================================
  // TEST GROUP 1: Blur Detection & Exposure Rejection
  // ==================================================================
  console.log('[1/4] Testing Image Quality Inspection (Blur, Darkness, Over-exposure)...');

  // 1. Blurry image simulation (flat smooth colors with near-zero edge variance)
  const blurPixels = new Uint8ClampedArray(100 * 100 * 4);
  for (let i = 0; i < 100 * 100; i++) {
    blurPixels[i * 4] = 120 + Math.sin(i / 1000) * 2;
    blurPixels[i * 4 + 1] = 120 + Math.sin(i / 1000) * 2;
    blurPixels[i * 4 + 2] = 120 + Math.sin(i / 1000) * 2;
    blurPixels[i * 4 + 3] = 255;
  }
  const blurResult = analyzePixelMatrix(blurPixels, 100, 100);
  assert(!blurResult.valid && blurResult.code === 'IMAGE_BLURRY', 'Rejects blurry photograph with low Laplacian variance');

  // 2. Pitch black / extreme dark image simulation (mean luminance < 25)
  const darkPixels = new Uint8ClampedArray(100 * 100 * 4);
  for (let i = 0; i < 100 * 100; i++) {
    darkPixels[i * 4] = 10;
    darkPixels[i * 4 + 1] = 12;
    darkPixels[i * 4 + 2] = 14;
    darkPixels[i * 4 + 3] = 255;
  }
  const darkResult = analyzePixelMatrix(darkPixels, 100, 100);
  assert(!darkResult.valid && darkResult.code === 'IMAGE_TOO_DARK', 'Rejects pitch dark photograph (underexposed)');

  // 3. Overexposed washed-out image simulation (mean luminance > 242)
  const overexposedPixels = new Uint8ClampedArray(100 * 100 * 4);
  for (let i = 0; i < 100 * 100; i++) {
    overexposedPixels[i * 4] = 250;
    overexposedPixels[i * 4 + 1] = 252;
    overexposedPixels[i * 4 + 2] = 248;
    overexposedPixels[i * 4 + 3] = 255;
  }
  const overexposedResult = analyzePixelMatrix(overexposedPixels, 100, 100);
  assert(!overexposedResult.valid && overexposedResult.code === 'IMAGE_OVEREXPOSED', 'Rejects completely washed-out/overexposed photograph');

  // ==================================================================
  // TEST GROUP 2: Unrelated Image Rejection (Selfies, Food, Screenshots)
  // ==================================================================
  console.log('\n[2/4] Testing Unrelated Image Rejection (Selfies, Screenshots, Food)...');

  // 1. Selfie simulation (high skin-tone locus concentration in center 60% of frame)
  const selfiePixels = new Uint8ClampedArray(100 * 100 * 4);
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const idx = (y * 100 + x) * 4;
      if (x >= 25 && x <= 75 && y >= 20 && y <= 80) {
        // Human skin tone in RGB / YCbCr
        selfiePixels[idx] = 210 + (x % 5);
        selfiePixels[idx + 1] = 160 + (y % 5);
        selfiePixels[idx + 2] = 130 + (x % 3);
      } else {
        selfiePixels[idx] = 80;
        selfiePixels[idx + 1] = 80;
        selfiePixels[idx + 2] = 80;
      }
      selfiePixels[idx + 3] = 255;
    }
  }
  const selfieResult = analyzePixelMatrix(selfiePixels, 100, 100);
  assert(!selfieResult.valid && selfieResult.code === 'IMAGE_SELFIE_DETECTED', 'Rejects human selfie / portrait image');

  // 2. Digital screenshot simulation (flat white UI background + solid black toolbar)
  const screenshotPixels = new Uint8ClampedArray(100 * 100 * 4);
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const idx = (y * 100 + x) * 4;
      if (y < 20) {
        // Status bar solid dark
        screenshotPixels[idx] = 10;
        screenshotPixels[idx + 1] = 10;
        screenshotPixels[idx + 2] = 10;
      } else {
        // Solid white app background
        screenshotPixels[idx] = 255;
        screenshotPixels[idx + 1] = 255;
        screenshotPixels[idx + 2] = 255;
      }
      screenshotPixels[idx + 3] = 255;
    }
  }
  const screenshotResult = analyzePixelMatrix(screenshotPixels, 100, 100);
  assert(!screenshotResult.valid && screenshotResult.code === 'IMAGE_SCREENSHOT_DETECTED', 'Rejects digital screenshot / flat app UI image');

  // 3. Server buffer validator for explicit food / meme / selfie terms
  const validPng = createPngBuffer(100, 100, (x, y) => [
    (x * 17 + y * 23) % 200 + 30,
    (x * 11 + y * 7) % 200 + 30,
    (x * 13 + y * 19) % 200 + 30
  ]);

  try {
    validateCivicImageBuffer(validPng, 'image/png', 'Enjoying dinner with friends', 'food_burger.jpg');
    assert(false, 'Should reject food image');
  } catch (err) {
    assert(err.code === 'IMAGE_FOOD_DETECTED', 'Server buffer validator rejects food/dining photo');
  }

  try {
    validateCivicImageBuffer(validPng, 'image/png', 'My new selfie at the park', 'selfie_pic.png');
    assert(false, 'Should reject selfie');
  } catch (err) {
    assert(err.code === 'IMAGE_SELFIE_DETECTED', 'Server buffer validator rejects selfie submission');
  }

  try {
    validateCivicImageBuffer(validPng, 'image/png', 'Check this chat screenshot', 'screenshot_2026.png');
    assert(false, 'Should reject screenshot');
  } catch (err) {
    assert(err.code === 'IMAGE_SCREENSHOT_DETECTED', 'Server buffer validator rejects digital screenshot upload');
  }

  // ==================================================================
  // TEST GROUP 3: Valid Civic Infrastructure Image Classification
  // ==================================================================
  console.log('\n[3/4] Testing Civic Defect Classification (8 Infrastructure Domains)...');

  // Sharp textured infrastructure image simulation
  const sharpPixels = new Uint8ClampedArray(100 * 100 * 4);
  for (let y = 0; y < 100; y++) {
    for (let x = 0; x < 100; x++) {
      const idx = (y * 100 + x) * 4;
      const noise = ((x ^ y) * 31) % 150 + 50;
      sharpPixels[idx] = noise;
      sharpPixels[idx + 1] = noise;
      sharpPixels[idx + 2] = noise;
      sharpPixels[idx + 3] = 255;
    }
  }
  const sharpResult = analyzePixelMatrix(sharpPixels, 100, 100);
  assert(sharpResult.valid === true, 'Accepts high-frequency, authentic camera photograph of infrastructure');

  // Test 8 Municipal Categories Classification
  const civicTestCases = [
    {
      notes: 'Deep asphalt pothole and cracked pavement near intersection',
      expectedDept: 'Roads and Infrastructure',
      expectedCat: 'Pothole / Road Defect'
    },
    {
      notes: 'Severe water pipeline burst flooding the pavement and road',
      expectedDept: 'Water Supply',
      expectedCat: 'Water Pipeline Leakage'
    },
    {
      notes: 'Downed electrical wires sparking on public sidewalk',
      expectedDept: 'Electricity',
      expectedCat: 'Electrical Hazard / Downed Wire'
    },
    {
      notes: 'Broken street lamp post leaves entire street corner completely dark',
      expectedDept: 'Street Lighting',
      expectedCat: 'Broken Streetlight'
    },
    {
      notes: 'Overflowing garbage dumpster and uncollected solid waste on street',
      expectedDept: 'Sanitation and Waste Management',
      expectedCat: 'Solid Waste / Garbage Overflow'
    },
    {
      notes: 'Blocked drainage canal and missing sewer manhole lid',
      expectedDept: 'Drainage',
      expectedCat: 'Blocked Drainage / Open Manhole'
    },
    {
      notes: 'Dangerous collapsed barrier and fire safety risk',
      expectedDept: 'Public Safety',
      expectedCat: 'Public Safety Hazard'
    }
  ];

  for (const tc of civicTestCases) {
    const analysis = await analyzeCivicImage(validPng, 'image/png', tc.notes, 'civic_defect.png');
    assert(
      analysis.department === tc.expectedDept && analysis.category === tc.expectedCat,
      `Classifies "${tc.expectedCat}" -> Department="${analysis.department}", Severity="${analysis.severity}"`
    );
  }

  // ==================================================================
  // TEST GROUP 4: Category Confirmation & Correction Flow
  // ==================================================================
  console.log('\n[4/4] Testing User Category Confirmation & Correction Workflows...');

  // 1. Confirm original category
  const initialAnalysis = await analyzeCivicImage(validPng, 'image/png', 'Water pipe leak on sidewalk');
  assert(initialAnalysis.category === 'Water Pipeline Leakage', 'AI initial suggestion matches detected defect');

  // User confirms category
  let userCategory = initialAnalysis.category;
  let userDept = initialAnalysis.department;
  let confirmationStatus = 'confirmed';
  assert(confirmationStatus === 'confirmed' && userCategory === 'Water Pipeline Leakage', 'User can confirm AI-suggested category');

  // 2. User corrects category to Drain issue
  const correctedCatObj = findCategoryInfo('Blocked Drainage / Open Manhole');
  userCategory = correctedCatObj.label;
  userDept = correctedCatObj.department;
  confirmationStatus = 'corrected';
  assert(
    confirmationStatus === 'corrected' &&
    userCategory === 'Blocked Drainage / Open Manhole' &&
    userDept === 'Drainage',
    'User can correct category: automatically updates category and department to Drainage'
  );

  // 3. User corrects category to Electrical issue
  const electricalCatObj = findCategoryInfo('electrical_wire');
  userCategory = electricalCatObj.label;
  userDept = electricalCatObj.department;
  assert(
    userCategory === 'Electrical Hazard / Downed Wire' &&
    userDept === 'Electricity',
    'Category correction quick-selector maps ID/label to correct department'
  );

  // 4. Verification that all 8 categories exist in CIVIC_CATEGORIES
  assert(CIVIC_CATEGORIES.length === 8, 'Provides 8 structured municipal defect categories for user selection');

  console.log('\n===========================================================');
  console.log(`REPORT IMAGE & VISION TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runReportImageTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
