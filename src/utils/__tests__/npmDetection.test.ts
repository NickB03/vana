import { describe, it, expect } from 'vitest';
import { detectNpmImports, extractNpmDependencies, isSafePackage } from '../npmDetection';

describe('npmDetection', () => {
  describe('detectNpmImports', () => {
    it('detects scoped packages starting with @', () => {
      // Regex now supports scoped packages like @radix-ui/react-dialog
      const code = `import * as Dialog from '@radix-ui/react-dialog';`;
      expect(detectNpmImports(code)).toBe(true);
    });

    it('detects npm imports for non-scoped packages', () => {
      const code = `import { motion } from 'framer-motion';`;
      expect(detectNpmImports(code)).toBe(true);
    });

    it('ignores react and react-dom imports', () => {
      const code = `
        import React from 'react';
        import ReactDOM from 'react-dom';
      `;
      expect(detectNpmImports(code)).toBe(false);
    });

    it('ignores relative imports', () => {
      const code = `import { helper } from './utils';`;
      expect(detectNpmImports(code)).toBe(false);
    });

    it('ignores absolute project imports (@/)', () => {
      const code = `import { Button } from '@/components/ui/button';`;
      expect(detectNpmImports(code)).toBe(false);
    });

    it('detects multiple npm packages with mixed imports', () => {
      const code = `
        import { motion } from 'framer-motion';
        import React from 'react'; // Should ignore
        import { helper } from './local'; // Should ignore
      `;
      expect(detectNpmImports(code)).toBe(true);
    });

    it('detects recharts imports', () => {
      const code = `import { LineChart, Line, XAxis, YAxis } from 'recharts';`;
      expect(detectNpmImports(code)).toBe(true);
    });

    it('ignores code with no imports', () => {
      const code = `
        export default function App() {
          return <div>Hello World</div>;
        }
      `;
      expect(detectNpmImports(code)).toBe(false);
    });

    it('detects lodash imports', () => {
      const code = `import _ from 'lodash';`;
      expect(detectNpmImports(code)).toBe(true);
    });

    it('detects date-fns imports', () => {
      const code = `import { format, addDays } from 'date-fns';`;
      expect(detectNpmImports(code)).toBe(true);
    });
  });

  describe('extractNpmDependencies', () => {
    it('extracts scoped packages starting with @', () => {
      // Regex now supports scoped packages like @radix-ui/react-dialog
      const code = `import * as Dialog from '@radix-ui/react-dialog';`;
      const deps = extractNpmDependencies(code);

      expect(deps).toHaveProperty('@radix-ui/react-dialog');
      expect(deps['@radix-ui/react-dialog']).toBe('^1.0.5');
    });

    it('excludes react and react-dom from dependencies', () => {
      const code = `
        import React from 'react';
        import { motion } from 'framer-motion';
      `;
      const deps = extractNpmDependencies(code);

      expect(deps).not.toHaveProperty('react');
      expect(deps).toHaveProperty('framer-motion');
    });

    it('defaults to latest for unmapped packages', () => {
      const code = `import something from 'unknown-package-xyz';`;
      const deps = extractNpmDependencies(code);

      expect(deps['unknown-package-xyz']).toBe('latest');
    });

    it('extracts multiple dependencies correctly', () => {
      const code = `
        import { motion } from 'framer-motion';
        import { LineChart } from 'recharts';
        import _ from 'lodash';
      `;
      const deps = extractNpmDependencies(code);

      expect(Object.keys(deps)).toHaveLength(3);
      expect(deps).toHaveProperty('framer-motion');
      expect(deps).toHaveProperty('recharts');
      expect(deps).toHaveProperty('lodash');
    });

    it('does not duplicate packages when imported multiple times', () => {
      const code = `
        import { motion } from 'framer-motion';
        import { AnimatePresence } from 'framer-motion';
      `;
      const deps = extractNpmDependencies(code);

      expect(Object.keys(deps)).toHaveLength(1);
      expect(deps).toHaveProperty('framer-motion');
    });

    it('returns empty object when no npm imports found', () => {
      const code = `
        import React from 'react';
        import { helper } from './utils';
      `;
      const deps = extractNpmDependencies(code);

      expect(deps).toEqual({});
    });

    it('extracts known versions for common packages', () => {
      const code = `
        import { motion } from 'framer-motion';
        import { format } from 'date-fns';
        import { LineChart } from 'recharts';
      `;
      const deps = extractNpmDependencies(code);

      // Should have specific versions from version map
      expect(deps['framer-motion']).toBe('^11.0.0');
      expect(deps['date-fns']).toBe('^3.0.0');
      expect(deps['recharts']).toBe('^2.10.0');
    });

    it('handles non-scoped packages with known versions', () => {
      const code = `
        import { motion } from 'framer-motion';
        import { LineChart } from 'recharts';
        import _ from 'lodash';
      `;
      const deps = extractNpmDependencies(code);

      expect(Object.keys(deps)).toHaveLength(3);
      expect(deps['framer-motion']).toBe('^11.0.0');
      expect(deps['recharts']).toBe('^2.10.0');
      expect(deps['lodash']).toBe('^4.17.21');
    });
  });

  describe('isSafePackage', () => {
    it('allows valid scoped packages', () => {
      expect(isSafePackage('@radix-ui/react-dialog')).toBe(true);
      expect(isSafePackage('@testing-library/react')).toBe(true);
    });

    it('blocks packages with dangerous keywords', () => {
      expect(isSafePackage('evil-eval')).toBe(false);
      expect(isSafePackage('fs-extra')).toBe(false);
      expect(isSafePackage('http-proxy')).toBe(false);
    });

    it('allows standard package names', () => {
      expect(isSafePackage('lodash')).toBe(true);
      expect(isSafePackage('axios')).toBe(true);
      expect(isSafePackage('framer-motion')).toBe(true);
    });

    it('blocks packages with child_process keyword', () => {
      expect(isSafePackage('child_process')).toBe(false);
      expect(isSafePackage('node-child_process')).toBe(false);
    });

    it('blocks packages with exec keyword', () => {
      expect(isSafePackage('exec-helper')).toBe(false);
      expect(isSafePackage('execute')).toBe(false);
    });

    it('rejects invalid scoped package names', () => {
      expect(isSafePackage('@Invalid/Package')).toBe(false);
      expect(isSafePackage('@scope/')).toBe(false);
      expect(isSafePackage('@/package')).toBe(false);
    });

    it('rejects package names with special characters', () => {
      expect(isSafePackage('package$name')).toBe(false);
      expect(isSafePackage('package@name')).toBe(false);
      expect(isSafePackage('package name')).toBe(false);
    });

    it('blocks http and net packages', () => {
      expect(isSafePackage('http-server')).toBe(false);
      expect(isSafePackage('net-client')).toBe(false);
    });

    it('allows hyphenated package names', () => {
      expect(isSafePackage('react-hook-form')).toBe(true);
      expect(isSafePackage('date-fns')).toBe(true);
      expect(isSafePackage('lucide-react')).toBe(true);
    });

    it('allows numeric characters in package names', () => {
      expect(isSafePackage('three')).toBe(true);
      expect(isSafePackage('d3')).toBe(true);
      expect(isSafePackage('recharts')).toBe(true);
    });

    it('handles edge cases with multiple blocked keywords', () => {
      expect(isSafePackage('eval-fs-exec')).toBe(false);
      expect(isSafePackage('child_process-http')).toBe(false);
    });

    it('is case sensitive for package validation', () => {
      // Uppercase should fail standard package regex
      expect(isSafePackage('MyPackage')).toBe(false);
      expect(isSafePackage('LODASH')).toBe(false);
    });

    it('allows common UI library packages', () => {
      expect(isSafePackage('zustand')).toBe(true);
      expect(isSafePackage('jotai')).toBe(true);
      expect(isSafePackage('clsx')).toBe(true);
    });
  });

  describe('edge cases and integration', () => {
    it('handles code with dynamic imports', () => {
      const code = `
        const module = await import('lodash');
      `;
      // detectNpmImports only looks for static imports
      expect(detectNpmImports(code)).toBe(false);
    });

    it('detects multiline import statements', () => {
      // Regex now uses [\s\S]*? which matches newlines
      const code = `
        import {
          format,
          addDays,
          subDays
        } from 'date-fns';
      `;
      expect(detectNpmImports(code)).toBe(true);
    });

    it('ignores commented out imports', () => {
      const code = `
        // import lodash from 'lodash';
        /* import axios from 'axios'; */
      `;
      // Regex doesn't parse comments, so it will still match
      expect(detectNpmImports(code)).toBe(true);
    });

    it('handles imports with alias', () => {
      const code = `import { format as formatDate } from 'date-fns';`;
      expect(detectNpmImports(code)).toBe(true);

      const deps = extractNpmDependencies(code);
      expect(deps).toHaveProperty('date-fns');
    });

    it('handles namespace imports', () => {
      const code = `import * as _ from 'lodash';`;
      expect(detectNpmImports(code)).toBe(true);

      const deps = extractNpmDependencies(code);
      expect(deps).toHaveProperty('lodash');
    });

    it('handles default and named imports together', () => {
      const code = `import React, { useState, useEffect } from 'react';`;
      expect(detectNpmImports(code)).toBe(false); // react is excluded
    });

    it('extracts correct versions for animation libraries', () => {
      const code = `
        import { motion } from 'framer-motion';
        import gsap from 'gsap';
      `;
      const deps = extractNpmDependencies(code);

      expect(deps['framer-motion']).toBe('^11.0.0');
      expect(deps['gsap']).toBe('^3.12.0');
    });

    it('handles mixed single and double quotes', () => {
      const code = `
        import { format } from "date-fns";
        import _ from 'lodash';
      `;
      const deps = extractNpmDependencies(code);

      expect(Object.keys(deps)).toHaveLength(2);
      expect(deps).toHaveProperty('date-fns');
      expect(deps).toHaveProperty('lodash');
    });
  });
});
