import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { coinbaseWallet, injected } from 'wagmi/connectors'

// Explicit Base RPC URL to avoid /pipeline proxy issues
const BASE_RPC_URL = 'https://mainnet.base.org'

export const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'Craic Poker',
      // Use 'all' instead of 'smartWalletOnly' to avoid Coinbase proxy /pipeline issues
      preference: 'all',
    }),
    farcasterMiniApp(), // For Farcaster Mini App environment
    injected() // Fallback for browser wallets (MetaMask, Rabby, etc.)
  ],
  transports: {
    [base.id]: http(BASE_RPC_URL),
  },
})
