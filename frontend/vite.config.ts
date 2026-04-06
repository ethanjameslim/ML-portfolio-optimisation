import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  publicDir: path.resolve(__dirname, '../data'),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          data: ['papaparse'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
  },
});
