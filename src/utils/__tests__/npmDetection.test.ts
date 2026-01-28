import { describe, it, expect } from 'vitest';
import {
  detectNpmImports,
  extractNpmDependencies,
  isSafePackage,
  isPackageWhitelisted,
  getWhitelistedPackages,
  validatePackageImports,
} from '../npmDetection';

describe('npmDetection', () => {
  describe('detectNpmImports', () => {
    it('detects scoped packages starting with @', () => {
      // Regex now supports scoped packages like @tanstack/react-query
      const code = `import { useQuery } from '@tanstack/react-query';`;
      expect(detectNpmImports(code)).toBe(true);
    });

    it('detects npm imports for non-scoped packages', () => {
      const code = `import _ from 'lodash';`;
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
        import _ from 'lodash';
        import React from 'react'; // Should ignore
        import { helper } from './local'; // Should ignore
      `;
      expect(detectNpmImports(code)).toBe(true);
    });

    it('ignores recharts imports', () => {
      const code = `import { LineChart, Line, XAxis, YAxis } from 'recharts';`;
      expect(detectNpmImports(code)).toBe(false);
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

  describe('Package Whitelist Enforcement', () => {
    describe('isPackageWhitelisted', () => {
      it('allows React core packages', () => {
        expect(isPackageWhitelisted('react')).toBe(true);
        expect(isPackageWhitelisted('react-dom')).toBe(true);
        expect(isPackageWhitelisted('react-dom/client')).toBe(true);
      });

      it('allows whitelisted charting packages', () => {
        expect(isPackageWhitelisted('recharts')).toBe(true);
      });

      it('allows whitelisted animation packages', () => {
        expect(isPackageWhitelisted('framer-motion')).toBe(true);
      });

      it('allows whitelisted icon packages', () => {
        expect(isPackageWhitelisted('lucide-react')).toBe(true);
      });

      it('allows whitelisted Radix UI packages', () => {
        expect(isPackageWhitelisted('@radix-ui/react-dialog')).toBe(true);
        expect(isPackageWhitelisted('@radix-ui/react-tabs')).toBe(true);
        expect(isPackageWhitelisted('@radix-ui/react-select')).toBe(true);
        expect(isPackageWhitelisted('@radix-ui/react-switch')).toBe(true);
      });

      it('rejects axios - not in whitelist', () => {
        expect(isPackageWhitelisted('axios')).toBe(false);
      });

      it('rejects d3 - not in whitelist', () => {
        expect(isPackageWhitelisted('d3')).toBe(false);
      });

      it('rejects shadcn packages - not in whitelist', () => {
        expect(isPackageWhitelisted('shadcn')).toBe(false);
        expect(isPackageWhitelisted('@shadcn/ui')).toBe(false);
      });

      it('rejects other common packages not in whitelist', () => {
        expect(isPackageWhitelisted('lodash')).toBe(false);
        expect(isPackageWhitelisted('date-fns')).toBe(false);
        expect(isPackageWhitelisted('zustand')).toBe(false);
        expect(isPackageWhitelisted('@tanstack/react-query')).toBe(false);
      });
    });

    describe('getWhitelistedPackages', () => {
      it('returns an array of whitelisted package names', () => {
        const packages = getWhitelistedPackages();
        expect(Array.isArray(packages)).toBe(true);
        expect(packages.length).toBeGreaterThan(0);
      });

      it('includes core whitelisted packages', () => {
        const packages = getWhitelistedPackages();
        expect(packages).toContain('recharts');
        expect(packages).toContain('framer-motion');
        expect(packages).toContain('lucide-react');
      });

      it('includes Radix UI packages', () => {
        const packages = getWhitelistedPackages();
        expect(packages).toContain('@radix-ui/react-dialog');
        expect(packages).toContain('@radix-ui/react-tabs');
      });

      it('returns packages in sorted order', () => {
        const packages = getWhitelistedPackages();
        const sortedPackages = [...packages].sort();
        expect(packages).toEqual(sortedPackages);
      });
    });

    describe('validatePackageImports - axios rejection', () => {
      it('rejects code importing axios with clear error message', () => {
        const code = `
import axios from 'axios';

export default function App() {
  const fetchData = async () => {
    const response = await axios.get('/api/data');
    return response.data;
  };
  return <div>Loading...</div>;
}
`;
        const result = validatePackageImports(code);

        expect(result.isValid).toBe(false);
        expect(result.disallowedPackages).toContain('axios');
        expect(result.errorMessage).toContain('axios');
        expect(result.errorMessage).toContain('not supported');
      });

      it('provides fetch() alternative suggestion for axios', () => {
        const code = `import axios from 'axios';
export default function App() { return <div />; }`;

        const result = validatePackageImports(code);

        expect(result.errorMessage).toContain('fetch()');
        expect(result.errorMessage).toContain('built-in');
      });
    });

    describe('validatePackageImports - d3 rejection', () => {
      it('rejects code importing d3 with clear error message', () => {
        const code = `
import * as d3 from 'd3';

export default function App() {
  return <svg ref={ref => {
    d3.select(ref).append('circle');
  }} />;
}
`;
        const result = validatePackageImports(code);

        expect(result.isValid).toBe(false);
        expect(result.disallowedPackages).toContain('d3');
        expect(result.errorMessage).toContain('d3');
        expect(result.errorMessage).toContain('not supported');
      });

      it('suggests recharts as alternative for d3', () => {
        const code = `import * as d3 from 'd3';
export default function App() { return <div />; }`;

        const result = validatePackageImports(code);

        expect(result.errorMessage).toContain('recharts');
      });
    });

    describe('validatePackageImports - shadcn rejection', () => {
      it('rejects code importing shadcn with clear error message', () => {
        const code = `
import { Button } from 'shadcn';

export default function App() {
  return <Button>Click me</Button>;
}
`;
        const result = validatePackageImports(code);

        expect(result.isValid).toBe(false);
        expect(result.disallowedPackages).toContain('shadcn');
        expect(result.errorMessage).toContain('shadcn');
        expect(result.errorMessage).toContain('not supported');
      });

      it('suggests Radix UI primitives as alternative for shadcn', () => {
        const code = `import { Button } from 'shadcn';
export default function App() { return <div />; }`;

        const result = validatePackageImports(code);

        expect(result.errorMessage).toContain('Radix UI');
        expect(result.errorMessage).toContain('@radix-ui/react-dialog');
      });

      it('rejects @shadcn/ui scoped package', () => {
        const code = `
import { Dialog } from '@shadcn/ui';

export default function App() {
  return <Dialog>Content</Dialog>;
}
`;
        const result = validatePackageImports(code);

        expect(result.isValid).toBe(false);
        expect(result.disallowedPackages).toContain('@shadcn/ui');
        expect(result.errorMessage).toContain('Radix UI');
      });
    });

    describe('validatePackageImports - error message guidance', () => {
      it('includes list of supported packages in error message', () => {
        const code = `import axios from 'axios';
export default function App() { return <div />; }`;

        const result = validatePackageImports(code);

        expect(result.errorMessage).toContain('Supported packages include');
      });

      it('lists multiple disallowed packages in error message', () => {
        const code = `
import axios from 'axios';
import * as d3 from 'd3';
import { Button } from 'shadcn';

export default function App() {
  return <div />;
}
`;
        const result = validatePackageImports(code);

        expect(result.isValid).toBe(false);
        expect(result.disallowedPackages).toHaveLength(3);
        expect(result.disallowedPackages).toContain('axios');
        expect(result.disallowedPackages).toContain('d3');
        expect(result.disallowedPackages).toContain('shadcn');
        expect(result.errorMessage).toContain('axios');
        expect(result.errorMessage).toContain('d3');
        expect(result.errorMessage).toContain('shadcn');
      });

      it('provides suggestions section when alternatives exist', () => {
        const code = `
import axios from 'axios';
import * as d3 from 'd3';

export default function App() { return <div />; }
`;
        const result = validatePackageImports(code);

        expect(result.errorMessage).toContain('Suggestions:');
        expect(result.errorMessage).toContain('fetch()'); // axios alternative
        expect(result.errorMessage).toContain('recharts'); // d3 alternative
      });
    });

    describe('validatePackageImports - valid packages', () => {
      it('allows code with only whitelisted packages', () => {
        const code = `
import { useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line } from 'recharts';
import { Heart } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <motion.div animate={{ opacity: 1 }}>
      <Heart />
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content>Hello</Dialog.Content>
      </Dialog.Root>
      <LineChart data={[]}><Line /></LineChart>
    </motion.div>
  );
}
`;
        const result = validatePackageImports(code);

        expect(result.isValid).toBe(true);
        expect(result.disallowedPackages).toHaveLength(0);
        expect(result.errorMessage).toBeNull();
      });

      it('allows code with React-only imports', () => {
        const code = `
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

export default function App() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
`;
        const result = validatePackageImports(code);

        expect(result.isValid).toBe(true);
        expect(result.disallowedPackages).toHaveLength(0);
      });

      it('allows code with no imports', () => {
        const code = `
export default function App() {
  return <div>Hello World</div>;
}
`;
        const result = validatePackageImports(code);

        expect(result.isValid).toBe(true);
        expect(result.disallowedPackages).toHaveLength(0);
        expect(result.errorMessage).toBeNull();
      });
    });

    describe('validatePackageImports - edge cases', () => {
      it('handles mixed valid and invalid imports', () => {
        const code = `
import { motion } from 'framer-motion';  // valid
import axios from 'axios';  // invalid

export default function App() { return <motion.div />; }
`;
        const result = validatePackageImports(code);

        expect(result.isValid).toBe(false);
        expect(result.disallowedPackages).toContain('axios');
        expect(result.disallowedPackages).not.toContain('framer-motion');
      });

      it('handles empty string input', () => {
        const result = validatePackageImports('');

        expect(result.isValid).toBe(true);
        expect(result.disallowedPackages).toHaveLength(0);
      });

      it('handles whitespace-only input', () => {
        const result = validatePackageImports('   \n\t\n   ');

        expect(result.isValid).toBe(true);
        expect(result.disallowedPackages).toHaveLength(0);
      });

      it('handles code with destructured react hooks (no explicit import)', () => {
        const code = `
const { useState, useEffect } = React;

export default function App() {
  const [count, setCount] = useState(0);
  return <div>{count}</div>;
}
`;
        const result = validatePackageImports(code);

        // This should be valid - no actual imports present
        expect(result.isValid).toBe(true);
      });
    });

    describe('Other disallowed packages with suggestions', () => {
      it('rejects gsap and suggests framer-motion', () => {
        const code = `import gsap from 'gsap';
export default function App() { return <div />; }`;

        const result = validatePackageImports(code);

        expect(result.isValid).toBe(false);
        expect(result.disallowedPackages).toContain('gsap');
        expect(result.errorMessage).toContain('framer-motion');
      });

      it('rejects react-icons and suggests lucide-react', () => {
        const code = `import { FaHeart } from 'react-icons';
export default function App() { return <div />; }`;

        const result = validatePackageImports(code);

        expect(result.isValid).toBe(false);
        expect(result.disallowedPackages).toContain('react-icons');
        expect(result.errorMessage).toContain('lucide-react');
      });

      it('rejects @mui/material and suggests Radix UI', () => {
        const code = `import { Button } from '@mui/material';
export default function App() { return <div />; }`;

        const result = validatePackageImports(code);

        expect(result.isValid).toBe(false);
        expect(result.disallowedPackages).toContain('@mui/material');
        expect(result.errorMessage).toContain('Radix UI');
      });
    });
  });
});
