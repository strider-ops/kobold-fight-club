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
  publicDir: 'public',  // Serve static assets via symlinks in public/
  server: {
    port: 8080,
    fs: {
      allow: ['../..'],  // Allow Vite to access files outside app/vue/
    },
    // Cache-busting headers for development (prevents Safari caching issues)
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
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
