const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function analyzeUI() {
  console.log('🎭 Starting UI Analysis with Playwright...');
  
  // Create screenshots directory
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  const page = await context.newPage();

  try {
    console.log('📸 Navigating to http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    
    // Wait for the page to fully load
    await page.waitForTimeout(2000);
    
    // Take full page screenshot
    console.log('📸 Taking full page screenshot...');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'current-ui-full.png'),
      fullPage: true 
    });
    
    // Take viewport screenshot
    console.log('📸 Taking viewport screenshot...');
    await page.screenshot({ 
      path: path.join(screenshotsDir, 'current-ui-viewport.png') 
    });
    
    // Analyze page structure
    console.log('🔍 Analyzing page structure...');
    const pageAnalysis = await page.evaluate(() => {
      const analysis = {
        title: document.title,
        bodyClasses: document.body.className,
        hasHeader: !!document.querySelector('header'),
        hasSidebar: !!document.querySelector('nav, aside, [data-sidebar], .sidebar'),
        hasMainContent: !!document.querySelector('main, .main-content, #main'),
        navItems: [],
        colorScheme: 'light', // default
        layout: 'unknown'
      };
      
      // Check for dark mode indicators
      const htmlClasses = document.documentElement.className;
      const bodyClasses = document.body.className;
      if (htmlClasses.includes('dark') || bodyClasses.includes('dark')) {
        analysis.colorScheme = 'dark';
      }
      
      // Find navigation items
      const navElements = document.querySelectorAll('nav a, nav button, .nav-item, [role="navigation"] a, [role="navigation"] button');
      navElements.forEach(el => {
        if (el.textContent.trim()) {
          analysis.navItems.push({
            text: el.textContent.trim(),
            hasIcon: !!el.querySelector('svg, .icon, i'),
            classes: el.className
          });
        }
      });
      
      // Analyze layout structure
      const sidebar = document.querySelector('nav, aside, [data-sidebar], .sidebar');
      const main = document.querySelector('main, .main-content, #main');
      
      if (sidebar && main) {
        analysis.layout = 'sidebar-main';
        analysis.sidebarWidth = sidebar.getBoundingClientRect().width;
      } else if (document.querySelector('.grid, .flex')) {
        analysis.layout = 'grid-flex';
      }
      
      return analysis;
    });
    
    console.log('✅ Page Analysis Complete:');
    console.log(JSON.stringify(pageAnalysis, null, 2));
    
    // Save analysis to file
    fs.writeFileSync(
      path.join(screenshotsDir, 'ui-analysis.json'),
      JSON.stringify(pageAnalysis, null, 2)
    );
    
    console.log(`📁 Screenshots saved to: ${screenshotsDir}`);
    console.log('📊 Analysis saved to: ui-analysis.json');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
    
    // Take error screenshot if possible
    try {
      await page.screenshot({ 
        path: path.join(screenshotsDir, 'error-state.png') 
      });
    } catch (screenshotError) {
      console.error('Failed to take error screenshot:', screenshotError.message);
    }
  } finally {
    await browser.close();
  }
}

// Gemini UI Reference Analysis
function generateGeminiComparison() {
  console.log('🎯 Gemini UI Style Requirements:');
  console.log(`
  📋 GEMINI INTERFACE CHARACTERISTICS:
  
  🎨 COLOR SCHEME:
  - Dark sidebar (#1f2937 or similar)
  - Light main content area (#ffffff)
  - Accent colors: Blue (#3b82f6) for active states
  - Text: White on dark, dark gray on light
  
  📐 LAYOUT STRUCTURE:
  - Fixed left sidebar (240-280px width)
  - Full-height sidebar with rounded corners
  - Main content area with padding
  - Header with search bar and user profile
  
  🧭 NAVIGATION:
  - Sidebar navigation with icons + text
  - Icons: Home, Chat, History, Settings, etc.
  - Active state highlighting
  - Hover effects on nav items
  
  📱 RESPONSIVE:
  - Collapsible sidebar on mobile
  - Clean typography (Inter, SF Pro, or similar)
  - Proper spacing and margins
  
  🎯 KEY UI ELEMENTS TO MATCH:
  1. Dark sidebar with light icons/text
  2. Proper navigation structure
  3. Search bar in header
  4. Clean content layout
  5. Consistent spacing system
  `);
}

// Run the analysis
analyzeUI()
  .then(() => {
    generateGeminiComparison();
    console.log('🎉 UI Analysis Complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
  });