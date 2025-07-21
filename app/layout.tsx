import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Max Craic Poker",
  description: "Enter now to win 5% if we cash — 10% if you recast",
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://max-craic-poker.vercel.app/frame.png",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
