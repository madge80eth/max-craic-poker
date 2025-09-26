import Link from 'next/link'
import { ArrowRight, Trophy, Users } from 'lucide-react'

export default function HomePage() {
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
            width: '100px',
            height: '100px',
            marginBottom: '2rem',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
          }}
        />

        {/* Header */}
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '4rem',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 0.5rem 0',
            textShadow: '0 4px 8px rgba(0,0,0,0.4)',
            lineHeight: '1'
          }}>
            MAX CRAIC
          </h1>
          <p style={{
            fontSize: '2rem',
            color: '#ff6b6b',
            margin: '0 0 1.5rem 0',
            fontWeight: '600'
          }}>
            POKER
          </p>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.25rem',
            margin: '0',
            fontWeight: '400'
          }}>
            Community-Rewarded Poker
          </p>
        </div>

        {/* Feature Cards - Only 2 like in reference */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem',
          width: '100%',
          marginBottom: '3rem'
        }}>
          {/* Real Profit Sharing */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <Trophy size={40} color="#ffd700" style={{ marginBottom: '1rem' }} />
            <h3 style={{
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: '600',
              margin: '0 0 0.75rem 0'
            }}>
              Real Profit Sharing
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.9rem',
              margin: '0',
              lineHeight: '1.4'
            }}>
              Winners get 5% of tournament profits + 5% bonus for sharing
            </p>
          </div>

          {/* Community Driven */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <Users size={40} color="#64b5f6" style={{ marginBottom: '1rem' }} />
            <h3 style={{
              color: 'white',
              fontSize: '1.1rem',
              fontWeight: '600',
              margin: '0 0 0.75rem 0'
            }}>
              Community Driven
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.9rem',
              margin: '0',
              lineHeight: '1.4'
            }}>
              Audience becomes stakeholders, not just spectators
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          width: '100%',
          maxWidth: '400px'
        }}>
          <Link href="/mini-app" style={{ textDecoration: 'none' }}>
            <button style={{
              background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
              color: 'white',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)'
            }}>
              Launch Mini App
              <ArrowRight size={18} />
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}