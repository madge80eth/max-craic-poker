'use client';

import { useAccount, useConnect } from 'wagmi';
import { useState, useEffect } from 'react';
import { Wallet, Ticket, Trophy, DollarSign } from 'lucide-react';
import Link from 'next/link';
import Madge from '../components/Madge';
import CardHand from '../components/CardHand';
import TipLeaderboard from '../components/TipLeaderboard';
import TierBadge from '../components/TierBadge';
import BaseAppCTA from '../components/BaseAppCTA';
import HandOfTheHour from '../components/HandOfTheHour';
import HothLeaderboard from '../components/HothLeaderboard';
import { parseUnits, formatUnits } from 'viem';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAppContext } from '@/hooks/useAppContext';

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
  const { context: appContext, ticketMultiplier, isBaseApp } = useAppContext();

  const [gameState, setGameState] = useState<GameState>('welcome');
  const [handResult, setHandResult] = useState<HandResult | null>(null);
  const [totalTickets, setTotalTickets] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isDealing, setIsDealing] = useState(false);
  const [showCards, setShowCards] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWithinStreamWindow, setIsWithinStreamWindow] = useState(false);
  const [isPostStreamWindow, setIsPostStreamWindow] = useState(false); // 12h-24h after stream
  const [winners, setWinners] = useState<any[] | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamDate, setStreamDate] = useState<string>('');

  // Tipping state
  const [sessionId, setSessionId] = useState<string>('');
  const [totalTips, setTotalTips] = useState(0);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [tipError, setTipError] = useState<string | null>(null);
  const [tipSuccess, setTipSuccess] = useState<string | null>(null);
  const [isTipping, setIsTipping] = useState(false);
  const [selectedToken, setSelectedToken] = useState<'USDC' | 'ETH'>('USDC');

  const { writeContract, data: hash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Check stream timing and winners
  useEffect(() => {
    async function checkStreamAndWinners() {
      try {
        const tournamentRes = await fetch('/api/tournaments');
        const tournamentData = await tournamentRes.json();

        // Fetch winners data first to check if draw has happened
        const statusRes = await fetch('/api/status');
        const statusData = await statusRes.json();
        const hasWinners = statusData.success && statusData.winners?.length > 0;

        let shouldShowWinnersOnHome = false;

        if (hasWinners) {
          // CRITICAL FIX: Use draw timestamp, NOT stream start time
          // The 12-hour window starts when the draw happens, not when the stream is scheduled
          const drawTimestamp = statusData.timestamp; // Draw result includes timestamp
          const now = Date.now();
          const twelveHoursAfterDraw = drawTimestamp + (12 * 60 * 60 * 1000);

          // Show winners on HOME for 12 hours after draw was triggered
          const withinStreamWindow = now <= twelveHoursAfterDraw;
          setIsWithinStreamWindow(withinStreamWindow);

          // REMOVED: Post-stream window (12-24h) - this was causing winners + Madge to show together
          // After 12h, we revert to Madge game immediately
          setIsPostStreamWindow(false);

          // Show winners on HOME only during the 12-hour window after draw
          shouldShowWinnersOnHome = withinStreamWindow;

          // Auto-set Retake embed URL and stream info
          if (tournamentData.streamStartTime) {
            const retakeUrl = tournamentData.streamUrl || 'https://retake.tv/live/68b58fa755320f51930c9081';
            setStreamUrl(retakeUrl);
            setStreamDate(new Date(tournamentData.streamStartTime).toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' }));
            setSessionId(tournamentData.sessionId || '');
          }
        } else {
          // No winners drawn yet
          setIsWithinStreamWindow(false);
          setIsPostStreamWindow(false);
        }

        // Set winners state based on whether we should show them on HOME
        if (hasWinners && shouldShowWinnersOnHome) {
          setWinners(statusData.winners);
        } else {
          setWinners(null); // Clear winners to show Madge game
        }
      } catch (err) { console.error('Stream check error:', err); }
    }
    checkStreamAndWinners();
  }, []);

  // Fetch tips total
  useEffect(() => {
    if (!sessionId || !isWithinStreamWindow) return;

    async function fetchTips() {
      try {
        const res = await fetch(`/api/tips?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.success) {
          setTotalTips(data.totalTips || 0);
        }
      } catch (err) {
        console.error('Tips fetch error:', err);
      }
    }

    fetchTips();
    const interval = setInterval(fetchTips, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [sessionId, isWithinStreamWindow]);

  // Handle successful tip transaction
  useEffect(() => {
    if (isConfirmed && hash) {
      recordTip();
    }
  }, [isConfirmed, hash]);

  // Handle write errors - reset tipping state
  useEffect(() => {
    if (writeError) {
      setTipError(writeError.message || 'Transaction failed');
      setIsTipping(false);
      setSelectedAmount(null);
    }
  }, [writeError]);

  const recordTip = async () => {
    if (!selectedAmount || !address || !hash) return;

    try {
      const res = await fetch('/api/tip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedAmount,
          walletAddress: address,
          sessionId,
          txHash: hash
        })
      });

      const data = await res.json();

      if (data.success) {
        setTipSuccess(`Thanks for the ${(selectedAmount / 100).toFixed(2)} tip!`);
        setTotalTips(data.totalTips);
        setSelectedAmount(null);
        setCustomAmount('');
        setTimeout(() => setTipSuccess(null), 5000);
      } else {
        setTipError(data.message || 'Failed to record tip');
      }
    } catch (err) {
      console.error('Record tip error:', err);
      setTipError('Failed to record tip');
    } finally {
      setIsTipping(false);
    }
  };

  const handleTip = async (amountInCents: number) => {
    if (!address) {
      setTipError('Please connect wallet first');
      return;
    }

    setTipError(null);
    setTipSuccess(null);
    setSelectedAmount(amountInCents);
    setIsTipping(true);

    try {
      const tipWallet = process.env.NEXT_PUBLIC_TIP_WALLET_ADDRESS || '';

      if (!tipWallet) {
        setTipError('Tip wallet not configured');
        setIsTipping(false);
        return;
      }

      if (selectedToken === 'ETH') {
        // For ETH, use sendTransaction instead of writeContract
        // Note: This requires a different wagmi hook (useSendTransaction)
        // For now, we'll show an error and plan to implement this properly
        setTipError('ETH tipping coming soon! Please use USDC for now.');
        setIsTipping(false);
        return;
      } else {
        // USDC transfer
        const usdcContract = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
        // Convert cents to USDC (6 decimals)
        const amountInUSDC = parseUnits((amountInCents / 100).toString(), 6);

        writeContract({
          address: usdcContract as `0x${string}`,
          abi: [
            {
              name: 'transfer',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'amount', type: 'uint256' }
              ],
              outputs: [{ name: '', type: 'bool' }]
            }
          ],
          functionName: 'transfer',
          args: [tipWallet as `0x${string}`, amountInUSDC]
        });
      }
    } catch (err: any) {
      console.error('Tip error:', err);
      setTipError(err.message || 'Transaction failed');
      setIsTipping(false);
    }
  };

  const handleCustomTip = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      setTipError('Please enter a valid amount');
      return;
    }
    if (amount > 1000) {
      setTipError('Maximum tip amount is $1000');
      return;
    }
    handleTip(Math.round(amount * 100));
  };

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
        body: JSON.stringify({ walletAddress: address, appContext })
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

  // STATE 1: WITHIN 12-HOUR WINDOW AFTER DRAW - Show Stream + Tip + HOTH + View Winners Button
  // After 12 hours, home page reverts to Madge game (winners still visible on /draw page)
  if (isWithinStreamWindow && winners && winners.length > 0) {
    const isUserWinner = address && winners.some((w: any) => w.walletAddress.toLowerCase() === address.toLowerCase());
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-purple-800 p-4 pb-24">
        <div className="max-w-md mx-auto pt-4 space-y-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-6 h-6 text-yellow-400" />
              <h1 className="text-2xl font-bold text-white">Live Now: {streamDate}</h1>
            </div>
            {isUserWinner && (
              <div className="bg-green-500/20 rounded-xl p-3 border border-green-400/40 mt-2">
                <p className="text-green-200 text-sm font-semibold">🎉 You won! View your assignment below</p>
              </div>
            )}
          </div>

          {/* 1. STREAM */}
          <p className="text-blue-200 text-sm text-center">Watch the action live:</p>
          <div className="bg-black rounded-xl overflow-hidden border border-white/20 relative" style={{ height: '400px' }}>
            <iframe
              src={streamUrl || 'https://retake.tv/live/68b58fa755320f51930c9081'}
              className="w-full absolute"
              style={{
                height: '800px',
                top: '-100px',
                left: '0',
                pointerEvents: 'auto'
              }}
              allowFullScreen
              allow="autoplay; fullscreen"
            />
          </div>

          {/* 2. TIPPING */}
          <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-xl p-5 border border-pink-400/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-pink-400" />
                <h2 className="text-white font-bold text-lg">Tip the Streamer</h2>
              </div>
              <div className="text-right">
                <p className="text-pink-200/60 text-xs">Today's Tips</p>
                <p className="text-white font-bold text-lg">${(totalTips / 100).toFixed(2)}</p>
              </div>
            </div>

            {tipSuccess && (
              <div className="bg-green-500/20 rounded-lg p-3 mb-3 border border-green-400/40">
                <p className="text-green-200 text-sm text-center font-semibold">{tipSuccess}</p>
              </div>
            )}

            {(tipError || writeError) && (
              <div className="bg-red-500/20 rounded-lg p-3 mb-3 border border-red-400/40">
                <p className="text-red-200 text-sm text-center">{tipError || writeError?.message}</p>
              </div>
            )}

            {!isConnected ? (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                Connect Wallet to Tip
              </button>
            ) : (
              <div className="space-y-3">
                {/* Token Selection */}
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setSelectedToken('USDC')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                      selectedToken === 'USDC'
                        ? 'bg-white/20 text-white border-2 border-pink-400'
                        : 'bg-white/5 text-white/60 border border-white/10'
                    }`}
                  >
                    USDC
                  </button>
                  <button
                    onClick={() => setSelectedToken('ETH')}
                    className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                      selectedToken === 'ETH'
                        ? 'bg-white/20 text-white border-2 border-pink-400'
                        : 'bg-white/5 text-white/60 border border-white/10'
                    }`}
                  >
                    ETH
                  </button>
                </div>

                {/* Preset amounts */}
                <div className="grid grid-cols-4 gap-2">
                  {[100, 500, 1000, 2500].map((cents) => (
                    <button
                      key={cents}
                      onClick={() => handleTip(cents)}
                      disabled={isTipping || isConfirming}
                      className="bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed text-white font-semibold py-2 px-3 rounded-lg transition-all text-sm border border-white/20"
                    >
                      ${(cents / 100).toFixed(0)}
                    </button>
                  ))}
                </div>

                {/* Custom amount */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Custom amount"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    disabled={isTipping || isConfirming}
                    className="flex-1 bg-white/10 text-white placeholder:text-white/40 px-4 py-2 rounded-lg border border-white/20 focus:outline-none focus:border-pink-400/50 disabled:bg-white/5 disabled:cursor-not-allowed"
                    step="0.01"
                    min="0.01"
                    max="1000"
                  />
                  <button
                    onClick={handleCustomTip}
                    disabled={!customAmount || isTipping || isConfirming}
                    className="bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-2 px-6 rounded-lg transition-all"
                  >
                    {isTipping || isConfirming ? 'Sending...' : 'Send'}
                  </button>
                </div>

                <p className="text-pink-200/60 text-xs text-center">Tips sent in {selectedToken} on Base</p>
              </div>
            )}
          </div>

          {/* 3. ENGAGEMENT GAME (HOTH) */}
          <HandOfTheHour isLiveStreamActive={isWithinStreamWindow} />
          <HothLeaderboard />

          {/* 4. VIEW WINNERS BUTTON */}
          <Link
            href="/mini-app/draw"
            className="block w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-4 px-6 rounded-xl text-center shadow-lg border border-yellow-400/30 flex items-center justify-center gap-2"
          >
            <Trophy className="w-5 h-5" />
            View Winners & Tournament Assignments
          </Link>
        </div>
      </div>
    );
  }

  // REMOVED: STATE 2 (Post-stream window 12-24h)
  // Winners now only show for 12 hours, then home reverts to Madge game
  // This prevents winners + Madge showing simultaneously

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

            {/* Raffle Entry Disclaimer */}
            <div className="bg-blue-900/30 border border-blue-400/20 rounded-lg p-3">
              <p className="text-blue-200/80 text-xs leading-relaxed text-center">
                <strong>FREE Raffle Entry:</strong> No purchase necessary. Play the daily poker game to earn entry tickets. Members receive bonus tickets as a membership benefit, but all community members can participate without payment.
              </p>
            </div>
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
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <Ticket className="w-6 h-6 text-yellow-400" />
                  <span className="text-yellow-200 text-lg font-bold">
                    +{handResult.ticketsEarned} ticket{handResult.ticketsEarned !== 1 ? 's' : ''} added!
                  </span>
                  <TierBadge size="sm" />
                </div>
                <p className="text-yellow-200/70 text-xs text-center mt-2">
                  Total: {totalTickets} tickets for the next draw
                </p>
              </div>
            </div>

            {/* Base App CTA */}
            <BaseAppCTA />

            {/* Stack Tip */}
            <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-400/30 text-center">
              <p className="text-blue-200/80 text-xs">
                💡 Stack tickets over multiple days to increase your odds!
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

            {/* Stack Tip */}
            <div className="bg-blue-500/20 rounded-lg p-3 border border-blue-400/30 text-center">
              <p className="text-blue-200/80 text-xs">
                💡 Stack tickets over multiple days to increase your odds!
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
