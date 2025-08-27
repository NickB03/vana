#!/usr/bin/env node

/**
 * Comprehensive Error Detection and Monitoring System
 * 
 * This module provides intelligent error detection, classification, and pattern learning
 * for automated self-healing workflows. It monitors command outputs, detects various
 * error types, and maintains a learning database for continuous improvement.
 * 
 * @author Claude Code Agent
 * @version 1.0.0
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Error severity levels
const SEVERITY_LEVELS = {
  CRITICAL: 'critical',
  HIGH: 'high', 
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info'
};

// Error categories
const ERROR_CATEGORIES = {
  DEPENDENCY: 'dependency',
  SYNTAX: 'syntax',
  RUNTIME: 'runtime',
  NETWORK: 'network',
  PERMISSION: 'permission',
  CONFIGURATION: 'configuration',
  TEST: 'test',
  BUILD: 'build',
  DEPLOYMENT: 'deployment'
};

// Error pattern database
const ERROR_PATTERNS = {
  // Dependency errors
  MISSING_MODULE: [
    /Cannot find module ['"]([^'"]+)['"]/,
    /Module not found: Error: Can't resolve ['"]([^'"]+)['"]/,
    /Error: Cannot resolve module ['"]([^'"]+)['"]/,
    /ModuleNotFoundError: No module named ['"]([^'"]+)['"]/
  ],
  
  COMMAND_NOT_FOUND: [
    /command not found: (.+)/,
    /(.+): command not found/,
    /'(.+)' is not recognized as an internal or external command/,
    /The term '(.+)' is not recognized/
  ],
  
  PACKAGE_MISSING: [
    /npm ERR! missing: (.+)/,
    /yarn install --check-files/,
    /Package (.+) not found/,
    /Could not resolve dependency: (.+)/
  ],

  // Syntax errors
  JAVASCRIPT_SYNTAX: [
    /SyntaxError: (.+) at (.+):(\d+):(\d+)/,
    /Unexpected token (.+) in (.+) at line (\d+)/,
    /Parse error: (.+) at line (\d+)/
  ],
  
  TYPESCRIPT_SYNTAX: [
    /TS\d+: (.+) at (.+):(\d+):(\d+)/,
    /error TS\d+: (.+)/,
    /TypeScript compilation failed/
  ],
  
  JSON_SYNTAX: [
    /Unexpected token (.+) in JSON at position (\d+)/,
    /JSON.parse: unexpected (.+) at line (\d+)/,
    /Invalid JSON in (.+)/
  ],

  // Runtime errors
  RUNTIME_ERROR: [
    /ReferenceError: (.+) is not defined/,
    /TypeError: (.+)/,
    /RangeError: (.+)/,
    /URIError: (.+)/
  ],
  
  NETWORK_ERROR: [
    /ECONNREFUSED/,
    /ENOTFOUND/,
    /ETIMEDOUT/,
    /Connection refused/,
    /Network timeout/,
    /Failed to fetch/
  ],

  // Permission errors
  PERMISSION_DENIED: [
    /EACCES: permission denied/,
    /Permission denied/,
    /Access is denied/,
    /Operation not permitted/
  ],

  // Test failures
  TEST_FAILURE: [
    /FAIL (.+)/,
    /✗ (.+)/,
    /Failed: (\d+) tests?/,
    /(\d+) failing/,
    /AssertionError: (.+)/
  ],

  // Build errors
  BUILD_FAILURE: [
    /Build failed with (\d+) errors?/,
    /Compilation failed/,
    /webpack compilation failed/,
    /Rollup build failed/
  ],

  // Configuration errors
  CONFIG_ERROR: [
    /Configuration error: (.+)/,
    /Invalid configuration in (.+)/,
    /Missing required configuration: (.+)/,
    /Config validation failed/
  ]
};

// Recovery strategies database
const RECOVERY_STRATEGIES = {
  [ERROR_CATEGORIES.DEPENDENCY]: {
    'missing_module': ['npm install {module}', 'yarn add {module}'],
    'command_not_found': ['npm install -g {command}', 'brew install {command}'],
    'package_missing': ['npm install', 'yarn install', 'npm ci']
  },
  
  [ERROR_CATEGORIES.SYNTAX]: {
    'javascript_syntax': ['lint_fix', 'syntax_check'],
    'typescript_syntax': ['tsc --noEmit', 'eslint --fix'],
    'json_syntax': ['jsonlint', 'format_json']
  },
  
  [ERROR_CATEGORIES.PERMISSION]: {
    'permission_denied': ['chmod +x {file}', 'sudo {command}']
  },
  
  [ERROR_CATEGORIES.TEST]: {
    'test_failure': ['npm test -- --verbose', 'jest --detectOpenHandles']
  },
  
  [ERROR_CATEGORIES.BUILD]: {
    'build_failure': ['npm run clean', 'npm run build -- --verbose']
  }
};

/**
 * Error Detection and Monitoring Class
 */
