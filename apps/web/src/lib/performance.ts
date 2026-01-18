/**
 * Performance monitoring utilities
 */

// Measure component render time
export function measureRender(componentName: string) {
  if (typeof window === 'undefined' || !window.performance) return;

  const startMark = `${componentName}-start`;
  const endMark = `${componentName}-end`;
  const measureName = `${componentName}-render`;

  performance.mark(startMark);

  return () => {
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);

    const measure = performance.getEntriesByName(measureName)[0];
    if (measure && process.env.NODE_ENV === 'development') {
      // Only log in development
      // eslint-disable-next-line no-console
      console.debug(`[Performance] ${componentName} rendered in ${measure.duration.toFixed(2)}ms`);
    }

    // Cleanup
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);
  };
}

// Measure API call duration
export async function measureApiCall<T>(
  name: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  
  try {
    const result = await apiCall();
    if (process.env.NODE_ENV === 'development') {
      const duration = performance.now() - start;
      // eslint-disable-next-line no-console
      console.debug(`[Performance] API call "${name}" took ${duration.toFixed(2)}ms`);
    }
    return result;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      const duration = performance.now() - start;
      // eslint-disable-next-line no-console
      console.error(`[Performance] API call "${name}" failed after ${duration.toFixed(2)}ms`);
    }
    throw error;
  }
}

// Report Web Vitals
export function reportWebVitals(metric: any) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.debug('[Web Vitals]', metric);
  }
  // In production, you could send to analytics service
  // Example: sendToAnalytics(metric);
}

// Lazy load images with Intersection Observer
export function lazyLoadImage(img: HTMLImageElement, src: string) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.src = src;
          observer.unobserve(img);
        }
      });
    },
    {
      rootMargin: '50px', // Start loading 50px before entering viewport
    }
  );

  observer.observe(img);
  return () => observer.unobserve(img);
}

// Debounce function for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Check if user prefers reduced motion
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Get connection speed
export function getConnectionSpeed(): 'slow' | 'medium' | 'fast' {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return 'medium';
  }

  const connection = (navigator as any).connection;
  const effectiveType = connection?.effectiveType;

  if (effectiveType === '4g') return 'fast';
  if (effectiveType === '3g') return 'medium';
  return 'slow';
}

// Preload critical resources
export function preloadResource(href: string, as: string) {
  if (typeof document === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = href;
  link.as = as;
  document.head.appendChild(link);
}

// Memory usage monitoring (Chrome only)
export function getMemoryUsage() {
  if (typeof performance === 'undefined' || !(performance as any).memory) {
    return null;
  }

  const memory = (performance as any).memory;
  return {
    usedJSHeapSize: (memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
    totalJSHeapSize: (memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
    jsHeapSizeLimit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB',
  };
}


