import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import vitest from "@vitest/eslint-plugin";

export default defineConfig([
  {
    files: ["**/*.ts"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ["**/*.test.ts"],
    extends: [vitest.configs.all],
  },
  globalIgnores(["tsdown.config.ts"]),
]);
