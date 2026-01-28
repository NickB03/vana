/**
 * Utilities for detecting and extracting npm package imports from code
 */

export interface NpmImport {
  package: string;
  version?: string;
}

// Packages available client-side via UMD + import map - don't need server bundling
// Keep in sync with REACT_IMPORT_MAP in ArtifactRenderer.tsx
const RUNTIME_ALLOWLIST = new Set([
  // Charts and animations
  "lucide-react",
  "framer-motion",
  "recharts",
  // Radix UI primitives (available via esm.sh import map)
  "@radix-ui/react-dialog",
  "@radix-ui/react-dropdown-menu",
  "@radix-ui/react-popover",
  "@radix-ui/react-tabs",
  "@radix-ui/react-select",
  "@radix-ui/react-slider",
  "@radix-ui/react-switch",
  "@radix-ui/react-tooltip",
  "@radix-ui/react-accordion",
  "@radix-ui/react-checkbox",
  "@radix-ui/react-radio-group",
  "@radix-ui/react-scroll-area",
  "@radix-ui/react-avatar",
  "@radix-ui/react-progress",
  "@radix-ui/react-separator",
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
    
    // UI Libraries - Radix UI
    '@radix-ui/react-dialog': '^1.0.5',
    '@radix-ui/react-dropdown-menu': '^2.0.6',
    '@radix-ui/react-popover': '^1.0.7',
    '@radix-ui/react-tabs': '^1.0.4',
    '@radix-ui/react-select': '^2.0.0',
    '@radix-ui/react-slider': '^1.1.2',
    '@radix-ui/react-switch': '^1.0.3',
    '@radix-ui/react-tooltip': '^1.0.7',
    '@radix-ui/react-accordion': '^1.1.2',
    '@radix-ui/react-checkbox': '^1.0.4',
    '@radix-ui/react-radio-group': '^1.1.3',
    '@radix-ui/react-scroll-area': '^1.0.5',
    '@radix-ui/react-avatar': '^1.0.4',
    '@radix-ui/react-progress': '^1.0.3',
    '@radix-ui/react-separator': '^1.0.3',
    
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

/**
 * Checks if a package is in the whitelist for artifact rendering.
 * Whitelisted packages can be used in artifacts without causing errors.
 * @param pkg - Package name to check
 * @returns true if the package is whitelisted
 */
export function isPackageWhitelisted(pkg: string): boolean {
  // React core packages are always allowed
  if (REACT_CORE_PACKAGES.has(pkg)) {
    return true;
  }

  // Runtime allowlist packages are available via CDN
  if (RUNTIME_ALLOWLIST.has(pkg)) {
    return true;
  }

  return false;
}

/**
 * Gets the list of whitelisted packages for display to users
 * @returns Array of whitelisted package names (excluding React core)
 */
export function getWhitelistedPackages(): string[] {
  return Array.from(RUNTIME_ALLOWLIST).sort();
}

/**
 * Result of package validation
 */
export interface PackageValidationResult {
  isValid: boolean;
  disallowedPackages: string[];
  errorMessage: string | null;
}

/**
 * Validates all package imports in code against the whitelist.
 * Returns detailed information about any disallowed packages.
 * @param code - The code to validate
 * @returns Validation result with error messages
 */
export function validatePackageImports(code: string): PackageValidationResult {
  const deps = extractNpmDependencies(code);
  const disallowed: string[] = [];

  for (const pkg of Object.keys(deps)) {
    if (!isPackageWhitelisted(pkg)) {
      disallowed.push(pkg);
    }
  }

  if (disallowed.length === 0) {
    return {
      isValid: true,
      disallowedPackages: [],
      errorMessage: null,
    };
  }

  // Generate helpful error message
  const whitelisted = getWhitelistedPackages();
  const packageList = disallowed.map(p => `"${p}"`).join(', ');
  const suggestedAlternatives = getSuggestedAlternatives(disallowed);

  let errorMessage = `The following packages are not supported in artifacts: ${packageList}.\n\n`;
  errorMessage += `Supported packages include: ${whitelisted.slice(0, 5).join(', ')}${whitelisted.length > 5 ? ', and more' : ''}.\n\n`;

  if (suggestedAlternatives.length > 0) {
    errorMessage += `Suggestions:\n${suggestedAlternatives.join('\n')}`;
  }

  return {
    isValid: false,
    disallowedPackages: disallowed,
    errorMessage,
  };
}

/**
 * Gets suggested alternatives for disallowed packages
 */
function getSuggestedAlternatives(disallowedPackages: string[]): string[] {
  const suggestions: string[] = [];

  const alternativeMap: Record<string, string> = {
    // HTTP clients - not needed in browser artifacts
    'axios': '- Instead of "axios", use the browser\'s built-in fetch() API',
    'node-fetch': '- Instead of "node-fetch", use the browser\'s built-in fetch() API',
    'got': '- Instead of "got", use the browser\'s built-in fetch() API',

    // Complex charting - use recharts instead
    'd3': '- Instead of "d3", use "recharts" for charts and data visualization',
    'chart.js': '- Instead of "chart.js", use "recharts" for charts',
    'victory': '- Instead of "victory", use "recharts" for charts',
    'nivo': '- Instead of "nivo", use "recharts" for charts',

    // shadcn/ui - use Radix UI primitives directly
    '@shadcn/ui': '- Instead of "@shadcn/ui", use Radix UI primitives directly (@radix-ui/react-dialog, etc.)',
    'shadcn': '- shadcn/ui components are not available. Use Radix UI primitives directly (@radix-ui/react-dialog, @radix-ui/react-tabs, etc.)',

    // Other UI libraries
    'antd': '- Instead of "antd", use Radix UI primitives with Tailwind CSS',
    'material-ui': '- Instead of "material-ui", use Radix UI primitives with Tailwind CSS',
    '@mui/material': '- Instead of "@mui/material", use Radix UI primitives with Tailwind CSS',
    'chakra-ui': '- Instead of "chakra-ui", use Radix UI primitives with Tailwind CSS',

    // Animation alternatives
    'gsap': '- Instead of "gsap", use "framer-motion" for animations',
    'anime.js': '- Instead of "anime.js", use "framer-motion" for animations',

    // Icons
    'react-icons': '- Instead of "react-icons", use "lucide-react" for icons',
    '@heroicons/react': '- Instead of "@heroicons/react", use "lucide-react" for icons',
    'fontawesome': '- Instead of "fontawesome", use "lucide-react" for icons',
  };

  for (const pkg of disallowedPackages) {
    if (alternativeMap[pkg]) {
      suggestions.push(alternativeMap[pkg]);
    }
  }

  return suggestions;
}
