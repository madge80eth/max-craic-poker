import Hand from 'pokersolver'
import { Player, GameState, SidePot } from '@/types'

// ============================================
// DECK & CARD DEALING
// ============================================

const SUITS = ['h', 'd', 'c', 's'] as const // hearts, diamonds, clubs, spades
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const

export function createDeck(): string[] {
  const deck: string[] = []
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push(`${rank}${suit}`)
    }
  }
  return deck
}

export function shuffleDeck(deck: string[]): string[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function dealCards(deck: string[], count: number): { cards: string[]; remainingDeck: string[] } {
  const cards = deck.slice(0, count)
  const remainingDeck = deck.slice(count)
  return { cards, remainingDeck }
}

// ============================================
// HAND EVALUATION
// ============================================

export interface HandResult {
  walletAddress: string
  hand: string[] // 5-7 cards (hole + community)
  rank: number // Lower is better
  description: string
  cards: string[] // Hole cards
}

export function evaluateHand(holeCards: string[], communityCards: string[]): any {
  const allCards = [...holeCards, ...communityCards]
  try {
    const hand = Hand.solve(allCards)
    return hand
  } catch (error) {
    console.error('Error evaluating hand:', error)
    return null
  }
}

export function findWinners(players: Player[], communityCards: string[]): HandResult[] {
  const activePlayers = players.filter(p => p.status === 'active' && p.cards.length === 2)

  if (activePlayers.length === 0) {
    return []
  }

  // Evaluate each player's hand
  const evaluatedHands: HandResult[] = activePlayers.map(player => {
    const hand = evaluateHand(player.cards, communityCards)
    return {
      walletAddress: player.walletAddress,
      hand: [...player.cards, ...communityCards],
      rank: hand ? hand.rank : 999999,
      description: hand ? hand.descr : 'No hand',
      cards: player.cards
    }
  })

  // Sort by rank (lower is better in pokersolver)
  evaluatedHands.sort((a, b) => {
    const handA = Hand.solve(a.hand)
    const handB = Hand.solve(b.hand)
    const winners = Hand.winners([handA, handB])
    if (winners.includes(handA) && winners.includes(handB)) return 0
    if (winners.includes(handA)) return -1
    return 1
  })

  // Find all winners (handle ties)
  const winningHand = Hand.solve(evaluatedHands[0].hand)
  const allHands = evaluatedHands.map(h => Hand.solve(h.hand))
  const winnerHands = Hand.winners(allHands)

  return evaluatedHands.filter((_, idx) => winnerHands.includes(allHands[idx]))
}

// ============================================
// POT MANAGEMENT & SIDE POTS
// ============================================

export interface PotDistribution {
  walletAddress: string
  amount: number
}

export function calculateSidePots(players: Player[]): SidePot[] {
  // Get all players who have bet (including all-in)
  const bettingPlayers = players.filter(p => p.totalBetThisRound > 0 || p.chipStack === 0)

  if (bettingPlayers.length === 0) {
    return []
  }

  // Sort by total bet amount
  const sorted = [...bettingPlayers].sort((a, b) => a.totalBetThisRound - b.totalBetThisRound)

  const sidePots: SidePot[] = []
  let previousBet = 0

  for (let i = 0; i < sorted.length; i++) {
    const currentBet = sorted[i].totalBetThisRound
    const betDifference = currentBet - previousBet

    if (betDifference > 0) {
      // Create side pot for this level
      const eligiblePlayers = sorted.slice(i).map(p => p.walletAddress)
      const potAmount = betDifference * eligiblePlayers.length

      sidePots.push({
        amount: potAmount,
        eligiblePlayers
      })

      previousBet = currentBet
    }
  }

  return sidePots
}

export function distributePot(
  mainPot: number,
  sidePots: SidePot[],
  players: Player[],
  communityCards: string[]
): PotDistribution[] {
  const distribution: PotDistribution[] = []

  // Distribute each side pot
  for (const pot of sidePots) {
    const eligiblePlayers = players.filter(p =>
      pot.eligiblePlayers.includes(p.walletAddress) &&
      p.cards.length === 2
    )

    if (eligiblePlayers.length === 0) continue

    const winners = findWinners(eligiblePlayers, communityCards)
    const amountPerWinner = Math.floor(pot.amount / winners.length)

    for (const winner of winners) {
      const existing = distribution.find(d => d.walletAddress === winner.walletAddress)
      if (existing) {
        existing.amount += amountPerWinner
      } else {
        distribution.push({
          walletAddress: winner.walletAddress,
          amount: amountPerWinner
        })
      }
    }
  }

  return distribution
}

// ============================================
// BLIND & DEALER POSITION
// ============================================

export function getNextActivePosition(
  players: Player[],
  currentPosition: number
): number {
  const activePlayers = players.filter(p => p.status === 'active')

  if (activePlayers.length === 0) {
    return currentPosition
  }

  let nextPosition = currentPosition
  let attempts = 0

  while (attempts < players.length) {
    nextPosition = (nextPosition % players.length) + 1
    const player = players.find(p => p.seatPosition === nextPosition)

    if (player && player.status === 'active' && player.chipStack > 0) {
      return nextPosition
    }

    attempts++
  }

  return currentPosition
}

export function assignBlindsAndDealer(players: Player[], currentDealerPosition: number): {
  dealerPosition: number
  smallBlindPosition: number
  bigBlindPosition: number
} {
  const activePlayers = players.filter(p => p.status === 'active' && p.chipStack > 0)

  if (activePlayers.length < 2) {
    return {
      dealerPosition: currentDealerPosition,
      smallBlindPosition: 0,
      bigBlindPosition: 0
    }
  }

  // Move dealer button
  const dealerPosition = getNextActivePosition(players, currentDealerPosition)

  // Heads-up: dealer is small blind
  if (activePlayers.length === 2) {
    const smallBlindPosition = dealerPosition
    const bigBlindPosition = getNextActivePosition(players, dealerPosition)

    return {
      dealerPosition,
      smallBlindPosition,
      bigBlindPosition
    }
  }

  // 3+ players: normal positions
  const smallBlindPosition = getNextActivePosition(players, dealerPosition)
  const bigBlindPosition = getNextActivePosition(players, smallBlindPosition)

  return {
    dealerPosition,
    smallBlindPosition,
    bigBlindPosition
  }
}

// ============================================
// BETTING VALIDATION
// ============================================

export function validateAction(
  player: Player,
  action: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in',
  amount: number | undefined,
  currentBet: number
): { valid: boolean; error?: string } {
  // Fold is always valid
  if (action === 'fold') {
    return { valid: true }
  }

  // Check only valid if no bet to call
  if (action === 'check') {
    if (player.currentBet < currentBet) {
      return { valid: false, error: 'Cannot check, must call or raise' }
    }
    return { valid: true }
  }

  // Call
  if (action === 'call') {
    const callAmount = currentBet - player.currentBet
    if (callAmount > player.chipStack) {
      return { valid: false, error: 'Not enough chips to call (go all-in instead)' }
    }
    return { valid: true }
  }

  // Bet (when no one has bet yet)
  if (action === 'bet') {
    if (currentBet > 0) {
      return { valid: false, error: 'Cannot bet, someone already bet (use raise)' }
    }
    if (!amount || amount <= 0) {
      return { valid: false, error: 'Bet amount must be greater than 0' }
    }
    if (amount > player.chipStack) {
      return { valid: false, error: 'Bet exceeds chip stack' }
    }
    return { valid: true }
  }

  // Raise
  if (action === 'raise') {
    if (currentBet === 0) {
      return { valid: false, error: 'Cannot raise, no one has bet (use bet)' }
    }
    if (!amount) {
      return { valid: false, error: 'Raise amount required' }
    }
    const minRaise = currentBet * 2
    if (amount < minRaise && amount < player.chipStack) {
      return { valid: false, error: `Minimum raise is ${minRaise}` }
    }
    if (amount > player.chipStack) {
      return { valid: false, error: 'Raise exceeds chip stack' }
    }
    return { valid: true }
  }

  // All-in
  if (action === 'all-in') {
    if (player.chipStack === 0) {
      return { valid: false, error: 'No chips left' }
    }
    return { valid: true }
  }

  return { valid: false, error: 'Invalid action' }
}

// ============================================
// BLIND LEVEL PROGRESSION
// ============================================

export interface BlindLevel {
  level: number
  smallBlind: number
  bigBlind: number
}

export const BLIND_SCHEDULE: BlindLevel[] = [
  { level: 1, smallBlind: 10, bigBlind: 20 },
  { level: 2, smallBlind: 15, bigBlind: 30 },
  { level: 3, smallBlind: 25, bigBlind: 50 },
  { level: 4, smallBlind: 50, bigBlind: 100 },
  { level: 5, smallBlind: 75, bigBlind: 150 },
  { level: 6, smallBlind: 100, bigBlind: 200 },
  { level: 7, smallBlind: 150, bigBlind: 300 }, // Rarely reached in 30-min turbo
]

export function getBlindLevel(level: number): BlindLevel {
  return BLIND_SCHEDULE[level - 1] || BLIND_SCHEDULE[BLIND_SCHEDULE.length - 1]
}
