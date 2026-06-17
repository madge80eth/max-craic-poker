// DEV ONLY — remove before production
import { GameState, GameAction } from './types';
import { processAction } from './engine';

// DEV ONLY — remove before production
export function getActiveBot(state: GameState): string | null {
  if (process.env.NODE_ENV !== 'development') return null;
  if (state.activePlayerIndex < 0 || state.activePlayerIndex >= state.players.length) return null;
  const active = state.players[state.activePlayerIndex];
  return active?.isBot ? active.odentity : null;
}

// DEV ONLY — remove before production
function buildBotAction(state: GameState, botId: string): GameAction {
  const bot = state.players.find(p => p.odentity === botId)!;
  const callAmount = state.currentBet - bot.bet;

  if (callAmount > bot.chips) {
    // Facing a bet the bot can't fully cover — fold
    return { type: 'fold', playerId: botId };
  }
  if (callAmount <= 0) {
    return { type: 'check', playerId: botId };
  }
  return { type: 'call', playerId: botId };
}

// DEV ONLY — remove before production
// Processes all consecutive bot turns after a human action. Returns the updated state.
export async function runBotTurns(state: GameState): Promise<GameState> {
  if (process.env.NODE_ENV !== 'development') return state;

  let current = state;
  for (let i = 0; i < 12; i++) { // safety limit — max turns in one round
    if (current.phase === 'waiting' || current.phase === 'showdown' || current.phase === 'finished') break;
    const botId = getActiveBot(current);
    if (!botId) break;
    const action = buildBotAction(current, botId);
    current = await processAction(current, action);
  }
  return current;
}
