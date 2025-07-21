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
  description: "Enter today’s tournament draw!",
  openGraph: {
    title: "Max Craic Poker",
    images: [
      {
        url: "https://max-craic-poker.vercel.app/api/frame-image",
        width: 1200,
        height: 630,
      },
    ],
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://max-craic-poker.vercel.app/api/frame-image",
    "fc:frame:button:1": "Enter Now",
    "fc:frame:post_url": "https://max-craic-poker.vercel.app/api/frame-action",
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
