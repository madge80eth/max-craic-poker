'use client';

import { useAccount, useConnect } from 'wagmi';
import { useState, useEffect } from 'react';
import { Wallet, Ticket } from 'lucide-react';
import Link from 'next/link';
import Madge from '../components/Madge';
import CardHand from '../components/CardHand';

type GameState = 'welcome' | 'dealing' | 'result' | 'already_played';

interface HandResult {
  cards: string[];
  handRank: string;
  rankValue: number;
  placement: number;
  totalUsers: number;
  ticketsEarned: number;
  playedAt: number;
}

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();

  const [gameState, setGameState] = useState<GameState>('welcome');
  const [handResult, setHandResult] = useState<HandResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDealing, setIsDealing] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has already played this draw
  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    async function checkStatus() {
      try {
        const res = await fetch(`/api/home/status?wallet=${address}`);
        const data = await res.json();

        if (data.success && data.hasPlayed && data.result) {
          setHandResult(data.result);
          setGameState('already_played');
          setShowCards(true);
        } else {
          setGameState('welcome');
        }
      } catch (err) {
        console.error('Status check error:', err);
        setGameState('welcome');
      } finally {
        setIsLoading(false);
      }
    }

    checkStatus();
  }, [address]);

  // Handle deal action
  const handleDeal = async () => {
    if (!address) return;

    setIsDealing(true);
    setGameState('dealing');
    setError(null);

    try {
      const res = await fetch('/api/home/deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to deal cards');
        setGameState('welcome');
        setIsDealing(false);
        return;
      }

      // Start card animation
      setHandResult(data.result);

      // Brief dealing animation, then show cards
      setTimeout(() => {
        setIsDealing(false);
        setShowCards(true);

        // Transition to result state after cards are revealed
        setTimeout(() => {
          setGameState('result');
        }, 1500); // Wait for all cards to flip
      }, 800);

    } catch (err) {
      console.error('Deal error:', err);
      setError('Something went wrong. Please try again.');
      setGameState('welcome');
      setIsDealing(false);
    }
  };

  // Get message for Madge based on state
  const getMadgeMessage = (): string => {
    switch (gameState) {
      case 'welcome':
        return "Hi! Welcome to Max Craic Poker - giving audiences free upside in creator success";
      case 'dealing':
        return "Shuffling the deck...";
      case 'result':
        return `${handResult?.handRank}! Nice hand!`;
      case 'already_played':
        return "You've played! Enter the draw to use your tickets";
      default:
        return "";
    }
  };

  // Not connected state
  if (!address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 flex items-center justify-center pb-24">
        <div className="text-center max-w-md w-full px-4">
          <Madge message="Hi! Connect your wallet to play and earn raffle tickets!" />

          <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 space-y-3">
            <p className="text-white/80 text-center mb-4 text-sm">Connect your wallet to get started</p>
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => connect({ connector })}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                Connect {connector.name}
              </button>
            ))}
          </div>

          {/* Quick Info */}
          <div className="mt-6 bg-purple-500/10 backdrop-blur-lg rounded-xl p-4 border border-purple-400/20">
            <h3 className="text-white font-semibold mb-2 text-sm">How It Works</h3>
            <ul className="text-blue-200 text-xs space-y-1.5 text-left">
              <li>• Deal your hand to earn raffle tickets</li>
              <li>• Better hands = more tickets</li>
              <li>• Enter the draw for free</li>
              <li>• Win up to 12% profit share!</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 flex items-center justify-center pb-24">
        <div className="text-center">
          <Madge message="Loading..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24">
      <div className="max-w-md mx-auto pt-6 space-y-4">

        {/* Madge Character */}
        <div className="flex justify-center">
          <Madge isDealing={isDealing} message={getMadgeMessage()} />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 backdrop-blur-lg rounded-xl p-4 border border-red-400/30">
            <p className="text-red-200 text-center text-sm">{error}</p>
          </div>
        )}

        {/* Card Display Area */}
        {(showCards && handResult) && (
          <div className="bg-white/5 backdrop-blur-lg rounded-xl p-4 border border-white/10">
            <CardHand cards={handResult.cards} isRevealed={showCards} />
          </div>
        )}

        {/* Welcome State - Deal Button */}
        {gameState === 'welcome' && !isDealing && (
          <div className="space-y-4">
            <button
              onClick={handleDeal}
              className="w-full bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:from-purple-600 hover:via-purple-700 hover:to-purple-800 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-purple-500/30 text-lg"
            >
              🎴 Deal Me In
            </button>

            <p className="text-center text-blue-200/70 text-xs">
              Get your poker hand and earn raffle tickets!
            </p>
          </div>
        )}

        {/* Dealing State */}
        {gameState === 'dealing' && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 text-purple-300">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        {/* Result State */}
        {gameState === 'result' && handResult && (
          <div className="space-y-4">
            {/* Result Card */}
            <div className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 backdrop-blur-lg rounded-xl p-6 border border-purple-400/30">
              {/* Hand Name */}
              <h2 className="text-2xl font-bold text-white text-center mb-2">
                {handResult.handRank}
              </h2>

              {/* Placement */}
              <p className="text-blue-200 text-center mb-4">
                You placed <span className="text-white font-bold">{handResult.placement}</span>/{handResult.totalUsers} entrants
              </p>

              {/* Tickets Earned */}
              <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-400/30">
                <div className="flex items-center justify-center gap-2">
                  <Ticket className="w-6 h-6 text-yellow-400" />
                  <span className="text-yellow-200 text-lg font-bold">
                    You earned {handResult.ticketsEarned} raffle ticket{handResult.ticketsEarned !== 1 ? 's' : ''}!
                  </span>
                </div>
                <p className="text-yellow-200/70 text-xs text-center mt-2">
                  Each ticket = one entry in the raffle
                </p>
              </div>
            </div>

            {/* Enter Draw CTA */}
            <Link
              href="/mini-app/draw"
              className="block w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all text-center text-lg shadow-lg shadow-green-500/30"
            >
              🎟️ Enter Draw (Free)
            </Link>

            {/* How it works */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <ul className="text-blue-200/80 text-xs space-y-1">
                <li>• 6 winners get free equity in poker tournaments</li>
                <li>• Streamed live on Retake for transparency</li>
                <li>• All rewards distributed on Base</li>
              </ul>
            </div>
          </div>
        )}

        {/* Already Played State */}
        {gameState === 'already_played' && handResult && (
          <div className="space-y-4">
            {/* Previous Result */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white text-center mb-2">
                Your Hand: {handResult.handRank}
              </h2>

              <p className="text-blue-200 text-center mb-3">
                Placed <span className="text-white font-bold">{handResult.placement}</span>/{handResult.totalUsers}
              </p>

              {/* Tickets */}
              <div className="flex items-center justify-center gap-2 bg-yellow-500/20 rounded-lg p-3 border border-yellow-400/30">
                <Ticket className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-200 font-bold">
                  {handResult.ticketsEarned} ticket{handResult.ticketsEarned !== 1 ? 's' : ''} earned
                </span>
              </div>
            </div>

            {/* Enter Draw CTA */}
            <Link
              href="/mini-app/draw"
              className="block w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-6 rounded-xl transition-all text-center text-lg shadow-lg shadow-green-500/30"
            >
              🎟️ Enter Draw (Free)
            </Link>

            {/* How it works */}
            <div className="bg-white/5 rounded-lg p-3 border border-white/10">
              <ul className="text-blue-200/80 text-xs space-y-1">
                <li>• 6 winners get free equity in poker tournaments</li>
                <li>• Streamed live on Retake for transparency</li>
                <li>• All rewards distributed on Base</li>
              </ul>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
