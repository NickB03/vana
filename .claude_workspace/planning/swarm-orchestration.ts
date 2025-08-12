#!/usr/bin/env ts-node
/**
 * Vana Frontend Swarm Orchestration
 * Coordinates multi-agent implementation with strict validation gates
 * 
 * CRITICAL: Each chunk MUST be 100% validated before proceeding
 */

import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import * as path from 'path'

// ============================================================================
// CONFIGURATION
// ============================================================================

interface ChunkConfig {
  id: number
  name: string
  agent: string
  dependencies: number[]
  instructionFile: string
  validationTests: string
  maxAttempts: 5
}

interface PhaseConfig {
  id: number
  name: string
  chunks: ChunkConfig[]
  parallel: boolean
}

const PHASES: PhaseConfig[] = [
  {
    id: 1,
    name: 'Foundation',
    parallel: true,
    chunks: [
      {
        id: 1,
        name: 'Project Foundation',
        agent: 'system-architect',
        dependencies: [],
        instructionFile: 'chunk-1-foundation.md',
        validationTests: 'tests/chunks/chunk-1.test.ts',
        maxAttempts: 5
      },
      {
        id: 2,
        name: 'Homepage & Chat Flow',
        agent: 'frontend-api-specialist',
        dependencies: [],
        instructionFile: 'chunk-2-homepage-flow.md',
        validationTests: 'tests/chunks/chunk-2.test.ts',
        maxAttempts: 5
      },
      {
        id: 3,
        name: 'Authentication System',
        agent: 'backend-dev',
        dependencies: [],
        instructionFile: 'chunk-3-authentication.md',
        validationTests: 'tests/chunks/chunk-3.test.ts',
        maxAttempts: 5
      }
    ]
  },
  {
    id: 2,
    name: 'Core Systems',
    parallel: false, // SSE must work before chat rendering
    chunks: [
      {
        id: 4,
        name: 'SSE Connection Layer',
        agent: 'backend-dev',
        dependencies: [1],
        instructionFile: 'chunk-4-sse-streaming.md',
        validationTests: 'tests/chunks/chunk-4.test.ts',
        maxAttempts: 5
      },
      {
        id: 5,
        name: 'Chat Interface',
        agent: 'frontend-api-specialist',
        dependencies: [4],
        instructionFile: 'chunk-5-chat-interface.md',
        validationTests: 'tests/chunks/chunk-5.test.ts',
        maxAttempts: 5
      },
      {
        id: 6,
        name: 'Canvas System',
        agent: 'frontend-api-specialist',
        dependencies: [5],
        instructionFile: 'chunk-6-canvas-system.md',
        validationTests: 'tests/chunks/chunk-6.test.ts',
        maxAttempts: 5
      }
    ]
  },
  {
    id: 3,
    name: 'Features',
    parallel: true,
    chunks: [
      {
        id: 7,
        name: 'File Upload',
        agent: 'coder',
        dependencies: [6],
        instructionFile: 'chunk-07-file-upload.md',
        validationTests: 'tests/chunks/chunk-7.test.ts',
        maxAttempts: 5
      },
      {
        id: 8,
        name: 'Agent Visualization',
        agent: 'frontend-api-specialist',
        dependencies: [5],
        instructionFile: 'chunk-08-agent-visualization.md',
        validationTests: 'tests/chunks/chunk-8.test.ts',
        maxAttempts: 5
      },
      {
        id: 9,
        name: 'Session Management',
        agent: 'coder',
        dependencies: [5],
        instructionFile: 'chunk-09-session-management.md',
        validationTests: 'tests/chunks/chunk-9.test.ts',
        maxAttempts: 5
      },
      {
        id: 10,
        name: 'Unified State Management',
        agent: 'system-architect',
        dependencies: [6, 8, 9],
        instructionFile: 'chunk-10-unified-state.md',
        validationTests: 'tests/chunks/chunk-10.test.ts',
        maxAttempts: 5
      },
      {
        id: 11,
        name: 'API Client',
        agent: 'backend-dev',
        dependencies: [3, 4],
        instructionFile: 'chunk-11-api-client.md',
        validationTests: 'tests/chunks/chunk-11.test.ts',
        maxAttempts: 5
      }
    ]
  },
  {
    id: 4,
    name: 'Polish & Deployment',
    parallel: true,
    chunks: [
      {
        id: 12,
        name: 'UI & Styling',
        agent: 'frontend-api-specialist',
        dependencies: [10],
        instructionFile: 'chunk-12-ui-styling.md',
        validationTests: 'tests/chunks/chunk-12.test.ts',
        maxAttempts: 5
      },
      {
        id: 13,
        name: 'Error Handling & Accessibility',
        agent: 'reviewer',
        dependencies: [10],
        instructionFile: 'chunk-13-error-accessibility.md',
        validationTests: 'tests/chunks/chunk-13.test.ts',
        maxAttempts: 5
      },
      {
        id: 14,
        name: 'Performance & Security',
        agent: 'perf-analyzer',
        dependencies: [12, 13],
        instructionFile: 'chunk-14-performance-security.md',
        validationTests: 'tests/chunks/chunk-14.test.ts',
        maxAttempts: 5
      },
      {
        id: 15,
        name: 'Testing',
        agent: 'tester',
        dependencies: [14],
        instructionFile: 'chunk-15-testing.md',
        validationTests: 'tests/chunks/chunk-15.test.ts',
        maxAttempts: 5
      },
      {
        id: 16,
        name: 'Deployment & Roadmap',
        agent: 'cicd-engineer',
        dependencies: [15],
        instructionFile: 'chunk-16-deployment-roadmap.md',
        validationTests: 'tests/chunks/chunk-16.test.ts',
        maxAttempts: 5
      },
      {
        id: 17,
        name: 'Critical Gap Resolutions',
        agent: 'production-validator',
        dependencies: [16],
        instructionFile: 'chunk-17-critical-gaps.md',
        validationTests: 'tests/chunks/chunk-17.test.ts',
        maxAttempts: 5
      }
    ]
  }
]

