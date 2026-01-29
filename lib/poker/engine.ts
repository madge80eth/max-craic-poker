// Core poker game engine

import {
  GameState,
  GameAction,
  Player,
  Card,
  GamePhase,
  SidePot,
  WinnerInfo,
  ClientGameState,
  ClientPlayer,
  ValidAction,
  DEFAULT_CONFIG,
  GameConfig,
} from './types';
import { createDeck, shuffleDeck, dealCards } from './deck';
import { findWinners } from './evaluator';

// Create a new game
export function createGame(tableId: string, config: GameConfig = DEFAULT_CONFIG): GameState {
  return {
    tableId,
    phase: 'waiting',
    pot: 0,
    sidePots: [],
    communityCards: [],
    currentBet: 0,
    minRaise: config.blindLevels[0].bigBlind,
    dealerIndex: 0,
    activePlayerIndex: -1,
    players: [],
    deck: [],
    blindLevel: 0,
    blindLevelStartTime: 0,
    handNumber: 0,
    lastActionTime: Date.now(),
    config,
  };
}

// Add player to game
export function addPlayer(
  state: GameState,
  identity: string,
  name: string,
  seatIndex: number
): GameState {
  if (state.phase !== 'waiting') {
    throw new Error('Cannot join game in progress');
  }
  if (state.players.length >= state.config.maxPlayers) {
    throw new Error('Table is full');
  }
  if (state.players.some(p => p.seatIndex === seatIndex)) {
    throw new Error('Seat is taken');
  }
  if (state.players.some(p => p.odentity === identity)) {
    throw new Error('Already at table');
  }

  const player: Player = {
    odentity: identity,
    name,
    seatIndex,
    chips: state.config.startingChips,
    bet: 0,
    totalBet: 0,
    holeCards: [],
    folded: false,
    allIn: false,
    disconnected: false,
    isDealer: false,
    isSmallBlind: false,
    isBigBlind: false,
  };

  return {
    ...state,
    players: [...state.players, player].sort((a, b) => a.seatIndex - b.seatIndex),
  };
}

// Remove player from game
export function removePlayer(state: GameState, identity: string): GameState {
  if (state.phase !== 'waiting') {
    // Mark as disconnected instead of removing mid-game
    return {
      ...state,
      players: state.players.map(p =>
        p.odentity === identity ? { ...p, disconnected: true } : p
      ),
    };
  }

  return {
    ...state,
    players: state.players.filter(p => p.odentity !== identity),
  };
}

// Start the game
export function startGame(state: GameState): GameState {
  if (state.phase !== 'waiting') {
    throw new Error('Game already started');
  }
  if (state.players.length < 2) {
    throw new Error('Need at least 2 players');
  }

  // Pick random starting dealer
  const dealerIndex = Math.floor(Math.random() * state.players.length);

  const newState: GameState = {
    ...state,
    phase: 'waiting', // Will be set by startHand
    dealerIndex,
    blindLevel: 0,
    blindLevelStartTime: Date.now(),
    handNumber: 0,
  };

  return startHand(newState);
}

