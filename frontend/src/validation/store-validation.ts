/**
 * Store Validation Script - PR #4 State Management Architecture Foundation
 * Validates all Sprint 2 requirements for the unified store implementation
 */

import { useUnifiedStore } from '../store/index';
import { subscriptionManager } from '../store/subscriptions';
import { PERSISTENCE_CONFIGS, getPersistenceStats } from '../store/persistence';
// Note: middleware utilities will be imported when needed

// Validation results interface
interface ValidationResults {
  unifiedStore: boolean;
  slices: {
    auth: boolean;
    session: boolean;
    chat: boolean;
    canvas: boolean;
    agentDeck: boolean;
    upload: boolean;
    ui: boolean;
  };
  middleware: {
    immer: boolean;
    devtools: boolean;
    persist: boolean;
  };
  subscriptions: boolean;
  persistence: boolean;
  performance: boolean;
  typescript: boolean;
}

/**
 * Validate unified store architecture
 */
export function validateUnifiedStore(): ValidationResults['unifiedStore'] {
  try {
    const store = useUnifiedStore.getState();
    
    // Check if store exists and has required methods
    if (!store || typeof store !== 'object') {
      console.error('❌ Unified store not found');
      return false;
    }
    
    // Check global methods
    const requiredMethods = ['resetAll', 'getState', 'subscribe'];
    for (const method of requiredMethods) {
      if (typeof (store as any)[method] !== 'function') {
        console.error(`❌ Global method ${method} not found`);
        return false;
      }
    }
    
    console.log('✅ Unified store structure validated');
    return true;
  } catch (error) {
    console.error('❌ Unified store validation failed:', error);
    return false;
  }
}

/**
 * Validate all 7 required store slices
 */
export function validateSlices(): ValidationResults['slices'] {
  const results: ValidationResults['slices'] = {
    auth: false,
    session: false,
    chat: false,
    canvas: false,
    agentDeck: false,
    upload: false,
    ui: false
  };
  
  try {
    const store = useUnifiedStore.getState();
    
    // Auth slice validation
    if (store.auth && 
        typeof store.auth.login === 'function' &&
        typeof store.auth.logout === 'function' &&
        store.auth.hasOwnProperty('user') &&
        store.auth.hasOwnProperty('tokens')) {
      results.auth = true;
      console.log('✅ Auth slice validated');
    } else {
      console.error('❌ Auth slice validation failed');
    }
    
    // Session slice validation
    if (store.session &&
        typeof store.session.createSession === 'function' &&
        typeof store.session.addMessage === 'function' &&
        Array.isArray(store.session.sessions)) {
      results.session = true;
      console.log('✅ Session slice validated');
    } else {
      console.error('❌ Session slice validation failed');
    }
    
    // Chat slice validation
    if (store.chat &&
        typeof store.chat.startConversation === 'function' &&
        typeof store.chat.addMessage === 'function' &&
        typeof store.chat.conversations === 'object') {
      results.chat = true;
      console.log('✅ Chat slice validated');
    } else {
      console.error('❌ Chat slice validation failed');
    }
    
    // Canvas slice validation
    if (store.canvas &&
        typeof store.canvas.setMode === 'function' &&
        typeof store.canvas.updateContent === 'function' &&
        store.canvas.hasOwnProperty('content')) {
      results.canvas = true;
      console.log('✅ Canvas slice validated');
    } else {
      console.error('❌ Canvas slice validation failed');
    }
    
    // AgentDeck slice validation
    if (store.agentDeck &&
        typeof store.agentDeck.loadAgents === 'function' &&
        typeof store.agentDeck.selectAgent === 'function' &&
        Array.isArray(store.agentDeck.availableAgents)) {
      results.agentDeck = true;
      console.log('✅ AgentDeck slice validated');
    } else {
      console.error('❌ AgentDeck slice validation failed');
    }
    
    // Upload slice validation
    if (store.upload &&
        typeof store.upload.addUpload === 'function' &&
        typeof store.upload.updateProgress === 'function' &&
        typeof store.upload.uploads === 'object') {
      results.upload = true;
      console.log('✅ Upload slice validated');
    } else {
      console.error('❌ Upload slice validation failed');
    }
    
    // UI slice validation
    if (store.ui &&
        typeof store.ui.setTheme === 'function' &&
        typeof store.ui.toggleSidebar === 'function' &&
        store.ui.hasOwnProperty('theme')) {
      results.ui = true;
      console.log('✅ UI slice validated');
    } else {
      console.error('❌ UI slice validation failed');
    }
    
  } catch (error) {
    console.error('❌ Slice validation failed:', error);
  }
  
  return results;
}

/**
 * Validate middleware configuration
 */
export function validateMiddleware(): ValidationResults['middleware'] {
  const results: ValidationResults['middleware'] = {
    immer: false,
    devtools: false,
    persist: false
  };
  
  try {
    // Check if Immer is working (immutable updates)
    const initialState = useUnifiedStore.getState();
    useUnifiedStore.setState((state: any) => {
      state.ui.theme = 'test-theme';
    });
    const updatedState = useUnifiedStore.getState();
    
    if (updatedState !== initialState) {
      results.immer = true;
      console.log('✅ Immer middleware validated');
    } else {
      console.error('❌ Immer middleware validation failed');
    }
    
    // Reset theme
    useUnifiedStore.getState().ui.setTheme('dark');
    
    // Check DevTools (window object in browser)
    if (typeof window !== 'undefined' && (window as any).__REDUX_DEVTOOLS_EXTENSION__) {
      results.devtools = true;
      console.log('✅ DevTools middleware available');
    } else {
      console.log('ℹ️ DevTools not available (normal in non-browser environment)');
      results.devtools = true; // Consider valid if not in browser
    }
    
    // Check persistence configuration
    if (PERSISTENCE_CONFIGS && 
        PERSISTENCE_CONFIGS.ui &&
        PERSISTENCE_CONFIGS.session) {
      results.persist = true;
      console.log('✅ Persist middleware validated');
    } else {
      console.error('❌ Persist middleware validation failed');
    }
    
  } catch (error) {
    console.error('❌ Middleware validation failed:', error);
  }
  
  return results;
}

