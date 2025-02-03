import prettierConfig from '@theguild/prettier-config';

export default {
  ...prettierConfig,
  overrides: [
    ...(prettierConfig.overrides || []),
    {
      files: '*.md{,x}',
      options: {
        semi: false,
        trailingComma: 'none',
        proseWrap: 'preserve',
      },
    },
  ],
};
