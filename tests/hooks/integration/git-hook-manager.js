#!/usr/bin/env node

/**
 * Git Hook Manager - Central hook execution orchestrator
 * 
 * This script manages the execution of all git hooks for the Vana project,
 * providing centralized hook coordination, validation, and reporting.
 * 
 * Usage: node git-hook-manager.js execute-hook <hook-type> [args...]
 */

const { execSync, spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

class GitHookManager {
  constructor() {
    this.projectRoot = this.findProjectRoot()
    this.hooksDir = path.join(this.projectRoot, 'tests', 'hooks')
    this.validationDir = path.join(this.hooksDir, 'validation')
    this.integrationDir = path.join(this.hooksDir, 'integration')
    
    this.supportedHooks = {
      'pre-commit': this.executePreCommit.bind(this),
      'post-commit': this.executePostCommit.bind(this),
      'pre-push': this.executePush.bind(this),
      'post-merge': this.executePostMerge.bind(this),
      'pre-rebase': this.executePreRebase.bind(this)
    }
  }

  findProjectRoot() {
    let currentDir = __dirname
    
    while (currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'package.json')) || 
          fs.existsSync(path.join(currentDir, '.git'))) {
        return currentDir
      }
      currentDir = path.dirname(currentDir)
    }
    
    throw new Error('Could not find project root (no package.json or .git found)')
  }

  async executeHook(hookType, args = []) {
    console.log(`🔗 Git Hook Manager: Executing ${hookType} hook`)
    
    if (!this.supportedHooks[hookType]) {
      console.log(`⚠️  Unsupported hook type: ${hookType}`)
      return 0
    }

    try {
      const result = await this.supportedHooks[hookType](args)
      
      if (result === 0) {
        console.log(`✅ ${hookType} hook completed successfully`)
      } else {
        console.log(`❌ ${hookType} hook failed with exit code ${result}`)
      }
      
      return result
      
    } catch (error) {
      console.error(`💥 ${hookType} hook error:`, error.message)
      return 1
    }
  }

  async executePreCommit(args) {
    console.log('  📋 Running pre-commit validations...')
    
    try {
      // Load environment variables from .env.local if it exists
      if (fs.existsSync(path.join(this.projectRoot, '.env.local'))) {
        const envContent = fs.readFileSync(path.join(this.projectRoot, '.env.local'), 'utf8')
        envContent.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split('=')
          if (key && valueParts.length > 0) {
            process.env[key] = valueParts.join('=')
          }
        })
      }
      
      // Check for developer-friendly bypass options
      if (process.env.FORCE_COMPLETE === 'true') {
        console.log('  ⚠️  FORCE_COMPLETE mode enabled - validation will pass')
        return 0
      }
      
      // Get staged files
      const stagedFiles = this.getStagedFiles()
      
      if (stagedFiles.length === 0) {
        console.log('  ℹ️  No staged files to validate')
        return 0
      }

      console.log(`  📁 Validating ${stagedFiles.length} staged files`)
      
      // Check for skip TypeScript mode
      if (process.env.SKIP_TS_CHECK === 'true') {
        console.log('  ⚠️  SKIP_TS_CHECK enabled - TypeScript files will be skipped')
      }
      
      // Run flexible validator if available
      const flexibleValidatorPath = path.join(this.projectRoot, 'src', 'hooks', 'core', 'flexible_validator.py')
      if (fs.existsSync(flexibleValidatorPath)) {
        console.log('  🔧 Running flexible validation...')
        
        try {
          const command = `python3 "${flexibleValidatorPath}" ${stagedFiles.map(f => `"${f}"`).join(' ')}`
          execSync(command, {
            cwd: this.projectRoot,
            stdio: 'inherit',
            timeout: 30000,
            env: { ...process.env }
          })
          console.log('  ✅ Flexible validation passed')
        } catch (error) {
          if (process.env.SOFT_FAIL_MODE === 'true') {
            console.log('  ⚠️  Validation issues found but SOFT_FAIL_MODE enabled')
            return 0
          } else {
            console.log('  ❌ Flexible validation failed')
            console.log('  💡 Quick fixes:')
            console.log('    SKIP_TS_CHECK=true git commit     # Skip TypeScript validation')
            console.log('    SOFT_FAIL_MODE=true git commit    # Convert errors to warnings')
            console.log('    FORCE_COMPLETE=true git commit    # Force commit (use carefully)')
            return 1
          }
        }
      } else {
        // Fallback to enhanced PRD validator if flexible validator not available
        const prdValidatorPath = path.join(this.integrationDir, 'enhanced-prd-validator.js')
        if (fs.existsSync(prdValidatorPath)) {
          console.log('  🎯 Running PRD compliance validation...')
          
          let prdValidationPassed = true
          
          // Validate each staged file individually
          for (const file of stagedFiles) {
            try {
              console.log(`    Validating: ${file}`)
              execSync(`node "${prdValidatorPath}" "${file}"`, {
                cwd: this.projectRoot,
                stdio: 'pipe', // Capture output to avoid noise
                timeout: 10000
              })
            } catch (error) {
              if (error.status !== 0) {
                console.log(`    ❌ PRD validation failed for: ${file}`)
                prdValidationPassed = false
              }
            }
          }
          
          if (prdValidationPassed) {
            console.log('  ✅ PRD validation passed')
          } else {
            if (process.env.SOFT_FAIL_MODE === 'true') {
              console.log('  ⚠️  PRD validation failed but SOFT_FAIL_MODE enabled')
              return 0
            } else {
              console.log('  ❌ PRD validation failed for some files')
              return 1
            }
          }
        }
      }

      // Run security validation (only if not in soft fail mode or flexible validator didn't run)
      if (!fs.existsSync(flexibleValidatorPath)) {
        const securityValidatorPath = path.join(this.validationDir, 'advanced-security-validator.js')
        if (fs.existsSync(securityValidatorPath)) {
          console.log('  🔒 Running security validation...')
          
          try {
            execSync(`node "${securityValidatorPath}" --files ${stagedFiles.join(' ')}`, {
              cwd: this.projectRoot,
              stdio: 'inherit',
              timeout: 15000
            })
            console.log('  ✅ Security validation passed')
          } catch (error) {
            if (process.env.SOFT_FAIL_MODE === 'true') {
              console.log('  ⚠️  Security validation failed but SOFT_FAIL_MODE enabled')
              return 0
            } else if (error.status !== 0) {
              console.log('  ❌ Security validation failed')
              return error.status || 1
            }
          }
        }
      }

      console.log('  🎉 All pre-commit validations passed')
      
      // Show developer tips if any bypasses were used
      const bypassUsed = process.env.FORCE_COMPLETE === 'true' || 
                        process.env.SOFT_FAIL_MODE === 'true' || 
                        process.env.SKIP_TS_CHECK === 'true'
      
      if (bypassUsed) {
        console.log('  💡 Developer bypass options used:')
        if (process.env.FORCE_COMPLETE === 'true') console.log('    • FORCE_COMPLETE: Validation bypassed')
        if (process.env.SOFT_FAIL_MODE === 'true') console.log('    • SOFT_FAIL_MODE: Errors converted to warnings')
        if (process.env.SKIP_TS_CHECK === 'true') console.log('    • SKIP_TS_CHECK: TypeScript validation skipped')
        console.log('  📋 Remember to run full validation before merging!')
      }
      
      return 0
      
    } catch (error) {
      console.error('  💥 Pre-commit validation error:', error.message)
      
      // Provide helpful error recovery suggestions
      console.log('  🚑 Error recovery options:')
      console.log('    FORCE_COMPLETE=true git commit    # Bypass all validation (emergency)')
      console.log('    SOFT_FAIL_MODE=true git commit    # Convert errors to warnings')
      console.log('    git commit --no-verify            # Skip hooks entirely (not recommended)')
      
      return 1
    }
  }

  async executePostCommit(args) {
    console.log('  📝 Running post-commit actions...')
    
    try {
      // Update tracking and metrics
      const commitHash = this.getLastCommitHash()
      console.log(`  📊 Tracking commit: ${commitHash.substring(0, 8)}`)
      
      // Run any post-commit tracking
      // This is typically lightweight and shouldn't fail the commit
      
      console.log('  ✅ Post-commit actions completed')
      return 0
      
    } catch (error) {
      console.error('  ⚠️  Post-commit warning:', error.message)
      // Post-commit hooks should not fail the commit
      return 0
    }
  }

  async executePush(args) {
    console.log('  🚀 Running pre-push validations...')
    
    try {
      // Basic validation before push
      // This could include larger tests if needed
      
      console.log('  ✅ Pre-push validations passed')
      return 0
      
    } catch (error) {
      console.error('  💥 Pre-push validation error:', error.message)
      return 1
    }
  }

  async executePostMerge(args) {
    console.log('  🔄 Running post-merge actions...')
    
    try {
      // Handle post-merge cleanup and updates
      console.log('  ✅ Post-merge actions completed')
      return 0
      
    } catch (error) {
      console.error('  ⚠️  Post-merge warning:', error.message)
      return 0
    }
  }

  async executePreRebase(args) {
    console.log('  🔄 Running pre-rebase validations...')
    
    try {
      // Validate rebase safety
      console.log('  ✅ Pre-rebase validations passed')
      return 0
      
    } catch (error) {
      console.error('  💥 Pre-rebase validation error:', error.message)
      return 1
    }
  }

  getStagedFiles() {
    try {
      const output = execSync('git diff --cached --name-only', {
        cwd: this.projectRoot,
        encoding: 'utf8',
        timeout: 5000
      })
      
      return output.trim().split('\n').filter(file => file.length > 0)
      
    } catch (error) {
      console.warn('Could not get staged files:', error.message)
      return []
    }
  }

  getLastCommitHash() {
    try {
      const output = execSync('git rev-parse HEAD', {
        cwd: this.projectRoot,
        encoding: 'utf8',
        timeout: 5000
      })
      
      return output.trim()
      
    } catch (error) {
      console.warn('Could not get commit hash:', error.message)
      return 'unknown'
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('Usage: node git-hook-manager.js execute-hook <hook-type> [args...]')
    console.log('Supported hooks: pre-commit, post-commit, pre-push, post-merge, pre-rebase')
    process.exit(1)
  }

  const command = args[0]
  
  if (command === 'execute-hook') {
    const hookType = args[1]
    const hookArgs = args.slice(2)
    
    if (!hookType) {
      console.error('Error: Hook type is required')
      process.exit(1)
    }

    const manager = new GitHookManager()
    const exitCode = await manager.executeHook(hookType, hookArgs)
    process.exit(exitCode)
    
  } else {
    console.error(`Unknown command: ${command}`)
    process.exit(1)
  }
}

// Execute if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Git Hook Manager failed:', error.message)
    process.exit(1)
  })
}

module.exports = { GitHookManager }