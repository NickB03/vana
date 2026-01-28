/**
 * Package Whitelist Enforcement Tests
 *
 * These tests verify that the artifact system correctly rejects
 * packages that are not in the whitelist and provides clear,
 * helpful error messages guiding users to supported alternatives.
 *
 * Run with: npm run test -- whitelist
 */

import { describe, it, expect } from 'vitest';
import {
  isPackageWhitelisted,
  getWhitelistedPackages,
  validatePackageImports,
} from '../npmDetection';

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

  describe('axios rejection', () => {
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

  describe('d3 rejection', () => {
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

  describe('shadcn rejection', () => {
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

  describe('error message guidance', () => {
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

  describe('valid packages pass through', () => {
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

  describe('edge cases', () => {
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
  });

  describe('other disallowed packages with suggestions', () => {
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