// ============================================================================
// VALIDATION FRAMEWORK
// ============================================================================

interface ValidationResult {
  passed: boolean
  functional: TestResult
  integration: TestResult
  visual: TestResult
  e2e: TestResult
  performance: TestResult
  errors: string[]
}

interface TestResult {
  passed: boolean
  score: number
  details: string
}

class ChunkValidator {
  private attempts: Map<number, number> = new Map()
  
  async validate(chunk: ChunkConfig, attempt: number = 1): Promise<ValidationResult> {
    console.log(`\n📋 Validating Chunk ${chunk.id}: ${chunk.name} (Attempt ${attempt}/${chunk.maxAttempts})`)
    
    this.attempts.set(chunk.id, attempt)
    
    // Run all validation tests
    const result: ValidationResult = {
      passed: false,
      functional: await this.runFunctionalTests(chunk),
      integration: await this.runIntegrationTests(chunk),
      visual: await this.runVisualTests(chunk),
      e2e: await this.runE2ETests(chunk),
      performance: await this.runPerformanceTests(chunk),
      errors: []
    }
    
    // Check if all tests passed
    result.passed = [
      result.functional,
      result.integration,
      result.visual,
      result.e2e,
      result.performance
    ].every(test => test.passed)
    
    if (result.passed) {
      console.log(`✅ Chunk ${chunk.id} PASSED all validations!`)
      await this.saveValidationReport(chunk, result, 'PASSED')
      return result
    }
    
    // Handle failure
    if (attempt >= chunk.maxAttempts) {
      console.log(`🔴 Chunk ${chunk.id} FAILED after ${chunk.maxAttempts} attempts`)
      await this.escalateToSupervisor(chunk, result)
      throw new Error(`Chunk ${chunk.id} validation failed after max attempts`)
    }
    
    // Debug and retry
    console.log(`🔄 Chunk ${chunk.id} failed, attempting to debug and retry...`)
    await this.debugFailures(chunk, result)
    await this.peerReview(chunk, result)
    await this.research(chunk, result)
    
    // Retry
    return this.validate(chunk, attempt + 1)
  }
  
