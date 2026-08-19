import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/services/**/*.test.ts', 'src/utils/**/*.test.ts', 'src/lib/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.expo/**'],
  },
});
