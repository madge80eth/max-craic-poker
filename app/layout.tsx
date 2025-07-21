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

// ✅ Frame + SEO metadata
export const metadata: Metadata = {
  title: "Max Craic Poker",
  description: "Enter now to win 5% if we cash — 10% if you recast",
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://max-craic-poker.vercel.app/api/frame-image",
    "fc:frame:post_url": "https://max-craic-poker.vercel.app/api/enter",
    "fc:frame:button:1": "Enter Now",
  },
  metadataBase: new URL("https://max-craic-poker.vercel.app"),
  robots: {
    index: true,
    follow: true,
  },
  referrer: "origin-when-cross-origin",
  openGraph: {
    images: [
      {
        url: "https://max-craic-poker.vercel.app/api/frame-image",
      },
    ],
  },
};

// ✅ Root layout with lang="en"
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
