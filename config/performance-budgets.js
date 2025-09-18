/**
 * Performance Budget Configuration for Vana Frontend
 * Defines limits and thresholds for various performance metrics
 */

// Core Web Vitals thresholds (in milliseconds)
const CORE_WEB_VITALS = {
  // First Contentful Paint - Time until first content renders
  FCP: {
    good: 1800,      // < 1.8s
    poor: 3000,      // > 3s
    budget: 1500,    // Target budget
  },
  
  // Largest Contentful Paint - Time until largest content renders
  LCP: {
    good: 2500,      // < 2.5s
    poor: 4000,      // > 4s
    budget: 2000,    // Target budget
  },
  
  // First Input Delay - Time until page becomes interactive
  FID: {
    good: 100,       // < 100ms
    poor: 300,       // > 300ms
    budget: 80,      // Target budget
  },
  
  // Cumulative Layout Shift - Visual stability
  CLS: {
    good: 0.1,       // < 0.1
    poor: 0.25,      // > 0.25
    budget: 0.05,    // Target budget
  },
  
  // Time to First Byte - Server response time
  TTFB: {
    good: 800,       // < 800ms
    poor: 1800,      // > 1.8s
    budget: 600,     // Target budget
  },
  
  // Time to Interactive - Full interactivity
  TTI: {
    good: 3000,      // < 3s
    poor: 5000,      // > 5s
    budget: 2500,    // Target budget
  },
};

// Bundle size budgets (in KB, gzipped)
const BUNDLE_BUDGETS = {
  // Main application bundles
  main: {
    initial: 150,    // Initial main bundle
    total: 300,      // Total main bundle after code splitting
  },
  
  // Framework bundles (React, Next.js)
  framework: {
    react: 50,       // React + React DOM
    nextjs: 100,     // Next.js framework code
  },
  
  // UI library bundles
  ui: {
    shadcn: 80,      // shadcn/ui components
    radix: 120,      // Radix UI primitives
    promptKit: 60,   // Prompt-Kit components
    lucide: 30,      // Lucide icons
  },
  
  // State management
  state: {
    zustand: 15,     // Zustand store
    reactQuery: 40,  // React Query
  },
  
  // Utility libraries
  utils: {
    classNames: 10,  // clsx, tailwind-merge, etc.
    dateUtils: 20,   // Date manipulation
    validation: 25,  // Form validation
  },
  
  // CSS bundles
  css: {
    global: 30,      // Global styles
    components: 50,  // Component styles
    utilities: 40,   // Utility classes
  },
  
  // Vendor bundles (third-party)
  vendor: {
    total: 200,      // Total vendor bundle size
    individual: 50,  // Max individual vendor chunk
  },
  
  // Total application budget
  total: {
    initial: 500,    // Initial page load
    complete: 1000,  // Complete application
  },
};

// Resource count budgets
const RESOURCE_BUDGETS = {
  // Network requests
  requests: {
    initial: 20,     // Initial page load requests
    total: 50,       // Total requests after full load
    concurrent: 6,   // Max concurrent requests
  },
  
  // Image resources
  images: {
    count: 30,       // Max images per page
    totalSize: 2000, // Total image size (KB)
    largestImage: 500, // Largest single image (KB)
  },
  
  // Font resources
  fonts: {
    families: 2,     // Max font families
    weights: 4,      // Max font weights
    totalSize: 100,  // Total font size (KB)
  },
  
  // JavaScript resources
  scripts: {
    count: 15,       // Max script files
    thirdParty: 5,   // Max third-party scripts
  },
  
  // CSS resources
  stylesheets: {
    count: 10,       // Max stylesheet files
    external: 3,     // Max external stylesheets
  },
};

// Memory usage budgets (in MB)
const MEMORY_BUDGETS = {
  // JavaScript heap memory
  heap: {
    initial: 50,     // Initial heap size
    maximum: 200,    // Maximum heap size
    growth: 100,     // Acceptable growth per minute
  },
  
  // DOM memory
  dom: {
    nodes: 5000,     // Max DOM nodes
    depth: 15,       // Max DOM depth
    listeners: 1000, // Max event listeners
  },
  
  // Cache memory
  cache: {
    http: 50,        // HTTP cache size
    storage: 25,     // Local storage size
    memory: 30,      // In-memory cache size
  },
};

// Performance timing budgets (in milliseconds)
const TIMING_BUDGETS = {
  // Navigation timing
  navigation: {
    dns: 50,         // DNS lookup time
    connection: 100, // TCP connection time
    ssl: 200,        // SSL handshake time
    request: 500,    // Request time
    response: 1000,  // Response time
  },
  
  // Resource timing
  resources: {
    css: 200,        // CSS load time
    js: 500,         // JavaScript load time
    images: 1000,    // Image load time
    fonts: 300,      // Font load time
  },
  
  // Rendering timing
  rendering: {
    firstPaint: 1000,      // First paint
    firstContentful: 1500, // First contentful paint
    domContentLoaded: 2000, // DOM ready
    loadComplete: 3000,    // Complete load
  },
  
  // User interaction timing
  interaction: {
    clickResponse: 50,     // Click response time
    inputResponse: 16,     // Input response time (60fps)
    scrollResponse: 16,    // Scroll response time
    animationFrame: 16,    // Animation frame budget
  },
};

