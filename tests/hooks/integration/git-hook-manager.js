#!/usr/bin/env node

/**
 * Git Hook Manager - Central management for Git hook integration
 * 
 * This module provides comprehensive Git hook installation, configuration,
 * and management for the Vana project. It integrates with the existing
 * ClaudeCodeFileHooksWithBackup system to provide Git workflow validation.
 * 
 * Features:
 * - Automatic Git hook installation and setup
 * - Hook configuration management with bypass options
 * - Integration with existing PRD validation system
 * - Performance monitoring and reporting
 * - Emergency bypass mechanisms for critical situations
 * - Backup integration for safe Git operations
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const { ClaudeCodeFileHooksWithBackup } = require('./claude-code-file-hooks-with-backup');

class GitHookManager {
  constructor(options = {}) {
    this.options = {
      gitDir: options.gitDir || path.join(process.cwd(), '.git'),
      hooksDir: options.hooksDir || path.join(process.cwd(), '.git/hooks'),
      configDir: options.configDir || path.join(process.cwd(), '.claude_workspace'),
      enableBackup: options.enableBackup !== false,
      enableBypass: options.enableBypass !== false,
      logLevel: options.logLevel || 'info',
      ...options
    };

    this.configPath = path.join(this.options.configDir, 'git-hooks-config.json');
    this.claudeHooks = null;
    this.config = null;
    this.isInitialized = false;

    // Git hook types and their purposes
    this.hookTypes = {
      'pre-commit': {
        description: 'Validate staged files against PRD before commit',
        blocking: true,
        critical: true
      },
      'pre-push': {
        description: 'Comprehensive checks before push to remote',
        blocking: true,
        critical: true
      },
      'post-commit': {
        description: 'Automated tasks after successful commit',
        blocking: false,
        critical: false
      },
      'post-merge': {
        description: 'Dependency updates and cleanup after merge',
        blocking: false,
        critical: false
      },
      'pre-rebase': {
        description: 'Safety checks before rebase operations',
        blocking: true,
        critical: true
      },
      'commit-msg': {
        description: 'Validate commit message format and content',
        blocking: true,
        critical: false
      }
    };
  }

  async initialize() {
    if (this.isInitialized) return;

    console.log('🔧 Initializing Git Hook Manager...');

    // Ensure directories exist
    await this.ensureDirectories();

    // Load or create configuration
    this.config = await this.loadConfig();

    // Initialize Claude Code hooks
    this.claudeHooks = new ClaudeCodeFileHooksWithBackup({
      enableBackup: this.options.enableBackup,
      logLevel: this.options.logLevel,
      enableEmergencyRestore: true
    });

    await this.claudeHooks.initialize();

    this.isInitialized = true;
    console.log('✅ Git Hook Manager initialized');
  }

  async ensureDirectories() {
    const dirs = [
      this.options.configDir,
      this.options.hooksDir
    ];

    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch (error) {
        await fs.mkdir(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    }
  }

  async loadConfig() {
    const defaultConfig = {
      enabled: true,
      hooks: {},
      bypass: {
        enabled: this.options.enableBypass,
        password: null,
        temporaryBypass: null,
        emergencyContacts: []
      },
      validation: {
        enablePRDValidation: true,
        enableSecurityCheck: true,
        enablePerformanceCheck: true,
        strictMode: false
      },
      backup: {
        createBackupOnBlock: true,
        enableEmergencyRestore: true,
        backupRetention: 30 // days
      },
      notifications: {
        onBlock: true,
        onBypass: true,
        onEmergency: true
      },
      performance: {
        maxHookTime: 30000, // 30 seconds
        enableParallelValidation: true,
        cacheValidationResults: true
      },
      version: '1.0.0',
      lastUpdated: new Date().toISOString()
    };

    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      const loadedConfig = JSON.parse(configData);
      return { ...defaultConfig, ...loadedConfig };
    } catch (error) {
      // Config doesn't exist, create default
      await this.saveConfig(defaultConfig);
      return defaultConfig;
    }
  }

  async saveConfig(config = this.config) {
    this.config = config;
    this.config.lastUpdated = new Date().toISOString();
    await fs.writeFile(this.configPath, JSON.stringify(this.config, null, 2));
  }

  // ============================================================================
  // HOOK INSTALLATION AND MANAGEMENT
  // ============================================================================

  async installAllHooks() {
    console.log('🔨 Installing Git hooks...');
    
    const results = {};
    
    for (const [hookType, hookInfo] of Object.entries(this.hookTypes)) {
      try {
        const result = await this.installHook(hookType);
        results[hookType] = result;
        console.log(`✅ ${hookType}: ${result.status}`);
      } catch (error) {
        results[hookType] = { status: 'failed', error: error.message };
        console.error(`❌ ${hookType}: ${error.message}`);
      }
    }

    // Update configuration with installation results
    this.config.hooks = results;
    this.config.lastInstallation = new Date().toISOString();
    await this.saveConfig();

    return results;
  }

  async installHook(hookType) {
    if (!this.hookTypes[hookType]) {
      throw new Error(`Unknown hook type: ${hookType}`);
    }

    const hookPath = path.join(this.options.hooksDir, hookType);
    const hookContent = await this.generateHookContent(hookType);

    // Check if hook already exists
    let existingHook = null;
    try {
      existingHook = await fs.readFile(hookPath, 'utf8');
    } catch (error) {
      // Hook doesn't exist, which is fine
    }

    // Create backup of existing hook if it exists and isn't ours
    if (existingHook && !existingHook.includes('# Vana Git Hook Manager')) {
      const backupPath = `${hookPath}.backup.${Date.now()}`;
      await fs.writeFile(backupPath, existingHook);
      console.log(`📦 Backed up existing hook to: ${backupPath}`);
    }

    // Write new hook
    await fs.writeFile(hookPath, hookContent);
    await fs.chmod(hookPath, 0o755); // Make executable

    return {
      status: 'installed',
      path: hookPath,
      timestamp: new Date().toISOString(),
      previousBackup: existingHook ? true : false
    };
  }

  async generateHookContent(hookType) {
    const managerPath = path.resolve(__filename);
    const hookInfo = this.hookTypes[hookType];

    return `#!/bin/bash
# Vana Git Hook Manager - ${hookType}
# ${hookInfo.description}
# Auto-generated on ${new Date().toISOString()}

# Execute the Git hook through the manager
exec node "${managerPath}" execute-hook "${hookType}" "$@"
`;
  }

  async uninstallHook(hookType) {
    const hookPath = path.join(this.options.hooksDir, hookType);
    
    try {
      const hookContent = await fs.readFile(hookPath, 'utf8');
      
      // Only uninstall if it's our hook
      if (hookContent.includes('# Vana Git Hook Manager')) {
        await fs.unlink(hookPath);
        console.log(`🗑️  Uninstalled ${hookType} hook`);
        
        // Look for backup and restore if available
        const backupFiles = await fs.readdir(this.options.hooksDir);
        const backupFile = backupFiles.find(f => f.startsWith(`${hookType}.backup.`));
        
        if (backupFile) {
          const backupPath = path.join(this.options.hooksDir, backupFile);
          const backupContent = await fs.readFile(backupPath, 'utf8');
          await fs.writeFile(hookPath, backupContent);
          await fs.chmod(hookPath, 0o755);
          await fs.unlink(backupPath);
          console.log(`🔄 Restored previous hook from backup`);
        }
        
        return { status: 'uninstalled', restored: !!backupFile };
      } else {
        return { status: 'not-ours', message: 'Hook was not installed by Vana Git Hook Manager' };
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { status: 'not-found', message: 'Hook file does not exist' };
      }
      throw error;
    }
  }

  async uninstallAllHooks() {
    console.log('🗑️  Uninstalling all Git hooks...');
    
    const results = {};
    
    for (const hookType of Object.keys(this.hookTypes)) {
      try {
        const result = await this.uninstallHook(hookType);
        results[hookType] = result;
        console.log(`✅ ${hookType}: ${result.status}`);
      } catch (error) {
        results[hookType] = { status: 'failed', error: error.message };
        console.error(`❌ ${hookType}: ${error.message}`);
      }
    }

    return results;
  }

  // ============================================================================
  // HOOK EXECUTION ENGINE
  // ============================================================================

  async executeHook(hookType, args = []) {
    const startTime = Date.now();
    
    try {
      await this.initialize();

      console.log(`🪝 Executing ${hookType} hook...`);

      // Check if hooks are globally disabled
      if (!this.config.enabled) {
        console.log('⏭️  Git hooks are disabled globally');
        return { allowed: true, bypassed: true, reason: 'hooks-disabled' };
      }

      // Check for temporary bypass
      if (await this.checkTemporaryBypass()) {
        console.log('⏭️  Temporary bypass is active');
        return { allowed: true, bypassed: true, reason: 'temporary-bypass' };
      }

      // Execute hook-specific logic
      const result = await this.executeHookLogic(hookType, args);
      
      const duration = Date.now() - startTime;
      console.log(`⏱️  Hook execution completed in ${duration}ms`);

      // Log execution for audit
      await this.logHookExecution(hookType, result, duration);

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Hook execution failed: ${error.message}`);
      
      await this.logHookExecution(hookType, { 
        allowed: false, 
        error: error.message, 
        critical: this.hookTypes[hookType]?.critical 
      }, duration);

      // For critical hooks, block the operation
      if (this.hookTypes[hookType]?.critical) {
        process.exit(1);
      }

      return { allowed: false, error: error.message };
    }
  }

  async executeHookLogic(hookType, args) {
    switch (hookType) {
      case 'pre-commit':
        return await this.executePreCommitHook(args);
      case 'pre-push':
        return await this.executePrePushHook(args);
      case 'post-commit':
        return await this.executePostCommitHook(args);
      case 'post-merge':
        return await this.executePostMergeHook(args);
      case 'pre-rebase':
        return await this.executePreRebaseHook(args);
      case 'commit-msg':
        return await this.executeCommitMsgHook(args);
      default:
        throw new Error(`Unknown hook type: ${hookType}`);
    }
  }

  // ============================================================================
  // INDIVIDUAL HOOK IMPLEMENTATIONS
  // ============================================================================

  async executePreCommitHook(args) {
    console.log('🔍 Running pre-commit validation...');
    
    // Get staged files
    const stagedFiles = await this.getStagedFiles();
    
    if (stagedFiles.length === 0) {
      console.log('ℹ️  No staged files to validate');
      return { allowed: true, files: [] };
    }

    console.log(`📁 Validating ${stagedFiles.length} staged files...`);

    const validationResults = [];
    let overallAllowed = true;
    let criticalViolations = [];

    // Validate each staged file
    for (const filePath of stagedFiles) {
      try {
        const content = await this.getFileContent(filePath);
        const result = await this.claudeHooks.executePreWriteHook(filePath, content, {
          gitOperation: 'pre-commit',
          stagedFile: true
        });

        validationResults.push({
          file: filePath,
          result: result
        });

        if (!result.allowed) {
          overallAllowed = false;
          
          if (result.violations && result.violations.length > 0) {
            criticalViolations.push(...result.violations.map(v => ({ file: filePath, violation: v })));
          }
        }

      } catch (error) {
        console.warn(`⚠️  Failed to validate ${filePath}: ${error.message}`);
        validationResults.push({
          file: filePath,
          error: error.message
        });
      }
    }

    // Generate summary
    const summary = this.generateValidationSummary(validationResults);
    
    if (!overallAllowed) {
      console.log('\n❌ Pre-commit validation failed:');
      console.log('🚨 Critical violations found:');
      criticalViolations.forEach((violation, index) => {
        console.log(`   ${index + 1}. ${violation.file}: ${violation.violation}`);
      });
      console.log('\n💡 Fix these issues and try again, or use bypass options.');
    } else {
      console.log('✅ Pre-commit validation passed');
    }

    return {
      allowed: overallAllowed,
      validationResults,
      summary,
      criticalViolations,
      hookType: 'pre-commit'
    };
  }

  async executePrePushHook(args) {
    console.log('🚀 Running pre-push validation...');
    
    const [remoteName, remoteUrl] = args;
    console.log(`📡 Pushing to remote: ${remoteName} (${remoteUrl})`);

    // Get commits being pushed
    const commits = await this.getCommitsBeingPushed(remoteName);
    console.log(`📝 Analyzing ${commits.length} commits...`);

    // Run comprehensive checks
    const checks = await Promise.all([
      this.runTestSuite(),
      this.runLintChecks(),
      this.runSecurityChecks(),
      this.checkBranchProtection(remoteName),
      this.validateCommitMessages(commits)
    ]);

    const [testResults, lintResults, securityResults, branchCheck, commitMsgResults] = checks;

    const overallPassed = testResults.passed && 
                         lintResults.passed && 
                         securityResults.passed && 
                         branchCheck.allowed &&
                         commitMsgResults.passed;

    if (!overallPassed) {
      console.log('\n❌ Pre-push validation failed:');
      if (!testResults.passed) console.log('🧪 Test failures detected');
      if (!lintResults.passed) console.log('🔍 Lint issues detected');
      if (!securityResults.passed) console.log('🔒 Security issues detected');
      if (!branchCheck.allowed) console.log('🚫 Branch protection violations');
      if (!commitMsgResults.passed) console.log('📝 Commit message issues');
    } else {
      console.log('✅ Pre-push validation passed');
    }

    return {
      allowed: overallPassed,
      testResults,
      lintResults,
      securityResults,
      branchCheck,
      commitMsgResults,
      hookType: 'pre-push'
    };
  }

  async executePostCommitHook(args) {
    console.log('📋 Running post-commit tasks...');
    
    try {
      // Get the latest commit info
      const commitInfo = await this.getLatestCommitInfo();
      console.log(`📝 Processing commit: ${commitInfo.hash} - ${commitInfo.message}`);

      // Run post-commit tasks
      const tasks = [];

      // Update documentation if needed
      if (await this.shouldUpdateDocs(commitInfo)) {
        tasks.push(this.updateDocumentation(commitInfo));
      }

      // Update version if needed
      if (await this.shouldUpdateVersion(commitInfo)) {
        tasks.push(this.updateVersion(commitInfo));
      }

      // Create backup snapshot
      if (this.config.backup.createBackupOnCommit) {
        tasks.push(this.createCommitBackup(commitInfo));
      }

      // Run performance analysis
      if (this.config.performance.enablePostCommitAnalysis) {
        tasks.push(this.runPerformanceAnalysis(commitInfo));
      }

      const results = await Promise.allSettled(tasks);
      
      console.log(`✅ Post-commit tasks completed (${results.length} tasks)`);
      
      return {
        success: true,
        commitInfo,
        taskResults: results,
        hookType: 'post-commit'
      };

    } catch (error) {
      console.warn(`⚠️  Post-commit tasks failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        hookType: 'post-commit'
      };
    }
  }

  async executePostMergeHook(args) {
    console.log('🔀 Running post-merge tasks...');
    
    try {
      const mergeInfo = await this.getMergeInfo();
      console.log(`🔗 Merge completed: ${mergeInfo.source} → ${mergeInfo.target}`);

      const tasks = [];

      // Check for dependency updates
      if (await this.hasPackageChanges()) {
        console.log('📦 Package changes detected, updating dependencies...');
        tasks.push(this.updateDependencies());
      }

      // Check for database migrations
      if (await this.hasMigrationChanges()) {
        console.log('🗄️  Migration changes detected, checking database...');
        tasks.push(this.checkMigrations());
      }

      // Update local configuration
      if (await this.hasConfigChanges()) {
        console.log('⚙️  Configuration changes detected, updating...');
        tasks.push(this.updateLocalConfig());
      }

      // Clean up merge artifacts
      tasks.push(this.cleanupMergeArtifacts());

      const results = await Promise.allSettled(tasks);
      
      console.log(`✅ Post-merge tasks completed (${results.length} tasks)`);
      
      return {
        success: true,
        mergeInfo,
        taskResults: results,
        hookType: 'post-merge'
      };

    } catch (error) {
      console.warn(`⚠️  Post-merge tasks failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        hookType: 'post-merge'
      };
    }
  }

  async executePreRebaseHook(args) {
    console.log('🔄 Running pre-rebase safety checks...');
    
    const [upstream, branch] = args;
    
    try {
      // Check if rebase is safe
      const safetyChecks = await Promise.all([
        this.checkUncommittedChanges(),
        this.checkBranchState(branch),
        this.checkRebaseConflicts(upstream, branch),
        this.createRebaseBackup(branch)
      ]);

      const [uncommittedCheck, branchCheck, conflictCheck, backupResult] = safetyChecks;

      const allSafe = uncommittedCheck.safe && 
                     branchCheck.safe && 
                     conflictCheck.safe;

      if (!allSafe) {
        console.log('\n❌ Pre-rebase safety checks failed:');
        if (!uncommittedCheck.safe) console.log('📝 Uncommitted changes detected');
        if (!branchCheck.safe) console.log('🌿 Branch state issues');
        if (!conflictCheck.safe) console.log('⚡ Potential conflicts detected');
        console.log('\n💾 Emergency backup created:', backupResult.backupId);
      } else {
        console.log('✅ Pre-rebase safety checks passed');
      }

      return {
        allowed: allSafe,
        safetyChecks: {
          uncommittedCheck,
          branchCheck,
          conflictCheck
        },
        backupInfo: backupResult,
        hookType: 'pre-rebase'
      };

    } catch (error) {
      console.error(`❌ Pre-rebase check failed: ${error.message}`);
      return {
        allowed: false,
        error: error.message,
        hookType: 'pre-rebase'
      };
    }
  }

  async executeCommitMsgHook(args) {
    console.log('📝 Validating commit message...');
    
    const [commitMsgFile] = args;
    
    try {
      const commitMessage = await fs.readFile(commitMsgFile, 'utf8');
      const validation = await this.validateCommitMessage(commitMessage.trim());

      if (!validation.valid) {
        console.log('\n❌ Commit message validation failed:');
        validation.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
        console.log('\n📖 Commit message format guide:');
        console.log('   feat: add new feature');
        console.log('   fix: resolve bug in component');
        console.log('   docs: update API documentation');
        console.log('   style: format code according to standards');
        console.log('   refactor: improve code structure');
        console.log('   test: add unit tests');
        console.log('   chore: update build tools');
      } else {
        console.log('✅ Commit message is valid');
      }

      return {
        allowed: validation.valid,
        validation,
        commitMessage,
        hookType: 'commit-msg'
      };

    } catch (error) {
      console.error(`❌ Commit message validation failed: ${error.message}`);
      return {
        allowed: false,
        error: error.message,
        hookType: 'commit-msg'
      };
    }
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
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      // File might be deleted, try to get it from git
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

  generateValidationSummary(validationResults) {
    const total = validationResults.length;
    const passed = validationResults.filter(r => r.result?.allowed !== false).length;
    const failed = total - passed;
    const errors = validationResults.filter(r => r.error).length;

    return {
      total,
      passed,
      failed,
      errors,
      successRate: total > 0 ? Math.round((passed / total) * 100) : 100
    };
  }

  async runTestSuite() {
    console.log('🧪 Running test suite...');
    
    try {
      execSync('make test', { 
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 60000 // 1 minute timeout
      });
      return { passed: true, message: 'All tests passed' };
    } catch (error) {
      return { 
        passed: false, 
        message: 'Test failures detected',
        output: error.stdout?.toString() || error.message
      };
    }
  }

  async runLintChecks() {
    console.log('🔍 Running lint checks...');
    
    try {
      execSync('make lint', { 
        stdio: 'pipe',
        cwd: process.cwd(),
        timeout: 30000 // 30 second timeout
      });
      return { passed: true, message: 'Lint checks passed' };
    } catch (error) {
      return { 
        passed: false, 
        message: 'Lint issues detected',
        output: error.stdout?.toString() || error.message
      };
    }
  }

  async runSecurityChecks() {
    console.log('🔒 Running security checks...');
    
    // Basic security pattern check on staged files
    const stagedFiles = await this.getStagedFiles();
    const securityIssues = [];

    for (const file of stagedFiles) {
      if (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx')) {
        try {
          const content = await this.getFileContent(file);
          const issues = this.detectSecurityIssues(content, file);
          if (issues.length > 0) {
            securityIssues.push(...issues);
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

    return {
      passed: securityIssues.length === 0,
      issues: securityIssues,
      message: securityIssues.length > 0 ? 
        `${securityIssues.length} security issues detected` : 
        'No security issues detected'
    };
  }

  detectSecurityIssues(content, filePath) {
    const issues = [];
    const securityPatterns = [
      { pattern: /dangerouslySetInnerHTML/g, severity: 'high', message: 'Potential XSS vulnerability' },
      { pattern: /eval\s*\(/g, severity: 'critical', message: 'Use of eval() is dangerous' },
      { pattern: /document\.write/g, severity: 'medium', message: 'document.write can be unsafe' },
      { pattern: /innerHTML\s*=/g, severity: 'medium', message: 'innerHTML assignment can be unsafe' },
      { pattern: /\.(env|secret|key|token)\s*=/gi, severity: 'high', message: 'Potential secret in code' }
    ];

    for (const { pattern, severity, message } of securityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          file: filePath,
          severity,
          message,
          matches: matches.length
        });
      }
    }

    return issues;
  }

  async checkBranchProtection(remoteName) {
    // Basic branch protection check
    try {
      const currentBranch = execSync('git branch --show-current', { 
        encoding: 'utf8',
        cwd: process.cwd()
      }).trim();

      // Check if pushing to protected branches
      const protectedBranches = ['main', 'master', 'production', 'prod'];
      
      if (protectedBranches.includes(currentBranch)) {
        return {
          allowed: false,
          message: `Direct push to protected branch '${currentBranch}' is not allowed`,
          branch: currentBranch
        };
      }

      return {
        allowed: true,
        message: 'Branch protection checks passed',
        branch: currentBranch
      };
    } catch (error) {
      return {
        allowed: true,
        message: 'Could not determine branch protection status',
        error: error.message
      };
    }
  }

  async validateCommitMessage(message) {
    const errors = [];
    
    // Check minimum length
    if (message.length < 10) {
      errors.push('Commit message is too short (minimum 10 characters)');
    }
    
    // Check maximum length for first line
    const firstLine = message.split('\n')[0];
    if (firstLine.length > 72) {
      errors.push('First line is too long (maximum 72 characters)');
    }
    
    // Check conventional commit format
    const conventionalPattern = /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: .+/;
    if (!conventionalPattern.test(firstLine)) {
      errors.push('Commit message should follow conventional commit format (e.g., "feat: add new feature")');
    }
    
    // Check for imperative mood
    const imperativePattern = /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)(\(.+\))?: (add|fix|update|remove|implement|improve|refactor|optimize|test|configure|setup|create|delete|change|replace|enhance|clean|move|rename)/i;
    if (!imperativePattern.test(firstLine)) {
      errors.push('Use imperative mood in commit message (e.g., "add" not "added" or "adds")');
    }

    return {
      valid: errors.length === 0,
      errors,
      message,
      type: this.extractCommitType(firstLine)
    };
  }

  extractCommitType(commitMessage) {
    const match = commitMessage.match(/^(feat|fix|docs|style|refactor|perf|test|chore|ci|build|revert)/);
    return match ? match[1] : 'unknown';
  }

  async checkTemporaryBypass() {
    if (!this.config.bypass.temporaryBypass) return false;
    
    const now = new Date();
    const bypassEnd = new Date(this.config.bypass.temporaryBypass.until);
    
    if (now < bypassEnd) {
      console.log(`⏭️  Temporary bypass active until ${bypassEnd.toISOString()}`);
      console.log(`   Reason: ${this.config.bypass.temporaryBypass.reason}`);
      return true;
    } else {
      // Bypass expired, clear it
      this.config.bypass.temporaryBypass = null;
      await this.saveConfig();
      return false;
    }
  }

  async logHookExecution(hookType, result, duration) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      hookType,
      result: {
        allowed: result.allowed,
        bypassed: result.bypassed,
        error: result.error
      },
      duration,
      performance: {
        executionTime: duration,
        memoryUsage: process.memoryUsage()
      }
    };

    // Append to execution log
    const logPath = path.join(this.options.configDir, 'hook-execution.log');
    await fs.appendFile(logPath, JSON.stringify(logEntry) + '\n');
  }

  // ============================================================================
  // CONFIGURATION AND MANAGEMENT METHODS
  // ============================================================================

  async enableHooks() {
    this.config.enabled = true;
    await this.saveConfig();
    console.log('✅ Git hooks enabled');
  }

  async disableHooks() {
    this.config.enabled = false;
    await this.saveConfig();
    console.log('⏹️  Git hooks disabled');
  }

  async setTemporaryBypass(reason, durationMinutes = 60) {
    const until = new Date(Date.now() + (durationMinutes * 60 * 1000));
    
    this.config.bypass.temporaryBypass = {
      reason,
      until: until.toISOString(),
      created: new Date().toISOString()
    };
    
    await this.saveConfig();
    console.log(`⏭️  Temporary bypass set for ${durationMinutes} minutes: ${reason}`);
  }

  async clearTemporaryBypass() {
    this.config.bypass.temporaryBypass = null;
    await this.saveConfig();
    console.log('🔒 Temporary bypass cleared');
  }

  async getStatus() {
    await this.initialize();
    
    const status = {
      manager: {
        initialized: this.isInitialized,
        configPath: this.configPath,
        version: this.config.version
      },
      hooks: {
        enabled: this.config.enabled,
        installed: {},
        bypass: {
          enabled: this.config.bypass.enabled,
          active: await this.checkTemporaryBypass()
        }
      },
      validation: this.config.validation,
      performance: this.config.performance
    };

    // Check which hooks are installed
    for (const hookType of Object.keys(this.hookTypes)) {
      const hookPath = path.join(this.options.hooksDir, hookType);
      try {
        const hookContent = await fs.readFile(hookPath, 'utf8');
        status.hooks.installed[hookType] = {
          exists: true,
          managed: hookContent.includes('# Vana Git Hook Manager'),
          executable: true // We assume if it exists, it's executable
        };
      } catch (error) {
        status.hooks.installed[hookType] = {
          exists: false,
          managed: false,
          executable: false
        };
      }
    }

    return status;
  }

  async shutdown() {
    if (this.claudeHooks) {
      await this.claudeHooks.shutdown();
    }
    this.isInitialized = false;
    console.log('🔌 Git Hook Manager shutdown complete');
  }
}

module.exports = { GitHookManager };

// CLI usage
if (require.main === module) {
  const manager = new GitHookManager();
  
  async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    try {
      switch (command) {
        case 'install':
          await manager.initialize();
          const installResults = await manager.installAllHooks();
          console.log('\n📊 Installation Results:');
          console.log(JSON.stringify(installResults, null, 2));
          break;
          
        case 'uninstall':
          await manager.initialize();
          const uninstallResults = await manager.uninstallAllHooks();
          console.log('\n📊 Uninstall Results:');
          console.log(JSON.stringify(uninstallResults, null, 2));
          break;
          
        case 'status':
          const status = await manager.getStatus();
          console.log('\n📊 Git Hook Status:');
          console.log(JSON.stringify(status, null, 2));
          break;
          
        case 'enable':
          await manager.initialize();
          await manager.enableHooks();
          break;
          
        case 'disable':
          await manager.initialize();
          await manager.disableHooks();
          break;
          
        case 'bypass':
          const reason = args[1] || 'Manual bypass';
          const duration = parseInt(args[2]) || 60;
          await manager.initialize();
          await manager.setTemporaryBypass(reason, duration);
          break;
          
        case 'clear-bypass':
          await manager.initialize();
          await manager.clearTemporaryBypass();
          break;
          
        case 'execute-hook':
          const hookType = args[1];
          const hookArgs = args.slice(2);
          const result = await manager.executeHook(hookType, hookArgs);
          
          if (!result.allowed && result.hookType && manager.hookTypes[result.hookType]?.blocking) {
            process.exit(1);
          }
          break;
          
        default:
          console.log('Git Hook Manager - Vana Project');
          console.log('');
          console.log('Commands:');
          console.log('  install                    Install all Git hooks');
          console.log('  uninstall                  Uninstall all Git hooks');
          console.log('  status                     Show hook status');
          console.log('  enable                     Enable hooks globally');
          console.log('  disable                    Disable hooks globally');
          console.log('  bypass <reason> [minutes]  Set temporary bypass');
          console.log('  clear-bypass               Clear temporary bypass');
          console.log('  execute-hook <type> [args] Execute specific hook');
          break;
      }
      
    } catch (error) {
      console.error('❌ Command failed:', error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
  
  main();
}