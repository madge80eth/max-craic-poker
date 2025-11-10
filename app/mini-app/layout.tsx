// app/mini-app/layout.tsx
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: 'https://max-craic-poker.vercel.app/mcp-frame.png',
      button: {
        title: 'Open Max Craic Poker',
        action: {
          type: 'launch_frame',
          name: 'Max Craic Poker',
          url: 'https://max-craic-poker.vercel.app/mini-app',
          splashImageUrl: 'https://max-craic-poker.vercel.app/splash.png',
          splashBackgroundColor: '#6B46C1'
        }
      }
    })
  }
}

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}