// Mobile-specific budgets
const MOBILE_BUDGETS = {
  // Mobile network considerations
  network: {
    '3g': {
      initialLoad: 5000,   // 5s on 3G
      ttfb: 1500,          // 1.5s TTFB on 3G
      bundles: 200,        // Smaller bundles for 3G
    },
    '4g': {
      initialLoad: 3000,   // 3s on 4G
      ttfb: 800,           // 800ms TTFB on 4G
      bundles: 400,        // Moderate bundles for 4G
    },
  },
  
  // Mobile device performance
  devices: {
    lowEnd: {
      memory: 100,         // 100MB heap for low-end devices
      scripts: 300,        // 300KB total scripts
      images: 1000,        // 1MB total images
    },
    midRange: {
      memory: 150,         // 150MB heap for mid-range devices
      scripts: 500,        // 500KB total scripts
      images: 1500,        // 1.5MB total images
    },
  },
  
  // Battery optimization
  battery: {
    lowPower: {
      animations: 0,       // Disable animations
      polling: 5000,       // 5s polling interval
      backgroundTasks: 0,  // Disable background tasks
    },
    normal: {
      animations: 300,     // 300ms max animation
      polling: 1000,       // 1s polling interval
      backgroundTasks: 3,  // Max 3 background tasks
    },
  },
};

// Development vs Production budgets
const ENVIRONMENT_BUDGETS = {
  development: {
    // More lenient budgets for development
    bundleSize: BUNDLE_BUDGETS.total.complete * 1.5,
    loadTime: CORE_WEB_VITALS.LCP.budget * 1.5,
    memoryUsage: MEMORY_BUDGETS.heap.maximum * 1.2,
  },
  
  staging: {
    // Production-like budgets for staging
    bundleSize: BUNDLE_BUDGETS.total.complete * 1.1,
    loadTime: CORE_WEB_VITALS.LCP.budget * 1.1,
    memoryUsage: MEMORY_BUDGETS.heap.maximum,
  },
  
  production: {
    // Strict budgets for production
    bundleSize: BUNDLE_BUDGETS.total.complete,
    loadTime: CORE_WEB_VITALS.LCP.budget,
    memoryUsage: MEMORY_BUDGETS.heap.maximum * 0.9,
  },
};

// Lighthouse score budgets
const LIGHTHOUSE_BUDGETS = {
  // Individual category scores (0-100)
  categories: {
    performance: 90,     // Performance score
    accessibility: 95,   // Accessibility score
    bestPractices: 92,   // Best practices score
    seo: 88,            // SEO score
    pwa: 85,            // PWA score (if applicable)
  },
  
  // Overall budget
  overall: 90,          // Minimum overall score
  
  // Key metrics within Lighthouse
  metrics: {
    speedIndex: 3000,    // Speed Index
    totalBlockingTime: 200, // Total Blocking Time
    cumulativeLayoutShift: 0.1, // CLS
  },
};

// Real User Monitoring (RUM) budgets
const RUM_BUDGETS = {
  // User experience metrics
  userExperience: {
    bounceRate: 0.3,     // Max 30% bounce rate
    timeOnSite: 120,     // Min 2 minutes average
    pagesPerSession: 2.5, // Min 2.5 pages per session
  },
  
  // Error budgets
  errors: {
    jsErrors: 0.01,      // Max 1% JS error rate
    httpErrors: 0.005,   // Max 0.5% HTTP error rate
    renderErrors: 0.001, // Max 0.1% render error rate
  },
  
  // Availability budgets
  availability: {
    uptime: 0.999,       // 99.9% uptime
    apdex: 0.95,         // 95% satisfactory performance
  },
};

// Export budget configuration
module.exports = {
  CORE_WEB_VITALS,
  BUNDLE_BUDGETS,
  RESOURCE_BUDGETS,
  MEMORY_BUDGETS,
  TIMING_BUDGETS,
  MOBILE_BUDGETS,
  ENVIRONMENT_BUDGETS,
  LIGHTHOUSE_BUDGETS,
  RUM_BUDGETS,
  
  // Helper functions
  getBudgetForEnvironment: (environment = 'production') => {
    return ENVIRONMENT_BUDGETS[environment] || ENVIRONMENT_BUDGETS.production;
  },
  
  // Validation function
  validateBudget: (actual, budget, metric) => {
    const ratio = actual / budget;
    return {
      passed: ratio <= 1,
      ratio,
      actual,
      budget,
      metric,
      status: ratio <= 0.8 ? 'excellent' : 
              ratio <= 1.0 ? 'good' : 
              ratio <= 1.2 ? 'warning' : 'critical',
    };
  },
  
  // Budget enforcement for CI/CD
  enforceInCI: process.env.CI === 'true',
  failOnBudgetExceeded: process.env.NODE_ENV === 'production',
  
  // Reporting configuration
  reporting: {
    enabled: true,
    outputPath: './reports/performance-budget.json',
    alertThreshold: 1.1, // Alert when 110% of budget
    webhookUrl: process.env.PERFORMANCE_WEBHOOK_URL,
  },
};