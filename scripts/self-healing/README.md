# Auto-Recovery System

A comprehensive automatic recovery system that implements self-healing mechanisms for common development environment issues.

## Features

- **Automatic Error Recovery**: Detects and recovers from various error types
- **Dependency Management**: Automatically installs missing dependencies
- **Syntax Error Fixing**: Uses AST analysis to fix common syntax errors
- **Retry with Backoff**: Implements exponential backoff for failed commands
- **Test Failure Recovery**: Automatically debugs and fixes test failures
- **Rollback Mechanism**: Provides complete rollback of recovery changes

## Installation

```bash
cd scripts/self-healing
npm install
```

## Usage

### Programmatic API

```javascript
const {
  recoverFromError,
  installMissingDependency,
  fixSyntaxError,
  retryWithBackoff,
  recoverTestFailure,
  rollbackChanges
} = require('./auto-recovery');

// Recover from any error
await recoverFromError(new Error('Cannot find module express'), {
  command: 'npm start'
});

// Install missing dependency
await installMissingDependency('express', 'npm');

// Fix syntax error in file
await fixSyntaxError('./src/app.js', new Error('Unexpected token'));

// Retry command with backoff
await retryWithBackoff('npm test', 5);

// Recover from test failure
await recoverTestFailure('./tests/app.test.js', new Error('Test timeout'));

// Rollback all changes
await rollbackChanges();
```

### CLI Usage

```bash
# General error recovery
node auto-recovery.js recover "Cannot find module 'express'" '{"command": "npm start"}'

# Install missing dependency
node auto-recovery.js install express npm

# Fix syntax error
node auto-recovery.js fix-syntax src/app.js "Unexpected token"

# Retry failed command
node auto-recovery.js retry "npm test" 5

# Recover from test failure
node auto-recovery.js test-recover tests/app.test.js "Test timeout"

# Rollback changes
node auto-recovery.js rollback
```

## Error Types Handled

### Dependency Errors
- Missing npm/yarn/pip packages
- Command not found errors
- Module import errors

### Syntax Errors
- JavaScript/TypeScript syntax issues
- Python indentation errors
- Missing brackets/semicolons
- Unterminated strings

### Test Errors
- Jest/Mocha test failures
- Async test issues
- Mock configuration problems
- Test environment issues

### Command Errors
- Failed shell commands
- Permission errors
- Spawn errors

### File System Errors
- Missing files/directories
- Permission issues
- Path resolution problems

## Recovery Strategies

### 1. Dependency Installation
- Auto-detects package manager (npm, yarn, pnpm, pip)
- Tries alternative package managers on failure
- Handles both production and development dependencies

### 2. Syntax Fixing
- Uses Babel AST parsing for JavaScript/TypeScript
- Applies common syntax fixes (semicolons, brackets, quotes)
- Creates backups before making changes
- Validates fixes before applying

### 3. Test Recovery
- Clears test caches
- Updates test dependencies
- Fixes test configuration
- Regenerates test data
- Fixes async test issues
- Updates mocks

### 4. Retry Logic
- Exponential backoff strategy
- Configurable maximum attempts
- Supports both command strings and functions
- Detailed logging of retry attempts

### 5. Rollback System
- Tracks all changes made during recovery
- Supports selective rollback
- Restores from backups
- Uninstalls packages if needed

## Configuration

The system automatically detects:
- Package managers (npm, yarn, pnpm, pip, cargo, go)
- File types and appropriate parsers
- Test frameworks (Jest, Mocha, Cypress)
- Project structure

## Integration with Claude Flow

```bash
# Run pre-task hook
npx claude-flow@alpha hooks pre-task --description "recovery-system"

# Run post-edit hook after changes
npx claude-flow@alpha hooks post-edit --file "scripts/self-healing/auto-recovery.js" --memory-key "swarm/recovery/system"
```

## Examples

### Recovering from Common Errors

```javascript
// Missing dependency
const error = new Error("Cannot find module 'express'");
await recoverFromError(error, { command: 'node server.js' });

// Syntax error
const syntaxError = new Error("Unexpected token ';'");
await fixSyntaxError('./src/app.js', syntaxError);

// Test failure
const testError = new Error("Test suite failed");
await recoverTestFailure('./tests/api.test.js', testError);
```

### Custom Recovery Workflows

```javascript
const recovery = new AutoRecovery();

// Custom error handling
recovery.maxRetries = 5;
recovery.backoffMultiplier = 3;
recovery.initialDelay = 500;

await recovery.recoverFromError(error, context);
```

## Logging and Monitoring

All recovery attempts are logged with:
- Timestamp
- Error type and message
- Recovery strategy applied
- Success/failure status
- Changes made (for rollback)

## Best Practices

1. **Always backup before making changes**
2. **Test recovery strategies in development**
3. **Monitor recovery success rates**
4. **Keep rollback logs for troubleshooting**
5. **Update recovery patterns based on new error types**

## Contributing

To add new recovery strategies:

1. Implement error detection pattern
2. Add recovery strategy method
3. Include in main recovery flow
4. Add tests and documentation
5. Update CLI interface if needed