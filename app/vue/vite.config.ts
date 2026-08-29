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
  root: __dirname,  // Points to app/vue/ - Vue files resolve correctly
  publicDir: false,  // Don't copy public dir - we serve from project root in dev mode
  server: {
    port: 5173,
    fs: {
      allow: ['../..'],  // Allow Vite to access files outside app/vue/
    },
    // Removed proxy - we serve static assets directly from project root
  },
  build: {
    outDir: path.resolve(__dirname, '../../dist-vue'),
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
