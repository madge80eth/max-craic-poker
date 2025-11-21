'use client';

import { useAccount, useConnect } from 'wagmi';
import { useState, useEffect } from 'react';
import { Wallet, Ticket } from 'lucide-react';
import Link from 'next/link';
import Madge from '../components/Madge';
import CardHand from '../components/CardHand';

type GameState = 'welcome' | 'dealing' | 'result' | 'already_played_today';

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
  const [totalTickets, setTotalTickets] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDealing, setIsDealing] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user has already played today
  useEffect(() => {
    if (!address) {
      setIsLoading(false);
      return;
    }

    async function checkStatus() {
      try {
        const res = await fetch(`/api/home/status?wallet=${address}`);
        const data = await res.json();

        if (data.success) {
          setTotalTickets(data.totalTickets || 0);

          if (data.hasPlayedToday && data.todayResult) {
            setHandResult(data.todayResult);
            setGameState('already_played_today');
            setShowCards(true);
          } else {
            setGameState('welcome');
          }
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
      setTotalTickets(data.totalTickets || 0);

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
        if (totalTickets > 0) {
          return `Welcome back! You have ${totalTickets} ticket${totalTickets !== 1 ? 's' : ''} saved up. Deal to earn more!`;
        }
        return "Hi! Welcome to Max Craic Poker! Deal a daily hand to earn tickets! Stack them up for the next draw - winners share real profits from my poker tournaments, paid in USDC on Base.";
      case 'dealing':
        return "Shuffling the deck...";
      case 'result':
        return `${handResult?.handRank}! Nice hand!`;
      case 'already_played_today':
        return "You've played today! Come back tomorrow for another hand.";
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
              <li>• Play daily to earn raffle tickets</li>
              <li>• Tickets accumulate until you enter a draw</li>
              <li>• More tickets = better odds to win</li>
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

        {/* Total Tickets Banner - Always show if has tickets */}
        {totalTickets > 0 && gameState !== 'dealing' && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-3 border border-yellow-400/30">
            <div className="flex items-center justify-center gap-2">
              <Ticket className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-200 font-bold">
                Total Tickets: {totalTickets}
              </span>
            </div>
          </div>
        )}

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
          <div className="space-y-3">
            <button
              onClick={handleDeal}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all text-base"
            >
              🎴 Deal Me In
            </button>

            <p className="text-center text-blue-200/60 text-xs">
              Resets daily at midnight UTC
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
                You placed <span className="text-white font-bold">{handResult.placement}</span>/{handResult.totalUsers} today
              </p>

              {/* Tickets Earned Today */}
              <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-400/30">
                <div className="flex items-center justify-center gap-2">
                  <Ticket className="w-6 h-6 text-yellow-400" />
                  <span className="text-yellow-200 text-lg font-bold">
                    +{handResult.ticketsEarned} ticket{handResult.ticketsEarned !== 1 ? 's' : ''} added!
                  </span>
                </div>
                <p className="text-yellow-200/70 text-xs text-center mt-2">
                  Total: {totalTickets} tickets for the next draw
                </p>
              </div>
            </div>

            {/* Stack More Tickets - Primary CTA */}
            <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-400/30 text-center">
              <p className="text-blue-200 font-semibold mb-1">
                🎯 Come back tomorrow for more tickets!
              </p>
              <p className="text-blue-200/70 text-xs">
                Stack them up to increase your odds in the next draw
              </p>
            </div>

            {/* Enter Draw - Secondary option */}
            <Link
              href="/mini-app/draw"
              className="block w-full bg-white/10 hover:bg-white/20 text-white/80 font-medium py-2 px-4 rounded-lg transition-all text-center text-sm border border-white/20"
            >
              Or enter now with {totalTickets} ticket{totalTickets !== 1 ? 's' : ''} →
            </Link>
          </div>
        )}

        {/* Already Played Today State */}
        {gameState === 'already_played_today' && handResult && (
          <div className="space-y-4">
            {/* Today's Result */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white text-center mb-2">
                Today's Hand: {handResult.handRank}
              </h2>

              <p className="text-blue-200 text-center mb-3">
                Placed <span className="text-white font-bold">{handResult.placement}</span>/{handResult.totalUsers} today
              </p>

              {/* Tickets earned today */}
              <div className="flex items-center justify-center gap-2 bg-green-500/20 rounded-lg p-3 border border-green-400/30">
                <Ticket className="w-5 h-5 text-green-400" />
                <span className="text-green-200 font-bold">
                  +{handResult.ticketsEarned} earned today
                </span>
              </div>
            </div>

            {/* Stack More Tickets - Primary message */}
            <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-400/30 text-center">
              <p className="text-blue-200 font-semibold mb-1">
                🎯 Come back tomorrow for more tickets!
              </p>
              <p className="text-blue-200/70 text-xs">
                Resets at midnight UTC • More tickets = better odds
              </p>
            </div>

            {/* Enter Draw - Secondary option */}
            {totalTickets > 0 && (
              <Link
                href="/mini-app/draw"
                className="block w-full bg-white/10 hover:bg-white/20 text-white/80 font-medium py-2 px-4 rounded-lg transition-all text-center text-sm border border-white/20"
              >
                Or enter now with {totalTickets} ticket{totalTickets !== 1 ? 's' : ''} →
              </Link>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
