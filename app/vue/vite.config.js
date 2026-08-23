import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@lib': path.resolve(__dirname, '../lib'),
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/data': 'http://localhost:8084',
      '/vendor': 'http://localhost:8084',
    }
  },
  build: {
    outDir: '../../dist-vue',
    sourcemap: true
  },
  test: {
    globals: true,
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  }
});