// Start a new hand
export function startHand(state: GameState): GameState {
  const activePlayers = state.players.filter(p => p.chips > 0 && !p.disconnected);

  // Check if game is over (only 1 player left with chips)
  if (activePlayers.length <= 1) {
    return {
      ...state,
      phase: 'finished',
      winners: activePlayers.map(p => ({
        odentity: p.odentity,
        amount: p.chips,
        handName: 'Last player standing',
        cards: [],
      })),
    };
  }

  // Move dealer button
  let dealerIndex = state.dealerIndex;
  do {
    dealerIndex = (dealerIndex + 1) % state.players.length;
  } while (state.players[dealerIndex].chips === 0 || state.players[dealerIndex].disconnected);

  // Create and shuffle deck
  const deck = shuffleDeck(createDeck());

  // Get blind amounts
  const blinds = state.config.blindLevels[state.blindLevel] || state.config.blindLevels[state.config.blindLevels.length - 1];

  // Find small blind and big blind positions
  const activeIndices = state.players
    .map((p, i) => ({ player: p, index: i }))
    .filter(({ player }) => player.chips > 0 && !player.disconnected)
    .map(({ index }) => index);

  const dealerActiveIndex = activeIndices.indexOf(dealerIndex);

  let sbIndex: number;
  let bbIndex: number;

  if (activeIndices.length === 2) {
    // Heads-up: dealer posts small blind, other player posts big blind
    sbIndex = dealerIndex;
    bbIndex = activeIndices[(dealerActiveIndex + 1) % activeIndices.length];
  } else {
    // 3+ players: SB is left of dealer, BB is left of SB
    sbIndex = activeIndices[(dealerActiveIndex + 1) % activeIndices.length];
    bbIndex = activeIndices[(dealerActiveIndex + 2) % activeIndices.length];
  }

  // Reset players and post blinds
  const players = state.players.map((p, i) => {
    const isActive = p.chips > 0 && !p.disconnected;
    let bet = 0;
    let chips = p.chips;
    let allIn = false;

    if (i === sbIndex && isActive) {
      bet = Math.min(blinds.smallBlind, chips);
      chips -= bet;
      allIn = chips === 0;
    } else if (i === bbIndex && isActive) {
      bet = Math.min(blinds.bigBlind, chips);
      chips -= bet;
      allIn = chips === 0;
    }

    // Post antes if applicable
    if (blinds.ante > 0 && isActive && !allIn) {
      const ante = Math.min(blinds.ante, chips);
      bet += ante;
      chips -= ante;
      allIn = chips === 0;
    }

    return {
      ...p,
      chips,
      bet,
      totalBet: bet,
      holeCards: [] as Card[],
      folded: !isActive,
      allIn,
      lastAction: undefined,
      isDealer: i === dealerIndex,
      isSmallBlind: i === sbIndex,
      isBigBlind: i === bbIndex,
    };
  });

  // Deal hole cards (2 to each active player)
  for (const player of players) {
    if (!player.folded) {
      player.holeCards = dealCards(deck, 2);
    }
  }

  // Calculate initial pot from blinds/antes
  const pot = players.reduce((sum, p) => sum + p.bet, 0);

  // First to act is player after big blind (UTG)
  let activePlayerIndex = bbIndex;
  do {
    activePlayerIndex = (activePlayerIndex + 1) % players.length;
  } while (players[activePlayerIndex].folded || players[activePlayerIndex].allIn);

  return {
    ...state,
    phase: 'preflop',
    pot,
    sidePots: [],
    communityCards: [],
    currentBet: blinds.bigBlind,
    minRaise: blinds.bigBlind,
    dealerIndex,
    activePlayerIndex,
    players,
    deck,
    handNumber: state.handNumber + 1,
    lastActionTime: Date.now(),
    winners: undefined,
  };
}

// Process a player action
export function processAction(state: GameState, action: GameAction): GameState {
  const playerIndex = state.players.findIndex(p => p.odentity === action.playerId);
  if (playerIndex === -1) {
    throw new Error('Player not in game');
  }
  if (playerIndex !== state.activePlayerIndex) {
    throw new Error('Not your turn');
  }

  const player = state.players[playerIndex];
  if (player.folded || player.allIn) {
    throw new Error('Cannot act - folded or all-in');
  }

  let newState = { ...state };
  const validActions = getValidActions(state, playerIndex);

  switch (action.type) {
    case 'fold': {
      if (!validActions.some(a => a.action === 'fold')) {
        throw new Error('Cannot fold');
      }
      newState = applyFold(newState, playerIndex);
      break;
    }
    case 'check': {
      if (!validActions.some(a => a.action === 'check')) {
        throw new Error('Cannot check');
      }
      newState = applyCheck(newState, playerIndex);
      break;
    }
    case 'call': {
      if (!validActions.some(a => a.action === 'call')) {
        throw new Error('Cannot call');
      }
      newState = applyCall(newState, playerIndex);
      break;
    }
    case 'raise': {
      const raiseAction = validActions.find(a => a.action === 'raise');
      if (!raiseAction) {
        throw new Error('Cannot raise');
      }
      const amount = action.amount || raiseAction.minAmount || 0;
      if (amount < (raiseAction.minAmount || 0) || amount > (raiseAction.maxAmount || 0)) {
        throw new Error(`Raise must be between ${raiseAction.minAmount} and ${raiseAction.maxAmount}`);
      }
      newState = applyRaise(newState, playerIndex, amount);
      break;
    }
    case 'allin': {
      if (!validActions.some(a => a.action === 'allin')) {
        throw new Error('Cannot go all-in');
      }
      newState = applyAllIn(newState, playerIndex);
      break;
    }
    default:
      throw new Error(`Unknown action: ${action.type}`);
  }

  // Move to next player or next phase
  newState = advanceGame(newState);

  return newState;
}

function applyFold(state: GameState, playerIndex: number): GameState {
  const players = state.players.map((p, i) =>
    i === playerIndex ? { ...p, folded: true, lastAction: 'fold' as const } : p
  );
  return { ...state, players, lastActionTime: Date.now() };
}

function applyCheck(state: GameState, playerIndex: number): GameState {
  const players = state.players.map((p, i) =>
    i === playerIndex ? { ...p, lastAction: 'check' as const } : p
  );
  return { ...state, players, lastActionTime: Date.now() };
}

