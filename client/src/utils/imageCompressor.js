/**
 * Client-side image compressor for low-bandwidth and mobile connections.
 * Resizes large smartphone photos (5-15MB) to web-optimized dimensions (100-250KB)
 * before transmission, dramatically accelerating uploads on slow/intermittent internet.
 * 
 * @param {File} file - Original user-selected file
 * @param {Object} options
 * @param {number} [options.maxWidth=1280] - Maximum width
 * @param {number} [options.maxHeight=1280] - Maximum height
 * @param {number} [options.quality=0.82] - Compression quality (0 to 1)
 * @returns {Promise<File>} Compressed File object
 */
export async function compressImageForLowBandwidth(file, options = {}) {
  const { maxWidth = 1280, maxHeight = 1280, quality = 0.82 } = options;

  // If not an image or SVG/GIF, return as is
  if (!file || !file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return file;
  }

  // If already under 200KB, skip re-compression to save battery & CPU
  if (file.size <= 200 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file); // Fail-safe fallback to original
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        // Smooth downsampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob || blob.size >= file.size) {
              return resolve(file); // Keep original if compression didn't help
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            console.log(
              `[Low-Internet Optimizer] Compressed photo from ${(file.size / 1024).toFixed(0)}KB to ${(compressedFile.size / 1024).toFixed(0)}KB (${(((file.size - compressedFile.size) / file.size) * 100).toFixed(0)}% bandwidth saved)`
            );
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
