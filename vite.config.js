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
                 !dep.includes('vendor-pptx');
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
            if (id.includes('supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('xlsx') || id.includes('xlsx-js-style') || id.includes('file-saver') || id.includes('jszip')) {
              return 'vendor-xlsx';
            }
            if (id.includes('pptxgenjs')) {
              return 'vendor-pptx';
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
