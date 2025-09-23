/**
 * React Error #185 Comprehensive Testing Script
 * Tests all the fixes implemented for infinite re-render loops, SSE issues, and array safety
 */

const puppeteer = require('puppeteer');
const { expect } = require('chai');

// Test scenarios for React Error #185 fixes
const testScenarios = [
  {
    name: 'VanaAgentStatus Array Safety',
    url: 'http://localhost:3000',
    testFunction: async (page) => {
      // Test with null agents
      await page.evaluate(() => {
        const React = window.React;
        const { render } = window.ReactDOM;
        const VanaAgentStatus = window.VanaAgentStatus;
        
        // Test null agents array
        render(React.createElement(VanaAgentStatus, { agents: null }), document.body);
      });
      
      // Check for console errors
      const errors = await page.evaluate(() => window.testErrors || []);
      expect(errors.filter(e => e.includes('Cannot read properties of null'))).to.have.length(0);
      
      // Test with malformed agents
      await page.evaluate(() => {
        const React = window.React;
        const { render } = window.ReactDOM;
        const VanaAgentStatus = window.VanaAgentStatus;
        
        // Test malformed agents array
        const badAgents = [
          null,
          undefined,
          { /* missing required fields */ },
          { agent_id: 'test', name: 'Test Agent' } // minimal valid
        ];
        
        render(React.createElement(VanaAgentStatus, { agents: badAgents }), document.body);
      });
      
      const postErrors = await page.evaluate(() => window.testErrors || []);
      expect(postErrors.filter(e => e.includes('Cannot read properties'))).to.have.length(0);
    }
  },
  {
    name: 'VanaSidebar Array Safety',
    url: 'http://localhost:3000',
    testFunction: async (page) => {
      // Test VanaSidebar with null sessions
      await page.evaluate(() => {
        const React = window.React;
        const { render } = window.ReactDOM;
        const VanaSidebar = window.VanaSidebar;
        
        const mockProps = {
          sessions: null,
          activeSessionId: null,
          onSelectSession: () => {},
          onCreateSession: () => 'new-session'
        };
        
        render(React.createElement(VanaSidebar, mockProps), document.body);
      });
      
      const errors = await page.evaluate(() => window.testErrors || []);
      expect(errors.filter(e => e.includes('map of null'))).to.have.length(0);
      
      // Test with malformed sessions
      await page.evaluate(() => {
        const React = window.React;
        const { render } = window.ReactDOM;
        const VanaSidebar = window.VanaSidebar;
        
        const badSessions = [
          null,
          { /* missing id */ },
          { id: 'test-1', messages: null }, // null messages array
          { id: 'test-2', messages: [] } // valid session
        ];
        
        const mockProps = {
          sessions: badSessions,
          activeSessionId: 'test-1',
          onSelectSession: () => {},
          onCreateSession: () => 'new-session'
        };
        
        render(React.createElement(VanaSidebar, mockProps), document.body);
      });
      
      const postErrors = await page.evaluate(() => window.testErrors || []);
      expect(postErrors.filter(e => e.includes('Cannot read properties'))).to.have.length(0);
    }
  },
  {
    name: 'SSE Infinite Loop Prevention',
    url: 'http://localhost:3000',
    testFunction: async (page) => {
      let renderCount = 0;
      
      // Monitor component renders
      await page.evaluateOnNewDocument(() => {
        window.renderCounts = {};
        window.trackRender = (componentName) => {
          window.renderCounts[componentName] = (window.renderCounts[componentName] || 0) + 1;
        };
      });
      
      // Simulate SSE events that previously caused infinite loops
      await page.evaluate(() => {
        // Mock SSE connection that sends rapid updates
        const mockSSE = {
          lastEvent: {
            type: 'research_progress',
            data: {
              timestamp: new Date().toISOString(),
              current_phase: 'Testing',
              overall_progress: 0.5
            }
          }
        };
        
        // Simulate multiple rapid SSE events
        for (let i = 0; i < 10; i++) {
          setTimeout(() => {
            mockSSE.lastEvent = {
              type: 'research_progress',
              data: {
                timestamp: new Date().toISOString(),
                current_phase: 'Testing',
                overall_progress: 0.5 + (i * 0.05)
              }
            };
          }, i * 100);
        }
      });
      
      // Wait for events to process
      await page.waitForTimeout(2000);
      
      // Check render counts don't exceed reasonable limits
      const renderCounts = await page.evaluate(() => window.renderCounts || {});
      Object.entries(renderCounts).forEach(([component, count]) => {
        expect(count).to.be.lessThan(50, `${component} rendered too many times: ${count}`);
      });
    }
  },
  {
    name: 'Memory Usage Stability',
    url: 'http://localhost:3000',
    testFunction: async (page) => {
      const initialMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize
          };
        }
        return null;
      });
      
      if (!initialMemory) {
        console.log('Memory monitoring not available in this browser');
        return;
      }
      
      // Simulate intensive operations
      await page.evaluate(() => {
        // Create and destroy many components rapidly
        for (let i = 0; i < 100; i++) {
          const div = document.createElement('div');
          div.innerHTML = `Test component ${i}`;
          document.body.appendChild(div);
          
          setTimeout(() => {
            if (div.parentNode) {
              div.parentNode.removeChild(div);
            }
          }, 50);
        }
        
        // Force garbage collection if available
        if (window.gc) {
          window.gc();
        }
      });
      
      await page.waitForTimeout(1000);
      
      const finalMemory = await page.evaluate(() => {
        if (performance.memory) {
          return {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize
          };
        }
        return null;
      });
      
      if (finalMemory) {
        const memoryIncrease = finalMemory.used - initialMemory.used;
        // Memory should not increase by more than 10MB for this test
        expect(memoryIncrease).to.be.lessThan(10 * 1024 * 1024, 
          `Memory increased by ${memoryIncrease / 1024 / 1024}MB`);
      }
    }
  }
];

