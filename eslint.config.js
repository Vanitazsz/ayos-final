import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/node_modules/**", "backend/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  { rules: { "no-undef": "off" } }
);
