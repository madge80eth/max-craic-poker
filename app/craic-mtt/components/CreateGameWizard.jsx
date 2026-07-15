import { useState, useEffect, useRef } from "react";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  CRAIC HOME GAME — SEALED CREATE GAME WIZARD
 * ─────────────────────────────────────────────────────────────────────────────
 *  RULES FOR CLAUDE CODE:
 *  1. <CreateGameWizard onPublish={cfg => ...}/> is SEALED. Do not edit internals,
 *     styles, steps, or copy. Visual sign-off happened elsewhere.
 *  2. Your jobs: (a) wire onPublish(config) to the create endpoint + contract
 *     createGame; (b) replace resolveToken() with a real token-metadata lookup;
 *     (c) replace the demo link slugs on the success screen with real ones;
 *     (d) replace zonedToUtc() with a proper tz library (date-fns-tz or luxon) —
 *     the built-in version is demo-grade at DST boundaries.
 *  3. Zero dependencies on Tailwind config, global CSS, or fonts. Keep it that way.
 *
 *  GAME CONFIG SCHEMA (what onPublish emits):
 *  {
 *    title: string,
 *    startsAt: ISO string (UTC),
 *    timezone: IANA string,       // the creator's chosen display timezone
 *    minPlayers: number,
 *    visibility: 'public' | 'unlisted',
 *    structure: {
 *      levelMins: 6|8|10|12|15,
 *      startingStack: 5000|10000|20000,
 *      lateRegLevels: 0-6,
 *      payoutTemplate: 'top2'|'top3'|'top5'|'top7'
 *    },
 *    pool: {
 *      asset: 'USDC'|'ETH'|<erc20 address>,
 *      creatorSeed: number   // 0 = creator not seeding; >0 bars this wallet
 *    },                      // from playing (R1 wall — enforced downstream)
 *    gates: [                // AND logic, order irrelevant
 *      { type:'erc20Hold',  token, symbol, minAmount, heldForDays: 0|7|30|90 },
 *      { type:'nftHold',    collection, minCount },
 *      { type:'walletAge',  minDays },
 *      { type:'allowlist',  addresses: string[] }
 *    ]
 *  }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const T = {
  night: "#0E1420", nightUp: "#151D2C", line: "rgba(255,255,255,0.10)",
  ink: "#EDEFF4", inkDim: "rgba(237,239,244,0.55)",
  brass: "#E8B54D", brassDeep: "#B98A2E",
  feltA: "#1E6B47", feltB: "#124A31",
  danger: "#E05B5B", ok: "#3E9B5F",
  mono: "'SF Mono','Cascadia Mono','Roboto Mono',monospace",
  sans: "-apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif",
};

const STEPS = ["Basics", "Structure", "Prize pool", "Entry gates", "Review"];
const HELD_OPTS = [0, 7, 30, 90];
const PAYOUTS = {
  top2: { label: "Top 2 \u00B7 65/35", note: "fields \u2264 9" },
  top3: { label: "Top 3 \u00B7 50/30/20", note: "10\u201318 players" },
  top5: { label: "Top 5 \u00B7 40/27/18/10/5", note: "19\u201330 players" },
  top7: { label: "Top 7 \u00B7 36/24/16/10/7/4/3", note: "31\u201348 players" },
};
const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;

/* ————— time helpers ————— */
const DETECTED_TZ = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { return "UTC"; }
})();
const TZ_LIST = [...new Set([DETECTED_TZ, "Europe/London", "Europe/Dublin", "UTC",
  "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney"])];
const tzLabel = (tz) => {
  try {
    const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(new Date()).find((x) => x.type === "timeZoneName");
    return `${tz.replace(/_/g, " ")} (${p.value})`;
  } catch (e) { return tz; }
};
/* wall-clock time in tz → UTC ms. Demo-grade; CC swaps for date-fns-tz (header job d). */
function zonedToUtc(local, tz) {
  if (!local) return NaN;
  const guess = new Date(local + ":00Z").getTime();
  try {
    const inTz = new Date(new Date(guess).toLocaleString("en-US", { timeZone: tz }));
    return guess + (guess - inTz.getTime());
  } catch (e) { return new Date(local).getTime(); }
}
const fmtCountdown = (ms) => {
  if (!(ms > 0)) return null;
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
  return `${d > 0 ? d + "d " : ""}${h}h ${mm}m`;
};

