/**
 * CivicConnect In-Browser Image Classifier
 * Powered by Hugging Face Transformers.js and CLIP ViT-B/32 (Xenova/clip-vit-base-patch32)
 *
 * Implements:
 *  - Lazy-loading singleton pattern
 *  - Memory caching of initialized model pipeline
 *  - Concurrent initialization prevention (in-flight promise lock)
 *  - WebGPU acceleration with seamless WASM fallback
 *  - Real-time download & initialization progress callback
 *  - Zero-shot cosine/softmax similarity extraction
 */

import { pipeline, env } from '@huggingface/transformers';
import {
  CIVIC_CATEGORIES,
  CANDIDATE_PROMPTS,
  CLASSIFICATION_THRESHOLDS,
  getCategoryByPrompt,
  getCategoryByNameOrId
} from '../config/issueCategories.js';

// Configure Transformers.js browser environment
if (typeof window !== 'undefined') {
  // In the browser, load model files from Hugging Face public repository
  env.allowLocalModels = false;
  // Use browser cache API for model weights (avoid redownloading across page visits)
  env.useBrowserCache = true;
}

const MODEL_NAME = 'Xenova/clip-vit-base-patch32';

// Singleton in-memory pipeline state
let cachedPipeline = null;
let pendingInitPromise = null;
let activeDevice = 'wasm';

/**
 * Checks if the browser supports WebGPU
 */
export function checkWebGPUSupport() {
  return typeof navigator !== 'undefined' && Boolean(navigator.gpu);
}

/**
 * Checks if browser has minimum capabilities for client-side WASM AI
 */
export function isBrowserSupported() {
  return typeof window !== 'undefined' && typeof WebAssembly !== 'undefined';
}

/**
 * Initializes or retrieves cached zero-shot image classification pipeline.
 * Ensures thread-safe singleton loading with progress feedback.
 *
 * @param {Function} progressCallback - (progressInfo) => void
 * @returns {Promise<Function>} - Initialized classification pipeline
 */
export async function getClassifierPipeline(progressCallback = null) {
  if (cachedPipeline) {
    if (progressCallback) {
      progressCallback({ status: 'ready', progress: 100, message: 'CLIP model ready in memory' });
    }
    return cachedPipeline;
  }

  // Prevent multiple simultaneous initialization requests
  if (pendingInitPromise) {
    return pendingInitPromise;
  }

  pendingInitPromise = (async () => {
    if (!isBrowserSupported()) {
      throw new Error('Your browser does not support WebAssembly required for client-side AI.');
    }

    let classifier = null;
    let deviceChoice = 'wasm';
    const supportsGPU = checkWebGPUSupport();

    // 1. Try WebGPU if supported
    if (supportsGPU) {
      try {
        if (progressCallback) {
          progressCallback({ status: 'init', progress: 5, message: 'Initializing WebGPU acceleration...' });
        }
        classifier = await pipeline('zero-shot-image-classification', MODEL_NAME, {
          device: 'webgpu',
          progress_callback: (p) => {
            if (progressCallback && p) {
              const pct = typeof p.progress === 'number' ? Math.round(p.progress) : 50;
              progressCallback({
                status: p.status || 'downloading',
                progress: pct,
                file: p.file || '',
                message: `Loading CLIP model (WebGPU): ${pct}%`
              });
            }
          }
        });
        deviceChoice = 'webgpu';
        console.log('CLIP model initialized successfully on WebGPU.');
      } catch (gpuErr) {
        console.warn('WebGPU initialization failed, falling back to WASM:', gpuErr.message || gpuErr);
        classifier = null;
      }
    }

    // 2. Fallback to WASM / CPU execution
    if (!classifier) {
      if (progressCallback) {
        progressCallback({ status: 'init', progress: 10, message: 'Loading CLIP model (WASM)...' });
      }

      classifier = await pipeline('zero-shot-image-classification', MODEL_NAME, {
        device: 'wasm',
        progress_callback: (p) => {
          if (progressCallback && p) {
            const pct = typeof p.progress === 'number' ? Math.round(p.progress) : 50;
            progressCallback({
              status: p.status || 'downloading',
              progress: pct,
              file: p.file || '',
              message: `Downloading CLIP model weights: ${pct}%`
            });
          }
        }
      });
      deviceChoice = 'wasm';
      console.log('CLIP model initialized successfully on WASM.');
    }

    cachedPipeline = classifier;
    activeDevice = deviceChoice;

    if (progressCallback) {
      progressCallback({ status: 'ready', progress: 100, message: 'CLIP model ready' });
    }

    return classifier;
  })();

  try {
    return await pendingInitPromise;
  } catch (err) {
    cachedPipeline = null;
    throw err;
  } finally {
    pendingInitPromise = null;
  }
}

