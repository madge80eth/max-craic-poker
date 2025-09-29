import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #4c1d95 0%, #581c87 50%, #7c3aed 100%)',
            padding: '60px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
            <div
              style={{
                fontSize: '80px',
                fontWeight: '700',
                color: 'white',
                margin: '0 0 16px 0',
                textAlign: 'center',
                textShadow: '0 4px 8px rgba(0,0,0,0.4)'
              }}
            >
              MAX CRAIC
            </div>
            <div
              style={{
                fontSize: '40px',
                color: '#ff6b6b',
                margin: '0 0 16px 0',
                fontWeight: '600'
              }}
            >
              POKER
            </div>
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '28px',
                margin: '0'
              }}
            >
              Community-Rewarded Tournament
            </div>
          </div>

          {/* Main Card */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '24px',
              padding: '50px',
              width: '700px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            <div
              style={{
                fontSize: '100px',
                marginBottom: '30px',
                color: '#ffd700'
              }}
            >
              ★
            </div>
            <div
              style={{
                color: 'white',
                fontSize: '36px',
                fontWeight: '600',
                margin: '0 0 24px 0'
              }}
            >
              Join the Community Game
            </div>
            <div
              style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '24px',
                margin: '0',
                lineHeight: '1.5'
              }}
            >
              Winner gets 5% of profits + 5% sharing bonus
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.log(`Error: ${e.message}`)
    return new Response(`Failed to generate image`, {
      status: 500,
    })
  }
}