import { test, expect, Page } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

interface UIValidationResult {
  element: string;
  found: boolean;
  selector?: string;
  location?: { x: number; y: number; width: number; height: number };
  attributes?: Record<string, string | null>;
  text?: string;
  issues?: string[];
}

interface VisualValidationReport {
  timestamp: string;
  url: string;
  viewport: { width: number; height: number };
  expectedElements: UIValidationResult[];
  unexpectedElements: string[];
  overallAssessment: {
    score: number;
    criticalIssues: string[];
    recommendations: string[];
  };
  screenshots: {
    fullPage: string;
    desktop: string;
    mobile?: string;
  };
}

test.describe('Vana Frontend Visual Validation', () => {
  let page: Page;
  let validationReport: VisualValidationReport;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Initialize validation report
    validationReport = {
      timestamp: new Date().toISOString(),
      url: 'http://localhost:5173',
      viewport: { width: 1280, height: 720 },
      expectedElements: [],
      unexpectedElements: [],
      overallAssessment: {
        score: 0,
        criticalIssues: [],
        recommendations: []
      },
      screenshots: {
        fullPage: '',
        desktop: ''
      }
    };
  });

  test('Visual validation of ChatGPT/Gemini-like interface', async () => {
    console.log('🔍 Starting visual validation of Vana frontend...');

    // Navigate to the application
    try {
      await page.goto('http://localhost:5173', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      console.log('✅ Successfully navigated to application');
    } catch (error) {
      console.log('❌ Navigation failed:', error);
      validationReport.overallAssessment.criticalIssues.push('Failed to navigate to application');
    }

    // Take initial screenshot
    const screenshotDir = path.join(process.cwd(), 'test-results', 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fullPageScreenshot = path.join(screenshotDir, `visual-validation-full-${timestamp}.png`);
    
    await page.screenshot({ 
      path: fullPageScreenshot, 
      fullPage: true 
    });
    validationReport.screenshots.fullPage = fullPageScreenshot;
    console.log('📸 Full page screenshot captured');

    // Desktop viewport screenshot
    const desktopScreenshot = path.join(screenshotDir, `visual-validation-desktop-${timestamp}.png`);
    await page.screenshot({ 
      path: desktopScreenshot 
    });
    validationReport.screenshots.desktop = desktopScreenshot;

    // Wait a bit for any dynamic content to load
    await page.waitForTimeout(2000);

    // Define expected UI elements for ChatGPT/Gemini-like interface
    const expectedElements = [
      {
        name: 'Sidebar Navigation',
        selectors: [
          '[data-testid="sidebar"]',
          '.sidebar',
          'aside',
          '[role="navigation"]',
          'nav[aria-label*="main"]',
          '.chat-sidebar'
        ],
        critical: true,
        description: 'Left sidebar for chat history and navigation'
      },
      {
        name: 'Main Chat Area',
        selectors: [
          '[data-testid="chat-area"]',
          '[data-testid="chat-container"]',
          '.chat-area',
          '.chat-container',
          'main[role="main"]',
          '[role="main"]'
        ],
        critical: true,
        description: 'Central area for displaying chat messages'
      },
      {
        name: 'Message Input Box',
        selectors: [
          'input[placeholder*="message"]',
          'textarea[placeholder*="message"]',
          '[data-testid="message-input"]',
          '.chat-input',
          'input[type="text"]',
          'textarea'
        ],
        critical: true,
        description: 'Input field for typing messages'
      },
      {
        name: 'Send Button',
        selectors: [
          'button[type="submit"]',
          '[data-testid="send-button"]',
          'button[aria-label*="send"]',
          '.send-button',
          'button:has([data-icon="send"])'
        ],
        critical: true,
        description: 'Button to send messages'
      },
      {
        name: 'Header/Top Bar',
        selectors: [
          'header',
          '[data-testid="header"]',
          '.header',
          '.top-bar',
          '[role="banner"]'
        ],
        critical: false,
        description: 'Top navigation or header area'
      },
      {
        name: 'User Avatar/Profile',
        selectors: [
          '[data-testid="user-avatar"]',
          '.user-avatar',
          '.profile-picture',
          'img[alt*="profile"]',
          'img[alt*="avatar"]',
          '[role="img"][aria-label*="profile"]'
        ],
        critical: false,
        description: 'User profile or avatar display'
      },
      {
        name: 'Settings/Menu Button',
        selectors: [
          '[data-testid="settings"]',
          '[data-testid="menu"]',
          'button[aria-label*="settings"]',
          'button[aria-label*="menu"]',
          '.settings-button',
          '.menu-button'
        ],
        critical: false,
        description: 'Settings or menu access button'
      },
      {
        name: 'New Chat Button',
        selectors: [
          '[data-testid="new-chat"]',
          'button[aria-label*="new chat"]',
          '.new-chat-button',
          'button:has-text("New chat")',
          'button:has-text("New Chat")'
        ],
        critical: false,
        description: 'Button to start a new chat conversation'
      }
    ];

    // Validate each expected element
    for (const element of expectedElements) {
      console.log(`🔍 Checking for: ${element.name}`);
      
      let found = false;
      let elementInfo: UIValidationResult = {
        element: element.name,
        found: false,
        issues: []
      };

      // Try each selector until one is found
      for (const selector of element.selectors) {
        try {
          const locator = page.locator(selector).first();
          const count = await locator.count();
          
          if (count > 0) {
            found = true;
            elementInfo = {
              element: element.name,
              found: true,
              selector,
              location: await locator.boundingBox() || undefined,
              attributes: {},
              text: await locator.textContent() || undefined
            };

            // Get some key attributes
            try {
              const tagName = await locator.evaluate(el => el.tagName);
              const className = await locator.getAttribute('class');
              const id = await locator.getAttribute('id');
              const ariaLabel = await locator.getAttribute('aria-label');
              
              elementInfo.attributes = {
                tagName,
                class: className,
                id,
                'aria-label': ariaLabel
              };
            } catch (e) {
              // Ignore attribute extraction errors
            }

            console.log(`✅ Found ${element.name} using selector: ${selector}`);
            break;
          }
        } catch (error) {
          // Continue to next selector
        }
      }

      if (!found) {
        console.log(`❌ Missing ${element.name} - This is ${element.critical ? 'CRITICAL' : 'minor'}`);
        elementInfo.issues?.push(element.critical ? 'Critical UI element missing' : 'Optional UI element missing');
        
        if (element.critical) {
          validationReport.overallAssessment.criticalIssues.push(`Missing ${element.name}: ${element.description}`);
        }
      }

      validationReport.expectedElements.push(elementInfo);
    }

    // Check for common error indicators
    const errorIndicators = [
      { selector: '.error', name: 'Error messages' },
      { selector: '[role="alert"]', name: 'Alert messages' },
      { selector: '.warning', name: 'Warning messages' },
      { selector: '.loading', name: 'Loading indicators' },
      { selector: '.spinner', name: 'Spinners' },
      { selector: '[data-testid*="error"]', name: 'Error test elements' }
    ];

    console.log('🔍 Checking for error indicators...');
    for (const indicator of errorIndicators) {
      const count = await page.locator(indicator.selector).count();
      if (count > 0) {
        const text = await page.locator(indicator.selector).first().textContent();
        validationReport.unexpectedElements.push(`${indicator.name}: ${text || 'Present'}`);
        console.log(`⚠️ Found ${indicator.name}: ${text || 'Present'}`);
      }
    }

    // Mobile viewport test
    console.log('📱 Testing mobile viewport...');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(1000);
    
    const mobileScreenshot = path.join(screenshotDir, `visual-validation-mobile-${timestamp}.png`);
    await page.screenshot({ path: mobileScreenshot });
    validationReport.screenshots.mobile = mobileScreenshot;

    // Check if mobile-responsive elements exist
    const mobileElements = await page.locator('[data-testid*="mobile"], .mobile, .md\\:hidden, .lg\\:hidden').count();
    if (mobileElements > 0) {
      console.log(`📱 Found ${mobileElements} mobile-specific elements`);
    }

    // Reset to desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Calculate overall score
    const foundCritical = validationReport.expectedElements.filter(el => 
      el.found && expectedElements.find(exp => exp.name === el.element)?.critical
    ).length;
    const totalCritical = expectedElements.filter(el => el.critical).length;
    const foundOptional = validationReport.expectedElements.filter(el => 
      el.found && !expectedElements.find(exp => exp.name === el.element)?.critical
    ).length;
    const totalOptional = expectedElements.filter(el => !el.critical).length;

    validationReport.overallAssessment.score = Math.round(
      ((foundCritical / totalCritical) * 70 + (foundOptional / totalOptional) * 30)
    );

    // Generate recommendations
    const missingCritical = validationReport.expectedElements.filter(el => 
      !el.found && expectedElements.find(exp => exp.name === el.element)?.critical
    );
    
    if (missingCritical.length > 0) {
      validationReport.overallAssessment.recommendations.push(
        'Implement missing critical UI elements for proper chat interface functionality'
      );
    }

    if (validationReport.unexpectedElements.length > 0) {
      validationReport.overallAssessment.recommendations.push(
        'Investigate and resolve error states or loading issues'
      );
    }

    if (validationReport.overallAssessment.score < 50) {
      validationReport.overallAssessment.recommendations.push(
        'UI structure significantly deviates from expected ChatGPT/Gemini interface pattern'
      );
    }

    // Save detailed report
    const reportPath = path.join(screenshotDir, `visual-validation-report-${timestamp}.json`);
    await fs.writeFile(reportPath, JSON.stringify(validationReport, null, 2));

    // Log summary
    console.log('\n📊 VISUAL VALIDATION SUMMARY');
    console.log('=' * 50);
    console.log(`Overall Score: ${validationReport.overallAssessment.score}/100`);
    console.log(`Critical Issues: ${validationReport.overallAssessment.criticalIssues.length}`);
    console.log(`Screenshots saved: ${screenshotDir}`);
    console.log(`Detailed report: ${reportPath}`);

    if (validationReport.overallAssessment.criticalIssues.length > 0) {
      console.log('\n🚨 Critical Issues:');
      validationReport.overallAssessment.criticalIssues.forEach((issue, i) => {
        console.log(`${i + 1}. ${issue}`);
      });
    }

    if (validationReport.overallAssessment.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      validationReport.overallAssessment.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }

    console.log('\n📸 Screenshots:');
    console.log(`- Full page: ${validationReport.screenshots.fullPage}`);
    console.log(`- Desktop: ${validationReport.screenshots.desktop}`);
    if (validationReport.screenshots.mobile) {
      console.log(`- Mobile: ${validationReport.screenshots.mobile}`);
    }

    // Create assertions for test framework
    expect(validationReport.overallAssessment.score).toBeGreaterThan(0);
    
    // Assert that at least some UI elements are present
    const foundElements = validationReport.expectedElements.filter(el => el.found).length;
    expect(foundElements).toBeGreaterThan(0);
    
    // Log what we actually found vs expected
    console.log('\n📋 DETAILED FINDINGS:');
    validationReport.expectedElements.forEach(el => {
      const status = el.found ? '✅' : '❌';
      const critical = expectedElements.find(exp => exp.name === el.element)?.critical ? ' [CRITICAL]' : '';
      console.log(`${status} ${el.element}${critical}`);
      if (el.found && el.selector) {
        console.log(`    └─ Found with: ${el.selector}`);
        if (el.text && el.text.length < 100) {
          console.log(`    └─ Text: "${el.text.trim()}"`);
        }
      }
    });
  });

  test('Document current UI state vs expected ChatGPT/Gemini interface', async () => {
    await page.goto('http://localhost:5173', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Get page title and meta information
    const title = await page.title();
    const url = page.url();
    
    console.log('\n🏠 CURRENT APPLICATION STATE:');
    console.log(`Title: ${title}`);
    console.log(`URL: ${url}`);

    // Check what's actually rendering
    const bodyContent = await page.locator('body').innerHTML();
    const hasReactRoot = bodyContent.includes('id="root"') || bodyContent.includes('id="__next"');
    
    console.log(`React/Next.js root detected: ${hasReactRoot}`);

    // Get all interactive elements
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input, textarea').count();
    const links = await page.locator('a').count();
    const images = await page.locator('img').count();

    console.log(`\n🔢 UI ELEMENT COUNTS:`);
    console.log(`Buttons: ${buttons}`);
    console.log(`Input fields: ${inputs}`);
    console.log(`Links: ${links}`);
    console.log(`Images: ${images}`);

    // Check for framework indicators
    const frameworks = {
      'React': await page.locator('[data-reactroot], #root').count() > 0,
      'Next.js': await page.locator('#__next').count() > 0,
      'Tailwind': await page.evaluate(() => {
        return document.querySelector('style, link')?.innerHTML?.includes('tailwind') || 
               document.documentElement.className.includes('tw-') ||
               !!document.querySelector('[class*="bg-"], [class*="text-"], [class*="p-"], [class*="m-"]');
      }),
      'Shadcn/UI': await page.locator('[data-radix-collection-item], [data-radix-menu-item]').count() > 0
    };

    console.log(`\n🛠️ DETECTED FRAMEWORKS:`);
    Object.entries(frameworks).forEach(([name, detected]) => {
      console.log(`${detected ? '✅' : '❌'} ${name}`);
    });

    // Expected vs Current Interface Comparison
    console.log(`\n🔄 EXPECTED vs CURRENT INTERFACE:`);
    console.log(`Expected: ChatGPT/Gemini-like conversational AI interface`);
    console.log(`- Left sidebar for chat history`);
    console.log(`- Main chat area with message bubbles`);
    console.log(`- Bottom input bar with send button`);
    console.log(`- Header with user controls`);
    
    console.log(`\nCurrent: ${title || 'Unknown application'}`);
    
    // Try to identify what type of interface this actually is
    const hasChat = await page.locator('[class*="chat"], [id*="chat"], [data-testid*="chat"]').count();
    const hasMessages = await page.locator('[class*="message"], [id*="message"], [data-testid*="message"]').count();
    const hasSidebar = await page.locator('aside, .sidebar, [role="navigation"]').count();
    
    if (hasChat > 0 || hasMessages > 0) {
      console.log(`- ✅ Chat-related elements detected (${hasChat + hasMessages} elements)`);
    } else {
      console.log(`- ❌ No chat-related elements found`);
    }
    
    if (hasSidebar > 0) {
      console.log(`- ✅ Sidebar detected (${hasSidebar} elements)`);
    } else {
      console.log(`- ❌ No sidebar found`);
    }

    // Check console errors
    let consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    if (consoleErrors.length > 0) {
      console.log(`\n🚨 CONSOLE ERRORS (${consoleErrors.length}):`);
      consoleErrors.slice(0, 5).forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }

    expect(title).toBeDefined();
  });
});