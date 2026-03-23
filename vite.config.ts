import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteCommonjs } from '@originjs/vite-plugin-commonjs';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    viteCommonjs(),
  ],
  resolve: {
    alias: {
      'dicom-wasm': path.resolve(__dirname, 'wasm/pkg/dicom_wasm.js'),
    },
  },
  optimizeDeps: {
    exclude: ['@cornerstonejs/dicom-image-loader', 'dicom-wasm'],
    include: ['dicom-parser'],
  },
  worker: {
    format: 'es',
  },
  assetsInclude: ['**/*.wasm'],
});
