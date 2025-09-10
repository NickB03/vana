/**
 * Component Standards Testing Suite
 * Validates component compliance with shadcn/ui standards and constitutional principles
 * 
 * This test suite ensures all components meet:
 * - shadcn/ui CLI installation standards
 * - Accessibility requirements (WCAG 2.1 AA)
 * - Performance benchmarks
 * - Visual design consistency
 * - Constitutional compliance principles
 */

import { test, expect, Page, Locator } from '@playwright/test';
import { readdir, readFile } from 'fs/promises';
import path from 'path';

// Test configuration
const COMPONENT_UI_DIR = path.join(process.cwd(), 'src/components/ui');
const VIEWPORT_SIZES = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 }
};

// Performance thresholds
const PERFORMANCE_THRESHOLDS = {
  renderTime: 100, // milliseconds
  loadTime: 3000, // milliseconds
  memoryUsage: 50 * 1024 * 1024, // 50MB
  bundleSize: 50 * 1024 // 50KB
};

// Accessibility testing utilities
class AccessibilityTester {
  constructor(private page: Page) {}

  async checkKeyboardNavigation(selector: string): Promise<boolean> {
    const element = this.page.locator(selector);
    await element.focus();
    
    // Check if element is focusable
    const isFocused = await element.evaluate(el => el === document.activeElement);
    
    if (!isFocused) return false;

    // Test Tab navigation
    await this.page.keyboard.press('Tab');
    const nextFocused = await this.page.locator(':focus').isVisible();
    
    return nextFocused;
  }

  async checkAriaAttributes(selector: string): Promise<{ 
    hasRole: boolean; 
    hasLabel: boolean; 
    hasDescription: boolean; 
  }> {
    const element = this.page.locator(selector);
    
    const role = await element.getAttribute('role');
    const ariaLabel = await element.getAttribute('aria-label');
    const ariaLabelledBy = await element.getAttribute('aria-labelledby');
    const ariaDescribedBy = await element.getAttribute('aria-describedby');
    
    return {
      hasRole: role !== null,
      hasLabel: ariaLabel !== null || ariaLabelledBy !== null,
      hasDescription: ariaDescribedBy !== null
    };
  }

  async checkColorContrast(selector: string): Promise<{ 
    textColor: string; 
    backgroundColor: string; 
    hasGoodContrast: boolean; 
  }> {
    const element = this.page.locator(selector);
    
    const styles = await element.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        color: computed.color,
        backgroundColor: computed.backgroundColor
      };
    });

    // Basic contrast check (simplified)
    const hasGoodContrast = styles.color !== styles.backgroundColor;
    
    return {
      textColor: styles.color,
      backgroundColor: styles.backgroundColor,
      hasGoodContrast
    };
  }
}

// Performance testing utilities
class PerformanceTester {
  constructor(private page: Page) {}

  async measureRenderTime(selector: string): Promise<number> {
    const startTime = await this.page.evaluate(() => performance.now());
    
    await this.page.locator(selector).waitFor({ state: 'visible' });
    
    const endTime = await this.page.evaluate(() => performance.now());
    return endTime - startTime;
  }

  async measureMemoryUsage(): Promise<number | null> {
    const memoryInfo = await this.page.evaluate(() => {
      return (performance as any).memory ? {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize
      } : null;
    });

    return memoryInfo ? memoryInfo.usedJSHeapSize : null;
  }

  async measureLoadTime(): Promise<number> {
    const navigationStart = await this.page.evaluate(() => 
      performance.timing.navigationStart
    );
    
    await this.page.waitForLoadState('networkidle');
    
    const loadComplete = await this.page.evaluate(() => 
      performance.timing.loadEventEnd
    );
    
    return loadComplete - navigationStart;
  }
}

// Component discovery utilities
async function getInstalledComponents(): Promise<string[]> {
  try {
    const files = await readdir(COMPONENT_UI_DIR);
    return files
      .filter(file => file.endsWith('.tsx'))
      .map(file => file.replace('.tsx', ''));
  } catch (error) {
    console.warn('Could not read components directory:', error);
    return [];
  }
}

async function getComponentSource(componentName: string): Promise<string | null> {
  try {
    const filePath = path.join(COMPONENT_UI_DIR, `${componentName}.tsx`);
    return await readFile(filePath, 'utf-8');
  } catch (error) {
    console.warn(`Could not read component ${componentName}:`, error);
    return null;
  }
}

