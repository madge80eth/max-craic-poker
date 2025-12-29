import type { Metadata } from "next";
import "./globals.css";
import { Providers } from './providers'

export const metadata: Metadata = {
  title: "Max Craic Poker",
  description: "Enter draw, get paid if I cash.",
  openGraph: {
    title: "Max Craic Poker",
    description: "Enter draw, get paid if I cash.",
    images: [
      {
        url: "https://www.maxcraicpoker.com/api/frame-image",
        width: 1200,
        height: 630,
        alt: "Max Craic Poker - Win Real Poker Profits"
      }
    ],
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://www.maxcraicpoker.com/api/frame-image",
    "fc:frame:image:aspect_ratio": "1.91:1",
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