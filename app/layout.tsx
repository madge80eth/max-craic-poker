import type { Metadata } from "next";
import "./globals.css";
import { Providers } from './providers'

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
  title: "Max Craic Poker",
  description: "Daily draw for poker tournament profits. Winners get USDC when I cash.",
  openGraph: {
    title: "Max Craic Poker",
    description: "Daily draw for poker tournament profits. Winners get USDC when I cash.",
    images: [
      {
        url: "https://maxcraicpoker.com/image.png",
        width: 1200,
        height: 630,
        alt: "Max Craic Poker - Win Real Poker Profits"
      }
    ],
  },
  other: {
    "fc:frame": JSON.stringify(frameData),
    "base:app_id": "69123f0b47fdf84bd17202b9",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
