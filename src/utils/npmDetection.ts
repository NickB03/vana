/**
 * Utilities for detecting and extracting npm package imports from code
 */

export interface NpmImport {
  package: string;
  version?: string;
}

const RUNTIME_ALLOWLIST = new Set([
  "lucide-react",
  "framer-motion",
  "recharts",
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-popover",
  "@radix-ui/react-tabs",
  "@radix-ui/react-select",
  "@radix-ui/react-slider",
  "@radix-ui/react-switch",
  "@radix-ui/react-tooltip",
]);

const REACT_CORE_PACKAGES = new Set([
  "react",
  "react-dom",
  "react-dom/client",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
]);

/**
 * Detects if code contains npm package imports (excluding React core)
 * @param code - The code to analyze
 * @returns true if npm imports are found
 */
export function detectNpmImports(code: string): boolean {
  // Quick early-exit: if code doesn't contain import patterns, skip regex
  if (!code.includes('import ') && !code.includes(' from ')) {
    return false;
  }

  // Match: import X from 'package-name' OR import X from '@scope/package-name'
  // Supports: scoped packages (@radix-ui/react-dialog), multiline imports, sub-paths
  // Excludes: react, react-dom, relative imports (./), absolute imports (/)
  const importRegex = /import\s+[\s\S]*?\s+from\s+['"]((?:@[a-z0-9-]+\/)?[a-z0-9-]+(?:\/[a-z0-9-]+)*)['"]/gi;

  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const pkg = match[1];

    // Exclude React core packages (already available via CDN in iframe)
    if (REACT_CORE_PACKAGES.has(pkg) || RUNTIME_ALLOWLIST.has(pkg)) {
      continue;
    }

    return true;
  }

  // Also detect malformed imports from GLM (e.g., "const * as Select from '@radix-ui/...'")
  // These are invalid JS but indicate the artifact needs Radix UI server bundling
  const malformedImportRegex = /const\s*\*\s*as\s+\w+\s+from\s+['"]((?:@[a-z0-9-]+\/)?[a-z0-9-]+)['"]/gi;
  let malformedMatch;
  while ((malformedMatch = malformedImportRegex.exec(code)) !== null) {
    const pkg = malformedMatch[1];
    if (!REACT_CORE_PACKAGES.has(pkg) && !RUNTIME_ALLOWLIST.has(pkg)) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts npm dependencies from code with version mapping
 * @param code - The code to analyze
 * @returns Object mapping package names to versions
 */
export function extractNpmDependencies(code: string): Record<string, string> {
  const deps: Record<string, string> = {};
  // Match: import X from 'package-name' OR import X from '@scope/package-name'
  // Supports: scoped packages (@radix-ui/react-dialog), multiline imports, sub-paths
  const importRegex = /import\s+[\s\S]*?\s+from\s+['"]((?:@[a-z0-9-]+\/)?[a-z0-9-]+(?:\/[a-z0-9-]+)*)['"]/gi;

  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const pkg = match[1];

    // Skip React core (Sandpack includes these by default)
    if (REACT_CORE_PACKAGES.has(pkg)) continue;

    // Skip if already added
    if (deps[pkg]) continue;

    // Map common packages to versions
    deps[pkg] = getPackageVersion(pkg);
  }

  // Also extract from malformed imports (e.g., "const * as Select from '@radix-ui/...'")
  const malformedImportRegex = /const\s*\*\s*as\s+\w+\s+from\s+['"]((?:@[a-z0-9-]+\/)?[a-z0-9-]+)['"]/gi;
  let malformedMatch;
  while ((malformedMatch = malformedImportRegex.exec(code)) !== null) {
    const pkg = malformedMatch[1];
    if (REACT_CORE_PACKAGES.has(pkg)) continue;
    if (!deps[pkg]) {
      deps[pkg] = getPackageVersion(pkg);
    }
  }

  // Detect Radix UI usage patterns and add corresponding packages
  const radixComponentMap: Record<string, string> = {
    'Select': '@radix-ui/react-select',
    'Dialog': '@radix-ui/react-dialog',
    'DropdownMenu': '@radix-ui/react-dropdown-menu',
    'Popover': '@radix-ui/react-popover',
    'Tabs': '@radix-ui/react-tabs',
    'Slider': '@radix-ui/react-slider',
    'Switch': '@radix-ui/react-switch',
    'Tooltip': '@radix-ui/react-tooltip',
  };

  for (const [component, pkg] of Object.entries(radixComponentMap)) {
    // Check for usage patterns like Select.Root, Dialog.Content, etc.
    const usagePattern = new RegExp(`\\b${component}\\.(Root|Trigger|Content|Portal|Viewport|Item|Value|Icon|ItemText|Close|Overlay|Title|Description)\\b`);
    if (usagePattern.test(code) && !deps[pkg]) {
      deps[pkg] = getPackageVersion(pkg);
    }
  }

  return deps;
}

/**
 * Maps package names to known stable versions
 * @param pkg - Package name
 * @returns Version string
 */
function getPackageVersion(pkg: string): string {
  // Common package versions (expand as needed)
  const versionMap: Record<string, string> = {
    // Charts & Visualization
    'recharts': '^2.10.0',
    'd3': '^7.8.5',
    'chart.js': '^4.4.0',
    'react-chartjs-2': '^5.2.0',
    
    // Animation
    'framer-motion': '^11.0.0',
    'gsap': '^3.12.0',
    
    // Icons
    'lucide-react': '^0.344.0',
    'react-icons': '^5.0.0',
    
    // Utilities
    'lodash': '^4.17.21',
    'date-fns': '^3.0.0',
    'axios': '^1.6.0',
    'clsx': '^2.1.0',
    
    // State Management
    'zustand': '^4.5.0',
    'jotai': '^2.6.0',
    
    // UI Libraries
    '@radix-ui/react-dialog': '^1.0.5',
    '@radix-ui/react-dropdown-menu': '^2.0.6',
    '@radix-ui/react-select': '^2.0.0',
    
    // Forms
    'react-hook-form': '^7.49.0',
    'zod': '^3.22.0',
    
    // 3D
    'three': '^0.160.0',
    '@react-three/fiber': '^8.15.0',
  };
  
  return versionMap[pkg] || 'latest';
}

/**
 * Validates if a package name is safe to install
 * @param pkg - Package name
 * @returns true if package is in allowlist or follows safe naming
 */
export function isSafePackage(pkg: string): boolean {
  // Block known malicious patterns
  const blocklist = ['eval', 'exec', 'child_process', 'fs', 'net', 'http'];
  
  if (blocklist.some(blocked => pkg.includes(blocked))) {
    return false;
  }
  
  // Allow scoped packages (@org/package)
  if (pkg.startsWith('@')) {
    return /^@[a-z0-9-]+\/[a-z0-9-]+$/.test(pkg);
  }
  
  // Allow standard package names
  return /^[a-z0-9-]+$/.test(pkg);
}
