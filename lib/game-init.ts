import { GameState, Player, TournamentConfig } from '@/types'
import { getRegisteredPlayers, setGameState, setPlayerCards } from '@/lib/tournament-redis'
import { createDeck, shuffleDeck, dealCards, assignBlindsAndDealer } from '@/lib/poker-engine'

/**
 * Initialize tournament and deal first hand
 */
export async function startTournament(tournamentId: string, config: TournamentConfig): Promise<GameState> {
  // Get all registered players
  const registeredWallets = await getRegisteredPlayers(tournamentId)

  if (registeredWallets.length < 2) {
    throw new Error('Not enough players to start tournament (minimum 2)')
  }

  // Limit to max players
  const playersToSeat = registeredWallets.slice(0, config.maxPlayers)

  // Create player objects with seat assignments
  const players: Player[] = playersToSeat.map((wallet, index) => ({
    walletAddress: wallet,
    seatPosition: index + 1,
    chipStack: config.startingChips,
    status: 'active',
    missedHands: 0,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
    currentBet: 0,
    totalBetThisRound: 0,
    cards: []
  }))

  // Assign dealer and blinds
  const { dealerPosition, smallBlindPosition, bigBlindPosition } = assignBlindsAndDealer(players, 0)

  // Mark positions
  players.forEach(p => {
    p.isDealer = p.seatPosition === dealerPosition
    p.isSmallBlind = p.seatPosition === smallBlindPosition
    p.isBigBlind = p.seatPosition === bigBlindPosition
  })

  // Deduct blinds
  const smallBlindPlayer = players.find(p => p.seatPosition === smallBlindPosition)
  const bigBlindPlayer = players.find(p => p.seatPosition === bigBlindPosition)

  if (smallBlindPlayer) {
    const sbAmount = Math.min(config.smallBlind, smallBlindPlayer.chipStack)
    smallBlindPlayer.chipStack -= sbAmount
    smallBlindPlayer.currentBet = sbAmount
    smallBlindPlayer.totalBetThisRound = sbAmount
  }

  if (bigBlindPlayer) {
    const bbAmount = Math.min(config.bigBlind, bigBlindPlayer.chipStack)
    bigBlindPlayer.chipStack -= bbAmount
    bigBlindPlayer.currentBet = bbAmount
    bigBlindPlayer.totalBetThisRound = bbAmount
  }

  const pot = (smallBlindPlayer?.currentBet || 0) + (bigBlindPlayer?.currentBet || 0)

  // Deal hole cards
  let deck = shuffleDeck(createDeck())

  for (const player of players) {
    const { cards, remainingDeck } = dealCards(deck, 2)
    deck = remainingDeck

    // Store hole cards privately in Redis
    await setPlayerCards(tournamentId, player.walletAddress, cards)

    // Don't store cards in public state
    player.cards = []
  }

  // Determine first to act (player after big blind)
  const firstToAct = players.find(p => p.seatPosition === bigBlindPosition)
  const activePlayerPosition = firstToAct
    ? (firstToAct.seatPosition % players.length) + 1
    : players[0].seatPosition

  // Create initial game state
  const initialState: GameState = {
    tournamentId,
    status: 'active',
    currentHandNumber: 1,
    dealerPosition,
    smallBlindPosition,
    bigBlindPosition,
    currentBlindLevel: 1,
    smallBlind: config.smallBlind,
    bigBlind: config.bigBlind,
    pot,
    communityCards: [],
    currentBettingRound: 'preflop',
    activePlayerPosition,
    players,
    sidePots: [],
    lastUpdate: Date.now()
  }

  await setGameState(initialState)

  console.log(`🃏 Tournament ${tournamentId} started with ${players.length} players`)
  console.log(`💰 Pot: ${pot} (SB: ${config.smallBlind}, BB: ${config.bigBlind})`)

  return initialState
}

/**
 * Deal new hand (after previous hand completed)
 */
export async function dealNewHand(state: GameState, config: TournamentConfig): Promise<GameState> {
  // Remove eliminated players
  const activePlayers = state.players.filter(p => p.chipStack > 0)

  if (activePlayers.length < 2) {
    // Tournament over
    return {
      ...state,
      status: 'completed',
      lastUpdate: Date.now()
    }
  }

  // Reset player states
  activePlayers.forEach(p => {
    p.currentBet = 0
    p.totalBetThisRound = 0
    p.cards = []
    p.lastAction = undefined
    p.status = p.chipStack > 0 ? 'active' : 'eliminated'
  })

  // Move dealer button and assign blinds
  const { dealerPosition, smallBlindPosition, bigBlindPosition } = assignBlindsAndDealer(
    activePlayers,
    state.dealerPosition
  )

  // Mark positions
  activePlayers.forEach(p => {
    p.isDealer = p.seatPosition === dealerPosition
    p.isSmallBlind = p.seatPosition === smallBlindPosition
    p.isBigBlind = p.seatPosition === bigBlindPosition
  })

  // Deduct blinds
  const smallBlindPlayer = activePlayers.find(p => p.seatPosition === smallBlindPosition)
  const bigBlindPlayer = activePlayers.find(p => p.seatPosition === bigBlindPosition)

  if (smallBlindPlayer) {
    const sbAmount = Math.min(state.smallBlind, smallBlindPlayer.chipStack)
    smallBlindPlayer.chipStack -= sbAmount
    smallBlindPlayer.currentBet = sbAmount
    smallBlindPlayer.totalBetThisRound = sbAmount
  }

  if (bigBlindPlayer) {
    const bbAmount = Math.min(state.bigBlind, bigBlindPlayer.chipStack)
    bigBlindPlayer.chipStack -= bbAmount
    bigBlindPlayer.currentBet = bbAmount
    bigBlindPlayer.totalBetThisRound = bbAmount
  }

  const pot = (smallBlindPlayer?.currentBet || 0) + (bigBlindPlayer?.currentBet || 0)

  // Deal new hole cards
  let deck = shuffleDeck(createDeck())

  for (const player of activePlayers) {
    const { cards, remainingDeck } = dealCards(deck, 2)
    deck = remainingDeck
    await setPlayerCards(state.tournamentId, player.walletAddress, cards)
  }

  // First to act (player after big blind)
  const firstToAct = activePlayers.find(p => p.seatPosition === bigBlindPosition)
  const activePlayerPosition = firstToAct
    ? (firstToAct.seatPosition % activePlayers.length) + 1
    : activePlayers[0].seatPosition

  const newState: GameState = {
    ...state,
    currentHandNumber: state.currentHandNumber + 1,
    dealerPosition,
    smallBlindPosition,
    bigBlindPosition,
    pot,
    communityCards: [],
    currentBettingRound: 'preflop',
    activePlayerPosition,
    players: activePlayers,
    sidePots: [],
    lastUpdate: Date.now()
  }

  await setGameState(newState)

  return newState
}