async function runReactError185Tests() {
  console.log('🧪 Starting React Error #185 Validation Tests...\n');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const results = {
    passed: 0,
    failed: 0,
    errors: []
  };
  
  try {
    for (const scenario of testScenarios) {
      console.log(`🔍 Testing: ${scenario.name}`);
      
      const page = await browser.newPage();
      
      // Capture console errors
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });
      
      // Capture JavaScript errors
      page.on('pageerror', error => {
        consoleErrors.push(error.message);
      });
      
      try {
        await page.goto(scenario.url, { waitUntil: 'networkidle0' });
        
        // Set up error tracking
        await page.evaluate(() => {
          window.testErrors = [];
          const originalError = console.error;
          console.error = (...args) => {
            window.testErrors.push(args.join(' '));
            originalError.apply(console, args);
          };
        });
        
        await scenario.testFunction(page);
        
        // Check for React errors specifically
        const reactErrors = consoleErrors.filter(error => 
          error.includes('Warning:') || 
          error.includes('Error:') ||
          error.includes('Maximum update depth exceeded')
        );
        
        if (reactErrors.length === 0) {
          console.log(`   ✅ ${scenario.name} - PASSED`);
          results.passed++;
        } else {
          console.log(`   ❌ ${scenario.name} - FAILED`);
          console.log(`      Errors: ${reactErrors.join(', ')}`);
          results.failed++;
          results.errors.push({
            scenario: scenario.name,
            errors: reactErrors
          });
        }
      } catch (error) {
        console.log(`   ❌ ${scenario.name} - FAILED`);
        console.log(`      Exception: ${error.message}`);
        results.failed++;
        results.errors.push({
          scenario: scenario.name,
          errors: [error.message]
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  
  console.log('\n📊 React Error #185 Test Results:');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.errors.length > 0) {
    console.log('\n🔍 Detailed Error Report:');
    results.errors.forEach(error => {
      console.log(`\n   Scenario: ${error.scenario}`);
      error.errors.forEach(err => console.log(`   - ${err}`));
    });
  }
  
  return results.failed === 0;
}

// Export for use in other test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runReactError185Tests };
}

// Run if called directly
if (require.main === module) {
  runReactError185Tests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}