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

// ✅ Keep only generic site metadata here
export const metadata: Metadata = {
  title: "Max Craic Poker",
  description: "Daily draws, onchain rewards, and chaos at the poker table.",
  openGraph: {
    title: "Max Craic Poker",
    description: "Daily draws, onchain rewards, and chaos at the poker table.",
    images: [
      {
        url: "https://max-craic-poker.vercel.app/api/frame-image",
        width: 1200,
        height: 630,
      },
    ],
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
