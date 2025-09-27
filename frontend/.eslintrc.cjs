module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules', 'vitest.config.ts', 'src/test'],
  parser: '@typescript-eslint/parser',
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'warn',
    'prefer-const': 'error',
    // Store naming convention enforcement
    'filenames/match-regex': ['error', '^[a-z]+(-[a-z]+)*\\.ts$', true],
  },
  overrides: [
    {
      files: ['src/stores/**/*.ts'],
      rules: {
        'filenames/match-regex': ['error', '^[a-z]+(-[a-z]+)*(-store|-types|index)\\.ts$', true],
      }
    }
  ],
};