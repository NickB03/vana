#!/usr/bin/env node
/**
 * Artifact System Verification Script
 *
 * This script:
 * 1. Opens the app in a headless browser
 * 2. Takes screenshot of initial load
 * 3. Sends a message to create an artifact
 * 4. Takes screenshot showing artifact rendered
 * 5. Checks console for errors
 */

import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const APP_URL = 'http://localhost:8080';
const TEST_MESSAGE = 'Create a simple React button component with a click counter';

// Helper to wait
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function verifyArtifactSystem() {
  console.log('Starting artifact system verification...\n');

  const browser = await puppeteer.launch({
    headless: false, // Show browser for visual confirmation
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  });

  try {
    const page = await browser.newPage();

    // Collect console messages
    const consoleMessages = [];
    const consoleErrors = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({ type: msg.type(), text });
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // Collect page errors
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    console.log('Step 1: Navigating to application...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);

    console.log('Step 2: Taking initial screenshot...');
    await page.screenshot({
      path: join(__dirname, 'screenshot-1-initial-load.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: screenshot-1-initial-load.png\n');

    // Check if we're on auth page or main page
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    if (currentUrl.includes('/auth') || currentUrl.includes('/login')) {
      console.log('⚠️  App redirected to auth page. Attempting to log in...');
      console.log('Taking auth page screenshot...');
      await page.screenshot({
        path: join(__dirname, 'screenshot-0-auth-page.png'),
        fullPage: true
      });
      console.log('✓ Auth page screenshot saved\n');

      // Try to authenticate
      try {
        console.log('Attempting login with test credentials...');

        // Fill email
        await page.waitForSelector('input[type="email"]', { timeout: 5000 });
        await page.type('input[type="email"]', 'test@example.com');

        // Fill password
        await page.type('input[type="password"]', 'TestPassword123!');

        // Click login button - find button with "Login" text
        const loginButton = await page.evaluateHandle(() => {
          return Array.from(document.querySelectorAll('button')).find(
            btn => btn.textContent.includes('Login')
          );
        });
        await loginButton.click();

        console.log('Login form submitted, waiting for redirect...');
        await wait(3000);

        // Check if we're redirected
        const newUrl = page.url();
        if (newUrl === APP_URL || newUrl === `${APP_URL}/`) {
          console.log('✓ Successfully logged in\n');
        } else {
          console.log(`Still on: ${newUrl} - login may have failed, but continuing...\n`);
        }
      } catch (e) {
        console.log(`Login attempt failed: ${e.message}`);
        console.log('Trying sign up instead...\n');

        try {
          // Click "Sign up" link
          await page.click('a[href*="signup"]');
          await wait(2000);

          // Fill signup form
          await page.type('input[type="email"]', 'test@example.com');
          await page.type('input[type="password"]', 'TestPassword123!');

          // Submit signup
          const signupButton = await page.$('button[type="submit"]');
          await signupButton.click();

          console.log('Signup form submitted, waiting...');
          await wait(3000);
        } catch (e2) {
          console.log('Could not auto-authenticate. Manual intervention needed.');
        }
      }
    }

    // Wait for chat interface to be ready
    console.log('Step 3: Waiting for chat interface...');
    try {
      await page.waitForSelector('textarea[placeholder*="Ask"]', { timeout: 10000 });
      console.log('✓ Chat interface found\n');
    } catch (e) {
      console.log('⚠️  Chat interface not found. Taking current state screenshot...');
      await page.screenshot({
        path: join(__dirname, 'screenshot-error-no-interface.png'),
        fullPage: true
      });
      throw new Error('Chat interface did not load');
    }

    console.log('Step 4: Sending test message...');
    console.log(`Message: "${TEST_MESSAGE}"\n`);

    const textarea = await page.$('textarea');
    await textarea.type(TEST_MESSAGE);
    await wait(500);

    // Find and click send button
    const sendButton = await page.$('button[type="submit"]');
    await sendButton.click();

    console.log('Step 5: Waiting for response...');
    // Wait for streaming to complete (look for artifact or completed message)
    await wait(15000); // Give it time to stream

    console.log('Step 6: Taking final screenshot...');
    await page.screenshot({
      path: join(__dirname, 'screenshot-2-artifact-created.png'),
      fullPage: true
    });
    console.log('✓ Screenshot saved: screenshot-2-artifact-created.png\n');

    // Check for artifacts on page
    console.log('Step 7: Checking for artifacts...');
    const artifactCards = await page.$$('[class*="artifact"]');
    const artifactCanvas = await page.$('[class*="canvas"]');

    console.log(`Found ${artifactCards.length} artifact-related elements`);
    console.log(`Artifact canvas present: ${artifactCanvas ? 'YES' : 'NO'}\n`);

    // Report console errors
    console.log('=== CONSOLE ERROR REPORT ===');
    if (consoleErrors.length === 0 && pageErrors.length === 0) {
      console.log('✓ No errors detected in console\n');
    } else {
      console.log(`⚠️  ${consoleErrors.length} console errors detected:`);
      consoleErrors.forEach((err, i) => {
        console.log(`  ${i + 1}. ${err}`);
      });
      console.log();

      if (pageErrors.length > 0) {
        console.log(`⚠️  ${pageErrors.length} page errors detected:`);
        pageErrors.forEach((err, i) => {
          console.log(`  ${i + 1}. ${err}`);
        });
        console.log();
      }
    }

    // Report all console messages for analysis
    console.log('=== CONSOLE MESSAGE SUMMARY ===');
    const messageCounts = consoleMessages.reduce((acc, msg) => {
      acc[msg.type] = (acc[msg.type] || 0) + 1;
      return acc;
    }, {});
    console.log(JSON.stringify(messageCounts, null, 2));
    console.log();

    console.log('=== VERIFICATION COMPLETE ===');
    console.log('Screenshots saved:');
    console.log('  - screenshot-1-initial-load.png');
    console.log('  - screenshot-2-artifact-created.png');
    console.log('\nPlease review the screenshots to verify:');
    console.log('  1. Initial page loads without errors');
    console.log('  2. Artifact appears in the interface');
    console.log('  3. No critical errors in console');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);

    // Take error screenshot
    const page = (await browser.pages())[0];
    if (page) {
      await page.screenshot({
        path: join(__dirname, 'screenshot-error.png'),
        fullPage: true
      });
      console.log('Error screenshot saved: screenshot-error.png');
    }

    throw error;
  } finally {
    await browser.close();
  }
}

// Run verification
verifyArtifactSystem()
  .then(() => {
    console.log('\n✓ Verification script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Verification script failed');
    process.exit(1);
  });
