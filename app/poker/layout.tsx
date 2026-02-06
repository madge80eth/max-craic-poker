import type { Metadata } from "next";

const frameData = {
  version: "1",
  imageUrl: "https://craicprotocol.com/image.png",
  button: {
    title: "Create a Home Game",
    action: {
      type: "launch_miniapp",
      name: "Craic Protocol Poker",
      url: "https://craicprotocol.com",
      splashImageUrl: "https://craicprotocol.com/splash.png",
      splashBackgroundColor: "#0a0a0a"
    }
  }
};

export const metadata: Metadata = {
  title: "Craic Protocol Poker",
  description: "Host trustless poker home games for your community with zero fees and smart contract payouts",
  openGraph: {
    title: "Craic Protocol Poker",
    description: "Host trustless poker home games for your community with zero fees and smart contract payouts",
    images: [
      {
        url: "https://craicprotocol.com/image.png",
        width: 1200,
        height: 630,
        alt: "Craic Protocol Poker"
      }
    ],
  },
  other: {
    "fc:frame": JSON.stringify(frameData),
  }
};

export default function PokerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
