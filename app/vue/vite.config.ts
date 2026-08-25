import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '@lib': path.resolve(__dirname, '../lib'),
    }
  },
  root: './',
  publicDir: false,
  server: {
    port: 5173,
    proxy: {
      '/data': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/vendor': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    }
  },
  build: {
    outDir: '../../dist-vue',
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('vue')) {
              return 'vue-vendor';
            }
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
});
