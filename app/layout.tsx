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

// ✅ Frame + Mini App Embed metadata
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
    "property:fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: "https://max-craic-poker.vercel.app/api/frame-image",
      button: {
        title: "Enter Now",
        action: {
          type: "launch_miniapp",
          url: "https://max-craic-poker.vercel.app",
          name: "Max Craic Poker",
          splashImageUrl: "https://max-craic-poker.vercel.app/logo.png", // replace if you have a real logo
          splashBackgroundColor: "#000000",
        },
      },
    }),
    "property:fc:frame": JSON.stringify({
      version: "1",
      imageUrl: "https://max-craic-poker.vercel.app/api/frame-image",
      button: {
        title: "Enter Now",
        action: {
          type: "launch_frame",
          url: "https://max-craic-poker.vercel.app",
          name: "Max Craic Poker",
          splashImageUrl: "https://max-craic-poker.vercel.app/logo.png",
          splashBackgroundColor: "#000000",
        },
      },
    }),
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
