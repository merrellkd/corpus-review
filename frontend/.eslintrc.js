module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.js'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],

    // Workspace-specific layout component rules
    'max-lines-per-function': ['warn', 100],
    'complexity': ['warn', 10],

    // Domain-Driven Design enforcement rules
    'no-relative-imports-across-domains': 'off', // Would need custom rule
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',

    // Layout component performance rules
    'react-hooks/exhaustive-deps': 'error',
    'react-hooks/rules-of-hooks': 'error',

    // Workspace state management rules
    '@typescript-eslint/prefer-readonly': 'warn',
    '@typescript-eslint/no-unused-vars': 'error',
  },

  // Workspace domain-specific overrides
  overrides: [
    {
      files: ['src/domains/workspace/**/*.ts', 'src/domains/workspace/**/*.tsx'],
      rules: {
        // Stricter rules for workspace domain
        '@typescript-eslint/explicit-function-return-type': 'error',
        'max-lines-per-function': ['error', 50],
        'complexity': ['error', 8],

        // Ensure proper DDD layer separation
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['../../../*'],
                message: 'Do not import from outside the workspace domain. Use dependency injection instead.'
              }
            ]
          }
        ]
      }
    },
    {
      files: ['src/domains/workspace/domain/**/*.ts'],
      rules: {
        // Domain layer must be pure - no external dependencies
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['react', 'react-dom', '@tauri-apps/*', 'zustand'],
                message: 'Domain layer cannot import external libraries. Keep it pure.'
              }
            ]
          }
        ]
      }
    },
    {
      files: ['src/domains/workspace/ui/**/*.tsx'],
      rules: {
        // UI components should be optimized for performance
        'react-hooks/exhaustive-deps': 'error',
        '@typescript-eslint/explicit-function-return-type': 'error'
      }
    }
  ]
};