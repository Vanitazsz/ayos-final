import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "backend/**", "packages/client/src/database.types.ts"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { "no-undef": "off" } }
);
