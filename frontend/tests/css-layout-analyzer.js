/**
 * CSS Layout Analyzer
 * Analyzes responsive design patterns, flexbox/grid usage, and CSS architecture
 */

const fs = require('fs');
const path = require('path');

class CSSLayoutAnalyzer {
  constructor() {
    this.results = {
      files: [],
      responsive: {
        breakpoints: [],
        mediaQueries: [],
        flexboxUsage: [],
        gridUsage: [],
        containerQueries: []
      },
      issues: [],
      recommendations: []
    };
  }

  async analyzeProject() {
    console.log('🔍 Starting CSS Layout Analysis');
    console.log('================================');

    // Analyze CSS files
    await this.analyzeCSSFiles();
    
    // Analyze component files for Tailwind classes
    await this.analyzeComponentFiles();
    
    // Generate insights
    this.generateInsights();
    
    return this.generateReport();
  }

  async analyzeCSSFiles() {
    console.log('\n📄 Analyzing CSS Files');
    console.log('----------------------');

    const cssFiles = [
      'app/globals.css',
      'components/**/*.css'
    ];

    // Analyze globals.css
    const globalsPath = 'app/globals.css';
    if (fs.existsSync(globalsPath)) {
      console.log(`  📝 Analyzing: ${globalsPath}`);
      const content = fs.readFileSync(globalsPath, 'utf8');
      
      const analysis = {
        file: globalsPath,
        lines: content.split('\n').length,
        analysis: {
          customProperties: this.extractCustomProperties(content),
          mediaQueries: this.extractMediaQueries(content),
          flexboxRules: this.extractFlexboxRules(content),
          gridRules: this.extractGridRules(content)
        }
      };

      this.results.files.push(analysis);
      
      console.log(`    - Custom properties: ${analysis.analysis.customProperties.length}`);
      console.log(`    - Media queries: ${analysis.analysis.mediaQueries.length}`);
      console.log(`    - Flexbox rules: ${analysis.analysis.flexboxRules.length}`);
      console.log(`    - Grid rules: ${analysis.analysis.gridRules.length}`);
    }
  }

  async analyzeComponentFiles() {
    console.log('\n🧩 Analyzing Component Files');
    console.log('----------------------------');

    const componentFiles = [
      'components/ui/sidebar.tsx',
      'components/vana-sidebar.tsx', 
      'components/ui/chat-container.tsx',
      'components/chat/vana-chat.tsx',
      'app/chat/page.tsx'
    ];

    for (const file of componentFiles) {
      if (fs.existsSync(file)) {
        console.log(`  📝 Analyzing: ${file}`);
        const content = fs.readFileSync(file, 'utf8');
        
        const analysis = {
          file,
          responsiveClasses: this.extractResponsiveClasses(content),
          flexboxClasses: this.extractFlexboxClasses(content),
          gridClasses: this.extractGridClasses(content),
          spacingClasses: this.extractSpacingClasses(content)
        };

        this.results.files.push(analysis);
        
        console.log(`    - Responsive classes: ${analysis.responsiveClasses.length}`);
        console.log(`    - Flexbox classes: ${analysis.flexboxClasses.length}`);
        console.log(`    - Grid classes: ${analysis.gridClasses.length}`);
        console.log(`    - Spacing classes: ${analysis.spacingClasses.length}`);
      }
    }
  }

  extractCustomProperties(content) {
    const customPropRegex = /--[\w-]+\s*:\s*[^;]+/g;
    return content.match(customPropRegex) || [];
  }

