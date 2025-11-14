import { describe, it, expect } from 'vitest';
import {
  validateHTML,
  validateJavaScript,
  validateReact,
  validateArtifact,
  categorizeError,
} from '../artifactValidator';

describe('artifactValidator', () => {
  describe('validateHTML', () => {
    it('flags empty HTML content as invalid', () => {
      const result = validateHTML('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'structure', severity: 'critical' }),
        ]),
      );
    });

    it('detects structural issues and best-practice warnings', () => {
      const snippet = `
        <html>
          <body>
            <div><span>Missing closing tag</div>
            <img src="hero.png">
            <button onclick="alert('hi')">Click</button>
          </body>
        </html>
      `;

      const result = validateHTML(snippet);

      expect(result.isValid).toBe(false);
      expect(result.errors.some((err) => err.message.includes('Unclosed'))).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'security', message: expect.stringContaining('Inline event') }),
          expect.objectContaining({ type: 'accessibility', message: expect.stringContaining('alt') }),
          expect.objectContaining({ type: 'best-practice', message: expect.stringContaining('viewport') }),
        ]),
      );
    });
  });

  describe('validateJavaScript', () => {
    it('detects unbalanced braces and parentheses', () => {
      const result = validateJavaScript('function Demo( { console.log("hi");');

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ message: 'Unbalanced curly braces' }),
          expect.objectContaining({ message: 'Unbalanced parentheses' }),
        ]),
      );
    });

    it('warns when eval is used', () => {
      const result = validateJavaScript('export function run(code) { eval(code); }');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'security', message: expect.stringContaining('eval') }),
        ]),
      );
    });
  });

  describe('validateReact', () => {
    it('flags disallowed browser storage usage and missing hook imports', () => {
      const content = `
        const counter = () => {
          const [count, setCount] = useState(0);
          localStorage.setItem('count', count.toString());
          return <div>{count}</div>;
        };
        export default counter;
      `;

      const result = validateReact(content);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('Browser storage APIs'),
            severity: 'critical',
          }),
        ]),
      );
      expect(result.warnings.some((warn) => warn.message.includes('React hooks'))).toBe(true);
    });

    it('blocks shadcn imports inside artifacts', () => {
      const content = `
        import { Button } from '@/components/ui/button';
        export default function Demo() {
          return <Button>Run</Button>;
        }
      `;

      const result = validateReact(content);

      expect(result.isValid).toBe(false);
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining("Cannot import '@/components/ui/button'"),
            type: 'structure',
          }),
        ]),
      );
    });
  });

  describe('validateArtifact router', () => {
    it('delegates to markdown validator with warnings for empty content', () => {
      const result = validateArtifact('', 'markdown');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'best-practice',
            message: expect.stringContaining('Markdown content is empty'),
          }),
        ]),
      );
    });
  });

  describe('categorizeError', () => {
    it('categorizes syntax, import, runtime, and unknown errors', () => {
      expect(categorizeError('SyntaxError: Unexpected token')).toMatchObject({
        category: 'syntax',
        severity: 'critical',
      });

      expect(categorizeError('Cannot find module @/foo')).toMatchObject({
        category: 'import',
        severity: 'high',
      });

      expect(categorizeError('ReferenceError: count is not defined')).toMatchObject({
        category: 'runtime',
        severity: 'high',
      });

      expect(categorizeError('Something odd happened')).toMatchObject({
        category: 'unknown',
        severity: 'medium',
      });
    });
  });
});
