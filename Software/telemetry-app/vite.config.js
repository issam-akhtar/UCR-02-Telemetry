import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
import inspect from 'vite-plugin-inspect';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Using SWC for faster builds
      swcOptions: {
        jsc: {
          transform: {
            react: {
              // Enable React optimizations
              runtime: 'automatic',
              refresh: true,
              development: process.env.NODE_ENV !== 'production',
              useBuiltins: true
            }
          },
          minify: {
            compress: {
              // Additional compression options
              drop_console: process.env.NODE_ENV === 'production',
              drop_debugger: process.env.NODE_ENV === 'production'
            }
          }
        }
      }
    }),
    // Optimize file sizes with compression
    compression({
      algorithm: 'brotli',
      ext: '.br',
      threshold: 1024, // Only compress files > 1kb
      deleteOriginalAssets: false,
    }),
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
    }),
    // Visualize bundle size
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true,
      filename: 'stats.html',
    }),
    // Debug plugin - remove in production
    process.env.NODE_ENV !== 'production' && inspect(),
  ].filter(Boolean),
  
  // Build optimizations
  build: {
    target: 'es2015',
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 500, // Lower threshold for chunk size warnings
    sourcemap: process.env.NODE_ENV !== 'production',
    assetsInlineLimit: 4096, // Inline small assets (<4kb)
    
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor bundle splitting for better caching
          'vendor-react': [
            'react', 
            'react-dom',
            'react-router-dom',
          ],
          'vendor-mui': [
            '@emotion/react',
            '@emotion/styled',
            '@mui/material',
            '@mui/icons-material',
          ],
          'charts-core': [
            'echarts',
            'plotly.js-dist-min',
            'recharts',
            '@visx/visx',
            '@visx/shape',
          ],
          'charts-minimal': [
            'uplot',
            'uplot-react',
            'react-gauge-component',
          ],
          'maps': [
            'pigeon-maps',
          ],
          'utils': [
            'valtio',
            'immer',
            'comlink',
            'lodash-es',
            'date-fns',
            'zod',
          ],
          'ui-components': [
            'framer-motion',
            '@headlessui/react',
            'react-window',
            'react-error-boundary',
            'react-grid-layout',
          ]
        },
        // Reduce chunk filenames
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  
  // Optimization for development server
  server: {
    host: true,
    port: 9093,
    open: true,
    fs: {
      allow: ['..'],
    },
    // Faster HMR
    hmr: {
      overlay: true,
    },
  },

  // Performance optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
      'echarts',
      'plotly.js-dist-min',
      'lodash-es',
    ],
    // Force include specific packages that may have issues with auto-detection
    force: true,
    // Use esbuild for optimizations
    esbuildOptions: {
      target: 'es2020',
    },
  },

  // Asset optimization
  esbuild: {
    // Optimize tree-shaking  
    legalComments: 'none',
    target: 'es2020',
    supported: {
      'top-level-await': true,
    },
  },
});