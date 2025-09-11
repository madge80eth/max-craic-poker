// app/mini-app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { base } from 'wagmi/chains'
import { coinbaseWallet } from 'wagmi/connectors'
import dynamic from 'next/dynamic'

interface Tournament {
  name: string
  buyIn: string
}

interface Entry {
  walletAddress: string
  platform: string
  tournament: string
  tournamentBuyIn: string
  timestamp: string
  hasRecasted: boolean
}

interface Winner {
  walletAddress: string
  entry: Entry
  drawnAt: string
  totalEntries: number
}

function MiniAppContent() {
  const { address, isConnected } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [hasEntered, setHasEntered] = useState(false)
  const [entry, setEntry] = useState<Entry | null>(null)
  const [winner, setWinner] = useState<Winner | null>(null)
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  // Load tournaments on mount
  useEffect(() => {
    fetch('/tournaments.json')
      .then(res => res.json())
      .then(data => setTournaments(data.tournaments))
      .catch(err => console.error('Failed to load tournaments:', err))
  }, [])

  // Check entry status when wallet connects
  useEffect(() => {
    if (address) {
      checkEntryStatus()
      checkWinnerStatus()
      getTimeLeft()
    }
  }, [address])

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = prev - 1
          if (newTime <= 0) {
            checkWinner()
          }
          return Math.max(0, newTime)
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [timeLeft])

  const connectWallet = () => {
    connect({ 
      connector: coinbaseWallet({
        appName: 'Max Craic Poker',
        appLogoUrl: `${window.location.origin}/mcp-logo.png`
      }),
      chainId: base.id
    })
  }

  const checkEntryStatus = async () => {
    if (!address) return
    
    try {
      const response = await fetch(`/api/status?wallet=${address}`)
      const data = await response.json()
      
      if (data.hasEntered) {
        setHasEntered(true)
        setEntry(data.entry)
      }
    } catch (error) {
      console.error('Error checking entry status:', error)
    }
  }

  const checkWinnerStatus = async () => {
    try {
      const response = await fetch('/api/status')
      const data = await response.json()
      
      if (data.winner) {
        setWinner(data.winner)
      }
    } catch (error) {
      console.error('Error checking winner status:', error)
    }
  }

  const getTimeLeft = async () => {
    try {
      const response = await fetch('/api/status')
      const data = await response.json()
      setTimeLeft(data.timeLeft || 0)
    } catch (error) {
      console.error('Error getting time left:', error)
    }
  }

  const checkWinner = async () => {
    try {
      const response = await fetch('/api/draw', { method: 'POST' })
      const data = await response.json()
      
      if (data.winner) {
        setWinner(data.winner)
      }
    } catch (error) {
      console.error('Error checking winner:', error)
    }
  }

  const enterRaffle = async () => {
    if (!address) return
    
    setLoading(true)
    
    // Select random tournament
    const randomTournament = tournaments[Math.floor(Math.random() * tournaments.length)]
    
    try {
      const response = await fetch('/api/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          platform: 'base',
          tournament: randomTournament.name,
          tournamentBuyIn: randomTournament.buyIn,
          hasRecasted: false
        })
      })

      const data = await response.json()
      
      if (data.success) {
        setHasEntered(true)
        setEntry(data.entry)
      } else {
        alert('Failed to enter raffle. Please try again.')
      }
    } catch (error) {
      console.error('Error entering raffle:', error)
      alert('Error entering raffle. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Winner announcement screen
  if (winner) {
    const isWinner = address && winner.walletAddress.toLowerCase() === address.toLowerCase()
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="bg-black/30 backdrop-blur-lg rounded-3xl p-8 border border-white/10">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-white mb-6">
                🎉 Winner Drawn! 🎉
              </h1>
              
              {isWinner ? (
                <div className="space-y-4">
                  <div className="text-6xl">🏆</div>
                  <h2 className="text-2xl font-bold text-yellow-400">
                    Congratulations! You Won!
                  </h2>
                  <p className="text-white">
                    Tournament: <span className="font-semibold">{winner.entry.tournament}</span>
                  </p>
                  <p className="text-white">
                    Buy-in: <span className="font-semibold">{winner.entry.tournamentBuyIn}</span>
                  </p>
                  <p className="text-sm text-gray-300">
                    If Max cashes in this tournament, you'll receive 5% of the profit in USDC!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-4xl">🎲</div>
                  <h2 className="text-xl text-white">
                    Winner Selected
                  </h2>
                  <p className="text-white">
                    Tournament: <span className="font-semibold">{winner.entry.tournament}</span>
                  </p>
                  <p className="text-white">
                    Buy-in: <span className="font-semibold">{winner.entry.tournamentBuyIn}</span>
                  </p>
                  <p className="text-sm text-gray-300">
                    Better luck next time! Follow Max's stream to see the results.
                  </p>
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-xs text-gray-400">
                  Total Entries: {winner.totalEntries}
                </p>
                <p className="text-xs text-gray-400">
                  Drawn: {new Date(winner.drawnAt).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-md mx-auto pt-8">
        <div className="bg-black/30 backdrop-blur-lg rounded-3xl p-8 border border-white/10">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Max Craic Poker</h1>
            <p className="text-gray-300 text-sm">Community-backed tournament play</p>
          </div>

          {/* Wallet Connection */}
          {!isConnected ? (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-white mb-4">Connect your wallet to enter the raffle</p>
                <button
                  onClick={connectWallet}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
                >
                  Connect Wallet
                </button>
              </div>
            </div>
          ) : hasEntered ? (
            /* Already Entered */
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-green-400 mb-4">You're In!</h2>
                
                {entry && (
                  <div className="bg-white/10 rounded-xl p-4 mb-6">
                    <p className="text-white font-semibold">{entry.tournament}</p>
                    <p className="text-gray-300 text-sm">Buy-in: {entry.tournamentBuyIn}</p>
                  </div>
                )}

                {timeLeft > 0 ? (
                  <div className="space-y-4">
                    <p className="text-white">Draw in:</p>
                    <div className="text-3xl font-mono text-yellow-400">
                      {formatTime(timeLeft)}
                    </div>
                    <p className="text-sm text-gray-300">
                      Winner gets 5% of tournament profit if Max cashes!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-white">Drawing winner...</p>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
                  </div>
                )}
              </div>

              <button
                onClick={() => disconnect()}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors text-sm"
              >
                Disconnect Wallet
              </button>
            </div>
          ) : (
            /* Enter Raffle */
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-white mb-4">
                  Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
                </p>

                {timeLeft > 0 ? (
                  <div className="space-y-4 mb-6">
                    <p className="text-white">Draw in:</p>
                    <div className="text-2xl font-mono text-yellow-400">
                      {formatTime(timeLeft)}
                    </div>
                  </div>
                ) : (
                  <p className="text-red-400 mb-6">Raffle has ended</p>
                )}

                <div className="bg-white/10 rounded-xl p-4 mb-6">
                  <h3 className="text-white font-semibold mb-2">Today's Tournaments:</h3>
                  <div className="space-y-1">
                    {tournaments.map((tournament, index) => (
                      <div key={index} className="text-sm text-gray-300">
                        {tournament.name} - {tournament.buyIn}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={enterRaffle}
                  disabled={loading || timeLeft <= 0}
                  className={`w-full font-semibold py-3 px-6 rounded-xl transition-colors ${
                    loading || timeLeft <= 0
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {loading ? 'Entering...' : timeLeft <= 0 ? 'Raffle Ended' : 'Enter Raffle'}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Win 5% of tournament profit if Max cashes!
                </p>
              </div>

              <button
                onClick={() => disconnect()}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors text-sm"
              >
                Disconnect Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Dynamic import to prevent SSR issues
const MiniApp = dynamic(() => Promise.resolve(MiniAppContent), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-md mx-auto pt-8">
        <div className="bg-black/30 backdrop-blur-lg rounded-3xl p-8 border border-white/10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading...</p>
          </div>
        </div>
      </div>
    </div>
  )
})

export default MiniApp