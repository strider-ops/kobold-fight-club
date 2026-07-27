import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/data': 'http://localhost:8084',
      '/vendor': 'http://localhost:8084',
    }
  },
  build: {
    outDir: 'dist-vue',
    sourcemap: true
  }
});
