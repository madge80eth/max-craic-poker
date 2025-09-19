'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, Trophy, Users, ExternalLink, ArrowLeft } from 'lucide-react'

const MiniApp = () => {
  const [timeLeft, setTimeLeft] = useState(43200)
  const [isEntered, setIsEntered] = useState(false)
  const [totalEntries, setTotalEntries] = useState(0)
  const [winner, setWinner] = useState(null)
  const [walletConnected, setWalletConnected] = useState(false)
  const [userAddress, setUserAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [tournaments, setTournaments] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/tournaments.json')
      .then(res => res.json())
      .then(data => setTournaments(data))
      .catch(err => console.error('Failed to load tournaments:', err))
  }, [])

  // CHECK FOR WINNER IMMEDIATELY ON PAGE LOAD - CRITICAL FIX
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
      const data = await response.json()
      
      if (data.success && data.hasWinner && data.winner) {
        setWinner(data.winner)
        setTotalEntries(data.totalEntries || 0)
      } else {
        setTotalEntries(data.totalEntries || 0)
      }
    } catch (error) {
      console.error('Failed to check winner:', error)
    }
  }

  const handleConnectWallet = () => {
    setLoading(true)
    setTimeout(() => {
      setWalletConnected(true)
      setUserAddress('0x742d35Cc6564C5532C3C1e5329A8C0d3f1e90F43')
      setLoading(false)
    }, 2000)
  }

  const handleEnterRaffle = async () => {
    if (!userAddress) return
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: userAddress,
          platform: 'miniapp',
          hasRecasted: false
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setIsEntered(true)
        setTimeout(checkWinner, 500)
      } else {
        setError(data.error || 'Failed to enter raffle')
      }
    } catch (error) {
      console.error('Entry failed:', error)
      setError('Network error - please try again')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // WINNER SCREEN - Beautiful purple gradient design
  if (winner) {
    const isUserWinner = winner.walletAddress === userAddress
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
        <div className="max-w-md mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-purple-300 mb-6 hover:text-purple-200">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20 text-center mb-6">
            <Trophy className={`w-16 h-16 mx-auto mb-4 ${isUserWinner ? 'text-yellow-400' : 'text-purple-300'}`} />
            
            {isUserWinner ? (
              <>
                <h1 className="text-3xl font-bold text-yellow-300 mb-2">🎉 YOU WON! 🎉</h1>
                <p className="text-yellow-200 mb-4">You won the community draw!</p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-purple-200 mb-2">WINNER DRAWN!</h1>
                <p className="text-purple-300 mb-4">The community has a winner!</p>
              </>
            )}
            
            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <h2 className="text-lg font-bold mb-2">
                {isUserWinner ? 'Your Address' : 'Winner'}
              </h2>
              <p className="font-mono text-sm text-purple-200">
                {winner.walletAddress ? 
                  `${winner.walletAddress.slice(0, 6)}...${winner.walletAddress.slice(-4)}` : 
                  'Winner'
                }
              </p>
              <p className="text-purple-300 mt-3">
                Community Tournament: <span className="text-white font-semibold">
                  {winner.communityTournament || 'Tournament Selected'}
                </span>
              </p>
              {winner.tournamentBuyIn && (
                <p className="text-sm text-purple-400 mt-1">
                  ${winner.tournamentBuyIn} buy-in
                </p>
              )}
            </div>

            <div className="text-sm text-purple-200 bg-white/5 rounded-lg p-3">
              <p className="font-semibold mb-1">
                {isUserWinner ? "If Max cashes in this tournament, you'll receive:" : "Winner receives:"}
              </p>
              <p className="text-lg font-bold text-purple-100">
                5% of profits + 5% sharing bonus!
              </p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-red-500/20 to-purple-500/20 rounded-xl p-6 border border-red-300/30">
            <h3 className="text-lg font-bold mb-2 text-center">🔴 LIVE ACTION</h3>
            <p className="text-sm text-center mb-4 text-gray-300">
              Join the stream to see how the community tournament unfolds! 
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

  // ENTRY SCREEN - Only show if no winner
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
      <div className="max-w-md mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-purple-300 mb-6 hover:text-purple-200">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

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
          <p className="text-purple-200 text-sm">Community-Backed Tournaments</p>
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

        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-300/30 mb-6">
          <div className="text-center mb-4">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-300" />
            <h3 className="text-lg font-bold">Join the Community Draw</h3>
            <p className="text-sm text-gray-300 mt-1">
              One winner gets 5% of tournament profits + 5% bonus for sharing!
            </p>
          </div>
          
          {error && (
            <div className="bg-red-500/20 border border-red-300/30 rounded-lg p-3 mb-4 text-center">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
          
          {!walletConnected ? (
            <button
              onClick={handleConnectWallet}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect Wallet to Enter'}
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
              {loading ? 'Entering...' : 'Enter Today\'s Draw'}
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