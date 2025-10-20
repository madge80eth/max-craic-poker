'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import sdk from '@farcaster/miniapp-sdk';
import { Trophy, Clock, ExternalLink } from 'lucide-react';

interface Tournament {
  name: string;
  buyIn: string;
}

interface TournamentsData {
  streamStartTime: string;
  tournaments: Tournament[];
}

export default function MiniApp() {
  const { address, isConnected } = useAccount();
  const [hasEntered, setHasEntered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [winners, setWinners] = useState<any[]>([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);

  // Initialize SDK
  useEffect(() => {
    async function init() {
      try {
        await sdk.context;
        sdk.actions.ready();
      } catch (err) {
        console.error('SDK init failed:', err);
      }
    }
    init();
  }, []);

  // Load tournaments and stream start time
  useEffect(() => {
    async function loadTournaments() {
      try {
        const response = await fetch('/tournaments.json');
        const data: TournamentsData = await response.json();
        setTournaments(data.tournaments);
        setStreamStartTime(new Date(data.streamStartTime).getTime());
      } catch (err) {
        console.error('Error loading tournaments:', err);
      }
    }
    loadTournaments();
  }, []);

  // Check entry status when wallet connects
  useEffect(() => {
    if (address) {
      checkStatus(address);
    }
  }, [address]);

  // Timer countdown to stream start
  useEffect(() => {
    if (!streamStartTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const difference = streamStartTime - now;

      if (difference > 0) {
        const hours = Math.floor(difference / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });

        // Auto-trigger draw 30 minutes before stream
        const thirtyMinsInMs = 30 * 60 * 1000;
        if (difference <= thirtyMinsInMs && difference > (thirtyMinsInMs - 1000) && !hasDrawn) {
          triggerDraw();
        }
      } else {
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [streamStartTime, hasDrawn]);

  // Poll for winner updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (address) {
        checkStatus(address);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [address]);

  async function checkStatus(walletAddress: string) {
    try {
      const response = await fetch(`/api/status?wallet=${walletAddress}`);
      const data = await response.json();
      
      setHasEntered(data.hasEntered || false);
      setTotalEntries(data.totalEntries || 0);
      
      if (data.winners && data.winners.length > 0) {
        setWinners(data.winners);
        setHasDrawn(true);
      }
    } catch (err) {
      console.error('Error checking status:', err);
    }
  }

  async function triggerDraw() {
    try {
      console.log('Auto-triggering draw 30 mins before stream...');
      const response = await fetch('/api/draw', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setWinners(data.winners);
        setHasDrawn(true);
      }
    } catch (err) {
      console.error('Error triggering draw:', err);
    }
  }

  async function handleEnter() {
    if (!address) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          platform: 'base'
        })
      });

      const data = await response.json();

      if (data.success) {
        setHasEntered(true);
        setTotalEntries(data.totalEntries);
      } else {
        setError(data.message || 'Entry failed');
      }
    } catch (err) {
      setError('Failed to enter raffle');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  const formatStreamTime = () => {
    if (!streamStartTime) return '';
    const date = new Date(streamStartTime);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  // Winner announcement screen
  if (hasDrawn && winners.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <img src="/mcp-logo.png" alt="Max Craic Poker" className="w-20 h-20 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">🎉 WINNER DRAWN! 🎉</h1>
            <p className="text-purple-200 text-sm uppercase tracking-wide">MAX CRAIC POKER</p>
          </div>

          {winners.map((winner, index) => (
            <div key={index} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-4 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Trophy className={`w-8 h-8 ${
                    index === 0 ? 'text-yellow-400' :
                    index === 1 ? 'text-gray-300' :
                    'text-orange-400'
                  }`} />
                  <div>
                    <p className="text-white font-bold text-lg">
                      {index === 0 ? '1st Place' : index === 1 ? '2nd Place' : '3rd Place'}
                    </p>
                    <p className="text-purple-200 text-sm">{winner.walletAddress.slice(0, 6)}...{winner.walletAddress.slice(-4)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{winner.profitShare}%</p>
                  <p className="text-purple-200 text-xs">profit share</p>
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <p className="text-white font-semibold mb-1">Assigned to:</p>
                <p className="text-purple-200">{winner.tournament}</p>
                <p className="text-purple-300 text-sm">Buy-in: {winner.tournamentBuyIn}</p>
              </div>
            </div>
          ))}

          <p className="text-center text-purple-200 text-sm mb-6 px-4">
            If I cash in this tournament, the winner gets {winners[0]?.profitShare}% of the profit + {winners[1]?.profitShare}% + {winners[2]?.profitShare}% as a thank you for supporting MCP.
          </p>

          <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-xl p-6 text-center border-2 border-red-500 shadow-lg">
            <h3 className="text-white font-bold text-xl mb-2">🔴 LIVE ACTION</h3>
            <p className="text-white/90 text-sm mb-4">
              Join the stream to see how the community game unfolds! Chat participants get $MCP airdrops.
            </p>
            <a 
              href="https://warpcast.com/maxcraic" 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white text-red-600 px-6 py-3 rounded-lg font-bold hover:bg-red-50 transition-colors"
            >
              <ExternalLink className="w-5 h-5" />
              Watch Live Stream
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Entry confirmation screen
  if (hasEntered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900 p-6">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <img src="/mcp-logo.png" alt="Max Craic Poker" className="w-20 h-20 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">✅ You're Entered!</h1>
            <p className="text-purple-200 text-sm uppercase tracking-wide">MAX CRAIC POKER</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-purple-300" />
              <div>
                <p className="text-white font-semibold">Stream starts in:</p>
                <p className="text-purple-200 text-sm">{formatStreamTime()}</p>
              </div>
            </div>
            
            <div className="text-center py-4">
              <p className="text-5xl font-bold text-white mb-2">
                {String(timeLeft.hours).padStart(2, '0')}:
                {String(timeLeft.minutes).padStart(2, '0')}:
                {String(timeLeft.seconds).padStart(2, '0')}
              </p>
              <p className="text-purple-300 text-sm">Winners announced 30 mins before stream</p>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <p className="text-white text-center mb-3">
              🎯 <span className="font-semibold">{totalEntries} {totalEntries === 1 ? 'entry' : 'entries'}</span> so far
            </p>
            <p className="text-purple-200 text-sm text-center">
              The winners will get a share of the community game's profits (6%/5%/4%) as a thank you for supporting MCP. Follow along on the live stream!
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Entry screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900 p-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <img src="/mcp-logo.png" alt="Max Craic Poker" className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-2">Community Draw</h1>
          <p className="text-purple-200 text-sm uppercase tracking-wide">MAX CRAIC POKER</p>
        </div>

        {tournaments.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
            <h2 className="text-white font-bold mb-3">Today's Tournaments:</h2>
            <div className="space-y-2">
              {tournaments.map((tournament, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <p className="text-white font-medium text-sm">{tournament.name}</p>
                  <p className="text-purple-300 text-xs">Buy-in: {tournament.buyIn}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="w-6 h-6 text-purple-300" />
            <div>
              <p className="text-white font-semibold">Stream starts:</p>
              <p className="text-purple-200 text-sm">{formatStreamTime()}</p>
            </div>
          </div>
          
          <div className="text-center py-4">
            <p className="text-5xl font-bold text-white mb-2">
              {String(timeLeft.hours).padStart(2, '0')}:
              {String(timeLeft.minutes).padStart(2, '0')}:
              {String(timeLeft.seconds).padStart(2, '0')}
            </p>
            <p className="text-purple-300 text-sm">Winners announced 30 mins before</p>
          </div>
        </div>

        {!isConnected ? (
          <div className="text-center">
            <p className="text-purple-200 mb-4">Connect your wallet to enter the community draw</p>
          </div>
        ) : (
          <>
            <button
              onClick={handleEnter}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {isLoading ? 'Entering...' : 'Enter Draw'}
            </button>

            {error && (
              <p className="text-red-300 text-center text-sm">{error}</p>
            )}

            <p className="text-purple-200 text-xs text-center">
              Winners randomly selected 30 minutes before stream start
            </p>
          </>
        )}
      </div>
    </div>
  );
}