/**
 * Prepares and downscales image to ~384px canvas for fast, memory-safe CLIP inference.
 * Prevents high-resolution camera images from exhausting browser WASM memory.
 */
function prepareImageForInference(imageSource) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const maxDim = 384;
      let { width, height } = img;
      if (width <= 0 || height <= 0) {
        return reject(new Error('Invalid image dimensions'));
      }

      const scale = Math.min(maxDim / width, maxDim / height, 1);
      const targetW = Math.max(Math.round(width * scale), 32);
      const targetH = Math.max(Math.round(height * scale), 32);

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, targetW, targetH);

      canvas.toBlob((blob) => {
        if (!blob) return resolve(img.src);
        const inferenceUrl = URL.createObjectURL(blob);
        resolve(inferenceUrl);
      }, 'image/jpeg', 0.88);
    };

    img.onerror = () => reject(new Error('Failed to load image for AI inference'));

    if (imageSource instanceof Blob || imageSource instanceof File) {
      img.src = URL.createObjectURL(imageSource);
    } else if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      reject(new Error('Unsupported image input type for inference'));
    }
  });
}

/**
 * Classifies an image using in-browser CLIP zero-shot classification.
 *
 * @param {File|Blob|string} imageInput - Selected photograph
 * @param {Function} progressCallback - Model download / load progress callback
 * @returns {Promise<object>} Structured classification result
 */
export async function classifyCivicImageCLIP(imageInput, progressCallback = null) {
  // Step 1: Initialize or retrieve cached pipeline
  const classifier = await getClassifierPipeline(progressCallback);

  // Step 2: Prepare downscaled inference image URL
  const inferenceUrl = await prepareImageForInference(imageInput);

  try {
    // Step 3: Run zero-shot image classification against candidate prompts
    const rawOutputs = await classifier(inferenceUrl, CANDIDATE_PROMPTS);

    if (!Array.isArray(rawOutputs) || rawOutputs.length === 0) {
      throw new Error('Classifier returned empty predictions.');
    }

    // Step 4: Map raw prompts to category objects and calibrate scores
    const mappedPredictions = rawOutputs.map((item) => {
      const cat = getCategoryByPrompt(item.label);
      return {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        department: cat.department,
        defaultSeverity: cat.defaultSeverity,
        isCivicIssue: cat.isCivicIssue,
        suggestedTitle: cat.suggestedTitle,
        suggestedDescription: cat.suggestedDescription,
        score: Math.round(item.score * 1000) / 1000,
        similarityPercent: Math.round(item.score * 100)
      };
    });

    // Sort descending by score
    mappedPredictions.sort((a, b) => b.score - a.score);

    const topPrediction = mappedPredictions[0];
    const topScore = topPrediction.score;

    // Check if "Not a Civic Issue" is leading or competitive
    const notCivicPrediction = mappedPredictions.find((p) => p.id === 'not_civic');
    const isNonCivicTriggered =
      topPrediction.id === 'not_civic' ||
      (notCivicPrediction && notCivicPrediction.score >= topScore * 0.95 && topScore < 0.22);

    // Filter civic alternatives (excluding top prediction and not_civic)
    const alternativeCategories = mappedPredictions
      .filter((p) => p.id !== topPrediction.id && p.id !== 'not_civic')
      .slice(0, 3);

    // Calibrate similarity level
    let similarityLevel = 'medium';
    if (topScore >= CLASSIFICATION_THRESHOLDS.HIGH_SIMILARITY) {
      similarityLevel = 'high';
    } else if (topScore < CLASSIFICATION_THRESHOLDS.LOW_SIMILARITY) {
      similarityLevel = 'low';
    }

    return {
      success: true,
      predictedCategory: isNonCivicTriggered ? 'Not a Civic Issue' : topPrediction.name,
      predictedCategoryId: isNonCivicTriggered ? 'not_civic' : topPrediction.id,
      predictedIcon: isNonCivicTriggered ? '🚫' : topPrediction.icon,
      confidenceScore: topScore,
      similarityPercent: topPrediction.similarityPercent,
      similarityLevel,
      isCivicIssue: !isNonCivicTriggered,
      suggestedDepartment: isNonCivicTriggered ? null : topPrediction.department,
      suggestedSeverity: isNonCivicTriggered ? 'Low' : topPrediction.defaultSeverity,
      suggestedTitle: isNonCivicTriggered ? '' : topPrediction.suggestedTitle,
      suggestedDescription: isNonCivicTriggered ? '' : topPrediction.suggestedDescription,
      topAlternatives: alternativeCategories,
      allPredictions: mappedPredictions.slice(0, 5),
      deviceUsed: activeDevice,
      modelName: MODEL_NAME
    };
  } finally {
    // Revoke inference blob URL to avoid memory leaks
    if (inferenceUrl.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(inferenceUrl);
      } catch (e) {}
    }
  }
}
