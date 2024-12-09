import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

// needed to extend the guild config
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
      '**/dist',
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
      eqeqeq: 'off',
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['packages/ts/**'],

    rules: {
      '@typescript-eslint/no-namespace': 'off',
      'sonarjs/no-inverted-boolean-check': 'off',
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
