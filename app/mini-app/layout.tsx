// app/mini-app/layout.tsx
export const dynamic = 'force-dynamic'

export default function MiniAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}