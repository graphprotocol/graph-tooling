module.exports = {
  extends: ['@theguild'],
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    'generated',
    'packages/cli/tests/cli/init',
    'packages/cli/tests/cli/validation',
    'packages/ts/test/',
    'examples',
    'vitest.config.ts'
  ],
  rules: {
    // not necessary here, we dont build with bob
    'import/extensions': 'off',
    // pushing to array multiple times is not a big deal
    'unicorn/no-array-push-push': 'off',
    // TODO: remove default exports, breaking change?
    'import/no-default-export': 'off',
    // TODO: remove once we get rid of all anys
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-types': 'off',
    // AssemblyScript `===` is a reference equality check, not a value equality check. We are trying to do a value check. Learn more: https://github.com/AssemblyScript/assemblyscript/issues/621#issuecomment-497973428
    eqeqeq: 'off',
    '@typescript-eslint/no-unused-vars': 'off',
  },
  overrides: [
    {
      files: ['packages/ts/**'],
      rules: {
        // TODO: want to avoid any structural change so fix it later
        '@typescript-eslint/no-namespace': 'off',
        // Some operator depend on the implementation of others, prevent recursion
        'sonarjs/no-inverted-boolean-check': 'off',
        'no-loss-of-precision': 'warn',
        // AssemblyScript types are different from TS and in cases we want to use what TS may think we should not,
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
  ],
};
