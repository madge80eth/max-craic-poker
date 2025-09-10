'use client'

import React, { useState, useEffect } from 'react'
import { Clock, Trophy, Users, ExternalLink } from 'lucide-react'

const MiniApp = () => {
  const [timeLeft, setTimeLeft] = useState(43200)
  const [isEntered, setIsEntered] = useState(false)
  const [totalEntries, setTotalEntries] = useState(0)
  const [winner, setWinner] = useState<any>(null)
  const [walletConnected, setWalletConnected] = useState(false)
  const [userAddress, setUserAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [tournaments, setTournaments] = useState([])

  useEffect(() => {
    fetch('/tournaments.json')
      .then(res => res.json())
      .then(data => setTournaments(data))
      .catch(err => console.error('Failed to load tournaments:', err))
  }, [])

  // CHECK FOR WINNER IMMEDIATELY ON PAGE LOAD
  useEffect(() => {
    checkWinner()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          checkWinner()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const checkWinner = async () => {
    try {
      const response = await fetch('/api/status')
      
      if (!response.ok) {
        console.log('Status API returned error:', response.status)
        return
      }
      
      const data = await response.json()
      
      if (data.winner) {
        setWinner(data.winner)
      }
      setTotalEntries(data.totalEntries || 0)
    } catch (error) {
      console.error('Error checking winner:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleConnectWallet = () => {
    const mockAddress = '0x742d35Cc6634C0532925a3b8D91D21d3025c1'
    setWalletConnected(true)
    setUserAddress(mockAddress)
  }

  const handleEnterRaffle = async () => {
    if (!walletConnected) {
      handleConnectWallet()
      return
    }
    
    setLoading(true)
    try {
      const response = await fetch('/api/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userAddress,
          platform: 'base'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsEntered(true)
        setTotalEntries(prev => prev + 1)
      } else {
        alert(data.error || 'Entry failed')
      }
    } catch (error) {
      console.error('Entry error:', error)
      alert('Entry failed')
    }
    setLoading(false)
  }

  if (winner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="mb-4">
              <img 
                src="/mcp-logo.png" 
                alt="Max Craic Poker Logo" 
                style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                className="mx-auto"
              />
            </div>
            <h1 className="text-2xl font-bold mb-1">WINNER DRAWN!</h1>
            <div className="text-red-400 font-bold text-sm mb-2">MAX CRAIC POKER</div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-6">
            <div className="text-center">
              <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">
                {winner.walletAddress ? 
                  `${winner.walletAddress.slice(0, 6)}...${winner.walletAddress.slice(-4)}` : 
                  'Winner'
                }
              </h2>
              <p className="text-gray-300 mb-4">
                Assigned to: <span className="text-purple-300 font-semibold">
                  {winner.entry?.tournament || winner.tournament || 'Random Tournament'}
                </span>
              </p>
              <div className="text-sm text-gray-400">
                If I cash in this tournament, the winner gets 5% of the profit + 5% bonus for sharing the post!
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-500/20 to-purple-500/20 rounded-xl p-6 border border-red-300/30">
            <h3 className="text-lg font-bold mb-2 text-center">LIVE ACTION</h3>
            <p className="text-sm text-center mb-4 text-gray-300">
              Join the stream to see how the community game unfolds! 
              Chat participants get $MCP airdrops.
            </p>
            <button
              onClick={() => window.open('https://twitch.tv/maxcraic', '_blank')}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Watch Live Stream
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="mb-4">
            <img 
              src="/mcp-logo.png" 
              alt="Max Craic Poker Logo" 
              style={{ width: '80px', height: '80px', objectFit: 'contain' }}
              className="mx-auto"
            />
          </div>
          <h1 className="text-2xl font-bold mb-1">MAX CRAIC</h1>
          <div className="text-red-400 font-bold text-lg mb-2">POKER</div>
          <p className="text-purple-200 text-sm">Community-Rewarded Poker</p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 mb-6">
          <div className="text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-purple-300" />
            <h2 className="text-lg font-semibold mb-1">Draw in:</h2>
            <div className="text-3xl font-bold text-purple-300 font-mono">
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Today's Tournaments
          </h3>
          <div className="space-y-2">
            {tournaments.slice(0, 6).map((tournament, index) => (
              <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{tournament.name}</div>
                  </div>
                  <div className="text-purple-300 font-semibold">
                    {tournament.buyIn}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-300/30 mb-4">
          <div className="text-center mb-4">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-300" />
            <h3 className="text-lg font-bold">Join the Community Game</h3>
            <p className="text-sm text-gray-300 mt-1">
              One winner gets 5% of tournament profits + 5% bonus for sharing!
            </p>
          </div>
          
          {!walletConnected ? (
            <button
              onClick={handleConnectWallet}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Connect Wallet to Enter
            </button>
          ) : isEntered ? (
            <div className="text-center">
              <div className="bg-green-500/20 border border-green-300/30 rounded-lg p-4 mb-3">
                <div className="text-green-300 font-semibold">You're entered!</div>
                <div className="text-sm text-gray-300">Good luck! Winner drawn at countdown end.</div>
              </div>
            </div>
          ) : (
            <button
              onClick={handleEnterRaffle}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Entering...' : 'Enter Raffle'}
            </button>
          )}
        </div>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
            <Users className="h-4 w-4" />
            {totalEntries} entries • Draw at countdown end
          </p>
        </div>
      </div>
    </div>
  )
}

export default MiniApp