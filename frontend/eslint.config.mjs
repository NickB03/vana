import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tailwindcss from "eslint-plugin-tailwindcss";

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
    plugins: {
      tailwindcss,
    },
    rules: {
      "@next/next/no-duplicate-head": "off", // Temporarily disable due to compatibility issue
      "react-hooks/rules-of-hooks": "off", // Temporarily disable due to compatibility issue
      "react-hooks/exhaustive-deps": "off", // Temporarily disable due to compatibility issue
      "@typescript-eslint/no-require-imports": "off", // Allow CommonJS configs during migration
      "@typescript-eslint/no-namespace": "off", // Allow jest namespace declarations in setup files
      "@typescript-eslint/no-unused-vars": "warn", // Downgrade to warning
      "@typescript-eslint/no-explicit-any": "warn", // Downgrade to warning
      "react/no-unescaped-entities": "warn", // Downgrade to warning

      // Theme System Guard Rails - Prevent hardcoded color violations
      "tailwindcss/no-custom-classname": [
        "warn",
        {
          whitelist: [
            // Allow semantic theme colors
            "bg-success", "text-success", "border-success", "text-success-foreground",
            "bg-warning", "text-warning", "border-warning", "text-warning-foreground",
            "bg-info", "text-info", "border-info", "text-info-foreground",
            "bg-status-active", "text-status-active-foreground",
            "bg-status-waiting", "text-status-waiting-foreground",
            "bg-status-completed", "text-status-completed-foreground",
            "bg-status-error", "text-status-error-foreground",
          ],
        },
      ],
      // Enforce classnames-order for consistent styling
      "tailwindcss/classnames-order": "warn",
      // Prevent contradicting classnames (e.g., "p-4 p-2")
      "tailwindcss/no-contradicting-classname": "error",
    },
  },
];

export default eslintConfig;
