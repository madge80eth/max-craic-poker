// /app/share/page.tsx - FIXED Base Mini App Frame Metadata

import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Max Craic Poker - Community Game",
  description: "Community-Rewarded Poker - one winner gets 5% of tournament profits + 5% bonus for sharing!!",
  
  // CRITICAL: Base Mini App requires this JSON structure
  other: {
    'fc:frame': JSON.stringify({
      version: 'next',
      imageUrl: 'https://max-craic-poker.vercel.app/api/frame-image',
      button: {
        title: 'Launch Max Craic Poker',
        action: {
          type: 'launch_frame',  // KEY: This launches Mini App
          name: 'Max Craic Poker',
          url: 'https://max-craic-poker.vercel.app/mini-app',
          splashImageUrl: 'https://max-craic-poker.vercel.app/mcp-logo.png',
          splashBackgroundColor: '#8b5cf6', // Purple theme
        },
      },
    }),
    
    // Traditional social sharing (keep these)
    'og:title': 'Max Craic Poker - Community Game',
    'og:description': 'Community-Rewarded Poker - one winner gets 5% of tournament profits + 5% bonus for sharing!',
    'og:image': 'https://max-craic-poker.vercel.app/api/frame-image',
    'og:url': 'https://max-craic-poker.vercel.app/share',
  }
}

export default function SharePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <img 
              src="/mcp-logo.png" 
              alt="Max Craic Poker Logo" 
              className="w-20 h-20 object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">MAX CRAIC</h1>
          <div className="text-red-400 font-bold text-2xl mb-4">POKER</div>
        </div>
        
        {/* Main Content */}
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Community-Rewarded Poker
          </h2>
          
          <p className="text-xl text-purple-100 text-center mb-8">
            One winner gets 5% of tournament profits + 5% bonus for sharing!
          </p>
          
          {/* Tournament Cards */}
          <div className="grid gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h3 className="text-lg font-semibold text-white mb-4">Today's Tournaments</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-purple-600/30 rounded-lg p-3 text-center">
                  <div className="text-purple-200 text-sm">Mystery Cash Game</div>
                  <div className="text-white font-bold">$25</div>
                </div>
                <div className="bg-purple-600/30 rounded-lg p-3 text-center">
                  <div className="text-purple-200 text-sm">High Stakes MTT</div>
                  <div className="text-white font-bold">$109</div>
                </div>
                <div className="bg-purple-600/30 rounded-lg p-3 text-center">
                  <div className="text-purple-200 text-sm">Bounty Builder</div>
                  <div className="text-white font-bold">$55</div>
                </div>
                <div className="bg-purple-600/30 rounded-lg p-3 text-center">
                  <div className="text-purple-200 text-sm">Turbo Satellite</div>
                  <div className="text-white font-bold">$11</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Call to Action */}
          <div className="text-center">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-2">
                Ready to Join the Action?
              </h3>
              <p className="text-purple-100 mb-4">
                Click 'Launch Max Craic Poker' to enter with the full Mini App experience!
              </p>
              <div className="text-sm text-purple-200">
                🎰 Random tournament assignment<br/>
                💰 5% profit share for winner<br/>
                🚀 Extra 5% bonus for sharing
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}