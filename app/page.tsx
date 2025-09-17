'use client';

import { useState, useEffect } from 'react';
import { Play, Trophy, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Tournament {
  name: string;
  buyIn: string;
}

export default function Homepage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [totalEntries, setTotalEntries] = useState<number>(0);

  useEffect(() => {
    loadTournaments();
    checkGeneralStatus();
    
    const interval = setInterval(checkGeneralStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadTournaments = async () => {
    try {
      const response = await fetch('/tournaments.json');
      const data = await response.json();
      setTournaments(data);
    } catch (error) {
      console.error('Failed to load tournaments:', error);
    }
  };

  const checkGeneralStatus = async () => {
    try {
      const response = await fetch('/api/enter');
      const data = await response.json();
      
      if (data.success) {
        setTotalEntries(data.totalEntries);
        
        if (data.timeRemaining > 0) {
          const hours = Math.floor(data.timeRemaining / 3600);
          const minutes = Math.floor((data.timeRemaining % 3600) / 60);
          const seconds = data.timeRemaining % 60;
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeRemaining('Draw complete!');
        }
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-purple-600 rounded-full flex items-center justify-center">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MAX CRAIC</h1>
          <p className="text-purple-600 font-semibold">POKER</p>
          <p className="text-gray-600 mt-2">Community-Rewarded Tournaments</p>
        </div>

        {/* How It Works */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
          <h2 className="text-lg font-semibold mb-4">How It Works</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <p>Enter the free raffle and get assigned a random tournament</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <p>One winner is randomly selected after the countdown</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <p>If Max cashes in your tournament, you get 5% of profits + 5% sharing bonus!</p>
            </div>
          </div>
        </div>

        {/* Tournament List */}
        {tournaments.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Play className="w-5 h-5 mr-2 text-purple-600" />
              Today's Tournaments ({tournaments.length})
            </h3>
            <div className="space-y-3">
              {tournaments.map((tournament, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                  <span className="font-medium text-sm">{tournament.name}</span>
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                    {tournament.buyIn}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{totalEntries}</p>
              <p className="text-sm text-gray-600">Total Entries</p>
            </div>
            <div className="text-center">
              <Clock className="w-6 h-6 mx-auto mb-1 text-orange-500" />
              <p className="text-sm font-mono text-orange-600">{timeRemaining || 'Loading...'}</p>
              <p className="text-sm text-gray-600">Until Draw</p>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 rounded-xl text-white text-center">
          <h3 className="text-xl font-bold mb-2">Ready to Enter?</h3>
          <p className="mb-4 opacity-90">Connect your wallet and join today's draw!</p>
          <Link 
            href="/mini-app"
            className="inline-flex items-center gap-2 bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Enter Raffle
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}