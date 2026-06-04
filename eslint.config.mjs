import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

const prettierOptions = JSON.parse(readFileSync(new URL('./.prettierrc.json', import.meta.url), 'utf8'));

export default [
  {
    ignores: [
      'node_modules/',
      '.venv/',
      '.reuse-venv/',
      '.DS_Store',
      '*.pyc',
      '__pycache__/',
      'dist/',
      'build/',
      '*.min.js',
      '*.yaml',
      '*.yml',
      '*.json',
      '**/libs/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...prettier.rules,
      'prettier/prettier': ['error', prettierOptions],
      'no-console': 'off',
      'no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: ['**/assets/**/*.js'],
    languageOptions: {
      globals: {
        io: 'readonly',
        Chart: 'readonly',
        QRCode: 'readonly',
        WebUI: 'readonly',
        marked: 'readonly',
      },
    },
    rules: {
      'no-undefined': 'off',
    },
  },
];
