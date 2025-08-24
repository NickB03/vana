import { FullConfig } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * Global teardown that runs after all tests
 * This is where we can perform cleanup tasks like:
 * - Stopping additional services
 * - Cleaning up test databases
 * - Archiving test artifacts
 * - Generating final reports
 */
async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting Playwright global teardown...')

  try {
    // Archive test artifacts
    await archiveTestArtifacts()

    // Clean up temporary files
    await cleanupTempFiles()

    // Generate test summary
    await generateTestSummary()

    console.log('✅ Playwright global teardown completed')
  } catch (error) {
    console.error('❌ Error during global teardown:', error)
  }
}

/**
 * Archive test artifacts to the Claude workspace
 */
async function archiveTestArtifacts() {
  const artifactDirs = [
    'playwright-report',
    'test-results',
  ]

  const archiveDir = '.claude_workspace/reports/playwright-artifacts'
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

  for (const dir of artifactDirs) {
    if (fs.existsSync(dir)) {
      const archivePath = path.join(archiveDir, `${dir}-${timestamp}`)
      
      try {
        if (!fs.existsSync(archiveDir)) {
          fs.mkdirSync(archiveDir, { recursive: true })
        }

        // Copy directory contents
        await copyDirectory(dir, archivePath)
        console.log(`📦 Archived ${dir} to ${archivePath}`)
      } catch (error) {
        console.warn(`⚠️  Failed to archive ${dir}:`, error.message)
      }
    }
  }
}

/**
 * Clean up temporary files and directories
 */
async function cleanupTempFiles() {
  const tempDirs = [
    'playwright/.auth',
    '.tmp',
  ]

  for (const dir of tempDirs) {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true })
        console.log(`🗑️  Cleaned up ${dir}`)
      } catch (error) {
        console.warn(`⚠️  Failed to cleanup ${dir}:`, error.message)
      }
    }
  }
}

/**
 * Generate a test summary report
 */
async function generateTestSummary() {
  const summaryPath = '.claude_workspace/reports/playwright-summary.md'
  const timestamp = new Date().toISOString()

  let summary = `# Playwright Test Summary\n\n`
  summary += `**Generated:** ${timestamp}\n\n`

  // Check for test results
  if (fs.existsSync('test-results/results.json')) {
    try {
      const results = JSON.parse(fs.readFileSync('test-results/results.json', 'utf8'))
      summary += `## Test Results\n\n`
      summary += `- **Total Tests:** ${results.stats?.total || 'Unknown'}\n`
      summary += `- **Passed:** ${results.stats?.passed || 'Unknown'}\n`
      summary += `- **Failed:** ${results.stats?.failed || 'Unknown'}\n`
      summary += `- **Skipped:** ${results.stats?.skipped || 'Unknown'}\n`
      summary += `- **Duration:** ${results.stats?.duration || 'Unknown'}ms\n\n`
    } catch (error) {
      summary += `## Test Results\n\n`
      summary += `Could not parse test results: ${error.message}\n\n`
    }
  }

  // Add artifact information
  summary += `## Generated Artifacts\n\n`
  summary += `- HTML Report: \`playwright-report/index.html\`\n`
  summary += `- Screenshots: \`test-results/\`\n`
  summary += `- Videos: \`test-results/\`\n`
  summary += `- Traces: \`test-results/\`\n\n`

  // Add next steps
  summary += `## Next Steps\n\n`
  summary += `1. Review the HTML report for detailed test results\n`
  summary += `2. Check screenshots and videos for failed tests\n`
  summary += `3. Analyze traces for debugging complex issues\n`
  summary += `4. Update tests based on findings\n\n`

  // Ensure directory exists
  const dir = path.dirname(summaryPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  // Write summary
  fs.writeFileSync(summaryPath, summary)
  console.log(`📊 Generated test summary: ${summaryPath}`)
}

/**
 * Utility function to copy directory recursively
 */
async function copyDirectory(src: string, dest: string) {
  await fs.promises.mkdir(dest, { recursive: true })
  const entries = await fs.promises.readdir(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath)
    } else {
      await fs.promises.copyFile(srcPath, destPath)
    }
  }
}

export default globalTeardown