function applyCall(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const toCall = Math.min(state.currentBet - player.bet, player.chips);
  const newChips = player.chips - toCall;
  const newBet = player.bet + toCall;
  const isAllIn = newChips === 0;

  const players = state.players.map((p, i) =>
    i === playerIndex
      ? { ...p, chips: newChips, bet: newBet, totalBet: p.totalBet + toCall, allIn: isAllIn, lastAction: 'call' as const }
      : p
  );

  return { ...state, players, pot: state.pot + toCall, lastActionTime: Date.now() };
}

function applyRaise(state: GameState, playerIndex: number, totalBet: number): GameState {
  const player = state.players[playerIndex];
  const raiseAmount = totalBet - player.bet;
  const newChips = player.chips - raiseAmount;
  const isAllIn = newChips === 0;

  const players = state.players.map((p, i) =>
    i === playerIndex
      ? { ...p, chips: newChips, bet: totalBet, totalBet: p.totalBet + raiseAmount, allIn: isAllIn, lastAction: 'raise' as const }
      : p
  );

  const raiseOver = totalBet - state.currentBet;

  return {
    ...state,
    players,
    pot: state.pot + raiseAmount,
    currentBet: totalBet,
    minRaise: Math.max(state.minRaise, raiseOver),
    lastActionTime: Date.now(),
  };
}

function applyAllIn(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const allInAmount = player.chips;
  const newBet = player.bet + allInAmount;

  const players = state.players.map((p, i) =>
    i === playerIndex
      ? { ...p, chips: 0, bet: newBet, totalBet: p.totalBet + allInAmount, allIn: true, lastAction: 'allin' as const }
      : p
  );

  const newCurrentBet = Math.max(state.currentBet, newBet);
  const raiseOver = newBet - state.currentBet;

  return {
    ...state,
    players,
    pot: state.pot + allInAmount,
    currentBet: newCurrentBet,
    minRaise: raiseOver > 0 ? Math.max(state.minRaise, raiseOver) : state.minRaise,
    lastActionTime: Date.now(),
  };
}

function advanceGame(state: GameState): GameState {
  // Check if only one player remains
  const activePlayers = state.players.filter(p => !p.folded);
  if (activePlayers.length === 1) {
    return endHand(state);
  }

  // Find next player to act
  const nextPlayer = findNextPlayer(state);

  if (nextPlayer === -1) {
    // Betting round complete, move to next phase
    return advancePhase(state);
  }

  return { ...state, activePlayerIndex: nextPlayer };
}

function findNextPlayer(state: GameState): number {
  const startIndex = state.activePlayerIndex;
  let index = (startIndex + 1) % state.players.length;

  // Track if we've seen all players
  const seen = new Set<number>();

  while (!seen.has(index)) {
    seen.add(index);
    const player = state.players[index];

    // Skip folded and all-in players
    if (!player.folded && !player.allIn) {
      // Player needs to act if:
      // 1. They haven't acted yet (no lastAction)
      // 2. Their bet is less than the current bet
      if (player.lastAction === undefined || player.bet < state.currentBet) {
        return index;
      }
    }

    index = (index + 1) % state.players.length;
  }

  return -1; // No one needs to act
}

function advancePhase(state: GameState): GameState {
  // Reset bets for new betting round
  const players = state.players.map(p => ({
    ...p,
    bet: 0,
    lastAction: undefined,
  }));

  let newState: GameState = { ...state, players, currentBet: 0 };

  // Deal community cards based on phase
  switch (state.phase) {
    case 'preflop': {
      // Deal flop (3 cards)
      const flop = dealCards(newState.deck, 3);
      newState = { ...newState, phase: 'flop', communityCards: flop };
      break;
    }
    case 'flop': {
      // Deal turn (1 card)
      const turn = dealCards(newState.deck, 1);
      newState = { ...newState, phase: 'turn', communityCards: [...state.communityCards, ...turn] };
      break;
    }
    case 'turn': {
      // Deal river (1 card)
      const river = dealCards(newState.deck, 1);
      newState = { ...newState, phase: 'river', communityCards: [...state.communityCards, ...river] };
      break;
    }
    case 'river': {
      // Go to showdown
      return endHand(newState);
    }
  }

  // Check if we should skip betting (all players all-in except one)
  const playersWhoCanAct = newState.players.filter(p => !p.folded && !p.allIn);
  if (playersWhoCanAct.length <= 1) {
    // Skip to next phase
    return advancePhase(newState);
  }

  // Find first player to act (first active player after dealer)
  let firstToAct = newState.dealerIndex;
  do {
    firstToAct = (firstToAct + 1) % newState.players.length;
  } while (newState.players[firstToAct].folded || newState.players[firstToAct].allIn);

  return { ...newState, activePlayerIndex: firstToAct, lastActionTime: Date.now() };
}

