import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_API_URL || env.BACKEND_URL || 'http://localhost:5000';
  const clientPort = parseInt(env.PORT || '3000', 10);

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['@huggingface/transformers']
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
              return 'vendor-react';
            }
            if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
              return 'vendor-leaflet';
            }
            if (id.includes('@huggingface/transformers') || id.includes('onnxruntime')) {
              return 'vendor-transformers';
            }
          }
        }
      }
    },
    server: {
      port: clientPort,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true
        }
      }
    }
  };
});
