import { http, createConfig, fallback } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors'

const isTestnet = process.env.NEXT_PUBLIC_TESTNET === 'true';

// @farcaster/miniapp-wagmi-connector v1 omits getChainId(), which wagmi v2
// calls internally. Patch the factory to add it via eth_chainId if missing.
type ConnectorFactory = ReturnType<typeof farcasterMiniApp>;

function patchedFarcasterMiniApp(): ConnectorFactory {
  const original = farcasterMiniApp();
  return (config) => {
    const connector = original(config);
    if (typeof (connector as unknown as Record<string, unknown>).getChainId !== 'function') {
      (connector as unknown as Record<string, unknown>).getChainId = async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const provider = await connector.getProvider() as any;
        const hex: string = await provider.request({ method: 'eth_chainId' });
        return Number(hex);
      };
    }
    return connector;
  };
}

const connectors = [
  patchedFarcasterMiniApp(),
  coinbaseWallet({
    appName: 'Craic Poker',
    preference: 'all',
  }),
  walletConnect({
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    metadata: {
      name: 'Craic Poker',
      description: 'Trustless poker nights for web3 communities',
      url: 'https://maxcraicpoker.com',
      icons: ['https://maxcraicpoker.com/mcp-logo.png'],
    },
    showQrModal: true,
  }),
  injected(),
];

export const config = isTestnet
  ? createConfig({
      chains: [baseSepolia],
      connectors,
      transports: {
        [baseSepolia.id]: fallback([
          http('https://sepolia.base.org', { batch: false }),
        ]),
      },
    })
  : createConfig({
      chains: [base],
      connectors,
      transports: {
        [base.id]: fallback([
          'https://mainnet.base.org',
          'https://base.llamarpc.com',
          'https://base.drpc.org',
        ].map(url => http(url, { batch: false }))),
      },
    });
