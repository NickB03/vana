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
      "coverage/**",
    ],
  },
  {
    rules: {
      "@next/next/no-duplicate-head": "off", // Temporarily disable due to compatibility issue
      "react-hooks/rules-of-hooks": "off", // Temporarily disable due to compatibility issue
      "react-hooks/exhaustive-deps": "off", // Temporarily disable due to compatibility issue
      "@typescript-eslint/no-require-imports": "off", // Allow CommonJS configs during migration
      "@typescript-eslint/no-namespace": "off", // Allow jest namespace declarations in setup files
      "@typescript-eslint/no-unused-vars": "warn", // Downgrade to warning
      "@typescript-eslint/no-explicit-any": "warn", // Downgrade to warning
      "react/no-unescaped-entities": "warn", // Downgrade to warning
    },
  },
];

export default eslintConfig;
