'use client'

import React, { useState, useEffect } from 'react'
import { Clock, Trophy, Users, ArrowRight, ExternalLink } from 'lucide-react'

interface Tournament {
  name: string
  buyIn: number
}

interface Entry {
  walletAddress: string
  platform: string
  tournament: string
  tournamentBuyIn: number
  timestamp: string
  hasRecasted: boolean
}

interface Winner {
  walletAddress: string
  entry: Entry
  drawnAt: string
  totalEntries: number
}

export default function MiniApp() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [hasEntered, setHasEntered] = useState(false)
  const [entry, setEntry] = useState<Entry | null>(null)
  const [winner, setWinner] = useState<Winner | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(43200) // 12 hours default
  const [loading, setLoading] = useState(false)

  // Mock wallet address for testing
  const walletAddress = '0x742d35Cc6634C0532925a3b8c'

  useEffect(() => {
    loadTournaments()
    checkStatus()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (!winner) {
            drawWinner()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [winner])

  const loadTournaments = async () => {
    try {
      const response = await fetch('/tournaments.json')
      const data = await response.json()
      setTournaments(data.tournaments)
    } catch (error) {
      console.error('Failed to load tournaments:', error)
    }
  }

  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/status?wallet=${walletAddress}`)
      const data = await response.json()
      
      if (data.hasEntered) {
        setHasEntered(true)
        setEntry(data.entry)
      }
      
      if (data.winner) {
        setWinner(data.winner)
      }
      
      if (data.timeLeft) {
        setTimeLeft(data.timeLeft)
      }
    } catch (error) {
      console.error('Failed to check status:', error)
    }
  }

  const enterRaffle = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          platform: 'farcaster'
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setHasEntered(true)
        setEntry(data.entry)
        setTimeLeft(data.timeLeft)
      }
    } catch (error) {
      console.error('Failed to enter raffle:', error)
    } finally {
      setLoading(false)
    }
  }

  const drawWinner = async () => {
    try {
      const response = await fetch('/api/draw', { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        setWinner(data.winner)
      }
    } catch (error) {
      console.error('Failed to draw winner:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatWallet = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Winner Screen
  if (winner) {
    return (
      <div 
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #4c1d95 0%, #581c87 50%, #7c3aed 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        <img 
          src="/mcp-logo.png" 
          alt="Max Craic Poker" 
          style={{
            width: '80px',
            height: '80px',
            marginBottom: '2rem',
            borderRadius: '12px'
          }}
        />

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 0.5rem 0',
            textShadow: '0 4px 8px rgba(0,0,0,0.4)'
          }}>
            WINNER DRAWN!
          </h1>
          <p style={{
            fontSize: '1.25rem',
            color: '#ff6b6b',
            margin: '0',
            fontWeight: '600'
          }}>
            MAX CRAIC POKER
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          marginBottom: '2rem'
        }}>
          <Trophy size={48} color="#ffd700" style={{ marginBottom: '1rem' }} />
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: 'white',
            margin: '0 0 0.5rem 0'
          }}>
            {formatWallet(winner.walletAddress)}
          </h2>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            margin: '0 0 1.5rem 0',
            fontSize: '1rem'
          }}>
            Assigned to: <strong>{winner.entry.tournament}</strong>
          </p>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            margin: '0',
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }}>
            If I cash in this tournament, the winner gets 5% of the profit + 5% bonus for sharing the post!
          </p>
        </div>

        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          padding: '2rem',
          width: '100%',
          maxWidth: '400px',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: 'white',
            margin: '0 0 1rem 0'
          }}>
            LIVE ACTION
          </h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            margin: '0 0 1.5rem 0',
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }}>
            Join the stream to see how the community game unfolds! Chat participants get $MCP airdrops.
          </p>
          <button style={{
            background: '#ff4757',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '1rem 2rem',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(255, 71, 87, 0.4)'
          }}>
            <ExternalLink size={18} />
            Watch Live Stream
          </button>
        </div>
      </div>
    )
  }

  // Main Raffle Screen with inline styles to force application
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
        maxWidth: '500px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <img 
          src="/mcp-logo.png" 
          alt="Max Craic Poker" 
          style={{
            width: '80px',
            height: '80px',
            marginBottom: '2rem',
            borderRadius: '12px'
          }}
        />

        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
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
            margin: '0',
            fontSize: '1.1rem'
          }}>
            Community-Rewarded Poker
          </p>
        </div>

        {/* Countdown Timer */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          padding: '2rem',
          width: '100%',
          textAlign: 'center',
          marginBottom: '2rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
          <Clock size={32} color="white" style={{ marginBottom: '1rem' }} />
          <p style={{
            color: 'white',
            fontSize: '1.1rem',
            margin: '0 0 1rem 0',
            fontWeight: '500'
          }}>
            Next Draw in:
          </p>
          <div style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: 'white',
            fontFamily: 'monospace',
            textShadow: '0 2px 4px rgba(0,0,0,0.4)'
          }}>
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* Tournaments List */}
        <div style={{ width: '100%', marginBottom: '2rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '1.5rem'
          }}>
            <Trophy size={24} color="white" />
            <h2 style={{
              color: 'white',
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: '0'
            }}>
              Today's Tournaments
            </h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tournaments.map((tournament, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)'
                }}
              >
                <span style={{
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '500'
                }}>
                  {tournament.name}
                </span>
                <span style={{
                  color: '#64b5f6',
                  fontSize: '1rem',
                  fontWeight: '600'
                }}>
                  ${tournament.buyIn}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Entry Status */}
        {hasEntered && entry ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            padding: '2rem',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              background: 'rgba(76, 175, 80, 0.2)',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                color: '#4caf50',
                fontSize: '1rem',
                fontWeight: '600',
                margin: '0'
              }}>
                ✓ Entry Confirmed!
              </p>
            </div>
            <p style={{
              color: 'white',
              fontSize: '1rem',
              margin: '0 0 0.5rem 0'
            }}>
              Your wallet: <strong>{formatWallet(entry.walletAddress)}</strong>
            </p>
            <p style={{
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.9rem',
              margin: '0'
            }}>
              You'll be randomly assigned to one of today's tournaments when the draw happens!
            </p>
          </div>
        ) : (
          <div style={{
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            padding: '2rem',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }}>
            <Users size={32} color="white" style={{ marginBottom: '1rem' }} />
            <h3 style={{
              color: 'white',
              fontSize: '1.25rem',
              fontWeight: '600',
              margin: '0 0 1rem 0'
            }}>
              Community Game
            </h3>
            <p style={{
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.95rem',
              margin: '0 0 2rem 0',
              lineHeight: '1.4'
            }}>
              Join the raffle! Winner gets 5% of tournament profits + 5% bonus for sharing!
            </p>
            <button
              onClick={enterRaffle}
              disabled={loading}
              style={{
                background: loading 
                  ? 'rgba(255, 255, 255, 0.2)' 
                  : 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)',
                color: 'white',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '12px',
                padding: '1rem 2rem',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.4)',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Entering...' : (
                <>
                  Enter the Draw
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}