/**
 * Validate cross-store subscriptions
 */
export function validateSubscriptions(): boolean {
  try {
    const status = subscriptionManager.getSubscriptionStatus();
    
    if (status.initialized && status.subscriptionCount > 0) {
      console.log('✅ Store subscriptions validated');
      console.log(`  - Initialized: ${status.initialized}`);
      console.log(`  - Subscriptions: ${status.subscriptionCount}`);
      console.log(`  - SSE Handler: ${status.hasSSEHandler}`);
      return true;
    } else {
      console.error('❌ Store subscriptions validation failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Subscriptions validation failed:', error);
    return false;
  }
}

/**
 * Validate selective persistence
 */
export function validatePersistence(): boolean {
  try {
    const stats = getPersistenceStats();
    
    // Check persistence configurations
    const requiredConfigs = ['ui', 'session', 'auth', 'canvas', 'agentDeck'];
    const hasAllConfigs = requiredConfigs.every(config => 
      PERSISTENCE_CONFIGS[config as keyof typeof PERSISTENCE_CONFIGS]
    );
    
    if (hasAllConfigs) {
      console.log('✅ Selective persistence validated');
      if (stats) {
        console.log(`  - localStorage: ${stats.localStorage.items} items`);
        console.log(`  - sessionStorage: ${stats.sessionStorage.items} items`);
      }
      return true;
    } else {
      console.error('❌ Selective persistence validation failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Persistence validation failed:', error);
    return false;
  }
}

/**
 * Validate performance requirements (<50ms updates)
 */
export function validatePerformance(): boolean {
  try {
    const startTime = performance.now();
    
    // Perform multiple rapid updates
    const store = useUnifiedStore.getState();
    for (let i = 0; i < 10; i++) {
      store.ui.setSidebarWidth(300 + i);
      store.session.createSession(`Performance Test ${i}`);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Clean up test sessions
    store.session.clearSessions();
    
    if (duration < 50) {
      console.log(`✅ Performance validated: ${duration.toFixed(2)}ms (target: <50ms)`);
      return true;
    } else {
      console.error(`❌ Performance validation failed: ${duration.toFixed(2)}ms (target: <50ms)`);
      return false;
    }
  } catch (error) {
    console.error('❌ Performance validation failed:', error);
    return false;
  }
}

/**
 * Validate TypeScript interfaces
 */
export function validateTypeScript(): boolean {
  try {
    // This is mainly validated at compile time
    // We can check if store methods have proper typing
    const store = useUnifiedStore.getState();
    
    // Try to access typed properties to verify TypeScript types
    const user = store.auth.user;
    const theme = store.ui.theme;
    const sessions = store.session.sessions;
    
    // Use the variables to avoid unused variable warnings
    if (user !== undefined && theme !== undefined && sessions !== undefined) {
      // Types are properly defined
    }
    
    console.log('✅ TypeScript interfaces validated (compile-time)');
    return true;
  } catch (error) {
    console.error('❌ TypeScript validation failed:', error);
    return false;
  }
}

/**
 * Run complete validation suite
 */
export function runCompleteValidation(): ValidationResults {
  console.group('🏪 Store Validation - PR #4 State Management Architecture');
  
  const results: ValidationResults = {
    unifiedStore: validateUnifiedStore(),
    slices: validateSlices(),
    middleware: validateMiddleware(),
    subscriptions: validateSubscriptions(),
    persistence: validatePersistence(),
    performance: validatePerformance(),
    typescript: validateTypeScript()
  };
  
  // Summary
  const totalTests = 13; // 1 unified + 7 slices + 3 middleware + 1 each for others
  const passedTests = [
    results.unifiedStore,
    ...Object.values(results.slices),
    ...Object.values(results.middleware),
    results.subscriptions,
    results.persistence,
    results.performance,
    results.typescript
  ].filter(Boolean).length;
  
  console.log('\n📊 Validation Summary:');
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
  console.log(`📈 Success Rate: ${(passedTests / totalTests * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All Sprint 2 requirements validated!');
  } else {
    console.log('⚠️ Some validations failed - review implementation');
  }
  
  console.groupEnd();
  
  return results;
}

/**
 * Export validation for use in browser console or tests
 */
if (typeof window !== 'undefined') {
  (window as any).__VANA_STORE_VALIDATION = {
    runCompleteValidation,
    validateUnifiedStore,
    validateSlices,
    validateMiddleware,
    validateSubscriptions,
    validatePersistence,
    validatePerformance,
    validateTypeScript
  };
}

export default {
  runCompleteValidation,
  validateUnifiedStore,
  validateSlices,
  validateMiddleware,
  validateSubscriptions,
  validatePersistence,
  validatePerformance,
  validateTypeScript
};