// Test data and fixtures
const INTERACTIVE_ELEMENTS = ['button', 'input', 'select', 'textarea', 'a'];
const SEMANTIC_ELEMENTS = ['button', 'input', 'select', 'textarea', 'form', 'nav', 'main', 'article'];

test.describe('Component Standards Compliance', () => {
  let installedComponents: string[];
  let accessibilityTester: AccessibilityTester;
  let performanceTester: PerformanceTester;

  test.beforeAll(async () => {
    installedComponents = await getInstalledComponents();
    console.log(`Found ${installedComponents.length} installed components:`, installedComponents);
  });

  test.beforeEach(async ({ page }) => {
    accessibilityTester = new AccessibilityTester(page);
    performanceTester = new PerformanceTester(page);
    
    // Navigate to component test page
    await page.goto('/');
    
    // Set default viewport
    await page.setViewportSize(VIEWPORT_SIZES.desktop);
  });

  test.describe('shadcn/ui CLI Installation Standards', () => {
    test('all components should be properly installed via CLI', async () => {
      for (const componentName of installedComponents) {
        const source = await getComponentSource(componentName);
        
        if (!source) {
          test.fail(`Could not read source for component: ${componentName}`);
          continue;
        }

        // Check for shadcn/ui patterns
        const hasCnFunction = source.includes('cn(') || source.includes('clsx');
        const hasProperImports = source.includes('import') && 
          (source.includes('class-variance-authority') || source.includes('clsx'));
        const hasTypeScriptExport = source.includes('export interface') || 
          source.includes('export type') || source.includes('export const') ||
          source.includes('export function');

        expect(hasCnFunction, `Component ${componentName} should use cn() utility function`).toBe(true);
        expect(hasProperImports, `Component ${componentName} should have proper shadcn/ui imports`).toBe(true);
        expect(hasTypeScriptExport, `Component ${componentName} should have proper TypeScript exports`).toBe(true);
      }
    });

    test('components should follow shadcn/ui file structure', async () => {
      for (const componentName of installedComponents) {
        // Check file exists in correct location
        const source = await getComponentSource(componentName);
        expect(source, `Component ${componentName} should exist in src/components/ui/`).toBeTruthy();
        
        if (source) {
          // Check for proper component naming
          const hasComponentExport = source.includes(`export`);
          expect(hasComponentExport, `Component ${componentName} should have proper exports`).toBe(true);
          
          // Check for TypeScript interface
          const hasInterface = source.includes('interface') || source.includes('type');
          expect(hasInterface, `Component ${componentName} should have TypeScript interface/type definitions`).toBe(true);
        }
      }
    });

    test('components should not contain manual implementation artifacts', async () => {
      for (const componentName of installedComponents) {
        const source = await getComponentSource(componentName);
        
        if (!source) continue;

        // Check for signs of manual implementation
        const hasManualArtifacts = 
          source.includes('// TODO') ||
          source.includes('// FIXME') ||
          source.includes('console.log') ||
          source.includes('debugger');

        expect(hasManualArtifacts, 
          `Component ${componentName} should not contain manual implementation artifacts`
        ).toBe(false);
      }
    });
  });

  test.describe('Accessibility Compliance (WCAG 2.1 AA)', () => {
    test('interactive components should be keyboard accessible', async ({ page }) => {
      // This test assumes components are rendered on the page
      // In a real implementation, you'd navigate to a component showcase page
      
      for (const elementType of INTERACTIVE_ELEMENTS) {
        const elements = page.locator(`${elementType}:visible`);
        const count = await elements.count();
        
        if (count > 0) {
          for (let i = 0; i < Math.min(count, 3); i++) { // Test first 3 of each type
            const element = elements.nth(i);
            const selector = await element.evaluate(el => {
              return el.tagName.toLowerCase() + 
                (el.id ? `#${el.id}` : '') + 
                (el.className ? `.${el.className.split(' ')[0]}` : '');
            });
            
            const isKeyboardAccessible = await accessibilityTester.checkKeyboardNavigation(selector);
            expect(isKeyboardAccessible, 
              `${elementType} element should be keyboard accessible`
            ).toBe(true);
          }
        }
      }
    });

    test('interactive components should have proper ARIA attributes', async ({ page }) => {
      for (const elementType of INTERACTIVE_ELEMENTS) {
        const elements = page.locator(`${elementType}:visible`);
        const count = await elements.count();
        
        if (count > 0) {
          const element = elements.first();
          const selector = await element.evaluate(el => el.tagName.toLowerCase());
          
          const ariaInfo = await accessibilityTester.checkAriaAttributes(selector);
          
          // Different elements have different ARIA requirements
          if (['button', 'input', 'select', 'textarea'].includes(elementType)) {
            expect(ariaInfo.hasLabel || ariaInfo.hasRole, 
              `${elementType} should have proper ARIA labeling or role`
            ).toBe(true);
          }
        }
      }
    });

    test('components should meet color contrast requirements', async ({ page }) => {
      const textElements = page.locator('text=*:visible');
      const count = await textElements.count();
      
      if (count > 0) {
        for (let i = 0; i < Math.min(count, 5); i++) { // Test first 5 text elements
          const element = textElements.nth(i);
          const selector = await element.evaluate(el => {
            let selector = el.tagName.toLowerCase();
            if (el.className) {
              selector += `.${el.className.split(' ')[0]}`;
            }
            return selector;
          });
          
          const contrastInfo = await accessibilityTester.checkColorContrast(selector);
          expect(contrastInfo.hasGoodContrast, 
            `Text element should have adequate color contrast`
          ).toBe(true);
        }
      }
    });

    test('form elements should have proper labels', async ({ page }) => {
      const formElements = page.locator('input:visible, select:visible, textarea:visible');
      const count = await formElements.count();
      
      for (let i = 0; i < count; i++) {
        const element = formElements.nth(i);
        
        // Check for label association
        const hasLabel = await element.evaluate(el => {
          const id = el.getAttribute('id');
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledBy = el.getAttribute('aria-labelledby');
          const label = id ? document.querySelector(`label[for="${id}"]`) : null;
          
          return !!(ariaLabel || ariaLabelledBy || label);
        });
        
        expect(hasLabel, 'Form elements should have proper labels').toBe(true);
      }
    });
  });

  test.describe('Performance Standards', () => {
    test('components should render within performance thresholds', async ({ page }) => {
      // Test on main page or component showcase
      const renderTime = await performanceTester.measureRenderTime('body');
      
      expect(renderTime, 
        `Page should render within ${PERFORMANCE_THRESHOLDS.renderTime}ms`
      ).toBeLessThan(PERFORMANCE_THRESHOLDS.renderTime);
    });

    test('page load time should be acceptable', async ({ page }) => {
      const loadTime = await performanceTester.measureLoadTime();
      
      expect(loadTime, 
        `Page should load within ${PERFORMANCE_THRESHOLDS.loadTime}ms`
      ).toBeLessThan(PERFORMANCE_THRESHOLDS.loadTime);
    });

    test('memory usage should be within limits', async ({ page }) => {
      const memoryUsage = await performanceTester.measureMemoryUsage();
      
      if (memoryUsage !== null) {
        expect(memoryUsage, 
          `Memory usage should be under ${PERFORMANCE_THRESHOLDS.memoryUsage / (1024 * 1024)}MB`
        ).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);
      }
    });

    test('components should not introduce console errors', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      page.on('pageerror', error => {
        errors.push(error.message);
      });
      
      // Navigate and interact with page
      await page.waitForLoadState('networkidle');
      
      // Allow some time for any lazy-loaded errors
      await page.waitForTimeout(2000);
      
      expect(errors, 'Page should not have console errors').toHaveLength(0);
    });
  });

  test.describe('Responsive Design Standards', () => {
    test('components should work on all viewport sizes', async ({ page }) => {
      for (const [device, size] of Object.entries(VIEWPORT_SIZES)) {
        await page.setViewportSize(size);
        await page.waitForTimeout(500); // Allow for responsive changes
        
        // Check that main content is visible
        const mainContent = page.locator('main, [role="main"], body > div').first();
        await expect(mainContent, 
          `Main content should be visible on ${device} (${size.width}x${size.height})`
        ).toBeVisible();
        
        // Check that interactive elements are still accessible
        const buttons = page.locator('button:visible');
        const buttonCount = await buttons.count();
        
        if (buttonCount > 0) {
          const firstButton = buttons.first();
          await expect(firstButton, 
            `Buttons should be visible and clickable on ${device}`
          ).toBeVisible();
          
          // Check button size on mobile
          if (device === 'mobile') {
            const boundingBox = await firstButton.boundingBox();
            if (boundingBox) {
              expect(boundingBox.height, 
                'Touch targets should be at least 44px high on mobile'
              ).toBeGreaterThanOrEqual(44);
            }
          }
        }
      }
    });

    test('text should remain readable at all screen sizes', async ({ page }) => {
      for (const [device, size] of Object.entries(VIEWPORT_SIZES)) {
        await page.setViewportSize(size);
        await page.waitForTimeout(500);
        
        // Check font sizes
        const textElements = page.locator('p, h1, h2, h3, h4, h5, h6, span').first();
        
        if (await textElements.count() > 0) {
          const fontSize = await textElements.evaluate(el => {
            return parseInt(window.getComputedStyle(el).fontSize);
          });
          
          // Minimum readable font size
          const minSize = device === 'mobile' ? 14 : 12;
          expect(fontSize, 
            `Text should be at least ${minSize}px on ${device}`
          ).toBeGreaterThanOrEqual(minSize);
        }
      }
    });
  });

  test.describe('Visual Design Consistency', () => {
    test('components should use consistent color scheme', async ({ page }) => {
      const elements = page.locator('[class*="bg-"], [class*="text-"], [class*="border-"]');
      const count = await elements.count();
      
      if (count > 0) {
        // Sample a few elements to check for consistent theming
        const colorClasses: string[] = [];
        
        for (let i = 0; i < Math.min(count, 10); i++) {
          const element = elements.nth(i);
          const className = await element.getAttribute('class');
          
          if (className) {
            const themeClasses = className.split(' ').filter(cls => 
              cls.includes('bg-') || cls.includes('text-') || cls.includes('border-')
            );
            colorClasses.push(...themeClasses);
          }
        }
        
        // Check for common theme patterns
        const hasThemeClasses = colorClasses.some(cls => 
          cls.includes('primary') || cls.includes('secondary') || 
          cls.includes('muted') || cls.includes('accent')
        );
        
        expect(hasThemeClasses, 
          'Components should use consistent theme color classes'
        ).toBe(true);
      }
    });

    test('components should have consistent spacing', async ({ page }) => {
      const spacedElements = page.locator('[class*="p-"], [class*="m-"], [class*="gap-"]');
      const count = await spacedElements.count();
      
      if (count > 0) {
        // Check that spacing follows a consistent scale
        const spacingClasses: string[] = [];
        
        for (let i = 0; i < Math.min(count, 10); i++) {
          const element = spacedElements.nth(i);
          const className = await element.getAttribute('class');
          
          if (className) {
            const spacing = className.split(' ').filter(cls => 
              cls.match(/^[pm][trblxy]?-\d+$/) || cls.match(/^gap-\d+$/)
            );
            spacingClasses.push(...spacing);
          }
        }
        
        // Check for consistent spacing scale (should use standard values)
        const validSpacing = spacingClasses.every(cls => {
          const value = cls.match(/\d+$/)?.[0];
          return value && ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24'].includes(value);
        });
        
        expect(validSpacing, 
          'Components should use consistent spacing scale'
        ).toBe(true);
      }
    });
  });

  test.describe('Constitutional Compliance', () => {
    test('no unauthorized components should be present', async () => {
      // This test checks that only approved components exist
      // In practice, you'd maintain a list of approved components
      
      const approvedComponents = [
        'button', 'card', 'dialog', 'input', 'label', 'select', 
        'textarea', 'alert', 'badge', 'progress', 'skeleton',
        'avatar', 'dropdown-menu', 'form', 'icons', 'scroll-area',
        'separator', 'sheet', 'sidebar', 'tabs', 'tooltip'
      ];
      
      const unauthorizedComponents = installedComponents.filter(
        component => !approvedComponents.includes(component)
      );
      
      expect(unauthorizedComponents, 
        `Unauthorized components found: ${unauthorizedComponents.join(', ')}`
      ).toHaveLength(0);
    });

    test('component implementation should not exceed approved scope', async () => {
      // Check that components haven't been extended beyond their original scope
      // This is a simplified test - in practice you'd compare against baseline
      
      for (const componentName of installedComponents) {
        const source = await getComponentSource(componentName);
        
        if (!source) continue;
        
        // Check for scope creep indicators
        const hasScopeCreep = 
          source.includes('// ADDED:') ||
          source.includes('// ENHANCEMENT:') ||
          source.includes('// CUSTOM:') ||
          source.split('\n').length > 200; // Arbitrary complexity limit
        
        expect(hasScopeCreep, 
          `Component ${componentName} should not exceed approved scope`
        ).toBe(false);
      }
    });

    test('rollback capability should be maintained', async () => {
      // Ensure components can be easily removed/rolled back
      // This checks that components are not tightly coupled
      
      for (const componentName of installedComponents) {
        const source = await getComponentSource(componentName);
        
        if (!source) continue;
        
        // Check for tight coupling indicators
        const hasTightCoupling = 
          source.includes('import.*@/lib/') && source.split('import.*@/lib/').length > 3 ||
          source.includes('useContext') && source.split('useContext').length > 2 ||
          source.includes('global') ||
          source.includes('window.');
        
        expect(hasTightCoupling, 
          `Component ${componentName} should maintain loose coupling for rollback capability`
        ).toBe(false);
      }
    });
  });

  test.describe('Error Handling and Resilience', () => {
    test('components should handle missing props gracefully', async ({ page }) => {
      // Test that components with missing or invalid props don't crash
      const errors: string[] = [];
      
      page.on('pageerror', error => {
        errors.push(error.message);
      });
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });
      
      // Navigate to page and wait for any components to load
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
      
      // Check that no unhandled errors occurred
      const criticalErrors = errors.filter(error => 
        !error.includes('Warning:') && 
        !error.includes('favicon') &&
        !error.includes('manifest')
      );
      
      expect(criticalErrors, 
        `No critical errors should occur: ${criticalErrors.join(', ')}`
      ).toHaveLength(0);
    });

    test('components should maintain functionality during network issues', async ({ page }) => {
      // Test offline behavior
      await page.context().setOffline(true);
      await page.reload();
      
      // Check that static components still render
      const staticElements = page.locator('button, div, span, p').first();
      await expect(staticElements, 
        'Static components should work offline'
      ).toBeVisible();
      
      // Restore network
      await page.context().setOffline(false);
    });
  });
});

