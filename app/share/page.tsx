import { Metadata } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://max-craic-poker.vercel.app'

// Mini App Embed JSON
const miniAppEmbed = {
  version: "1",
  imageUrl: `${baseUrl}/api/frame-image`,
  button: {
    title: "🎲 Enter the Draw",
    action: {
      type: "launch_miniapp",
      name: "Max Craic Poker",
      url: `${baseUrl}/mini-app`,
      splashImageUrl: `${baseUrl}/mcp-logo.png`,
      splashBackgroundColor: "#4c1d95"
    }
  }
}

export const metadata: Metadata = {
  title: 'Max Craic Poker - Community Game',
  description: 'Join the community raffle! Winner gets 5% of tournament profits + 5% bonus for sharing!',
  openGraph: {
    title: 'Max Craic Poker - Community Game',
    description: 'Join the community raffle! Winner gets 5% of tournament profits + 5% bonus for sharing!',
    images: [`${baseUrl}/api/frame-image`],
  },
  other: {
    // Modern Mini App format
    'fc:miniapp': JSON.stringify(miniAppEmbed),
    // Backward compatibility with Frames v2
    'fc:frame': JSON.stringify({
      ...miniAppEmbed,
      button: {
        ...miniAppEmbed.button,
        action: {
          ...miniAppEmbed.button.action,
          type: "launch_frame" // Some clients expect this
        }
      }
    }),
  },
}

export default function SharePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #4c1d95 0%, #581c87 50%, #7c3aed 100%)',
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
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
          }}
        />

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 0.5rem 0',
            textShadow: '0 4px 8px rgba(0,0,0,0.4)',
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
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
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

          {/* CTA Button */}
          <a 
            href="/mini-app"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.75rem',
              background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '12px',
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: '600',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
              transition: 'all 0.2s ease'
            }}
          >
            🎲 Enter the Draw
          </a>
        </div>
      </div>
    </div>
  )
}