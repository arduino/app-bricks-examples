import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

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
      'prettier/prettier': 'error',
      'no-console': 'off',
      'no-undef': 'off',
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
      },
    },
    rules: {
      'no-undefined': 'off',
    },
  },
];
