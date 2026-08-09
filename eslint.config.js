import js from '@eslint/js'
import globals from 'globals'
import { defineConfig, globalIgnores } from 'eslint/config'

// Phase 1 linting is intentionally scoped to active source safety. Legacy iframe
// code and duplicate gc3d code are scheduled for later port/archive phases.
//
// The React plugin wiring this config shipped with was template residue: the
// project has no React dependency, no .jsx sources and no `from 'react'`
// import anywhere. Because those plugins were never declared as
// dependencies, the config could not load at all and nothing was ever
// linted. Dropping them is what makes lint runnable.
export default defineConfig([
  globalIgnores([
    'dist',
    'node_modules',
    'Docs/**',
    'public/spl2-bundle/**',
    'src/gc3d/**',
    '**/*.test.js',
    'run_*benchmarks*.test.js',
  ]),
  {
    files: ['**/*.js'],
    extends: [
      js.configs.recommended,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: {
        ...globals.browser,
        ...globals.jest,
        ...globals.node,
        __BUILD_TIME__: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: { ...globals.node },
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: {
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
    },
  },
])
