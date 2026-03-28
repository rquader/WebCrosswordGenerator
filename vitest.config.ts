import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(currentDir, './src'),
      '@logic': path.resolve(currentDir, './src/logic'),
      '@components': path.resolve(currentDir, './src/components'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
