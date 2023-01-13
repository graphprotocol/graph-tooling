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
  },
};
