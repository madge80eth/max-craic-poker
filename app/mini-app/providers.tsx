// app/mini-app/providers.tsx
'use client'

import { WagmiProvider, createConfig, http } from 'wagmi'
import { base } from 'wagmi/chains'
import { coinbaseWallet } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

const config = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'Max Craic Poker',
      appLogoUrl: '/mcp-logo.png',
      preference: 'smartWalletOnly', // Enable Base Account (Smart Wallet) support
    }),
  ],
  transports: {
    [base.id]: http(),
  },
})

export default function MiniAppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="bg-black/30 backdrop-blur-lg rounded-3xl p-8 border border-white/10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}