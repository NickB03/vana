/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  {
    ignores: [
      "src/__tests__/**/*",
      "**/*.test.ts",
      "**/*.test.tsx", 
      "**/*.spec.ts",
      "**/*.spec.tsx",
      "playwright/**/*",
      "coverage/**/*",
      ".next/**/*",
      "node_modules/**/*"
    ]
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module"
    },
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "error",
      "prefer-const": "warn"
    }
  }
];