function endHand(state: GameState): GameState {
  const activePlayers = state.players.filter(p => !p.folded);

  let winners: WinnerInfo[];

  if (activePlayers.length === 1) {
    // Single winner (everyone else folded)
    winners = [{
      odentity: activePlayers[0].odentity,
      amount: state.pot,
      handName: 'Uncontested',
      cards: [],
    }];
  } else {
    // Showdown - evaluate hands
    const playerHands = activePlayers.map(p => ({
      playerId: p.odentity,
      cards: p.holeCards,
    }));

    const winnerResults = findWinners(playerHands, state.communityCards);

    // Split pot among winners
    const amountPerWinner = Math.floor(state.pot / winnerResults.length);
    winners = winnerResults.map(w => ({
      odentity: w.playerId,
      amount: amountPerWinner,
      handName: w.hand.name,
      cards: w.hand.cards,
    }));
  }

  // Award chips to winners
  const players = state.players.map(p => {
    const winAmount = winners.find(w => w.odentity === p.odentity)?.amount || 0;
    return { ...p, chips: p.chips + winAmount };
  });

  // Check if game should continue
  const playersWithChips = players.filter(p => p.chips > 0 && !p.disconnected);

  if (playersWithChips.length <= 1) {
    // Game over
    return {
      ...state,
      phase: 'finished',
      players,
      winners,
      pot: 0,
    };
  }

  // Prepare for next hand (will be triggered separately)
  return {
    ...state,
    phase: 'showdown',
    players,
    winners,
    pot: 0,
    lastActionTime: Date.now(),
  };
}

// Get valid actions for a player
export function getValidActions(state: GameState, playerIndex: number): ValidAction[] {
  const player = state.players[playerIndex];
  const actions: ValidAction[] = [];

  if (player.folded || player.allIn) {
    return [];
  }

  // Can always fold (unless check is free)
  if (state.currentBet > player.bet) {
    actions.push({ action: 'fold' });
  }

  // Check if no bet to call
  if (state.currentBet === player.bet) {
    actions.push({ action: 'check' });
  }

  // Call if there's a bet
  if (state.currentBet > player.bet && player.chips > 0) {
    const toCall = state.currentBet - player.bet;
    if (toCall <= player.chips) {
      actions.push({ action: 'call' });
    }
  }

  // Raise if we have enough chips
  const minRaiseTotal = state.currentBet + state.minRaise;
  if (player.chips + player.bet > state.currentBet) {
    if (player.chips + player.bet >= minRaiseTotal) {
      actions.push({
        action: 'raise',
        minAmount: minRaiseTotal,
        maxAmount: player.chips + player.bet,
      });
    }
  }

  // All-in is always available if we have chips
  if (player.chips > 0) {
    actions.push({ action: 'allin' });
  }

  return actions;
}

// Convert game state to client-safe version
export function toClientState(state: GameState, viewerIdentity: string | null): ClientGameState {
  const viewerIndex = viewerIdentity
    ? state.players.findIndex(p => p.odentity === viewerIdentity)
    : -1;

  const isShowdown = state.phase === 'showdown' || state.phase === 'finished';

  const clientPlayers: ClientPlayer[] = state.players.map((p, i) => ({
    odentity: p.odentity,
    name: p.name,
    seatIndex: p.seatIndex,
    chips: p.chips,
    bet: p.bet,
    folded: p.folded,
    allIn: p.allIn,
    disconnected: p.disconnected,
    lastAction: p.lastAction,
    isDealer: p.isDealer,
    isSmallBlind: p.isSmallBlind,
    isBigBlind: p.isBigBlind,
    // Only show hole cards if:
    // 1. It's the viewer's cards, or
    // 2. It's showdown and player hasn't folded
    holeCards: (i === viewerIndex || (isShowdown && !p.folded)) ? p.holeCards : null,
    showCards: isShowdown && !p.folded,
  }));

  const validActions = viewerIndex !== -1 && viewerIndex === state.activePlayerIndex
    ? getValidActions(state, viewerIndex)
    : [];

  return {
    tableId: state.tableId,
    phase: state.phase,
    pot: state.pot,
    sidePots: state.sidePots,
    communityCards: state.communityCards,
    currentBet: state.currentBet,
    minRaise: state.minRaise,
    dealerIndex: state.dealerIndex,
    activePlayerIndex: state.activePlayerIndex,
    players: clientPlayers,
    blindLevel: state.blindLevel,
    blindLevelStartTime: state.blindLevelStartTime,
    handNumber: state.handNumber,
    lastActionTime: state.lastActionTime,
    winners: state.winners,
    config: state.config,
    yourSeatIndex: viewerIndex !== -1 ? state.players[viewerIndex].seatIndex : null,
    validActions,
  };
}

// Export for external use

