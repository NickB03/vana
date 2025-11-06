/**
 * Utilities for detecting and extracting npm package imports from code
 */

export interface NpmImport {
  package: string;
  version?: string;
}

/**
 * Detects if code contains npm package imports (excluding React core)
 * @param code - The code to analyze
 * @returns true if npm imports are found
 */
export function detectNpmImports(code: string): boolean {
  // Match: import X from 'package-name'
  // Exclude: react, react-dom, relative imports (./), absolute imports (/)
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"@./][^'"]*)['"]/g;
  
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const pkg = match[1];
    
    // Exclude React core packages (already available via CDN in iframe)
    if (pkg !== 'react' && pkg !== 'react-dom') {
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
  const importRegex = /import\s+.*?\s+from\s+['"]([^'"@./][^'"]*)['"]/g;
  
  let match;
  while ((match = importRegex.exec(code)) !== null) {
    const pkg = match[1];
    
    // Skip React core (Sandpack includes these by default)
    if (pkg === 'react' || pkg === 'react-dom') continue;
    
    // Skip if already added
    if (deps[pkg]) continue;
    
    // Map common packages to versions
    deps[pkg] = getPackageVersion(pkg);
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

