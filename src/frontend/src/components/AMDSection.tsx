import { Progress } from "@/components/ui/progress";
import { Bell, BellOff, Clock, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useAlertNotifications } from "../hooks/useAlertNotifications";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useLivePrices } from "../hooks/useLivePrices";

// ─── Session / Phase Logic ────────────────────────────────────────────────────

type PhaseIndex = 0 | 1 | 2;

interface SessionInfo {
  session: string;
  phaseName: "Accumulation" | "Manipulation" | "Distribution";
  phaseIndex: PhaseIndex;
  sessionProgress: number;
  sessionStart: number;
  sessionEnd: number;
  hoursRemaining: number;
  nextSession: string;
}

function getSessionInfo(): SessionInfo {
  const now = new Date();
  const utcDecimal = now.getUTCHours() + now.getUTCMinutes() / 60;

  if (utcDecimal < 7) {
    return {
      session: "Asian",
      phaseName: "Accumulation",
      phaseIndex: 0,
      sessionProgress: Math.min(100, (utcDecimal / 7) * 100),
      sessionStart: 0,
      sessionEnd: 7,
      hoursRemaining: Math.max(0, 7 - utcDecimal),
      nextSession: "London",
    };
  }
  if (utcDecimal < 12) {
    return {
      session: "London",
      phaseName: "Manipulation",
      phaseIndex: 1,
      sessionProgress: Math.min(100, ((utcDecimal - 7) / 5) * 100),
      sessionStart: 7,
      sessionEnd: 12,
      hoursRemaining: Math.max(0, 12 - utcDecimal),
      nextSession: "New York",
    };
  }
  if (utcDecimal < 21) {
    return {
      session: "New York",
      phaseName: "Distribution",
      phaseIndex: 2,
      sessionProgress: Math.min(100, ((utcDecimal - 12) / 9) * 100),
      sessionStart: 12,
      sessionEnd: 21,
      hoursRemaining: Math.max(0, 21 - utcDecimal),
      nextSession: "Asian",
    };
  }
  return {
    session: "Off-Hours",
    phaseName: "Accumulation",
    phaseIndex: 0,
    sessionProgress: Math.min(100, ((utcDecimal - 21) / 3) * 100),
    sessionStart: 21,
    sessionEnd: 24,
    hoursRemaining: Math.max(0, 24 - utcDecimal),
    nextSession: "Asian",
  };
}

