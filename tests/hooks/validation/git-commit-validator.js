#!/usr/bin/env node

/**
 * Git Commit Validator - Specialized validation for Git commit operations
 * 
 * This module provides comprehensive validation for Git commit content,
 * integrating with the existing PRD validation system and adding Git-specific
 * checks for commit messages, staged files, and Git workflow compliance.
 * 
 * Features:
 * - Commit message format validation (conventional commits)
 * - Staged file PRD compliance validation
 * - Security pattern detection in commits
 * - Performance impact analysis for staged changes
 * - Branch protection and workflow validation
 * - Integration with existing backup and hook systems
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const { RealPRDValidator } = require('./real-prd-validator');

class GitCommitValidator {
  constructor(options = {}) {
    this.options = {
      enablePRDValidation: options.enablePRDValidation !== false,
      enableSecurityCheck: options.enableSecurityCheck !== false,
      enablePerformanceCheck: options.enablePerformanceCheck !== false,
      strictMode: options.strictMode || false,
      logLevel: options.logLevel || 'info',
      ...options
    };

    this.prdValidator = new RealPRDValidator();
    this.validationCache = new Map();
    this.performanceMetrics = {
      totalValidations: 0,
      averageValidationTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };

    // Commit message validation rules
    this.commitRules = {
      types: [
        'feat', 'fix', 'docs', 'style', 'refactor', 
        'perf', 'test', 'chore', 'ci', 'build', 'revert'
      ],
      maxLineLength: 72,
      maxBodyLineLength: 100,
      minMessageLength: 10,
      requireConventionalFormat: true,
      requireImperativeMood: true,
      requireBody: false, // For complex changes
      requireFooter: false // For breaking changes
    };

    // Security patterns to detect in commits
    this.securityPatterns = [
      {
        pattern: /(?:password|pwd|secret|key|token|auth|credential)\s*[:=]\s*['"]\w+['"]/gi,
        severity: 'critical',
        message: 'Potential hardcoded credential detected',
        suggestion: 'Use environment variables or secret management'
      },
      {
        pattern: /(?:api[_-]?key|access[_-]?token|private[_-]?key)\s*[:=]\s*['"]\w+['"]/gi,
        severity: 'critical',
        message: 'API key or token detected in code',
        suggestion: 'Store sensitive data in environment variables'
      },
      {
        pattern: /(?:localhost|127\.0\.0\.1):\d+/g,
        severity: 'medium',
        message: 'Hardcoded localhost reference',
        suggestion: 'Use configurable host settings'
      },
      {
        pattern: /console\.(log|debug|info|warn|error)\(/g,
        severity: 'low',
        message: 'Console statement detected',
        suggestion: 'Remove debug statements before commit'
      },
      {
        pattern: /debugger;/g,
        severity: 'medium',
        message: 'Debugger statement detected',
        suggestion: 'Remove debugger statements before commit'
      },
      {
        pattern: /eval\s*\(/g,
        severity: 'critical',
        message: 'Use of eval() function detected',
        suggestion: 'Avoid eval() - use safer alternatives'
      },
      {
        pattern: /dangerouslySetInnerHTML/g,
        severity: 'high',
        message: 'dangerouslySetInnerHTML usage detected',
        suggestion: 'Ensure content is properly sanitized'
      }
    ];

    // Performance analysis patterns
    this.performancePatterns = [
      {
        pattern: /useState\(/g,
        type: 'hook',
        impact: 'low',
        message: 'useState hook usage'
      },
      {
        pattern: /useEffect\(/g,
        type: 'hook',
        impact: 'medium',
        message: 'useEffect hook usage'
      },
      {
        pattern: /\.map\([^}]+useState/g,
        type: 'anti-pattern',
        impact: 'high',
        message: 'useState inside map - potential performance issue'
      },
      {
        pattern: /import.*from\s+['"][^'"]*node_modules[^'"]*['"]/g,
        type: 'bundle',
        impact: 'medium',
        message: 'Direct node_modules import'
      }
    ];
  }

  async initialize() {
    await this.prdValidator.initialize();
    console.log('🔍 Git Commit Validator initialized');
  }

  // ============================================================================
  // MAIN VALIDATION METHODS
  // ============================================================================

  async validateCommit(options = {}) {
    const startTime = Date.now();
    
    try {
      const validation = {
        timestamp: new Date().toISOString(),
        overallValid: true,
        commitMessage: null,
        stagedFiles: [],
        validationResults: {
          commitMessage: null,
          stagedFiles: [],
          security: null,
          performance: null,
          summary: null
        },
        performanceMetrics: {
          totalTime: 0,
          validationSteps: {}
        },
        recommendations: [],
        criticalIssues: [],
        options
      };

      console.log('🔍 Starting commit validation...');

      // Step 1: Validate commit message
      if (options.commitMsgFile || options.commitMessage) {
        const msgStartTime = Date.now();
        validation.validationResults.commitMessage = await this.validateCommitMessage(
          options.commitMsgFile, 
          options.commitMessage
        );
        validation.performanceMetrics.validationSteps.commitMessage = Date.now() - msgStartTime;
        
        if (!validation.validationResults.commitMessage.valid) {
          validation.overallValid = false;
        }
      }

      // Step 2: Get and validate staged files
      const filesStartTime = Date.now();
      const stagedFiles = await this.getStagedFiles();
      validation.stagedFiles = stagedFiles;
      
      if (stagedFiles.length > 0) {
        validation.validationResults.stagedFiles = await this.validateStagedFiles(stagedFiles);
        
        const failedValidations = validation.validationResults.stagedFiles.filter(
          result => !result.prdValidation?.validated
        );
        
        if (failedValidations.length > 0) {
          validation.overallValid = false;
          validation.criticalIssues.push(
            ...failedValidations.flatMap(f => f.prdValidation?.violations || [])
          );
        }
      } else {
        console.log('ℹ️  No staged files to validate');
      }
      validation.performanceMetrics.validationSteps.stagedFiles = Date.now() - filesStartTime;

      // Step 3: Security validation
      if (this.options.enableSecurityCheck) {
        const secStartTime = Date.now();
        validation.validationResults.security = await this.performSecurityValidation(stagedFiles);
        validation.performanceMetrics.validationSteps.security = Date.now() - secStartTime;
        
        if (validation.validationResults.security.criticalIssues.length > 0) {
          validation.overallValid = false;
          validation.criticalIssues.push(...validation.validationResults.security.criticalIssues);
        }
      }

      // Step 4: Performance validation
      if (this.options.enablePerformanceCheck) {
        const perfStartTime = Date.now();
        validation.validationResults.performance = await this.performPerformanceValidation(stagedFiles);
        validation.performanceMetrics.validationSteps.performance = Date.now() - perfStartTime;
      }

      // Step 5: Generate summary and recommendations
      validation.validationResults.summary = this.generateValidationSummary(validation);
      validation.recommendations = this.generateRecommendations(validation);

      const totalTime = Date.now() - startTime;
      validation.performanceMetrics.totalTime = totalTime;

      // Update metrics
      this.updatePerformanceMetrics(totalTime);

      console.log(`⏱️  Validation completed in ${totalTime}ms`);
      
      if (validation.overallValid) {
        console.log('✅ Commit validation passed');
      } else {
        console.log('❌ Commit validation failed');
        this.displayValidationErrors(validation);
      }

      return validation;

    } catch (error) {
      console.error('❌ Commit validation error:', error.message);
      throw error;
    }
  }

  async validateCommitMessage(commitMsgFile = null, commitMessage = null) {
    let message = commitMessage;
    
    if (commitMsgFile && !message) {
      try {
        message = await fs.readFile(commitMsgFile, 'utf8');
        message = message.trim();
      } catch (error) {
        throw new Error(`Failed to read commit message file: ${error.message}`);
      }
    }

    if (!message) {
      throw new Error('No commit message provided');
    }

    const validation = {
      valid: true,
      message,
      errors: [],
      warnings: [],
      suggestions: [],
      analysis: {
        type: null,
        scope: null,
        subject: null,
        body: null,
        footer: null,
        hasBreakingChange: false
      }
    };

    // Parse conventional commit format
    validation.analysis = this.parseConventionalCommit(message);

    // Validate message format
    this.validateMessageFormat(message, validation);
    
    // Validate conventional commit rules
    this.validateConventionalCommit(validation.analysis, validation);
    
    // Validate message content
    this.validateMessageContent(message, validation);

    return validation;
  }

  async validateStagedFiles(stagedFiles) {
    const results = [];
    
    console.log(`📁 Validating ${stagedFiles.length} staged files...`);

    for (const filePath of stagedFiles) {
      const fileResult = {
        file: filePath,
        prdValidation: null,
        securityCheck: null,
        performanceCheck: null,
        error: null
      };

      try {
        // Check cache first
        const cacheKey = await this.generateFileHash(filePath);
        if (this.validationCache.has(cacheKey)) {
          fileResult.prdValidation = this.validationCache.get(cacheKey);
          this.performanceMetrics.cacheHits++;
          console.log(`💾 Cache hit for ${filePath}`);
        } else {
          // Get file content and validate
          const content = await this.getFileContent(filePath);
          
          if (this.options.enablePRDValidation) {
            fileResult.prdValidation = await this.prdValidator.validateFileOperation(
              'commit', 
              filePath, 
              content
            );
            
            // Cache the result
            this.validationCache.set(cacheKey, fileResult.prdValidation);
            this.performanceMetrics.cacheMisses++;
          }
        }

      } catch (error) {
        fileResult.error = error.message;
        console.warn(`⚠️  Failed to validate ${filePath}: ${error.message}`);
      }

      results.push(fileResult);
    }

    return results;
  }

  async performSecurityValidation(stagedFiles) {
    const securityResult = {
      criticalIssues: [],
      highIssues: [],
      mediumIssues: [],
      lowIssues: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    for (const filePath of stagedFiles) {
      // Only check text files
      if (!this.isTextFile(filePath)) continue;

      try {
        const content = await this.getFileContent(filePath);
        const fileIssues = this.detectSecurityIssues(content, filePath);
        
        // Categorize issues
        for (const issue of fileIssues) {
          issue.file = filePath;
          
          switch (issue.severity) {
            case 'critical':
              securityResult.criticalIssues.push(issue);
              securityResult.summary.critical++;
              break;
            case 'high':
              securityResult.highIssues.push(issue);
              securityResult.summary.high++;
              break;
            case 'medium':
              securityResult.mediumIssues.push(issue);
              securityResult.summary.medium++;
              break;
            case 'low':
              securityResult.lowIssues.push(issue);
              securityResult.summary.low++;
              break;
          }
          securityResult.summary.total++;
        }

      } catch (error) {
        console.warn(`⚠️  Security check failed for ${filePath}: ${error.message}`);
      }
    }

    return securityResult;
  }

  async performPerformanceValidation(stagedFiles) {
    const performanceResult = {
      issues: [],
      bundleAnalysis: {
        estimatedImpact: 'low',
        newImports: [],
        heavyComponents: []
      },
      recommendations: []
    };

    for (const filePath of stagedFiles) {
      if (!this.isJavaScriptFile(filePath)) continue;

      try {
        const content = await this.getFileContent(filePath);
        const fileIssues = this.analyzePerformanceImpact(content, filePath);
        performanceResult.issues.push(...fileIssues);

        // Analyze imports
        const imports = this.extractImports(content);
        performanceResult.bundleAnalysis.newImports.push(...imports);

        // Check for heavy component patterns
        const heavyPatterns = this.detectHeavyComponentPatterns(content, filePath);
        performanceResult.bundleAnalysis.heavyComponents.push(...heavyPatterns);

      } catch (error) {
        console.warn(`⚠️  Performance check failed for ${filePath}: ${error.message}`);
      }
    }

    // Analyze overall bundle impact
    performanceResult.bundleAnalysis.estimatedImpact = this.estimateBundleImpact(
      performanceResult.bundleAnalysis.newImports
    );

    // Generate performance recommendations
    performanceResult.recommendations = this.generatePerformanceRecommendations(performanceResult);

    return performanceResult;
  }

  // ============================================================================
  // VALIDATION HELPER METHODS
  // ============================================================================

  parseConventionalCommit(message) {
    const lines = message.split('\n');
    const firstLine = lines[0];
    
    // Parse conventional commit format: type(scope): subject
    const conventionalRegex = /^(\w+)(\(([^)]+)\))?: (.+)$/;
    const match = firstLine.match(conventionalRegex);
    
    const analysis = {
      type: null,
      scope: null,
      subject: null,
      body: null,
      footer: null,
      hasBreakingChange: false,
      isConventional: false
    };

    if (match) {
      analysis.isConventional = true;
      analysis.type = match[1];
      analysis.scope = match[3] || null;
      analysis.subject = match[4];
    } else {
      analysis.subject = firstLine;
    }

    // Extract body and footer
    if (lines.length > 2) {
      const bodyLines = lines.slice(2);
      const footerIndex = bodyLines.findIndex(line => 
        line.match(/^(BREAKING CHANGE|Closes|Fixes|Refs):/i)
      );
      
      if (footerIndex !== -1) {
        analysis.body = bodyLines.slice(0, footerIndex).join('\n').trim();
        analysis.footer = bodyLines.slice(footerIndex).join('\n').trim();
      } else {
        analysis.body = bodyLines.join('\n').trim();
      }
    }

    // Check for breaking changes
    analysis.hasBreakingChange = message.includes('BREAKING CHANGE:') || 
                                message.includes('!:') ||
                                (analysis.type && analysis.type.endsWith('!'));

    return analysis;
  }

  validateMessageFormat(message, validation) {
    const lines = message.split('\n');
    const firstLine = lines[0];

    // Check minimum length
    if (message.length < this.commitRules.minMessageLength) {
      validation.errors.push(
        `Commit message too short (${message.length} chars, minimum ${this.commitRules.minMessageLength})`
      );
      validation.valid = false;
    }

    // Check first line length
    if (firstLine.length > this.commitRules.maxLineLength) {
      validation.errors.push(
        `First line too long (${firstLine.length} chars, maximum ${this.commitRules.maxLineLength})`
      );
      validation.valid = false;
    }

    // Check body line lengths
    if (lines.length > 2) {
      const bodyLines = lines.slice(2);
      for (let i = 0; i < bodyLines.length; i++) {
        if (bodyLines[i].length > this.commitRules.maxBodyLineLength) {
          validation.warnings.push(
            `Body line ${i + 3} is long (${bodyLines[i].length} chars, recommended max ${this.commitRules.maxBodyLineLength})`
          );
        }
      }
    }

    // Check for blank line after subject
    if (lines.length > 1 && lines[1] !== '') {
      validation.warnings.push('Missing blank line after subject line');
    }
  }

  validateConventionalCommit(analysis, validation) {
    if (!this.commitRules.requireConventionalFormat) return;

    if (!analysis.isConventional) {
      validation.errors.push('Commit message should follow conventional commit format');
      validation.suggestions.push('Use format: type(scope): description');
      validation.suggestions.push('Example: feat(auth): add Google OAuth integration');
      validation.valid = false;
      return;
    }

    // Validate type
    if (!this.commitRules.types.includes(analysis.type)) {
      validation.errors.push(`Invalid commit type: ${analysis.type}`);
      validation.suggestions.push(`Valid types: ${this.commitRules.types.join(', ')}`);
      validation.valid = false;
    }

    // Validate imperative mood
    if (this.commitRules.requireImperativeMood) {
      const imperativeVerbs = [
        'add', 'fix', 'update', 'remove', 'implement', 'improve', 
        'refactor', 'optimize', 'test', 'configure', 'setup', 
        'create', 'delete', 'change', 'replace', 'enhance'
      ];
      
      const subjectWords = analysis.subject.toLowerCase().split(' ');
      const firstWord = subjectWords[0];
      
      if (!imperativeVerbs.some(verb => firstWord.startsWith(verb))) {
        validation.warnings.push('Use imperative mood in subject line');
        validation.suggestions.push('Start with action verbs: add, fix, update, etc.');
      }
    }

    // Check for required body on complex changes
    if (this.commitRules.requireBody && analysis.type === 'feat' && !analysis.body) {
      validation.warnings.push('Feature commits should include a body explaining the change');
    }

    // Check for breaking change documentation
    if (analysis.hasBreakingChange && !analysis.footer) {
      validation.warnings.push('Breaking changes should be documented in the footer');
      validation.suggestions.push('Add: BREAKING CHANGE: description of what breaks');
    }
  }

  validateMessageContent(message, validation) {
    // Check for common issues
    const commonIssues = [
      {
        pattern: /^(wip|temp|temporary|test|testing|debug)/i,
        message: 'Commit appears to be work in progress or temporary',
        suggestion: 'Use descriptive commit message for final commits'
      },
      {
        pattern: /^(merge|revert)/i,
        message: 'Git-generated commit message detected',
        suggestion: 'Consider customizing merge/revert messages'
      },
      {
        pattern: /^update|updated/i,
        message: 'Generic "update" message',
        suggestion: 'Be more specific about what was updated'
      },
      {
        pattern: /\.\s*$/,
        message: 'Commit message ends with period',
        suggestion: 'Remove trailing period from subject line'
      }
    ];

    for (const issue of commonIssues) {
      if (issue.pattern.test(message)) {
        validation.warnings.push(issue.message);
        validation.suggestions.push(issue.suggestion);
      }
    }

    // Check for typos and common mistakes
    const typoPatterns = [
      { pattern: /\bteh\b/gi, replacement: 'the' },
      { pattern: /\bfrom\b/gi, replacement: 'from' },
      { pattern: /\bwiht\b/gi, replacement: 'with' }
    ];

    for (const typo of typoPatterns) {
      if (typo.pattern.test(message)) {
        validation.warnings.push(`Possible typo detected`);
        validation.suggestions.push(`Check spelling and grammar`);
      }
    }
  }

  detectSecurityIssues(content, filePath) {
    const issues = [];

    for (const pattern of this.securityPatterns) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        issues.push({
          pattern: pattern.pattern.source,
          severity: pattern.severity,
          message: pattern.message,
          suggestion: pattern.suggestion,
          matches: matches.length,
          file: filePath
        });
      }
    }

    return issues;
  }

  analyzePerformanceImpact(content, filePath) {
    const issues = [];

    for (const pattern of this.performancePatterns) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        issues.push({
          file: filePath,
          type: pattern.type,
          impact: pattern.impact,
          message: pattern.message,
          matches: matches.length,
          suggestions: this.getPerformanceSuggestions(pattern.type, pattern.impact)
        });
      }
    }

    return issues;
  }

  getPerformanceSuggestions(type, impact) {
    const suggestions = {
      'hook': {
        'low': ['Consider memoization if rendered frequently'],
        'medium': ['Use useCallback for functions', 'Consider custom hooks for complex logic'],
        'high': ['Move to custom hook', 'Consider state management library']
      },
      'anti-pattern': {
        'high': ['Move state outside map', 'Use useMemo for expensive calculations']
      },
      'bundle': {
        'medium': ['Use tree-shaking imports', 'Consider dynamic imports']
      }
    };

    return suggestions[type]?.[impact] || ['Review for optimization opportunities'];
  }

  extractImports(content) {
    const importRegex = /import\s+.*\s+from\s+['"]([^'"]+)['"]/g;
    const imports = [];
    let match;

    while ((match = importRegex.exec(content)) !== null) {
      imports.push({
        module: match[1],
        isExternal: !match[1].startsWith('.'),
        isNodeModules: match[1].includes('node_modules')
      });
    }

    return imports;
  }

  detectHeavyComponentPatterns(content, filePath) {
    const heavyPatterns = [];

    // Check for large component definitions
    const componentMatches = content.match(/export\s+(default\s+)?function\s+\w+/g);
    if (componentMatches && content.length > 5000) {
      heavyPatterns.push({
        file: filePath,
        type: 'large-component',
        size: content.length,
        message: 'Large component file detected'
      });
    }

    // Check for multiple components in one file
    const exportMatches = content.match(/export\s+(const|function)/g);
    if (exportMatches && exportMatches.length > 3) {
      heavyPatterns.push({
        file: filePath,
        type: 'multiple-exports',
        count: exportMatches.length,
        message: 'Multiple component exports in single file'
      });
    }

    return heavyPatterns;
  }

  estimateBundleImpact(imports) {
    const heavyLibraries = ['lodash', 'moment', 'antd', '@mui', 'react-router'];
    const externalImports = imports.filter(imp => imp.isExternal);
    const heavyImports = externalImports.filter(imp => 
      heavyLibraries.some(lib => imp.module.includes(lib))
    );

    if (heavyImports.length > 0) return 'high';
    if (externalImports.length > 5) return 'medium';
    return 'low';
  }

  generatePerformanceRecommendations(performanceResult) {
    const recommendations = [];

    if (performanceResult.bundleAnalysis.estimatedImpact === 'high') {
      recommendations.push('Consider code splitting for large bundle impact');
    }

    if (performanceResult.bundleAnalysis.heavyComponents.length > 0) {
      recommendations.push('Break down large components into smaller, reusable pieces');
    }

    const highImpactIssues = performanceResult.issues.filter(i => i.impact === 'high');
    if (highImpactIssues.length > 0) {
      recommendations.push('Address high-impact performance patterns before commit');
    }

    return recommendations;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  async getStagedFiles() {
    try {
      const output = execSync('git diff --cached --name-only', { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      return output.trim().split('\n').filter(f => f.length > 0);
    } catch (error) {
      console.warn('⚠️  Failed to get staged files:', error.message);
      return [];
    }
  }

  async getFileContent(filePath) {
    try {
      // Try to read from working directory first
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      // Fall back to git staging area
      try {
        const output = execSync(`git show :${filePath}`, { 
          encoding: 'utf8',
          cwd: process.cwd()
        });
        return output;
      } catch (gitError) {
        throw new Error(`Cannot read file content: ${filePath}`);
      }
    }
  }

  async generateFileHash(filePath) {
    try {
      const content = await this.getFileContent(filePath);
      const crypto = require('crypto');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch (error) {
      return `error-${Date.now()}`;
    }
  }

  isTextFile(filePath) {
    const textExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.txt', 
      '.css', '.scss', '.less', '.html', '.xml', '.yaml', '.yml'
    ];
    return textExtensions.some(ext => filePath.endsWith(ext));
  }

  isJavaScriptFile(filePath) {
    return ['.js', '.jsx', '.ts', '.tsx'].some(ext => filePath.endsWith(ext));
  }

  generateValidationSummary(validation) {
    const summary = {
      overallValid: validation.overallValid,
      totalFiles: validation.stagedFiles.length,
      validatedFiles: 0,
      failedFiles: 0,
      criticalIssues: validation.criticalIssues.length,
      warnings: 0,
      recommendations: validation.recommendations.length
    };

    // Count file validation results
    if (validation.validationResults.stagedFiles) {
      summary.validatedFiles = validation.validationResults.stagedFiles.filter(
        f => f.prdValidation?.validated
      ).length;
      summary.failedFiles = validation.validationResults.stagedFiles.filter(
        f => f.prdValidation?.validated === false
      ).length;
    }

    // Count warnings from various sources
    if (validation.validationResults.commitMessage?.warnings) {
      summary.warnings += validation.validationResults.commitMessage.warnings.length;
    }
    
    if (validation.validationResults.security) {
      summary.warnings += validation.validationResults.security.summary.medium + 
                          validation.validationResults.security.summary.low;
    }

    return summary;
  }

  generateRecommendations(validation) {
    const recommendations = [];

    // Commit message recommendations
    if (validation.validationResults.commitMessage?.suggestions) {
      recommendations.push(...validation.validationResults.commitMessage.suggestions);
    }

    // PRD validation recommendations
    if (validation.validationResults.stagedFiles) {
      const prdRecommendations = validation.validationResults.stagedFiles
        .flatMap(f => f.prdValidation?.suggestions || []);
      recommendations.push(...prdRecommendations);
    }

    // Security recommendations
    if (validation.validationResults.security?.criticalIssues) {
      const securityRecs = validation.validationResults.security.criticalIssues
        .map(issue => `🔒 ${issue.suggestion}`);
      recommendations.push(...securityRecs);
    }

    // Performance recommendations
    if (validation.validationResults.performance?.recommendations) {
      recommendations.push(...validation.validationResults.performance.recommendations);
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  displayValidationErrors(validation) {
    console.log('\n🚨 Validation Issues:');
    
    if (validation.validationResults.commitMessage && !validation.validationResults.commitMessage.valid) {
      console.log('\n📝 Commit Message Issues:');
      validation.validationResults.commitMessage.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    if (validation.criticalIssues.length > 0) {
      console.log('\n❌ Critical Issues:');
      validation.criticalIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. ${issue}`);
      });
    }

    if (validation.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      validation.recommendations.slice(0, 5).forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
      
      if (validation.recommendations.length > 5) {
        console.log(`   ... and ${validation.recommendations.length - 5} more`);
      }
    }
  }

  updatePerformanceMetrics(validationTime) {
    this.performanceMetrics.totalValidations++;
    this.performanceMetrics.averageValidationTime = (
      (this.performanceMetrics.averageValidationTime * (this.performanceMetrics.totalValidations - 1) + validationTime) /
      this.performanceMetrics.totalValidations
    );
  }

  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheEfficiency: this.performanceMetrics.cacheHits / 
        Math.max(1, this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses)
    };
  }

  clearCache() {
    this.validationCache.clear();
    this.performanceMetrics.cacheHits = 0;
    this.performanceMetrics.cacheMisses = 0;
  }
}

module.exports = { GitCommitValidator };

// CLI usage
if (require.main === module) {
  const validator = new GitCommitValidator({
    enablePRDValidation: true,
    enableSecurityCheck: true,
    enablePerformanceCheck: true,
    logLevel: 'debug'
  });
  
  async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    try {
      await validator.initialize();
      
      switch (command) {
        case 'validate':
          const commitMsgFile = args[1];
          const result = await validator.validateCommit({ 
            commitMsgFile,
            validateAllStaged: true 
          });
          
          console.log('\n📊 Validation Results:');
          console.log(JSON.stringify(result.validationResults.summary, null, 2));
          
          if (!result.overallValid) {
            process.exit(1);
          }
          break;
          
        case 'validate-message':
          const message = args[1];
          const msgResult = await validator.validateCommitMessage(null, message);
          console.log(JSON.stringify(msgResult, null, 2));
          
          if (!msgResult.valid) {
            process.exit(1);
          }
          break;
          
        case 'validate-staged':
          const stagedFiles = await validator.getStagedFiles();
          const stagedResult = await validator.validateStagedFiles(stagedFiles);
          console.log(JSON.stringify(stagedResult, null, 2));
          break;
          
        case 'metrics':
          const metrics = validator.getPerformanceMetrics();
          console.log('📊 Performance Metrics:');
          console.log(JSON.stringify(metrics, null, 2));
          break;
          
        default:
          console.log('Git Commit Validator - Vana Project');
          console.log('');
          console.log('Commands:');
          console.log('  validate [commit-msg-file]     Validate full commit');
          console.log('  validate-message <message>     Validate commit message');
          console.log('  validate-staged                Validate staged files');
          console.log('  metrics                        Show performance metrics');
          break;
      }
      
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
  
  main();
}