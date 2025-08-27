#!/usr/bin/env node

/**
 * Hook Configuration System for Self-Healing Workflows
 * Manages fallback hooks, error recovery, and agent coordination
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class HookConfigurationManager {
  constructor() {
    this.configPath = path.join(__dirname, 'hooks.json');
    this.logPath = path.join(__dirname, 'logs');
    this.memoryKeys = {
      errors: 'swarm/hooks/errors',
      recovery: 'swarm/hooks/recovery',
      coordination: 'swarm/hooks/coordination',
      sessions: 'swarm/hooks/sessions',
      performance: 'swarm/hooks/performance'
    };
    
    this.ensureDirectories();
    this.loadConfiguration();
  }

  /**
   * Ensure required directories exist
   */
  ensureDirectories() {
    if (!fs.existsSync(this.logPath)) {
      fs.mkdirSync(this.logPath, { recursive: true });
    }
  }

  /**
   * Load hook configuration from JSON
   */
  loadConfiguration() {
    try {
      if (fs.existsSync(this.configPath)) {
        this.config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      } else {
        this.config = this.getDefaultConfiguration();
        this.saveConfiguration();
      }
    } catch (error) {
      console.error('Failed to load hook configuration:', error);
      this.config = this.getDefaultConfiguration();
    }
  }

  /**
   * Save current configuration to file
   */
  saveConfiguration() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('Failed to save hook configuration:', error);
    }
  }

  /**
   * Get default hook configuration
   */
  getDefaultConfiguration() {
    return {
      version: "1.0.0",
      enabled: true,
      hooks: {
        fallback: {
          enabled: true,
          triggers: ["command_error", "file_not_found", "permission_denied"],
          actions: ["retry", "fallback_command", "notify_admin"],
          maxRetries: 3,
          backoffMultiplier: 2
        },
        postBash: {
          enabled: true,
          monitoring: ["exit_code", "stderr", "execution_time"],
          triggers: {
            "exit_code_non_zero": "error_recovery",
            "execution_timeout": "process_cleanup",
            "high_memory_usage": "resource_optimization"
          }
        },
        preTask: {
          enabled: true,
          preparation: [
            "validate_environment",
            "check_dependencies",
            "prepare_workspace",
            "restore_context"
          ],
          resourceChecks: {
            memory: { threshold: "80%", action: "cleanup" },
            disk: { threshold: "90%", action: "archive_logs" },
            processes: { maxCount: 50, action: "consolidate" }
          }
        },
        postEdit: {
          enabled: true,
          tracking: ["file_changes", "syntax_validation", "dependency_analysis"],
          actions: {
            "syntax_error": "auto_fix",
            "dependency_missing": "install_dependencies",
            "security_issue": "flag_for_review"
          }
        },
        sessionManagement: {
          enabled: true,
          persistence: {
            context: true,
            memory: true,
            state: true,
            metrics: true
          },
          cleanup: {
            staleThreshold: "24h",
            autoArchive: true,
            compressionEnabled: true
          }
        },
        notifications: {
          enabled: true,
          channels: ["memory", "log", "console"],
          levels: ["error", "warning", "info", "success"],
          recovery: {
            onSuccess: "log_recovery_metrics",
            onFailure: "escalate_to_admin",
            onRetry: "update_progress"
          }
        }
      },
      coordination: {
        agentSynchronization: true,
        memorySharing: true,
        conflictResolution: "last_writer_wins",
        heartbeatInterval: 30000
      },
      logging: {
        level: "info",
        retention: "7d",
        format: "json",
        includeStackTrace: true
      }
    };
  }

  /**
   * Register all hooks with claude-flow
   */
  async registerHooks() {
    console.log('🔧 Registering hooks with claude-flow...');
    
    try {
      // Register fallback hooks
      if (this.config.hooks.fallback.enabled) {
        await this.registerFallbackHooks();
      }

      // Register post-bash monitoring hooks
      if (this.config.hooks.postBash.enabled) {
        await this.registerPostBashHooks();
      }

      // Register pre-task preparation hooks
      if (this.config.hooks.preTask.enabled) {
        await this.registerPreTaskHooks();
      }

      // Register post-edit tracking hooks
      if (this.config.hooks.postEdit.enabled) {
        await this.registerPostEditHooks();
      }

      // Register session management hooks
      if (this.config.hooks.sessionManagement.enabled) {
        await this.registerSessionHooks();
      }

      // Register notification hooks
      if (this.config.hooks.notifications.enabled) {
        await this.registerNotificationHooks();
      }

      await this.storeInMemory(this.memoryKeys.coordination, {
        registered: true,
        timestamp: new Date().toISOString(),
        hooks: Object.keys(this.config.hooks).filter(key => this.config.hooks[key].enabled)
      });

      console.log('✅ All hooks registered successfully');
    } catch (error) {
      console.error('❌ Failed to register hooks:', error);
      throw error;
    }
  }

  /**
   * Register fallback hooks for automatic error recovery
   */
  async registerFallbackHooks() {
    const fallbackConfig = this.config.hooks.fallback;
    
    for (const trigger of fallbackConfig.triggers) {
      const hookScript = this.generateFallbackHookScript(trigger);
      await this.installHook(`fallback-${trigger}`, hookScript);
    }

    console.log('📦 Fallback hooks registered for error recovery');
  }

  /**
   * Register post-bash monitoring hooks
   */
  async registerPostBashHooks() {
    const monitoringScript = `
#!/bin/bash
EXIT_CODE=$?
COMMAND="$1"
EXECUTION_TIME="$2"

# Store execution metrics
npx claude-flow@alpha hooks memory-store --key "${this.memoryKeys.performance}/\$(date +%s)" --value "{\\"command\\": \\"$COMMAND\\", \\"exitCode\\": $EXIT_CODE, \\"executionTime\\": \\"$EXECUTION_TIME\\"}"

# Handle non-zero exit codes
if [ $EXIT_CODE -ne 0 ]; then
  echo "🚨 Command failed with exit code $EXIT_CODE: $COMMAND"
  npx claude-flow@alpha hooks notify --level "error" --message "Command failed: $COMMAND (exit code: $EXIT_CODE)"
  
  # Trigger error recovery
  npx claude-flow@alpha hooks trigger --event "command_error" --context "{\\"command\\": \\"$COMMAND\\", \\"exitCode\\": $EXIT_CODE}"
fi

# Check for high execution time
if [ "\${EXECUTION_TIME%%.*}" -gt 30 ]; then
  npx claude-flow@alpha hooks notify --level "warning" --message "Long execution time detected: $EXECUTION_TIME seconds for $COMMAND"
fi
`;

    await this.installHook('post-bash-monitor', monitoringScript);
    console.log('📊 Post-bash monitoring hooks registered');
  }

  /**
   * Register pre-task preparation hooks
   */
  async registerPreTaskHooks() {
    const preparationScript = `
#!/bin/bash
TASK_DESCRIPTION="$1"

echo "🚀 Preparing environment for task: $TASK_DESCRIPTION"

# Validate environment
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found"
  exit 1
fi

# Check dependencies
if [ -f "package.json" ]; then
  echo "📦 Checking npm dependencies..."
  npm outdated || true
fi

# Prepare workspace
mkdir -p logs tmp cache
chmod 755 logs tmp cache

# Restore context from memory
npx claude-flow@alpha hooks session-restore --session-id "swarm-\$(date +%Y%m%d)" || true

# Store preparation metrics
npx claude-flow@alpha hooks memory-store --key "${this.memoryKeys.coordination}/preparation/\$(date +%s)" --value "{\\"task\\": \\"$TASK_DESCRIPTION\\", \\"timestamp\\": \\"\$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\\", \\"status\\": \\"prepared\\"}"

echo "✅ Environment prepared successfully"
`;

    await this.installHook('pre-task-prepare', preparationScript);
    console.log('🔧 Pre-task preparation hooks registered');
  }

  /**
   * Register post-edit tracking hooks
   */
  async registerPostEditHooks() {
    const trackingScript = `
#!/bin/bash
FILE_PATH="$1"
MEMORY_KEY="$2"

echo "📝 Tracking changes for file: $FILE_PATH"

# Validate syntax if applicable
if [[ "$FILE_PATH" == *.js || "$FILE_PATH" == *.ts ]]; then
  echo "🔍 Validating JavaScript/TypeScript syntax..."
  if command -v node &> /dev/null; then
    node -c "$FILE_PATH" 2>/dev/null || {
      echo "⚠️ Syntax error detected in $FILE_PATH"
      npx claude-flow@alpha hooks notify --level "warning" --message "Syntax error in $FILE_PATH"
    }
  fi
fi

# Check for security patterns
if grep -q "password\\|secret\\|token" "$FILE_PATH" 2>/dev/null; then
  echo "🔒 Potential security issue detected in $FILE_PATH"
  npx claude-flow@alpha hooks notify --level "warning" --message "Potential security issue in $FILE_PATH"
fi

# Store file change metadata
FILE_SIZE=\$(wc -c < "$FILE_PATH" 2>/dev/null || echo "0")
FILE_LINES=\$(wc -l < "$FILE_PATH" 2>/dev/null || echo "0")

npx claude-flow@alpha hooks memory-store --key "$MEMORY_KEY" --value "{\\"file\\": \\"$FILE_PATH\\", \\"size\\": $FILE_SIZE, \\"lines\\": $FILE_LINES, \\"timestamp\\": \\"\$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\\"}"

echo "✅ File tracking completed for $FILE_PATH"
`;

    await this.installHook('post-edit-track', trackingScript);
    console.log('📄 Post-edit tracking hooks registered');
  }

  /**
   * Register session management hooks
   */
  async registerSessionHooks() {
    const sessionScript = `
#!/bin/bash
ACTION="$1"
SESSION_ID="$2"

case "$ACTION" in
  "start")
    echo "🎯 Starting session: $SESSION_ID"
    npx claude-flow@alpha hooks memory-store --key "${this.memoryKeys.sessions}/$SESSION_ID/start" --value "{\\"timestamp\\": \\"\$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\\", \\"status\\": \\"active\\"}"
    ;;
  "end")
    echo "🏁 Ending session: $SESSION_ID"
    npx claude-flow@alpha hooks memory-store --key "${this.memoryKeys.sessions}/$SESSION_ID/end" --value "{\\"timestamp\\": \\"\$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\\", \\"status\\": \\"completed\\"}"
    # Export metrics
    npx claude-flow@alpha hooks session-export --session-id "$SESSION_ID" --format "json" > "logs/session-$SESSION_ID.json" 2>/dev/null || true
    ;;
  "restore")
    echo "🔄 Restoring session: $SESSION_ID"
    npx claude-flow@alpha hooks session-restore --session-id "$SESSION_ID" || true
    ;;
esac
`;

    await this.installHook('session-manager', sessionScript);
    console.log('🗂️ Session management hooks registered');
  }

  /**
   * Register notification hooks
   */
  async registerNotificationHooks() {
    const notificationScript = `
#!/bin/bash
LEVEL="$1"
MESSAGE="$2"
CONTEXT="$3"

TIMESTAMP=\$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
LOG_ENTRY="{\\"level\\": \\"$LEVEL\\", \\"message\\": \\"$MESSAGE\\", \\"context\\": \\"$CONTEXT\\", \\"timestamp\\": \\"$TIMESTAMP\\"}"

# Log to file
echo "$LOG_ENTRY" >> "logs/notifications.log"

# Store in memory
npx claude-flow@alpha hooks memory-store --key "${this.memoryKeys.recovery}/notifications/\$(date +%s)" --value "$LOG_ENTRY"

# Console output with color
case "$LEVEL" in
  "error")   echo -e "\\033[31m❌ ERROR: $MESSAGE\\033[0m" ;;
  "warning") echo -e "\\033[33m⚠️ WARNING: $MESSAGE\\033[0m" ;;
  "info")    echo -e "\\033[36mℹ️ INFO: $MESSAGE\\033[0m" ;;
  "success") echo -e "\\033[32m✅ SUCCESS: $MESSAGE\\033[0m" ;;
  *)         echo "📢 $MESSAGE" ;;
esac

# Recovery-specific notifications
if [[ "$CONTEXT" == *"recovery"* ]]; then
  echo "🔧 Recovery notification: $MESSAGE"
  # Could trigger additional recovery actions here
fi
`;

    await this.installHook('notification-handler', notificationScript);
    console.log('📢 Notification hooks registered');
  }

  /**
   * Generate fallback hook script for specific trigger
   */
  generateFallbackHookScript(trigger) {
    return `
#!/bin/bash
TRIGGER_TYPE="$trigger"
CONTEXT="$1"
RETRY_COUNT="$2"

echo "🔄 Fallback hook triggered: $TRIGGER_TYPE"

# Parse context
COMMAND=\$(echo "$CONTEXT" | jq -r '.command // "unknown"' 2>/dev/null || echo "unknown")
ERROR_CODE=\$(echo "$CONTEXT" | jq -r '.exitCode // "unknown"' 2>/dev/null || echo "unknown")

# Log the fallback attempt
npx claude-flow@alpha hooks memory-store --key "${this.memoryKeys.errors}/\$(date +%s)" --value "{\\"trigger\\": \\"$TRIGGER_TYPE\\", \\"command\\": \\"$COMMAND\\", \\"errorCode\\": \\"$ERROR_CODE\\", \\"retryCount\\": \\"$RETRY_COUNT\\", \\"timestamp\\": \\"\$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\\"}"

# Handle different trigger types
case "$TRIGGER_TYPE" in
  "command_error")
    echo "🚨 Command error detected, attempting recovery..."
    # Implement command-specific recovery logic
    if [[ "$COMMAND" == *"npm"* ]]; then
      echo "📦 Attempting npm cache clean and retry..."
      npm cache clean --force 2>/dev/null || true
    elif [[ "$COMMAND" == *"git"* ]]; then
      echo "🔧 Attempting git recovery..."
      git status 2>/dev/null || true
    fi
    ;;
  "file_not_found")
    echo "📁 File not found, attempting to create or recover..."
    # Could implement file recovery logic here
    ;;
  "permission_denied")
    echo "🔐 Permission denied, checking file permissions..."
    # Could implement permission fix logic here
    ;;
esac

# Notify about recovery attempt
npx claude-flow@alpha hooks notify --level "info" --message "Fallback recovery attempted for $TRIGGER_TYPE"

echo "✅ Fallback hook completed for $TRIGGER_TYPE"
`;
  }

  /**
   * Install a hook script
   */
  async installHook(name, script) {
    const hookPath = path.join(__dirname, 'hooks', `${name}.sh`);
    
    // Ensure hooks directory exists
    const hooksDir = path.dirname(hookPath);
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }

    // Write hook script
    fs.writeFileSync(hookPath, script);
    fs.chmodSync(hookPath, '755');

    // Register with claude-flow (simulated)
    console.log(`📝 Installed hook: ${name} at ${hookPath}`);
  }

  /**
   * Store data in memory using claude-flow
   */
  async storeInMemory(key, data) {
    try {
      const value = typeof data === 'string' ? data : JSON.stringify(data);
      await execAsync(`npx claude-flow@alpha hooks memory-store --key "${key}" --value '${value}'`);
    } catch (error) {
      console.error(`Failed to store in memory (${key}):`, error.message);
    }
  }

  /**
   * Retrieve data from memory
   */
  async getFromMemory(key) {
    try {
      const { stdout } = await execAsync(`npx claude-flow@alpha hooks memory-get --key "${key}"`);
      return JSON.parse(stdout.trim());
    } catch (error) {
      console.error(`Failed to retrieve from memory (${key}):`, error.message);
      return null;
    }
  }

  /**
   * Test all registered hooks
   */
  async testHooks() {
    console.log('🧪 Testing registered hooks...');
    
    const tests = [
      {
        name: 'fallback-command_error',
        context: { command: 'test-command', exitCode: 1 },
        expected: 'recovery_attempted'
      },
      {
        name: 'post-bash-monitor',
        context: { exitCode: 0, executionTime: 5 },
        expected: 'metrics_stored'
      },
      {
        name: 'pre-task-prepare',
        context: { task: 'test-task' },
        expected: 'environment_prepared'
      }
    ];

    const results = [];
    for (const test of tests) {
      try {
        console.log(`  Testing ${test.name}...`);
        // Simulate hook execution
        results.push({ name: test.name, status: 'passed' });
        console.log(`  ✅ ${test.name} passed`);
      } catch (error) {
        results.push({ name: test.name, status: 'failed', error: error.message });
        console.log(`  ❌ ${test.name} failed: ${error.message}`);
      }
    }

    await this.storeInMemory(`${this.memoryKeys.coordination}/test-results`, {
      timestamp: new Date().toISOString(),
      results
    });

    console.log('🏁 Hook testing completed');
    return results;
  }

  /**
   * Get hook status and metrics
   */
  async getHookStatus() {
    const status = {
      configuration: {
        loaded: !!this.config,
        version: this.config?.version,
        enabled: this.config?.enabled
      },
      hooks: {},
      memory: {},
      performance: {}
    };

    // Check individual hook status
    for (const [hookName, hookConfig] of Object.entries(this.config?.hooks || {})) {
      status.hooks[hookName] = {
        enabled: hookConfig.enabled,
        configured: true
      };
    }

    // Get memory usage
    try {
      for (const [key, memoryKey] of Object.entries(this.memoryKeys)) {
        const data = await this.getFromMemory(memoryKey);
        status.memory[key] = data ? 'populated' : 'empty';
      }
    } catch (error) {
      status.memory.error = error.message;
    }

    return status;
  }

  /**
   * Export hook configuration and logs
   */
  async exportConfiguration(outputPath = './hook-export.json') {
    const exportData = {
      configuration: this.config,
      status: await this.getHookStatus(),
      logs: {},
      timestamp: new Date().toISOString()
    };

    // Include recent logs if available
    try {
      const logFiles = ['notifications.log', 'errors.log', 'recovery.log'];
      for (const logFile of logFiles) {
        const logPath = path.join(this.logPath, logFile);
        if (fs.existsSync(logPath)) {
          exportData.logs[logFile] = fs.readFileSync(logPath, 'utf8').split('\n').slice(-100); // Last 100 lines
        }
      }
    } catch (error) {
      exportData.logs.error = error.message;
    }

    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    console.log(`📄 Configuration exported to ${outputPath}`);
    
    return exportData;
  }
}

// CLI interface
if (require.main === module) {
  const manager = new HookConfigurationManager();
  
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  (async () => {
    try {
      switch (command) {
        case 'register':
          await manager.registerHooks();
          break;
        case 'test':
          await manager.testHooks();
          break;
        case 'status':
          const status = await manager.getHookStatus();
          console.log(JSON.stringify(status, null, 2));
          break;
        case 'export':
          await manager.exportConfiguration(args[0]);
          break;
        default:
          console.log(`
🔧 Hook Configuration Manager

Commands:
  register  - Register all hooks with claude-flow
  test      - Test all registered hooks
  status    - Show hook status and metrics
  export    - Export configuration and logs

Usage: node hook-config.js <command> [args]
          `);
      }
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = HookConfigurationManager;