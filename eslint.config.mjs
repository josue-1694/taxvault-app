import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // useCallback-wrapped async loaders that call setState are a valid pattern
      "react-hooks/set-state-in-effect": "off",
      // Unused vars: warn only, don't block build
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
]);

export default eslintConfig;
