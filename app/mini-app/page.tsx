'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect } from 'wagmi';
import Image from 'next/image';
import { sdk } from '@farcaster/miniapp-sdk';

interface Tournament {
  name: string;
  buyIn: string;
}

export default function MiniApp() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [hasEntered, setHasEntered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [winnerData, setWinnerData] = useState<any>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [drawTime, setDrawTime] = useState<number | null>(null);

  // Call ready() to dismiss splash screen
  useEffect(() => {
    const initMiniApp = async () => {
      try {
        await sdk.actions.ready();
      } catch (error) {
        console.log('Not in miniapp context:', error);
      }
    };
    initMiniApp();
  }, []);

  // Auto-connect wallet for Farcaster
  useEffect(() => {
    if (!isConnected && connectors.length > 0) {
      connect({ connector: connectors[0] });
    }
  }, [isConnected, connect, connectors]);

  useEffect(() => {
    async function fetchDrawTime() {
      try {
        const response = await fetch('/api/reset');
        const data = await response.json();
        if (data.drawTime) {
          setDrawTime(data.drawTime);
        }
      } catch (error) {
        console.error('Error fetching draw time:', error);
      }
    }
    fetchDrawTime();
  }, []);

  useEffect(() => {
    async function fetchTournaments() {
      try {
        const response = await fetch('/tournaments.json');
        const data = await response.json();
        setTournaments(data);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      }
    }
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (!drawTime) return;
    const interval = setInterval(() => {
      const now = Date.now();
      const difference = drawTime - now;
      if (difference <= 0) {
        setTimeLeft(0);
        clearInterval(interval);
      } else {
        setTimeLeft(Math.floor(difference / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [drawTime]);

  useEffect(() => {
    async function checkWinner() {
      try {
        const response = await fetch('/api/status');
        const data = await response.json();
        if (data.winner) {
          setWinnerData(data.winner);
        }
      } catch (error) {
        console.error('Error checking winner:', error);
      }
    }
    checkWinner();
    const interval = setInterval(checkWinner, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (timeLeft === 0 && !winnerData) {
      handleDraw();
    }
  }, [timeLeft, winnerData]);

  const handleEnter = async () => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch('/api/enter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          platform: 'base',
        }),
      });
      const data = await response.json();
      if (data.success) {
        setHasEntered(true);
      } else {
        alert(data.message || 'Entry failed');
      }
    } catch (error) {
      console.error('Error entering raffle:', error);
      alert('Entry failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDraw = async () => {
    try {
      const response = await fetch('/api/draw', { method: 'POST' });
      const data = await response.json();
      if (data.winner) {
        setWinnerData(data.winner);
      }
    } catch (error) {
      console.error('Error drawing winner:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  if (winnerData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-6">
          <div className="text-center">
            <Image src="/mcp-logo.png" alt="Max Craic Poker" width={80} height={80} className="mx-auto mb-4" />
            <h1 className="text-4xl font-bold text-white mb-2">WINNER DRAWN!</h1>
            <p className="text-red-400 text-xl font-semibold">MAX CRAIC POKER</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-8 border border-white/20">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🏆</div>
              <div className="text-2xl font-mono text-white mb-2">{winnerData.walletAddress.slice(0, 6)}...{winnerData.walletAddress.slice(-4)}</div>
              <p className="text-xl text-blue-300">Assigned to: {winnerData.communityTournament}</p>
            </div>
            <p className="text-center text-white/80 text-sm">If I cash in this tournament, the winner gets 5% of the profit + 5% bonus for sharing the post!</p>
          </div>
          <div className="bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">LIVE ACTION</h2>
            <p className="text-white/90 mb-4 text-center">Come join us on the stream to see how the community game unfolds!</p>
            <a href="https://retake.tv/live/68b58fa755320f51930c9081" target="_blank" rel="noopener noreferrer" className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg text-center transition-colors">Watch Live Stream</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6 pt-8">
        <div className="text-center">
          <Image src="/mcp-logo.png" alt="Max Craic Poker" width={80} height={80} className="mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">Max Craic Poker</h1>
          <p className="text-blue-300 text-lg">Community-Backed Tournament Draw</p>
        </div>
        {timeLeft !== null && timeLeft > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20 text-center">
            <p className="text-white/80 mb-2">Draw happens in:</p>
            <p className="text-4xl font-bold text-white">{formatTime(timeLeft)}</p>
          </div>
        )}
        {!hasEntered && tournaments.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4 text-center">Tonight's Tournaments</h2>
            <p className="text-white/80 mb-4 text-center text-sm">Enter the draw and get randomly assigned to one of these tournaments. If I cash, you win 5% of profit + 5% bonus for sharing!</p>
            <div className="grid grid-cols-2 gap-3">
              {tournaments.map((tournament, index) => (
                <div key={index} className="bg-white/5 border border-white/20 rounded-lg p-3 text-center">
                  <p className="text-white font-semibold text-sm">{tournament.name}</p>
                  <p className="text-blue-300 text-lg font-bold">{tournament.buyIn}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {!hasEntered ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <div className="text-center mb-4">
              {isConnected && address ? (
                <>
                  <p className="text-white/80 mb-2">Connected Wallet:</p>
                  <p className="text-white font-mono text-sm">{address.slice(0, 6)}...{address.slice(-4)}</p>
                </>
              ) : (
                <p className="text-white/80">Connecting wallet...</p>
              )}
            </div>
            <button onClick={handleEnter} disabled={isLoading || !isConnected} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-lg transition-all">{isLoading ? 'Entering...' : 'Enter the Draw'}</button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 border border-white/20 text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-white mb-2">You're Entered!</h2>
              <p className="text-white/90">You'll be randomly assigned to a tournament when the draw happens. Good luck!</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-3 text-center">Join the Action</h3>
              <p className="text-white/80 mb-4 text-center text-sm">Come join us on the stream to see how the community game unfolds!</p>
              <a href="https://retake.tv/live/68b58fa755320f51930c9081" target="_blank" rel="noopener noreferrer" className="block w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-center transition-colors">Watch Live Stream</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}