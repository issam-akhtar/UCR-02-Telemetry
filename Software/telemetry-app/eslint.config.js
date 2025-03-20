import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { 
    ignores: ['dist', 'node_modules', 'build', '.vite', 'stats.html', '*.log'] 
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { 
      react: { 
        version: '18.3'
      },
      // Performance optimization - limit lines checked
      'import/max-dependencies': [
        'warn',
        { max: 20 }
      ]
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      
      // Performance related rules
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/jsx-no-constructed-context-values': 'error',
      'react/jsx-no-useless-fragment': 'warn',
      'react/no-array-index-key': 'warn',
      'react-hooks/exhaustive-deps': 'error',
      
      // Disable rules that can cause unnecessary processing
      'react/prop-types': 'off',
      'react/display-name': 'off',
      
      // Memory leak prevention
      'react-hooks/rules-of-hooks': 'error',
      
      // Performance optimizations
      'no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_' 
      }],
    },
  },
  // Additional environment-specific configurations
  {
    files: ['**/*.test.{js,jsx}', '**/__tests__/**'],
    rules: {
      // Relaxed rules for test files
      'react/jsx-no-constructed-context-values': 'off',
    }
  }
]