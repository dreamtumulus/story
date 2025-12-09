import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Increase the chunk size limit to 3000kB to prevent warnings during deployment
    chunkSizeWarningLimit: 3000,
  },
});