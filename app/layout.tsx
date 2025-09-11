// app/mini-app/layout.tsx
import MiniAppProviders from './providers'

export const dynamic = 'force-dynamic'

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MiniAppProviders>
      {children}
    </MiniAppProviders>
  )
}