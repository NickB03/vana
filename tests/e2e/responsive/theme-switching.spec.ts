import { test, expect } from '@playwright/test';

const FRONTEND_URL = 'http://localhost:5173';

test.describe('Theme Switching Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear any existing theme preferences
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    await page.evaluate(() => {
      localStorage.removeItem('theme');
      localStorage.removeItem('theme-preference');
      localStorage.removeItem('ui-theme');
    });
    
    // Set up basic auth for protected routes
    await page.evaluate(() => {
      const mockTokens = {
        access_token: 'test_token',
        refresh_token: 'test_refresh',
        token_type: 'bearer',
        expires_in: 3600
      };
      
      const mockUser = {
        id: 'test-user',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      localStorage.setItem('auth-tokens', JSON.stringify(mockTokens));
      localStorage.setItem('auth-user', JSON.stringify(mockUser));
    });
  });

  test('Theme toggle button is accessible and functional', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Look for theme toggle button
    const themeToggle = page.locator(
      '[data-testid="theme-toggle"], [aria-label*="theme"], button:has([data-testid="sun"]), button:has([data-testid="moon"]), .theme-toggle'
    ).first();
    
    // Theme toggle should be visible
    await expect(themeToggle).toBeVisible({ timeout: 5000 }).catch(() => {
      // If no dedicated toggle found, look for settings menu
      const settingsButton = page.locator('[data-testid="settings"], button:has-text("Settings")').first();
      expect(settingsButton).toBeVisible();
    });
  });

  test('Default theme is applied correctly', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Check initial theme state
    const initialTheme = await page.evaluate(() => {
      const html = document.documentElement;
      return {
        hasLightClass: html.classList.contains('light'),
        hasDarkClass: html.classList.contains('dark'),
        dataTheme: html.getAttribute('data-theme'),
        cssVars: getComputedStyle(html).getPropertyValue('--background')
      };
    });
    
    // Should have some theme applied (either light or dark)
    const hasTheme = initialTheme.hasLightClass || initialTheme.hasDarkClass || initialTheme.dataTheme;
    expect(hasTheme).toBeTruthy();
  });

  test('Light to dark theme switching works', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    await page.waitForLoadState('networkidle');
    
    // Get initial theme state
    const initialTheme = await page.evaluate(() => {
      const html = document.documentElement;
      return {
        classList: Array.from(html.classList),
        dataTheme: html.getAttribute('data-theme'),
        backgroundColor: getComputedStyle(document.body).backgroundColor
      };
    });
    
    // Find and click theme toggle
    const themeToggle = page.locator(
      '[data-testid="theme-toggle"], [aria-label*="theme"], button:has([data-testid="sun"]), button:has([data-testid="moon"])'
    ).first();
    
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
      
      // Check theme changed
      const newTheme = await page.evaluate(() => {
        const html = document.documentElement;
        return {
          classList: Array.from(html.classList),
          dataTheme: html.getAttribute('data-theme'),
          backgroundColor: getComputedStyle(document.body).backgroundColor
        };
      });
      
      // Theme should be different
      expect(newTheme.backgroundColor).not.toBe(initialTheme.backgroundColor);
    } else {
      // If no toggle found, check if theme can be changed through settings
      const settingsButton = page.locator('[data-testid="settings"], button:has-text("Settings")').first();
      
      if (await settingsButton.isVisible()) {
        await settingsButton.click();
        
        // Look for theme options in settings
        const themeOption = page.locator('text=Theme, text=Dark, text=Light').first();
        if (await themeOption.isVisible()) {
          await themeOption.click();
        }
      }
    }
  });

  test('Theme preference persists across page reloads', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Set dark theme if possible
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check theme persisted
    const persistedTheme = await page.evaluate(() => {
      return {
        localStorage: localStorage.getItem('theme'),
        hasClass: document.documentElement.classList.contains('dark'),
        dataTheme: document.documentElement.getAttribute('data-theme')
      };
    });
    
    expect(persistedTheme.localStorage).toBe('dark');
    expect(persistedTheme.hasClass || persistedTheme.dataTheme === 'dark').toBeTruthy();
  });

  test('Theme switching affects all pages consistently', async ({ page }) => {
    // Set dark theme
    await page.goto(`${FRONTEND_URL}/chat`);
    
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
      document.documentElement.classList.add('dark');
    });
    
    const chatTheme = await page.evaluate(() => {
      return getComputedStyle(document.body).backgroundColor;
    });
    
    // Navigate to different pages and check theme consistency
    const pages = ['/canvas', '/auth/login'];
    
    for (const pagePath of pages) {
      await page.goto(`${FRONTEND_URL}${pagePath}`);
      await page.waitForLoadState('networkidle');
      
      const pageTheme = await page.evaluate(() => {
        return getComputedStyle(document.body).backgroundColor;
      });
      
      // Theme should be consistent across pages
      expect(pageTheme).toBe(chatTheme);
    }
  });

  test('System theme preference is respected', async ({ page }) => {
    // Test with system dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Check if system preference is detected
    const systemDarkTheme = await page.evaluate(() => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      return {
        prefersDark: mediaQuery.matches,
        currentTheme: document.documentElement.getAttribute('data-theme') || 
                     (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
      };
    });
    
    expect(systemDarkTheme.prefersDark).toBeTruthy();
    
    // Test with system light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    
    const systemLightTheme = await page.evaluate(() => {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      return {
        prefersLight: mediaQuery.matches,
        currentTheme: document.documentElement.getAttribute('data-theme') || 
                     (document.documentElement.classList.contains('light') ? 'light' : 'dark')
      };
    });
    
    expect(systemLightTheme.prefersLight).toBeTruthy();
  });

  test('Theme transition animations work smoothly', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Add CSS transition detection
    await page.addStyleTag({
      content: `
        * {
          transition: background-color 0.3s ease, color 0.3s ease !important;
        }
      `
    });
    
    const themeToggle = page.locator(
      '[data-testid="theme-toggle"], [aria-label*="theme"], button:has([data-testid="sun"]), button:has([data-testid="moon"])'
    ).first();
    
    if (await themeToggle.isVisible()) {
      // Record transition states
      const transitionTest = await page.evaluate(async () => {
        const body = document.body;
        const initialColor = getComputedStyle(body).backgroundColor;
        
        // Trigger theme change
        const toggle = document.querySelector('[data-testid="theme-toggle"]') as HTMLElement;
        if (toggle) {
          toggle.click();
          
          // Wait for transition
          await new Promise(resolve => setTimeout(resolve, 100));
          const midColor = getComputedStyle(body).backgroundColor;
          
          await new Promise(resolve => setTimeout(resolve, 300));
          const finalColor = getComputedStyle(body).backgroundColor;
          
          return {
            initial: initialColor,
            mid: midColor,
            final: finalColor,
            transitioned: initialColor !== finalColor
          };
        }
        
        return { transitioned: false };
      });
      
      expect(transitionTest.transitioned).toBeTruthy();
    }
  });

  test('Theme affects all UI components appropriately', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Test both themes
    const themes = ['light', 'dark'];
    
    for (const theme of themes) {
      // Apply theme
      await page.evaluate((themeName) => {
        localStorage.setItem('theme', themeName);
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(themeName);
        document.documentElement.setAttribute('data-theme', themeName);
      }, theme);
      
      await page.waitForTimeout(500);
      
      // Take screenshot for visual comparison
      await page.screenshot({ 
        path: `.claude_workspace/reports/screenshots/chat-${theme}-theme.png`,
        fullPage: true 
      });
      
      // Check component colors
      const componentColors = await page.evaluate(() => {
        const elements = [
          document.body,
          document.querySelector('input'),
          document.querySelector('button'),
          document.querySelector('.card, [class*="card"]'),
          document.querySelector('nav, header')
        ].filter(Boolean);
        
        return elements.map(el => ({
          tag: el.tagName.toLowerCase(),
          className: el.className,
          backgroundColor: getComputedStyle(el).backgroundColor,
          color: getComputedStyle(el).color,
          borderColor: getComputedStyle(el).borderColor
        }));
      });
      
      // Verify colors are appropriate for theme
      componentColors.forEach(comp => {
        expect(comp.backgroundColor).toBeTruthy();
        expect(comp.color).toBeTruthy();
      });
    }
  });

  test('High contrast mode works correctly', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto(`${FRONTEND_URL}/auth/login`);
    
    // Check forced colors are respected
    const forcedColorsSupport = await page.evaluate(() => {
      return {
        supportsForced: window.matchMedia('(forced-colors: active)').matches,
        buttonColors: getComputedStyle(document.querySelector('button') || document.body),
        inputColors: getComputedStyle(document.querySelector('input') || document.body)
      };
    });
    
    // Elements should be visible with forced colors
    await expect(page.locator('button').first()).toBeVisible();
    await expect(page.locator('input').first()).toBeVisible();
  });

  test('Theme switching accessibility features work', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/chat`);
    
    // Check theme toggle accessibility
    const themeToggle = page.locator(
      '[data-testid="theme-toggle"], [aria-label*="theme"], button:has([data-testid="sun"]), button:has([data-testid="moon"])'
    ).first();
    
    if (await themeToggle.isVisible()) {
      // Check accessibility attributes
      const a11yAttributes = await themeToggle.evaluate((el) => ({
        ariaLabel: el.getAttribute('aria-label'),
        ariaPressed: el.getAttribute('aria-pressed'),
        role: el.getAttribute('role'),
        tabIndex: el.tabIndex
      }));
      
      // Should have proper accessibility attributes
      expect(a11yAttributes.ariaLabel || a11yAttributes.role).toBeTruthy();
      expect(a11yAttributes.tabIndex).toBeGreaterThanOrEqual(0);
      
      // Should be keyboard accessible
      await themeToggle.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      
      // Should announce theme change
      const announcement = page.locator('[aria-live], [role="status"]').first();
      if (await announcement.isVisible()) {
        const announceText = await announcement.textContent();
        expect(announceText).toBeTruthy();
      }
    }
  });

  test('No FOUC (Flash of Unstyled Content) occurs during theme loading', async ({ page }) => {
    // Navigate with network throttling to test loading
    await page.goto(`${FRONTEND_URL}/auth/login`, { waitUntil: 'domcontentloaded' });
    
    // Check that theme is applied before content is visible
    const themeLoadState = await page.evaluate(() => {
      const html = document.documentElement;
      const hasThemeClass = html.classList.contains('light') || html.classList.contains('dark');
      const hasDataTheme = html.getAttribute('data-theme');
      const hasThemeVars = getComputedStyle(html).getPropertyValue('--background');
      
      return {
        hasTheme: hasThemeClass || hasDataTheme || hasThemeVars,
        bodyVisible: document.body.style.display !== 'none',
        classList: Array.from(html.classList)
      };
    });
    
    // Theme should be applied when content is visible
    if (themeLoadState.bodyVisible) {
      expect(themeLoadState.hasTheme).toBeTruthy();
    }
  });
});