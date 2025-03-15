import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2015',
    minify: 'esbuild',
  },
  server: {
    host: true,
    port: 9093,  
    open: true,
    fs: {
      allow: ['..'],
    },
  },
});
