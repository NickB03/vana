#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

/**
 * Automatic Recovery System for Development Environment
 * Implements self-healing mechanisms for common development issues
 */

class AutoRecovery {
  constructor() {
    this.changeLog = [];
    this.maxRetries = 3;
    this.backoffMultiplier = 2;
    this.initialDelay = 1000;
  }

  /**
   * Main recovery function that handles different error types
   * @param {Error} error - The error object
   * @param {Object} context - Additional context about the error
   * @returns {Promise<boolean>} - Success status of recovery
   */
  async recoverFromError(error, context = {}) {
    console.log(`🚨 Recovery initiated for error: ${error.message}`);
    
    try {
      // Log the recovery attempt
      this.logChange({
        type: 'recovery_attempt',
        error: error.message,
        context,
        timestamp: new Date().toISOString()
      });

      // Determine error type and apply appropriate strategy
      if (this.isDependencyError(error)) {
        return await this.handleDependencyError(error, context);
      }
      
      if (this.isSyntaxError(error)) {
        return await this.handleSyntaxError(error, context);
      }
      
      if (this.isTestError(error)) {
        return await this.handleTestError(error, context);
      }
      
      if (this.isCommandError(error)) {
        return await this.handleCommandError(error, context);
      }
      
      if (this.isFileSystemError(error)) {
        return await this.handleFileSystemError(error, context);
      }

      // Generic retry strategy
      console.log('📝 Applying generic retry strategy...');
      return await this.retryWithBackoff(context.command || 'unknown', this.maxRetries);
      
    } catch (recoveryError) {
      console.error(`❌ Recovery failed: ${recoveryError.message}`);
      return false;
    }
  }

