/**
 * Prize Distribution Logic for Poker Tournaments
 */

export interface PrizeStructure {
  first: number;
  second: number;
  third: number;
}

/**
 * Calculate cash prize distribution
 * Default structure: 50% / 30% / 20%
 */
export function calculatePrizes(totalPrizePool: number): PrizeStructure {
  return {
    first: Math.floor(totalPrizePool * 0.50),
    second: Math.floor(totalPrizePool * 0.30),
    third: Math.floor(totalPrizePool * 0.20)
  }
}

/**
 * Default prize pool for free-entry community tournaments
 * Can be adjusted based on sponsor/stream revenue
 */
export const DEFAULT_PRIZE_POOL = 100 // €100 total

/**
 * Equity percentage awarded to top 3 finishers
 * Applied to games 3-6 in tournaments.json
 */
export const EQUITY_PERCENTAGE = 5 // 5% in games 3-6

/**
 * Get prize amounts for tournament winners
 */
export function getTournamentPrizes(prizePool: number = DEFAULT_PRIZE_POOL) {
  const prizes = calculatePrizes(prizePool)

  return {
    1: prizes.first,
    2: prizes.second,
    3: prizes.third
  }
}

/**
 * Format winner for display
 */
export function formatTournamentWinner(
  position: 1 | 2 | 3,
  walletAddress: string,
  prizePool: number = DEFAULT_PRIZE_POOL
) {
  const prizes = getTournamentPrizes(prizePool)

  return {
    walletAddress,
    position,
    prizeAmount: prizes[position],
    equityPercentage: EQUITY_PERCENTAGE,
    description: `${position === 1 ? '1st' : position === 2 ? '2nd' : '3rd'} Place - €${prizes[position]} + ${EQUITY_PERCENTAGE}% equity`
  }
}