  private async runFunctionalTests(chunk: ChunkConfig): Promise<TestResult> {
    try {
      const testFile = path.join(process.cwd(), chunk.validationTests)
      const result = await this.executeCommand(`npm test -- ${testFile} --testNamePattern="Functional"`)
      
      return {
        passed: result.exitCode === 0,
        score: result.exitCode === 0 ? 100 : 0,
        details: result.output
      }
    } catch (error) {
      return {
        passed: false,
        score: 0,
        details: `Functional test error: ${error}`
      }
    }
  }
  
  private async runIntegrationTests(chunk: ChunkConfig): Promise<TestResult> {
    try {
      const result = await this.executeCommand(`npm test -- ${chunk.validationTests} --testNamePattern="Integration"`)
      
      return {
        passed: result.exitCode === 0,
        score: result.exitCode === 0 ? 100 : 0,
        details: result.output
      }
    } catch (error) {
      return {
        passed: false,
        score: 0,
        details: `Integration test error: ${error}`
      }
    }
  }
  
  private async runVisualTests(chunk: ChunkConfig): Promise<TestResult> {
    try {
      // Run Playwright visual tests
      const result = await this.executeCommand(`npx playwright test tests/visual/chunk-${chunk.id}.spec.ts`)
      
      // Take screenshots for review
      await this.executeCommand(`npx playwright screenshot http://localhost:3000 .claude_workspace/screenshots/chunk-${chunk.id}.png`)
      
      return {
        passed: result.exitCode === 0,
        score: result.exitCode === 0 ? 100 : 0,
        details: `Visual test completed. Screenshot saved.`
      }
    } catch (error) {
      return {
        passed: false,
        score: 0,
        details: `Visual test error: ${error}`
      }
    }
  }
  
  private async runE2ETests(chunk: ChunkConfig): Promise<TestResult> {
    try {
      // Start dev server if not running
      const serverRunning = await this.checkServerRunning()
      if (!serverRunning) {
        console.log('Starting dev server for E2E tests...')
        await this.startDevServer()
      }
      
      // Run E2E tests in real browser
      const result = await this.executeCommand(`npx playwright test tests/e2e/chunk-${chunk.id}.spec.ts --headed`)
      
      // Verify actual functionality (not just curl)
      const browserCheck = await this.verifyInBrowser(chunk)
      
      return {
        passed: result.exitCode === 0 && browserCheck,
        score: result.exitCode === 0 ? 100 : 0,
        details: `E2E test completed. Browser verification: ${browserCheck ? 'PASSED' : 'FAILED'}`
      }
    } catch (error) {
      return {
        passed: false,
        score: 0,
        details: `E2E test error: ${error}`
      }
    }
  }
  
  private async runPerformanceTests(chunk: ChunkConfig): Promise<TestResult> {
    try {
      // Run Lighthouse performance audit
      const result = await this.executeCommand(`npx lighthouse http://localhost:3000 --output=json --output-path=.claude_workspace/reports/lighthouse-chunk-${chunk.id}.json`)
      
      // Parse results
      const report = JSON.parse(await fs.readFile(`.claude_workspace/reports/lighthouse-chunk-${chunk.id}.json`, 'utf-8'))
      const performanceScore = report.categories.performance.score * 100
      
      return {
        passed: performanceScore >= 90,
        score: performanceScore,
        details: `Performance score: ${performanceScore}/100`
      }
    } catch (error) {
      return {
        passed: false,
        score: 0,
        details: `Performance test error: ${error}`
      }
    }
  }
  
  private async verifyInBrowser(chunk: ChunkConfig): Promise<boolean> {
    // Real browser verification - not just curl
    const checks = []
    
    switch (chunk.id) {
      case 1: // Foundation
        checks.push(await this.checkElementExists('body'))
        checks.push(await this.checkNoConsoleErrors())
        break
      case 2: // Homepage
        checks.push(await this.checkElementExists('h1:has-text("Hi, I\'m Vana")'))
        checks.push(await this.checkElementExists('input[placeholder*="Ask"]'))
        break
      case 3: // Auth
        checks.push(await this.checkElementExists('button:has-text("Sign in with Google")'))
        break
      // Add more specific checks for each chunk
    }
    
    return checks.every(check => check === true)
  }
  
  private async checkElementExists(selector: string): Promise<boolean> {
    try {
      const result = await this.executeCommand(`npx playwright evaluate "document.querySelector('${selector}') !== null"`)
      return result.output.includes('true')
    } catch {
      return false
    }
  }
  
