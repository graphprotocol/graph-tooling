import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Validate required environment variables
  const requiredEnvVars = ['VITE_STUDIO_API_KEY' /*, 'VITE_WALLETCONNECT_PROJECT_ID'*/];
  const missingEnvVars = requiredEnvVars.filter(key => !env[key]);

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missingEnvVars.map(key => `  - ${key}`).join('\n')}\n` +
        `Please add them to your environment or .env file`,
    );
  }

  return {
    plugins: [react(), nodePolyfills(), TanStackRouterVite()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
