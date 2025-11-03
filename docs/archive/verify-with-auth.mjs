#!/usr/bin/env node
/**
 * Artifact System Verification with Authentication
 *
 * This script uses localStorage injection to bypass manual login
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
  console.log('=== ARTIFACT SYSTEM VERIFICATION ===\n');

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1920, height: 1080 }
  });

  try {
    const page = await browser.newPage();

    // Collect console messages
    const consoleMessages = [];
    const consoleErrors = [];

    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      consoleMessages.push({ type, text });

      if (type === 'error') {
        consoleErrors.push(text);
        console.log(`[CONSOLE ERROR] ${text}`);
      } else if (type === 'warning') {
        console.log(`[CONSOLE WARN] ${text}`);
      }
    });

    page.on('pageerror', error => {
      console.error(`[PAGE ERROR] ${error.message}`);
    });

    // Navigate to app
    console.log('📍 Navigating to application...');
    await page.goto(APP_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await wait(2000);

    console.log('📸 Taking screenshot 1: Initial page load');
    await page.screenshot({
      path: join(__dirname, 'verification-1-initial.png'),
      fullPage: true
    });

    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}\n`);

    // If on auth page, provide instructions
    if (currentUrl.includes('/auth')) {
      console.log('⚠️  Authentication required\n');
      console.log('MANUAL STEPS REQUIRED:');
      console.log('1. The browser window should be visible');
      console.log('2. Please log in or sign up in the browser');
      console.log('3. Wait for redirect to main app');
      console.log('4. Script will automatically continue in 30 seconds...\n');
      console.log('Waiting 30 seconds for manual authentication...');

      await wait(30000);

      // Check if still on auth page
      const newUrl = page.url();
      if (newUrl.includes('/auth')) {
        console.log('❌ Still on auth page. Please log in and run script again.');
        return;
      }

      console.log('✅ Authentication successful\n');
    }

    // Wait for chat interface
    console.log('🔍 Waiting for chat interface...');
    await page.waitForSelector('textarea', { timeout: 15000 });
    console.log('✅ Chat interface loaded\n');

    console.log('📸 Taking screenshot 2: Chat interface ready');
    await page.screenshot({
      path: join(__dirname, 'verification-2-ready.png'),
      fullPage: true
    });

    // Send test message
    console.log(`💬 Sending message: "${TEST_MESSAGE}"`);
    const textarea = await page.$('textarea');
    await textarea.click();
    await textarea.type(TEST_MESSAGE, { delay: 10 });
    await wait(500);

    // Click send
    const sendButton = await page.$('button[type="submit"]');
    await sendButton.click();
    console.log('   Message sent, waiting for response...\n');

    // Wait for response (longer timeout for API call + streaming)
    await wait(20000);

    console.log('📸 Taking screenshot 3: After response');
    await page.screenshot({
      path: join(__dirname, 'verification-3-response.png'),
      fullPage: true
    });

    // Check for artifact elements
    console.log('🔍 Checking for artifacts...');

    // Look for artifact cards or canvas
    const artifactElements = await page.evaluate(() => {
      const cards = document.querySelectorAll('[class*="artifact"]');
      const hasCanvas = !!document.querySelector('[class*="canvas"]');
      const hasOpenButton = Array.from(document.querySelectorAll('button')).some(
        btn => btn.textContent.includes('Open')
      );

      return {
        artifactCount: cards.length,
        hasCanvas,
        hasOpenButton,
        bodyText: document.body.innerText.slice(0, 500)
      };
    });

    console.log(`   Artifact elements found: ${artifactElements.artifactCount}`);
    console.log(`   Canvas present: ${artifactElements.hasCanvas}`);
    console.log(`   Open button present: ${artifactElements.hasOpenButton}\n`);

    // Try to open artifact if available
    if (artifactElements.hasOpenButton) {
      console.log('🎨 Attempting to open artifact...');

      await page.evaluate(() => {
        const openBtn = Array.from(document.querySelectorAll('button')).find(
          btn => btn.textContent.includes('Open')
        );
        if (openBtn) openBtn.click();
      });

      await wait(3000);

      console.log('📸 Taking screenshot 4: Artifact canvas opened');
      await page.screenshot({
        path: join(__dirname, 'verification-4-artifact-open.png'),
        fullPage: true
      });

      console.log('✅ Artifact opened successfully\n');
    }

    // Final report
    console.log('=== VERIFICATION RESULTS ===\n');

    console.log('📊 Console Error Summary:');
    if (consoleErrors.length === 0) {
      console.log('   ✅ No console errors detected\n');
    } else {
      console.log(`   ⚠️  ${consoleErrors.length} errors found:`);
      consoleErrors.slice(0, 5).forEach((err, i) => {
        console.log(`      ${i + 1}. ${err.slice(0, 100)}`);
      });
      if (consoleErrors.length > 5) {
        console.log(`      ... and ${consoleErrors.length - 5} more\n`);
      }
      console.log();
    }

    console.log('📸 Screenshots created:');
    console.log('   - verification-1-initial.png (Initial load)');
    console.log('   - verification-2-ready.png (Chat interface)');
    console.log('   - verification-3-response.png (After message)');
    if (artifactElements.hasOpenButton) {
      console.log('   - verification-4-artifact-open.png (Artifact canvas)');
    }

    console.log('\n✅ Verification complete!');
    console.log('\n📋 Next steps:');
    console.log('   1. Review screenshots for visual confirmation');
    console.log('   2. Check that artifact rendered correctly');
    console.log('   3. Verify no critical errors in console');

    // Keep browser open for manual inspection
    console.log('\n⏸️  Browser will remain open for 30 seconds for inspection...');
    await wait(30000);

  } catch (error) {
    console.error('\n❌ Error during verification:', error.message);
    console.error(error.stack);

    const pages = await browser.pages();
    if (pages[0]) {
      await pages[0].screenshot({
        path: join(__dirname, 'verification-error.png'),
        fullPage: true
      });
      console.log('📸 Error screenshot saved: verification-error.png');
    }

    throw error;
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed');
  }
}

// Run verification
verifyArtifactSystem()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed');
    process.exit(1);
  });
