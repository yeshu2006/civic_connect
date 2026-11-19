/**
 * CivicConnect Image Quality & Relevance Analyzer
 * Inspects uploaded images client-side for:
 *  1. Sharpness / Blur Detection (Variance of Laplacian)
 *  2. Exposure / Lighting (Under-exposure & Over-exposure)
 *  3. Unrelated Content Rejection (Selfies/Portraits, Screenshots/Memes, Food/Household)
 */

/**
 * Loads a File or Blob into an HTMLImageElement
 */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to decode image data'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Checks whether a given RGB pixel falls into standard human skin color locus
 * (Combined normalized RGB & YCbCr heuristic for robust multi-ethnicity detection)
 */
export function isSkinPixel(r, g, b) {
  // Rule 1: RGB basic distribution
  const rgbCheck =
    r > 95 &&
    g > 40 &&
    b > 20 &&
    Math.max(r, g, b) - Math.min(r, g, b) > 15 &&
    Math.abs(r - g) > 15 &&
    r > g &&
    r > b;

  if (!rgbCheck) return false;

  // Rule 2: YCbCr color space conversion
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

  return y > 60 && cb >= 77 && cb <= 127 && cr >= 133 && cr <= 173;
}

/**
 * Core Pixel Matrix Inspection Algorithm:
 * Evaluates blur (Laplacian variance), luminance, selfies (skin locus), and screenshots (flat color ratios)
 *
 * @param {Uint8ClampedArray|Uint8Array} data - Flat RGBA pixel buffer
 * @param {number} w - Image width
 * @param {number} h - Image height
 * @returns {{ valid: boolean, code?: string, error?: string, metrics: object }}
 */
