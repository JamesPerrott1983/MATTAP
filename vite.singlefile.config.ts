// Builds the whole game into ONE self-contained HTML file (dist-single/index.html)
// that runs from a double-click, with no server or install required.
// Usage: npx vite build --config vite.singlefile.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'dist-single',
    chunkSizeWarningLimit: 4000,
  },
});
