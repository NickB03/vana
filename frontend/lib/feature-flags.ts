/**
 * Feature Flags Configuration System
 * 
 * Centralized configuration for enabling/disabling features across the application.
 * Supports environment-based overrides and runtime toggling.
 */

export interface FeatureFlags {
  // Research Interface Features
  usePromptKitInterface: boolean;
  useResponseStreamEffects: boolean;
  enablePromptKitResponseStream: boolean;
  enhancedAgentStatusBadges: boolean;
  useAgentStatusPopup: boolean;
  
  // Chat Features  
  enablePromptKitChatContainer: boolean;
  enablePromptInputComponent: boolean;
  enableTypewriterEffects: boolean;
  enableFadeTextEffects: boolean;
  
  // Research Features
  enableMultiAgentVisualization: boolean;
  enableRealTimeProgressTracking: boolean;
  enableAdvancedErrorHandling: boolean;
  
  // Performance Features
  enableStreamingOptimizations: boolean;
  enableConnectionHealthMonitoring: boolean;
  enableMemoryOptimizations: boolean;
  
  // UI/UX Features
  enableEnhancedAnimations: boolean;
  enableAccessibilityEnhancements: boolean;
  enableDarkModeOptimizations: boolean;
}

/**
 * Default feature flag configuration
 * These are the baseline settings that can be overridden
 */
const DEFAULT_FLAGS: FeatureFlags = {
  // Research Interface Features
  usePromptKitInterface: true,
  useResponseStreamEffects: true,
  enablePromptKitResponseStream: false, // Conservative default - enable via feature flag
  enhancedAgentStatusBadges: true,
  useAgentStatusPopup: true, // Enable the new popup system
  
  // Chat Features
  enablePromptKitChatContainer: true,
  enablePromptInputComponent: true,
  enableTypewriterEffects: true,
  enableFadeTextEffects: true,
  
  // Research Features
  enableMultiAgentVisualization: true,
  enableRealTimeProgressTracking: true,
  enableAdvancedErrorHandling: true,
  
  // Performance Features
  enableStreamingOptimizations: true,
  enableConnectionHealthMonitoring: true,
  enableMemoryOptimizations: false, // Conservative default
  
  // UI/UX Features
  enableEnhancedAnimations: true,
  enableAccessibilityEnhancements: true,
  enableDarkModeOptimizations: true,
};

/**
 * Environment-based feature flag overrides
 * Allows different configurations for development, staging, and production
 */
const ENVIRONMENT_OVERRIDES: Partial<Record<string, Partial<FeatureFlags>>> = {
  development: {
    enableMemoryOptimizations: true,
    enableEnhancedAnimations: true,
    enablePromptKitResponseStream: true, // Enable for development testing
  },
  
  staging: {
    usePromptKitInterface: true,
    enableMemoryOptimizations: true,
  },
  
  production: {
    enableMemoryOptimizations: false,
    enableEnhancedAnimations: true,
  },
};

/**
 * Browser-specific feature flag adjustments
 * Handle browser compatibility and performance considerations
 */
const getBrowserSpecificOverrides = (): Partial<FeatureFlags> => {
  if (typeof window === 'undefined') {
    return {};
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const overrides: Partial<FeatureFlags> = {};

  // Safari-specific adjustments
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    overrides.enableTypewriterEffects = true;
    overrides.enableFadeTextEffects = false; // Safari has issues with complex animations
  }

  // Mobile device adjustments
  if (/iphone|ipad|android/i.test(userAgent)) {
    overrides.enableEnhancedAnimations = false; // Better performance on mobile
    overrides.enableMemoryOptimizations = true;
  }

  // Chrome-specific optimizations
  if (userAgent.includes('chrome')) {
    overrides.enableStreamingOptimizations = true;
  }

  return overrides;
};

/**
 * Performance-based feature flag adjustments
 * Dynamically adjust features based on device capabilities
 */
const getPerformanceBasedOverrides = (): Partial<FeatureFlags> => {
  if (typeof window === 'undefined') {
    return {};
  }

  const overrides: Partial<FeatureFlags> = {};

  // Check for reduced motion preference
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    overrides.enableEnhancedAnimations = false;
    overrides.enableTypewriterEffects = false;
    overrides.enableFadeTextEffects = false;
  }

  // Basic performance detection
  const connection = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
  if (connection?.effectiveType && ['slow-2g', '2g'].includes(connection.effectiveType)) {
    overrides.enableEnhancedAnimations = false;
    overrides.enableMemoryOptimizations = true;
    overrides.useResponseStreamEffects = false;
  }

  // Memory considerations
  if ('deviceMemory' in navigator && (navigator as unknown as { deviceMemory?: number }).deviceMemory && (navigator as unknown as { deviceMemory: number }).deviceMemory < 4) {
    overrides.enableMemoryOptimizations = true;
    overrides.enableEnhancedAnimations = false;
  }

  return overrides;
};

/**
 * Local storage-based feature flag overrides
 * Allow runtime toggling for development and testing
 */
const getLocalStorageOverrides = (): Partial<FeatureFlags> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem('research-ui-feature-flags');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to parse feature flags from localStorage:', error);
    return {};
  }
};

/**
 * URL parameter-based feature flag overrides
 * Allow temporary feature toggling via URL parameters
 */
