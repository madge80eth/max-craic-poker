import { useState, useEffect, useRef } from "react";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CRAIC HOME GAME — SEALED POKER TABLE UI  (v2: playable demo engine)
 * ─────────────────────────────────────────────────────────────────────────────
 *  RULES FOR CLAUDE CODE (read before touching anything):
 *  1. <PokerTable state={...}/> is SEALED. Do not edit its internals, styles,
 *     layout maths, or animations. Visual sign-off happened elsewhere.
 *  2. Your only job is an ADAPTER: map the engine's /api/poker/state output
 *     to the GAME_STATE shape below and wire onAction to the engine's act
 *     endpoint. The DemoHarness below is a REFERENCE engine — copy its
 *     state-mapping if useful, then delete it. Never modify PokerTable.
 *  3. This file has ZERO dependencies on Tailwind config, global CSS, fonts,
 *     or any other file in the repo. Keep it that way.
 *  4. The demo engine does NOT model side pots (winner scoops). The real
 *     engine must handle side pots server-side; the UI needs no change.
 *
 *  GAME_STATE CONTRACT (what the adapter must produce):
 *  {
 *    handId:  string,
 *    stage:   'preflop' | 'flop' | 'turn' | 'river' | 'showdown',
 *    blinds:  { sb: number, bb: number },
 *    pot:     number,            // total pot to display (incl. live bets)
 *    board:   string[],          // 0–5 card codes: 'Ah','Td','2c','Ks','Qh'
 *    streetFlash: string | null, // 'FLOP'|'TURN'|'RIVER' shown briefly as the
 *                                // street deals; engine sets it during the
 *                                // deal beat and clears it when action opens
 *    toAct:   number | null,     // seat index of player to act
 *    actingAs: string | null,    // name shown when input is on a villain's
 *                                // behalf (ghost/host mode); null normally
 *    players: [{
 *      seat: 0-5,                // seat 0 is ALWAYS rendered as hero (bottom)
 *      name: string,
 *      stack: number,
 *      cards: null                //  null       = empty seat / sat out
 *             | ['XX','XX']       //  face-down
 *             | ['Ah','Kd'],      //  face-up (showdown / ghost / hero)
 *      bet: number,              // chips in front of player this street
 *      folded: bool, allIn: bool, sittingOut: bool,
 *      isDealer: bool,
 *      timeLeft: 0..1 | null,    // fraction of decision clock remaining
 *      showLabel: string | null  // e.g. 'Pair of Queens' at showdown
 *    }],
 *    hero: {
 *      seat: number,
 *      handLabel: string | null, // hero's live hand, e.g. 'Two Pair · Aces & Kings'
 *      actions: null | {         // non-null ⇒ action bar is LIVE for toAct
 *        canFold: bool, canCheck: bool,
 *        callAmount: number,     // 0 when check available
 *        minRaise: number,       // raise-TO amount
 *        maxRaise: number,       // raise-TO amount (all-in)
 *        actorBet: number,       // actor's chips already in this street
 *        pot: number             // display pot, for sizing presets
 *      }
 *    },
 *    winners: null | [{ seat: number, amount: number, handLabel: string }],
 *    tournament?: {                // OPTIONAL — when present the sealed HUD renders
 *      level: number, sb: number, bb: number, ante: number,
 *      nextLevelInSec: number,     // countdown to next level
 *      playersLeft: number, entrants: number,
 *      avgStack: number, yourRank: number | null,
 *      prizePool: string,          // display string e.g. '1,000 USDC'
 *      paidPlaces: number,
 *      banner: null | { text: string }   // interstitial: moves, hand-for-hand,
 *    }                                   // final table, level up — engine sets
 *                                        // and clears it
 *  }
 *
 *  onAction(type, amount) fires with: ('fold') ('check') ('call', n) ('raise', toN)
 *  plus ('next') when the user taps NEXT HAND after winners are shown —
 *  the adapter should start the next hand.
 *  Sounds, chip-throw animations, and pot-to-winner chip flights are all
 *  INTERNAL to the sealed component (state-diff driven). The adapter does
 *  nothing to get them.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/* ————— design tokens ————— */
const T = {
  night: "#0E1420",
  nightUp: "#151D2C",
  rail: "#0A241A",
  feltA: "#1E6B47",
  feltB: "#124A31",
  line: "rgba(255,255,255,0.10)",
  ink: "#EDEFF4",
  inkDim: "rgba(237,239,244,0.55)",
  brass: "#E8B54D",
  brassDeep: "#B98A2E",
  cardIvory: "#F7F4EC",
  spade: "#20242E",
  heart: "#D64545",
  diamond: "#3B82C4",
  club: "#3E9B5F",
  fold: "#B8434E",
  call: "#4E93D6",
  raise: "#2F9E63",
  mono: "'SF Mono','Cascadia Mono','Roboto Mono',monospace",
  sans: "-apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif",
};

const SUIT = {
  s: { glyph: "♠", color: T.spade },
  h: { glyph: "♥", color: T.heart },
  d: { glyph: "♦", color: T.diamond },
  c: { glyph: "♣", color: T.club },
};

/* seat + bet anchor positions, % of table area. Seat 0 = hero.
   Bets for the upper side seats (2, 4) sit ABOVE the board band so chips
   can never overlap community cards. */
