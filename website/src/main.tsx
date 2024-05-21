import React from 'react';
import ReactDOM from 'react-dom/client';
import './global.css';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { ThemeProvider } from './components/theme-provider.tsx';
import { Toaster } from './components/ui/toaster.tsx';
import { WalletProvider } from './components/wallet-provider.tsx';
// Import the generated route tree
import { routeTree } from './routeTree.gen';

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="graph-tooling">
      <WalletProvider>
        <RouterProvider router={router} />
        <Toaster />
      </WalletProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