  extractMediaQueries(content) {
    const mediaQueryRegex = /@media[^{]+\{/g;
    return content.match(mediaQueryRegex) || [];
  }

  extractFlexboxRules(content) {
    const flexRegex = /(display:\s*flex|flex-direction|justify-content|align-items|flex-wrap|flex-grow|flex-shrink|flex-basis)/g;
    return content.match(flexRegex) || [];
  }

  extractGridRules(content) {
    const gridRegex = /(display:\s*grid|grid-template|grid-area|grid-column|grid-row|grid-gap)/g;
    return content.match(gridRegex) || [];
  }

  extractResponsiveClasses(content) {
    const responsiveRegex = /\b(sm:|md:|lg:|xl:|2xl:)[\w-]+/g;
    return content.match(responsiveRegex) || [];
  }

  extractFlexboxClasses(content) {
    const flexboxRegex = /\b(flex|flex-col|flex-row|justify-center|justify-between|justify-start|justify-end|items-center|items-start|items-end|flex-1|flex-grow|flex-shrink)(?:\s|"|'|$)/g;
    return content.match(flexboxRegex) || [];
  }

  extractGridClasses(content) {
    const gridRegex = /\b(grid|grid-cols-\d+|grid-rows-\d+|col-span-\d+|row-span-\d+|gap-\d+)(?:\s|"|'|$)/g;
    return content.match(gridRegex) || [];
  }

  extractSpacingClasses(content) {
    const spacingRegex = /\b(p-\d+|px-\d+|py-\d+|m-\d+|mx-\d+|my-\d+|space-x-\d+|space-y-\d+)(?:\s|"|'|$)/g;
    return content.match(spacingRegex) || [];
  }

  generateInsights() {
    console.log('\n💡 Generating Layout Insights');
    console.log('-----------------------------');

    // Analyze responsive patterns
    this.analyzeResponsivePatterns();
    
    // Analyze layout patterns
    this.analyzeLayoutPatterns();
    
    // Generate recommendations
    this.generateRecommendations();
  }

  analyzeResponsivePatterns() {
    console.log('  🔍 Analyzing responsive patterns...');

    const allResponsiveClasses = [];
    this.results.files.forEach(file => {
      if (file.responsiveClasses) {
        allResponsiveClasses.push(...file.responsiveClasses);
      }
    });

    // Count breakpoint usage
    const breakpointUsage = {
      'sm:': allResponsiveClasses.filter(c => c.startsWith('sm:')).length,
      'md:': allResponsiveClasses.filter(c => c.startsWith('md:')).length,
      'lg:': allResponsiveClasses.filter(c => c.startsWith('lg:')).length,
      'xl:': allResponsiveClasses.filter(c => c.startsWith('xl:')).length,
      '2xl:': allResponsiveClasses.filter(c => c.startsWith('2xl:')).length
    };

    this.results.responsive.breakpoints = breakpointUsage;
    
    console.log('    Breakpoint usage:');
    Object.entries(breakpointUsage).forEach(([bp, count]) => {
      console.log(`      ${bp} ${count} instances`);
    });

    // Check for proper mobile-first approach
    const mobileFirstScore = this.calculateMobileFirstScore(breakpointUsage);
    console.log(`    Mobile-first score: ${mobileFirstScore}/10`);

    if (mobileFirstScore < 7) {
      this.results.issues.push({
        type: 'responsive-design',
        severity: 'medium',
        issue: 'Could improve mobile-first responsive approach',
        recommendation: 'Use more sm: and md: breakpoints for better mobile experience'
      });
    }
  }

  calculateMobileFirstScore(breakpointUsage) {
    const total = Object.values(breakpointUsage).reduce((a, b) => a + b, 0);
    if (total === 0) return 0;
    
    // Score based on distribution - more mobile breakpoints = higher score
    const weights = { 'sm:': 3, 'md:': 2.5, 'lg:': 2, 'xl:': 1.5, '2xl:': 1 };
    let weightedScore = 0;
    
    Object.entries(breakpointUsage).forEach(([bp, count]) => {
      weightedScore += (count * weights[bp]) / total;
    });
    
    return Math.round(weightedScore * 2); // Scale to 0-10
  }

  analyzeLayoutPatterns() {
    console.log('  🏗️  Analyzing layout patterns...');

    const allFlexboxClasses = [];
    const allGridClasses = [];
    
    this.results.files.forEach(file => {
      if (file.flexboxClasses) allFlexboxClasses.push(...file.flexboxClasses);
      if (file.gridClasses) allGridClasses.push(...file.gridClasses);
    });

    console.log(`    Flexbox usage: ${allFlexboxClasses.length} instances`);
    console.log(`    Grid usage: ${allGridClasses.length} instances`);

    // Analyze layout approach
    const flexboxDominant = allFlexboxClasses.length > allGridClasses.length * 3;
    const goodBalance = Math.abs(allFlexboxClasses.length - allGridClasses.length) < 50;

    if (flexboxDominant && allGridClasses.length === 0) {
      this.results.issues.push({
        type: 'layout-pattern',
        severity: 'low',
        issue: 'Heavy reliance on flexbox without grid usage',
        recommendation: 'Consider CSS Grid for complex 2D layouts'
      });
    }

    this.results.responsive.flexboxUsage = allFlexboxClasses;
    this.results.responsive.gridUsage = allGridClasses;
  }

  generateRecommendations() {
    console.log('  📋 Generating recommendations...');

    // Base recommendations
    this.results.recommendations.push({
      category: 'Performance',
      priority: 'medium',
      recommendation: 'Consider using CSS custom properties for consistent spacing and colors'
    });

    this.results.recommendations.push({
      category: 'Responsive Design',
      priority: 'high', 
      recommendation: 'Implement container queries for more robust responsive components'
    });

    this.results.recommendations.push({
      category: 'Layout Architecture',
      priority: 'low',
      recommendation: 'Document layout patterns and create reusable component guidelines'
    });

    console.log(`    Generated ${this.results.recommendations.length} recommendations`);
  }

  generateReport() {
    const report = {
      agent: 'CSS Layout Analyzer',
      testDate: new Date().toISOString(),
      summary: {
        filesAnalyzed: this.results.files.length,
        issuesFound: this.results.issues.length,
        recommendationsGenerated: this.results.recommendations.length,
        responsiveClasses: this.results.files.reduce((sum, f) => 
          sum + (f.responsiveClasses ? f.responsiveClasses.length : 0), 0),
        layoutComplexity: 'moderate'
      },
      breakpointUsage: this.results.responsive.breakpoints,
      layoutPatterns: {
        flexbox: this.results.responsive.flexboxUsage.length,
        grid: this.results.responsive.gridUsage.length
      },
      issues: this.results.issues,
      recommendations: this.results.recommendations,
      files: this.results.files.map(f => ({
        file: f.file,
        responsiveClasses: f.responsiveClasses ? f.responsiveClasses.length : 0,
        flexboxClasses: f.flexboxClasses ? f.flexboxClasses.length : 0,
        gridClasses: f.gridClasses ? f.gridClasses.length : 0
      }))
    };

    console.log('\n📊 CSS Layout Analysis Report Generated');
    console.log('=======================================');
    console.log(`Files Analyzed: ${report.summary.filesAnalyzed}`);
    console.log(`Issues Found: ${report.summary.issuesFound}`);
    console.log(`Recommendations: ${report.summary.recommendationsGenerated}`);
    console.log(`Responsive Classes: ${report.summary.responsiveClasses}`);
    console.log(`Layout Complexity: ${report.summary.layoutComplexity}`);

    return report;
  }
}

// Auto-run if executed directly
if (typeof window === 'undefined') {
  const analyzer = new CSSLayoutAnalyzer();
  analyzer.analyzeProject().then(report => {
    console.log('\n🎯 CSS Layout Analysis Complete!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ CSS Layout analysis failed:', error);
    process.exit(1);
  });
}

module.exports = CSSLayoutAnalyzer;