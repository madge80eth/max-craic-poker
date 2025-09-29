'use client'

import { useEffect, useState } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'

export default function MiniApp() {
  const [isSDKLoaded, setIsSDKLoaded] = useState(false)

  useEffect(() => {
    const initSDK = async () => {
      try {
        await sdk.actions.ready()
        setIsSDKLoaded(true)
      } catch (error) {
        console.error('SDK initialization failed:', error)
        setIsSDKLoaded(true) // Still show app even if SDK fails
      }
    }

    initSDK()
  }, [])

  return (
    <div 
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #4c1d95 0%, #581c87 50%, #7c3aed 100%)',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div style={{
        maxWidth: '600px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <img 
            src="/mcp-logo.png" 
            alt="Max Craic Poker" 
            style={{
              width: '80px',
              height: '80px',
              margin: '0 auto 1rem',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
            }}
          />
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 0.5rem 0',
            textShadow: '0 4px 8px rgba(0,0,0,0.4)'
          }}>
            MAX CRAIC
          </h1>
          <p style={{
            fontSize: '1.5rem',
            color: '#ff6b6b',
            margin: '0 0 1rem 0',
            fontWeight: '600'
          }}>
            POKER
          </p>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.1rem'
          }}>
            Community-Rewarded Poker
          </p>
        </div>

        {/* Countdown Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '24px',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <h2 style={{
            color: 'white',
            fontSize: '1.5rem',
            fontWeight: '600',
            margin: '0 0 1rem 0'
          }}>
            Next Draw in:
          </h2>
          <div style={{
            fontSize: '3rem',
            fontWeight: '700',
            color: '#ff6b6b',
            marginBottom: '1rem'
          }}>
            00:00:00
          </div>
        </div>

        {/* Info Card */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '24px',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <div style={{
            fontSize: '3rem',
            marginBottom: '1rem'
          }}>
            🏆
          </div>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '1.1rem',
            lineHeight: '1.6',
            margin: '0'
          }}>
            Join the raffle! Winner gets 5% of tournament profits + 5% bonus for sharing!
          </p>
        </div>

        {/* Entry Button */}
        <button
          style={{
            background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
            color: 'white',
            fontSize: '1.25rem',
            fontWeight: '600',
            padding: '1.25rem 2rem',
            borderRadius: '12px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(124, 58, 237, 0.6)'
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.4)'
          }}
        >
          Enter the Draw →
        </button>

        {/* SDK Status (for debugging) */}
        {!isSDKLoaded && (
          <div style={{
            background: 'rgba(255, 193, 7, 0.15)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.9rem'
          }}>
            Loading SDK...
          </div>
        )}
      </div>
    </div>
  )
}