const SEAT_POS = [
  { x: 50, y: 88, bx: 50, by: 63 },
  { x: 13, y: 71, bx: 29, by: 61 },
  { x: 13, y: 32, bx: 29, by: 31 },
  { x: 50, y: 9,  bx: 50, by: 22 },
  { x: 87, y: 32, bx: 71, by: 31 },
  { x: 87, y: 71, bx: 71, by: 61 },
];
const AVATAR_HUES = [28, 205, 275, 152, 348, 96];

/* on-felt dealer button position per seat */
const DEALER_POS = [
  { x: 60, y: 68 }, { x: 22, y: 66 }, { x: 22, y: 37 },
  { x: 41, y: 21 }, { x: 78, y: 37 }, { x: 79, y: 67 },
];
/* start offset (px) for the bet-throw animation, roughly from the seat */
const THROW = [
  { x: 0, y: 60 }, { x: -52, y: 30 }, { x: -52, y: 8 },
  { x: 0, y: -42 }, { x: 52, y: 8 }, { x: 52, y: 30 },
];

const fmt = (n) => (n ?? 0).toLocaleString("en-GB");
const rankOf = (c) => (c[0] === "T" ? "10" : c[0]);

/* ————— sound engine (synthesised, no assets, muteable) ————— */
const sfx = (() => {
  let ctx = null, master = null, muted = false;
  const ensure = () => {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = 0.16;
        master.connect(ctx.destination);
      }
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return true;
    } catch (e) { return false; }
  };
  const blip = (f, at, dur, type, vol) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(master);
    o.start(at); o.stop(at + dur + 0.02);
  };
  const noise = (at, dur, freq, q, vol) => {
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(at); src.stop(at + dur);
  };
  const ok = () => !muted && ensure();
  return {
    poke() { ensure(); },
    setMuted(m) { muted = m; },
    deal() { if (!ok()) return; noise(ctx.currentTime, 0.07, 2600, 1.2, 0.5); },
    flip() { if (!ok()) return; noise(ctx.currentTime, 0.05, 3300, 1.4, 0.4); },
    chip() {
      if (!ok()) return; const t = ctx.currentTime;
      blip(2100, t, 0.045, "triangle", 0.5);
      blip(1750, t + 0.055, 0.05, "triangle", 0.4);
      noise(t, 0.03, 4200, 2, 0.15);
    },
    fold() { if (!ok()) return; noise(ctx.currentTime, 0.09, 300, 0.8, 0.5); },
    turn() {
      if (!ok()) return; const t = ctx.currentTime;
      blip(660, t, 0.09, "sine", 0.32);
      blip(880, t + 0.1, 0.12, "sine", 0.26);
    },
    win() {
      if (!ok()) return; const t = ctx.currentTime;
      [523, 659, 784, 1046].forEach((f, i) => blip(f, t + i * 0.06, 0.5, "sine", 0.2));
    },
    chipsWin() {
      if (!ok()) return; const t = ctx.currentTime;
      for (let i = 0; i < 6; i++) blip(1900 - i * 90, t + i * 0.07, 0.05, "triangle", 0.32);
    },
  };
})();

function usePrev(v) { const r = useRef(); useEffect(() => { r.current = v; }); return r.current; }

/* ————— hand evaluation (pure) ————— */
/* EVAL-START */
const RVAL = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };
const RNAME = { 2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight", 9: "Nine", 10: "Ten", 11: "Jack", 12: "Queen", 13: "King", 14: "Ace" };
const RPLUR = { 2: "Twos", 3: "Threes", 4: "Fours", 5: "Fives", 6: "Sixes", 7: "Sevens", 8: "Eights", 9: "Nines", 10: "Tens", 11: "Jacks", 12: "Queens", 13: "Kings", 14: "Aces" };

function score5(cs) {
  const vals = cs.map((c) => RVAL[c[0]]).sort((a, b) => b - a);
  const suits = cs.map((c) => c[1]);
  const flush = suits.every((s) => s === suits[0]);
  const uniq = [...new Set(vals)];
  let sHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) sHigh = uniq[0];
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[1] - uniq[4] === 3) sHigh = 5;
  }
  const counts = {};
  vals.forEach((v) => (counts[v] = (counts[v] || 0) + 1));
  const groups = Object.entries(counts)
    .map(([v, c]) => [c, Number(v)])
    .sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  if (flush && sHigh) return { r: [8, sHigh] };
  if (groups[0][0] === 4) return { r: [7, groups[0][1], groups[1][1]] };
  if (groups[0][0] === 3 && groups[1][0] === 2) return { r: [6, groups[0][1], groups[1][1]] };
  if (flush) return { r: [5, ...vals] };
  if (sHigh) return { r: [4, sHigh] };
  if (groups[0][0] === 3) return { r: [3, groups[0][1], groups[1][1], groups[2][1]] };
  if (groups[0][0] === 2 && groups[1][0] === 2)
    return { r: [2, groups[0][1], groups[1][1], groups[2][1]] };
  if (groups[0][0] === 2) return { r: [1, groups[0][1], groups[1][1], groups[2][1], groups[3][1]] };
  return { r: [0, ...vals] };
}

