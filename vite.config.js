import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    modulePreload: {
      resolveDependencies(filename, deps, { hostId }) {
        return deps.filter(dep => {
          return !dep.includes('vendor-apexcharts') &&
                 !dep.includes('vendor-xlsx') &&
                 !dep.includes('vendor-pptx') &&
                 !dep.includes('vendor-recharts') &&
                 !dep.includes('vendor-utils');
        });
      }
    },
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
            if (id.includes('supabase') || id.includes('postgrest') || id.includes('websocket')) {
              return 'vendor-supabase';
            }
            if (id.includes('xlsx') || id.includes('xlsx-js-style')) {
              return 'vendor-xlsx';
            }
            if (id.includes('pptxgenjs')) {
              return 'vendor-pptx';
            }
            if (id.includes('file-saver') || id.includes('jszip')) {
              return 'vendor-utils';
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
