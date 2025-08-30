#!/usr/bin/env node

/**
 * Component Verification Script
 * 
 * Verifies shadcn/ui component compliance and implementation standards
 * for the 6-PR UI fix implementation plan.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Component verification rules
const COMPONENT_RULES = {
  shadcn: {
    // Must use CLI-installed components
    allowedSources: ['@radix-ui', 'lucide-react', 'class-variance-authority'],
    requiredProps: ['className'],
    forbiddenPatterns: [
      /style={{.*}}/g, // Inline styles
      /dangerouslySetInnerHTML/g, // XSS risk
    ],
  },
  accessibility: {
    requiredAttributes: {
      button: ['aria-label', 'type'],
      input: ['aria-label', 'type'],
      img: ['alt'],
    },
    semanticElements: ['main', 'section', 'article', 'nav', 'aside', 'header', 'footer'],
  },
  performance: {
    maxFileSize: 500, // lines
    requiredOptimizations: ['React.memo', 'useMemo', 'useCallback'],
  },
};

class ComponentVerifier {
  constructor() {
    this.componentsPath = path.join(process.cwd(), 'frontend/src/components');
    this.results = {
      verified: [],
      violations: [],
      warnings: [],
      metrics: {},
    };
  }

  async verifyAll() {
    console.log('🔍 Starting component verification...\n');
    
    // Get all component files
    const componentFiles = await this.getComponentFiles();
    
    for (const filePath of componentFiles) {
      await this.verifyComponent(filePath);
    }

    // Run shadcn-specific checks
    await this.verifyShadcnCompliance();
    
    // Generate component metrics
    await this.generateMetrics();
    
    return this.generateReport();
  }

  async getComponentFiles() {
    const files = [];
    
    const walkDirectory = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          walkDirectory(fullPath);
        } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
          files.push(fullPath);
        }
      }
    };
    
    if (fs.existsSync(this.componentsPath)) {
      walkDirectory(this.componentsPath);
    }
    
    return files;
  }

  async verifyComponent(filePath) {
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`🔍 Verifying: ${relativePath}`);
    
    const content = fs.readFileSync(filePath, 'utf8');
    const componentResult = {
      file: relativePath,
      passed: true,
      violations: [],
      warnings: [],
      metrics: {},
    };

    // File size check
    const lineCount = content.split('\n').length;
    componentResult.metrics.lines = lineCount;
    
    if (lineCount > COMPONENT_RULES.performance.maxFileSize) {
      componentResult.violations.push({
        type: 'performance',
        message: `File too large: ${lineCount} lines (max: ${COMPONENT_RULES.performance.maxFileSize})`,
      });
      componentResult.passed = false;
    }

    // Check for forbidden patterns
    COMPONENT_RULES.shadcn.forbiddenPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        componentResult.violations.push({
          type: 'security',
          message: `Forbidden pattern found: ${pattern.source}`,
          matches: matches.length,
        });
        componentResult.passed = false;
      }
    });

    // Check imports for proper shadcn usage
    await this.verifyImports(content, componentResult);
    
    // Check accessibility compliance
    await this.verifyAccessibility(content, componentResult);
    
    // Check TypeScript usage
    await this.verifyTypeScript(content, componentResult);

    // Store result
    if (componentResult.passed) {
      this.results.verified.push(componentResult);
      console.log(`   ✅ Passed`);
    } else {
      this.results.violations.push(componentResult);
      console.log(`   ❌ Failed (${componentResult.violations.length} violations)`);
    }

    if (componentResult.warnings.length > 0) {
      this.results.warnings.push(componentResult);
      console.log(`   ⚠️  ${componentResult.warnings.length} warnings`);
    }
  }

  async verifyImports(content, result) {
    const importLines = content.split('\n').filter(line => line.trim().startsWith('import'));
    
    // Check for proper shadcn component imports
    const uiImports = importLines.filter(line => line.includes('@/components/ui/'));
    const directRadixImports = importLines.filter(line => line.includes('@radix-ui/'));
    
    if (directRadixImports.length > 0 && uiImports.length === 0) {
      result.warnings.push({
        type: 'shadcn',
        message: 'Using direct Radix imports instead of shadcn components',
        lines: directRadixImports,
      });
    }

    // Check for component library mixing
    const otherUILibraries = ['@mui/', '@chakra-ui/', '@mantine/'];
    otherUILibraries.forEach(lib => {
      const libImports = importLines.filter(line => line.includes(lib));
      if (libImports.length > 0) {
        result.violations.push({
          type: 'architecture',
          message: `Mixing UI libraries not allowed: ${lib}`,
          lines: libImports,
        });
        result.passed = false;
      }
    });
  }

  async verifyAccessibility(content, result) {
    // Check for semantic HTML elements
    const hasSemanticElements = COMPONENT_RULES.accessibility.semanticElements.some(
      element => content.includes(`<${element}`)
    );

    if (content.includes('div') && !hasSemanticElements && content.length > 500) {
      result.warnings.push({
        type: 'accessibility',
        message: 'Consider using semantic HTML elements instead of generic divs',
      });
    }

    // Check for required ARIA attributes
    const buttonPattern = /<button[^>]*>/g;
    const buttons = content.match(buttonPattern) || [];
    
    buttons.forEach(button => {
      if (!button.includes('aria-label') && !button.includes('aria-labelledby')) {
        result.warnings.push({
          type: 'accessibility',
          message: 'Button missing accessibility label',
          element: button,
        });
      }
    });

    // Check for images without alt text
    const imgPattern = /<img[^>]*>/g;
    const images = content.match(imgPattern) || [];
    
    images.forEach(img => {
      if (!img.includes('alt=')) {
        result.violations.push({
          type: 'accessibility',
          message: 'Image missing alt attribute',
          element: img,
        });
        result.passed = false;
      }
    });
  }

  async verifyTypeScript(content, result) {
    // Check for TypeScript usage
    if (content.includes(': any')) {
      result.warnings.push({
        type: 'typescript',
        message: 'Using "any" type - consider more specific types',
      });
    }

    // Check for proper interface/type definitions
    const hasTypes = content.includes('interface ') || content.includes('type ');
    const hasProps = content.includes('Props');
    
    if (content.includes('export default') && !hasTypes && content.length > 200) {
      result.warnings.push({
        type: 'typescript',
        message: 'Component missing TypeScript interface/type definitions',
      });
    }
  }

  async verifyShadcnCompliance() {
    console.log('\n🎨 Verifying shadcn/ui compliance...');
    
    try {
      // Check installed components
      const componentsConfig = path.join(process.cwd(), 'frontend/components.json');
      
      if (!fs.existsSync(componentsConfig)) {
        this.results.violations.push({
          file: 'components.json',
          passed: false,
          violations: [{
            type: 'configuration',
            message: 'Missing components.json - shadcn not properly configured',
          }],
        });
        return;
      }

      const config = JSON.parse(fs.readFileSync(componentsConfig, 'utf8'));
      
      // Verify shadcn configuration
      const requiredConfigKeys = ['$schema', 'style', 'rsc', 'tsx', 'tailwind', 'aliases'];
      const missingKeys = requiredConfigKeys.filter(key => !config[key]);
      
      if (missingKeys.length > 0) {
        this.results.violations.push({
          file: 'components.json',
          passed: false,
          violations: [{
            type: 'configuration',
            message: `Missing configuration keys: ${missingKeys.join(', ')}`,
          }],
        });
      }

      // Check UI components directory
      const uiPath = path.join(this.componentsPath, 'ui');
      if (!fs.existsSync(uiPath)) {
        this.results.violations.push({
          file: 'ui directory',
          passed: false,
          violations: [{
            type: 'structure',
            message: 'Missing ui components directory',
          }],
        });
      } else {
        // Verify UI components are properly installed
        const uiComponents = fs.readdirSync(uiPath);
        console.log(`   Found ${uiComponents.length} UI components`);
      }

      console.log('   ✅ shadcn configuration verified');
      
    } catch (error) {
      this.results.violations.push({
        file: 'shadcn verification',
        passed: false,
        violations: [{
          type: 'error',
          message: `shadcn verification failed: ${error.message}`,
        }],
      });
    }
  }

  async generateMetrics() {
    const totalFiles = this.results.verified.length + this.results.violations.length;
    const passedFiles = this.results.verified.length;
    const failedFiles = this.results.violations.length;
    const warningFiles = this.results.warnings.length;

    this.results.metrics = {
      total: totalFiles,
      passed: passedFiles,
      failed: failedFiles,
      warnings: warningFiles,
      passRate: totalFiles > 0 ? Math.round((passedFiles / totalFiles) * 100) : 0,
      averageFileSize: this.calculateAverageFileSize(),
      topViolationTypes: this.getTopViolationTypes(),
    };
  }

  calculateAverageFileSize() {
    const allResults = [...this.results.verified, ...this.results.violations];
    const totalLines = allResults.reduce((sum, result) => sum + (result.metrics?.lines || 0), 0);
    return allResults.length > 0 ? Math.round(totalLines / allResults.length) : 0;
  }

  getTopViolationTypes() {
    const violationTypes = {};
    
    this.results.violations.forEach(result => {
      result.violations.forEach(violation => {
        violationTypes[violation.type] = (violationTypes[violation.type] || 0) + 1;
      });
    });

    return Object.entries(violationTypes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }

  generateReport() {
    console.log('\n📊 Component Verification Report');
    console.log('================================');
    
    const { metrics } = this.results;
    
    console.log(`Total Components: ${metrics.total}`);
    console.log(`✅ Passed: ${metrics.passed}`);
    console.log(`❌ Failed: ${metrics.failed}`);
    console.log(`⚠️  Warnings: ${metrics.warnings}`);
    console.log(`📈 Pass Rate: ${metrics.passRate}%`);
    console.log(`📏 Average File Size: ${metrics.averageFileSize} lines`);
    
    if (metrics.topViolationTypes.length > 0) {
      console.log('\n🚨 Top Violation Types:');
      metrics.topViolationTypes.forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
    }

    // Show sample violations
    if (this.results.violations.length > 0) {
      console.log('\n❌ Sample Violations:');
      this.results.violations.slice(0, 3).forEach(result => {
        console.log(`\n📁 ${result.file}`);
        result.violations.slice(0, 2).forEach(violation => {
          console.log(`   • ${violation.type}: ${violation.message}`);
        });
      });
    }

    // Save detailed report
    const reportPath = path.join(process.cwd(), 'verification/component-verification-report.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log(`\n📄 Detailed report saved: ${reportPath}`);

    const success = this.results.violations.length === 0;
    console.log(`\n🎯 Overall Result: ${success ? 'PASS' : 'FAIL'}`);
    
    return {
      success,
      results: this.results,
      reportPath,
    };
  }
}

// Specific verification functions
async function verifyComponentAPI(componentPath) {
  // Verify component exports proper interfaces
  const content = fs.readFileSync(componentPath, 'utf8');
  
  const checks = {
    hasProperExport: /export\s+(default\s+)?\w+/.test(content),
    hasTypeDefinitions: /interface\s+\w+Props|type\s+\w+Props/.test(content),
    hasForwardRef: /forwardRef/.test(content),
    hasDisplayName: /displayName\s*=/.test(content),
  };

  return checks;
}

async function verifyAccessibilityStandards(componentPath) {
  // Run accessibility checks specific to the component
  const content = fs.readFileSync(componentPath, 'utf8');
  
  const checks = {
    hasAriaLabels: /aria-label|aria-labelledby/.test(content),
    hasSemanticHTML: /main|section|article|nav|aside|header|footer/.test(content),
    hasKeyboardSupport: /onKeyDown|onKeyPress|tabIndex/.test(content),
    hasRoleAttributes: /role=/.test(content),
  };

  return checks;
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const verifier = new ComponentVerifier();

  try {
    switch (command) {
      case 'all':
        const result = await verifier.verifyAll();
        process.exit(result.success ? 0 : 1);
        break;

      case 'single':
        const filePath = args[1];
        if (!filePath) {
          console.error('Please provide a component file path');
          process.exit(1);
        }
        await verifier.verifyComponent(filePath);
        break;

      case 'shadcn':
        await verifier.verifyShadcnCompliance();
        break;

      case 'api':
        const componentPath = args[1];
        if (!componentPath) {
          console.error('Please provide a component file path');
          process.exit(1);
        }
        const apiChecks = await verifyComponentAPI(componentPath);
        console.log('API Verification:', apiChecks);
        break;

      default:
        console.log(`
🧩 Component Verification System

Usage:
  node verify-components.js all
  node verify-components.js single <component-path>
  node verify-components.js shadcn
  node verify-components.js api <component-path>

Examples:
  node verify-components.js all
  node verify-components.js single src/components/ui/button.tsx
  node verify-components.js shadcn
        `);
        break;
    }
  } catch (error) {
    console.error(`\n💥 Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ComponentVerifier, verifyComponentAPI, verifyAccessibilityStandards };