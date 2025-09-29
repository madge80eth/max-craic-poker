import { Metadata } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://max-craic-poker.vercel.app';

export const metadata: Metadata = {
  title: 'Max Craic Poker - Enter the Draw',
  description: 'Enter the community draw to win 5% of tournament profits',
  openGraph: {
    title: 'Max Craic Poker - Enter the Draw',
    description: 'Enter the community draw to win 5% of tournament profits',
    images: [`${baseUrl}/mcp-frame.png`],
  },
  other: {
    'fc:miniapp': JSON.stringify({
      version: "1",
      imageUrl: `${baseUrl}/mcp-frame.png`,
      button: {
        title: "Enter the Draw",
        action: {
          type: "launch_miniapp",
          name: "Max Craic Poker",
          url: `${baseUrl}/mini-app`,
          splashImageUrl: `${baseUrl}/mcp-logo.png`,
          splashBackgroundColor: "#6B46C1"
        }
      }
    })
  }
};

export default function SharePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #6B46C1 0%, #9333EA 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '24px',
        padding: '48px',
        maxWidth: '600px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          width: '120px',
          height: '120px',
          margin: '0 auto 24px',
          background: '#F5F1E8',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '4px solid #2D2D2D'
        }}>
          <span style={{ fontSize: '60px' }}>♠♥</span>
        </div>
        
        <h1 style={{
          fontSize: '36px',
          fontWeight: '800',
          color: '#2D2D2D',
          marginBottom: '16px'
        }}>
          Max Craic Poker
        </h1>
        
        <p style={{
          fontSize: '18px',
          color: '#666',
          marginBottom: '32px',
          lineHeight: '1.6'
        }}>
          This page is optimized for sharing on Farcaster. Cast this URL to display the interactive frame, or visit the Mini App directly.
        </p>
        
        <a 
          href="/mini-app"
          style={{
            display: 'inline-block',
            background: '#6B46C1',
            color: 'white',
            padding: '16px 32px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: '700',
            fontSize: '18px',
            boxShadow: '0 4px 12px rgba(107, 70, 193, 0.3)'
          }}
        >
          Open Mini App
        </a>
      </div>
    </div>
  );
}