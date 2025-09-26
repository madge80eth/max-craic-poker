import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Max Craic Poker - Community Game',
  description: 'Join the community raffle! Winner gets 5% of tournament profits + 5% bonus for sharing!',
  openGraph: {
    title: 'Max Craic Poker - Community Game',
    description: 'Join the community raffle! Winner gets 5% of tournament profits + 5% bonus for sharing!',
    images: ['/api/frame-image'],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': `${process.env.NEXT_PUBLIC_BASE_URL}/api/frame-image`,
    'fc:frame:button:1': 'Enter Community Game',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': `${process.env.NEXT_PUBLIC_BASE_URL}/mini-app`,
    'fc:frame:button:2': 'View Results',
    'fc:frame:button:2:action': 'link', 
    'fc:frame:button:2:target': `${process.env.NEXT_PUBLIC_BASE_URL}/mini-app`,
  },
}

export default function SharePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '600px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        {/* Logo */}
        <img 
          src="/mcp-logo.png" 
          alt="Max Craic Poker" 
          style={{
            width: '80px',
            height: '80px',
            marginBottom: '2rem',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
          }}
        />

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 0.5rem 0',
            textShadow: '0 4px 8px rgba(0,0,0,0.3)',
            lineHeight: '1'
          }}>
            MAX CRAIC
          </h1>
          <p style={{
            fontSize: '1.75rem',
            color: '#ff6b6b',
            margin: '0 0 1rem 0',
            fontWeight: '600'
          }}>
            POKER
          </p>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.1rem',
            margin: '0',
            fontWeight: '400'
          }}>
            Community-Rewarded Poker
          </p>
        </div>

        {/* Main Frame Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '24px',
          padding: '3rem',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          marginBottom: '2rem'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1.5rem'
          }}>
            🏆
          </div>
          <h2 style={{
            color: 'white',
            fontSize: '1.75rem',
            fontWeight: '600',
            margin: '0 0 1.5rem 0'
          }}>
            Community Game
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.1rem',
            margin: '0 0 2rem 0',
            lineHeight: '1.4'
          }}>
            Join the raffle! Winner gets 5% of tournament profits + 5% bonus for sharing!
          </p>
          
          {/* Mock Frame Preview */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '16px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.9rem',
              margin: '0 0 1rem 0'
            }}>
              Farcaster Frame Preview
            </p>
            <div style={{
              background: 'rgba(102, 126, 234, 0.2)',
              borderRadius: '8px',
              padding: '1rem',
              fontSize: '0.9rem',
              color: 'white',
              marginBottom: '1rem'
            }}>
              Frame displays here in Farcaster feeds
            </div>
          </div>

          {/* CTA Button */}
          <a 
            href="/mini-app"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '12px',
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: '600',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.2s ease'
            }}
          >
            Enter Community Game →
          </a>
        </div>

        {/* Instructions */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          padding: '2rem',
          width: '100%',
          marginBottom: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
        }}>
          <h3 style={{
            color: 'white',
            fontSize: '1.25rem',
            fontWeight: '600',
            margin: '0 0 1rem 0'
          }}>
            How to Share
          </h3>
          <div style={{
            textAlign: 'left',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.95rem',
            lineHeight: '1.5'
          }}>
            <p style={{ margin: '0 0 0.75rem 0' }}>
              <strong>1.</strong> Copy this page URL and cast it in Farcaster
            </p>
            <p style={{ margin: '0 0 0.75rem 0' }}>
              <strong>2.</strong> Your followers will see the interactive Frame
            </p>
            <p style={{ margin: '0' }}>
              <strong>3.</strong> They can enter the raffle directly from their feed
            </p>
          </div>
        </div>

        {/* Technical Info */}
        <div style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '0.85rem',
          textAlign: 'center',
          lineHeight: '1.4'
        }}>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            Built on Farcaster Frame + Base Mini App architecture
          </p>
          <p style={{ margin: '0' }}>
            Demonstrating practical Web3 utility beyond speculation
          </p>
        </div>
      </div>
    </div>
  )
}