class ErrorDetector {
  constructor() {
    this.memoryPath = path.join(process.cwd(), '.swarm', 'error-patterns.json');
    this.patterns = new Map();
    this.recoveryHistory = new Map();
    this.errorStats = {
      total: 0,
      byCategory: {},
      bySeverity: {},
      resolved: 0,
      unresolved: 0
    };
    
    this.initializeMemory();
  }

  /**
   * Initialize error pattern memory
   */
  async initializeMemory() {
    try {
      await fs.mkdir(path.dirname(this.memoryPath), { recursive: true });
      
      try {
        const data = await fs.readFile(this.memoryPath, 'utf8');
        const stored = JSON.parse(data);
        
        if (stored.patterns) {
          this.patterns = new Map(Object.entries(stored.patterns));
        }
        
        if (stored.recoveryHistory) {
          this.recoveryHistory = new Map(Object.entries(stored.recoveryHistory));
        }
        
        if (stored.errorStats) {
          this.errorStats = { ...this.errorStats, ...stored.errorStats };
        }
      } catch (readError) {
        // File doesn't exist yet, start with empty state
        console.log('Initializing new error pattern database');
      }
    } catch (error) {
      console.error('Failed to initialize error detector memory:', error);
    }
  }

  /**
   * Monitor bash command output for errors
   * @param {string} command - The command that was executed
   * @param {string} output - The command output (stdout + stderr)
   * @param {number} exitCode - The command exit code
   * @returns {Promise<Object>} Detection result
   */
  async monitorCommand(command, output, exitCode) {
    // Handle undefined/null inputs
    const safeCommand = command || 'unknown';
    const safeOutput = output || '';
    const safeExitCode = typeof exitCode === 'number' ? exitCode : -1;
    
    const detectionResult = {
      hasError: safeExitCode !== 0 || this.containsErrorPatterns(safeOutput),
      command: safeCommand,
      exitCode: safeExitCode,
      errors: [],
      suggestions: [],
      severity: SEVERITY_LEVELS.INFO,
      category: null,
      timestamp: new Date().toISOString()
    };

    if (detectionResult.hasError) {
      detectionResult.errors = this.detectErrorPatterns(safeOutput);
      
      if (detectionResult.errors.length > 0) {
        // Classify the most severe error
        const classifications = detectionResult.errors.map(error => this.classifyError(error));
        const mostSevere = this.getMostSevereClassification(classifications);
        
        detectionResult.severity = mostSevere.severity;
        detectionResult.category = mostSevere.category;
        detectionResult.suggestions = this.generateRecoverySuggestions(detectionResult.errors);
        
        // Store pattern for learning
        await this.storeErrorPattern(detectionResult, null);
        
        // Update statistics
        this.updateErrorStats(detectionResult);
      }
    }

    return detectionResult;
  }

