import type { Metadata } from "next";
import "./globals.css";
import { Providers } from './providers'

export const metadata: Metadata = {
  title: "Max Craic Poker",
  description: "Community-backed poker tournaments",
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