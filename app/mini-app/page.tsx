'use client';

import { useState, useEffect } from 'react';
import { Dice6, Trophy, Clock, Users, DollarSign, ExternalLink, AlertCircle, CheckCircle } from 'lucide-react';
import { useMiniKit } from '@/hooks/useMiniKit';

interface Tournament {
  name: string;
  buyIn: number;
}

interface Entry {
  walletAddress: string;
  platform: string;
  tournament: string;
  tournamentBuyIn: number;
  timestamp: number;
  hasRecasted: boolean;
}

interface Winner {
  walletAddress: string;
  entry: Entry;
  drawnAt: number;
  totalEntries: number;
}

export default function MiniApp() {
  const { 
    isAvailable, 
    isConnected, 
    isConnecting, 
    walletAddress, 
    user, 
    connect, 
    share, 
    error: walletError 
  } = useMiniKit();
  
  const [isEntering, setIsEntering] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [assignedTournament, setAssignedTournament] = useState<Tournament | null>(null);
  const [currentWinner, setCurrentWinner] = useState<Winner | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [totalEntries, setTotalEntries] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const [hasShared, setHasShared] = useState(false);
  
  const [tournaments] = useState<Tournament[]>([
    { name: "Sun Storm", buyIn: 109 },
    { name: "Big $55", buyIn: 55 },
    { name: "Mini Main Event", buyIn: 22 },
    { name: "Bounty Builder", buyIn: 33 },
    { name: "Progressive Knockout", buyIn: 27 },
    { name: "Sunday Million Sat", buyIn: 11 }
  ]);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      checkEntryStatus(walletAddress);
    }
  }, [walletAddress]);

  useEffect(() => {
    if (timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            fetchStatus(); // Check for winner
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timeRemaining]);

  const checkEntryStatus = async (address: string) => {
    try {
      const response = await fetch(`/api/status?address=${address}`);
      const data = await response.json();
      
      if (data.hasEntered && data.userEntry) {
        setHasEntered(true);
        setAssignedTournament(data.tournament);
        setHasShared(data.userEntry.hasRecasted);
      }
    } catch (error) {
      console.error('Failed to check entry status:', error);
    }
  };

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      
      if (data.winner) {
        setCurrentWinner(data.winner);
      }
      
      if (data.timeRemaining !== undefined) {
        setTimeRemaining(data.timeRemaining);
      }
      
      if (data.totalEntries !== undefined) {
        setTotalEntries(data.totalEntries);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const enterRaffle = async () => {
    if (!isConnected) {
      await connect();
      return;
    }

    setIsEntering(true);
    setError('');
    
    try {
      const response = await fetch('/api/enter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          platform: 'miniapp',
          userProfile: user
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setHasEntered(true);
        setAssignedTournament(result.tournament);
        setTotalEntries(result.totalEntries);
        fetchStatus(); // Refresh status
      } else {
        setError(result.error || 'Entry failed');
      }
    } catch (error) {
      console.error('Entry failed:', error);
      setError('Failed to enter raffle. Please try again.');
    } finally {
      setIsEntering(false);
    }
  };

  const shareToFarcaster = async () => {
    try {
      const shareText = `Just entered the Max Craic Poker raffle! 🎰 Win 5% of tournament profits + 5% bonus for sharing.`;
      const embedUrl = `${window.location.origin}/share`;
      
      const shared = await share(shareText, embedUrl);
      
      if (shared) {
        // Update entry to mark as shared for bonus
        await fetch('/api/enter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress,
            platform: 'miniapp',
            hasRecasted: true,
            userProfile: user
          }),
        });
        setHasShared(true);
        setError('');
      }
    } catch (error) {
      console.error('Sharing failed:', error);
      setError('Sharing failed. Please try again.');
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-purple-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Dice6 className="w-8 h-8 text-yellow-400" />
            <h1 className="text-3xl font-bold">Max Craic Poker</h1>
          </div>
          <p className="text-blue-200">Community-backed tournaments. Real profit sharing.</p>
        </div>

        {/* Wallet Connection */}
        {!isConnected ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6 text-center">
            <h2 className="text-xl font-semibold mb-4">Connect Your Wallet</h2>
            <p className="text-gray-300 mb-6">
              {isAvailable 
                ? "Connect with Coinbase Wallet to enter the raffle and win tournament profits"
                : "This app works best in Coinbase Wallet. You can still participate with limited features."
              }
            </p>
            {(walletError || error) && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-sm text-red-300">{walletError || error}</p>
              </div>
            )}
            <button
              onClick={connect}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
            {!isAvailable && (
              <p className="text-xs text-gray-400 mt-2">
                For full functionality, open in Coinbase Wallet app
              </p>
            )}
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-300">Connected Wallet</p>
                <p className="font-mono">{formatAddress(walletAddress)}</p>
                {user && (
                  <p className="text-sm text-blue-300">@{user.username || user.displayName}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-green-400">Connected</span>
              </div>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="bg-white/5 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-400">{totalEntries}</p>
              <p className="text-sm text-gray-300">Total Entries</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">5-10%</p>
              <p className="text-sm text-gray-300">Profit Share</p>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6 text-center">
          <div className="flex justify-center items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold">Draw Countdown</h3>
          </div>
          <div className="text-3xl font-mono font-bold text-yellow-400">
            {formatTime(timeRemaining)}
          </div>
          {timeRemaining <= 0 && (
            <p className="text-green-400 mt-2">Draw complete! Check results below.</p>
          )}
        </div>

        {/* Winner Announcement */}
        {currentWinner && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h3 className="text-xl font-bold">🎉 Winner Announced!</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-300">Winning Address</p>
                <p className="font-mono">{formatAddress(currentWinner.walletAddress)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-300">Tournament</p>
                <p className="font-semibold">{currentWinner.entry.tournament}</p>
              </div>
              <div>
                <p className="text-sm text-gray-300">Buy-in</p>
                <p className="font-semibold">${currentWinner.entry.tournamentBuyIn}</p>
              </div>
              <div>
                <p className="text-sm text-gray-300">Total Entries</p>
                <p className="font-semibold">{currentWinner.totalEntries}</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-white/10 rounded-lg">
              <p className="text-sm font-semibold text-yellow-400">Potential Payout:</p>
              <p className="text-sm text-gray-300">
                5% of tournament profit + 5% bonus if shared = up to 10% of winnings!
              </p>
            </div>
          </div>
        )}

        {/* Entry Section */}
        {isConnected && !hasEntered && timeRemaining > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4 text-center">Enter the Raffle</h3>
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              {tournaments.map((tournament, index) => (
                <div key={index} className="bg-white/10 rounded-lg p-3 text-center">
                  <p className="font-semibold text-sm">{tournament.name}</p>
                  <p className="text-blue-300">${tournament.buyIn}</p>
                </div>
              ))}
            </div>
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <DollarSign className="w-5 h-5 text-green-400" />
                <span className="font-semibold">Win 5% of Profits + 5% Share Bonus</span>
              </div>
              <p className="text-sm text-gray-300">
                You'll be randomly assigned to one tournament. If it cashes, you get paid!
              </p>
            </div>
            <button
              onClick={enterRaffle}
              disabled={isEntering}
              className="w-full bg-green-600 hover:bg-green-700 py-3 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isEntering ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Entering...
                </>
              ) : (
                'Enter Raffle (Free)'
              )}
            </button>
          </div>
        )}

        {/* Assigned Tournament */}
        {hasEntered && assignedTournament && (
          <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-6 h-6 text-green-400" />
              <h3 className="text-xl font-bold">You're In!</h3>
            </div>
            <div className="text-center mb-4">
              <p className="text-lg font-semibold">{assignedTournament.name}</p>
              <p className="text-green-300">Buy-in: ${assignedTournament.buyIn}</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4 mb-4">
              <h4 className="font-semibold mb-2">Your Potential Winnings:</h4>
              <ul className="text-sm space-y-1">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                  5% of tournament profit (if cashed)
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                  {hasShared ? (
                    <span className="text-green-400">✓ +5% bonus earned for sharing</span>
                  ) : (
                    "+5% bonus if you share (10% total)"
                  )}
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                  Paid in USDC to your wallet
                </li>
              </ul>
            </div>
            {!hasShared && (
              <button
                onClick={shareToFarcaster}
                className="w-full bg-purple-600 hover:bg-purple-700 py-2 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Share for 5% Bonus
              </button>
            )}
            {hasShared && (
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-400 font-semibold">Bonus Earned!</span>
                </div>
                <p className="text-sm text-green-300 mt-1">
                  You now qualify for 10% total profit share if you win!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Connect Wallet CTA for non-connected users */}
        {!isConnected && timeRemaining > 0 && (
          <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-6 mb-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Ready to Win Real Money?</h3>
            <p className="text-gray-300 mb-4">
              Connect your wallet to enter the raffle and compete for tournament profits
            </p>
            <button
              onClick={connect}
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect & Enter'}
            </button>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-white/5 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            How It Works
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">1</span>
              <p>Enter the free raffle and get assigned a random tournament</p>
            </div>
            <div className="flex gap-3">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">2</span>
              <p>Max plays poker live on stream in your tournament</p>
            </div>
            <div className="flex gap-3">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">3</span>
              <p>If the tournament profits, you win 5% + 5% sharing bonus</p>
            </div>
            <div className="flex gap-3">
              <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs">4</span>
              <p>Get paid directly to your wallet in USDC</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}