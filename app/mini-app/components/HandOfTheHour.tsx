'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';

interface ActiveHand {
  id: string;
  cards: string;
  releaseTime: number;
  timeRemaining: number;
  voteCount: number;
}

interface HandOfTheHourProps {
  isLiveStreamActive: boolean;
}

export default function HandOfTheHour({ isLiveStreamActive }: HandOfTheHourProps) {
  const { address, isConnected } = useAccount();
  const [activeHand, setActiveHand] = useState<ActiveHand | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const previousHandIdRef = useRef<string | null>(null);

  // Fetch active hand status
  useEffect(() => {
    // Only fetch if stream is active
    if (!isLiveStreamActive) {
      setActiveHand(null);
      previousHandIdRef.current = null;
      return;
    }

    async function fetchStatus() {
      try {
        const response = await fetch('/api/hoth/status');
        const data = await response.json();

        if (data.active) {
          setActiveHand(data.active);
          setTimeRemaining(data.active.timeRemaining);
        } else {
          setActiveHand(null);
          previousHandIdRef.current = null;
          // Reset vote state when no active hand
          setHasVoted(false);
          setVoteSubmitted(false);
          setError(null);
        }
      } catch (error) {
        console.error('Error fetching HOTH status:', error);
      }
    }

    fetchStatus();
    // Poll every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [isLiveStreamActive]);

  // Reset voting state when activeHand ID changes
  useEffect(() => {
    if (activeHand) {
      const currentHandId = activeHand.id;

      // If this is a different hand from what we have in previousHandIdRef
      if (previousHandIdRef.current !== currentHandId) {
        console.log(`Hand changed from ${previousHandIdRef.current} to ${currentHandId}, resetting vote state`);
        setHasVoted(false);
        setVoteSubmitted(false);
        setError(null);
        previousHandIdRef.current = currentHandId;
      }
    }
  }, [activeHand?.id]);

  // Countdown timer
  useEffect(() => {
    if (!activeHand) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeHand]);

  async function submitVote(vote: 'win' | 'lose') {
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      const response = await fetch('/api/hoth/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address, vote })
      });

      const data = await response.json();

      if (response.ok) {
        setVoteSubmitted(true);
        setHasVoted(true);
        setError(null);
      } else {
        setError(data.error || 'Failed to submit vote');
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      setError('Failed to submit vote');
    }
  }

  // Don't show if stream is not active, no active hand, or time expired
  if (!isLiveStreamActive || !activeHand || timeRemaining <= 0) {
    return null;
  }

  // Parse cards for display
  const cardParts = activeHand.cards.split(' ');
  const getSuitEmoji = (suit: string) => {
    switch (suit) {
      case 's': return '♠️';
      case 'h': return '♥️';
      case 'd': return '♦️';
      case 'c': return '♣️';
      default: return '';
    }
  };

  const getSuitColor = (suit: string) => {
    return suit === 'h' || suit === 'd' ? 'text-red-500' : 'text-gray-900';
  };

  return (
    <div className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-6 shadow-2xl border border-purple-400/30">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-white text-xl font-bold">🎴 Hand of the Hour</h3>
          <p className="text-purple-200 text-sm">Did I win or lose this hand?</p>
        </div>
        <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
          <div className="text-white text-2xl font-mono font-bold">
            {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
          </div>
          <div className="text-purple-200 text-xs text-center">remaining</div>
        </div>
      </div>

      {/* Cards Display */}
      <div className="flex gap-4 justify-center my-6">
        {cardParts.map((card, index) => {
          const rank = card[0];
          const suit = card[1];
          return (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-lg min-w-[80px] flex flex-col items-center justify-center transform hover:scale-105 transition-transform"
            >
              <div className={`text-5xl font-bold ${getSuitColor(suit)}`}>
                {rank}
              </div>
              <div className="text-4xl mt-1">
                {getSuitEmoji(suit)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Voting Buttons */}
      {!voteSubmitted && !hasVoted ? (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => submitVote('win')}
            disabled={!isConnected}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed shadow-lg"
          >
            <div className="text-2xl mb-1">✅</div>
            <div>Win</div>
          </button>
          <button
            onClick={() => submitVote('lose')}
            disabled={!isConnected}
            className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed shadow-lg"
          >
            <div className="text-2xl mb-1">❌</div>
            <div>Lose</div>
          </button>
        </div>
      ) : (
        <div className="bg-green-500/20 border border-green-400 rounded-xl p-4 text-center">
          <div className="text-green-400 font-bold text-lg">✅ Vote Recorded!</div>
          <p className="text-green-200 text-sm mt-1">Results will be shown at the end of stream</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 bg-red-500/20 border border-red-400 rounded-xl p-3 text-center">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Connect Wallet Prompt */}
      {!isConnected && !voteSubmitted && (
        <div className="mt-4 bg-yellow-500/20 border border-yellow-400 rounded-xl p-3 text-center">
          <p className="text-yellow-200 text-sm">Connect wallet to vote</p>
        </div>
      )}
    </div>
  );
}
