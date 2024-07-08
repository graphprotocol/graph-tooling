import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      // node v21 has warnings about the deprecation of punycode which can break test snapshots
      NODE_NO_WARNINGS: '1',
    },
  },
});
