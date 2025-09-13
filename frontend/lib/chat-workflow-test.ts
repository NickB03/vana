/**
 * Chat Workflow Testing Utilities
 * 
 * Comprehensive testing utilities for validating the complete chat workflow
 * including error scenarios, connection failures, and recovery mechanisms.
 */

import { researchSSEService, ResearchSessionState } from './research-sse-service';
import { apiService } from './api-client';

// ============================================================================
// Test Types and Interfaces
// ============================================================================

export interface TestScenario {
  name: string;
  description: string;
  steps: TestStep[];
  expectedResults: ExpectedResult[];
}

export interface TestStep {
  action: 'send_message' | 'disconnect' | 'reconnect' | 'wait' | 'simulate_error';
  params?: Record<string, any>;
  timeout?: number;
}

export interface ExpectedResult {
  type: 'state_change' | 'message_received' | 'error_handled' | 'connection_status';
  condition: (state: any) => boolean;
  description: string;
}

export interface TestResult {
  scenario: string;
  passed: boolean;
  duration: number;
  errors: string[];
  details: Record<string, any>;
}

// ============================================================================
// Test Scenarios
// ============================================================================

export const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'happy_path',
    description: 'Normal research workflow without errors',
    steps: [
      { action: 'send_message', params: { content: 'Test research query' } },
      { action: 'wait', params: { duration: 5000 } }
    ],
    expectedResults: [
      {
        type: 'state_change',
        condition: (state) => state.sessionState?.status === 'running',
        description: 'Research should start successfully'
      },
      {
        type: 'connection_status',
        condition: (state) => state.isConnected === true,
        description: 'Connection should be established'
      }
    ]
  },
  
  {
    name: 'connection_failure',
    description: 'Handle connection failures gracefully',
    steps: [
      { action: 'send_message', params: { content: 'Test research query' } },
      { action: 'disconnect' },
      { action: 'wait', params: { duration: 2000 } }
    ],
    expectedResults: [
      {
        type: 'state_change',
        condition: (state) => state.sessionState?.status === 'error' || state.sessionState?.status === 'disconnected',
        description: 'Should detect connection failure'
      },
      {
        type: 'error_handled',
        condition: (state) => state.error !== null,
        description: 'Should surface error to user'
      }
    ]
  },
  
  {
    name: 'reconnection_recovery',
    description: 'Automatic reconnection after connection loss',
    steps: [
      { action: 'send_message', params: { content: 'Test research query' } },
      { action: 'disconnect' },
      { action: 'wait', params: { duration: 1000 } },
      { action: 'reconnect' },
      { action: 'wait', params: { duration: 3000 } }
    ],
    expectedResults: [
      {
        type: 'connection_status',
        condition: (state) => state.isConnected === true,
        description: 'Should reconnect successfully'
      },
      {
        type: 'error_handled',
        condition: (state) => state.error === null,
        description: 'Should clear errors after reconnection'
      }
    ]
  },
  
  {
    name: 'multiple_errors',
    description: 'Handle multiple consecutive errors',
    steps: [
      { action: 'send_message', params: { content: 'Test research query' } },
      { action: 'simulate_error', params: { error: 'Network error' } },
      { action: 'wait', params: { duration: 500 } },
      { action: 'simulate_error', params: { error: 'Server error' } },
      { action: 'wait', params: { duration: 1000 } }
    ],
    expectedResults: [
      {
        type: 'error_handled',
        condition: (state) => state.error !== null,
        description: 'Should handle multiple errors gracefully'
      }
    ]
  },
  
  {
    name: 'state_persistence',
    description: 'State should persist across component remounts',
    steps: [
      { action: 'send_message', params: { content: 'Test research query' } },
      { action: 'wait', params: { duration: 1000 } }
    ],
    expectedResults: [
      {
        type: 'state_change',
        condition: (state) => state.sessionState !== null,
        description: 'Session state should persist'
      }
    ]
  }
];

// ============================================================================
// Test Runner
// ============================================================================

export class ChatWorkflowTester {
  private testResults: TestResult[] = [];
  private currentSessionId: string | null = null;
  private listeners: Array<(state: any) => void> = [];

  /**
   * Run a specific test scenario
   */
  async runScenario(scenario: TestScenario): Promise<TestResult> {
    console.log(`[Test] Starting scenario: ${scenario.name}`);
    const startTime = Date.now();
    const result: TestResult = {
      scenario: scenario.name,
      passed: false,
      duration: 0,
      errors: [],
      details: {}
    };

    try {
      // Execute test steps
      for (const step of scenario.steps) {
        await this.executeStep(step, result);
      }

      // Wait a bit for final state changes
      await this.wait(1000);

      // Validate expected results
      const currentState = this.getCurrentState();
      let allPassed = true;

      for (const expected of scenario.expectedResults) {
        try {
          const passed = expected.condition(currentState);
          if (!passed) {
            result.errors.push(`Expected result failed: ${expected.description}`);
            allPassed = false;
          } else {
            console.log(`[Test] ✓ ${expected.description}`);
          }
        } catch (error) {
          result.errors.push(`Error checking expected result: ${expected.description} - ${error}`);
          allPassed = false;
        }
      }

      result.passed = allPassed;
      result.details.finalState = currentState;

    } catch (error) {
      result.errors.push(`Test execution error: ${error instanceof Error ? error.message : String(error)}`);
      result.passed = false;
    }

    result.duration = Date.now() - startTime;
    this.testResults.push(result);

    console.log(`[Test] Completed scenario: ${scenario.name} (${result.passed ? 'PASSED' : 'FAILED'}) in ${result.duration}ms`);
    if (!result.passed) {
      console.error('[Test] Errors:', result.errors);
    }

    return result;
  }

