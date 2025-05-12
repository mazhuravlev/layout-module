// @ts-check
import eslintJs from '@eslint/js'
import eslintReact from '@eslint-react/eslint-plugin'
import tseslint from 'typescript-eslint'
import stylistic from '@stylistic/eslint-plugin'
import stylisticTs from '@stylistic/eslint-plugin-ts'

export default tseslint.config({
  files: ['**/*.ts', '**/*.tsx'],
  ignores: ['**/node_modules/**', '**/dist/**', '**/demo/**'],
  // Extend recommended rule sets from:
  // 1. ESLint JS's recommended rules
  // 2. TypeScript ESLint recommended rules
  // 3. ESLint React's recommended-typescript rules
  extends: [
    eslintJs.configs.recommended,
    tseslint.configs.recommended,
    eslintReact.configs['recommended-typescript'],
  ],

  // Configure language/parsing options
  languageOptions: {
    // Use TypeScript ESLint parser for TypeScript files
    parser: tseslint.parser,
    parserOptions: {
      // Enable project service for better TypeScript integration
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
  },
  plugins: {
    '@stylistic': stylistic,
    '@stylistic/ts': stylisticTs,
  },
  // Custom rule overrides (modify rule levels or disable rules)
  rules: {
    '@eslint-react/no-missing-key': 'warn',
    '@stylistic/ts/semi': ['error', 'never'],
    'no-unexpected-multiline-block': 'error',
  },
})
