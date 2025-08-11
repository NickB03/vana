module.exports = {
  extends: 'lighthouse:default',
  settings: {
    // Performance targets for Vana frontend
    formFactor: 'desktop',
    throttling: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
      requestLatencyMs: 0,
      downloadThroughputKbps: 0,
      uploadThroughputKbps: 0
    },
    screenEmulation: {
      mobile: false,
      width: 1350,
      height: 940,
      deviceScaleFactor: 1,
      disabled: false
    },
    emulatedUserAgent: 'desktop'
  },
  audits: [
    'first-contentful-paint',
    'largest-contentful-paint',
    'first-meaningful-paint',
    'speed-index',
    'total-blocking-time',
    'cumulative-layout-shift',
    'server-response-time',
    'interactive',
    'mainthread-work-breakdown',
    'bootup-time',
    'uses-long-cache-ttl',
    'total-byte-weight',
    'render-blocking-resources',
    'unminified-css',
    'unminified-javascript',
    'unused-css-rules',
    'unused-javascript',
    'modern-image-formats',
    'uses-optimized-images',
    'uses-text-compression',
    'uses-responsive-images',
    'efficient-animated-content'
  ],
  categories: {
    performance: {
      title: 'Performance',
      auditRefs: [
        { id: 'first-contentful-paint', weight: 10 },
        { id: 'largest-contentful-paint', weight: 25 },
        { id: 'first-meaningful-paint', weight: 10 },
        { id: 'speed-index', weight: 10 },
        { id: 'total-blocking-time', weight: 30 },
        { id: 'cumulative-layout-shift', weight: 15 },
        { id: 'server-response-time', weight: 0 },
        { id: 'interactive', weight: 0 },
        { id: 'mainthread-work-breakdown', weight: 0 },
        { id: 'bootup-time', weight: 0 },
        { id: 'uses-long-cache-ttl', weight: 0 },
        { id: 'total-byte-weight', weight: 0 },
        { id: 'render-blocking-resources', weight: 0 },
        { id: 'unminified-css', weight: 0 },
        { id: 'unminified-javascript', weight: 0 },
        { id: 'unused-css-rules', weight: 0 },
        { id: 'unused-javascript', weight: 0 },
        { id: 'modern-image-formats', weight: 0 },
        { id: 'uses-optimized-images', weight: 0 },
        { id: 'uses-text-compression', weight: 0 },
        { id: 'uses-responsive-images', weight: 0 },
        { id: 'efficient-animated-content', weight: 0 }
      ]
    }
  },
  // Vana-specific performance targets
  assertions: {
    'categories:performance': ['error', { minScore: 0.9 }],
    'audits:first-contentful-paint': ['error', { maxNumericValue: 1500 }],
    'audits:largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
    'audits:total-blocking-time': ['error', { maxNumericValue: 200 }],
    'audits:cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
    'audits:speed-index': ['error', { maxNumericValue: 3000 }],
    'audits:interactive': ['error', { maxNumericValue: 5000 }],
    'audits:server-response-time': ['error', { maxNumericValue: 200 }],
    'audits:total-byte-weight': ['warn', { maxNumericValue: 1600000 }], // 1.6MB
    'audits:render-blocking-resources': ['warn', { maxNumericValue: 500 }],
    'audits:unused-javascript': ['warn', { maxNumericValue: 200000 }], // 200KB
    'audits:unused-css-rules': ['warn', { maxNumericValue: 50000 }] // 50KB
  }
};