function formatHoursRemaining(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m remaining`;
  return `${hrs}h ${mins}m remaining`;
}

// ─── Static Data ──────────────────────────────────────────────────────────────

const PAIRS = [
  { pair: "XAU/USD", phaseOffset: 0.0 },
  { pair: "EUR/USD", phaseOffset: 0.3 },
  { pair: "GBP/USD", phaseOffset: -0.3 },
  { pair: "USD/JPY", phaseOffset: 0.5 },
  { pair: "GBP/JPY", phaseOffset: -0.5 },
  { pair: "EUR/JPY", phaseOffset: 0.2 },
];

const PHASE_COLORS: Record<string, string> = {
  Accumulation: "oklch(0.68 0.14 220)",
  Manipulation: "oklch(0.82 0.16 75)",
  Distribution: "oklch(0.65 0.18 20)",
};

const PHASE_BG: Record<string, string> = {
  Accumulation: "oklch(0.20 0.04 220)",
  Manipulation: "oklch(0.20 0.04 75)",
  Distribution: "oklch(0.20 0.04 20)",
};

const SESSION_COLORS: Record<string, string> = {
  Asian: "oklch(0.68 0.14 220)",
  London: "oklch(0.82 0.16 75)",
  "New York": "oklch(0.65 0.18 20)",
  "Off-Hours": "oklch(0.55 0.08 240)",
};

const PHASE_DESCRIPTIONS: Record<string, string[]> = {
  Accumulation: [
    "Smart money builds positions silently inside a tight range. Low volatility. Ideal for limit orders at extremes.",
    "Consolidation at discount. Institutions absorb retail sell pressure and accumulate long exposure.",
    "Range bound structure. Volume declining. Order flow absorption happening beneath surface.",
  ],
  Manipulation: [
    "False breakout to raid retail stop losses. Liquidity sweep of recent highs/lows before the true directional move.",
    "NY open stop hunt in progress. Engineered run above Asian high to fill institutional sell orders.",
    "Stop grab below key support. Bearish order flow reversing after sweeping SSL.",
  ],
  Distribution: [
    "Price delivers in the intended direction. Smart money unloads into retail FOMO orders.",
    "Bearish delivery active. Price targeting discount array below current equilibrium.",
    "Bullish expansion phase. Institutions releasing accumulated long positions into premium.",
  ],
};

const TIMEFRAMES = ["M15", "H1", "H4", "D1"];

function getATR(pair: string, price: number): number {
  if (pair === "XAU/USD") return price * 0.007;
  if (pair.includes("JPY")) return price * 0.003;
  return price * 0.0018;
}

function getDecimals(pair: string): number {
  if (pair === "XAU/USD") return 2;
  if (pair.includes("JPY")) return 2;
  return 4;
}

function getDirection(phaseIndex: PhaseIndex, pair: string): "BUY" | "SELL" {
  const pairIdx = PAIRS.findIndex((p) => p.pair === pair);
  if (phaseIndex === 0) return "BUY";
  if (phaseIndex === 1) return pairIdx % 2 === 0 ? "SELL" : "BUY";
  return pairIdx % 2 === 0 ? "BUY" : "SELL";
}

export default function AMDSection() {
  const [tf, setTf] = useState("H1");
  const { prices, isLoading } = useLivePrices();
  const { countdown, lastUpdated } = useAutoRefresh(30);
  const { alertsEnabled, toggleAlerts, sendAlert } = useAlertNotifications();

  // Compute session info from real UTC time
  const sessionInfo = getSessionInfo();

  const prevPhaseRef = useRef<PhaseIndex>(sessionInfo.phaseIndex);
  useEffect(() => {
    if (prevPhaseRef.current !== sessionInfo.phaseIndex) {
      sendAlert(
        "AMD Phase Change",
        `Market entered ${sessionInfo.phaseName} phase — ${sessionInfo.session} session`,
      );
      prevPhaseRef.current = sessionInfo.phaseIndex;
    }
  });

  const formattedTime = lastUpdated.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const sessionColor =
    SESSION_COLORS[sessionInfo.session] ?? "oklch(0.55 0.08 240)";

  return (
    <section
      id="amd"
      className="py-16"
      style={{ background: "oklch(0.15 0.023 240)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-1.5 h-6 rounded-full"
                  style={{ background: "oklch(0.68 0.14 220)" }}
                />
                <span
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: "oklch(0.68 0.14 220)" }}
                >
                  Smart Money Concepts
                </span>
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground">
                AMD Cycle Analysis
              </h2>
              <p className="text-muted-foreground mt-1 text-sm max-w-lg">
                Session-time-based Accumulation, Manipulation, Distribution
                tracking with live ATR-calibrated trade setups across all pairs.
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                  style={{
                    background: "oklch(0.68 0.14 220 / 0.10)",
                    borderColor: "oklch(0.68 0.14 220 / 0.3)",
                    color: "oklch(0.68 0.14 220)",
                  }}
                >
                  🔄 Refreshing in {countdown}s
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "oklch(0.55 0.06 240)" }}
                >
                  Updated {formattedTime}
                </span>
                <button
                  type="button"
                  onClick={toggleAlerts}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border transition-all"
                  style={{
                    background: alertsEnabled
                      ? "oklch(0.82 0.16 75 / 0.15)"
                      : "transparent",
                    borderColor: alertsEnabled
                      ? "oklch(0.82 0.16 75 / 0.4)"
                      : "oklch(0.30 0.03 240)",
                    color: alertsEnabled
                      ? "oklch(0.82 0.16 75)"
                      : "oklch(0.50 0.05 240)",
                  }}
                  data-ocid="amd.toggle"
                  title={alertsEnabled ? "Disable alerts" : "Enable alerts"}
                >
                  {alertsEnabled ? (
                    <Bell className="w-3 h-3" fill="currentColor" />
                  ) : (
                    <BellOff className="w-3 h-3" />
                  )}
                  {alertsEnabled ? "Alerts On" : "Alerts Off"}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-card rounded-lg p-1 border border-border/60">
              {TIMEFRAMES.map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTf(t)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all"
                  style={{
                    background:
                      tf === t ? "oklch(0.68 0.14 220)" : "transparent",
                    color:
                      tf === t
                        ? "oklch(0.10 0.02 240)"
                        : "oklch(0.60 0.05 240)",
                  }}
                  data-ocid={`amd.${t.toLowerCase()}.tab`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* ── Session Clock Banner ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-xl border p-4 mb-8"
            style={{
              background: `${sessionColor}10`,
              borderColor: `${sessionColor}30`,
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full animate-pulse"
                  style={{ background: sessionColor }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-black tracking-wide"
                      style={{ color: sessionColor }}
                    >
                      {sessionInfo.session} Session
                    </span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-bold border"
                      style={{
                        background: `${PHASE_COLORS[sessionInfo.phaseName]}20`,
                        borderColor: `${PHASE_COLORS[sessionInfo.phaseName]}40`,
                        color: PHASE_COLORS[sessionInfo.phaseName],
                      }}
                    >
                      {sessionInfo.phaseName.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Clock
                      className="w-3 h-3"
                      style={{ color: sessionColor }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: `${sessionColor}cc` }}
                    >
                      {formatHoursRemaining(sessionInfo.hoursRemaining)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      → Next: {sessionInfo.nextSession}
                    </span>
                  </div>
                </div>
              </div>
              <div className="sm:w-64 flex-1 max-w-xs">
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>
                    {String(sessionInfo.sessionStart).padStart(2, "0")}:00 UTC
                  </span>
                  <span>
                    {Math.round(sessionInfo.sessionProgress)}% elapsed
                  </span>
                  <span>
                    {String(sessionInfo.sessionEnd).padStart(2, "0")}:00 UTC
                  </span>
                </div>
                <div
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ background: `${sessionColor}20` }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: sessionColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${sessionInfo.sessionProgress}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Explainer ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-xl border border-border/40 p-4 mb-8 flex items-start gap-4"
            style={{ background: "oklch(0.18 0.03 220 / 0.4)" }}
          >
            <div className="flex flex-col items-center gap-1">
              {(["A", "M", "D"] as const).map((l, i) => (
                <span
                  key={l}
                  className="w-7 h-7 rounded flex items-center justify-center text-xs font-black"
                  style={{
                    background: [
                      "oklch(0.68 0.14 220)",
                      "oklch(0.82 0.16 75)",
                      "oklch(0.65 0.18 20)",
                    ][i],
                    color: "oklch(0.10 0.02 240)",
                  }}
                >
                  {l}
                </span>
              ))}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">
                Institutional Price Delivery — Session-Anchored
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Phases are derived from live UTC session time:
                <strong style={{ color: "oklch(0.68 0.14 220)" }}>
                  {" "}
                  Asian (00–07 UTC)
                </strong>{" "}
                = Accumulation,
                <strong style={{ color: "oklch(0.82 0.16 75)" }}>
                  {" "}
                  London (07–12 UTC)
                </strong>{" "}
                = Manipulation,
                <strong style={{ color: "oklch(0.65 0.18 20)" }}>
                  {" "}
                  NY (12–21 UTC)
                </strong>{" "}
                = Distribution. Each pair has a slight offset to reflect
                staggered institutional engagement.
              </p>
            </div>
          </motion.div>

          {/* ── Pair Cards ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {PAIRS.map((pairCfg, pi) => {
              const { pair, phaseOffset } = pairCfg;
              const livePrice = prices[pair];
              const dec = getDecimals(pair);
              const atr = livePrice ? getATR(pair, livePrice) : 0;

              // Phase with per-pair offset
              const now = new Date();
              const utcDecimal =
                now.getUTCHours() + now.getUTCMinutes() / 60 + phaseOffset;
              const adjustedDecimal = ((utcDecimal % 24) + 24) % 24;
              let pairPhaseIndex: PhaseIndex;
              let pairProgress: number;
              if (adjustedDecimal < 7) {
                pairPhaseIndex = 0;
                pairProgress = (adjustedDecimal / 7) * 100;
              } else if (adjustedDecimal < 12) {
                pairPhaseIndex = 1;
                pairProgress = ((adjustedDecimal - 7) / 5) * 100;
              } else if (adjustedDecimal < 21) {
                pairPhaseIndex = 2;
                pairProgress = ((adjustedDecimal - 12) / 9) * 100;
              } else {
                pairPhaseIndex = 0;
                pairProgress = ((adjustedDecimal - 21) / 3) * 100;
              }
              pairProgress = Math.min(100, Math.max(0, pairProgress));

              const activePhase = [
                "Accumulation",
                "Manipulation",
                "Distribution",
              ][pairPhaseIndex] as keyof typeof PHASE_DESCRIPTIONS;
              const direction = getDirection(pairPhaseIndex, pair);

              const entry = livePrice
                ? pairPhaseIndex === 1
                  ? livePrice + (direction === "BUY" ? -atr * 0.3 : atr * 0.3)
                  : livePrice + (direction === "BUY" ? -atr * 0.2 : atr * 0.2)
                : null;
              const sl = entry
                ? entry + (direction === "BUY" ? -atr * 1.5 : atr * 1.5)
                : null;
              const tp = entry
                ? entry + (direction === "BUY" ? atr * 2.5 : -atr * 2.5)
                : null;
              const confidence =
                pairPhaseIndex === sessionInfo.phaseIndex ? 90 : 75;

              return (
                <motion.div
                  key={pair}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 * pi }}
                  className="rounded-xl border border-border/60 overflow-hidden"
                  style={{ background: "oklch(0.19 0.03 240)" }}
                  data-ocid={`amd.item.${pi + 1}`}
                >
                  {/* Card Header */}
                  <div
                    className="px-4 py-3 flex items-center justify-between"
                    style={{ background: "oklch(0.17 0.03 240)" }}
                  >
                    <div>
                      <span className="font-mono font-bold text-foreground">
                        {pair}
                      </span>
                      {livePrice && (
                        <span className="ml-2 text-xs font-mono text-muted-foreground">
                          {pair === "XAU/USD" ? "$" : ""}
                          {livePrice.toFixed(dec)}
                        </span>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded border"
                      style={{
                        background: `${PHASE_COLORS[activePhase]}20`,
                        borderColor: `${PHASE_COLORS[activePhase]}40`,
                        color: PHASE_COLORS[activePhase],
                      }}
                    >
                      {activePhase}
                    </span>
                  </div>

                  {/* Phase Timeline Bar */}
                  <div className="px-4 pt-3">
                    <div className="flex items-center gap-0 rounded-lg overflow-hidden h-7 mb-3">
                      {(
                        [
                          "Accumulation",
                          "Manipulation",
                          "Distribution",
                        ] as const
                      ).map((p, i) => (
                        <div
                          key={p}
                          className="flex-1 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider transition-all"
                          style={{
                            background:
                              i === pairPhaseIndex
                                ? PHASE_COLORS[p]
                                : `${PHASE_COLORS[p]}30`,
                            color:
                              i === pairPhaseIndex
                                ? "oklch(0.10 0.02 240)"
                                : PHASE_COLORS[p],
                            opacity: i < pairPhaseIndex ? 0.6 : 1,
                          }}
                        >
                          {p.slice(0, 3)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Phase Cards */}
                  <div className="p-4 flex flex-col gap-3">
                    {(
                      ["Accumulation", "Manipulation", "Distribution"] as const
                    ).map((phaseName, pi2) => {
                      const isActive = pi2 === pairPhaseIndex;
                      const isDone = pi2 < pairPhaseIndex;
                      const phaseColor = PHASE_COLORS[phaseName];
                      const descIdx =
                        (pi + pi2) % PHASE_DESCRIPTIONS[phaseName].length;
                      const desc = PHASE_DESCRIPTIONS[phaseName][descIdx];
                      const phaseProg = isActive
                        ? pairProgress
                        : isDone
                          ? 100
                          : 0;
                      const rangeAtr = livePrice
                        ? getATR(pair, livePrice) * (pi2 + 1) * 0.6
                        : 0;
                      return (
                        <div
                          key={phaseName}
                          className="rounded-lg p-3 border transition-all"
                          style={{
                            background: isActive
                              ? PHASE_BG[phaseName]
                              : "oklch(0.17 0.02 240)",
                            borderColor: isActive
                              ? `${phaseColor}60`
                              : "oklch(0.25 0.02 240)",
                            boxShadow: isActive
                              ? `0 0 12px ${phaseColor}20`
                              : "none",
                          }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className="text-xs font-bold"
                              style={{ color: phaseColor }}
                            >
                              {phaseName}
                            </span>
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{
                                background: isActive
                                  ? `${phaseColor}25`
                                  : isDone
                                    ? "oklch(0.22 0.03 220)"
                                    : "transparent",
                                color: isActive
                                  ? phaseColor
                                  : isDone
                                    ? "oklch(0.55 0.07 220)"
                                    : "oklch(0.45 0.04 240)",
                              }}
                            >
                              {isActive ? "ACTIVE" : isDone ? "DONE" : "NEXT"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
                            {desc}
                          </p>
                          {livePrice && !isLoading && (
                            <div className="flex items-center gap-2 mb-2 text-[10px]">
                              <span className="text-muted-foreground">
                                Range:
                              </span>
                              <span className="font-mono text-foreground">
                                {(livePrice - rangeAtr).toFixed(dec)}
                                {" – "}
                                {(livePrice + rangeAtr).toFixed(dec)}
                              </span>
                            </div>
                          )}
                          <Progress value={phaseProg} className="h-1" />
                        </div>
                      );
                    })}
                  </div>

                  {/* Trade Setup Panel */}
                  {livePrice && entry && sl && tp && (
                    <div
                      className="mx-4 mb-4 rounded-lg p-3 border"
                      style={{
                        background:
                          direction === "BUY"
                            ? "oklch(0.14 0.04 150)"
                            : "oklch(0.14 0.04 20)",
                        borderColor:
                          direction === "BUY"
                            ? "oklch(0.76 0.17 150 / 0.35)"
                            : "oklch(0.65 0.18 20 / 0.35)",
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-foreground">
                          Current Setup
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded"
                            style={{
                              background:
                                direction === "BUY"
                                  ? "oklch(0.76 0.17 150 / 0.25)"
                                  : "oklch(0.65 0.18 20 / 0.25)",
                              color:
                                direction === "BUY"
                                  ? "oklch(0.76 0.17 150)"
                                  : "oklch(0.65 0.18 20)",
                            }}
                          >
                            {direction === "BUY" ? (
                              <TrendingUp className="w-3 h-3" />
                            ) : (
                              <TrendingDown className="w-3 h-3" />
                            )}
                            {direction}
                          </span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded"
                            style={{
                              background: "oklch(0.82 0.16 75 / 0.2)",
                              color: "oklch(0.82 0.16 75)",
                            }}
                          >
                            RR 1:2.5
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px]">
                        <div className="text-center">
                          <div className="text-muted-foreground mb-0.5">
                            Entry
                          </div>
                          <div className="font-mono font-bold text-foreground">
                            {pair === "XAU/USD" ? "$" : ""}
                            {entry.toFixed(dec)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground mb-0.5">SL</div>
                          <div
                            className="font-mono font-bold"
                            style={{ color: "oklch(0.65 0.18 20)" }}
                          >
                            {pair === "XAU/USD" ? "$" : ""}
                            {sl.toFixed(dec)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-muted-foreground mb-0.5">TP</div>
                          <div
                            className="font-mono font-bold"
                            style={{ color: "oklch(0.76 0.17 150)" }}
                          >
                            {pair === "XAU/USD" ? "$" : ""}
                            {tp.toFixed(dec)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-muted-foreground">
                            Confidence:
                          </span>
                          <span
                            className="text-[10px] font-bold"
                            style={{
                              color:
                                confidence >= 85
                                  ? "oklch(0.76 0.17 150)"
                                  : "oklch(0.82 0.16 75)",
                            }}
                          >
                            {confidence}%
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          AMD: {activePhase}
                        </span>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
