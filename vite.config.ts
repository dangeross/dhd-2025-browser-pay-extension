import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import path from 'path';

// Load manifest.json
import manifest from './public/manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: 'inline',
    assetsInlineLimit: 0, // Don't inline WASM files
    // Enable WASM imports
    target: 'esnext',
  },
  optimizeDeps: {
    // This is needed for WASM modules
    exclude: ['@breeztech/breez-sdk-liquid'],
  },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      port: 5173,
    },
  },
});