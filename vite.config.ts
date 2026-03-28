import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import path from 'path';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for GitHub Pages deployment
  base: '/WebCrosswordGenerator/',
  resolve: {
    alias: {
      '@': path.resolve(currentDir, './src'),
      '@logic': path.resolve(currentDir, './src/logic'),
      '@components': path.resolve(currentDir, './src/components'),
    },
  },
  // Ensure all processing stays client-side
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
