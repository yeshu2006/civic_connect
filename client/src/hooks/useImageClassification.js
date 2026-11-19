/**
 * React Hook: useImageClassification
 * Encapsulates model initialization, download progress, image classification,
 * caching state, and graceful error handling.
 */

import { useState, useCallback, useRef } from 'react';
import {
  classifyCivicImageCLIP,
  getClassifierPipeline,
  checkWebGPUSupport,
  isBrowserSupported
} from '../services/imageClassifier.js';

export function useImageClassification() {
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelProgress, setModelProgress] = useState({
    status: 'idle',
    progress: 0,
    message: ''
  });
  const [isClassifying, setIsClassifying] = useState(false);
  const [classificationResult, setClassificationResult] = useState(null);
  const [error, setError] = useState(null);
  const [isModelReady, setIsModelReady] = useState(false);

  const isClassifyingRef = useRef(false);

  /**
   * Pre-loads the CLIP model on demand (lazy loading)
   */
  const loadModel = useCallback(async () => {
    if (isModelReady) return true;
    setIsModelLoading(true);
    setError(null);

    try {
      await getClassifierPipeline((progress) => {
        setModelProgress(progress);
      });
      setIsModelReady(true);
      return true;
    } catch (err) {
      console.error('Failed to load CLIP model:', err);
      setError('Could not initialize in-browser AI model. You can still select categories manually.');
      return false;
    } finally {
      setIsModelLoading(false);
    }
  }, [isModelReady]);

  /**
   * Runs zero-shot image classification on an image file or blob
   */
  const classify = useCallback(async (imageSource) => {
    if (!imageSource) return null;
    if (isClassifyingRef.current) return null; // Prevent concurrent requests

    if (!isBrowserSupported()) {
      setError('WebAssembly is not supported in this browser. Please select a category manually.');
      return null;
    }

    isClassifyingRef.current = true;
    setIsClassifying(true);
    setError(null);

    try {
      const result = await classifyCivicImageCLIP(imageSource, (progress) => {
        setModelProgress(progress);
        if (progress.status === 'downloading' || progress.status === 'init') {
          setIsModelLoading(true);
        } else if (progress.status === 'ready') {
          setIsModelLoading(false);
          setIsModelReady(true);
        }
      });

      setClassificationResult(result);
      setIsModelReady(true);
      setIsModelLoading(false);
      return result;
    } catch (err) {
      console.error('Classification error:', err);
      setError(
        err.message || 'In-browser AI classification failed. You can select the category manually.'
      );
      setClassificationResult(null);
      return null;
    } finally {
      isClassifyingRef.current = false;
      setIsClassifying(false);
    }
  }, []);

  /**
   * Clears classification results and error state
   */
  const clearClassification = useCallback(() => {
    setClassificationResult(null);
    setError(null);
  }, []);

  /**
   * Reclassifies an image (e.g. after retry)
   */
  const reclassify = useCallback(
    async (imageSource) => {
      clearClassification();
      return await classify(imageSource);
    },
    [classify, clearClassification]
  );

  return {
    classify,
    reclassify,
    clearClassification,
    loadModel,
    isModelLoading,
    modelProgress,
    isClassifying,
    classificationResult,
    error,
    isModelReady,
    hasWebGPU: checkWebGPUSupport()
  };
}
