import { http, createConfig, fallback } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { coinbaseWallet, injected } from 'wagmi/connectors'

// Multiple RPC URLs for fallback to avoid /pipeline proxy issues
const BASE_RPC_URLS = [
  'https://mainnet.base.org',
  'https://base.llamarpc.com',
  'https://base.drpc.org',
]

export const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'Craic Poker',
      // Use 'all' to allow both Smart Wallet and EOA connections
      preference: 'all',
    }),
    farcasterMiniApp(), // For Farcaster Mini App environment
    injected() // Fallback for browser wallets (MetaMask, Rabby, etc.)
  ],
  transports: {
    [base.id]: fallback(
      BASE_RPC_URLS.map(url => http(url, { batch: false }))
    ),
  },
})
