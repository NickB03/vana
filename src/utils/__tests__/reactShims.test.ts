import { describe, it, expect } from 'vitest';
import {
  REACT_EXPORT_NAMES,
  REACT_SHIM,
  REACT_DOM_SHIM,
  REACT_DOM_CLIENT_SHIM,
  JSX_RUNTIME_SHIM,
  BASE_REACT_IMPORTS,
} from '../reactShims';
import { REACT_EXPORT_NAMES as SERVER_REACT_EXPORT_NAMES } from '../../../supabase/functions/_shared/react-shims';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('reactShims', () => {
  // ============================================
  // REACT_EXPORT_NAMES TESTS
  // ============================================

  describe('REACT_EXPORT_NAMES', () => {
    it('contains essential React 18 hooks', () => {
      const essentialHooks = [
        'useState',
        'useEffect',
        'useCallback',
        'useMemo',
        'useRef',
        'useContext',
        'useReducer',
        'useLayoutEffect',
      ];

      essentialHooks.forEach(hook => {
        expect(REACT_EXPORT_NAMES).toContain(hook);
      });
    });

    it('contains React 18 concurrent features', () => {
      const concurrentFeatures = [
        'useDeferredValue',
        'useTransition',
        'useId',
        'useSyncExternalStore',
        'useInsertionEffect',
        'startTransition',
      ];

      concurrentFeatures.forEach(feature => {
        expect(REACT_EXPORT_NAMES).toContain(feature);
      });
    });

    it('contains core React utilities', () => {
      const utilities = [
        'createElement',
        'createContext',
        'forwardRef',
        'memo',
        'lazy',
        'Suspense',
        'Fragment',
        'Children',
        'cloneElement',
        'isValidElement',
        'createRef',
      ];

      utilities.forEach(util => {
        expect(REACT_EXPORT_NAMES).toContain(util);
      });
    });

    it('contains React component base classes', () => {
      expect(REACT_EXPORT_NAMES).toContain('Component');
      expect(REACT_EXPORT_NAMES).toContain('PureComponent');
      expect(REACT_EXPORT_NAMES).toContain('StrictMode');
    });

    it('contains development helpers', () => {
      expect(REACT_EXPORT_NAMES).toContain('useDebugValue');
      expect(REACT_EXPORT_NAMES).toContain('useImperativeHandle');
    });

    it('is a readonly array', () => {
      // TypeScript enforces this at compile time, but we can verify the structure
      expect(Array.isArray(REACT_EXPORT_NAMES)).toBe(true);
      expect(REACT_EXPORT_NAMES.length).toBeGreaterThan(0);
    });

    it('contains no duplicate entries', () => {
      const unique = new Set(REACT_EXPORT_NAMES);
      expect(unique.size).toBe(REACT_EXPORT_NAMES.length);
    });

    it('contains exactly 30 exports', () => {
      // This ensures we're aware when React exports change
      expect(REACT_EXPORT_NAMES.length).toBe(30);
    });
  });

  // ============================================
  // REACT_SHIM TESTS
  // ============================================

  describe('REACT_SHIM', () => {
    it('is a valid data URL', () => {
      expect(REACT_SHIM).toMatch(/^data:text\/javascript,/);
    });

    it('contains error checking for missing window.React', () => {
      expect(REACT_SHIM).toContain('if(!window.React)');
      expect(REACT_SHIM).toContain('throw new Error');
      expect(REACT_SHIM).toContain('React failed to load');
    });

    it('exports all REACT_EXPORT_NAMES', () => {
      REACT_EXPORT_NAMES.forEach(exportName => {
        expect(REACT_SHIM).toContain(exportName);
      });
    });

    it('includes default export', () => {
      expect(REACT_SHIM).toContain('export default');
    });

    it('uses window.React as source', () => {
      expect(REACT_SHIM).toContain('window.React');
    });

    it('uses destructuring for named exports', () => {
      expect(REACT_SHIM).toMatch(/export const\s*{.*}=/);
    });

    it('contains compact, minified structure', () => {
      // Shims should be compact to reduce bundle size
      expect(REACT_SHIM).not.toContain('\n');
      expect(REACT_SHIM.length).toBeLessThan(1000);
    });
  });

  // ============================================
  // REACT_DOM_SHIM TESTS
  // ============================================

  describe('REACT_DOM_SHIM', () => {
    it('is a valid data URL', () => {
      expect(REACT_DOM_SHIM).toMatch(/^data:text\/javascript,/);
    });

    it('contains error checking for missing window.ReactDOM', () => {
      expect(REACT_DOM_SHIM).toContain('if(!window.ReactDOM)');
      expect(REACT_DOM_SHIM).toContain('throw new Error');
      expect(REACT_DOM_SHIM).toContain('ReactDOM failed to load');
    });

    it('includes createRoot for React 18', () => {
      expect(REACT_DOM_SHIM).toContain('createRoot');
    });

    it('includes hydrateRoot for React 18', () => {
      expect(REACT_DOM_SHIM).toContain('hydrateRoot');
    });

    it('includes unstable_batchedUpdates (critical for PR #447)', () => {
      // This is the key fix in the PR - ensures unstable_batchedUpdates is available
      expect(REACT_DOM_SHIM).toContain('unstable_batchedUpdates');
    });

    it('includes legacy ReactDOM methods', () => {
      const legacyMethods = [
        'createPortal',
        'flushSync',
        'findDOMNode',
        'unmountComponentAtNode',
        'render',
        'hydrate',
      ];

      legacyMethods.forEach(method => {
        expect(REACT_DOM_SHIM).toContain(method);
      });
    });

    it('uses window.ReactDOM as source', () => {
      expect(REACT_DOM_SHIM).toContain('window.ReactDOM');
    });
  });

  // ============================================
  // REACT_DOM_CLIENT_SHIM TESTS
  // ============================================

  describe('REACT_DOM_CLIENT_SHIM', () => {
    it('is a valid data URL', () => {
      expect(REACT_DOM_CLIENT_SHIM).toMatch(/^data:text\/javascript,/);
    });

    it('contains error checking for missing window.ReactDOM', () => {
      expect(REACT_DOM_CLIENT_SHIM).toContain('if(!window.ReactDOM)');
      expect(REACT_DOM_CLIENT_SHIM).toContain('throw new Error');
      expect(REACT_DOM_CLIENT_SHIM).toContain('ReactDOM failed to load');
    });

    it('includes React 18 client exports', () => {
      const clientExports = [
        'createRoot',
        'hydrateRoot',
        'createPortal',
        'flushSync',
        'unstable_batchedUpdates',
      ];

      clientExports.forEach(exportName => {
        expect(REACT_DOM_CLIENT_SHIM).toContain(exportName);
      });
    });

    it('includes unstable_batchedUpdates (critical for PR #447)', () => {
      // Double-check this critical export is in client shim too
      expect(REACT_DOM_CLIENT_SHIM).toContain('unstable_batchedUpdates');
    });

    it('does not include legacy methods not in react-dom/client', () => {
      // react-dom/client shouldn't have these legacy methods
      expect(REACT_DOM_CLIENT_SHIM).not.toContain('findDOMNode');
      expect(REACT_DOM_CLIENT_SHIM).not.toContain('unmountComponentAtNode');

      // Check for 'render' as standalone export (not part of 'hydrate' in 'hydrateRoot')
      const hasRenderExport = /[,{]render[,}]/.test(REACT_DOM_CLIENT_SHIM);
      expect(hasRenderExport).toBe(false);

      // Check for legacy 'hydrate' method (not 'hydrateRoot' which is valid)
      const hasLegacyHydrate = /[,{]hydrate[,}]/.test(REACT_DOM_CLIENT_SHIM);
      expect(hasLegacyHydrate).toBe(false);
    });
  });

  // ============================================
  // JSX_RUNTIME_SHIM TESTS
  // ============================================

  describe('JSX_RUNTIME_SHIM', () => {
    it('is a valid data URL', () => {
      expect(JSX_RUNTIME_SHIM).toMatch(/^data:text\/javascript,/);
    });

    it('contains error checking for missing window.React', () => {
      expect(JSX_RUNTIME_SHIM).toContain('if(!window.React)');
      expect(JSX_RUNTIME_SHIM).toContain('throw new Error');
      expect(JSX_RUNTIME_SHIM).toContain('React failed to load (jsx-runtime)');
    });

    it('exports jsx function', () => {
      expect(JSX_RUNTIME_SHIM).toContain('jsx');
      expect(JSX_RUNTIME_SHIM).toContain('export{jsx');
    });

    it('exports jsxs function', () => {
      expect(JSX_RUNTIME_SHIM).toContain('jsxs');
      expect(JSX_RUNTIME_SHIM).toContain('export{jsx,jsxs');
    });

    it('exports Fragment', () => {
      expect(JSX_RUNTIME_SHIM).toContain('Fragment');
      expect(JSX_RUNTIME_SHIM).toContain('export{jsx,jsxs,Fragment}');
    });

    it('maps jsx to createElement', () => {
      expect(JSX_RUNTIME_SHIM).toContain('createElement');
      expect(JSX_RUNTIME_SHIM).toContain('jsx=(type,props,key)');
    });

    it('maps jsxs to jsx (same implementation)', () => {
      expect(JSX_RUNTIME_SHIM).toContain('jsxs=jsx');
    });

    it('gets Fragment from React', () => {
      expect(JSX_RUNTIME_SHIM).toContain('Fragment=R.Fragment');
    });
  });

  // ============================================
  // BASE_REACT_IMPORTS TESTS
  // ============================================

  describe('BASE_REACT_IMPORTS', () => {
    it('has all required React entry points', () => {
      const requiredKeys = [
        'react',
        'react-dom',
        'react-dom/client',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
      ];

      requiredKeys.forEach(key => {
        expect(BASE_REACT_IMPORTS).toHaveProperty(key);
      });
    });

    it('maps react to REACT_SHIM', () => {
      expect(BASE_REACT_IMPORTS.react).toBe(REACT_SHIM);
    });

    it('maps react-dom to REACT_DOM_SHIM', () => {
      expect(BASE_REACT_IMPORTS['react-dom']).toBe(REACT_DOM_SHIM);
    });

    it('maps react-dom/client to REACT_DOM_CLIENT_SHIM', () => {
      expect(BASE_REACT_IMPORTS['react-dom/client']).toBe(REACT_DOM_CLIENT_SHIM);
    });

    it('maps react/jsx-runtime to JSX_RUNTIME_SHIM', () => {
      expect(BASE_REACT_IMPORTS['react/jsx-runtime']).toBe(JSX_RUNTIME_SHIM);
    });

    it('maps react/jsx-dev-runtime to JSX_RUNTIME_SHIM', () => {
      expect(BASE_REACT_IMPORTS['react/jsx-dev-runtime']).toBe(JSX_RUNTIME_SHIM);
    });

    it('is a readonly object', () => {
      // TypeScript enforces this at compile time
      expect(typeof BASE_REACT_IMPORTS).toBe('object');
      expect(Object.keys(BASE_REACT_IMPORTS).length).toBe(5);
    });

    it('contains only data URLs', () => {
      Object.values(BASE_REACT_IMPORTS).forEach(value => {
        expect(value).toMatch(/^data:text\/javascript,/);
      });
    });
  });

  // ============================================
  // SERVER/CLIENT PARITY TESTS
  // ============================================

  describe('server/client parity', () => {
    it('client and server REACT_EXPORT_NAMES should match exactly', () => {
      // Both should have same length
      expect(REACT_EXPORT_NAMES.length).toBe(SERVER_REACT_EXPORT_NAMES.length);

      // Both should contain exact same exports in same order
      REACT_EXPORT_NAMES.forEach((exportName, index) => {
        expect(exportName).toBe(SERVER_REACT_EXPORT_NAMES[index]);
      });
    });

    it('server and client files should have identical REACT_EXPORT_NAMES arrays', () => {
      // Read both files and extract the REACT_EXPORT_NAMES section
      const clientFile = readFileSync(
        join(process.cwd(), 'src/utils/reactShims.ts'),
        'utf-8'
      );
      const serverFile = readFileSync(
        join(process.cwd(), 'supabase/functions/_shared/react-shims.ts'),
        'utf-8'
      );

      // Extract REACT_EXPORT_NAMES array from both files
      const extractExportNames = (content: string): string => {
        const match = content.match(/REACT_EXPORT_NAMES = \[([\s\S]*?)\] as const/);
        if (!match) throw new Error('Could not extract REACT_EXPORT_NAMES');
        return match[1].trim();
      };

      const clientExports = extractExportNames(clientFile);
      const serverExports = extractExportNames(serverFile);

      // Should be character-by-character identical
      expect(clientExports).toBe(serverExports);
    });

    it('server shim structure matches client', () => {
      const serverFile = readFileSync(
        join(process.cwd(), 'supabase/functions/_shared/react-shims.ts'),
        'utf-8'
      );

      // Server should have same structure as client
      expect(serverFile).toContain('REACT_EXPORT_NAMES');
      expect(serverFile).toContain('REACT_EXPORT_LIST');
      expect(serverFile).toContain('REACT_DOM_EXPORT_NAMES');
      expect(serverFile).toContain('REACT_DOM_CLIENT_EXPORT_NAMES');
      expect(serverFile).toContain('REACT_SHIM');
      expect(serverFile).toContain('REACT_DOM_SHIM');
      expect(serverFile).toContain('REACT_DOM_CLIENT_SHIM');
      expect(serverFile).toContain('JSX_RUNTIME_SHIM');
    });

    it('server exports REACT_EXPORT_NAMES', () => {
      const serverFile = readFileSync(
        join(process.cwd(), 'supabase/functions/_shared/react-shims.ts'),
        'utf-8'
      );

      // Server should export REACT_EXPORT_NAMES for parity checks
      expect(serverFile).toContain('export const REACT_EXPORT_NAMES');
    });
  });

  // ============================================
  // INTEGRATION TESTS
  // ============================================

  describe('integration', () => {
    it('shims are properly URL-encoded', () => {
      const shims = [
        REACT_SHIM,
        REACT_DOM_SHIM,
        REACT_DOM_CLIENT_SHIM,
        JSX_RUNTIME_SHIM,
      ];

      shims.forEach(shim => {
        // Should be valid data URL without encoding issues
        expect(shim).not.toContain('\n');
        expect(shim).not.toContain('\r');
        expect(shim).not.toContain('\t');
      });
    });

    it('all shims follow consistent error handling pattern', () => {
      const shims = [
        { name: 'REACT_SHIM', code: REACT_SHIM },
        { name: 'REACT_DOM_SHIM', code: REACT_DOM_SHIM },
        { name: 'REACT_DOM_CLIENT_SHIM', code: REACT_DOM_CLIENT_SHIM },
        { name: 'JSX_RUNTIME_SHIM', code: JSX_RUNTIME_SHIM },
      ];

      shims.forEach(({ name, code }) => {
        // Each should check for window global
        expect(code).toContain('if(!window.');
        // Each should throw descriptive error
        expect(code).toContain('throw new Error');
        // Each should mention what failed to load
        expect(code).toMatch(/failed to load|Please refresh/);
      });
    });

    it('shims reference correct global variables', () => {
      expect(REACT_SHIM).toContain('window.React');
      expect(REACT_DOM_SHIM).toContain('window.ReactDOM');
      expect(REACT_DOM_CLIENT_SHIM).toContain('window.ReactDOM');
      expect(JSX_RUNTIME_SHIM).toContain('window.React');
    });

    it('all exports are properly comma-separated', () => {
      // REACT_SHIM should have exports joined by commas
      const reactExportsMatch = REACT_SHIM.match(/export const\{([^}]+)\}/);
      expect(reactExportsMatch).toBeTruthy();
      if (reactExportsMatch) {
        const exports = reactExportsMatch[1].split(',');
        expect(exports.length).toBe(REACT_EXPORT_NAMES.length);
      }
    });
  });

  // ============================================
  // REGRESSION TESTS FOR PR #447
  // ============================================

  describe('PR #447 regression prevention', () => {
    it('REACT_DOM_SHIM includes unstable_batchedUpdates', () => {
      // Critical fix: unstable_batchedUpdates was missing before PR #447
      expect(REACT_DOM_SHIM).toContain('unstable_batchedUpdates');
    });

    it('REACT_DOM_CLIENT_SHIM includes unstable_batchedUpdates', () => {
      // Critical fix: ensure both shims have it
      expect(REACT_DOM_CLIENT_SHIM).toContain('unstable_batchedUpdates');
    });

    it('unstable_batchedUpdates appears in both client and server shims', () => {
      const serverFile = readFileSync(
        join(process.cwd(), 'supabase/functions/_shared/react-shims.ts'),
        'utf-8'
      );

      // Server must also have unstable_batchedUpdates
      expect(serverFile).toContain('unstable_batchedUpdates');

      // Should appear in both REACT_DOM and REACT_DOM_CLIENT exports
      const reactDomMatch = serverFile.match(/REACT_DOM_EXPORT_NAMES = \[([\s\S]*?)\]/);
      const reactDomClientMatch = serverFile.match(/REACT_DOM_CLIENT_EXPORT_NAMES = \[([\s\S]*?)\]/);

      expect(reactDomMatch?.[1]).toContain('unstable_batchedUpdates');
      expect(reactDomClientMatch?.[1]).toContain('unstable_batchedUpdates');
    });

    it('all React 18 shims are present', () => {
      // Ensure we're not missing any critical React 18 features
      const react18Features = [
        'createRoot',
        'hydrateRoot',
        'useId',
        'useTransition',
        'useDeferredValue',
        'useSyncExternalStore',
        'useInsertionEffect',
        'startTransition',
      ];

      react18Features.forEach(feature => {
        const hasInReact = REACT_EXPORT_NAMES.includes(feature as any);
        const hasInReactDom = REACT_DOM_SHIM.includes(feature) || REACT_DOM_CLIENT_SHIM.includes(feature);

        expect(hasInReact || hasInReactDom).toBe(true);
      });
    });
  });
});