test.describe('Integration Testing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('components should integrate seamlessly with existing UI', async ({ page }) => {
    // Check that components don't interfere with each other
    const allElements = page.locator('*:visible');
    const count = await allElements.count();
    
    expect(count, 'Page should render elements successfully').toBeGreaterThan(0);
    
    // Check for layout issues
    const overflowElements = page.locator('*').evaluateAll(elements => {
      return elements.filter(el => {
        const styles = window.getComputedStyle(el);
        return styles.overflow === 'visible' && 
               (el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight);
      }).length;
    });
    
    expect(await overflowElements, 
      'Components should not cause layout overflow issues'
    ).toBeLessThan(3); // Allow for some minor overflows
  });

  test('theme switching should work with all components', async ({ page }) => {
    // Test light/dark theme compatibility
    const themeToggle = page.locator('[data-testid="theme-toggle"], button:has-text("theme"), button:has-text("dark"), button:has-text("light")').first();
    
    if (await themeToggle.isVisible()) {
      // Test theme switching
      const initialBackground = await page.locator('body').evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      await themeToggle.click();
      await page.waitForTimeout(500); // Allow for theme transition
      
      const newBackground = await page.locator('body').evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      expect(newBackground, 
        'Theme toggle should change background color'
      ).not.toBe(initialBackground);
    }
  });
});

// Component-specific tests (run for each installed component)
for (const componentName of await getInstalledComponents()) {
  test.describe(`${componentName} Component Specific Tests`, () => {
    test(`${componentName} should render without errors`, async ({ page }) => {
      // Navigate to a page that uses this component or a component showcase
      await page.goto('/');
      
      // Look for the component in the page
      const componentElements = page.locator(`[class*="${componentName}"], [data-component="${componentName}"]`);
      const count = await componentElements.count();
      
      if (count > 0) {
        // Test first instance of the component
        const component = componentElements.first();
        await expect(component, `${componentName} should be visible`).toBeVisible();
        
        // Take a screenshot for visual regression testing
        await component.screenshot({ 
          path: `test-results/${componentName}-screenshot.png`,
          mode: 'css'
        });
      } else {
        // Component might not be used yet, which is acceptable
        console.log(`Component ${componentName} not found in current pages - this is acceptable for new components`);
      }
    });
  });
}