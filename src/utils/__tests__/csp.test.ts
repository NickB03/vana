import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Content Security Policy (CSP) Validation Tests
 *
 * These tests validate that the CSP meta tag in index.html:
 * 1. Exists and is properly formatted
 * 2. Includes all required external resources
 * 3. Follows security best practices
 *
 * CSP provides defense-in-depth against XSS attacks by controlling
 * which resources can be loaded and executed.
 */

describe('Content Security Policy', () => {
  let htmlContent: string;
  let cspContent: string;

  try {
    htmlContent = readFileSync(join(__dirname, '../../../index.html'), 'utf-8');
    const cspMatch = htmlContent.match(/Content-Security-Policy"\s+content="([^"]+)"/);
    cspContent = cspMatch ? cspMatch[1] : '';
  } catch (error) {
    console.error('Failed to read index.html:', error);
    htmlContent = '';
    cspContent = '';
  }

  it('should have a CSP meta tag in index.html', () => {
    expect(htmlContent).toContain('Content-Security-Policy');
    expect(cspContent).toBeTruthy();
  });

  it('should allow self as default source', () => {
    expect(cspContent).toContain("default-src 'self'");
  });

  it('should allow required script sources', () => {
    const scriptSrcMatch = cspContent.match(/script-src ([^;]+)/);
    const scriptSrc = scriptSrcMatch ? scriptSrcMatch[1] : '';

    // Required for Vite dev server and React development
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).toContain("'unsafe-eval'");

    // CDN sources for artifact libraries
    expect(scriptSrc).toContain('https://cdn.jsdelivr.net');
    expect(scriptSrc).toContain('https://esm.sh');
    expect(scriptSrc).toContain('blob:');
  });

  it('should allow required style sources', () => {
    const styleSrcMatch = cspContent.match(/style-src ([^;]+)/);
    const styleSrc = styleSrcMatch ? styleSrcMatch[1] : '';

    expect(styleSrc).toContain("'self'");
    expect(styleSrc).toContain("'unsafe-inline'"); // Required for Tailwind
    expect(styleSrc).toContain('https://fonts.googleapis.com');
  });

  it('should allow required font sources', () => {
    const fontSrcMatch = cspContent.match(/font-src ([^;]+)/);
    const fontSrc = fontSrcMatch ? fontSrcMatch[1] : '';

    expect(fontSrc).toContain("'self'");
    expect(fontSrc).toContain('https://fonts.gstatic.com');
  });

  it('should allow required image sources', () => {
    const imgSrcMatch = cspContent.match(/img-src ([^;]+)/);
    const imgSrc = imgSrcMatch ? imgSrcMatch[1] : '';

    expect(imgSrc).toContain("'self'");
    expect(imgSrc).toContain('data:'); // For base64 images
    expect(imgSrc).toContain('blob:'); // For generated images
    expect(imgSrc).toContain('https:'); // For external images
  });

  it('should allow required connect sources for API calls', () => {
    const connectSrcMatch = cspContent.match(/connect-src ([^;]+)/);
    const connectSrc = connectSrcMatch ? connectSrcMatch[1] : '';

    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain('https://*.supabase.co'); // Supabase API
    expect(connectSrc).toContain('https://openrouter.ai'); // AI API
    expect(connectSrc).toContain('https://api.tavily.com'); // Search API
    expect(connectSrc).toContain('https://esm.sh'); // npm packages
  });

  it('should allow blob iframes for artifact sandboxing', () => {
    const frameSrcMatch = cspContent.match(/frame-src ([^;]+)/);
    const frameSrc = frameSrcMatch ? frameSrcMatch[1] : '';

    expect(frameSrc).toContain("'self'");
    expect(frameSrc).toContain('blob:'); // Required for artifact iframes
  });

  it('should allow blob workers for service worker', () => {
    const workerSrcMatch = cspContent.match(/worker-src ([^;]+)/);
    const workerSrc = workerSrcMatch ? workerSrcMatch[1] : '';

    expect(workerSrc).toContain("'self'");
    expect(workerSrc).toContain('blob:'); // Required for PWA service worker
  });

  it('should block object embeds for security', () => {
    expect(cspContent).toContain("object-src 'none'");
  });

  it('should restrict base URI to prevent base tag injection', () => {
    expect(cspContent).toContain("base-uri 'self'");
  });

  it('should restrict form actions to prevent form hijacking', () => {
    expect(cspContent).toContain("form-action 'self'");
  });

  it('should prevent clickjacking with frame-ancestors', () => {
    expect(cspContent).toContain("frame-ancestors 'none'");
  });

  it('should upgrade insecure requests in production', () => {
    expect(cspContent).toContain('upgrade-insecure-requests');
  });

  it('should not contain wildcard (*) origins in production', () => {
    // Wildcard origins are a security risk
    const dangerousPatterns = [
      /default-src\s+[^;]*\*/,
      /script-src\s+[^;]*\*(?!\.)/,  // Allow *.supabase.co but not bare *
      /connect-src\s+[^;]*\s+\*(?!\.)/, // Allow *.supabase.co but not bare *
    ];

    dangerousPatterns.forEach((pattern, index) => {
      expect(cspContent).not.toMatch(pattern);
    });
  });

  it('should have all directives properly separated by semicolons', () => {
    // CSP directives should be separated by semicolons
    const directives = cspContent.split(';').map(d => d.trim()).filter(d => d);

    expect(directives.length).toBeGreaterThan(5); // At least 5 directives

    // Each directive should have a name, and optionally values
    // Some directives like 'upgrade-insecure-requests' are standalone
    directives.forEach((directive) => {
      expect(directive).toMatch(/^[\w-]+(\s+.+)?$/);
    });
  });

  it('should include all critical CDN sources for artifacts', () => {
    const connectSrcMatch = cspContent.match(/connect-src ([^;]+)/);
    const connectSrc = connectSrcMatch ? connectSrcMatch[1] : '';

    // These CDNs are used by artifact libraries (Chart.js, D3, etc.)
    const criticalCDNs = [
      'https://cdn.jsdelivr.net',
      'https://esm.sh',
    ];

    criticalCDNs.forEach((cdn) => {
      expect(connectSrc).toContain(cdn);
    });
  });
});
