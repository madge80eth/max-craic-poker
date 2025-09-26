import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const winner = searchParams.get('winner')
    const tournament = searchParams.get('tournament') 
    const timeLeft = searchParams.get('timeLeft')

    // Default state - show entry page
    if (!winner) {
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
              fontFamily: 'system-ui'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '50px' }}>
              <h1
                style={{
                  fontSize: '72px',
                  fontWeight: '700',
                  color: 'white',
                  margin: '0 0 16px 0',
                  textAlign: 'center',
                  textShadow: '0 4px 8px rgba(0,0,0,0.4)'
                }}
              >
                MAX CRAIC
              </h1>
              <p
                style={{
                  fontSize: '32px',
                  color: '#ff6b6b',
                  margin: '0 0 20px 0',
                  fontWeight: '600'
                }}
              >
                POKER
              </p>
              <p
                style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '24px',
                  margin: '0'
                }}
              >
                Community-Rewarded Poker
              </p>
            </div>

            {/* Main Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '24px',
                padding: '50px',
                width: '600px',
                textAlign: 'center',
                marginBottom: '40px'
              }}
            >
              <div
                style={{
                  fontSize: '48px',
                  marginBottom: '20px'
                }}
              >
                🏆
              </div>
              <h2
                style={{
                  color: 'white',
                  fontSize: '32px',
                  fontWeight: '600',
                  margin: '0 0 20px 0'
                }}
              >
                Community Game
              </h2>
              <p
                style={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '20px',
                  margin: '0 0 30px 0',
                  lineHeight: '1.4'
                }}
              >
                Join the raffle! Winner gets 5% of tournament profits + 5% bonus for sharing!
              </p>
            </div>

            {/* CTA */}
            <div
              style={{
                background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
                color: 'white',
                borderRadius: '16px',
                padding: '20px 40px',
                fontSize: '24px',
                fontWeight: '600',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
            >
              Enter the Draw →
            </div>
          </div>
        ),
        {
          width: 1200,
          height: 630,
        }
      )
    }

    // Winner announced state
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
            fontFamily: 'system-ui'
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '50px' }}>
            <h1
              style={{
                fontSize: '56px',
                fontWeight: '700',
                color: 'white',
                margin: '0 0 16px 0',
                textAlign: 'center',
                textShadow: '0 4px 8px rgba(0,0,0,0.4)'
              }}
            >
              WINNER DRAWN!
            </h1>
            <p
              style={{
                fontSize: '28px',
                color: '#ff6b6b',
                margin: '0',
                fontWeight: '600'
              }}
            >
              MAX CRAIC POKER
            </p>
          </div>

          {/* Winner Card */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '24px',
              padding: '50px',
              width: '600px',
              textAlign: 'center',
              marginBottom: '30px'
            }}
          >
            <div
              style={{
                fontSize: '64px',
                marginBottom: '20px'
              }}
            >
              🏆
            </div>
            <h2
              style={{
                fontSize: '36px',
                fontWeight: '600',
                color: 'white',
                margin: '0 0 16px 0'
              }}
            >
              {winner}
            </h2>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.8)',
                margin: '0 0 24px 0',
                fontSize: '22px'
              }}
            >
              Assigned to: <strong>{tournament}</strong>
            </p>
            <p
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                margin: '0',
                fontSize: '18px',
                lineHeight: '1.4'
              }}
            >
              If I cash in this tournament, the winner gets 5% of the profit + 5% bonus for sharing!
            </p>
          </div>

          {/* Live Action CTA */}
          <div
            style={{
              background: '#ff4757',
              color: 'white',
              borderRadius: '16px',
              padding: '20px 40px',
              fontSize: '24px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            🔴 Watch Live Stream
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    )
  } catch (e: any) {
    console.log(`${e.message}`)
    return new Response(`Failed to generate the image`, {
      status: 500,
    })
  }
}