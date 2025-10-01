import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Max Craic Poker - Enter the Draw',
  description: 'Enter the daily draw. If I cash in a tournament, one entrant gets USDC automatically.',
  openGraph: {
    title: 'Max Craic Poker - Community Draw',
    description: 'Enter Free • Win Profits • Watch Live • Share for Bonus',
    images: [`${process.env.NEXT_PUBLIC_BASE_URL}/api/frame-image`],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame-image`,
    'fc:frame:button:1': 'Enter the Draw',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': `${process.env.NEXT_PUBLIC_BASE_URL}/mini-app`,
  },
};

export default function LaunchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 max-w-md w-full text-center border border-white/20">
        <div className="mb-6">
          <div className="w-24 h-24 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-4xl">♠️</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Max Craic Poker</h1>
          <p className="text-purple-200">
            This page is optimized for sharing on Farcaster. Cast this URL to display the interactive frame, or visit the Mini App directly.
          </p>
        </div>
        
        <a href="/mini-app" className="block w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-xl transition-colors">
          Open Mini App
        </a>
      </div>
    </div>
  );
}