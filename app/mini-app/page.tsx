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

interface Winner {
  place: number;
  walletAddress: string;
  tournament: string;
  tournamentBuyIn: string;
  profitShare: number;
}

export default function MiniApp() {
  const { address, isConnected } = useAccount();
  const [hasEntered, setHasEntered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [streamStartTime, setStreamStartTime] = useState<string>('');
  const [timeUntilStream, setTimeUntilStream] = useState<string>('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [totalEntries, setTotalEntries] = useState(0);

  // CRITICAL: Initialize Farcaster SDK - prevents purple screen hang
  useEffect(() => {
    async function init() {
      try {
        await sdk.context;
        sdk.actions.ready(); // CRITICAL: Prevents Farcaster hang
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
        setStreamStartTime(data.streamStartTime);
      } catch (err) {
        console.error('Failed to load tournaments:', err);
      }
    }
    loadTournaments();
  }, []);

  // Calculate time until stream
  useEffect(() => {
    if (!streamStartTime) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const streamTime = new Date(streamStartTime).getTime();
      const difference = streamTime - now;

      if (difference <= 0) {
        setTimeUntilStream('Stream is live!');
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeUntilStream(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeUntilStream(`${hours}h ${minutes}m`);
      } else {
        setTimeUntilStream(`${minutes}m`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [streamStartTime]);

  // Check winner status
  useEffect(() => {
    async function checkStatus() {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        
        if (data.success && data.winners && data.winners.length > 0) {
          setWinners(data.winners);
          setHasDrawn(true);
        }
        
        setTotalEntries(data.totalEntries || 0);
      } catch (err) {
        console.error('Failed to check status:', err);
      }
    }
    
    checkStatus();
    const interval = setInterval(checkStatus, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Check if current user has entered
  useEffect(() => {
    if (!address) return;

    async function checkEntry() {
      try {
        const response = await fetch(`/api/status?address=${address}`);
        const data = await response.json();
        setHasEntered(data.hasEntered || false);
      } catch (err) {
        console.error('Failed to check entry:', err);
      }
    }

    checkEntry();
  }, [address]);

  const handleEnter = async () => {
    if (!address || hasEntered) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address,
          platform: 'base'
        }),
      });

      const data = await response.json();

      if (data.success) {
        setHasEntered(true);
        setTotalEntries(data.totalEntries);
      } else {
        setError(data.error || 'Failed to enter raffle');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatStreamTime = () => {
    if (!streamStartTime) return '';
    const date = new Date(streamStartTime);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  // Show winners if draw has happened
  if (hasDrawn && winners.length > 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Max Craic</h1>
            <h2 className="text-3xl font-bold">Poker</h2>
            <p className="text-lg text-purple-200">Community-Backed Tournaments</p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-center gap-2 text-2xl font-bold">
              <Trophy className="text-yellow-400" size={32} />
              <span>Winners Announced!</span>
            </div>

            {winners.map((winner) => (
              <div key={winner.place} className="bg-purple-800/50 rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold">#{winner.place}</span>
                  <span className="text-lg font-semibold text-yellow-400">{winner.profitShare}% Profit Share</span>
                </div>
                <div className="text-sm text-purple-200">
                  {winner.walletAddress.slice(0, 6)}...{winner.walletAddress.slice(-4)}
                </div>
                <div className="text-sm">
                  <div className="font-semibold">{winner.tournament}</div>
                  <div className="text-purple-300">Buy-in: {winner.tournamentBuyIn}</div>
                </div>
              </div>
            ))}
          </div>

          <a
            href="https://retake.tv/live/68b58fa755320f51930c9081"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl transition-colors"
          >
            <ExternalLink size={20} />
            Watch Live Stream
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Max Craic</h1>
          <h2 className="text-3xl font-bold">Poker</h2>
          <p className="text-lg text-purple-200">Community-Backed Tournaments</p>
        </div>

        {/* Stream Start Timer */}
        {streamStartTime && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 space-y-3 text-center">
            <div className="flex items-center justify-center gap-2 text-xl font-semibold">
              <Clock size={24} />
              <span>Stream starts in: {timeUntilStream}</span>
            </div>
            <p className="text-sm text-purple-200">{formatStreamTime()}</p>
            <p className="text-xs text-purple-300">Winners announced 30 mins before stream</p>
          </div>
        )}

        {/* Entry Status */}
        {hasEntered ? (
          <div className="bg-green-600/20 border-2 border-green-400 rounded-xl p-6 space-y-3">
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">✅ You're Entered!</div>
              <p className="text-green-200">
                You'll get a 6%, 5%, or 4% share of the community game's profits as a thank you for supporting MCP.
              </p>
              <p className="text-green-200 mt-2">
                Follow along on the live stream!
              </p>
            </div>
            <div className="text-center text-sm text-green-300">
              Total Entries: {totalEntries}
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 space-y-4">
            {!isConnected ? (
              <p className="text-center">Connect your wallet to enter the raffle</p>
            ) : (
              <>
                <p className="text-center text-sm text-purple-200">
                  Enter for a chance to win 6%, 5%, or 4% of tournament profits!
                </p>
                <button
                  onClick={handleEnter}
                  disabled={isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-4 px-6 rounded-xl transition-colors"
                >
                  {isLoading ? 'Entering...' : 'Enter Community Game'}
                </button>
                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}
                <div className="text-center text-sm text-purple-300">
                  Total Entries: {totalEntries}
                </div>
              </>
            )}
          </div>
        )}

        {/* Upcoming Tournaments */}
        {tournaments.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 space-y-4">
            <h3 className="text-2xl font-bold text-center">Upcoming Tournaments</h3>
            <div className="space-y-3">
              {tournaments.map((tournament, index) => (
                <div
                  key={index}
                  className="bg-purple-800/50 rounded-lg p-4 flex justify-between items-center"
                >
                  <span className="font-semibold">{tournament.name}</span>
                  <span className="text-xl text-purple-300">{tournament.buyIn}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}