function cmpScore(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] || 0) - (b[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

function labelFor(r) {
  const c = r[0];
  if (c === 8) return r[1] === 14 ? "Royal Flush" : `Straight Flush · ${RNAME[r[1]]} High`;
  if (c === 7) return `Quads · ${RPLUR[r[1]]}`;
  if (c === 6) return `Full House · ${RPLUR[r[1]]} full of ${RPLUR[r[2]]}`;
  if (c === 5) return `Flush · ${RNAME[r[1]]} High`;
  if (c === 4) return `Straight · ${RNAME[r[1]]} High`;
  if (c === 3) return `Three of a Kind · ${RPLUR[r[1]]}`;
  if (c === 2) return `Two Pair · ${RPLUR[r[1]]} & ${RPLUR[r[2]]}`;
  if (c === 1) return `Pair of ${RPLUR[r[1]]}`;
  return `${RNAME[r[1]]} High`;
}

function bestOf(cards) {
  const n = cards.length;
  if (n === 5) {
    const s = score5(cards);
    return { r: s.r, label: labelFor(s.r) };
  }
  let best = null;
  if (n === 6) {
    for (let a = 0; a < 6; a++) {
      const s = score5(cards.filter((_, i) => i !== a));
      if (!best || cmpScore(s.r, best) > 0) best = s.r;
    }
  } else {
    for (let a = 0; a < n; a++)
      for (let b = a + 1; b < n; b++) {
        const s = score5(cards.filter((_, i) => i !== a && i !== b));
        if (!best || cmpScore(s.r, best) > 0) best = s.r;
      }
  }
  return { r: best, label: labelFor(best) };
}
/* EVAL-END */

/* ————— cards ————— */
function CardFace({ code, w, h, dealt }) {
  const s = SUIT[code[1]];
  return (
    <div
      className={dealt ? "cpt-deal" : ""}
      style={{
        width: w, height: h, borderRadius: Math.max(4, w * 0.11),
        background: `linear-gradient(160deg, #FFFFFF 0%, ${T.cardIvory} 70%)`,
        boxShadow: "0 2px 5px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(0,0,0,0.06)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: h * 0.01, flexShrink: 0,
        fontFamily: T.sans, userSelect: "none",
      }}
    >
      <div style={{ fontSize: h * 0.4, fontWeight: 800, lineHeight: 1, color: s.color, letterSpacing: "-0.02em" }}>
        {rankOf(code)}
      </div>
      <div style={{ fontSize: h * 0.32, lineHeight: 1, color: s.color }}>{s.glyph}</div>
    </div>
  );
}

function CardBack({ w, h, dealt }) {
  return (
    <div
      className={dealt ? "cpt-deal" : ""}
      style={{
        width: w, height: h, borderRadius: Math.max(4, w * 0.11),
        background: "#1B2A45",
        boxShadow: "0 2px 5px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.10)",
        position: "relative", overflow: "hidden", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", inset: Math.max(2, w * 0.09), borderRadius: Math.max(2, w * 0.06),
        border: "1px solid rgba(232,181,77,0.35)",
        background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 3px, transparent 3px 7px)",
      }}/>
    </div>
  );
}

function CardSlot({ w, h }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: Math.max(4, w * 0.11), flexShrink: 0,
      border: "1px solid rgba(255,255,255,0.13)",
      background: "rgba(0,0,0,0.14)",
    }}/>
  );
}

/* ————— seat furniture ————— */
function TimerRing({ frac }) {
  const R = 26, C = 2 * Math.PI * R;
  const col = frac > 0.35 ? T.brass : "#E05B5B";
  return (
    <svg width="60" height="60" style={{ position: "absolute", top: -6, left: -6, transform: "rotate(-90deg)" }}>
      <circle cx="30" cy="30" r={R} fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="3" />
      <circle cx="30" cy="30" r={R} fill="none" stroke={col} strokeWidth="3"
        strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - Math.max(0, frac))}
        style={{ transition: "stroke-dashoffset 0.12s linear, stroke 0.3s" }} />
    </svg>
  );
}

function ChipStack({ amount }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div style={{ position: "relative", width: 14, height: 17 }}>
        {[8, 4, 0].map((off) => (
          <div key={off} style={{
            position: "absolute", bottom: off * 0.45, left: 0, width: 14, height: 9,
            borderRadius: "50%", background: `linear-gradient(180deg, ${T.brass}, ${T.brassDeep})`,
            boxShadow: "inset 0 -1.5px 0 rgba(0,0,0,0.35), inset 0 0 0 1.5px rgba(255,255,255,0.25)",
          }}/>
        ))}
      </div>
      <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.ink, textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}>
        {fmt(amount)}
      </span>
    </div>
  );
}

