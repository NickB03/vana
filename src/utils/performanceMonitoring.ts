import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';

interface PerformanceData {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

const reportToAnalytics = (metric: Metric) => {
  const data: PerformanceData = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    timestamp: Date.now(),
  };

  // Log to console in development
  if (import.meta.env.DEV) {
    console.log('Performance Metric:', data);
  }

  // Store in sessionStorage for debugging
  try {
    const existingMetrics = JSON.parse(sessionStorage.getItem('performance-metrics') || '[]');
    existingMetrics.push(data);
    sessionStorage.setItem('performance-metrics', JSON.stringify(existingMetrics.slice(-10)));
  } catch (e) {
    // Silent fail if storage is unavailable
  }
};

export const initPerformanceMonitoring = () => {
  if (typeof window === 'undefined') return;

  // Core Web Vitals
  onCLS(reportToAnalytics);
  onFCP(reportToAnalytics);
  onLCP(reportToAnalytics);
  onTTFB(reportToAnalytics);
  onINP(reportToAnalytics); // Replaces FID in web-vitals v3
};

export const getPerformanceMetrics = (): PerformanceData[] => {
  try {
    return JSON.parse(sessionStorage.getItem('performance-metrics') || '[]');
  } catch {
    return [];
  }
};

export const clearPerformanceMetrics = () => {
  try {
    sessionStorage.removeItem('performance-metrics');
  } catch {
    // Silent fail
  }
};
