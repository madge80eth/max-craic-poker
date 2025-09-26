import { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Max Craic Poker - Community Game",
  description: "Community-Rewarded Poker - one winner gets 5% of tournament profits + 5% bonus for sharing!",
  openGraph: {
    title: "Max Craic Poker - Community Game",
    description: "Community-Rewarded Poker - one winner gets 5% of tournament profits + 5% bonus for sharing!",
    images: ['https://max-craic-poker.vercel.app/api/frame-image'],
    url: 'https://max-craic-poker.vercel.app/share',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Max Craic Poker - Community Game',
    description: 'Community-Rewarded Poker - one winner gets 5% of tournament profits + 5% bonus for sharing!',
    images: ['https://max-craic-poker.vercel.app/api/frame-image'],
  },
  other: {
    'fc:frame': JSON.stringify({
      version: "next",
      imageUrl: "https://max-craic-poker.vercel.app/api/frame-image",
      button: {
        title: "Launch Max Craic Poker",
        action: {
          type: "launch_frame",
          name: "Max Craic Poker",
          url: "https://max-craic-poker.vercel.app/mini-app",
          splashImageUrl: "https://max-craic-poker.vercel.app/mcp-logo.png",
          splashBackgroundColor: "#663399"
        }
      }
    })
  }
}

export default function SharePage() {
  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #663399 0%, #4c1d95 50%, #312e81 100%)'
    }}>
      <div className="container mx-auto px-4 py-8">
        {/* Logo - Small and Centered */}
        <div className="text-center mb-6">
          <img 
            src="/mcp-logo.png" 
            alt="Max Craic Poker Logo" 
            className="mx-auto mb-4"
            style={{ width: '60px', height: '60px', objectFit: 'contain' }}
          />
        </div>

        {/* Main Card - Professional Glassmorphic Design */}
        <div className="max-w-2xl mx-auto">
          <div style={{
            background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(147, 51, 234, 0.3)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">MAX CRAIC</h1>
              <h2 className="text-2xl font-bold" style={{ color: '#ef4444' }}>POKER</h2>
              <p className="text-gray-300 text-lg mt-4">Community-Rewarded Poker</p>
            </div>

            {/* Tournaments Section */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-center mb-6" style={{ color: '#fbbf24' }}>
                Today's Tournaments:
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-gray-300">
                  <span>• The Bounty Hunter</span>
                  <span className="text-purple-300 font-semibold">$44</span>
                </div>
                <div className="flex justify-between items-center text-gray-300">
                  <span>• Midnight Madness</span>
                  <span className="text-purple-300 font-semibold">$33</span>
                </div>
                <div className="flex justify-between items-center text-gray-300">
                  <span>• Progressive KO</span>
                  <span className="text-purple-300 font-semibold">$22</span>
                </div>
                <div className="flex justify-between items-center text-gray-300">
                  <span>• Evening Flight</span>
                  <span className="text-purple-300 font-semibold">$77</span>
                </div>
                <div className="flex justify-between items-center text-gray-300">
                  <span>• Late Night Grind</span>
                  <span className="text-purple-300 font-semibold">$55</span>
                </div>
              </div>
            </div>

            {/* Profit Share Info */}
            <div className="text-center mb-8">
              <p className="text-gray-300 text-lg">
                Winner gets 5% profit + 5% bonus for sharing!
              </p>
            </div>

            {/* Launch Button */}
            <div className="text-center">
              <a 
                href="/mini-app" 
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 32px',
                  color: 'white',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  textDecoration: 'none',
                  display: 'inline-block',
                  transition: 'opacity 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
              >
                Launch Max Craic Poker
              </a>
            </div>

            {/* Features */}
            <div className="mt-6 text-center">
              <div className="flex justify-center space-x-8 text-sm">
                <div className="text-gray-300">
                  <span className="mr-1">💰</span>
                  5% profit share for winner
                </div>
                <div className="text-gray-300">
                  <span className="mr-1">🚀</span>
                  Extra 5% bonus for sharing
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            Click above to join the community raffle!
          </p>
        </div>
      </div>
    </div>
  )
}