function Seat({ p, active, winner }) {
  if (!p || p.cards === null) return null;
  const hue = AVATAR_HUES[p.seat % 6];
  const dim = p.folded || p.sittingOut;
  const showFaceUp = Array.isArray(p.cards) && p.cards[0] !== "XX";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
      opacity: dim ? 0.4 : 1, transition: "opacity 0.35s", position: "relative" }}>
      {/* hole cards behind avatar */}
      {!p.folded && !p.sittingOut && p.cards && (
        <div style={{ position: "absolute", top: -13, right: showFaceUp ? -30 : -16, display: "flex", zIndex: 0 }}>
          {showFaceUp ? (
            <>
              <div style={{ transform: "rotate(-5deg)" }}><CardFace code={p.cards[0]} w={26} h={37} dealt /></div>
              <div style={{ transform: "rotate(6deg)", marginLeft: -8 }}><CardFace code={p.cards[1]} w={26} h={37} dealt /></div>
            </>
          ) : (
            <>
              <div style={{ transform: "rotate(-6deg)" }}><CardBack w={19} h={27} /></div>
              <div style={{ transform: "rotate(7deg)", marginLeft: -9 }}><CardBack w={19} h={27} /></div>
            </>
          )}
        </div>
      )}
      {/* avatar */}
      <div className={winner ? "cpt-winglow" : ""} style={{ position: "relative", width: 48, height: 48, zIndex: 1 }}>
        {active && p.timeLeft != null && <TimerRing frac={p.timeLeft} />}
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: `linear-gradient(145deg, hsl(${hue} 45% 42%), hsl(${hue} 55% 26%))`,
          border: `2px solid ${winner ? T.brass : "rgba(255,255,255,0.22)"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: T.sans, fontWeight: 800, fontSize: 17, color: "rgba(255,255,255,0.92)",
          boxShadow: "0 3px 8px rgba(0,0,0,0.5)",
        }}>
          {p.name.slice(0, 2).toUpperCase()}
        </div>
        {(p.folded || p.allIn) && (
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            padding: "2.5px 8px", borderRadius: 20, zIndex: 3, whiteSpace: "nowrap",
            fontFamily: T.sans, fontSize: 9, fontWeight: 800, letterSpacing: "0.09em",
            background: p.allIn ? `linear-gradient(180deg, ${T.brass}, ${T.brassDeep})` : "rgba(20,24,32,0.92)",
            color: p.allIn ? "#2A1F06" : T.inkDim,
            border: p.allIn ? "none" : `1px solid ${T.line}`,
          }}>
            {p.allIn ? "ALL-IN" : "FOLDED"}
          </div>
        )}
      </div>
      {/* name + stack plate */}
      <div style={{
        minWidth: 76, padding: "3px 9px", borderRadius: 9, textAlign: "center",
        background: "rgba(12,16,24,0.88)", border: `1px solid ${winner ? T.brass : T.line}`,
        boxShadow: "0 2px 6px rgba(0,0,0,0.4)", zIndex: 1,
      }}>
        <div style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: 700, color: T.ink,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 86 }}>
          {p.name}
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: winner ? T.brass : T.inkDim }}>
          {fmt(p.stack)}
        </div>
      </div>
      {p.showLabel && !p.folded && (
        <div style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 700, letterSpacing: "0.06em",
          color: T.inkDim, background: "rgba(12,16,24,0.85)", padding: "2px 7px", borderRadius: 7,
          border: `1px solid ${T.line}`, whiteSpace: "nowrap" }}>
          {p.showLabel}
        </div>
      )}
    </div>
  );
}

/* ————— raise tray ————— */
function RaiseTray({ a, actorCards, actorText, onConfirm, onClose }) {
  const [amt, setAmt] = useState(a.minRaise);
  const clamp = (v) => Math.max(a.minRaise, Math.min(a.maxRaise, Math.round(v / 25) * 25));
  const presets = [
    ["MIN", a.minRaise],
    ["½ POT", clamp(a.actorBet + a.callAmount + a.pot * 0.5)],
    ["POT", clamp(a.actorBet + a.callAmount + a.pot)],
    ["ALL-IN", a.maxRaise],
  ];
  const showCards = Array.isArray(actorCards) && actorCards[0] && actorCards[0] !== "XX";
  return (
    <div style={{
      position: "absolute", right: 10, left: "auto", width: "min(430px, calc(100vw - 20px))",
      bottom: "100%", marginBottom: 8,
      background: "rgba(16,21,31,0.97)", border: `1px solid ${T.line}`, borderRadius: 16,
      padding: 10, boxShadow: "0 -8px 30px rgba(0,0,0,0.55)", zIndex: 30,
    }}>
      {/* the acting hand stays visible even where the tray overlaps the table */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {showCards && (
          <div style={{ display: "flex" }}>
            <CardFace code={actorCards[0]} w={24} h={34} />
            <div style={{ marginLeft: -7, transform: "rotate(7deg)" }}>
              <CardFace code={actorCards[1]} w={24} h={34} />
            </div>
          </div>
        )}
        <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
          color: T.inkDim, textTransform: "uppercase" }}>
          {actorText}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {presets.map(([label, v]) => (
          <button key={label} onClick={() => setAmt(v)} style={{
            flex: 1, padding: "7px 0", borderRadius: 9, cursor: "pointer",
            background: amt === v ? "rgba(232,181,77,0.16)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${amt === v ? T.brass : T.line}`,
            color: amt === v ? T.brass : T.inkDim,
            fontFamily: T.sans, fontSize: 10, fontWeight: 800, letterSpacing: "0.07em",
          }}>{label}</button>
        ))}
      </div>
      <input type="range" min={a.minRaise} max={Math.max(a.minRaise, a.maxRaise)} step={25}
        value={amt} onChange={(e) => setAmt(Number(e.target.value))}
        style={{ width: "100%", accentColor: T.brass, marginBottom: 10 }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onClose} style={{
          padding: "0 16px", height: 46, borderRadius: 12, background: "rgba(255,255,255,0.05)",
          border: `1px solid ${T.line}`, color: T.inkDim, fontFamily: T.sans, fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>Back</button>
        <button onClick={() => onConfirm(Math.min(amt, a.maxRaise))} style={{
          flex: 1, height: 46, borderRadius: 12, border: "none", cursor: "pointer",
          background: `linear-gradient(180deg, ${T.raise}, #1F7A49)`,
          color: "#EAFBF1", fontFamily: T.sans, fontSize: 14, fontWeight: 800, letterSpacing: "0.05em",
        }}>
          RAISE TO {fmt(Math.min(amt, a.maxRaise))}
        </button>
      </div>
    </div>
  );
}