const getUrlParameterOverrides = (): Partial<FeatureFlags> => {
  if (typeof window === 'undefined') {
    return {};
  }

  const params = new URLSearchParams(window.location.search);
  const overrides: Partial<FeatureFlags> = {};

  // Check for specific feature flag parameters
  if (params.has('promptkit')) {
    overrides.usePromptKitInterface = params.get('promptkit') === 'true';
  }

  if (params.has('streaming')) {
    overrides.useResponseStreamEffects = params.get('streaming') === 'true';
  }
  
  if (params.has('responsestream')) {
    overrides.enablePromptKitResponseStream = params.get('responsestream') === 'true';
  }

  if (params.has('animations')) {
    overrides.enableEnhancedAnimations = params.get('animations') === 'true';
  }

  if (params.has('debug-ui')) {
    // Enable all debug features
    overrides.enableMultiAgentVisualization = true;
    overrides.enableRealTimeProgressTracking = true;
    overrides.enhancedAgentStatusBadges = true;
  }

  return overrides;
};

/**
 * Build the final feature flags configuration
 * Applies overrides in priority order: URL > localStorage > performance > browser > environment > defaults
 */
const buildFeatureFlags = (): FeatureFlags => {
  const environment = process.env.NODE_ENV || 'development';
  
  const flags = {
    ...DEFAULT_FLAGS,
    ...ENVIRONMENT_OVERRIDES[environment],
    ...getBrowserSpecificOverrides(),
    ...getPerformanceBasedOverrides(),
    ...getLocalStorageOverrides(),
    ...getUrlParameterOverrides(),
  };

  return flags;
};

/**
 * Current feature flags instance
 * This will be re-evaluated on each import, allowing for dynamic updates
 */
export const featureFlags: FeatureFlags = buildFeatureFlags();

/**
 * Utility function to check if a feature is enabled
 */
export const isFeatureEnabled = (feature: keyof FeatureFlags): boolean => {
  return featureFlags[feature];
};

/**
 * Utility function to toggle a feature flag at runtime
 * Persists changes to localStorage
 */
export const toggleFeatureFlag = (feature: keyof FeatureFlags, enabled?: boolean): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const currentOverrides = getLocalStorageOverrides();
  const newValue = enabled !== undefined ? enabled : !featureFlags[feature];
  
  const updatedOverrides = {
    ...currentOverrides,
    [feature]: newValue,
  };

  try {
    localStorage.setItem('research-ui-feature-flags', JSON.stringify(updatedOverrides));
    
    // Update the current flags object
    (featureFlags as Record<string, boolean>)[feature] = newValue;
    
    // Feature flag toggled - logging removed for production build
  } catch (error) {
    console.error('Failed to save feature flag to localStorage:', error);
  }
};

/**
 * Utility function to reset all feature flags to defaults
 */
export const resetFeatureFlags = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem('research-ui-feature-flags');
    
    // Rebuild flags
    const resetFlags = buildFeatureFlags();
    Object.assign(featureFlags, resetFlags);
    
    console.log('Feature flags reset to defaults');
  } catch (error) {
    console.error('Failed to reset feature flags:', error);
  }
};

/**
 * Development helper to log current feature flag state
 */
export const debugFeatureFlags = (): void => {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  // Debug logging removed for production build
};

/**
 * Feature flag groups for easier management
 */
export const FEATURE_GROUPS = {
  RESEARCH_INTERFACE: [
    'usePromptKitInterface',
    'useResponseStreamEffects',
    'enablePromptKitResponseStream',
    'enhancedAgentStatusBadges',
    'useAgentStatusPopup'
  ] as const,
  
  CHAT_FEATURES: [
    'enablePromptKitChatContainer',
    'enablePromptInputComponent',
    'enableTypewriterEffects',
    'enableFadeTextEffects'
  ] as const,
  
  PERFORMANCE: [
    'enableStreamingOptimizations',
    'enableConnectionHealthMonitoring', 
    'enableMemoryOptimizations'
  ] as const,
  
  UI_UX: [
    'enableEnhancedAnimations',
    'enableAccessibilityEnhancements',
    'enableDarkModeOptimizations'
  ] as const,
} as const;

/**
 * Check if all features in a group are enabled
 */
export const isFeatureGroupEnabled = (group: keyof typeof FEATURE_GROUPS): boolean => {
  return FEATURE_GROUPS[group].every(feature => featureFlags[feature]);
};

/**
 * Enable/disable all features in a group
 */
export const toggleFeatureGroup = (group: keyof typeof FEATURE_GROUPS, enabled: boolean): void => {
  FEATURE_GROUPS[group].forEach(feature => {
    toggleFeatureFlag(feature, enabled);
  });
};

// Export for debugging in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  (window as unknown as { debugFeatureFlags: typeof debugFeatureFlags; toggleFeatureFlag: typeof toggleFeatureFlag; resetFeatureFlags: typeof resetFeatureFlags; featureFlags: typeof featureFlags }).debugFeatureFlags = debugFeatureFlags;
  (window as unknown as { debugFeatureFlags: typeof debugFeatureFlags; toggleFeatureFlag: typeof toggleFeatureFlag; resetFeatureFlags: typeof resetFeatureFlags; featureFlags: typeof featureFlags }).toggleFeatureFlag = toggleFeatureFlag;
  (window as unknown as { debugFeatureFlags: typeof debugFeatureFlags; toggleFeatureFlag: typeof toggleFeatureFlag; resetFeatureFlags: typeof resetFeatureFlags; featureFlags: typeof featureFlags }).resetFeatureFlags = resetFeatureFlags;
  (window as unknown as { debugFeatureFlags: typeof debugFeatureFlags; toggleFeatureFlag: typeof toggleFeatureFlag; resetFeatureFlags: typeof resetFeatureFlags; featureFlags: typeof featureFlags }).featureFlags = featureFlags;
}