  private async checkNoConsoleErrors(): Promise<boolean> {
    try {
      const result = await this.executeCommand(`npx playwright evaluate "window.__consoleErrors || []"`)
      return result.output.includes('[]')
    } catch {
      return false
    }
  }
  
  private async debugFailures(chunk: ChunkConfig, result: ValidationResult) {
    console.log(`\n🔍 Debugging failures for Chunk ${chunk.id}...`)
    
    // Analyze each failed test
    const failures = []
    if (!result.functional.passed) failures.push('functional')
    if (!result.integration.passed) failures.push('integration')
    if (!result.visual.passed) failures.push('visual')
    if (!result.e2e.passed) failures.push('e2e')
    if (!result.performance.passed) failures.push('performance')
    
    console.log(`Failed tests: ${failures.join(', ')}`)
    
    // Check common issues
    await this.checkDependencies()
    await this.checkEnvironmentVariables()
    await this.checkPortAvailability()
    await this.checkFilePermissions()
  }
  
  private async peerReview(chunk: ChunkConfig, result: ValidationResult) {
    console.log(`\n👥 Requesting peer review for Chunk ${chunk.id}...`)
    
    // Spawn reviewer agent to analyze the implementation
    await this.executeCommand(`npx claude-flow@alpha agent spawn --type reviewer --task "Review Chunk ${chunk.id} implementation and identify issues"`)
  }
  
  private async research(chunk: ChunkConfig, result: ValidationResult) {
    console.log(`\n🔬 Researching solutions for Chunk ${chunk.id} failures...`)
    
    // Spawn researcher agent to find solutions
    await this.executeCommand(`npx claude-flow@alpha agent spawn --type researcher --task "Research solutions for Chunk ${chunk.id} validation failures: ${result.errors.join(', ')}"`)
  }
  
  private async escalateToSupervisor(chunk: ChunkConfig, result: ValidationResult) {
    console.log(`\n🚨 ESCALATING Chunk ${chunk.id} to supervisor...`)
    
    const blockerReport = {
      chunk: chunk.id,
      name: chunk.name,
      attempts: this.attempts.get(chunk.id),
      failures: result,
      timestamp: new Date().toISOString(),
      recommendation: 'Human intervention required'
    }
    
    // Save blocker report
    await fs.writeFile(
      `.claude_workspace/reports/blocker-chunk-${chunk.id}.json`,
      JSON.stringify(blockerReport, null, 2)
    )
    
    console.log(`📄 Blocker report saved to .claude_workspace/reports/blocker-chunk-${chunk.id}.json`)
    console.log(`\n⚠️ SUPERVISOR ACTION REQUIRED:`)
    console.log(`- Chunk ${chunk.id} (${chunk.name}) blocked after ${chunk.maxAttempts} attempts`)
    console.log(`- Review blocker report for details`)
    console.log(`- Determine if other chunks can proceed or if work should pause`)
  }
  
  private async saveValidationReport(chunk: ChunkConfig, result: ValidationResult, status: string) {
    const report = {
      chunk: chunk.id,
      name: chunk.name,
      status,
      attempts: this.attempts.get(chunk.id),
      results: result,
      timestamp: new Date().toISOString()
    }
    
    await fs.writeFile(
      `.claude_workspace/reports/validation-chunk-${chunk.id}.json`,
      JSON.stringify(report, null, 2)
    )
  }
  
  private async executeCommand(command: string): Promise<{ exitCode: number; output: string }> {
    return new Promise((resolve) => {
      let output = ''
      const child = spawn(command, { shell: true })
      
      child.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      child.stderr.on('data', (data) => {
        output += data.toString()
      })
      
      child.on('exit', (code) => {
        resolve({ exitCode: code || 0, output })
      })
    })
  }
  
  private async checkServerRunning(): Promise<boolean> {
    try {
      const result = await this.executeCommand('curl -s http://localhost:3000')
      return result.exitCode === 0
    } catch {
      return false
    }
  }
  
  private async startDevServer() {
    spawn('npm', ['run', 'dev'], { detached: true, stdio: 'ignore' }).unref()
    await new Promise(resolve => setTimeout(resolve, 5000)) // Wait for server to start
  }
  