/* ————— rough tournament length estimator ————— */
/* Ends roughly when the big blind has eaten the chips: find the level where
   BB ≥ totalChips/35 on the default ladder, +15% for breaks and slow hands. */
const BB_LADDER = [100, 150, 200, 300, 400, 600, 800, 1000, 1400, 2000, 3000, 4000, 6000, 10000];
function estimateMins(players, stack, levelMins) {
  const target = (players * stack) / 35;
  let L = BB_LADDER.findIndex((b) => b >= target) + 1;
  if (L === 0) {
    let bb = BB_LADDER[BB_LADDER.length - 1], lvl = BB_LADDER.length;
    while (bb < target) { bb *= 2; lvl += 1; }
    L = lvl;
  }
  return Math.round(L * levelMins * 1.15);
}
const fmtDur = (m) => `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;

/* demo token resolver — CC replaces with a real metadata lookup */
const KNOWN = {
  cat: { symbol: "CAT", name: "Cat Town" },
  kib: { symbol: "KIBBLE", name: "Kibble" },
  deg: { symbol: "DEGEN", name: "Degen" },
};
function resolveToken(addr) {
  return new Promise((res) => {
    setTimeout(() => {
      const key = Object.keys(KNOWN).find((k) => addr.toLowerCase().includes(k));
      res(key ? KNOWN[key] : { symbol: "TOKEN", name: "Unknown token" });
    }, 600);
  });
}

/* ————— shared styled bits ————— */
const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 11,
  background: "rgba(255,255,255,0.06)", border: `1px solid ${T.line}`,
  color: T.ink, fontFamily: T.sans, fontSize: 14, outline: "none", colorScheme: "dark",
};

function Field({ label, hint, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 800,
        letterSpacing: "0.12em", color: T.inkDim, marginBottom: 6, textTransform: "uppercase" }}>
        {label}
      </div>
      {children}
      {hint && !error && (
        <div style={{ fontFamily: T.sans, fontSize: 10.5, color: "rgba(237,239,244,0.4)", marginTop: 5 }}>{hint}</div>
      )}
      {error && (
        <div style={{ fontFamily: T.sans, fontSize: 10.5, color: T.danger, marginTop: 5 }}>{error}</div>
      )}
    </div>
  );
}

function Chips({ options, value, onChange, fmtLabel }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {options.map((o) => (
        <button key={String(o)} onClick={() => onChange(o)} style={{
          padding: "8px 13px", borderRadius: 10, cursor: "pointer",
          background: value === o ? "rgba(232,181,77,0.16)" : "rgba(255,255,255,0.05)",
          border: `1px solid ${value === o ? T.brass : T.line}`,
          color: value === o ? T.brass : T.inkDim,
          fontFamily: T.sans, fontSize: 12, fontWeight: 800,
        }}>{fmtLabel ? fmtLabel(o) : String(o)}</button>
      ))}
    </div>
  );
}

function Card({ children, accent }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 14,
      border: `1px solid ${accent ? "rgba(232,181,77,0.5)" : T.line}`, padding: 13, marginBottom: 10 }}>
      {children}
    </div>
  );
}

/* ————— gate editor ————— */
const GATE_TYPES = [
  { id: "erc20Hold", label: "Hold a token", icon: "\u25CF" },
  { id: "nftHold", label: "Hold an NFT", icon: "\u25A0" },
  { id: "walletAge", label: "Wallet age", icon: "\u23F3" },
  { id: "allowlist", label: "Allowlist", icon: "\u2713" },
];

function gateSentence(g) {
  if (g.type === "erc20Hold")
    return `hold \u2265 ${g.minAmount || "?"} $${g.symbol || "?"}${g.heldForDays ? ` for ${g.heldForDays}+ days` : ""}`;
  if (g.type === "nftHold") return `own ${g.minCount || 1}+ NFT${(g.minCount || 1) > 1 ? "s" : ""} from ${short(g.collection)}`;
  if (g.type === "walletAge") return `wallet \u2265 ${g.minDays || "?"} days old`;
  if (g.type === "allowlist") return `be on the allowlist (${(g.addresses || []).length} addresses)`;
  return "";
}
const short = (a) => (a && ADDR_RE.test(a) ? a.slice(0, 6) + "\u2026" + a.slice(-4) : "\u2014");

function GateEditor({ gate, onChange, onRemove }) {
  const [resolving, setResolving] = useState(false);
  const set = (patch) => onChange({ ...gate, ...patch });

  useEffect(() => {
    if (gate.type === "erc20Hold" && ADDR_RE.test(gate.token || "") && !gate.symbol) {
      setResolving(true);
      resolveToken(gate.token).then((t) => { set({ symbol: t.symbol, tokenName: t.name }); setResolving(false); });
    }
  }, [gate.token]);

  return (
    <Card accent>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 900, color: T.brass, letterSpacing: "0.06em" }}>
          {GATE_TYPES.find((t) => t.id === gate.type)?.label.toUpperCase()}
        </div>
        <button onClick={onRemove} style={{ background: "none", border: "none", color: T.inkDim,
          fontFamily: T.sans, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Remove</button>
      </div>

      {gate.type === "erc20Hold" && (
        <>
          <Field label="Token contract" hint={resolving ? "Looking up token\u2026" : gate.symbol ? `Found: $${gate.symbol} \u00B7 ${gate.tokenName}` : "Paste the ERC-20 address"}
            error={gate.token && !ADDR_RE.test(gate.token) ? "That doesn't look like a contract address" : null}>
            <input style={inputStyle} placeholder="0x…" value={gate.token || ""}
              onChange={(e) => set({ token: e.target.value.trim(), symbol: null })} />
          </Field>
          <Field label="Minimum amount">
            <input style={inputStyle} type="number" min="0" placeholder="100"
              value={gate.minAmount ?? ""} onChange={(e) => set({ minAmount: e.target.value === "" ? "" : Number(e.target.value) })} />
          </Field>
          <Field label="Held for" hint={gate.heldForDays ? "Anti-bot: balance is checkpoint-sampled across the window \u2014 stops day-of buyers." : "No duration: balance checked at registration and at start only."}>
            <Chips options={HELD_OPTS} value={gate.heldForDays ?? 0} onChange={(v) => set({ heldForDays: v })}
              fmtLabel={(v) => (v === 0 ? "No minimum" : `${v}+ days`)} />
          </Field>
        </>
      )}

      {gate.type === "nftHold" && (
        <>
          <Field label="Collection contract"
            error={gate.collection && !ADDR_RE.test(gate.collection) ? "That doesn't look like a contract address" : null}>
            <input style={inputStyle} placeholder="0x…" value={gate.collection || ""}
              onChange={(e) => set({ collection: e.target.value.trim() })} />
          </Field>
          <Field label="Minimum count">
            <Chips options={[1, 2, 3, 5]} value={gate.minCount ?? 1} onChange={(v) => set({ minCount: v })} />
          </Field>
        </>
      )}

      {gate.type === "walletAge" && (
        <Field label="Minimum wallet age" hint="Age of the wallet's first transaction.">
          <Chips options={[30, 90, 180, 365]} value={gate.minDays ?? 90} onChange={(v) => set({ minDays: v })}
            fmtLabel={(v) => `${v} days`} />
        </Field>
      )}

      {gate.type === "allowlist" && (
        <Field label="Addresses (one per line)" hint={`${(gate.addresses || []).length} valid addresses`}>
          <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} placeholder={"0x\u2026\n0x\u2026"}
            value={gate.raw || ""}
            onChange={(e) => {
              const raw = e.target.value;
              const addresses = raw.split(/\s+/).filter((a) => ADDR_RE.test(a));
              set({ raw, addresses });
            }} />
        </Field>
      )}
    </Card>
  );
}

/* ————— review rows ————— */
function Row({ k, v }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 0",
      borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
      <span style={{ fontFamily: T.sans, fontSize: 11, fontWeight: 700, color: T.inkDim }}>{k}</span>
      <span style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 700, color: T.ink, textAlign: "right" }}>{v}</span>
    </div>
  );
}

/* ═════════════════════ SEALED WIZARD ═════════════════════ */
export default function CreateGameWizard({ onPublish }) {
  const [step, setStep] = useState(0);
  const [published, setPublished] = useState(null);
  const [showJson, setShowJson] = useState(false);
  const [cfg, setCfg] = useState({
    title: "", startsAt: "", tz: DETECTED_TZ, minPlayers: 6, visibility: "public",
    structure: { levelMins: 8, startingStack: 10000, lateRegLevels: 4, payoutTemplate: "top3" },
    pool: { asset: "USDC", creatorSeed: 0 },
    gates: [],
  });
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const iv = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(iv);
  }, []);
  const set = (patch) => setCfg((c) => ({ ...c, ...patch }));
  const setS = (patch) => setCfg((c) => ({ ...c, structure: { ...c.structure, ...patch } }));
  const setP = (patch) => setCfg((c) => ({ ...c, pool: { ...c.pool, ...patch } }));
  const scroller = useRef(null);
  useEffect(() => { scroller.current?.scrollTo(0, 0); }, [step, published]);

  const errors = {
    0: !cfg.title.trim() ? "Give the game a title" :
       !cfg.startsAt ? "Pick a start time" :
       !(zonedToUtc(cfg.startsAt, cfg.tz) > Date.now()) ? "Start time must be in the future" : null,
    1: null,
    2: cfg.pool.asset === "custom" && !ADDR_RE.test(cfg.pool.customAddr || "") ? "Enter a valid token address" : null,
    3: cfg.gates.some((gt) =>
        (gt.type === "erc20Hold" && (!ADDR_RE.test(gt.token || "") || !gt.minAmount)) ||
        (gt.type === "nftHold" && !ADDR_RE.test(gt.collection || "")) ||
        (gt.type === "allowlist" && (gt.addresses || []).length === 0)
      ) ? "Finish or remove the incomplete gate" : null,
    4: null,
  };
  const stepError = errors[step];

  const publish = () => {
    const out = {
      title: cfg.title.trim(),
      startsAt: new Date(zonedToUtc(cfg.startsAt, cfg.tz)).toISOString(),
      timezone: cfg.tz,
      minPlayers: cfg.minPlayers, visibility: cfg.visibility,
      structure: cfg.structure,
      pool: { asset: cfg.pool.asset === "custom" ? cfg.pool.customAddr : cfg.pool.asset, creatorSeed: Number(cfg.pool.creatorSeed) || 0 },
      gates: cfg.gates.map(({ raw, tokenName, ...g }) => g),
    };
    setPublished(out);
    if (onPublish) onPublish(out);
  };

  const gateText = cfg.gates.length
    ? "To enter: " + cfg.gates.map(gateSentence).join(" AND ")
    : "Open entry \u2014 anyone can register.";

  /* ————— success screen ————— */
  if (published) {
    return (
      <Shell>
        <div style={{ padding: "28px 18px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", margin: "0 auto 14px",
            background: `radial-gradient(circle at 50% 35%, ${T.feltA}, ${T.feltB})`,
            border: `2px solid ${T.brass}`, display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 24, color: T.brass }}>{"\u2660"}</div>
          <div style={{ fontFamily: T.sans, fontSize: 18, fontWeight: 900, color: T.ink }}>{published.title}</div>
          <div style={{ fontFamily: T.sans, fontSize: 11.5, color: T.inkDim, marginTop: 4 }}>
            {new Date(published.startsAt).toLocaleString("en-GB", { timeZone: published.timezone, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
            {" "}{published.timezone.split("/").pop().replace(/_/g, " ")}
            {" \u00B7 "}{published.pool.asset === "ETH" ? "ETH" : published.pool.asset === "USDC" ? "USDC" : "custom token"} pool
          </div>
          <div style={{ fontFamily: T.sans, fontSize: 11, color: T.inkDim, marginTop: 10, lineHeight: 1.5 }}>{gateText}</div>

          {[["ENTRY LINK", "craic.game/e/cat-town-47"], ["SPONSOR LINK", "craic.game/s/cat-town-47"]].map(([label, url]) => (
            <div key={label} style={{ marginTop: 12, textAlign: "left", background: "rgba(255,255,255,0.05)",
              border: `1px solid ${T.line}`, borderRadius: 12, padding: "10px 13px",
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div>
                <div style={{ fontFamily: T.sans, fontSize: 9, fontWeight: 900, letterSpacing: "0.14em", color: T.inkDim }}>{label}</div>
                <div style={{ fontFamily: T.mono, fontSize: 12, color: T.ink }}>{url}</div>
              </div>
              <button style={{ padding: "7px 13px", borderRadius: 9, border: `1px solid ${T.brass}`,
                background: "rgba(232,181,77,0.14)", color: T.brass, fontFamily: T.sans,
                fontSize: 11, fontWeight: 800, cursor: "pointer" }}>Copy</button>
            </div>
          ))}

          <div style={{ marginTop: 14, fontFamily: T.sans, fontSize: 10.5, color: "rgba(237,239,244,0.4)", lineHeight: 1.5 }}>
            Sponsorship stays open until start time, then the pool freezes.
            {published.pool.creatorSeed > 0 && " Your seed donation bars this wallet from playing (R1)."}
          </div>

          <button onClick={() => setShowJson((v) => !v)} style={{ marginTop: 14, background: "none",
            border: "none", color: T.inkDim, fontFamily: T.mono, fontSize: 10.5, cursor: "pointer",
            textDecoration: "underline" }}>
            {showJson ? "hide" : "view"} emitted config (for CC)
          </button>
          {showJson && (
            <pre style={{ textAlign: "left", background: "rgba(0,0,0,0.35)", border: `1px solid ${T.line}`,
              borderRadius: 10, padding: 10, fontFamily: T.mono, fontSize: 9.5, color: "#9CC6EE",
              overflowX: "auto", marginTop: 8 }}>{JSON.stringify(published, null, 2)}</pre>
          )}
        </div>
      </Shell>
    );
  }

  /* ————— wizard steps ————— */
  return (
    <Shell>
      {/* progress */}
      <div style={{ padding: "14px 18px 10px" }}>
        <div style={{ fontFamily: T.sans, fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", color: T.ink }}>
          CREATE <span style={{ color: T.brass }}>{"\u2660"}</span> HOME GAME
        </div>
        <div style={{ display: "flex", gap: 5, marginTop: 10 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1 }}>
              <div style={{ height: 3, borderRadius: 2,
                background: i <= step ? T.brass : "rgba(255,255,255,0.12)", transition: "background 0.3s" }} />
              <div style={{ fontFamily: T.sans, fontSize: 8.5, fontWeight: 800, letterSpacing: "0.06em",
                color: i === step ? T.brass : "rgba(237,239,244,0.35)", marginTop: 4 }}>{s.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      <div ref={scroller} style={{ flex: 1, overflowY: "auto", padding: "6px 18px 18px" }}>
        {step === 0 && (
          <>
            <Field label="Game title">
              <input style={inputStyle} placeholder="Cat Town Friday Night" value={cfg.title}
                onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <Field label="Starts at">
              <input style={inputStyle} type="datetime-local" value={cfg.startsAt}
                onChange={(e) => set({ startsAt: e.target.value })} />
            </Field>
            <Field label="Timezone" hint="Times are shown to players in their own timezone; this sets yours.">
              <select style={{ ...inputStyle, appearance: "none" }} value={cfg.tz}
                onChange={(e) => set({ tz: e.target.value })}>
                {TZ_LIST.map((tz) => (
                  <option key={tz} value={tz} style={{ background: T.nightUp, color: T.ink }}>
                    {tz === DETECTED_TZ ? `${tzLabel(tz)} — detected` : tzLabel(tz)}
                  </option>
                ))}
              </select>
            </Field>
            {(() => {
              const startMs = zonedToUtc(cfg.startsAt, cfg.tz);
              const cd = fmtCountdown(startMs - nowTick);
              return (
                <Card accent={!!cd}>
                  {!cfg.startsAt ? (
                    <div style={{ fontFamily: T.sans, fontSize: 11.5, color: T.inkDim }}>
                      Pick a date and time to see the countdown.
                    </div>
                  ) : cd ? (
                    <>
                      <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 900,
                        letterSpacing: "0.16em", color: T.inkDim }}>GAME STARTS IN</div>
                      <div style={{ fontFamily: T.mono, fontSize: 19, fontWeight: 800, color: T.brass, marginTop: 2 }}>
                        {cd}
                      </div>
                      <div style={{ fontFamily: T.sans, fontSize: 10.5, color: T.inkDim, marginTop: 3 }}>
                        {new Date(startMs).toLocaleString("en-GB", { timeZone: cfg.tz, weekday: "short",
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        {" in "}{cfg.tz.split("/").pop().replace(/_/g, " ")}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontFamily: T.sans, fontSize: 11.5, color: T.danger }}>
                      That time is in the past — pick a future start.
                    </div>
                  )}
                </Card>
              );
            })()}
            <Field label="Minimum players" hint="Below this at start time, the game cancels and sponsors reclaim.">
              <Chips options={[6, 9, 12, 18]} value={cfg.minPlayers} onChange={(v) => set({ minPlayers: v })} />
            </Field>
            <Field label="Visibility">
              <Chips options={["public", "unlisted"]} value={cfg.visibility} onChange={(v) => set({ visibility: v })}
                fmtLabel={(v) => (v === "public" ? "Public \u00B7 listed" : "Unlisted \u00B7 link only")} />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <Field label="Level length" hint="How often the blinds go up. Shorter levels, faster night.">
              <Chips options={[6, 8, 10, 12, 15]} value={cfg.structure.levelMins} onChange={(v) => setS({ levelMins: v })}
                fmtLabel={(v) => `${v} min`} />
            </Field>
            <Field label="Starting stack">
              <Chips options={[5000, 10000, 20000]} value={cfg.structure.startingStack}
                onChange={(v) => setS({ startingStack: v })} fmtLabel={(v) => v.toLocaleString("en-GB")} />
            </Field>
            <Card>
              <div style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 900, letterSpacing: "0.14em",
                color: T.inkDim, marginBottom: 6 }}>VERY ROUGH RUN TIME</div>
              <div style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 700, color: T.ink, lineHeight: 1.7 }}>
                {[12, 24, 36].map((n) =>
                  `${n} players: ~${fmtDur(estimateMins(n, cfg.structure.startingStack, cfg.structure.levelMins))}`
                ).join("  \u00B7  ")}
              </div>
              <div style={{ fontFamily: T.sans, fontSize: 10, color: "rgba(237,239,244,0.4)", marginTop: 5, lineHeight: 1.5 }}>
                Updates as you change stacks and levels. Bigger stacks and longer levels stretch the
                night; it ends when the blinds have eaten the chips.
              </div>
            </Card>
            <Field label="Late registration" hint="New players can join with a full stack through this level.">
              <Chips options={[0, 2, 4, 6]} value={cfg.structure.lateRegLevels} onChange={(v) => setS({ lateRegLevels: v })}
                fmtLabel={(v) => (v === 0 ? "Off" : `Thru level ${v}`)} />
            </Field>
            <Field label="Payouts">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {Object.entries(PAYOUTS).map(([id, p]) => (
                  <button key={id} onClick={() => setS({ payoutTemplate: id })} style={{
                    textAlign: "left", padding: "10px 13px", borderRadius: 11, cursor: "pointer",
                    background: cfg.structure.payoutTemplate === id ? "rgba(232,181,77,0.14)" : "rgba(255,255,255,0.05)",
                    border: `1px solid ${cfg.structure.payoutTemplate === id ? T.brass : T.line}` }}>
                    <div style={{ fontFamily: T.sans, fontSize: 12.5, fontWeight: 800,
                      color: cfg.structure.payoutTemplate === id ? T.brass : T.ink }}>{p.label}</div>
                    <div style={{ fontFamily: T.sans, fontSize: 10, color: T.inkDim }}>{p.note}</div>
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}

        {step === 2 && (
          <>
            <Field label="Pool asset" hint="One asset per game. All sponsorship arrives in this.">
              <Chips options={["USDC", "ETH", "custom"]} value={cfg.pool.asset} onChange={(v) => setP({ asset: v })}
                fmtLabel={(v) => (v === "custom" ? "Community token" : v)} />
            </Field>
            {cfg.pool.asset === "custom" && (
              <Field label="Token contract" hint="Must be on the allowlist. No fee-on-transfer or rebasing tokens.">
                <input style={inputStyle} placeholder="0x…" value={cfg.pool.customAddr || ""}
                  onChange={(e) => setP({ customAddr: e.target.value.trim() })} />
              </Field>
            )}
            <Field label="Seed the pool now (optional)"
              hint="Seeding means this wallet cannot play in this game. Fund it or play it, never both.">
              <input style={inputStyle} type="number" min="0" placeholder="0"
                value={cfg.pool.creatorSeed || ""} onChange={(e) => setP({ creatorSeed: e.target.value })} />
            </Field>
            <Card>
              <div style={{ fontFamily: T.sans, fontSize: 11, color: T.inkDim, lineHeight: 1.55 }}>
                Entry is always free for players. Anyone else can sponsor via the sponsor link until
                start time, when the pool freezes. Platform fee is shown to sponsors before they donate.
              </div>
            </Card>
          </>
        )}

        {step === 3 && (
          <>
            <div style={{ fontFamily: T.sans, fontSize: 11.5, color: T.inkDim, lineHeight: 1.55, marginBottom: 12 }}>
              Gates stack with <span style={{ color: T.brass, fontWeight: 800 }}>AND</span> logic {"\u2014"} players
              must pass all of them, at registration and again at start.
            </div>
            {cfg.gates.map((gt, i) => (
              <GateEditor key={i} gate={gt}
                onChange={(ng) => setCfg((c) => ({ ...c, gates: c.gates.map((x, j) => (j === i ? ng : x)) }))}
                onRemove={() => setCfg((c) => ({ ...c, gates: c.gates.filter((_, j) => j !== i) }))} />
            ))}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {GATE_TYPES.map((gt) => (
                <button key={gt.id} onClick={() => setCfg((c) => ({ ...c, gates: [...c.gates,
                  gt.id === "walletAge" ? { type: gt.id, minDays: 90 } :
                  gt.id === "nftHold" ? { type: gt.id, minCount: 1 } :
                  gt.id === "erc20Hold" ? { type: gt.id, heldForDays: 0 } : { type: gt.id, addresses: [] }] }))}
                  style={{ padding: "9px 13px", borderRadius: 10, cursor: "pointer",
                    background: "rgba(255,255,255,0.05)", border: `1px dashed rgba(232,181,77,0.5)`,
                    color: T.brass, fontFamily: T.sans, fontSize: 11.5, fontWeight: 800 }}>
                  + {gt.label}
                </button>
              ))}
            </div>
            <Card>
              <div style={{ fontFamily: T.sans, fontSize: 11.5, color: T.ink, lineHeight: 1.55 }}>{gateText}</div>
            </Card>
          </>
        )}

        {step === 4 && (
          <>
            <Card accent>
              <div style={{ fontFamily: T.sans, fontSize: 15, fontWeight: 900, color: T.ink, marginBottom: 2 }}>
                {cfg.title || "Untitled game"}
              </div>
              <div style={{ fontFamily: T.sans, fontSize: 10.5, color: T.inkDim, marginBottom: 8 }}>
                {cfg.startsAt ? new Date(zonedToUtc(cfg.startsAt, cfg.tz)).toLocaleString("en-GB", { timeZone: cfg.tz, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) + " " + cfg.tz.split("/").pop().replace(/_/g, " ") : "\u2014"}
              </div>
              <Row k="Format" v={`6-max MTT \u00B7 ${cfg.structure.levelMins}-min levels \u00B7 ${cfg.structure.startingStack.toLocaleString("en-GB")} stacks`} />
              <Row k="Late reg" v={cfg.structure.lateRegLevels === 0 ? "Off" : `Through level ${cfg.structure.lateRegLevels}`} />
              <Row k="Payouts" v={PAYOUTS[cfg.structure.payoutTemplate].label} />
              <Row k="Pool asset" v={cfg.pool.asset === "custom" ? short(cfg.pool.customAddr) : cfg.pool.asset} />
              <Row k="Creator seed" v={Number(cfg.pool.creatorSeed) > 0 ? `${cfg.pool.creatorSeed} (bars this wallet from playing)` : "None"} />
              <Row k="Min players" v={`${cfg.minPlayers} \u00B7 cancels + refunds below this`} />
              <Row k="Visibility" v={cfg.visibility === "public" ? "Public" : "Unlisted"} />
            </Card>
            <Card>
              <div style={{ fontFamily: T.sans, fontSize: 11.5, color: T.ink, lineHeight: 1.55 }}>{gateText}</div>
            </Card>
            <div style={{ fontFamily: T.sans, fontSize: 10.5, color: "rgba(237,239,244,0.4)", lineHeight: 1.5 }}>
              Publishing creates the game on-chain escrow and generates your entry + sponsor links.
              Gate criteria and payouts are locked at publish.
            </div>
          </>
        )}
      </div>

      {/* footer */}
      <div style={{ padding: "10px 18px calc(12px + env(safe-area-inset-bottom))",
        borderTop: `1px solid ${T.line}`, background: `linear-gradient(180deg, ${T.nightUp}, ${T.night})` }}>
        {stepError && (
          <div style={{ fontFamily: T.sans, fontSize: 10.5, color: T.danger, marginBottom: 8, textAlign: "center" }}>
            {stepError}
          </div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} style={{ padding: "0 18px", height: 50, borderRadius: 13,
              background: "rgba(255,255,255,0.05)", border: `1px solid ${T.line}`, color: T.inkDim,
              fontFamily: T.sans, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}>Back</button>
          )}
          <button onClick={() => (step === 4 ? publish() : !stepError && setStep(step + 1))}
            style={{ flex: 1, height: 50, borderRadius: 13, border: "none",
              cursor: stepError ? "default" : "pointer", opacity: stepError ? 0.45 : 1,
              background: `linear-gradient(180deg, ${T.brass}, ${T.brassDeep})`, color: "#241B05",
              fontFamily: T.sans, fontSize: 13.5, fontWeight: 900, letterSpacing: "0.06em" }}>
            {step === 4 ? "PUBLISH GAME" : "NEXT"}
          </button>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ height: "100dvh", minHeight: "100vh", background: "#080D15", display: "flex",
      justifyContent: "center", overflow: "hidden" }}>
      <div style={{ width: "min(100%, 520px)", height: "100%", display: "flex", flexDirection: "column",
        overflow: "hidden", background: T.night, boxShadow: "0 0 60px rgba(0,0,0,0.55)" }}>
        {children}
      </div>
    </div>
  );
}
