import { describe, it, expect, vi, beforeEach } from 'vitest';
import { transpileCode, isSucraseAvailable } from '../sucraseTranspiler';
import * as Sentry from '@sentry/react';

// Mock Sentry to avoid actual error reporting during tests
vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
}));

describe('sucraseTranspiler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // BASIC JSX TRANSPILATION TESTS
  // ============================================

  describe('transpileCode - Basic JSX', () => {
    it('transpiles simple JSX component to React.createElement', () => {
      const code = 'const App = () => <div>Hello</div>';
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain('React.createElement');
        expect(result.code).toContain('div');
        expect(result.code).toContain('Hello');
        expect(result.elapsed).toBeGreaterThanOrEqual(0);
      }
    });

    it('transpiles JSX with props', () => {
      const code = 'const Button = () => <button className="btn" onClick={handleClick}>Click</button>';
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain('React.createElement');
        expect(result.code).toContain('button');
        expect(result.code).toContain('className');
        expect(result.code).toContain('onClick');
      }
    });

    it('transpiles self-closing JSX tags', () => {
      const code = 'const Icon = () => <img src="icon.png" alt="Icon" />';
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain('React.createElement');
        expect(result.code).toContain('img');
      }
    });

    it('transpiles JSX with nested elements', () => {
      const code = `
        const Card = () => (
          <div className="card">
            <h1>Title</h1>
            <p>Content</p>
          </div>
        );
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain('React.createElement');
        expect(result.code).toContain('div');
        expect(result.code).toContain('h1');
        expect(result.code).toContain('p');
      }
    });

    it('transpiles default export with JSX', () => {
      const code = 'export default function App() { return <div>App</div>; }';
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain('export default');
        expect(result.code).toContain('React.createElement');
      }
    });
  });

  // ============================================
  // TYPESCRIPT TYPE STRIPPING TESTS
  // ============================================

  describe('transpileCode - TypeScript Type Stripping', () => {
    it('strips type annotations from variables', () => {
      const code = 'const x: number = 1; const y: string = "hello";';
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).not.toContain(': number');
        expect(result.code).not.toContain(': string');
        expect(result.code).toContain('const x = 1');
        expect(result.code).toContain('const y = "hello"');
      }
    });

    it('strips function parameter types', () => {
      const code = 'function greet(name: string, age: number): void { console.log(name, age); }';
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).not.toContain(': string');
        expect(result.code).not.toContain(': number');
        expect(result.code).not.toContain(': void');
        expect(result.code).toContain('function greet(name, age)');
      }
    });

    it('strips interface declarations', () => {
      const code = `
        interface Props {
          name: string;
          age: number;
        }
        const data: Props = { name: "John", age: 30 };
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).not.toContain('interface Props');
        expect(result.code).not.toContain(': Props');
        expect(result.code).toContain('const data =');
      }
    });

    it('strips type aliases', () => {
      const code = `
        type ID = string | number;
        type User = { id: ID; name: string };
        const userId: ID = 123;
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).not.toContain('type ID');
        expect(result.code).not.toContain('type User');
        expect(result.code).not.toContain(': ID');
        expect(result.code).toContain('const userId = 123');
      }
    });

    it('strips generic type parameters from components', () => {
      const code = `
        function List<T>(props: { items: T[] }): JSX.Element {
          return <ul>{props.items.map((item, i) => <li key={i}>{String(item)}</li>)}</ul>;
        }
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).not.toContain('<T>');
        expect(result.code).not.toContain(': { items: T[] }');
        expect(result.code).not.toContain(': JSX.Element');
        expect(result.code).toContain('function List(props)');
        expect(result.code).toContain('React.createElement');
      }
    });

    it('strips return type annotations', () => {
      const code = 'const add = (a: number, b: number): number => a + b;';
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).not.toContain(': number');
        expect(result.code).toContain('const add = (a, b) => a + b');
      }
    });

    it('strips enum declarations', () => {
      const code = `
        enum Status {
          Active = "ACTIVE",
          Inactive = "INACTIVE"
        }
        const currentStatus: Status = Status.Active;
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        // Enums are converted to objects/vars by Sucrase
        expect(result.code).not.toContain('enum Status');
        expect(result.code).not.toContain(': Status');
      }
    });

    it('strips optional chaining type annotations', () => {
      const code = 'const user: { name?: string } = { name: "Alice" };';
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).not.toContain(': { name?: string }');
        expect(result.code).toContain('const user =');
      }
    });
  });

  // ============================================
  // COMPLEX JSX PATTERNS TESTS
  // ============================================

  describe('transpileCode - Complex JSX Patterns', () => {
    it('transpiles React fragments (short syntax)', () => {
      const code = `
        const Layout = () => (
          <>
            <div>First</div>
            <span>Second</span>
          </>
        );
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain('React.Fragment');
        expect(result.code).toContain('React.createElement');
      }
    });

    it('transpiles React.Fragment (long syntax)', () => {
      const code = `
        import React from 'react';
        const Layout = () => (
          <React.Fragment>
            <div>Content</div>
          </React.Fragment>
        );
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain('React.Fragment');
      }
    });

    it('transpiles props spreading', () => {
      const code = `
        const Button = (props) => <button {...props}>Click</button>;
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain('React.createElement');
        expect(result.code).toContain('button');
        // Spread props should be preserved in some form
        expect(result.code).toContain('props');
      }
    });

    it('transpiles children components', () => {
      const code = `
        const Parent = ({ children }) => <div className="parent">{children}</div>;
        const App = () => (
          <Parent>
            <span>Child content</span>
          </Parent>
        );
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain('React.createElement');
        expect(result.code).toContain('Parent');
        expect(result.code).toContain('span');
        expect(result.code).toContain('children');
      }
    });

    it('transpiles conditional rendering', () => {
      const code = `
        const Conditional = ({ show }) => (
          <div>
            {show ? <span>Visible</span> : null}
            {show && <div>Also visible</div>}
          </div>
        );
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain('React.createElement');
        expect(result.code).toContain('show');
      }
    });

    it('transpiles array mapping to elements', () => {
      const code = `
        const List = ({ items }) => (
          <ul>
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        );
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain('React.createElement');
        expect(result.code).toContain('ul');
        expect(result.code).toContain('li');
        expect(result.code).toContain('map');
      }
    });

    it('transpiles JSX with event handlers', () => {
      const code = `
        const Interactive = () => {
          const handleClick = () => console.log('clicked');
          return <button onClick={handleClick}>Click Me</button>;
        };
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain('React.createElement');
        expect(result.code).toContain('onClick');
        expect(result.code).toContain('handleClick');
      }
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  describe('transpileCode - Error Handling', () => {
    it('returns success: false for invalid syntax', () => {
      const code = 'const x = {{{}}; function (( {}';
      const result = transpileCode(code);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Transpilation failed');
        expect(result.details).toBeTruthy();
        expect(typeof result.details).toBe('string');
      }
    });

    it('returns error with details for malformed JSX', () => {
      const code = 'const App = () => <div><span></div>';
      const result = transpileCode(code);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Transpilation failed');
        expect(result.details).toBeTruthy();
      }
    });

    it('extracts line and column from error message when available', () => {
      // Sucrase error format: "Error message (10:5)"
      const code = 'const broken = <div>\n\n\n\n\n\n\n\n\n<span></div>'; // Error around line 10
      const result = transpileCode(code);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Transpilation failed');
        expect(result.details).toBeTruthy();
        // Line/column may or may not be present depending on error type
        if (result.line !== undefined) {
          expect(typeof result.line).toBe('number');
          expect(result.line).toBeGreaterThan(0);
        }
        if (result.column !== undefined) {
          expect(typeof result.column).toBe('number');
          expect(result.column).toBeGreaterThan(0);
        }
      }
    });

    it('reports errors to Sentry with correct context', () => {
      const code = 'invalid syntax {{{}}}';
      transpileCode(code);

      expect(Sentry.captureException).toHaveBeenCalled();
      const sentryCall = vi.mocked(Sentry.captureException).mock.calls[0];
      expect(sentryCall[1]).toMatchObject({
        tags: {
          component: 'sucraseTranspiler',
          action: 'transpile',
        },
        extra: {
          codeLength: code.length,
          elapsed: expect.any(Number),
        },
      });
    });

    it('does not throw exceptions on error', () => {
      expect(() => {
        transpileCode('completely broken code {{{');
      }).not.toThrow();
    });

    it('handles empty code string', () => {
      const result = transpileCode('');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toBe('');
        expect(result.elapsed).toBeGreaterThanOrEqual(0);
      }
    });

    it('handles very long code input', () => {
      const longCode = 'const x = 1;\n'.repeat(10000);
      const result = transpileCode(longCode);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code.length).toBeGreaterThan(0);
        expect(result.elapsed).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ============================================
  // PERFORMANCE TRACKING TESTS
  // ============================================

  describe('transpileCode - Performance Tracking', () => {
    it('includes elapsed time in result', () => {
      const code = 'const App = () => <div>Test</div>';
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.elapsed).toBeDefined();
        expect(typeof result.elapsed).toBe('number');
        expect(result.elapsed).toBeGreaterThanOrEqual(0);
      }
    });

    it('includes elapsed time even on error', () => {
      const code = 'invalid syntax {{{';
      const result = transpileCode(code);

      expect(result.success).toBe(false);
      // Note: TranspileError doesn't have elapsed in the type, but it's tracked internally
      // We verify it's sent to Sentry
      expect(Sentry.captureException).toHaveBeenCalled();
      const sentryCall = vi.mocked(Sentry.captureException).mock.calls[0];
      expect(sentryCall[1]?.extra?.elapsed).toBeGreaterThanOrEqual(0);
    });

    it('measures realistic transpilation time', () => {
      const code = `
        interface Props {
          name: string;
          age: number;
        }
        const Component = (props: Props) => {
          return (
            <div>
              <h1>{props.name}</h1>
              <p>{props.age}</p>
            </div>
          );
        };
        export default Component;
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        // Sucrase is fast, should be under 50ms for small code
        expect(result.elapsed).toBeLessThan(50);
      }
    });
  });

  // ============================================
  // OPTIONS TESTS
  // ============================================

  describe('transpileCode - Options', () => {
    it('accepts filename option', () => {
      const code = 'const App = () => <div>Test</div>';
      const result = transpileCode(code, { filename: 'MyComponent.tsx' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).toContain('React.createElement');
      }
    });

    it('works without options', () => {
      const code = 'const x: number = 1';
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).not.toContain(': number');
      }
    });
  });

  // ============================================
  // isSucraseAvailable() TESTS
  // ============================================

  describe('isSucraseAvailable', () => {
    it('returns true when Sucrase is working', () => {
      const available = isSucraseAvailable();
      expect(available).toBe(true);
    });

    it('handles gracefully when transpilation fails', async () => {
      // Mock Sucrase transform to simulate failure
      const sucraseModule = await import('sucrase');
      const originalTransform = sucraseModule.transform;

      vi.spyOn(sucraseModule, 'transform').mockImplementationOnce(() => {
        throw new Error('Mock transpilation error');
      });

      const available = isSucraseAvailable();
      expect(available).toBe(false);

      // Restore original
      vi.spyOn(sucraseModule, 'transform').mockRestore();
      sucraseModule.transform = originalTransform;
    });

    it('catches exceptions and returns false', async () => {
      // Mock Sucrase transform to throw
      const sucraseModule = await import('sucrase');
      const originalTransform = sucraseModule.transform;

      vi.spyOn(sucraseModule, 'transform').mockImplementationOnce(() => {
        throw new Error('Unexpected error');
      });

      const available = isSucraseAvailable();
      expect(available).toBe(false);

      // Restore original
      vi.spyOn(sucraseModule, 'transform').mockRestore();
      sucraseModule.transform = originalTransform;
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('transpileCode - Integration Tests', () => {
    it('transpiles complete React component with TypeScript', () => {
      const code = `
        import React, { useState } from 'react';

        interface CounterProps {
          initialCount?: number;
        }

        const Counter: React.FC<CounterProps> = ({ initialCount = 0 }) => {
          const [count, setCount] = useState<number>(initialCount);

          return (
            <div className="counter">
              <h1>Count: {count}</h1>
              <button onClick={() => setCount(count + 1)}>Increment</button>
              <button onClick={() => setCount(count - 1)}>Decrement</button>
            </div>
          );
        };

        export default Counter;
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        // Type annotations removed
        expect(result.code).not.toContain('interface CounterProps');
        expect(result.code).not.toContain(': React.FC<CounterProps>');
        expect(result.code).not.toContain('<number>');
        expect(result.code).not.toContain('?: number');

        // JSX transpiled
        expect(result.code).toContain('React.createElement');
        expect(result.code).toContain('div');
        expect(result.code).toContain('button');

        // Imports and exports preserved
        expect(result.code).toContain('import');
        expect(result.code).toContain('export default');

        // Logic preserved
        expect(result.code).toContain('useState');
        expect(result.code).toContain('setCount');
      }
    });

    it('transpiles artifact with fragments, maps, and conditionals', () => {
      const code = `
        type Item = { id: number; name: string; active: boolean };

        const List = ({ items }: { items: Item[] }) => {
          const activeItems = items.filter(item => item.active);

          return (
            <>
              {activeItems.length > 0 ? (
                <ul>
                  {activeItems.map(item => (
                    <li key={item.id}>
                      {item.name}
                      {item.active && <span className="badge">Active</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No active items</p>
              )}
            </>
          );
        };
      `;
      const result = transpileCode(code);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.code).not.toContain('type Item');
        expect(result.code).not.toContain(': { items: Item[] }');
        expect(result.code).toContain('React.Fragment');
        expect(result.code).toContain('React.createElement');
        expect(result.code).toContain('map');
        expect(result.code).toContain('filter');
      }
    });
  });
});
