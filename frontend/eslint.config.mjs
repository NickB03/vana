import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  
  // Base configuration for all files
  {
    rules: {
      // TypeScript Rules - Allow controlled use of 'any' for legitimate cases
      "@typescript-eslint/no-explicit-any": ["warn", {
        "ignoreRestArgs": true,
        "fixToUnknown": false
      }],
      
      // Unused Variables - More intelligent handling
      "@typescript-eslint/no-unused-vars": ["warn", {
        "vars": "all",
        "args": "after-used",
        "ignoreRestSiblings": true,
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrors": "none",
        "destructuredArrayIgnorePattern": "^_"
      }],
      
      // Prefer const - Allow let when variable is reassigned
      "prefer-const": ["error", {
        "destructuring": "any",
        "ignoreReadBeforeAssign": false
      }],
      
      // Import Rules - Allow anonymous default exports for utility modules
      "import/no-anonymous-default-export": ["warn", {
        "allowObject": true,
        "allowArrowFunction": false,
        "allowAnonymousClass": false,
        "allowAnonymousFunction": false,
        "allowArray": true,
        "allowCallExpression": true,
        "allowNew": false
      }],
      
      // Next.js Rules - Allow img elements in specific contexts
      "@next/next/no-img-element": "warn",
      
      // React Rules - Relax for enterprise patterns
      "react/display-name": "off",
      "react/jsx-key": ["warn", {
        "checkFragmentShorthand": true,
        "checkKeyMustBeforeSpread": true
      }],
      
      // General Rules - Enterprise-friendly settings
      "no-console": ["warn", { 
        "allow": ["warn", "error", "info", "log"] 
      }],
      "no-unused-expressions": ["error", {
        "allowShortCircuit": true,
        "allowTernary": true,
        "allowTaggedTemplates": true
      }],
      
      // Allow necessary patterns for complex applications
      "no-empty": ["error", { 
        "allowEmptyCatch": true 
      }],
      "no-prototype-builtins": "off",
      "no-case-declarations": "off"
    }
  },
  
  // API and SSE service files - Allow more 'any' usage
  {
    files: ["**/lib/api-client.ts", "**/lib/research-sse-service.ts", "**/lib/progressive-enhancement.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        "args": "none",
        "ignoreRestSiblings": true
      }]
    }
  },
  
  // Component files - Relaxed unused vars for props and destructuring
  {
    files: ["**/components/**/*.tsx", "**/components/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", {
        "vars": "all",
        "args": "none",
        "ignoreRestSiblings": true,
        "varsIgnorePattern": "^_|^React$"
      }],
      "@next/next/no-img-element": "warn"
    }
  },
  
  // Canvas and complex UI components - Allow 'any' for dynamic content
  {
    files: ["**/components/canvas/**/*.tsx", "**/components/research/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": ["warn", {
        "ignoreRestArgs": true
      }]
    }
  },
  
  // Auth components - Allow img elements for avatars
  {
    files: ["**/components/auth/**/*.tsx"],
    rules: {
      "@next/next/no-img-element": "off"
    }
  },
  
  // Utility and configuration files
  {
    files: ["**/lib/**/*.ts", "**/utils/**/*.ts", "**/*.config.*"],
    rules: {
      "import/no-anonymous-default-export": "off",
      "@typescript-eslint/no-explicit-any": "warn"
    }
  },
  
  // Type definition files
  {
    files: ["**/*.d.ts", "**/types/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off"
    }
  },
  
  // Test files - Most relaxed rules
  {
    files: ["**/__tests__/**/*", "**/*.test.*", "**/*.spec.*"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-console": "off",
      "import/no-anonymous-default-export": "off"
    }
  }
];

export default eslintConfig;
