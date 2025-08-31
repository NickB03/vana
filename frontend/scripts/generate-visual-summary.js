#!/usr/bin/env node

/**
 * Visual Testing Summary Generator
 * Analyzes captured screenshots and generates summary report
 */

const fs = require('fs');
const path = require('path');

const CAPTURES_DIR = path.join(__dirname, '../test-results/visual-captures');
const REPORT_PATH = path.join(CAPTURES_DIR, 'visual_testing_summary.json');

function generateSummary() {
  console.log('📊 Generating Visual Testing Summary...\n');

  // Check if captures directory exists
  if (!fs.existsSync(CAPTURES_DIR)) {
    console.log('❌ Visual captures directory not found:', CAPTURES_DIR);
    return;
  }

  // Get all screenshot files
  const files = fs.readdirSync(CAPTURES_DIR);
  const screenshots = files.filter(file => file.endsWith('.png'));

  if (screenshots.length === 0) {
    console.log('❌ No screenshots found in:', CAPTURES_DIR);
    return;
  }

  // Analyze screenshots
  const analysis = {
    desktop: screenshots.filter(f => f.includes('desktop')).length,
    mobile: screenshots.filter(f => f.includes('mobile')).length,
    tablet: screenshots.filter(f => f.includes('tablet')).length,
    darkMode: screenshots.filter(f => f.includes('dark')).length,
    interactive: screenshots.filter(f => f.includes('hover') || f.includes('focused')).length
  };

  // Routes captured
  const routes = ['homepage', 'chat', 'canvas', 'landing', 'auth-callback'];
  const routeAnalysis = routes.map(route => {
    const routeScreenshots = screenshots.filter(f => f.includes(route));
    return {
      name: route,
      screenshots: routeScreenshots.length,
      files: routeScreenshots
    };
  });

  // File size analysis
  const fileDetails = screenshots.map(file => {
    const filePath = path.join(CAPTURES_DIR, file);
    const stats = fs.statSync(filePath);
    return {
      name: file,
      size: stats.size,
      sizeMB: (stats.size / 1024 / 1024).toFixed(2)
    };
  });

  const totalSize = fileDetails.reduce((sum, file) => sum + file.size, 0);

  // Generate summary
  const summary = {
    testRun: {
      timestamp: new Date().toISOString(),
      totalScreenshots: screenshots.length,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      testEnvironment: {
        baseURL: 'http://localhost:5173',
        framework: 'Playwright',
        capturesDirectory: CAPTURES_DIR
      }
    },
    breakdown: analysis,
    routes: routeAnalysis,
    files: fileDetails.sort((a, b) => b.size - a.size) // Sort by size descending
  };

  // Save summary
  fs.writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2));

  // Display summary
  console.log('📈 VISUAL TESTING SUMMARY');
  console.log('=========================\n');
  
  console.log('📊 Screenshot Breakdown:');
  console.log(`   Total Screenshots: ${summary.testRun.totalScreenshots}`);
  console.log(`   Desktop Views: ${analysis.desktop}`);
  console.log(`   Mobile Views: ${analysis.mobile}`);
  console.log(`   Tablet Views: ${analysis.tablet}`);
  console.log(`   Dark Mode: ${analysis.darkMode}`);
  console.log(`   Interactive States: ${analysis.interactive}`);
  console.log(`   Total Size: ${summary.testRun.totalSizeMB} MB\n`);

  console.log('🗂️ Route Coverage:');
  routeAnalysis.forEach(route => {
    if (route.screenshots > 0) {
      console.log(`   ${route.name}: ${route.screenshots} screenshot${route.screenshots > 1 ? 's' : ''}`);
    }
  });

  console.log('\n📋 Largest Screenshots:');
  summary.files.slice(0, 3).forEach((file, i) => {
    console.log(`   ${i + 1}. ${file.name} (${file.sizeMB} MB)`);
  });

  console.log(`\n📄 Full report saved: ${REPORT_PATH}`);
  console.log(`📁 Screenshots location: ${CAPTURES_DIR}`);

  // Check for compliance report
  const complianceReportPath = path.join(CAPTURES_DIR, 'gemini_ui_compliance_report.json');
  if (fs.existsSync(complianceReportPath)) {
    const complianceReport = JSON.parse(fs.readFileSync(complianceReportPath, 'utf8'));
    console.log(`\n🎨 Gemini UI Compliance: ${complianceReport.summary.overallGeminiCompliance}`);
    console.log(`📈 Overall Score: ${complianceReport.summary.overallScore}/10`);
  }

  return summary;
}

// Run if called directly
if (require.main === module) {
  generateSummary();
}

module.exports = { generateSummary };