  private async checkDependencies() {
    console.log('Checking dependencies...')
    await this.executeCommand('npm ls')
  }
  
  private async checkEnvironmentVariables() {
    console.log('Checking environment variables...')
    await this.executeCommand('env | grep -E "(NODE_|NEXT_|REACT_)"')
  }
  
  private async checkPortAvailability() {
    console.log('Checking port availability...')
    await this.executeCommand('lsof -i :3000')
  }
  
  private async checkFilePermissions() {
    console.log('Checking file permissions...')
    await this.executeCommand('ls -la .')
  }
}

// ============================================================================
// SWARM ORCHESTRATOR
// ============================================================================

class SwarmOrchestrator {
  private validator: ChunkValidator
  private completedChunks: Set<number> = new Set()
  
  constructor() {
    this.validator = new ChunkValidator()
  }
  
  async orchestrate() {
    console.log('🚀 Starting Vana Frontend Swarm Orchestration')
    console.log('=' .repeat(60))
    
    // Initialize swarm
    await this.initializeSwarm()
    
    // Execute phases in order
    for (const phase of PHASES) {
      console.log(`\n📦 Starting Phase ${phase.id}: ${phase.name}`)
      console.log('-'.repeat(60))
      
      try {
        await this.executePhase(phase)
        console.log(`✅ Phase ${phase.id} completed successfully!`)
      } catch (error) {
        console.error(`❌ Phase ${phase.id} failed: ${error}`)
        await this.handlePhaseFailure(phase, error as Error)
        break // Stop execution on phase failure
      }
    }
    
    // Final report
    await this.generateFinalReport()
  }
  
  private async initializeSwarm() {
    console.log('\n🔧 Initializing swarm...')
    
    // Initialize Claude Flow swarm
    await this.executeCommand('npx claude-flow@alpha swarm init --topology hierarchical --agents 12')
    
    // Setup memory persistence
    await this.executeCommand('npx claude-flow@alpha memory persist --enable')
    
    // Enable hooks for coordination
    await this.executeCommand('npx claude-flow@alpha hooks enable --all')
    
    console.log('✅ Swarm initialized successfully')
  }
  
  private async executePhase(phase: PhaseConfig) {
    // Check dependencies
    for (const chunk of phase.chunks) {
      const ready = await this.checkDependencies(chunk)
      if (!ready) {
        throw new Error(`Chunk ${chunk.id} dependencies not met`)
      }
    }
    
    if (phase.parallel) {
      // Execute chunks in parallel
      const promises = phase.chunks.map(chunk => this.executeChunk(chunk))
      await Promise.all(promises)
    } else {
      // Execute chunks sequentially
      for (const chunk of phase.chunks) {
        await this.executeChunk(chunk)
      }
    }
  }
  
  private async executeChunk(chunk: ChunkConfig) {
    console.log(`\n🎯 Executing Chunk ${chunk.id}: ${chunk.name}`)
    
    // Load instruction file
    const instructionPath = path.join('.claude_workspace/planning/chunks', chunk.instructionFile)
    const instructions = await fs.readFile(instructionPath, 'utf-8')
    
    // Spawn agent with instructions
    const agentCommand = `npx claude-flow@alpha agent spawn \
      --type ${chunk.agent} \
      --task "Implement Chunk ${chunk.id}: ${chunk.name}" \
      --instructions "${instructions.replace(/"/g, '\\"')}" \
      --validation-required true`
    
    await this.executeCommand(agentCommand)
    
    // Wait for implementation
    await this.waitForImplementation(chunk)
    
    // Validate chunk
    try {
      const result = await this.validator.validate(chunk)
      if (result.passed) {
        this.completedChunks.add(chunk.id)
        console.log(`✅ Chunk ${chunk.id} completed and validated!`)
      }
    } catch (error) {
      console.error(`❌ Chunk ${chunk.id} validation failed: ${error}`)
      throw error
    }
  }
  
  private async checkDependencies(chunk: ChunkConfig): Promise<boolean> {
    for (const dep of chunk.dependencies) {
      if (!this.completedChunks.has(dep)) {
        console.log(`⏳ Chunk ${chunk.id} waiting for dependency: Chunk ${dep}`)
        return false
      }
    }
    return true
  }
  
