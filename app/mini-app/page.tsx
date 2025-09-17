'use client';

import { useState, useEffect } from 'react';
import { Users, Clock, Trophy, Wallet, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface UserEntry {
  walletAddress: string;
  platform: string;
  timestamp: number;
}

interface Winner {
  walletAddress: string;
  communityTournament: string;
  tournamentBuyIn: number;
  drawnAt: number;
  totalEntries: number;
}

// Mock wallet hook
function useMockWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  
  const mockAddress = "0x742d35Cc6564C5532C3C1e5329A8C0d3f1e90F43";
  
  const connect = async () => {
    setIsConnecting(true);
    setTimeout(() => {
      setAddress(mockAddress);
      setIsConnected(true);
      setIsConnecting(false);
    }, 1000);
  };

  return {
    address,
    isConnected,
    isConnecting,
    connect,
    platform: 'mock' as const
  };
}

export default function MiniApp() {
  const [userEntry, setUserEntry] = useState<UserEntry | null>(null);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [isEntering, setIsEntering] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [totalEntries, setTotalEntries] = useState<number>(0);
  const [error, setError] = useState<string>('');

  const { address, isConnected, isConnecting, connect, platform } = useMockWallet();

  useEffect(() => {
    if (isConnected && address) {
      checkUserStatus();
    }
    
    const interval = setInterval(() => {
      if (address) checkUserStatus();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [address, isConnected]);

  const checkUserStatus = async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`/api/status?address=${encodeURIComponent(address)}`);
      const data = await response.json();
      
      if (data.success) {
        setUserEntry(data.userEntry);
        setWinner(data.winner);
        setTotalEntries(data.totalEntries);
        
        if (data.timeRemaining > 0) {
          const hours = Math.floor(data.timeRemaining / 3600);
          const minutes = Math.floor((data.timeRemaining % 3600) / 60);
          const seconds = data.timeRemaining % 60;
          setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
        } else {
          setTimeRemaining('Draw complete!');
        }
      } else {
        setError(data.error || 'Failed to check status');
      }
    } catch (error) {
      console.error('Status check failed:', error);
      setError('Network error - please try again');
    }
  };

  const enterRaffle = async () => {
    if (!address) return;
    
    setIsEntering(true);
    setError('');
    
    try {
      const response = await fetch('/api/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          platform: platform,
          hasRecasted: false
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh status to get updated entry
        setTimeout(checkUserStatus, 500);
      } else {
        setError(data.error || 'Failed to enter raffle');
      }
    } catch (error) {
      console.error('Entry failed:', error);
      setError('Network error - please try again');
    } finally {
      setIsEntering(false);
    }
  };

  // Show winner screen if there's a winner
  if (winner) {
    const isUserWinner = winner.walletAddress === address;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-purple-600 mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          
          <div className={`p-8 rounded-xl border-2 text-center ${isUserWinner ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'}`}>
            <Trophy className={`w-16 h-16 mx-auto mb-4 ${isUserWinner ? 'text-yellow-500' : 'text-gray-400'}`} />
            
            {isUserWinner ? (
              <>
                <h1 className="text-2xl font-bold text-yellow-800 mb-2">🎉 YOU WON! 🎉</h1>
                <p className="text-yellow-700 mb-4">
                  You won the community draw!
                </p>
                <div className="bg-yellow-100 p-4 rounded-lg mb-4">
                  <p className="text-lg font-bold text-yellow-900 mb-2">Community Tournament:</p>
                  <p className="text-xl font-bold text-yellow-800">{winner.communityTournament}</p>
                  <p className="text-sm text-yellow-700 mt-2">${winner.tournamentBuyIn} buy-in</p>
                </div>
                <div className="bg-yellow-200 p-3 rounded-lg">
                  <p className="text-sm text-yellow-800 font-semibold">
                    If Max cashes in this tournament, you'll receive:
                  </p>
                  <p className="text-lg font-bold text-yellow-900 mt-1">
                    5% of profits + 5% sharing bonus!
                  </p>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-800 mb-2">Draw Complete</h1>
                <p className="text-gray-600 mb-4">Better luck next time!</p>
                <div className="bg-gray-100 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-700">Winner:</p>
                  <p className="font-mono text-xs break-all text-gray-800">{winner.walletAddress}</p>
                  <p className="text-lg font-bold text-gray-900 mt-2">Community Tournament:</p>
                  <p className="text-xl font-bold text-gray-800">{winner.communityTournament}</p>
                  <p className="text-sm text-gray-600">${winner.tournamentBuyIn} buy-in</p>
                </div>
              </>
            )}
            
            <p className="text-sm text-gray-600">
              Total entries: {winner.totalEntries}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-purple-600 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-purple-600 rounded-full flex items-center justify-center">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MAX CRAIC POKER</h1>
          <p className="text-gray-600 mt-2">Enter the Community Draw</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Wallet Section */}
        {!isConnected ? (
          <div className="bg-white p-6 rounded-xl border border-gray-200 text-center mb-6">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-purple-600" />
            <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
            <p className="text-gray-600 mb-4">Mock wallet for testing</p>
            <button
              onClick={connect}
              disabled={isConnecting}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect Mock Wallet'}
            </button>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Connected Wallet</h3>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                Mock
              </span>
            </div>
            <p className="text-gray-600 font-mono text-sm break-all">{address}</p>
          </div>
        )}

        {/* Entry Status or Entry Form */}
        {userEntry ? (
          <div className="bg-green-50 p-6 rounded-xl border border-green-200 mb-6">
            <h3 className="text-lg font-semibold text-green-800 mb-3 flex items-center">
              <Trophy className="w-5 h-5 mr-2" />
              You're Entered!
            </h3>
            <div className="bg-white/50 p-4 rounded-lg mb-4">
              <p className="text-green-800 text-center font-medium">
                You're in the community draw!
              </p>
              <p className="text-green-700 text-sm text-center mt-1">
                Winner and tournament will be selected when the countdown ends.
              </p>
            </div>
            <p className="text-sm text-green-600 text-center">Good luck!</p>
          </div>
        ) : isConnected ? (
          <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
            <div className="text-center mb-4">
              <Users className="w-12 h-12 mx-auto mb-4 text-purple-600" />
              <h3 className="text-lg font-semibold mb-2">Enter the Community Draw</h3>
              <p className="text-gray-600 mb-4">
                One winner gets 5% of tournament profits + 5% bonus for sharing!
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Winner and community tournament selected randomly after countdown.
              </p>
            </div>
            <button
              onClick={enterRaffle}
              disabled={isEntering}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
            >
              {isEntering ? 'Entering...' : 'Enter Draw (Free)'}
            </button>
          </div>
        ) : null}

        {/* Stats */}
        <div className="bg-white p-6 rounded-xl border border-gray-200">
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
      </div>
    </div>
  );
}