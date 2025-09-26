'use client';

import { useState, useEffect } from 'react';
import { Dice6, Trophy, Clock, Users, DollarSign, ExternalLink, CheckCircle } from 'lucide-react';

interface Tournament {
  name: string;
  buyIn: string;
}

interface WinnerData {
  walletAddress: string;
  entry: {
    tournament: string;
    tournamentBuyIn: string;
  };
  totalEntries: number;
}

export default function MiniApp() {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [hasEntered, setHasEntered] = useState(false);
  const [userEntry, setUserEntry] = useState<any>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [winner, setWinner] = useState<WinnerData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

  // Load tournaments
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

  // Countdown timer
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
          } else {
            // Timer expired, check for winner
            checkForWinner();
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

  // Check for winner when component mounts or timer expires
  const checkForWinner = async () => {
    try {
      const response = await fetch('/api/status');
      if (response.ok) {
        const data = await response.json();
        if (data.winner) {
          setWinner(data.winner);
        }
      }
    } catch (error) {
      console.error('Error checking for winner:', error);
    }
  };

  // Check user status when wallet connected
  useEffect(() => {
    if (isConnected && walletAddress) {
      checkUserStatus();
    }
  }, [isConnected, walletAddress]);

  const checkUserStatus = async () => {
    try {
      const response = await fetch(`/api/status?address=${walletAddress}`);
      if (response.ok) {
        const data = await response.json();
        setHasEntered(data.hasEntered);
        setUserEntry(data.userEntry);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  const connectWallet = async () => {
    setIsLoading(true);
    try {
      // Mock wallet connection
      await new Promise(resolve => setTimeout(resolve, 2000));
      setWalletAddress('0x742d35Cc6564C5532C3C1e5329A8C0d3f1e90F43');
      setIsConnected(true);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const enterRaffle = async () => {
    if (!isConnected) return;
    
    setIsLoading(true);
    try {
      const response = await fetch('/api/enter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          platform: 'mini-app',
          hasRecasted: false
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setHasEntered(true);
        setUserEntry(result.entry);
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to enter raffle');
      }
    } catch (error) {
      console.error('Error entering raffle:', error);
      alert('Error entering raffle');
    } finally {
      setIsLoading(false);
    }
  };

  // Winner announcement screen
  if (winner) {
    const isWinner = winner.walletAddress === walletAddress;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Trophy className="h-8 w-8 text-yellow-400" />
              <h1 className="text-3xl font-bold text-white">Winner Announcement</h1>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-8 border border-purple-300/30 mb-6">
            <div className="text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
              {isWinner ? (
                <h2 className="text-2xl font-bold text-green-400 mb-4">🎉 You Won! 🎉</h2>
              ) : (
                <h2 className="text-2xl font-bold text-white mb-4">Winner Selected!</h2>
              )}
              
              <div className="bg-black/30 rounded-lg p-4 mb-6">
                <p className="text-gray-300 text-sm mb-2">Winner Address:</p>
                <p className="text-yellow-400 font-mono text-lg">{winner.walletAddress}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-gray-300 text-sm">Tournament</p>
                  <p className="text-white font-semibold">{winner.entry.tournament}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-gray-300 text-sm">Buy-in</p>
                  <p className="text-white font-semibold">{winner.entry.tournamentBuyIn}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-gray-300 text-sm">Total Entries</p>
                  <p className="text-white font-semibold">{winner.totalEntries}</p>
                </div>
              </div>

              {isWinner && (
                <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4 mb-6">
                  <p className="text-green-300 text-sm">
                    If this tournament cashes, you'll receive 5% of the profit + 5% bonus for sharing!
                  </p>
                </div>
              )}

              <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Watch Live Stream
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

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

        {/* Entry Status */}
        {hasEntered && userEntry ? (
          <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-6 border border-green-300/30 mb-6">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-3 text-green-400" />
              <h3 className="text-xl font-bold text-green-400 mb-2">You're Entered!</h3>
              <div className="bg-black/30 rounded-lg p-4">
                <p className="text-gray-300 text-sm">Tournament: <span className="text-white font-semibold">{userEntry.tournament}</span></p>
                <p className="text-gray-300 text-sm">Buy-in: <span className="text-purple-300 font-semibold">{userEntry.tournamentBuyIn}</span></p>
                <p className="text-gray-300 text-sm mt-2">
                  If this tournament cashes, you'll win 5% of profits + 5% bonus for sharing!
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Wallet Connection */}
            {!isConnected ? (
              <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-300/30 mb-6">
                <div className="text-center">
                  <Users className="h-8 w-8 mx-auto mb-3 text-blue-300" />
                  <h3 className="text-xl font-bold text-white mb-2">Connect Wallet</h3>
                  <p className="text-gray-300 text-sm mb-4">Connect your wallet to enter the community raffle</p>
                  <button 
                    onClick={connectWallet}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                  >
                    {isLoading ? 'Connecting...' : 'Connect Wallet (Mock)'}
                  </button>
                </div>
              </div>
            ) : (
              /* Entry Form */
              <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl p-6 border border-purple-300/30 mb-6">
                <div className="text-center">
                  <Trophy className="h-8 w-8 mx-auto mb-3 text-purple-300" />
                  <h3 className="text-xl font-bold text-white mb-2">Enter Raffle</h3>
                  <div className="bg-black/30 rounded-lg p-3 mb-4">
                    <p className="text-gray-300 text-sm">Connected: <span className="text-purple-300 font-mono text-xs">{walletAddress}</span></p>
                  </div>
                  <p className="text-gray-300 text-sm mb-4">You'll be randomly assigned to one tournament. Winner gets 5% profit + 5% bonus for sharing!</p>
                  <button 
                    onClick={enterRaffle}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                  >
                    {isLoading ? 'Entering...' : 'Enter Community Raffle'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Tournaments Display */}
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
      </div>
    </div>
  );
}