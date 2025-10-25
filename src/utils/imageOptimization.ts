/**
 * Utility functions for image optimization on mobile
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

/**
 * Generate srcset for responsive images
 */
export const generateSrcSet = (baseUrl: string, sizes: number[]): string => {
  return sizes.map(size => `${baseUrl}?w=${size} ${size}w`).join(', ');
};

/**
 * Get optimal image loading strategy based on viewport position
 */
export const getImageLoadingStrategy = (element: HTMLElement): 'eager' | 'lazy' => {
  if (typeof window === 'undefined') return 'lazy';
  
  const rect = element.getBoundingClientRect();
  const isAboveFold = rect.top < window.innerHeight;
  
  return isAboveFold ? 'eager' : 'lazy';
};

/**
 * Create a blur placeholder for images
 */
export const createBlurPlaceholder = (width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  
  // Simple gradient placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f0f0f0');
  gradient.addColorStop(1, '#e0e0e0');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  return canvas.toDataURL('image/png');
};

/**
 * Check if WebP is supported
 */
export const isWebPSupported = (() => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
})();

/**
 * Get optimal image format based on browser support
 */
export const getOptimalImageFormat = (): 'webp' | 'jpeg' => {
  return isWebPSupported ? 'webp' : 'jpeg';
};
