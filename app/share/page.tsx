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
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #663399 0%, #4c1d95 50%, #312e81 100%)'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img 
            src="/mcp-logo.png" 
            alt="Max Craic Poker Logo" 
            style={{ width: '60px', height: '60px', margin: '0 auto 1rem' }}
          />
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(147, 51, 234, 0.3)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white', margin: '0 0 0.5rem 0' }}>
                MAX CRAIC
              </h1>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444', margin: '0 0 1rem 0' }}>
                POKER
              </h2>
              <p style={{ color: '#d1d5db', fontSize: '1.125rem', margin: '0' }}>
                Community-Rewarded Poker
              </p>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                textAlign: 'center', 
                marginBottom: '1.5rem',
                color: '#fbbf24' 
              }}>
                Today's Tournaments:
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#d1d5db' }}>
                  <span>• The Bounty Hunter</span>
                  <span style={{ color: '#a855f7', fontWeight: '600' }}>$44</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#d1d5db' }}>
                  <span>• Midnight Madness</span>
                  <span style={{ color: '#a855f7', fontWeight: '600' }}>$33</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#d1d5db' }}>
                  <span>• Progressive KO</span>
                  <span style={{ color: '#a855f7', fontWeight: '600' }}>$22</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#d1d5db' }}>
                  <span>• Evening Flight</span>
                  <span style={{ color: '#a855f7', fontWeight: '600' }}>$77</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#d1d5db' }}>
                  <span>• Late Night Grind</span>
                  <span style={{ color: '#a855f7', fontWeight: '600' }}>$55</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <p style={{ color: '#d1d5db', fontSize: '1.125rem' }}>
                Winner gets 5% profit + 5% bonus for sharing!
              </p>
            </div>

            <div style={{ textAlign: 'center' }}>
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
                  display: 'inline-block'
                }}
              >
                Launch Max Craic Poker
              </a>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', fontSize: '0.875rem' }}>
                <div style={{ color: '#d1d5db' }}>
                  💰 5% profit share for winner
                </div>
                <div style={{ color: '#d1d5db' }}>
                  🚀 Extra 5% bonus for sharing
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}