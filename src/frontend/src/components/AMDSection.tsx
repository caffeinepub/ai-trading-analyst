import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bell, BellOff } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useAlertNotifications } from "../hooks/useAlertNotifications";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useLivePrices } from "../hooks/useLivePrices";

type Phase = {
  name: "Accumulation" | "Manipulation" | "Distribution";
  status: "Active" | "Pending" | "Complete" | "Watch";
  duration: string;
  description: string;
  color: string;
  bgColor: string;
  progress: number;
};

type PairAMD = {
  pair: string;
  currentPhase: 0 | 1 | 2;
  phases: Phase[];
  cycleProgress: number;
};

const TIMEFRAMES = ["M15", "H1", "H4", "D1"];

const BASE_AMD_DATA: PairAMD[] = [
  {
    pair: "XAU/USD",
    currentPhase: 1,
    cycleProgress: 48,
    phases: [
      {
        name: "Accumulation",
        status: "Complete",
        duration: "3-5 hours",
        description:
          "Smart money builds positions quietly. Low volatility range. Ideal for limit orders at extremes.",
        color: "oklch(0.68 0.14 220)",
        bgColor: "oklch(0.20 0.04 220)",
        progress: 100,
      },
      {
        name: "Manipulation",
        status: "Active",
        duration: "1-2 hours",
        description:
          "False breakout to grab retail stop losses. Liquidity sweep of highs/lows before true move.",
        color: "oklch(0.82 0.16 75)",
        bgColor: "oklch(0.20 0.04 75)",
        progress: 62,
      },
      {
        name: "Distribution",
        status: "Pending",
        duration: "4-8 hours",
        description:
          "Price delivers in the intended direction. Smart money unloads into retail orders.",
        color: "oklch(0.65 0.18 20)",
        bgColor: "oklch(0.20 0.04 20)",
        progress: 0,
      },
    ],
  },
  {
    pair: "EUR/USD",
    currentPhase: 0,
    cycleProgress: 22,
    phases: [
      {
        name: "Accumulation",
        status: "Active",
        duration: "2-4 hours",
        description:
          "Consolidation at key support. Smart money absorbing retail sell pressure.",
        color: "oklch(0.68 0.14 220)",
        bgColor: "oklch(0.20 0.04 220)",
        progress: 22,
      },
      {
        name: "Manipulation",
        status: "Watch",
        duration: "30-90 mins",
        description:
          "Expect a fake move below support to trigger retail stops before bullish reversal.",
        color: "oklch(0.82 0.16 75)",
        bgColor: "oklch(0.20 0.04 75)",
        progress: 0,
      },
      {
        name: "Distribution",
        status: "Pending",
        duration: "3-6 hours",
        description: "Bullish delivery expected. Target premium array above.",
        color: "oklch(0.65 0.18 20)",
        bgColor: "oklch(0.20 0.04 20)",
        progress: 0,
      },
    ],
  },
  {
    pair: "GBP/USD",
    currentPhase: 2,
    cycleProgress: 80,
    phases: [
      {
        name: "Accumulation",
        status: "Complete",
        duration: "4-6 hours",
        description:
          "London session range established. Smart money positioned.",
        color: "oklch(0.68 0.14 220)",
        bgColor: "oklch(0.20 0.04 220)",
        progress: 100,
      },
      {
        name: "Manipulation",
        status: "Complete",
        duration: "45-90 mins",
        description:
          "NY open stop hunt completed. False break above Asian high.",
        color: "oklch(0.82 0.16 75)",
        bgColor: "oklch(0.20 0.04 75)",
        progress: 100,
      },
      {
        name: "Distribution",
        status: "Active",
        duration: "3-5 hours",
        description:
          "Bearish delivery in progress. Price targeting discount array.",
        color: "oklch(0.65 0.18 20)",
        bgColor: "oklch(0.20 0.04 20)",
        progress: 80,
      },
    ],
  },
];

const PHASE_NAMES: Array<"Accumulation" | "Manipulation" | "Distribution"> = [
  "Accumulation",
  "Manipulation",
  "Distribution",
];

const STATUS_COLORS: Record<string, string> = {
  Active: "oklch(0.76 0.17 150)",
  Complete: "oklch(0.68 0.14 220)",
  Pending: "oklch(0.55 0.06 240)",
  Watch: "oklch(0.82 0.16 75)",
};

function CycleTimeline({
  currentPhase,
}: { currentPhase: number; cycleProgress: number }) {
  const phases = ["Accumulation", "Manipulation", "Distribution"];
  const colors = [
    "oklch(0.68 0.14 220)",
    "oklch(0.82 0.16 75)",
    "oklch(0.65 0.18 20)",
  ];
  return (
    <div className="flex items-center gap-0 rounded-lg overflow-hidden h-7 mb-4">
      {phases.map((p, i) => (
        <div
          key={p}
          className="flex-1 flex items-center justify-center text-[10px] font-bold uppercase tracking-wider transition-all"
          style={{
            background: i === currentPhase ? colors[i] : `${colors[i]}40`,
            color: i === currentPhase ? "oklch(0.10 0.02 240)" : colors[i],
            opacity: i < currentPhase ? 0.7 : 1,
          }}
        >
          {p.slice(0, 3)}
        </div>
      ))}
    </div>
  );
}

