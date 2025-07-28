// app/layout.tsx

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Font setup
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ✅ Correct Farcaster-compatible metadata
export const metadata: Metadata = {
  title: "Max Craic Poker Draw",
  description: "Enter now to win 5% if we cash — 10% if you recast",
  openGraph: {
    title: "Max Craic Poker Draw",
    description: "Enter now to win 5% if we cash — 10% if you recast",
    images: [
      {
        url: "https://max-craic-poker.vercel.app/api/frame-image2",
        width: 1200,
        height: 630,
      },
    ],
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://max-craic-poker.vercel.app/api/frame-image2",
    "fc:frame:post_url": "https://max-craic-poker.vercel.app/api/enter",
    "fc:frame:button:1": "Enter Now",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
