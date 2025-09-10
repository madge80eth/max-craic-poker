'use client'

import React, { useState, useEffect } from 'react'
import { Clock, Trophy, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const Homepage = () => {
  const [timeLeft, setTimeLeft] = useState(43200)
  const [tournaments, setTournaments] = useState([])

  useEffect(() => {
    fetch('/tournaments.json')
      .then(res => res.json())
      .then(data => setTournaments(data))
      .catch(err => console.error('Failed to load tournaments:', err))
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
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
            <h2 className="text-lg font-semibold mb-1">Next Draw in:</h2>
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
            <h3 className="text-lg font-bold">Community Game</h3>
            <p className="text-sm text-gray-300 mt-1">
              Join the raffle! Winner gets 5% of tournament profits + 5% bonus for sharing!
            </p>
          </div>
          
          <Link href="/mini-app">
            <button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
              Enter Community Game
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-400">
            Click above to join the community raffle in our Mini App!
          </p>
        </div>
      </div>
    </div>
  )
}

export default Homepage