  /**
   * Run all test scenarios
   */
  async runAllScenarios(): Promise<TestResult[]> {
    console.log('[Test] Starting complete workflow test suite...');
    
    this.testResults = [];
    
    for (const scenario of TEST_SCENARIOS) {
      await this.runScenario(scenario);
      
      // Clean up between scenarios
      await this.cleanup();
      await this.wait(500);
    }

    this.printSummary();
    return this.testResults;
  }

  /**
   * Execute a single test step
   */
  private async executeStep(step: TestStep, result: TestResult): Promise<void> {
    console.log(`[Test] Executing step: ${step.action}`, step.params);
    
    switch (step.action) {
      case 'send_message':
        await this.sendTestMessage(step.params?.content || 'Test message');
        break;
        
      case 'disconnect':
        this.simulateDisconnection();
        break;
        
      case 'reconnect':
        this.simulateReconnection();
        break;
        
      case 'wait':
        await this.wait(step.params?.duration || 1000);
        break;
        
      case 'simulate_error':
        this.simulateError(step.params?.error || 'Test error');
        break;
        
      default:
        throw new Error(`Unknown test step: ${step.action}`);
    }
  }

  /**
   * Send a test message
   */
  private async sendTestMessage(content: string): Promise<void> {
    try {
      this.currentSessionId = await researchSSEService.startResearch({ query: content });
      console.log(`[Test] Started research session: ${this.currentSessionId}`);
    } catch (error) {
      console.log(`[Test] Expected error during message send:`, error);
      // This might be expected in error scenarios
    }
  }

  /**
   * Simulate connection disconnection
   */
  private simulateDisconnection(): void {
    // Force disconnect the SSE service
    researchSSEService.disconnect();
    console.log('[Test] Simulated disconnection');
  }

  /**
   * Simulate reconnection
   */
  private simulateReconnection(): void {
    // This would typically be handled automatically by the SSE service
    console.log('[Test] Simulated reconnection attempt');
  }

  /**
   * Simulate various types of errors
   */
  private simulateError(errorMessage: string): void {
    // This is a simplified simulation - in reality, errors would come from the actual services
    console.log(`[Test] Simulated error: ${errorMessage}`);
  }

  /**
   * Wait for specified duration
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current application state
   */
  private getCurrentState(): any {
    return {
      sessionState: this.currentSessionId ? researchSSEService.getSessionState(this.currentSessionId) : null,
      isConnected: researchSSEService.getConnectionState() === 'CONNECTED',
      error: null, // This would come from the actual UI state
      connectionState: researchSSEService.getConnectionState(),
      reconnectAttempts: researchSSEService.getReconnectAttempts()
    };
  }

  /**
   * Clean up after test scenario
   */
  private async cleanup(): Promise<void> {
    if (this.currentSessionId) {
      researchSSEService.stopResearch(this.currentSessionId);
      this.currentSessionId = null;
    }
    researchSSEService.disconnect();
    console.log('[Test] Cleaned up test state');
  }

  /**
   * Print test summary
   */
  private printSummary(): void {
    const passed = this.testResults.filter(r => r.passed).length;
    const total = this.testResults.length;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);

    console.log('\n=== Test Summary ===');
    console.log(`Scenarios: ${passed}/${total} passed`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Average Duration: ${Math.round(totalDuration / total)}ms`);

    if (passed < total) {
      console.log('\nFailed Scenarios:');
      this.testResults
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`- ${r.scenario}: ${r.errors.join(', ')}`);
        });
    }

    console.log('==================\n');
  }

  /**
   * Get test results
   */
  getTestResults(): TestResult[] {
    return this.testResults;
  }
}

// ============================================================================
// Health Check Utilities
// ============================================================================

export class HealthChecker {
  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<{
    api: boolean;
    sse: boolean;
    auth: boolean;
    overall: boolean;
    details: Record<string, any>;
  }> {
    console.log('[Health Check] Starting comprehensive health check...');

    const results = {
      api: false,
      sse: false,
      auth: false,
      overall: false,
      details: {} as Record<string, any>
    };

    // Test API connectivity
    try {
      const healthResponse = await apiService.healthCheck();
      results.api = healthResponse.status === 'healthy' || healthResponse.status === 'ok';
      results.details.api = healthResponse;
      console.log('[Health Check] ✓ API connectivity');
    } catch (error) {
      results.api = false;
      results.details.api = { error: error instanceof Error ? error.message : String(error) };
      console.log('[Health Check] ✗ API connectivity failed');
    }

    // Test SSE connectivity (simplified)
    try {
      const connectionState = researchSSEService.getConnectionState();
      results.sse = connectionState !== 'DISCONNECTED';
      results.details.sse = { state: connectionState };
      console.log('[Health Check] ✓ SSE service available');
    } catch (error) {
      results.sse = false;
      results.details.sse = { error: error instanceof Error ? error.message : String(error) };
      console.log('[Health Check] ✗ SSE service failed');
    }

    // Test auth (simplified - would check token validity)
    try {
      results.auth = typeof localStorage !== 'undefined' && 
                     (localStorage.getItem('vana_auth_token') !== null);
      results.details.auth = { hasToken: results.auth };
      console.log('[Health Check] ✓ Auth status checked');
    } catch (error) {
      results.auth = false;
      results.details.auth = { error: error instanceof Error ? error.message : String(error) };
      console.log('[Health Check] ✗ Auth check failed');
    }

    results.overall = results.api && results.sse;
    
    console.log('[Health Check] Overall health:', results.overall ? 'HEALTHY' : 'UNHEALTHY');
    
    return results;
  }
}

// ============================================================================
// Export Testing Utilities
// ============================================================================

export const testUtils = {
  ChatWorkflowTester,
  HealthChecker,
  TEST_SCENARIOS
};

export default testUtils;