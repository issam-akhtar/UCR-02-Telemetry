import { defineConfig, splitVendorChunkPlugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
import inspect from 'vite-plugin-inspect';

// Environment detection
const isProd = process.env.NODE_ENV === 'production';
const isCI = !!process.env.CI;

export default defineConfig({
  plugins: [
    // React with SWC optimizations
    react({
      swcOptions: {
        jsc: {
          transform: {
            react: {
              runtime: 'automatic',
              refresh: !isProd,
              development: !isProd,
              useBuiltins: true
            }
          },
          minify: isProd && {
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ['console.log', 'console.debug', 'console.trace'],
              passes: 2, // Extra optimization pass
              unsafe: true,
              unsafe_arrows: true,
              unsafe_comps: true,
              unsafe_methods: true
            },
            mangle: true
          },
          // Add parser options to handle newer syntax
          parser: {
            syntax: 'ecmascript',
            jsx: true,
            dynamicImport: true,
            privateMethod: true,
            functionBind: true,
            exportDefaultFrom: true,
            topLevelAwait: true
          }
        }
      }
    }),

    // Better vendor chunk splitting
    splitVendorChunkPlugin(),

    // Optimized compression
    isProd && compression({
      algorithm: 'brotli',
      ext: '.br',
      threshold: 1024,
      compressionOptions: { level: 11 }, // Max compression for Brotli
      deleteOriginalAssets: false,
    }),
    
    isProd && compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 1024,
      compressionOptions: { level: 9 }, // Max compression for Gzip
      deleteOriginalAssets: false,
    }),

    // Bundle analysis (only run when explicitly requested, not in CI)
    !isCI && process.env.ANALYZE && visualizer({
      open: process.env.ANALYZE === 'open',
      gzipSize: true,
      brotliSize: true,
      filename: 'stats.html',
    }),

    // Debug plugin - only in dev
    !isProd && inspect(),
  ].filter(Boolean),
  
  // Build optimizations
  build: {
    target: 'es2020', // Updated to match esbuild target
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: !isCI, // Disable in CI for speed
    chunkSizeWarningLimit: 600,
    sourcemap: !isProd || process.env.SOURCEMAP === 'true',
    assetsInlineLimit: 4096,
    
    // Improve build performance in CI
    emptyOutDir: !process.env.INCREMENTAL_BUILD,
    
    rollupOptions: {
      output: {
        // Improved chunking strategy
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/scheduler/')) {
            return 'vendor-react-core';
          }
          
          // React ecosystem
          if (id.includes('node_modules/react-router') ||
              id.includes('node_modules/@remix-run/') ||
              id.includes('node_modules/react-error-boundary')) {
            return 'vendor-react-ecosystem';
          }
          
          // Material UI
          if (id.includes('node_modules/@mui/') ||
              id.includes('node_modules/@emotion/')) {
            return 'vendor-mui';
          }
          
          // Charting libraries
          if (id.includes('node_modules/echarts') ||
              id.includes('node_modules/plotly') ||
              id.includes('node_modules/react-gauge-component')) {
            return 'vendor-charts';
          }
          
          // Maps
          if (id.includes('node_modules/leaflet') ||
              id.includes('node_modules/react-leaflet')) {
            return 'vendor-maps';
          }
          
          // UI components
          if (id.includes('node_modules/lucide-react') ||
              id.includes('node_modules/@headlessui/') ||
              id.includes('node_modules/react-virtualized') ||
              id.includes('node_modules/react-window') ||
              id.includes('node_modules/react-icons') ||
              id.includes('node_modules/react-modal') ||
              id.includes('node_modules/react-intersection-observer') ||
              id.includes('node_modules/react-hook-form') ||
              id.includes('node_modules/react-grid-layout')) {
            return 'vendor-ui-components';
          }
          
          // Utilities
          if (id.includes('node_modules/lodash') ||
              id.includes('node_modules/immer') ||
              id.includes('node_modules/zod') ||
              id.includes('node_modules/swr') ||
              id.includes('node_modules/axios') ||
              id.includes('node_modules/protobufjs')) {
            return 'vendor-utils';
          }
        },
        
        // Optimize chunk naming for better caching
        entryFileNames: isProd ? 'assets/[name].[hash].js' : 'assets/[name].js',
        chunkFileNames: isProd ? 'assets/[name].[hash].js' : 'assets/[name].js',
        assetFileNames: isProd ? 'assets/[name].[hash].[ext]' : 'assets/[name].[ext]'
      },
      // Improve tree-shaking
      treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false
      }
    }
  },
  
  // Development server optimizations
  server: {
    host: true,
    port: 9093,
    open: !isCI,
    fs: {
      allow: ['..'],
      strict: !isProd,
    },
    hmr: {
      overlay: true,
      protocol: 'ws',
      port: 9093, // Match server port
      clientPort: 9093 // Match server port for proxy scenarios
    },
    watch: {
      usePolling: false, // Better performance, false is default
      interval: 100  // Polling interval if usePolling is true
    },
    // Optimize websocket connections
    middlewareMode: false,
  },
  
  // Preview server config (for testing production builds)
  preview: {
    port: 9094,
    host: true,
    strictPort: true,
    // Add compression middleware to preview server
    middlewares: [
      (req, res, next) => {
        // Check if client accepts compressed responses
        const acceptEncoding = req.headers['accept-encoding'];
        if (!acceptEncoding) return next();
        
        const encodings = acceptEncoding.split(',').map(e => e.trim());
        
        if (encodings.includes('br') && req.url.endsWith('.js')) {
          req.url = req.url + '.br';
          res.setHeader('Content-Encoding', 'br');
          res.setHeader('Content-Type', 'application/javascript');
        } else if (encodings.includes('gzip') && req.url.endsWith('.js')) {
          req.url = req.url + '.gz';
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Content-Type', 'application/javascript');
        }
        next();
      }
    ]
  },
  
  // Dependency optimization
  optimizeDeps: {
    // Optimize explicit dependencies
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
      'echarts',
      'echarts-for-react',
      'plotly.js-dist-min',
      'lodash-es',
      'axios',
      'react-intersection-observer',
      'react-virtualized',
    ],
    // Force optimization of specific dependencies
    force: process.env.FORCE_OPTIMIZE === 'true',
    // ESBuild options
    esbuildOptions: {
      target: 'es2020',
      jsx: 'automatic',
      // Optimize bundle size with tree-shaking
      treeShaking: true,
      // Define global conditions for better optimization
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
      },
      // Additional loaders if needed
      loader: {
        '.js': 'jsx', // Handle .js files as JSX if needed
      }
    },
  },
  
  // ESBuild specific options
  esbuild: {
    legalComments: 'none',
    target: 'es2020',
    format: 'esm',
    treeShaking: true,
    jsx: 'automatic',
    jsxImportSource: 'react',
    supported: {
      'top-level-await': true,
      'dynamic-import': true,
      'import-meta': true
    },
    logLevel: 'warning'
  },
  
  // Resolve configuration
  resolve: {
    extensions: ['.mjs', '.js', '.jsx', '.ts', '.tsx', '.json'],
    // Optional: Set up path aliases here if needed
    alias: {
      // '@': path.resolve(__dirname, 'src'),
    }
  },
  
  // CSS optimizations
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCaseOnly'
    }
  },
  
  // Control console output
  logLevel: process.env.LOG_LEVEL || 'info',
  clearScreen: !process.env.CI,
  
  // Environment variables
  // Any environment variables with the VITE_ prefix will be exposed to the client
  envPrefix: ['VITE_']
});