// app/page.tsx

import { promises as fs } from 'fs';
import path from 'path';
import { EnterButton } from '../components/EnterButton';
import type { Metadata } from 'next';

// ✅ Frame + MiniApp metadata set per page
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Max Craic Poker Draw',
    description: 'Enter now to win 5% if we cash — 10% if you recast',
    openGraph: {
      title: 'Max Craic Poker Draw',
      description: 'Enter now to win 5% if we cash — 10% if you recast',
      images: [
        {
          url: 'https://max-craic-poker.vercel.app/api/frame-image2',
          width: 1200,
          height: 630,
        },
      ],
    },
    other: {
      'fc:frame': JSON.stringify({
        version: '1',
        image: 'https://max-craic-poker.vercel.app/api/frame-image2',
        post_url: 'https://max-craic-poker.vercel.app/api/enter',
        buttons: [{ label: 'Enter Now' }],
      }),
      'fc:miniapp': JSON.stringify({
        version: '1',
        imageUrl: 'https://max-craic-poker.vercel.app/api/frame-image2',
        button: {
          title: 'Enter Now',
          action: {
            type: 'launch_miniapp',
            url: 'https://max-craic-poker.vercel.app/',
          },
        },
      }),
    },
  };
}

export default async function Home() {
  const filePath = path.join(process.cwd(), 'tournaments.json');
  const rawData = await fs.readFile(filePath, 'utf-8');
  const tournaments = JSON.parse(rawData);

  return (
    <main className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <img
          src="/mcp-logo.png"
          alt="Max Craic Poker"
          className="w-14 rounded-full"
        />
        <h1 className="text-3xl font-bold">Today's Tournaments</h1>
      </div>

      <ul className="list-disc ml-6 mb-6">
        {tournaments.map((tourney: string, index: number) => (
          <li key={index}>{tourney}</li>
        ))}
      </ul>

      <EnterButton tournaments={tournaments} />

      {process.env.NODE_ENV === 'development' && (
        <form action="/api/start-session" method="get" className="mt-8">
          <button
            type="submit"
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            🔄 Reset Session (Dev Only)
          </button>
        </form>
      )}
    </main>
  );
}
