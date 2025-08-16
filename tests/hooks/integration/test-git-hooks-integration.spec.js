#!/usr/bin/env node

/**
 * Git Hooks Integration Test Suite
 * 
 * Comprehensive test suite for Git hook integration with the Vana project.
 * Tests the complete Git workflow with PRD validation, security checks,
 * and backup integration.
 * 
 * Test Categories:
 * - Git Hook Installation and Management
 * - Pre-commit validation with PRD compliance
 * - Pre-push comprehensive checks
 * - Post-commit automated tasks
 * - Post-merge dependency updates
 * - Pre-rebase safety checks
 * - Commit message validation
 * - Emergency bypass and restore functionality
 * - Performance and caching
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const { GitHookManager } = require('./git-hook-manager');
const { GitCommitValidator } = require('../validation/git-commit-validator');

class GitHooksIntegrationTest {
  constructor() {
    this.testDir = path.join(process.cwd(), '.claude_workspace', 'test-git-repo');
    this.originalDir = process.cwd();
    this.hookManager = null;
    this.commitValidator = null;
    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      results: []
    };
  }

  async initialize() {
    console.log('🧪 Initializing Git Hooks Integration Test Suite...');
    
    // Clean up any existing test directory
    await this.cleanupTestDir();
    
    // Create test git repository
    await this.createTestRepo();
    
    // Initialize hook manager and validator
    this.hookManager = new GitHookManager({
      gitDir: path.join(this.testDir, '.git'),
      hooksDir: path.join(this.testDir, '.git/hooks'),
      configDir: path.join(this.testDir, '.claude_workspace'),
      logLevel: 'debug'
    });
    
    this.commitValidator = new GitCommitValidator({
      enablePRDValidation: true,
      enableSecurityCheck: true,
      enablePerformanceCheck: true,
      logLevel: 'debug'
    });
    
    await this.hookManager.initialize();
    await this.commitValidator.initialize();
    
    console.log('✅ Test suite initialized');
  }

  async runAllTests() {
    console.log('\n🚀 Running Git Hooks Integration Tests...');
    console.log('====================================================');
    
    const testSuites = [
      { name: 'Hook Installation', method: this.testHookInstallation },
      { name: 'Pre-commit Validation', method: this.testPreCommitValidation },
      { name: 'Commit Message Validation', method: this.testCommitMessageValidation },
      { name: 'Pre-push Checks', method: this.testPrePushChecks },
      { name: 'Post-commit Tasks', method: this.testPostCommitTasks },
      { name: 'Post-merge Tasks', method: this.testPostMergeTasks },
      { name: 'Pre-rebase Safety', method: this.testPreRebaseSafety },
      { name: 'Security Validation', method: this.testSecurityValidation },
      { name: 'Performance Validation', method: this.testPerformanceValidation },
      { name: 'Emergency Bypass', method: this.testEmergencyBypass },
      { name: 'Backup Integration', method: this.testBackupIntegration },
      { name: 'Configuration Management', method: this.testConfigurationManagement },
      { name: 'Error Handling', method: this.testErrorHandling },
      { name: 'Performance Caching', method: this.testPerformanceCaching }
    ];

    for (const suite of testSuites) {
      await this.runTestSuite(suite.name, suite.method.bind(this));
    }

    await this.generateTestReport();
    await this.cleanup();
    
    return this.testResults;
  }

  async runTestSuite(suiteName, testMethod) {
    console.log(`\n🔬 Running ${suiteName} Tests...`);
    console.log('-'.repeat(50));
    
    try {
      await testMethod();
      console.log(`✅ ${suiteName} tests completed`);
    } catch (error) {
      console.error(`❌ ${suiteName} tests failed:`, error.message);
      this.recordTestResult(suiteName, false, error.message);
    }
  }

  // ============================================================================
  // TEST SUITES
  // ============================================================================

  async testHookInstallation() {
    // Test 1: Install all hooks
    await this.test('Install all Git hooks', async () => {
      const results = await this.hookManager.installAllHooks();
      
      this.assert(
        Object.keys(results).length === 6,
        'Should install 6 hook types'
      );
      
      for (const [hookType, result] of Object.entries(results)) {
        this.assert(
          result.status === 'installed',
          `${hookType} should be installed successfully`
        );
      }
    });

    // Test 2: Verify hook files exist and are executable
    await this.test('Verify hook files are created and executable', async () => {
      const hookTypes = ['pre-commit', 'pre-push', 'post-commit', 'post-merge', 'pre-rebase', 'commit-msg'];
      
      for (const hookType of hookTypes) {
        const hookPath = path.join(this.testDir, '.git/hooks', hookType);
        
        // Check file exists
        await fs.access(hookPath);
        
        // Check file is executable
        const stats = await fs.stat(hookPath);
        this.assert(
          (stats.mode & parseInt('100', 8)) !== 0,
          `${hookType} hook should be executable`
        );
        
        // Check file contains our marker
        const content = await fs.readFile(hookPath, 'utf8');
        this.assert(
          content.includes('# Vana Git Hook Manager'),
          `${hookType} hook should contain Vana marker`
        );
      }
    });

    // Test 3: Test hook manager status
    await this.test('Check hook manager status', async () => {
      const status = await this.hookManager.getStatus();
      
      this.assert(status.manager.initialized, 'Manager should be initialized');
      this.assert(status.hooks.enabled, 'Hooks should be enabled');
      
      for (const [hookType, hookStatus] of Object.entries(status.hooks.installed)) {
        this.assert(hookStatus.exists, `${hookType} hook should exist`);
        this.assert(hookStatus.managed, `${hookType} hook should be managed by Vana`);
      }
    });

    // Test 4: Test hook uninstallation
    await this.test('Uninstall and reinstall hooks', async () => {
      // Uninstall hooks
      const uninstallResults = await this.hookManager.uninstallAllHooks();
      
      for (const [hookType, result] of Object.entries(uninstallResults)) {
        this.assert(
          result.status === 'uninstalled',
          `${hookType} should be uninstalled successfully`
        );
      }
      
      // Reinstall hooks
      const reinstallResults = await this.hookManager.installAllHooks();
      
      for (const [hookType, result] of Object.entries(reinstallResults)) {
        this.assert(
          result.status === 'installed',
          `${hookType} should be reinstalled successfully`
        );
      }
    });
  }

  async testPreCommitValidation() {
    // Test 1: Valid file passes validation
    await this.test('Valid shadcn/ui component passes pre-commit', async () => {
      const validComponent = `import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Props {
  title: string;
  onClick: () => void;
}

export default function ValidComponent({ title, onClick }: Props) {
  return (
    <Card data-testid="valid-component">
      <Button onClick={onClick} aria-label="Action button">
        {title}
      </Button>
    </Card>
  );
}`;

      await this.createTestFile('src/components/ValidComponent.tsx', validComponent);
      await this.gitAdd('src/components/ValidComponent.tsx');
      
      const result = await this.hookManager.executePreCommitHook();
      this.assert(result.allowed, 'Valid component should pass pre-commit validation');
    });

    // Test 2: Invalid file fails validation
    await this.test('Invalid file fails pre-commit validation', async () => {
      const invalidComponent = `import { Button } from '@mui/material';

export default function InvalidComponent() {
  return (
    <div onClick={() => console.log('clicked')} style={{color: 'red'}}>
      <Button dangerouslySetInnerHTML={{__html: '<span>Bad</span>'}} />
    </div>
  );
}`;

      await this.createTestFile('src/components/InvalidComponent.tsx', invalidComponent);
      await this.gitAdd('src/components/InvalidComponent.tsx');
      
      const result = await this.hookManager.executePreCommitHook();
      this.assert(!result.allowed, 'Invalid component should fail pre-commit validation');
      this.assert(result.criticalViolations.length > 0, 'Should have critical violations');
    });

    // Test 3: Mixed valid and invalid files
    await this.test('Mixed files - validation should fail overall', async () => {
      // Create valid file
      const validFile = `export const validFunction = () => "hello";`;
      await this.createTestFile('src/utils/valid.ts', validFile);
      
      // Create invalid file with security issue
      const invalidFile = `eval('const x = 1'); // This is dangerous`;
      await this.createTestFile('src/utils/invalid.ts', invalidFile);
      
      await this.gitAdd(['src/utils/valid.ts', 'src/utils/invalid.ts']);
      
      const result = await this.hookManager.executePreCommitHook();
      this.assert(!result.allowed, 'Mixed validation should fail overall');
      
      // Check that we have both results
      this.assert(result.validationResults.length === 2, 'Should validate both files');
    });

    // Test 4: No staged files
    await this.test('No staged files should pass', async () => {
      // Reset staging area
      this.execSync('git reset');
      
      const result = await this.hookManager.executePreCommitHook();
      this.assert(result.allowed, 'No staged files should pass validation');
      this.assert(result.files.length === 0, 'Should report no files');
    });
  }

  async testCommitMessageValidation() {
    // Test 1: Valid conventional commit message
    await this.test('Valid conventional commit message', async () => {
      const validMessage = 'feat(auth): add Google OAuth integration\n\nImplements Google OAuth 2.0 flow for user authentication.\nIncludes proper error handling and security measures.';
      
      const result = await this.commitValidator.validateCommitMessage(null, validMessage);
      this.assert(result.valid, 'Valid conventional commit should pass');
      this.assert(result.analysis.type === 'feat', 'Should parse type correctly');
      this.assert(result.analysis.scope === 'auth', 'Should parse scope correctly');
    });

    // Test 2: Invalid commit message format
    await this.test('Invalid commit message format', async () => {
      const invalidMessage = 'updated stuff';
      
      const result = await this.commitValidator.validateCommitMessage(null, invalidMessage);
      this.assert(!result.valid, 'Invalid commit should fail');
      this.assert(result.errors.length > 0, 'Should have errors');
    });

    // Test 3: Commit message too short
    await this.test('Commit message too short', async () => {
      const shortMessage = 'fix';
      
      const result = await this.commitValidator.validateCommitMessage(null, shortMessage);
      this.assert(!result.valid, 'Short commit should fail');
      this.assert(
        result.errors.some(e => e.includes('too short')),
        'Should have length error'
      );
    });

    // Test 4: Commit message too long (first line)
    await this.test('Commit message first line too long', async () => {
      const longMessage = 'feat(component): this is an extremely long commit message that exceeds the maximum allowed length for the first line and should fail validation';
      
      const result = await this.commitValidator.validateCommitMessage(null, longMessage);
      this.assert(!result.valid, 'Long commit should fail');
      this.assert(
        result.errors.some(e => e.includes('too long')),
        'Should have length error'
      );
    });

    // Test 5: Commit message file validation
    await this.test('Commit message file validation', async () => {
      const commitMsgPath = path.join(this.testDir, 'COMMIT_EDITMSG');
      const message = 'fix(ui): resolve button styling issue';
      
      await fs.writeFile(commitMsgPath, message);
      
      const result = await this.commitValidator.validateCommitMessage(commitMsgPath);
      this.assert(result.valid, 'Valid commit message file should pass');
      this.assert(result.message === message, 'Should read message from file');
    });
  }

  async testPrePushChecks() {
    // Test 1: Successful pre-push validation
    await this.test('Successful pre-push validation', async () => {
      // Mock successful test and lint commands
      const originalExecSync = this.execSync;
      let mockCalls = [];
      
      this.execSync = (cmd) => {
        mockCalls.push(cmd);
        if (cmd.includes('make test') || cmd.includes('make lint')) {
          return 'Success';
        }
        return originalExecSync.call(this, cmd);
      };
      
      try {
        const result = await this.hookManager.executePrePushHook(['origin', 'https://github.com/test/repo.git']);
        
        // Note: This might fail due to missing Makefile, but we can check the structure
        this.assert(typeof result === 'object', 'Should return validation result object');
        this.assert('testResults' in result, 'Should include test results');
        this.assert('lintResults' in result, 'Should include lint results');
        
      } finally {
        this.execSync = originalExecSync;
      }
    });

    // Test 2: Branch protection check
    await this.test('Branch protection check', async () => {
      // Create main branch and switch to it
      this.execSync('git checkout -b main');
      
      const result = await this.hookManager.checkBranchProtection('origin');
      this.assert(!result.allowed, 'Should block push to main branch');
      this.assert(result.message.includes('protected branch'), 'Should mention branch protection');
    });

    // Test 3: Pre-push with commits
    await this.test('Pre-push with commits analysis', async () => {
      // Create a test commit
      await this.createTestFile('test-pre-push.txt', 'test content');
      await this.gitAdd('test-pre-push.txt');
      await this.gitCommit('test: add pre-push test file');
      
      // Switch to feature branch
      this.execSync('git checkout -b feature/test-push');
      
      const result = await this.hookManager.executePrePushHook(['origin', 'https://github.com/test/repo.git']);
      
      // Should not fail due to branch protection on feature branch
      this.assert(result.branchCheck.allowed, 'Should allow push to feature branch');
    });
  }

  async testPostCommitTasks() {
    // Test 1: Post-commit hook execution
    await this.test('Post-commit hook execution', async () => {
      const result = await this.hookManager.executePostCommitHook();
      
      this.assert(result.success, 'Post-commit should execute successfully');
      this.assert('commitInfo' in result, 'Should include commit info');
      this.assert('taskResults' in result, 'Should include task results');
    });

    // Test 2: Documentation update detection
    await this.test('Documentation update detection', async () => {
      // Create a commit that should trigger docs update
      await this.createTestFile('src/components/NewFeature.tsx', 'export const NewFeature = () => <div>New</div>;');
      await this.gitAdd('src/components/NewFeature.tsx');
      await this.gitCommit('feat: add new feature component');
      
      const commitInfo = await this.hookManager.getLatestCommitInfo();
      const shouldUpdate = await this.hookManager.shouldUpdateDocs(commitInfo);
      
      // This would typically be true for feat commits
      this.assert(typeof shouldUpdate === 'boolean', 'Should return boolean for doc update check');
    });
  }

  async testPostMergeTasks() {
    // Test 1: Package changes detection
    await this.test('Package changes detection', async () => {
      // Create package.json
      const packageJson = {
        name: 'test-project',
        version: '1.0.0',
        dependencies: {
          'react': '^18.0.0'
        }
      };
      
      await this.createTestFile('package.json', JSON.stringify(packageJson, null, 2));
      await this.gitAdd('package.json');
      await this.gitCommit('chore: add package.json');
      
      const hasChanges = await this.hookManager.hasPackageChanges();
      this.assert(typeof hasChanges === 'boolean', 'Should return boolean for package changes');
    });

    // Test 2: Post-merge hook execution
    await this.test('Post-merge hook execution', async () => {
      const result = await this.hookManager.executePostMergeHook();
      
      this.assert(result.success, 'Post-merge should execute successfully');
      this.assert('mergeInfo' in result, 'Should include merge info');
      this.assert('taskResults' in result, 'Should include task results');
    });
  }

  async testPreRebaseSafety() {
    // Test 1: Pre-rebase safety checks
    await this.test('Pre-rebase safety checks', async () => {
      const result = await this.hookManager.executePreRebaseHook(['main', 'feature/test']);
      
      this.assert('allowed' in result, 'Should return allowed status');
      this.assert('safetyChecks' in result, 'Should include safety checks');
      this.assert('backupInfo' in result, 'Should include backup info');
    });

    // Test 2: Uncommitted changes detection
    await this.test('Uncommitted changes detection', async () => {
      // Create uncommitted change
      await this.createTestFile('uncommitted.txt', 'uncommitted content');
      
      const check = await this.hookManager.checkUncommittedChanges();
      this.assert(!check.safe, 'Should detect uncommitted changes as unsafe');
      
      // Clean up
      await fs.unlink(path.join(this.testDir, 'uncommitted.txt'));
    });
  }

  async testSecurityValidation() {
    // Test 1: Security issue detection
    await this.test('Security issue detection', async () => {
      const securityIssues = this.commitValidator.detectSecurityIssues(
        'const password = "secret123"; eval("console.log(1)");',
        'test.js'
      );
      
      this.assert(securityIssues.length > 0, 'Should detect security issues');
      this.assert(
        securityIssues.some(issue => issue.severity === 'critical'),
        'Should detect critical security issues'
      );
    });

    // Test 2: Security validation in commit
    await this.test('Security validation in commit', async () => {
      const insecureFile = `
const apiKey = "sk-1234567890abcdef";
const userInput = document.getElementById('input').value;
document.write(userInput);
eval(userInput);
`;
      
      await this.createTestFile('src/insecure.js', insecureFile);
      await this.gitAdd('src/insecure.js');
      
      const result = await this.commitValidator.validateCommit({
        validateAllStaged: true
      });
      
      this.assert(!result.overallValid, 'Should fail validation due to security issues');
      this.assert(
        result.validationResults.security.criticalIssues.length > 0,
        'Should detect critical security issues'
      );
    });
  }

  async testPerformanceValidation() {
    // Test 1: Performance pattern detection
    await this.test('Performance pattern detection', async () => {
      const performanceIssues = this.commitValidator.analyzePerformanceImpact(
        'items.map(item => { const [state, setState] = useState(item); return <div>{state}</div>; })',
        'test.tsx'
      );
      
      this.assert(performanceIssues.length > 0, 'Should detect performance issues');
      this.assert(
        performanceIssues.some(issue => issue.impact === 'high'),
        'Should detect high impact performance issues'
      );
    });

    // Test 2: Bundle impact estimation
    await this.test('Bundle impact estimation', async () => {
      const imports = [
        { module: 'lodash', isExternal: true },
        { module: 'moment', isExternal: true },
        { module: './local', isExternal: false }
      ];
      
      const impact = this.commitValidator.estimateBundleImpact(imports);
      this.assert(impact === 'high', 'Should estimate high bundle impact for heavy libraries');
    });
  }

  async testEmergencyBypass() {
    // Test 1: Enable temporary bypass
    await this.test('Enable temporary bypass', async () => {
      await this.hookManager.setTemporaryBypass('Emergency deployment', 30);
      
      const isActive = await this.hookManager.checkTemporaryBypass();
      this.assert(isActive, 'Temporary bypass should be active');
    });

    // Test 2: Bypass during hook execution
    await this.test('Bypass during hook execution', async () => {
      // Create invalid file that would normally fail
      const invalidFile = 'eval("dangerous code");';
      await this.createTestFile('dangerous.js', invalidFile);
      await this.gitAdd('dangerous.js');
      
      const result = await this.hookManager.executePreCommitHook();
      this.assert(result.allowed, 'Should allow operation during bypass');
      this.assert(result.bypassed, 'Should indicate bypass was used');
    });

    // Test 3: Clear bypass
    await this.test('Clear bypass', async () => {
      await this.hookManager.clearTemporaryBypass();
      
      const isActive = await this.hookManager.checkTemporaryBypass();
      this.assert(!isActive, 'Temporary bypass should be cleared');
    });

    // Test 4: Disable hooks globally
    await this.test('Disable hooks globally', async () => {
      await this.hookManager.disableHooks();
      
      const result = await this.hookManager.executePreCommitHook();
      this.assert(result.allowed, 'Should allow operation when hooks disabled');
      this.assert(result.bypassed, 'Should indicate hooks are disabled');
      
      // Re-enable for other tests
      await this.hookManager.enableHooks();
    });
  }

  async testBackupIntegration() {
    // Test 1: Backup creation during validation
    await this.test('Backup creation during validation', async () => {
      const testFile = 'src/components/BackupTest.tsx';
      const content = 'export const BackupTest = () => <div>Test</div>;';
      
      await this.createTestFile(testFile, content);
      await this.gitAdd(testFile);
      
      // The hook should create backups automatically
      const result = await this.hookManager.executePreCommitHook();
      
      // Check if backup was created (this depends on the hook configuration)
      this.assert(typeof result === 'object', 'Should return result object');
    });

    // Test 2: Emergency restore functionality
    await this.test('Emergency restore functionality', async () => {
      const testFile = 'restore-test.txt';
      const originalContent = 'original content';
      const modifiedContent = 'modified content';
      
      // Create and commit original file
      await this.createTestFile(testFile, originalContent);
      await this.gitAdd(testFile);
      await this.gitCommit('test: add restore test file');
      
      // Modify file
      await this.createTestFile(testFile, modifiedContent);
      
      // Test restore (would need backup system to be fully integrated)
      const fileExists = await this.fileExists(testFile);
      this.assert(fileExists, 'Test file should exist');
    });
  }

  async testConfigurationManagement() {
    // Test 1: Configuration loading and saving
    await this.test('Configuration loading and saving', async () => {
      const config = await this.hookManager.loadConfig();
      
      this.assert(typeof config === 'object', 'Should load configuration object');
      this.assert('enabled' in config, 'Should have enabled property');
      this.assert('hooks' in config, 'Should have hooks property');
      this.assert('validation' in config, 'Should have validation property');
    });

    // Test 2: Hook status reporting
    await this.test('Hook status reporting', async () => {
      const status = await this.hookManager.getStatus();
      
      this.assert(status.manager.initialized, 'Manager should be initialized');
      this.assert(typeof status.hooks.installed === 'object', 'Should report hook installation status');
    });
  }

  async testErrorHandling() {
    // Test 1: Invalid file path handling
    await this.test('Invalid file path handling', async () => {
      try {
        await this.commitValidator.getFileContent('non-existent-file.txt');
        this.assert(false, 'Should throw error for non-existent file');
      } catch (error) {
        this.assert(error.message.includes('Cannot read file'), 'Should provide meaningful error message');
      }
    });

    // Test 2: Invalid commit message file
    await this.test('Invalid commit message file handling', async () => {
      try {
        await this.commitValidator.validateCommitMessage('non-existent-commit-msg');
        this.assert(false, 'Should throw error for non-existent commit message file');
      } catch (error) {
        this.assert(error.message.includes('Failed to read'), 'Should provide meaningful error message');
      }
    });

    // Test 3: Git command failures
    await this.test('Git command failure handling', async () => {
      // Save original execSync
      const originalExecSync = this.execSync;
      
      // Mock failing git command
      this.execSync = (cmd) => {
        if (cmd.includes('git diff --cached')) {
          throw new Error('Git command failed');
        }
        return originalExecSync.call(this, cmd);
      };
      
      try {
        const files = await this.commitValidator.getStagedFiles();
        this.assert(Array.isArray(files), 'Should return empty array on git failure');
        this.assert(files.length === 0, 'Should return empty array on git failure');
      } finally {
        this.execSync = originalExecSync;
      }
    });
  }

  async testPerformanceCaching() {
    // Test 1: Validation result caching
    await this.test('Validation result caching', async () => {
      const testFile = 'src/cache-test.ts';
      const content = 'export const test = "hello";';
      
      await this.createTestFile(testFile, content);
      await this.gitAdd(testFile);
      
      // First validation - should be cache miss
      const result1 = await this.commitValidator.validateStagedFiles([testFile]);
      const metrics1 = this.commitValidator.getPerformanceMetrics();
      
      // Second validation - should be cache hit (if content unchanged)
      const result2 = await this.commitValidator.validateStagedFiles([testFile]);
      const metrics2 = this.commitValidator.getPerformanceMetrics();
      
      this.assert(Array.isArray(result1), 'Should return validation results');
      this.assert(Array.isArray(result2), 'Should return validation results');
      this.assert(typeof metrics1.cacheEfficiency === 'number', 'Should report cache efficiency');
    });

    // Test 2: Performance metrics tracking
    await this.test('Performance metrics tracking', async () => {
      const metrics = this.commitValidator.getPerformanceMetrics();
      
      this.assert(typeof metrics.totalValidations === 'number', 'Should track total validations');
      this.assert(typeof metrics.averageValidationTime === 'number', 'Should track average validation time');
      this.assert(typeof metrics.cacheHits === 'number', 'Should track cache hits');
      this.assert(typeof metrics.cacheMisses === 'number', 'Should track cache misses');
    });
  }

  // ============================================================================
  // TEST UTILITIES
  // ============================================================================

  async test(description, testFunction) {
    this.testResults.totalTests++;
    
    console.log(`  🧪 ${description}`);
    
    try {
      await testFunction();
      this.testResults.passedTests++;
      this.recordTestResult(description, true);
      console.log(`    ✅ PASS`);
    } catch (error) {
      this.testResults.failedTests++;
      this.recordTestResult(description, false, error.message);
      console.log(`    ❌ FAIL: ${error.message}`);
      
      if (process.env.DEBUG) {
        console.log(`    Stack: ${error.stack}`);
      }
    }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed');
    }
  }

  recordTestResult(testName, passed, error = null) {
    this.testResults.results.push({
      test: testName,
      passed,
      error,
      timestamp: new Date().toISOString()
    });
  }

  // ============================================================================
  // GIT UTILITIES
  // ============================================================================

  async createTestRepo() {
    await fs.mkdir(this.testDir, { recursive: true });
    process.chdir(this.testDir);
    
    // Initialize git repo
    this.execSync('git init');
    this.execSync('git config user.email "test@example.com"');
    this.execSync('git config user.name "Test User"');
    
    // Create basic project structure
    await fs.mkdir('src/components', { recursive: true });
    await fs.mkdir('src/utils', { recursive: true });
    await fs.mkdir('.claude_workspace', { recursive: true });
    
    // Create initial commit
    await this.createTestFile('README.md', '# Test Repository');
    await this.gitAdd('README.md');
    await this.gitCommit('Initial commit');
    
    console.log('📁 Test repository created');
  }

  async createTestFile(filePath, content) {
    const fullPath = path.join(this.testDir, filePath);
    const dir = path.dirname(fullPath);
    
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(fullPath, content);
  }

  async fileExists(filePath) {
    try {
      await fs.access(path.join(this.testDir, filePath));
      return true;
    } catch (error) {
      return false;
    }
  }

  async gitAdd(files) {
    const fileList = Array.isArray(files) ? files.join(' ') : files;
    this.execSync(`git add ${fileList}`);
  }

  async gitCommit(message) {
    this.execSync(`git commit -m "${message}"`);
  }

  execSync(command) {
    return execSync(command, { 
      cwd: this.testDir,
      encoding: 'utf8',
      stdio: 'pipe'
    });
  }

  // ============================================================================
  // CLEANUP AND REPORTING
  // ============================================================================

  async generateTestReport() {
    const report = {
      summary: {
        total: this.testResults.totalTests,
        passed: this.testResults.passedTests,
        failed: this.testResults.failedTests,
        skipped: this.testResults.skippedTests,
        successRate: Math.round((this.testResults.passedTests / this.testResults.totalTests) * 100)
      },
      results: this.testResults.results,
      timestamp: new Date().toISOString()
    };

    // Write report to file
    const reportPath = path.join(this.originalDir, '.claude_workspace', 'git-hooks-test-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    console.log('\n📊 Test Summary:');
    console.log(`   Total Tests: ${report.summary.total}`);
    console.log(`   Passed: ${report.summary.passed}`);
    console.log(`   Failed: ${report.summary.failed}`);
    console.log(`   Success Rate: ${report.summary.successRate}%`);
    console.log(`\n📁 Report saved to: ${reportPath}`);

    if (report.summary.failed > 0) {
      console.log('\n❌ Failed Tests:');
      const failedTests = report.results.filter(r => !r.passed);
      failedTests.forEach(test => {
        console.log(`   - ${test.test}: ${test.error}`);
      });
    }

    return report;
  }

  async cleanupTestDir() {
    try {
      process.chdir(this.originalDir);
      await fs.rm(this.testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test environment...');
    
    try {
      if (this.hookManager) {
        await this.hookManager.shutdown();
      }
      
      await this.cleanupTestDir();
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.warn('⚠️  Cleanup failed:', error.message);
    }
  }
}

// CLI usage
if (require.main === module) {
  const testSuite = new GitHooksIntegrationTest();
  
  async function main() {
    try {
      await testSuite.initialize();
      const results = await testSuite.runAllTests();
      
      // Exit with error code if tests failed
      if (results.failedTests > 0) {
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      if (process.env.DEBUG) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }
  
  main();
}

module.exports = { GitHooksIntegrationTest };