/* ————— action bar ————— */
function ActionBar({ state, onAction }) {
  const [trayOpen, setTrayOpen] = useState(false);
  const a = state.hero.actions;
  const live = !!a && !state.winners;
  useEffect(() => { if (!live) setTrayOpen(false); }, [live, state.toAct]);

  const base = {
    flex: 1, height: 54, borderRadius: 14, cursor: live ? "pointer" : "default",
    fontFamily: T.sans, fontSize: 13.5, fontWeight: 800, letterSpacing: "0.06em",
    opacity: live ? 1 : 0.35, transition: "opacity 0.25s, transform 0.08s",
    border: "1px solid transparent",
  };
  const waitingName = state.toAct != null && !live && !state.winners
    ? state.players.find((p) => p.seat === state.toAct)?.name : null;
  const actor = state.players.find((p) => p.seat === state.toAct);

  if (state.winners) {
    return (
      <div style={{ padding: "8px 10px calc(10px + env(safe-area-inset-bottom))",
        background: `linear-gradient(180deg, ${T.nightUp}, ${T.night})`, borderTop: `1px solid ${T.line}` }}>
        <button onClick={() => onAction("next")} style={{
          width: "100%", height: 54, borderRadius: 14, border: "none", cursor: "pointer",
          background: `linear-gradient(180deg, ${T.brass}, ${T.brassDeep})`, color: "#241B05",
          fontFamily: T.sans, fontSize: 14, fontWeight: 900, letterSpacing: "0.08em",
        }}>
          NEXT HAND {"▸"}
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", padding: "8px 10px calc(10px + env(safe-area-inset-bottom))",
      background: `linear-gradient(180deg, ${T.nightUp}, ${T.night})`, borderTop: `1px solid ${T.line}` }}>
      {trayOpen && a && <RaiseTray a={a} actorCards={actor?.cards}
        actorText={state.actingAs ? `${state.actingAs}'s hand` : (state.hero.handLabel ?? "Your raise")}
        onClose={() => setTrayOpen(false)}
        onConfirm={(amt) => { setTrayOpen(false); onAction("raise", amt); }} />}
      {waitingName && (
        <div style={{ position: "absolute", top: -24, left: 0, right: 0, textAlign: "center",
          fontFamily: T.sans, fontSize: 11, fontWeight: 600, color: T.inkDim }}>
          {waitingName} to act…
        </div>
      )}
      {live && state.actingAs && (
        <div style={{ position: "absolute", top: -26, left: "50%", transform: "translateX(-50%)",
          padding: "3px 12px", borderRadius: 20, whiteSpace: "nowrap",
          background: "rgba(232,181,77,0.14)", border: `1px solid rgba(232,181,77,0.6)`,
          fontFamily: T.sans, fontSize: 10, fontWeight: 900, letterSpacing: "0.12em", color: T.brass }}>
          GHOST {"·"} {state.actingAs.toUpperCase()}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={!live} onClick={() => onAction("fold")}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          style={{ ...base, background: "#2A161A", borderColor: "rgba(184,67,78,0.55)", color: "#E98A93" }}>
          FOLD
        </button>
        <button disabled={!live} onClick={() => onAction(a && a.callAmount > 0 ? "call" : "check", a?.callAmount)}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          style={{ ...base, background: "#13273D", borderColor: "rgba(78,147,214,0.5)", color: "#9CC6EE" }}>
          {a && a.callAmount > 0 ? `CALL ${fmt(a.callAmount)}` : "CHECK"}
        </button>
        <button disabled={!live} onClick={() => setTrayOpen((v) => !v)}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          style={{ ...base, background: `linear-gradient(180deg, ${T.raise}, #1F7A49)`, color: "#EAFBF1" }}>
          RAISE
        </button>
      </div>
    </div>
  );
}

/* chips flying from the pot to the winner's seat */
function FlyChip({ target, delay }) {
  const [go, setGo] = useState(false);
  const jit = useRef({ x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 5 });
  useEffect(() => {
    const t = setTimeout(() => setGo(true), 20 + delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div style={{
      position: "absolute",
      left: go ? `${target.x + jit.current.x}%` : "50%",
      top: go ? `${target.y + jit.current.y}%` : "30%",
      width: 15, height: 10, borderRadius: "50%", zIndex: 7, pointerEvents: "none",
      background: `linear-gradient(180deg, ${T.brass}, ${T.brassDeep})`,
      boxShadow: "inset 0 -1.5px 0 rgba(0,0,0,0.35), inset 0 0 0 1.5px rgba(255,255,255,0.25)",
      transform: "translate(-50%,-50%)",
      opacity: go ? 0 : 1,
      transition: "left 0.62s cubic-bezier(0.25,0.8,0.35,1), top 0.62s cubic-bezier(0.25,0.8,0.35,1), opacity 0.22s 0.48s ease-in",
    }}/>
  );
}

/* tournament HUD strip — renders only when state.tournament is present */
function TournamentHUD({ t }) {
  const mm = Math.floor(t.nextLevelInSec / 60), ss = String(t.nextLevelInSec % 60).padStart(2, "0");
  const cell = (label, value, accent) => (
    <div style={{ display: "flex", alignItems: "baseline", gap: 4, whiteSpace: "nowrap" }}>
      <span style={{ fontFamily: T.sans, fontSize: 8, fontWeight: 800, letterSpacing: "0.14em",
        color: "rgba(237,239,244,0.4)" }}>{label}</span>
      <span style={{ fontFamily: T.mono, fontSize: 11.5, fontWeight: 700,
        color: accent ? T.brass : T.ink }}>{value}</span>
    </div>
  );
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "5px 14px 7px",
      overflowX: "auto", flexShrink: 0, borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
      {cell("LVL", `${t.level} · ${t.sb}/${t.bb}${t.ante ? ` (${t.ante})` : ""}`, true)}
      {cell("NEXT", `${mm}:${ss}`)}
      {cell("LEFT", `${t.playersLeft}/${t.entrants}`)}
      {cell("AVG", fmt(t.avgStack))}
      {t.yourRank != null && cell("RANK", `${t.yourRank}`)}
      {cell("POOL", t.prizePool, true)}
    </div>
  );
}

/* interstitial banner: moves, hand-for-hand, final table, level up */
function TourneyBanner({ text }) {
  return (
    <div className="cpt-ribbon" style={{ position: "absolute", left: "50%", top: "20%",
      transform: "translate(-50%,-50%)", zIndex: 9, textAlign: "center", maxWidth: "88%",
      background: "rgba(13,17,25,0.95)", border: `1.5px solid ${T.brass}`, borderRadius: 14,
      padding: "9px 22px", boxShadow: "0 8px 30px rgba(0,0,0,0.55), 0 0 24px rgba(232,181,77,0.2)" }}>
      <div style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 900,
        letterSpacing: "0.09em", color: T.brass }}>{text}</div>
    </div>
  );
}

