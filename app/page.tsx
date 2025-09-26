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
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
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
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-xl p-4 mb-6 border border-orange-300/30">
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
              <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
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
        <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-300/30 mb-4">
          <div className="text-center mb-4">
            <Users className="h-8 w-8 mx-auto mb-2 text-blue-300" />
            <h3 className="text-lg font-bold text-white">Community Game</h3>
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