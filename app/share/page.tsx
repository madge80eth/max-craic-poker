import { Metadata } from 'next'
import { redirect } from 'next/navigation'

const frameData = {
  version: "1",
  imageUrl: "https://maxcraicpoker.com/mcp-frame.png",
  button: {
    title: "Enter the Draw",
    action: {
      type: "launch_miniapp",
      name: "Max Craic Poker",
      url: "https://maxcraicpoker.com/mini-app",
      splashImageUrl: "https://maxcraicpoker.com/splash.png",
      splashBackgroundColor: "#6B46C1"
    }
  }
};

export const metadata: Metadata = {
  title: "Max Craic Poker - Enter Draw",
  description: "Daily draw for poker tournament profits. Winners get USDC when I cash.",
  openGraph: {
    title: "Max Craic Poker",
    description: "Daily draw for poker tournament profits. Winners get USDC when I cash.",
    images: [{
      url: "https://maxcraicpoker.com/mcp-frame.png",
      width: 1200,
      height: 630,
    }],
  },
  other: {
    "fc:frame": JSON.stringify(frameData),
  }
}

export default function SharePage() {
  // Server-side redirect for browsers, metadata still served for crawlers
  redirect('/mini-app')
}