/* ═════════════════════════ SEALED TABLE ═════════════════════════ */
export function PokerTable({ state, onAction }) {
  const winnerSeats = new Set((state.winners ?? []).map((w) => w.seat));
  const hero = state.players.find((p) => p.seat === state.hero.seat);
  const winNames = (state.winners ?? [])
    .map((w) => state.players.find((p) => p.seat === w.seat)?.name.toUpperCase())
    .filter(Boolean);
  const [muted, setMuted] = useState(false);
  const [fly, setFly] = useState(null);
  const prev = usePrev(state);

  /* state-diff driven sounds + winner chip flight — adapter gets these free */
  useEffect(() => {
    if (!prev) return;
    const newCards = state.board.length - prev.board.length;
    if (newCards > 0) for (let i = 0; i < newCards; i++) setTimeout(() => sfx.deal(), i * 95);
    const prevBySeat = {};
    prev.players.forEach((q) => { prevBySeat[q.seat] = q; });
    if (state.players.some((p) => p.bet > (prevBySeat[p.seat]?.bet ?? 0))) sfx.chip();
    if (state.players.some((p) => p.folded && prevBySeat[p.seat] && !prevBySeat[p.seat].folded)) sfx.fold();
    if (state.toAct == null && state.players.some((p) => {
      const q = prevBySeat[p.seat];
      return q && q.cards && q.cards[0] === "XX" && p.cards && p.cards[0] !== "XX";
    })) sfx.flip();
    if (state.hero.actions && (!prev.hero.actions || prev.toAct !== state.toAct)) sfx.turn();
    if (state.winners && !prev.winners) {
      sfx.win();
      setTimeout(() => sfx.chipsWin(), 180);
      setFly({
        id: Date.now(),
        targets: state.winners.map((w) => ({ x: SEAT_POS[w.seat].x, y: SEAT_POS[w.seat].y })),
      });
    }
  }, [state]);

  useEffect(() => {
    if (!fly) return;
    const t = setTimeout(() => setFly(null), 1500);
    return () => clearTimeout(t);
  }, [fly]);

  return (
    <div onPointerDown={() => sfx.poke()} style={{ display: "flex", flexDirection: "column", height: "100%", background: T.night, overflow: "hidden" }}>
      <style>{`
        @keyframes cptDeal { from { transform: translateY(-16px) scale(0.55); opacity: 0; }
                             to   { transform: translateY(0) scale(1); opacity: 1; } }
        .cpt-deal { animation: cptDeal 0.32s cubic-bezier(0.2, 0.9, 0.3, 1.15) both; }
        @keyframes cptGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(232,181,77,0); }
                             50%     { box-shadow: 0 0 22px 6px rgba(232,181,77,0.55); } }
        .cpt-winglow { animation: cptGlow 1.4s ease-in-out infinite; border-radius: 50%; }
        @keyframes cptRibbon { from { transform: translate(-50%,-50%) scale(0.8); opacity: 0; }
                               to   { transform: translate(-50%,-50%) scale(1); opacity: 1; } }
        .cpt-ribbon { animation: cptRibbon 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2) both; }
        @keyframes cptFlash { from { transform: translate(-50%,-50%) translateY(6px); opacity: 0; }
                              to   { transform: translate(-50%,-50%) translateY(0); opacity: 1; } }
        .cpt-flash { animation: cptFlash 0.3s ease-out both; }
        @keyframes cptBet { from { transform: translate(var(--tx), var(--ty)) scale(0.55) rotate(-12deg); opacity: 0.25; }
                            to   { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 1; } }
        .cpt-bet { animation: cptBet 0.38s cubic-bezier(0.2, 0.85, 0.3, 1.15) both; }
        @keyframes cptPop { 0% { transform: scale(1); } 45% { transform: scale(1.18); } 100% { transform: scale(1); } }
        .cpt-pop { display: inline-block; animation: cptPop 0.28s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .cpt-deal, .cpt-winglow, .cpt-ribbon, .cpt-flash, .cpt-bet, .cpt-pop { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
        }
        .cpt-root button:disabled { cursor: default; }
      `}</style>

      {/* top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px 8px", flexShrink: 0 }}>
        <div style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", color: T.ink }}>
          CRAIC <span style={{ color: T.brass }}>{"♠"}</span> HOME GAME
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontFamily: T.sans, fontSize: 10.5, fontWeight: 600, color: T.inkDim, letterSpacing: "0.04em" }}>
            NL Hold'em {"·"} {state.blinds.sb}/{state.blinds.bb} {"·"} #{state.handId}
          </div>
          <button
            onClick={() => { const next = !muted; setMuted(next); sfx.setMuted(next); sfx.poke(); }}
            style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${T.line}`, borderRadius: 8,
              padding: "3px 8px", cursor: "pointer", fontSize: 12, lineHeight: 1 }}>
            {muted ? "🔇" : "🔊"}
          </button>
        </div>
      </div>

      {state.tournament && <TournamentHUD t={state.tournament} />}

      {/* table area */}
      <div className="cpt-root" style={{ flex: 1, position: "relative", minHeight: 0 }}>
        {state.tournament?.banner && <TourneyBanner text={state.tournament.banner.text} />}
        {/* rail + felt */}
        <div style={{ position: "absolute", left: "3%", right: "3%", top: "5%", bottom: "13%",
          borderRadius: "48%", background: `linear-gradient(180deg, #123526, ${T.rail})`,
          boxShadow: "0 14px 40px rgba(0,0,0,0.55), inset 0 2px 3px rgba(255,255,255,0.08)", padding: 7 }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "48%",
            background: `radial-gradient(ellipse at 50% 32%, ${T.feltA} 0%, ${T.feltB} 68%, #0D3B26 100%)`,
            boxShadow: "inset 0 6px 24px rgba(0,0,0,0.45), inset 0 0 0 1.5px rgba(255,255,255,0.06)" }} />
        </div>

        {/* pot */}
        <div style={{ position: "absolute", left: "50%", top: "30%", transform: "translate(-50%,-50%)",
          textAlign: "center", zIndex: 2 }}>
          <div style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 800, letterSpacing: "0.22em",
            color: "rgba(255,255,255,0.5)" }}>POT</div>
          <div key={state.pot} className="cpt-pop" style={{ fontFamily: T.mono, fontSize: 21, fontWeight: 800, color: T.brass,
            textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}>{fmt(state.pot)}</div>
        </div>

        {/* board — 5 FIXED slots, cards deal into place, nothing ever slides */}
        <div style={{ position: "absolute", left: "50%", top: "45%", transform: "translate(-50%,-50%)",
          display: "flex", gap: 6, zIndex: 2 }}>
          {[0, 1, 2, 3, 4].map((i) =>
            state.board[i]
              ? <CardFace key={state.handId + state.board[i]} code={state.board[i]} w={46} h={65} dealt />
              : <CardSlot key={"slot" + i} w={46} h={65} />
          )}
        </div>

        {/* street flash — announces FLOP / TURN / RIVER during the deal beat */}
        {state.streetFlash && (
          <div className="cpt-flash" style={{ position: "absolute", left: "50%", top: "56.5%",
            transform: "translate(-50%,-50%)", zIndex: 6, padding: "3px 14px", borderRadius: 20,
            background: "rgba(13,17,25,0.9)", border: `1px solid rgba(232,181,77,0.55)`,
            fontFamily: T.sans, fontSize: 10, fontWeight: 900, letterSpacing: "0.22em", color: T.brass }}>
            {state.streetFlash}
          </div>
        )}

        {/* dealer button on the felt */}
        {state.players.map((p) =>
          p.isDealer && p.cards !== null ? (
            <div key={"dealer" + p.seat} style={{ position: "absolute",
              left: `${DEALER_POS[p.seat].x}%`, top: `${DEALER_POS[p.seat].y}%`,
              transform: "translate(-50%,-50%)", zIndex: 3, width: 24, height: 24, borderRadius: "50%",
              background: "linear-gradient(180deg,#FFFFFF,#DCDCDC)", border: `2px solid ${T.brassDeep}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: T.sans, fontSize: 12, fontWeight: 900, color: "#333",
              boxShadow: "0 2px 6px rgba(0,0,0,0.5)" }}>D</div>
          ) : null
        )}

        {/* bets — thrown in from the seat; remount on amount change replays the throw */}
        {state.players.map((p) =>
          p.bet > 0 && !p.folded ? (
            <div key={"bet" + p.seat + "-" + p.bet} style={{ position: "absolute", left: `${SEAT_POS[p.seat].bx}%`,
              top: `${SEAT_POS[p.seat].by}%`, transform: "translate(-50%,-50%)", zIndex: 3 }}>
              <div className="cpt-bet" style={{ "--tx": THROW[p.seat].x + "px", "--ty": THROW[p.seat].y + "px" }}>
                <ChipStack amount={p.bet} />
              </div>
            </div>
          ) : null
        )}

        {/* villain seats */}
        {state.players.map((p) =>
          p.seat === state.hero.seat ? null : (
            <div key={"seat" + p.seat} style={{ position: "absolute", left: `${SEAT_POS[p.seat].x}%`,
              top: `${SEAT_POS[p.seat].y}%`, transform: "translate(-50%,-50%)", zIndex: 4 }}>
              <Seat p={p} active={state.toAct === p.seat} winner={winnerSeats.has(p.seat)} />
            </div>
          )
        )}

        {/* pot → winner chip flight */}
        {fly && fly.targets.map((tg, ti) =>
          Array.from({ length: 6 }).map((_, i) => (
            <FlyChip key={fly.id + "-" + ti + "-" + i} target={tg} delay={ti * 40 + i * 65} />
          ))
        )}

        {/* winner ribbon */}
        {state.winners && state.winners.length > 0 && (
          <div className="cpt-ribbon" style={{ position: "absolute", left: "50%", top: "45%",
            transform: "translate(-50%,-50%)", zIndex: 8, textAlign: "center", maxWidth: "88%",
            background: "rgba(13,17,25,0.95)", border: `1.5px solid ${T.brass}`, borderRadius: 16,
            padding: "12px 26px", boxShadow: "0 10px 40px rgba(0,0,0,0.6), 0 0 30px rgba(232,181,77,0.25)" }}>
            <div style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 900, letterSpacing: "0.05em", color: T.brass }}>
              {state.winners.length > 1
                ? `${winNames.join(" & ")} SPLIT ${fmt(state.winners[0].amount)}`
                : `${winNames[0]} WINS ${fmt(state.winners[0].amount)}`}
            </div>
            <div style={{ fontFamily: T.sans, fontSize: 11.5, fontWeight: 600, color: T.inkDim, marginTop: 3 }}>
              {state.winners[0].handLabel}
            </div>
          </div>
        )}

        {/* hero cluster */}
        <div style={{ position: "absolute", left: "50%", bottom: 0, transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", zIndex: 5 }}>
          {hero && hero.cards && !hero.folded && (
            <div style={{ display: "flex", marginBottom: -12 }}>
              <div style={{ transform: "rotate(-5deg) translateY(2px)" }}>
                {hero.cards[0] === "XX" ? <CardBack w={70} h={98} /> : <CardFace code={hero.cards[0]} w={70} h={98} dealt />}
              </div>
              <div style={{ transform: "rotate(5deg)", marginLeft: -18 }}>
                {hero.cards[1] === "XX" ? <CardBack w={70} h={98} /> : <CardFace code={hero.cards[1]} w={70} h={98} dealt />}
              </div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(12,16,24,0.92)",
            border: `1px solid ${winnerSeats.has(state.hero.seat) ? T.brass : T.line}`, borderRadius: 12,
            padding: "5px 13px", boxShadow: "0 3px 10px rgba(0,0,0,0.5)", position: "relative" }}>
            {hero && state.toAct === state.hero.seat && hero.timeLeft != null && (
              <div style={{ position: "absolute", left: 0, right: 0, top: -5, height: 3, borderRadius: 2,
                background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${hero.timeLeft * 100}%`, borderRadius: 2,
                  background: hero.timeLeft > 0.35 ? T.brass : "#E05B5B", transition: "width 0.12s linear" }} />
              </div>
            )}
            <div>
              <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 800, color: T.ink }}>{hero?.name}</span>
              <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: T.brass, marginLeft: 8 }}>
                {fmt(hero?.stack)}
              </span>
            </div>
            {state.hero.handLabel && !hero?.folded && (
              <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 800, letterSpacing: "0.05em",
                color: "#8FD6AE", background: "rgba(47,158,99,0.16)", border: "1px solid rgba(47,158,99,0.4)",
                padding: "2px 8px", borderRadius: 8, whiteSpace: "nowrap" }}>
                {state.hero.handLabel}
              </div>
            )}
            {hero?.folded && (
              <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                color: T.inkDim, padding: "2px 8px", borderRadius: 8, border: `1px solid ${T.line}` }}>
                FOLDED
              </div>
            )}
          </div>
        </div>
      </div>

      <ActionBar state={state} onAction={onAction} />
    </div>
  );
}
