import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import istanbulCoverage from 'istanbul-lib-coverage';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const COVERAGE_FILE = resolve(projectRoot, 'coverage', 'coverage-final.json');

const thresholds = {
  statements: 55,
  branches: 50,
  functions: 55,
  lines: 55
};

const format = (value) => Number.parseFloat(value ?? 0).toFixed(2);

async function readCoverageFile() {
  try {
    const raw = await readFile(COVERAGE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    // ✅ IMPROVED: Distinguish between different error types
    if (error.code === 'ENOENT') {
      throw new Error(
        `Coverage file not found at ${COVERAGE_FILE}.\n` +
        'Run "vitest run --coverage" to generate coverage data first.'
      );
    }
    if (error instanceof SyntaxError) {
      throw new Error(
        `Corrupted coverage file at ${COVERAGE_FILE}.\n` +
        `JSON parsing failed: ${error.message}\n` +
        'Try deleting the coverage directory and running tests again.'
      );
    }
    if (error.code === 'EACCES') {
      throw new Error(
        `Permission denied reading ${COVERAGE_FILE}.\n` +
        'Check file permissions and try again.'
      );
    }
    // Re-throw unexpected errors
    throw error;
  }
}

async function main() {
  const data = await readCoverageFile();
  const { createCoverageMap } = istanbulCoverage;
  const coverageMap = createCoverageMap(data);
  const summary = coverageMap.getCoverageSummary().data;

  const failures = Object.entries(thresholds).flatMap(([metric, min]) => {
    const actual = summary[metric]?.pct ?? 0;
    return actual >= min
      ? []
      : [`${metric}: expected ≥ ${min.toFixed(2)}%, actual ${format(actual)}%`];
  });

  if (failures.length > 0) {
    console.error('Coverage thresholds not met:\n- ' + failures.join('\n- '));
    process.exitCode = 1;
    return;
  }

  const report = Object.entries(thresholds)
    .map(([metric]) => `${metric} ${format(summary[metric]?.pct)}%`)
    .join(', ');

  console.log(`Coverage thresholds satisfied (${report}).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