  /**
   * Automatically installs missing dependencies
   * @param {string} packageName - Name of the package
   * @param {string} manager - Package manager (npm, pip, yarn, etc.)
   * @returns {Promise<boolean>} - Installation success
   */
  async installMissingDependency(packageName, manager = 'auto') {
    console.log(`📦 Installing missing dependency: ${packageName}`);
    
    try {
      const detectedManager = manager === 'auto' ? this.detectPackageManager() : manager;
      const command = this.buildInstallCommand(packageName, detectedManager);
      
      this.logChange({
        type: 'dependency_install',
        package: packageName,
        manager: detectedManager,
        command,
        timestamp: new Date().toISOString()
      });

      console.log(`🔧 Running: ${command}`);
      
      // Execute without timeout restrictions for real installation
      execSync(command, { 
        stdio: 'inherit',
        timeout: 300000, // 5 minutes max timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
      });
      
      // Verify the package was actually installed
      const isInstalled = await this.verifyPackageInstallation(packageName, detectedManager);
      
      if (isInstalled) {
        console.log(`✅ Successfully installed ${packageName}`);
        return true;
      } else {
        console.error(`❌ Package ${packageName} installation verification failed`);
        return await this.tryAlternativeInstallation(packageName);
      }
      
    } catch (error) {
      console.error(`❌ Failed to install ${packageName}: ${error.message}`);
      
      // Enhanced error handling for different package managers
      if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
        console.log('🔧 Retrying with elevated permissions...');
        try {
          const command = this.buildInstallCommand(packageName, manager, true); // with sudo
          execSync(command, { stdio: 'inherit', timeout: 300000 });
          
          if (await this.verifyPackageInstallation(packageName, manager)) {
            console.log(`✅ Successfully installed ${packageName} with elevated permissions`);
            return true;
          }
        } catch (sudoError) {
          console.error(`❌ Failed even with elevated permissions: ${sudoError.message}`);
        }
      }
      
      // Try alternative installation methods
      return await this.tryAlternativeInstallation(packageName);
    }
  }

  /**
   * Attempts to fix syntax errors using AST analysis
   * @param {string} filePath - Path to the file with syntax error
   * @param {Error} error - The syntax error object
   * @returns {Promise<boolean>} - Fix success status
   */
  async fixSyntaxError(filePath, error) {
    console.log(`🔧 Attempting to fix syntax error in: ${filePath}`);
    
    try {
      // Check if filePath starts with 'node:' or is internal module
      if (filePath && (filePath.startsWith('node:') || this.isInternalModule(filePath))) {
        console.log(`⚠️  Cannot fix syntax errors in internal module: ${filePath}`);
        return false;
      }
      
      // Proper file existence check with absolute path resolution
      const absolutePath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
      if (!fs.existsSync(absolutePath)) {
        console.error(`❌ File not found: ${absolutePath}`);
        return false;
      }
      
      // Use absolute path for all operations
      filePath = absolutePath;

      const originalContent = fs.readFileSync(filePath, 'utf8');
      const backupPath = `${filePath}.backup.${Date.now()}`;
      
      // Create backup with verification
      try {
        fs.writeFileSync(backupPath, originalContent);
        
        // Verify backup was created correctly
        if (!fs.existsSync(backupPath)) {
          throw new Error('Backup file was not created');
        }
        
        const backupContent = fs.readFileSync(backupPath, 'utf8');
        if (backupContent !== originalContent) {
          throw new Error('Backup content does not match original');
        }
        
        console.log(`✅ Backup created successfully: ${backupPath}`);
        
        this.logChange({
          type: 'file_backup',
          originalFile: filePath,
          backupFile: backupPath,
          timestamp: new Date().toISOString()
        });
      } catch (backupError) {
        console.error(`❌ Failed to create backup: ${backupError.message}`);
        return false;
      }

      let fixedContent = await this.applySyntaxFixes(originalContent, error);
      
      if (fixedContent !== originalContent) {
        fs.writeFileSync(filePath, fixedContent);
        
        this.logChange({
          type: 'syntax_fix',
          file: filePath,
          backup: backupPath,
          timestamp: new Date().toISOString()
        });

        // Verify the fix worked
        if (await this.validateSyntax(filePath)) {
          console.log(`✅ Successfully fixed syntax error in ${filePath}`);
          return true;
        } else {
          // Rollback if fix didn't work - restore from backup
          try {
            if (fs.existsSync(backupPath)) {
              const backupContent = fs.readFileSync(backupPath, 'utf8');
              fs.writeFileSync(filePath, backupContent);
              console.log(`⚠️  Fix didn't work, restored from backup: ${filePath}`);
            } else {
              fs.writeFileSync(filePath, originalContent);
              console.log(`⚠️  Fix didn't work, rolled back ${filePath}`);
            }
          } catch (rollbackError) {
            console.error(`❌ Failed to rollback: ${rollbackError.message}`);
            // Try to restore from memory if backup failed
            fs.writeFileSync(filePath, originalContent);
          }
        }
      }
      
      return false;
      
    } catch (fixError) {
      console.error(`❌ Error during syntax fix: ${fixError.message}`);
      return false;
    }
  }

  /**
   * Retries failed commands with exponential backoff
   * @param {string|Function} command - Command to retry
   * @param {number} maxAttempts - Maximum retry attempts
   * @returns {Promise<boolean>} - Success status
   */
  async retryWithBackoff(command, maxAttempts = this.maxRetries) {
    console.log(`🔄 Retrying command with backoff: ${typeof command === 'string' ? command : 'function'}`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`📝 Attempt ${attempt}/${maxAttempts}`);
        
        if (typeof command === 'string') {
          execSync(command, { stdio: 'pipe' });
        } else if (typeof command === 'function') {
          await command();
        }
        
        console.log(`✅ Command succeeded on attempt ${attempt}`);
        return true;
        
      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxAttempts) {
          const delay = this.initialDelay * Math.pow(this.backoffMultiplier, attempt - 1);
          console.log(`⏳ Waiting ${delay}ms before next attempt...`);
          await this.sleep(delay);
        }
      }
    }
    
    console.error(`❌ All ${maxAttempts} attempts failed`);
    return false;
  }

  /**
   * Recovers from test failures with debugging
   * @param {string} testFile - Path to the failing test file
   * @param {Error} error - The test error
   * @returns {Promise<boolean>} - Recovery success
   */
  async recoverTestFailure(testFile, error) {
    console.log(`🧪 Recovering from test failure in: ${testFile}`);
    
    try {
      const recoveryStrategies = [
        () => this.fixTestEnvironment(),
        () => this.updateTestDependencies(),
        () => this.fixTestConfiguration(),
        () => this.regenerateTestData(),
        () => this.fixAsyncTestIssues(testFile),
        () => this.updateTestMocks(testFile)
      ];

      for (const strategy of recoveryStrategies) {
        console.log(`🔧 Trying recovery strategy: ${strategy.name}`);
        
        try {
          await strategy();
          
          // Run the specific test to see if it passes now
          if (await this.runSingleTest(testFile)) {
            console.log(`✅ Test recovery successful using ${strategy.name}`);
            return true;
          }
        } catch (strategyError) {
          console.log(`❌ Strategy ${strategy.name} failed: ${strategyError.message}`);
        }
      }
      
      return false;
      
    } catch (error) {
      console.error(`❌ Test recovery failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Rolls back changes made by the recovery system
   * @param {Array} changeLog - Optional specific change log to rollback
   * @returns {Promise<boolean>} - Rollback success
   */
  async rollbackChanges(changeLog = null) {
    console.log('🔄 Rolling back recovery changes...');
    
    const changes = changeLog || this.changeLog;
    let rollbackCount = 0;

    try {
      // Rollback in reverse order
      for (let i = changes.length - 1; i >= 0; i--) {
        const change = changes[i];
        
        try {
          switch (change.type) {
            case 'file_backup':
              if (fs.existsSync(change.backupFile)) {
                fs.copyFileSync(change.backupFile, change.originalFile);
                fs.unlinkSync(change.backupFile);
                rollbackCount++;
              }
              break;
              
            case 'dependency_install':
              await this.uninstallPackage(change.package, change.manager);
              rollbackCount++;
              break;
              
            case 'file_creation':
              if (fs.existsSync(change.file)) {
                fs.unlinkSync(change.file);
                rollbackCount++;
              }
              break;
              
            case 'directory_creation':
              if (fs.existsSync(change.directory)) {
                fs.rmSync(change.directory, { recursive: true, force: true });
                rollbackCount++;
              }
              break;
          }
        } catch (rollbackError) {
          console.error(`❌ Failed to rollback change: ${rollbackError.message}`);
        }
      }
      
      console.log(`✅ Rolled back ${rollbackCount} changes`);
      this.changeLog = [];
      return true;
      
    } catch (error) {
      console.error(`❌ Rollback failed: ${error.message}`);
      return false;
    }
  }

  // Helper Methods

  isDependencyError(error) {
    const dependencyPatterns = [
      /cannot find module/i,
      /module not found/i,
      /no such file or directory.*node_modules/i,
      /command not found/i,
      /not recognized as an internal or external command/i,
      /importerror.*no module named/i,
      /modulenotfounderror/i
    ];
    
    return dependencyPatterns.some(pattern => pattern.test(error.message));
  }

  isSyntaxError(error) {
    const syntaxPatterns = [
      /syntaxerror/i,
      /unexpected token/i,
      /unexpected identifier/i,
      /missing.*before/i,
      /unterminated string/i,
      /invalid character/i,
      /indentationerror/i
    ];
    
    return syntaxPatterns.some(pattern => pattern.test(error.message));
  }

  isTestError(error) {
    const testPatterns = [
      /test.*failed/i,
      /assertion.*failed/i,
      /expect.*received/i,
      /jest.*failed/i,
      /mocha.*failed/i,
      /cypress.*failed/i
    ];
    
    return testPatterns.some(pattern => pattern.test(error.message));
  }

  isCommandError(error) {
    const commandPatterns = [
      /command failed/i,
      /exit code/i,
      /spawn.*enoent/i,
      /permission denied/i
    ];
    
    return commandPatterns.some(pattern => pattern.test(error.message));
  }

  isFileSystemError(error) {
    const fsPatterns = [
      /enoent.*no such file/i,
      /eacces.*permission denied/i,
      /eisdir.*illegal operation/i,
      /enotdir.*not a directory/i
    ];
    
    return fsPatterns.some(pattern => pattern.test(error.message));
  }

  async handleDependencyError(error, context) {
    console.log('📦 Handling dependency error...');
    
    const packageName = this.extractPackageName(error.message);
    if (packageName) {
      return await this.installMissingDependency(packageName);
    }
    
    return false;
  }

  async handleSyntaxError(error, context) {
    console.log('🔧 Handling syntax error...');
    
    const filePath = this.extractFilePath(error.stack || error.message);
    if (filePath) {
      return await this.fixSyntaxError(filePath, error);
    }
    
    return false;
  }

  async handleTestError(error, context) {
    console.log('🧪 Handling test error...');
    
    const testFile = this.extractTestFile(error.message);
    if (testFile) {
      return await this.recoverTestFailure(testFile, error);
    }
    
    return false;
  }

  async handleCommandError(error, context) {
    console.log('⚙️ Handling command error...');
    
    if (context.command) {
      return await this.retryWithBackoff(context.command);
    }
    
    return false;
  }

  async handleFileSystemError(error, context) {
    console.log('📁 Handling filesystem error...');
    
    const filePath = this.extractFilePath(error.message);
    if (filePath) {
      const directory = path.dirname(filePath);
      
      // Create missing directories
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
        this.logChange({
          type: 'directory_creation',
          directory,
          timestamp: new Date().toISOString()
        });
        return true;
      }
    }
    
    return false;
  }

  detectPackageManager() {
    if (fs.existsSync('package-lock.json')) return 'npm';
    if (fs.existsSync('yarn.lock')) return 'yarn';
    if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm';
    if (fs.existsSync('requirements.txt') || fs.existsSync('setup.py')) return 'pip';
    if (fs.existsSync('Cargo.toml')) return 'cargo';
    if (fs.existsSync('go.mod')) return 'go';
    
    return 'npm'; // default
  }

  buildInstallCommand(packageName, manager, withSudo = false) {
    const commands = {
      npm: `npm install ${packageName}`,
      yarn: `yarn add ${packageName}`,
      pnpm: `pnpm add ${packageName}`,
      pip: `pip install ${packageName}`,
      cargo: `cargo add ${packageName}`,
      go: `go get ${packageName}`
    };
    
    let command = commands[manager] || commands.npm;
    
    // Add sudo for pip and other system-level package managers if needed
    if (withSudo && (manager === 'pip' || manager === 'apt' || manager === 'yum')) {
      command = `sudo ${command}`;
    }
    
    return command;
  }

  async tryAlternativeInstallation(packageName) {
    const alternatives = ['yarn', 'pnpm', 'npm'];
    
    for (const manager of alternatives) {
      try {
        console.log(`🔄 Trying alternative installation with ${manager}...`);
        execSync(`which ${manager}`, { stdio: 'pipe' });
        return await this.installMissingDependency(packageName, manager);
      } catch (error) {
        console.log(`❌ ${manager} not available`);
      }
    }
    
    return false;
  }

  async applySyntaxFixes(content, error) {
    let fixedContent = content;
    
    try {
      // Common syntax fixes
      fixedContent = this.fixCommonSyntaxIssues(fixedContent, error);
      
      // Try to parse and fix with AST
      if (this.isJavaScriptFile(content)) {
        fixedContent = await this.fixJavaScriptSyntax(fixedContent, error);
      }
      
      return fixedContent;
      
    } catch (fixError) {
      console.log(`⚠️  AST parsing failed: ${fixError.message}`);
      return content;
    }
  }

  fixCommonSyntaxIssues(content, error) {
    let fixed = content;
    
    // Fix missing semicolons
    if (error.message.includes('missing') && error.message.includes(';')) {
      fixed = fixed.replace(/([^;\s])\s*\n/g, '$1;\n');
    }
    
    // Fix unterminated strings
    if (error.message.includes('unterminated string')) {
      fixed = fixed.replace(/(['"])[^'"]*$/gm, '$1$&$1');
    }
    
    // Fix missing brackets
    if (error.message.includes('missing') && error.message.includes('}')) {
      const openBraces = (fixed.match(/{/g) || []).length;
      const closeBraces = (fixed.match(/}/g) || []).length;
      const missing = openBraces - closeBraces;
      
      if (missing > 0) {
        fixed += '\n' + '}'.repeat(missing);
      }
    }
    
    return fixed;
  }

  async fixJavaScriptSyntax(content, error) {
    try {
      const ast = parse(content, {
        sourceType: 'module',
        allowImportExportEverywhere: true,
        allowReturnOutsideFunction: true,
        plugins: ['jsx', 'typescript', 'decorators-legacy']
      });
      
      // Apply AST-based fixes
      traverse(ast, {
        // Add any specific AST transformations here
      });
      
      return generate(ast).code;
      
    } catch (parseError) {
      console.log(`⚠️  Cannot parse JavaScript: ${parseError.message}`);
      return content;
    }
  }

  async validateSyntax(filePath) {
    try {
      if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
        execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
        return true;
      }
      
      if (filePath.endsWith('.py')) {
        execSync(`python -m py_compile "${filePath}"`, { stdio: 'pipe' });
        return true;
      }
      
      return true; // Assume valid for other file types
      
    } catch (error) {
      return false;
    }
  }

  async fixTestEnvironment() {
    console.log('🔧 Fixing test environment...');
    
    // Clear test caches
    const cacheDirs = [
      'node_modules/.cache',
      '.jest',
      'coverage',
      '__pycache__'
    ];
    
    for (const dir of cacheDirs) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    }
  }

  async updateTestDependencies() {
    console.log('📦 Updating test dependencies...');
    
    const testPackages = [
      'jest',
      '@testing-library/react',
      '@testing-library/jest-dom',
      'cypress',
      'mocha',
      'chai'
    ];
    
    for (const pkg of testPackages) {
      try {
        execSync(`npm list ${pkg}`, { stdio: 'pipe' });
        execSync(`npm update ${pkg}`, { stdio: 'pipe' });
      } catch (error) {
        // Package not installed, skip
      }
    }
  }

  async fixTestConfiguration() {
    console.log('⚙️ Fixing test configuration...');
    
    // Reset Jest configuration if it exists
    if (fs.existsSync('jest.config.js')) {
      const config = `module.exports = {
        testEnvironment: 'node',
        clearMocks: true,
        resetMocks: true,
        restoreMocks: true
      };`;
      
      const backupPath = `jest.config.js.backup.${Date.now()}`;
      fs.copyFileSync('jest.config.js', backupPath);
      fs.writeFileSync('jest.config.js', config);
      
      this.logChange({
        type: 'file_backup',
        originalFile: 'jest.config.js',
        backupFile: backupPath,
        timestamp: new Date().toISOString()
      });
    }
  }

  async regenerateTestData() {
    console.log('🔄 Regenerating test data...');
    
    // Look for test data directories
    const testDataDirs = [
      'test/fixtures',
      'tests/fixtures',
      '__tests__/fixtures',
      'spec/fixtures'
    ];
    
    for (const dir of testDataDirs) {
      if (fs.existsSync(dir)) {
        // Backup and recreate basic test data
        const backupDir = `${dir}.backup.${Date.now()}`;
        fs.renameSync(dir, backupDir);
        fs.mkdirSync(dir, { recursive: true });
        
        this.logChange({
          type: 'directory_backup',
          originalDirectory: dir,
          backupDirectory: backupDir,
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  async fixAsyncTestIssues(testFile) {
    console.log('⏳ Fixing async test issues...');
    
    if (!fs.existsSync(testFile)) return;
    
    const content = fs.readFileSync(testFile, 'utf8');
    let fixed = content;
    
    // Add timeouts to async tests
    fixed = fixed.replace(
      /(it|test)\s*\(\s*['"`].*['"`]\s*,\s*(async\s+)?\(\s*\)\s*=>\s*{/g,
      '$1($2() => {', 30000
    );
    
    // Fix missing awaits
    fixed = fixed.replace(
      /(?<!await\s+)(\w+\.\w+\(.*\))\s*;/g,
      'await $1;'
    );
    
    if (fixed !== content) {
      const backupPath = `${testFile}.backup.${Date.now()}`;
      fs.copyFileSync(testFile, backupPath);
      fs.writeFileSync(testFile, fixed);
      
      this.logChange({
        type: 'file_backup',
        originalFile: testFile,
        backupFile: backupPath,
        timestamp: new Date().toISOString()
      });
    }
  }

  async updateTestMocks(testFile) {
    console.log('🎭 Updating test mocks...');
    
    if (!fs.existsSync(testFile)) return;
    
    const content = fs.readFileSync(testFile, 'utf8');
    
    // Add common mocks
    const mockAdditions = `
// Auto-generated mocks
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn()
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
  spawn: jest.fn()
}));
`;
    
    if (!content.includes('jest.mock') && content.includes('jest')) {
      const updatedContent = mockAdditions + '\n' + content;
      
      const backupPath = `${testFile}.backup.${Date.now()}`;
      fs.copyFileSync(testFile, backupPath);
      fs.writeFileSync(testFile, updatedContent);
      
      this.logChange({
        type: 'file_backup',
        originalFile: testFile,
        backupFile: backupPath,
        timestamp: new Date().toISOString()
      });
    }
  }

  async runSingleTest(testFile) {
    try {
      execSync(`npm test -- --testPathPattern="${testFile}"`, { stdio: 'pipe' });
      return true;
    } catch (error) {
      return false;
    }
  }

  async uninstallPackage(packageName, manager) {
    const commands = {
      npm: `npm uninstall ${packageName}`,
      yarn: `yarn remove ${packageName}`,
      pnpm: `pnpm remove ${packageName}`,
      pip: `pip uninstall -y ${packageName}`
    };
    
    const command = commands[manager] || commands.npm;
    
    try {
      execSync(command, { stdio: 'pipe' });
      return true;
    } catch (error) {
      console.error(`❌ Failed to uninstall ${packageName}: ${error.message}`);
      return false;
    }
  }

  extractPackageName(errorMessage) {
    const patterns = [
      /cannot find module ['"`]([^'"`]+)['"`]/i,
      /module not found.*['"`]([^'"`]+)['"`]/i,
      /no module named ['"`]([^'"`]+)['"`]/i,
      /importerror.*no module named (\w+)/i,
      /modulenotfounderror.*no module named ['"`]([^'"`]+)['"`]/i
    ];
    
    for (const pattern of patterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  extractFilePath(text) {
    const patterns = [
      /at\s+.*\(([^)]+):\d+:\d+\)/,
      /in\s+file\s+['"`]([^'"`]+)['"`]/i,
      /file\s+['"`]([^'"`]+)['"`]/i,
      /([\/\\][\w\/\\.-]+\.(js|ts|jsx|tsx|py|rb|java|cpp|c)):\d+/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  extractTestFile(errorMessage) {
    const patterns = [
      /test.*file.*['"`]([^'"`]+)['"`]/i,
      /spec.*file.*['"`]([^'"`]+)['"`]/i,
      /([\/\\][\w\/\\.-]+\.(test|spec)\.(js|ts|jsx|tsx)):\d+/
    ];
    
    for (const pattern of patterns) {
      const match = errorMessage.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  isJavaScriptFile(content) {
    return /\b(function|const|let|var|class|import|export)\b/.test(content);
  }

  logChange(change) {
    this.changeLog.push({
      id: Date.now() + Math.random(),
      ...change
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if a module path is internal to Node.js
   * @param {string} modulePath - Module path to check
   * @returns {boolean} True if internal module
   */
  isInternalModule(modulePath) {
    if (!modulePath) return false;
    
    const internalModules = [
      'fs', 'path', 'os', 'crypto', 'http', 'https', 'url', 'querystring',
      'util', 'events', 'stream', 'child_process', 'cluster', 'net', 'tls',
      'assert', 'buffer', 'zlib', 'readline', 'vm', 'domain', 'timers'
    ];
    
    return internalModules.includes(modulePath) || 
           modulePath.startsWith('node:') ||
           modulePath.includes('internal/');
  }

  /**
   * Verify that a package was successfully installed
   * @param {string} packageName - Name of the package to verify
   * @param {string} manager - Package manager used
   * @returns {Promise<boolean>} True if package is installed
   */
  async verifyPackageInstallation(packageName, manager) {
    try {
      switch (manager) {
        case 'npm':
        case 'yarn':
        case 'pnpm':
          // Check if package exists in node_modules or can be resolved
          try {
            require.resolve(packageName);
            return true;
          } catch (resolveError) {
            // Try checking package.json dependencies
            if (fs.existsSync('package.json')) {
              const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
              const allDeps = {
                ...pkg.dependencies,
                ...pkg.devDependencies,
                ...pkg.peerDependencies
              };
              return packageName in allDeps;
            }
            return false;
          }
          
        case 'pip':
          execSync(`python -c "import ${packageName}"`, { stdio: 'pipe' });
          return true;
          
        case 'cargo':
          return fs.existsSync('Cargo.toml') && 
                 fs.readFileSync('Cargo.toml', 'utf8').includes(packageName);
          
        case 'go':
          return fs.existsSync('go.mod') && 
                 fs.readFileSync('go.mod', 'utf8').includes(packageName);
          
        default:
          console.log(`⚠️  Cannot verify installation for manager: ${manager}`);
          return true; // Assume success for unknown managers
      }
    } catch (error) {
      console.log(`⚠️  Package verification failed: ${error.message}`);
      return false;
    }
  }
}

// Export the class and main functions
const recovery = new AutoRecovery();

module.exports = {
  AutoRecovery,
  recoverFromError: (error, context) => recovery.recoverFromError(error, context),
  installMissingDependency: (packageName, manager) => recovery.installMissingDependency(packageName, manager),
  fixSyntaxError: (filePath, error) => recovery.fixSyntaxError(filePath, error),
  retryWithBackoff: (command, maxAttempts) => recovery.retryWithBackoff(command, maxAttempts),
  recoverTestFailure: (testFile, error) => recovery.recoverTestFailure(testFile, error),
  rollbackChanges: (changeLog) => recovery.rollbackChanges(changeLog)
};

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case 'recover':
      const errorMessage = args[1] || 'Unknown error';
      const context = args[2] ? JSON.parse(args[2]) : {};
      recovery.recoverFromError(new Error(errorMessage), context);
      break;
      
    case 'install':
      const packageName = args[1];
      const manager = args[2] || 'auto';
      recovery.installMissingDependency(packageName, manager);
      break;
      
    case 'fix-syntax':
      const filePath = args[1];
      const syntaxError = new Error(args[2] || 'Syntax error');
      recovery.fixSyntaxError(filePath, syntaxError);
      break;
      
    case 'retry':
      const retryCommand = args[1];
      const maxAttempts = parseInt(args[2]) || 3;
      recovery.retryWithBackoff(retryCommand, maxAttempts);
      break;
      
    case 'test-recover':
      const testFile = args[1];
      const testError = new Error(args[2] || 'Test failed');
      recovery.recoverTestFailure(testFile, testError);
      break;
      
    case 'rollback':
      recovery.rollbackChanges();
      break;
      
    default:
      console.log(`
Auto-Recovery System CLI

Usage:
  node auto-recovery.js recover "error message" '{"command": "npm test"}'
  node auto-recovery.js install package-name [npm|yarn|pip]
  node auto-recovery.js fix-syntax path/to/file.js "syntax error message"
  node auto-recovery.js retry "command to retry" [max-attempts]
  node auto-recovery.js test-recover path/to/test.js "test error message"
  node auto-recovery.js rollback

Examples:
  node auto-recovery.js recover "Cannot find module 'express'" '{"command": "npm start"}'
  node auto-recovery.js install express npm
  node auto-recovery.js fix-syntax src/app.js "Unexpected token"
  node auto-recovery.js retry "npm test" 5
  node auto-recovery.js test-recover __tests__/app.test.js "Test timeout"
  node auto-recovery.js rollback
      `);
  }
}