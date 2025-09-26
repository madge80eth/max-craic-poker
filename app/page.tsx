'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Dice6, Trophy, Clock, Users, DollarSign, ExternalLink, ArrowRight } from 'lucide-react';

interface Tournament {
  name: string;
  buyIn: string;
}

export default function Homepage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('/tournaments.json');
        const data: Tournament[] = await response.json();
        setTournaments(data);
      } catch (error) {
        console.error('Error loading tournaments:', error);
      }
    };

    fetchTournaments();
  }, []);

  useEffect(() => {
    const fetchCountdown = async () => {
      try {
        const response = await fetch('/api/countdown');
        if (response.ok) {
          const data = await response.json();
          if (data.timeLeft > 0) {
            const hours = Math.floor(data.timeLeft / 3600);
            const minutes = Math.floor((data.timeLeft % 3600) / 60);
            const seconds = data.timeLeft % 60;
            setTimeLeft({ hours, minutes, seconds });
          }
        }
      } catch (error) {
        console.error('Error fetching countdown:', error);
      }
    };

    fetchCountdown();
    const interval = setInterval(fetchCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #663399 0%, #4c1d95 50%, #312e81 100%)'
    }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Dice6 className="h-8 w-8 text-purple-300" />
            <h1 className="text-3xl font-bold text-white">Max Craic Poker</h1>
          </div>
          <p className="text-gray-300 text-lg">Community-backed tournament play</p>
        </div>

        {/* Countdown */}
        {timeLeft && (
          <div className="mb-6" style={{
            background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2) 0%, rgba(239, 68, 68, 0.2) 100%)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(251, 146, 60, 0.3)'
          }} className="rounded-xl p-4 border">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-orange-300" />
                <h3 className="text-lg font-semibold text-white">Draw in:</h3>
              </div>
              <div className="text-2xl font-bold text-orange-300">
                {String(timeLeft.hours).padStart(2, '0')}:
                {String(timeLeft.minutes).padStart(2, '0')}:
                {String(timeLeft.seconds).padStart(2, '0')}
              </div>
            </div>
          </div>
        )}

        {/* Tournaments */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-white">
            <Trophy className="h-5 w-5" />
            Today's Tournaments
          </h3>
          <div className="space-y-2">
            {tournaments.slice(0, 6).map((tournament, index) => (
              <div key={index} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }} className="rounded-lg p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-white">{tournament.name}</div>
                  </div>
                  <div className="text-purple-300 font-semibold">
                    {tournament.buyIn}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(147, 51, 234, 0.3)'
        }} className="rounded-xl p-6 mb-4">
          <div className="text-center mb-4">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-300" />
            <h3 className="text-lg font-bold text-white">Community Game</h3>
            <p className="text-sm text-gray-300 mt-1">
              Join the raffle! Winner gets 5% of tournament profits + 5% bonus for sharing!
            </p>
          </div>
          
          <Link href="/mini-app">
            <button style={{
              background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)'
            }} className="w-full hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-opacity flex items-center justify-center gap-2">
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