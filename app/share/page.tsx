import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Max Craic Poker - Enter Draw",
  description: "Community-backed poker tournaments. Enter free, win profit shares.",
  openGraph: {
    title: "Max Craic Poker",
    description: "Enter the draw and compete for poker profit shares",
    images: [{
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/mcp-frame.png`,
      width: 1200,
      height: 630,
    }],
  },
  other: {
    'fc:frame': JSON.stringify({
      version: "1",
      imageUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/mcp-frame.png`,
      button: {
        title: "Enter the Draw",
        action: {
          type: "launch_miniapp",
          name: "Max Craic Poker",
          url: `${process.env.NEXT_PUBLIC_BASE_URL}/mini-app`,
          splashImageUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/mcp-logo.png`,
          splashBackgroundColor: "#6B46C1"
        }
      }
    })
  }
}

// Redirect to mini-app if accessed directly in browser
export default function SharePage() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.location.href = "${process.env.NEXT_PUBLIC_BASE_URL}/mini-app";`
      }}
    />
  )
}