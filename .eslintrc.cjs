module.exports = {
  extends: ['@theguild'],
  rules: {
    // not necessary here, we dont build with bob
    'import/extensions': 'off',
    // pushing to array multiple times is not a big deal
    'unicorn/no-array-push-push': 'off',
    // TODO: warning for now, clean up
    '@typescript-eslint/no-this-alias': 'warn',
    // TODO: remove default exports, breaking change?
    'import/no-default-export': 'off',
    // TODO: remove once we get rid of all anys
    '@typescript-eslint/no-explicit-any': 'off',
    // TODO: not ready yet
    'unicorn/prefer-node-protocol': 'off',
    '@typescript-eslint/ban-types': 'off',
    // AssemblyScript `===` is a reference equality check, not a value equality check. We are trying to do a value check. Learn more: https://github.com/AssemblyScript/assemblyscript/issues/621#issuecomment-497973428
    eqeqeq: 'off',
  },
  overrides: [
    {
      files: ['packages/ts/**'],
      rules: {
        // TODO: want to avoid any structural change so fix it later
        '@typescript-eslint/no-namespace': 'off',
        // TODO: warning for now, clean up
        'unicorn/filename-case': 'warn',
        // TODO: warning for now, clean up
        'sonarjs/no-inverted-boolean-check': 'warn',
        // TODO: warning for now, clean up
        '@typescript-eslint/no-loss-of-precision': 'warn',
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
