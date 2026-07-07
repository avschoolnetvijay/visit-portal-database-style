import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3')) {
              return 'vendor-recharts';
            }
            if (id.includes('apexcharts')) {
              return 'vendor-apexcharts';
            }
            if (id.includes('supabase')) {
              return 'vendor-supabase';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    port: 5188,
    strictPort: true,
    host: '127.0.0.1'
  }
});
