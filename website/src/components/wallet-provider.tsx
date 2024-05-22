import { ConnectKitProvider, getDefaultConfig } from 'connectkit';
import { createConfig, http, WagmiProvider } from 'wagmi';
import { arbitrum, arbitrumSepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const config = createConfig(
  getDefaultConfig({
    // Your dApps chains
    chains: [arbitrum, arbitrumSepolia],
    transports: {
      [arbitrum.id]: http(),
      [arbitrumSepolia.id]: http(),
    },
    walletConnectProjectId: '1',
    // Required App Info
    appName: 'Graph Tooling',

    // Optional App Info
    appDescription: 'Permissionless deploy for subgraphs',
    appUrl: 'https://cli.thegraph.com',
    appIcon: 'https://storage.googleapis.com/graph-web/favicon.png',
  }),
);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>{children}</ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