  /**
   * Detect if output contains error patterns
   * @param {string} output - Command output to check
   * @returns {boolean} True if error patterns found
   */
  containsErrorPatterns(output) {
    // Handle undefined/null output
    if (!output || typeof output !== 'string') {
      return false;
    }
    
    for (const patternGroup of Object.values(ERROR_PATTERNS)) {
      for (const pattern of patternGroup) {
        if (pattern.test(output)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Detect specific error patterns in output
   * @param {string} output - Output to analyze
   * @returns {Array} Detected errors
   */
  detectErrorPatterns(output) {
    const errors = [];
    
    // Handle undefined/null output
    if (!output || typeof output !== 'string') {
      return errors;
    }
    
    const lines = output.split('\n');
    
    for (const [patternType, patterns] of Object.entries(ERROR_PATTERNS)) {
      for (const pattern of patterns) {
        for (let i = 0; i < lines.length; i++) {
          const match = pattern.exec(lines[i]);
          if (match) {
            errors.push({
              type: patternType,
              message: lines[i].trim(),
              match: match[0],
              captured: match.slice(1),
              lineNumber: i + 1,
              context: this.getErrorContext(lines, i)
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Detect missing dependency from error message
   * @param {string} errorMessage - Error message to analyze
   * @returns {Object|null} Dependency info or null
   */
  detectMissingDependency(errorMessage) {
    // Handle undefined/null error messages
    if (!errorMessage || typeof errorMessage !== 'string') {
      return null;
    }
    
    const dependencyPatterns = [
      ...ERROR_PATTERNS.MISSING_MODULE,
      ...ERROR_PATTERNS.COMMAND_NOT_FOUND,
      ...ERROR_PATTERNS.PACKAGE_MISSING
    ];

    for (const pattern of dependencyPatterns) {
      const match = pattern.exec(errorMessage);
      if (match && match[1]) {
        const dependency = match[1].trim();
        
        return {
          type: 'missing_dependency',
          name: dependency,
          package: dependency, // Add package field for compatibility
          suggestion: `npm install ${dependency}`, // Add suggestion field
          category: ERROR_CATEGORIES.DEPENDENCY,
          severity: SEVERITY_LEVELS.HIGH,
          suggestions: this.getDependencyInstallSuggestions(dependency),
          detected: true
        };
      }
    }

    return null;
  }

  /**
   * Analyze syntax error in detail
   * @param {Error} error - The syntax error object
   * @param {string} filePath - Path to the file with error
   * @returns {Object} Detailed syntax error analysis
   */
  async analyzeSyntaxError(error, filePath) {
    const analysis = {
      type: 'syntax_error',
      file: filePath,
      message: error.message,
      category: ERROR_CATEGORIES.SYNTAX,
      severity: SEVERITY_LEVELS.HIGH,
      suggestions: [],
      context: null,
      lineNumber: null,
      columnNumber: null
    };

    // Extract line/column info from error - handle undefined error.message
    const errorMessage = error.message || error.toString() || '';
    const errorStack = error.stack || '';
    
    // Try multiple patterns to extract location info
    const locationPatterns = [
      /at line (\d+):(\d+)/,
      /:(\d+):(\d+)/,
      /\((.*?):(\d+):(\d+)\)/,
      /at.*?:(\d+):(\d+)/,
      /line (\d+), column (\d+)/
    ];
    
    let locationMatch = null;
    for (const pattern of locationPatterns) {
      locationMatch = errorMessage.match(pattern) || errorStack.match(pattern);
      if (locationMatch) break;
    }
    
    if (locationMatch) {
      // Handle different match group patterns
      if (locationMatch.length >= 4) {
        analysis.lineNumber = parseInt(locationMatch[2]);
        analysis.columnNumber = parseInt(locationMatch[3]);
      } else if (locationMatch.length >= 3) {
        analysis.lineNumber = parseInt(locationMatch[1]);
        analysis.columnNumber = parseInt(locationMatch[2]);
      }
    }
    
    // Additional extraction from stack trace if not found in message
    if (!analysis.lineNumber && errorStack) {
      const stackMatch = errorStack.match(/at.*?:(\d+):(\d+)/);
      if (stackMatch) {
        analysis.lineNumber = parseInt(stackMatch[1]);
        analysis.columnNumber = parseInt(stackMatch[2]);
      }
    }

    // Determine file type and specific syntax error type
    const extension = path.extname(filePath);
    switch (extension) {
      case '.js':
      case '.jsx':
        analysis.subtype = 'javascript';
        analysis.suggestions = [
          'Run ESLint with --fix flag',
          'Check for missing semicolons or brackets',
          'Validate variable declarations'
        ];
        break;
      
      case '.ts':
      case '.tsx':
        analysis.subtype = 'typescript';
        analysis.suggestions = [
          'Run TypeScript compiler check',
          'Verify type annotations',
          'Check for import/export syntax'
        ];
        break;
      
      case '.json':
        analysis.subtype = 'json';
        analysis.suggestions = [
          'Validate JSON syntax with jsonlint',
          'Check for trailing commas',
          'Verify quote escaping'
        ];
        break;
    }

    // Try to read file context if line number available
    if (analysis.lineNumber && await this.fileExists(filePath)) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.split('\n');
        analysis.context = this.getErrorContext(lines, analysis.lineNumber - 1);
      } catch (readError) {
        console.warn(`Could not read file context for ${filePath}:`, readError.message);
      }
    }

    return analysis;
  }

  /**
   * Classify error by severity and type
   * @param {Object} error - Error object to classify
   * @returns {Object} Classification result
   */
  classifyError(error) {
    const classification = {
      severity: SEVERITY_LEVELS.MEDIUM,
      category: ERROR_CATEGORIES.RUNTIME,
      priority: 5,
      fixable: false,
      automated: false
    };

    // Classify by error type
    switch (error.type) {
      case 'MISSING_MODULE':
      case 'COMMAND_NOT_FOUND':
      case 'PACKAGE_MISSING':
        classification.category = ERROR_CATEGORIES.DEPENDENCY;
        classification.severity = SEVERITY_LEVELS.HIGH;
        classification.priority = 2;
        classification.fixable = true;
        classification.automated = true;
        break;
      
      case 'JAVASCRIPT_SYNTAX':
      case 'TYPESCRIPT_SYNTAX':
      case 'JSON_SYNTAX':
        classification.category = ERROR_CATEGORIES.SYNTAX;
        classification.severity = SEVERITY_LEVELS.HIGH;
        classification.priority = 1;
        classification.fixable = true;
        classification.automated = false;
        break;
      
      case 'PERMISSION_DENIED':
        classification.category = ERROR_CATEGORIES.PERMISSION;
        classification.severity = SEVERITY_LEVELS.MEDIUM;
        classification.priority = 3;
        classification.fixable = true;
        classification.automated = true;
        break;
      
      case 'NETWORK_ERROR':
        classification.category = ERROR_CATEGORIES.NETWORK;
        classification.severity = SEVERITY_LEVELS.MEDIUM;
        classification.priority = 4;
        classification.fixable = false;
        classification.automated = false;
        break;
      
      case 'TEST_FAILURE':
        classification.category = ERROR_CATEGORIES.TEST;
        classification.severity = SEVERITY_LEVELS.MEDIUM;
        classification.priority = 3;
        classification.fixable = true;
        classification.automated = false;
        break;
      
      case 'BUILD_FAILURE':
        classification.category = ERROR_CATEGORIES.BUILD;
        classification.severity = SEVERITY_LEVELS.HIGH;
        classification.priority = 2;
        classification.fixable = true;
        classification.automated = false;
        break;
    }

    // Adjust severity based on error context
    if (error.message.includes('CRITICAL') || error.message.includes('FATAL')) {
      classification.severity = SEVERITY_LEVELS.CRITICAL;
      classification.priority = 1;
    }

    return classification;
  }

  /**
   * Store error pattern and recovery for learning
   * @param {Object} error - Error information
   * @param {Object} recovery - Recovery information (if successful)
   */
  async storeErrorPattern(error, recovery) {
    const patternKey = this.generatePatternKey(error);
    const timestamp = new Date().toISOString();
    
    // Store or update pattern
    const existingPattern = this.patterns.get(patternKey) || {
      occurrences: 0,
      firstSeen: timestamp,
      recoveries: [],
      successfulRecoveries: 0,
      failedRecoveries: 0
    };

    existingPattern.occurrences++;
    existingPattern.lastSeen = timestamp;
    existingPattern.errorData = error;

    if (recovery) {
      existingPattern.recoveries.push({
        ...recovery,
        timestamp,
        success: recovery.success || false
      });
      
      if (recovery.success) {
        existingPattern.successfulRecoveries++;
      } else {
        existingPattern.failedRecoveries++;
      }
    }

    this.patterns.set(patternKey, existingPattern);
    
    // Store to memory
    await this.saveToMemory();
    
    // Store in claude-flow memory system
    try {
      execSync(`npx claude-flow@alpha memory store --key "error-patterns/${patternKey}" --value '${JSON.stringify(existingPattern)}' --namespace "self-healing"`, 
        { stdio: 'pipe' });
    } catch (memoryError) {
      // Memory storage is optional
      console.warn('Failed to store in claude-flow memory:', memoryError.message);
    }
  }

  /**
   * Generate suggestions for recovery
   * @param {Array} errors - Array of detected errors
   * @returns {Array} Recovery suggestions
   */
  generateRecoverySuggestions(errors) {
    const suggestions = [];
    const seenSuggestions = new Set();

    for (const error of errors) {
      const classification = this.classifyError(error);
      const strategies = RECOVERY_STRATEGIES[classification.category];
      
      if (strategies) {
        const errorTypeKey = error.type.toLowerCase();
        const matchingStrategies = strategies[errorTypeKey] || strategies[Object.keys(strategies)[0]];
        
        if (matchingStrategies) {
          for (const strategy of matchingStrategies) {
            let suggestion = strategy;
            
            // Replace placeholders with actual values
            if (error.captured && error.captured.length > 0) {
              suggestion = suggestion.replace('{module}', error.captured[0]);
              suggestion = suggestion.replace('{command}', error.captured[0]);
              suggestion = suggestion.replace('{file}', error.captured[1] || 'file');
            }
            
            if (!seenSuggestions.has(suggestion)) {
              suggestions.push({
                command: suggestion,
                category: classification.category,
                automated: classification.automated,
                priority: classification.priority,
                description: this.getRecoveryDescription(suggestion)
              });
              seenSuggestions.add(suggestion);
            }
          }
        }
      }
    }

    return suggestions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get dependency installation suggestions
   * @param {string} dependency - Name of missing dependency
   * @returns {Array} Installation suggestions
   */
  getDependencyInstallSuggestions(dependency) {
    const suggestions = [];
    
    // Check if it's a global command
    if (this.isGlobalCommand(dependency)) {
      suggestions.push(`npm install -g ${dependency}`);
      suggestions.push(`brew install ${dependency}`);
    } else {
      // Local package
      suggestions.push(`npm install ${dependency}`);
      suggestions.push(`yarn add ${dependency}`);
      
      // Check if it might be a dev dependency
      if (this.isDevDependency(dependency)) {
        suggestions.push(`npm install --save-dev ${dependency}`);
        suggestions.push(`yarn add --dev ${dependency}`);
      }
    }

    return suggestions;
  }

  /**
   * Get error context lines around the error
   * @param {Array} lines - All lines from the output/file
   * @param {number} errorLine - Line number with error (0-based)
   * @returns {Object} Context object
   */
  getErrorContext(lines, errorLine) {
    const contextSize = 3;
    const start = Math.max(0, errorLine - contextSize);
    const end = Math.min(lines.length, errorLine + contextSize + 1);
    
    return {
      before: lines.slice(start, errorLine),
      error: lines[errorLine],
      after: lines.slice(errorLine + 1, end),
      lineNumber: errorLine + 1
    };
  }

  /**
   * Get most severe classification from multiple errors
   * @param {Array} classifications - Array of error classifications
   * @returns {Object} Most severe classification
   */
  getMostSevereClassification(classifications) {
    const severityOrder = {
      [SEVERITY_LEVELS.CRITICAL]: 0,
      [SEVERITY_LEVELS.HIGH]: 1,
      [SEVERITY_LEVELS.MEDIUM]: 2,
      [SEVERITY_LEVELS.LOW]: 3,
      [SEVERITY_LEVELS.INFO]: 4
    };

    return classifications.reduce((most, current) => {
      if (severityOrder[current.severity] < severityOrder[most.severity]) {
        return current;
      }
      return most;
    });
  }

  /**
   * Generate a unique key for error pattern
   * @param {Object} error - Error object
   * @returns {string} Pattern key
   */
  generatePatternKey(error) {
    const errorType = error.errors?.[0]?.type || 'unknown';
    const category = error.category || 'unknown';
    const commandBase = error.command ? error.command.split(' ')[0] : 'unknown';
    
    return `${category}_${errorType}_${commandBase}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  }

  /**
   * Update error statistics
   * @param {Object} errorResult - Error detection result
   */
  updateErrorStats(errorResult) {
    this.errorStats.total++;
    
    if (!this.errorStats.byCategory[errorResult.category]) {
      this.errorStats.byCategory[errorResult.category] = 0;
    }
    this.errorStats.byCategory[errorResult.category]++;
    
    if (!this.errorStats.bySeverity[errorResult.severity]) {
      this.errorStats.bySeverity[errorResult.severity] = 0;
    }
    this.errorStats.bySeverity[errorResult.severity]++;
  }

  /**
   * Get recovery description for a command
   * @param {string} command - Recovery command
   * @returns {string} Human readable description
   */
  getRecoveryDescription(command) {
    const descriptions = {
      'npm install': 'Install missing npm packages',
      'yarn add': 'Add package using Yarn',
      'npm install -g': 'Install global npm package',
      'brew install': 'Install using Homebrew (macOS)',
      'chmod +x': 'Make file executable',
      'lint_fix': 'Run linter with auto-fix',
      'npm test': 'Run test suite',
      'npm run build': 'Build the project'
    };

    for (const [key, desc] of Object.entries(descriptions)) {
      if (command.includes(key)) {
        return desc;
      }
    }

    return `Execute: ${command}`;
  }

  /**
   * Check if dependency is a global command
   * @param {string} dependency - Dependency name
   * @returns {boolean} True if likely global command
   */
  isGlobalCommand(dependency) {
    const globalCommands = ['webpack', 'typescript', 'eslint', 'prettier', 'jest', 'mocha', 'cypress'];
    return globalCommands.includes(dependency.toLowerCase());
  }

  /**
   * Check if dependency is likely a dev dependency
   * @param {string} dependency - Dependency name
   * @returns {boolean} True if likely dev dependency
   */
  isDevDependency(dependency) {
    const devPatterns = ['test', 'spec', 'mock', 'stub', 'lint', 'format', 'build', 'webpack', 'babel', 'typescript'];
    const depLower = dependency.toLowerCase();
    return devPatterns.some(pattern => depLower.includes(pattern));
  }

  /**
   * Check if file exists
   * @param {string} filePath - Path to check
   * @returns {boolean} True if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Save patterns to persistent memory
   */
  async saveToMemory() {
    try {
      const data = {
        patterns: Object.fromEntries(this.patterns),
        recoveryHistory: Object.fromEntries(this.recoveryHistory),
        errorStats: this.errorStats,
        lastUpdated: new Date().toISOString()
      };
      
      await fs.writeFile(this.memoryPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save error patterns to memory:', error);
    }
  }

  /**
   * Get error statistics
   * @returns {Object} Current error statistics
   */
  getErrorStats() {
    return { ...this.errorStats };
  }

  /**
   * Get learned patterns
   * @returns {Array} Array of learned error patterns
   */
  getLearnedPatterns() {
    return Array.from(this.patterns.entries()).map(([key, pattern]) => ({
      key,
      ...pattern
    }));
  }

  /**
   * Clear error patterns (for testing or reset)
   */
  async clearPatterns() {
    this.patterns.clear();
    this.recoveryHistory.clear();
    this.errorStats = {
      total: 0,
      byCategory: {},
      bySeverity: {},
      resolved: 0,
      unresolved: 0
    };
    
    await this.saveToMemory();
  }
}

// Create singleton instance
const errorDetector = new ErrorDetector();

// Export functions for external use
module.exports = {
  /**
   * Monitor command output for errors
   * @param {string} command - Command that was executed
   * @param {string} output - Command output
   * @param {number} exitCode - Exit code
   * @returns {Promise<Object>} Detection result
   */
  async monitorCommand(command, output, exitCode) {
    return errorDetector.monitorCommand(command, output, exitCode);
  },

  /**
   * Detect missing dependency
   * @param {string} errorMessage - Error message
   * @returns {Object|null} Dependency info
   */
  detectMissingDependency(errorMessage) {
    return errorDetector.detectMissingDependency(errorMessage);
  },

  /**
   * Analyze syntax error
   * @param {Error} error - Syntax error
   * @param {string} filePath - File path
   * @returns {Promise<Object>} Error analysis
   */
  async analyzeSyntaxError(error, filePath) {
    return errorDetector.analyzeSyntaxError(error, filePath);
  },

  /**
   * Classify error
   * @param {Object} error - Error object
   * @returns {Object} Classification
   */
  classifyError(error) {
    return errorDetector.classifyError(error);
  },

  /**
   * Store error pattern
   * @param {Object} error - Error information
   * @param {Object} recovery - Recovery information
   * @returns {Promise<void>}
   */
  async storeErrorPattern(error, recovery) {
    return errorDetector.storeErrorPattern(error, recovery);
  },

  // Utility exports
  SEVERITY_LEVELS,
  ERROR_CATEGORIES,
  errorDetector,

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    return errorDetector.getErrorStats();
  },

  /**
   * Get learned patterns
   * @returns {Array} Learned patterns
   */
  getLearnedPatterns() {
    return errorDetector.getLearnedPatterns();
  }
};

// CLI interface when run directly
if (require.main === module) {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'test':
      console.log('Testing error detection patterns...');
      // Test various error patterns
      const testCases = [
        'Cannot find module "express"',
        'command not found: webpack',
        'SyntaxError: Unexpected token } at line 42',
        'ECONNREFUSED connection refused',
        'Permission denied'
      ];
      
      testCases.forEach(testCase => {
        console.log(`\nTesting: ${testCase}`);
        const dependency = errorDetector.detectMissingDependency(testCase);
        if (dependency) {
          console.log('Detected dependency issue:', dependency);
        }
      });
      break;
      
    case 'stats':
      console.log('Error Detection Statistics:');
      console.log(JSON.stringify(errorDetector.getErrorStats(), null, 2));
      break;
      
    case 'patterns':
      console.log('Learned Error Patterns:');
      const patterns = errorDetector.getLearnedPatterns();
      patterns.forEach(pattern => {
        console.log(`${pattern.key}: ${pattern.occurrences} occurrences`);
      });
      break;
      
    default:
      console.log('Usage: node error-detector.js [test|stats|patterns]');
  }
}