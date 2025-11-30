import { ImageResponse } from 'next/og';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const runtime = 'edge';

export async function GET() {
  try {
    // Fetch tournament data for countdown
    const tournamentsData = await redis.get('tournaments_data') as any;

    // Fetch recent winners
    const winners = await redis.get('raffle_winners') as any[];

    // Calculate time until stream
    let streamCountdown = '';
    let streamDate = '';
    if (tournamentsData?.streamStartTime) {
      const streamStart = new Date(tournamentsData.streamStartTime).getTime();
      const now = Date.now();
      const difference = streamStart - now;

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) {
          streamCountdown = `${days}d ${hours}h`;
        } else if (hours > 0) {
          streamCountdown = `${hours}h`;
        } else {
          streamCountdown = 'Today!';
        }

        streamDate = new Date(tournamentsData.streamStartTime).toLocaleDateString('en-GB', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
      }
    }

    // Get top 3 winners to display
    const topWinners = winners?.slice(0, 3) || [];
    const hasWinners = topWinners.length > 0;

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
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 25%, #4c1d95 50%, #5b21b6 75%, #6d28d9 100%)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Glow effects */}
          <div
            style={{
              position: 'absolute',
              top: '-20%',
              left: '-10%',
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
              filter: 'blur(60px)',
              display: 'flex',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '-20%',
              right: '-10%',
              width: '500px',
              height: '500px',
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)',
              filter: 'blur(60px)',
              display: 'flex',
            }}
          />

          {/* Logo */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                boxShadow: '0 10px 40px rgba(251, 191, 36, 0.5)',
              }}
            >
              ♠
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontSize: '56px',
                  fontWeight: 900,
                  color: 'white',
                  letterSpacing: '-0.05em',
                  lineHeight: 1,
                  textShadow: '0 4px 20px rgba(0,0,0,0.5)',
                  display: 'flex',
                }}
              >
                MAX CRAIC POKER
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              padding: '48px',
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(20px)',
              borderRadius: '32px',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              maxWidth: '900px',
            }}
          >
            <div
              style={{
                fontSize: '42px',
                fontWeight: 700,
                color: 'white',
                textAlign: 'center',
                display: 'flex',
              }}
            >
              Win Real Poker Profits 💰
            </div>

            {/* Stream Countdown */}
            {streamCountdown && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '24px 48px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(139, 92, 246, 0.3) 100%)',
                  borderRadius: '20px',
                  border: '2px solid rgba(147, 197, 253, 0.4)',
                }}
              >
                <div style={{ fontSize: '24px', color: '#bfdbfe', display: 'flex' }}>
                  🔴 Next Stream
                </div>
                <div
                  style={{
                    fontSize: '52px',
                    fontWeight: 900,
                    color: 'white',
                    textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                    display: 'flex',
                  }}
                >
                  {streamCountdown}
                </div>
                <div style={{ fontSize: '20px', color: '#dbeafe', display: 'flex' }}>
                  {streamDate}
                </div>
              </div>
            )}

            {/* Recent Winners */}
            {hasWinners && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  width: '100%',
                }}
              >
                <div
                  style={{
                    fontSize: '28px',
                    fontWeight: 700,
                    color: '#fbbf24',
                    textAlign: 'center',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  🏆 Latest Winners
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {topWinners.map((winner: any, index: number) => {
                    const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
                    return (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '16px 24px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '12px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div style={{ fontSize: '32px', display: 'flex' }}>{emoji}</div>
                          <div style={{ fontSize: '22px', color: '#c7d2fe', fontFamily: 'monospace', display: 'flex' }}>
                            {winner.walletAddress.slice(0, 6)}...{winner.walletAddress.slice(-4)}
                          </div>
                        </div>
                        <div
                          style={{
                            fontSize: '28px',
                            fontWeight: 700,
                            color: '#fbbf24',
                            display: 'flex',
                          }}
                        >
                          {winner.finalPercentage?.toFixed(1) || winner.basePercentage?.toFixed(1)}%
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Call to Action Pills */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginTop: '16px',
              }}
            >
              <div
                style={{
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                  borderRadius: '40px',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'white',
                  boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
                  display: 'flex',
                }}
              >
                Free Entry
              </div>
              <div
                style={{
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '40px',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'white',
                  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)',
                  display: 'flex',
                }}
              >
                Watch Live
              </div>
              <div
                style={{
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: '40px',
                  fontSize: '22px',
                  fontWeight: 700,
                  color: 'white',
                  boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
                  display: 'flex',
                }}
              >
                Paid in USDC
              </div>
            </div>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Frame image generation error:', error);

    // Fallback simple image
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
            background: 'linear-gradient(135deg, #1e1b4b 0%, #5b21b6 100%)',
          }}
        >
          <div style={{ fontSize: '72px', fontWeight: 900, color: 'white', display: 'flex' }}>
            MAX CRAIC POKER
          </div>
          <div style={{ fontSize: '36px', color: '#c7d2fe', marginTop: '24px', display: 'flex' }}>
            Enter the Draw • Win Profits
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  }
}
