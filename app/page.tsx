import type { Metadata } from 'next';
import LandingPage from './components/LandingPage';

export const metadata: Metadata = {
  title: 'Craic Protocol | Poker Infrastructure for Onchain Communities',
  description:
    'From creator monetization to trustless home games to portable player reputation. Three products. One protocol. Zero rake. Built on Base.',
  openGraph: {
    title: 'Craic Protocol | Poker Infrastructure for Onchain Communities',
    description:
      'Three products. One protocol. Zero rake. Built on Base.',
    images: [
      {
        url: 'https://craicprotocol.com/mcp-logo.png',
        width: 1024,
        height: 1024,
        alt: 'Craic Protocol',
      },
    ],
  },
};

export default function HomePage() {
  return <LandingPage />;
}
