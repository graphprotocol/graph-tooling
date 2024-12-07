import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: [
      '**/node_modules',
      '**/dist',
      '**/build',
      '**/generated',
      'packages/cli/tests/cli/init',
      'packages/cli/tests/cli/validation',
      'packages/ts/test/',
      '**/examples',
      '**/vitest.config.ts',
    ],
  },
  ...compat.extends('@theguild'),
  {
    rules: {
      'import/extensions': 'off',
      'unicorn/no-array-push-push': 'off',
      'import/no-default-export': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-types': 'off',
      eqeqeq: 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['packages/ts/**'],

    rules: {
      '@typescript-eslint/no-namespace': 'off',
      'sonarjs/no-inverted-boolean-check': 'off',
      'no-loss-of-precision': 'warn',
    },
  },
  {
    files: ['packages/cli/**'],

    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@whatwg-node/fetch'],
              message: 'Please use `fetch` from `./packages/cli/src/fetch.ts`.',
            },
          ],
        },
      ],
    },
  },
];