export default function AMDSection() {
  const [tf, setTf] = useState("H1");
  const { prices, isLoading } = useLivePrices();
  const { countdown, lastUpdated, refreshKey } = useAutoRefresh(30);
  const { alertsEnabled, toggleAlerts, sendAlert } = useAlertNotifications();

  // Derive live AMD data with small noise per refreshKey
  const amdData: PairAMD[] = BASE_AMD_DATA.map((d) => {
    const noise = Math.sin(refreshKey * 3.7 + d.pair.charCodeAt(0)) * 0.3;
    const progress = Math.min(
      100,
      Math.max(0, d.phases[d.currentPhase].progress + noise),
    );
    return {
      ...d,
      phases: d.phases.map((p, i) =>
        i === d.currentPhase ? { ...p, progress: Math.round(progress) } : p,
      ),
    };
  });

  // Alert on phase detection (track previous phases)
  const prevPhasesRef = useRef<number[]>(amdData.map((d) => d.currentPhase));
  useEffect(() => {
    amdData.forEach((d, i) => {
      if (prevPhasesRef.current[i] !== d.currentPhase) {
        sendAlert(
          `AMD Phase Change – ${d.pair}`,
          `${d.pair} entered ${PHASE_NAMES[d.currentPhase]} phase`,
        );
        prevPhasesRef.current[i] = d.currentPhase;
      }
    });
  });

  const getOffset = (pair: string, pct: number) => {
    const base = prices[pair] ?? 0;
    return base * pct;
  };

  const formattedTime = lastUpdated.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

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
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
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
                Institutional price delivery model — track Accumulation,
                Manipulation, and Distribution phases across major pairs.
              </p>
              {/* Refresh status row */}
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-xl border border-border/40 p-4 mb-8 flex items-start gap-4"
            style={{ background: "oklch(0.18 0.03 220 / 0.4)" }}
          >
            <div className="flex flex-col items-center gap-1">
              {["A", "M", "D"].map((l, i) => (
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
                Institutional Price Delivery Model
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Smart Money accumulates positions in a range, then manipulates
                price to take liquidity (stop hunt), before distributing in the
                true direction. Understanding this cycle lets you trade WITH
                institutions.
              </p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {amdData.map((pairData, pi) => {
              const livePrice = prices[pairData.pair];
              const isJpy = pairData.pair.includes("JPY");
              const isGold = pairData.pair === "XAU/USD";
              const decimals = isGold ? 2 : isJpy ? 2 : 4;
              const atrPct = isGold ? 0.004 : isJpy ? 0.003 : 0.002;

              return (
                <motion.div
                  key={pairData.pair}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.15 * pi }}
                  className="rounded-xl border border-border/60 overflow-hidden"
                  style={{ background: "oklch(0.19 0.03 240)" }}
                >
                  <div
                    className="px-4 py-3 flex items-center justify-between"
                    style={{ background: "oklch(0.17 0.03 240)" }}
                  >
                    <div>
                      <span className="font-mono font-bold text-foreground">
                        {pairData.pair}
                      </span>
                      {livePrice && (
                        <span className="ml-2 text-xs font-mono text-muted-foreground">
                          {isGold ? "$" : ""}
                          {livePrice.toFixed(decimals)}
                        </span>
                      )}
                    </div>
                    <Badge
                      className="text-[10px] font-bold"
                      style={{
                        background: `${STATUS_COLORS[pairData.phases[pairData.currentPhase].status]}20`,
                        color:
                          STATUS_COLORS[
                            pairData.phases[pairData.currentPhase].status
                          ],
                        border: `1px solid ${STATUS_COLORS[pairData.phases[pairData.currentPhase].status]}40`,
                      }}
                    >
                      {pairData.phases[pairData.currentPhase].name}
                    </Badge>
                  </div>

                  <div className="px-4 pt-3">
                    <CycleTimeline
                      currentPhase={pairData.currentPhase}
                      cycleProgress={pairData.cycleProgress}
                    />
                  </div>

                  <div className="p-4 flex flex-col gap-3">
                    {pairData.phases.map((phase) => {
                      const offset = getOffset(pairData.pair, atrPct);
                      const phaseIdx = pairData.phases.indexOf(phase);
                      const isActive = phaseIdx === pairData.currentPhase;
                      const rangeLow = livePrice
                        ? livePrice - offset * (phaseIdx + 1)
                        : null;
                      const rangeHigh = livePrice
                        ? livePrice + offset * (phaseIdx + 0.5)
                        : null;

                      return (
                        <div
                          key={phase.name}
                          className="rounded-lg p-3 border transition-all"
                          style={{
                            background: isActive
                              ? phase.bgColor
                              : "oklch(0.17 0.02 240)",
                            borderColor: isActive
                              ? `${phase.color}60`
                              : "oklch(0.25 0.02 240)",
                            boxShadow: isActive
                              ? `0 0 12px ${phase.color}20`
                              : "none",
                          }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span
                              className="text-xs font-bold"
                              style={{ color: phase.color }}
                            >
                              {phase.name}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground">
                                {phase.duration}
                              </span>
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={{
                                  background: `${STATUS_COLORS[phase.status]}20`,
                                  color: STATUS_COLORS[phase.status],
                                }}
                              >
                                {phase.status}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
                            {phase.description}
                          </p>
                          {rangeLow && rangeHigh && !isLoading && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-[10px] text-muted-foreground">
                                Range:
                              </span>
                              <span className="text-[10px] font-mono text-foreground">
                                {rangeLow.toFixed(decimals)} &ndash;{" "}
                                {rangeHigh.toFixed(decimals)}
                              </span>
                            </div>
                          )}
                          <Progress value={phase.progress} className="h-1" />
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