  private async waitForImplementation(chunk: ChunkConfig) {
    console.log(`⏳ Waiting for Chunk ${chunk.id} implementation...`)
    
    // Poll for completion signal
    let attempts = 0
    const maxAttempts = 60 // 5 minutes with 5-second intervals
    
    while (attempts < maxAttempts) {
      const status = await this.checkImplementationStatus(chunk)
      if (status === 'completed') {
        return
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000))
      attempts++
    }
    
    throw new Error(`Chunk ${chunk.id} implementation timeout`)
  }
  
  private async checkImplementationStatus(chunk: ChunkConfig): Promise<string> {
    try {
      const result = await this.executeCommand(`npx claude-flow@alpha task status --chunk ${chunk.id}`)
      return result.output.includes('completed') ? 'completed' : 'in-progress'
    } catch {
      return 'in-progress'
    }
  }
  
  private async handlePhaseFailure(phase: PhaseConfig, error: Error) {
    console.error(`\n🔴 Phase ${phase.id} failed with error: ${error.message}`)
    
    // Save failure report
    const failureReport = {
      phase: phase.id,
      phaseName: phase.name,
      error: error.message,
      completedChunks: Array.from(this.completedChunks),
      timestamp: new Date().toISOString()
    }
    
    await fs.writeFile(
      `.claude_workspace/reports/phase-${phase.id}-failure.json`,
      JSON.stringify(failureReport, null, 2)
    )
    
    console.log(`\n⚠️ SUPERVISOR INTERVENTION REQUIRED`)
    console.log(`Phase ${phase.id} cannot proceed. Review failure report.`)
  }
  
  private async generateFinalReport() {
    console.log('\n📊 Generating final report...')
    
    const report = {
      timestamp: new Date().toISOString(),
      completedChunks: Array.from(this.completedChunks),
      totalChunks: 17,
      completionRate: (this.completedChunks.size / 17) * 100,
      phases: PHASES.map(phase => ({
        id: phase.id,
        name: phase.name,
        chunks: phase.chunks.map(chunk => ({
          id: chunk.id,
          name: chunk.name,
          completed: this.completedChunks.has(chunk.id)
        }))
      }))
    }
    
    await fs.writeFile(
      '.claude_workspace/reports/final-report.json',
      JSON.stringify(report, null, 2)
    )
    
    console.log(`\n${'='.repeat(60)}`)
    console.log('📈 FINAL REPORT')
    console.log(`${'='.repeat(60)}`)
    console.log(`Completed: ${this.completedChunks.size}/17 chunks (${report.completionRate.toFixed(1)}%)`)
    console.log(`Report saved to: .claude_workspace/reports/final-report.json`)
    
    if (this.completedChunks.size === 17) {
      console.log('\n🎉 SUCCESS! All chunks completed and validated!')
    } else {
      console.log('\n⚠️ Partial completion. Review reports for blocked chunks.')
    }
  }
  
  private async executeCommand(command: string): Promise<{ output: string }> {
    return new Promise((resolve, reject) => {
      let output = ''
      const child = spawn(command, { shell: true })
      
      child.stdout.on('data', (data) => {
        output += data.toString()
        process.stdout.write(data)
      })
      
      child.stderr.on('data', (data) => {
        output += data.toString()
        process.stderr.write(data)
      })
      
      child.on('exit', (code) => {
        if (code === 0) {
          resolve({ output })
        } else {
          reject(new Error(`Command failed with exit code ${code}`))
        }
      })
    })
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  try {
    // Create required directories
    await fs.mkdir('.claude_workspace/reports', { recursive: true })
    await fs.mkdir('.claude_workspace/screenshots', { recursive: true })
    await fs.mkdir('tests/chunks', { recursive: true })
    await fs.mkdir('tests/visual', { recursive: true })
    await fs.mkdir('tests/e2e', { recursive: true })
    
    // Start orchestration
    const orchestrator = new SwarmOrchestrator()
    await orchestrator.orchestrate()
    
  } catch (error) {
    console.error('Fatal error:', error)
    process.exit(1)
  }
}

// Run if executed directly
if (require.main === module) {
  main()
}

export { SwarmOrchestrator, ChunkValidator }