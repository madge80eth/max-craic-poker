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

// ✅ Frame + Mini App metadata (correctly formed)
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
    "fc:frame": JSON.stringify({
      version: "1",
      image: "https://max-craic-poker.vercel.app/api/frame-image2",
      post_url: "https://max-craic-poker.vercel.app/api/enter",
      buttons: [{ label: "Enter Now" }],
    }),
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: "https://max-craic-poker.vercel.app/api/frame-image2",
      button: {
        title: "Enter Now",
        action: {
          type: "launch_miniapp",
          url: "https://max-craic-poker.vercel.app/",
        },
      },
    }),
  },
};

// ✅ Root layout wrapper
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
