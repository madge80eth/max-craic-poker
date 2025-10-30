import { http, createConfig } from 'wagmi'
import { base } from 'wagmi/chains'
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [base],
  connectors: [
    farcasterMiniApp(), // For Farcaster Mini App environment
    injected() // Fallback for browser wallets (MetaMask, Rabby, etc.)
  ],
  transports: {
    [base.id]: http(),
  },
})