/**
 * Test-specific logging utilities
 * Provides structured logging for test environments with proper formatting
 */

export interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration?: number;
  error?: string;
}

export interface TestSuite {
  name: string;
  description?: string;
  results: TestResult[];
  duration: number;
  passed: number;
  failed: number;
  skipped: number;
}

class TestLogger {
  private colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
  };

  private isColorEnabled(): boolean {
    return process.env.NODE_ENV !== 'test' && process.stdout.isTTY;
  }

  colorize(message: string, color: keyof typeof this.colors = 'white'): string {
    if (!this.isColorEnabled()) {
      return message;
    }
    return `${this.colors[color]}${message}${this.colors.reset}`;
  }

  header(title: string): void {
    const border = '='.repeat(title.length + 4);
    console.log(this.colorize(border, 'cyan'));
    console.log(this.colorize(`  ${title}  `, 'cyan'));
    console.log(this.colorize(border, 'cyan'));
  }

  section(title: string): void {
    console.log(this.colorize(`\n${title}`, 'blue'));
    console.log(this.colorize('-'.repeat(title.length), 'blue'));
  }

  success(message: string): void {
    console.log(this.colorize(`✅ ${message}`, 'green'));
  }

  error(message: string): void {
    console.log(this.colorize(`❌ ${message}`, 'red'));
  }

  warning(message: string): void {
    console.log(this.colorize(`⚠️  ${message}`, 'yellow'));
  }

  info(message: string): void {
    console.log(this.colorize(`ℹ️  ${message}`, 'blue'));
  }

  progress(message: string): void {
    console.log(this.colorize(`🔄 ${message}`, 'cyan'));
  }

  result(test: TestResult): void {
    const statusIcon = {
      pass: '✅',
      fail: '❌',
      skip: '⏭️'
    }[test.status];

    const statusColor = {
      pass: 'green',
      fail: 'red',
      skip: 'yellow'
    }[test.status] as keyof typeof this.colors;

    let message = `${statusIcon} ${test.name}`;
    if (test.duration !== undefined) {
      message += ` (${test.duration}ms)`;
    }

    console.log(this.colorize(message, statusColor));

    if (test.error && test.status === 'fail') {
      console.log(this.colorize(`   Error: ${test.error}`, 'red'));
    }
  }

  summary(suite: TestSuite): void {
    console.log('\n');
    this.section('Test Summary');

    console.log(`Total Tests: ${suite.results.length}`);
    console.log(this.colorize(`Passed: ${suite.passed}`, 'green'));

    if (suite.failed > 0) {
      console.log(this.colorize(`Failed: ${suite.failed}`, 'red'));
    }

    if (suite.skipped > 0) {
      console.log(this.colorize(`Skipped: ${suite.skipped}`, 'yellow'));
    }

    const successRate = Math.round((suite.passed / suite.results.length) * 100);
    const rateColor = successRate === 100 ? 'green' : successRate >= 75 ? 'yellow' : 'red';
    console.log(this.colorize(`Success Rate: ${successRate}%`, rateColor));
    console.log(`Duration: ${suite.duration}ms`);
  }

  table(headers: string[], rows: string[][]): void {
    const columnWidths = headers.map((header, index) => {
      const maxRowWidth = Math.max(...rows.map(row => (row[index] || '').length));
      return Math.max(header.length, maxRowWidth);
    });

    // Header
    const headerRow = headers.map((header, index) =>
      header.padEnd(columnWidths[index])
    ).join(' | ');
    console.log(this.colorize(headerRow, 'cyan'));

    // Separator
    const separator = columnWidths.map(width => '-'.repeat(width)).join('-|-');
    console.log(this.colorize(separator, 'cyan'));

    // Rows
    rows.forEach(row => {
      const formattedRow = row.map((cell, index) =>
        (cell || '').padEnd(columnWidths[index])
      ).join(' | ');
      console.log(formattedRow);
    });
  }

  group(title: string, content: () => void): void {
    this.section(title);
    console.group();
    content();
    console.groupEnd();
  }

  // Accessibility-specific logging
  accessibility = {
    componentResult: (componentName: string, score: number, passed: boolean) => {
      const status = passed ? '✅ PASSED' : '❌ FAILED';
      const color = passed ? 'green' : 'red';
      console.log(this.colorize(`${status} ${componentName}: Score ${score}/100`, color));
    },

    issue: (issue: string) => {
      console.log(this.colorize(`    - ${issue}`, 'red'));
    },

    recommendation: (recommendation: string) => {
      console.log(this.colorize(`    💡 ${recommendation}`, 'yellow'));
    },

    finalAssessment: (score: number) => {
      let message: string;
      let color: keyof typeof this.colors;

      if (score >= 90) {
        message = '🎉 Excellent! Accessibility improvements are well implemented.';
        color = 'green';
      } else if (score >= 75) {
        message = '👍 Good progress! Some improvements still needed.';
        color = 'yellow';
      } else {
        message = '⚠️  Significant accessibility improvements required.';
        color = 'red';
      }

      console.log(this.colorize(message, color));
    }
  };

  // Performance-specific logging
  performance = {
    metric: (name: string, value: number, unit: string = 'ms') => {
      console.log(`  - ${name}: ${value}${unit}`);
    },

    bounds: (name: string, current: number, max: number, passed: boolean) => {
      const status = passed ? '✅' : '❌';
      console.log(this.colorize(`  - ${status} ${name}: ${current} (should be ≤ ${max})`, passed ? 'green' : 'red'));
    }
  };
}

export const testLogger = new TestLogger();
export default testLogger;