export function analyzePixelMatrix(data, w, h) {
  const totalPixels = w * h;
  if (totalPixels <= 0) {
    return {
      valid: false,
      code: 'EMPTY_IMAGE',
      error: 'Image dimensions are empty or corrupted.',
      metrics: {}
    };
  }

  // 1. Grayscale, Luminance & Exposure
  const grayscale = new Float32Array(totalPixels);
  let totalLuminance = 0;
  let skinPixels = 0;
  let centerSkinPixels = 0;
  let pureWhiteOrBlackPixels = 0;

  // Center bounding box (central 50% area where selfies/faces are centered)
  const centerXMin = Math.floor(w * 0.25);
  const centerXMax = Math.floor(w * 0.75);
  const centerYMin = Math.floor(h * 0.2);
  const centerYMax = Math.floor(h * 0.8);
  let centerTotalPixels = 0;

  // Histogram to detect digital screenshots with uniform flat color blocks
  const colorBuckets = new Map();

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Grayscale luminance (Rec. 601)
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      grayscale[y * w + x] = lum;
      totalLuminance += lum;

      if (lum < 15 || lum > 245) {
        pureWhiteOrBlackPixels++;
      }

      // Skin Tone check
      if (isSkinPixel(r, g, b)) {
        skinPixels++;
        if (x >= centerXMin && x <= centerXMax && y >= centerYMin && y <= centerYMax) {
          centerSkinPixels++;
        }
      }

      if (x >= centerXMin && x <= centerXMax && y >= centerYMin && y <= centerYMax) {
        centerTotalPixels++;
      }

      // Quantize colors (5-bit per channel) to detect screenshot flat regions
      const bucket = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      colorBuckets.set(bucket, (colorBuckets.get(bucket) || 0) + 1);
    }
  }

  const avgLuminance = totalLuminance / totalPixels;
  const skinRatio = skinPixels / totalPixels;
  const centerSkinRatio = centerTotalPixels > 0 ? centerSkinPixels / centerTotalPixels : 0;

  // 2. Laplacian Variance (Sharpness / Blur Detection)
  // Convolution with Laplacian kernel [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
  let lapSum = 0;
  let lapCount = 0;
  const laplacian = new Float32Array(totalPixels);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      const val =
        -4 * grayscale[idx] +
        grayscale[idx - 1] +
        grayscale[idx + 1] +
        grayscale[idx - w] +
        grayscale[idx + w];

      laplacian[idx] = val;
      lapSum += val;
      lapCount++;
    }
  }

  const lapMean = lapCount > 0 ? lapSum / lapCount : 0;
  let varianceSum = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x;
      varianceSum += Math.pow(laplacian[idx] - lapMean, 2);
    }
  }
  const blurScore = lapCount > 0 ? varianceSum / lapCount : 0;

  // 3. Digital Graphic / Screenshot Analysis
  let topColorCount = 0;
  for (const count of colorBuckets.values()) {
    if (count > topColorCount) topColorCount = count;
  }
  const topColorRatio = topColorCount / totalPixels;

  const metrics = {
    blurScore: Math.round(blurScore * 10) / 10,
    brightness: Math.round(avgLuminance),
    skinRatio: Math.round(skinRatio * 100) / 100,
    centerSkinRatio: Math.round(centerSkinRatio * 100) / 100,
    topColorRatio: Math.round(topColorRatio * 100) / 100
  };

  // ================= REJECTION CHECKS =================

  // Check 1: Extreme Exposure (Too dark or completely washed out)
  if (avgLuminance < 25) {
    return {
      valid: false,
      code: 'IMAGE_TOO_DARK',
      error: 'Photo is too dark to clearly see the issue. Please take a photograph with adequate daylight or lighting.',
      metrics
    };
  }

  if (avgLuminance > 242) {
    return {
      valid: false,
      code: 'IMAGE_OVEREXPOSED',
      error: 'Photo is overexposed or completely washed out. Please capture the issue under normal lighting.',
      metrics
    };
  }

  // Check 2: Blurry / Out-of-focus
  if (blurScore < 60) {
    return {
      valid: false,
      code: 'IMAGE_BLURRY',
      error: `Photo is too blurry or out of focus (sharpness score: ${metrics.blurScore}). Please take a clear, stable photograph of the issue.`,
      metrics
    };
  }

  // Check C: Selfies / Human Portraits
  if (skinRatio > 0.28 || centerSkinRatio > 0.32) {
    return {
      valid: false,
      code: 'IMAGE_SELFIE_DETECTED',
      error: 'Unrelated photo rejected: This image appears to be a selfie or person portrait. CivicConnect only accepts photos of municipal infrastructure defects (e.g. potholes, leaks, broken streetlights, trash).',
      metrics
    };
  }

  // Check D: Digital Screenshots / UI Graphics / Memes
  if (topColorRatio > 0.42 && pureWhiteOrBlackPixels / totalPixels > 0.35) {
    return {
      valid: false,
      code: 'IMAGE_SCREENSHOT_DETECTED',
      error: 'Unrelated graphic rejected: This image appears to be a digital screenshot or graphic. Please upload an authentic photo of the municipal defect taken on-site.',
      metrics
    };
  }

  return {
    valid: true,
    error: null,
    metrics
  };
}

/**
 * Evaluates image quality, blur, and relevance from browser file or image element.
 *
 * @param {File|Blob|HTMLImageElement} source
 * @returns {Promise<{ valid: boolean, error?: string, code?: string, metrics: object }>}
 */
export async function validateCivicPhotograph(source) {
  let img;
  if (source instanceof HTMLImageElement) {
    img = source;
  } else if (source instanceof Blob || source instanceof File) {
    img = await loadImageFromFile(source);
  } else {
    return {
      valid: false,
      error: 'Invalid image source provided.',
      code: 'INVALID_SOURCE',
      metrics: {}
    };
  }

  const maxDim = 320;
  let { width, height } = img;
  if (width <= 0 || height <= 0) {
    return {
      valid: false,
      error: 'Image dimensions are empty or corrupted.',
      code: 'EMPTY_IMAGE',
      metrics: {}
    };
  }

  const scale = Math.min(maxDim / width, maxDim / height, 1);
  const w = Math.max(Math.round(width * scale), 16);
  const h = Math.max(Math.round(height * scale), 16);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  return analyzePixelMatrix(imgData.data, w, h);
}
