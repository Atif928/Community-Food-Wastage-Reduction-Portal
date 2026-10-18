import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite configuration.
 *
 * The dev server proxies /api and /uploads to the Express server so the browser
 * only ever talks to one origin (no CORS pre-flights in development) and
 * <img src="/uploads/..."> keeps working without absolute URLs.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to every interface (IPv4 + IPv6) so both http://localhost:5173 and
    // http://127.0.0.1:5173 resolve. Without this Vite may bind IPv6-only.
    host: true,
    port: 5173,
    strictPort: true,
    open: true,
    proxy: {
      // Use 127.0.0.1 (not "localhost") so the proxy never picks IPv6 ::1.
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Split the two heaviest libraries so the first paint stays fast.
        manualChunks: {
          charts: ['recharts'],
          maps: ['@react-google-maps/api'],
        },
      },
    },
  },
});
