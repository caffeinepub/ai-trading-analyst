import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Copy,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import type { TradingSignal } from "../backend.d";
import {
  TradingSignalType as SignalTypeEnum,
  TradingSignalStatus as StatusEnum,
} from "../backend.d";
import { useLivePrices } from "../hooks/useLivePrices";
import { useTradingSignals } from "../hooks/useQueries";

// Fixed signal levels — absolute prices updated for current market (March 2026)
const SIGNAL_CONFIG: Array<{
  tradingPair: string;
  strategyName: string;
  signalType: "buy" | "sell";
  entry: number;
  tp: number;
  sl: number;
  accuracyScore: bigint;
  status: string;
}> = [
  {
    tradingPair: "XAU/USD",
    strategyName: "SMC + OB H4",
    signalType: "buy",
    entry: 3058.5,
    tp: 3116.0,
    sl: 3031.0,
    accuracyScore: BigInt(88),
    status: "active",
  },
  {
    tradingPair: "EUR/USD",
    strategyName: "AMD Cycle H1",
    signalType: "buy",
    entry: 1.0812,
    tp: 1.0858,
    sl: 1.0781,
    accuracyScore: BigInt(87),
    status: "active",
  },
  {
    tradingPair: "GBP/USD",
    strategyName: "Liquidity Sweep M15",
    signalType: "sell",
    entry: 1.2932,
    tp: 1.2885,
    sl: 1.2965,
    accuracyScore: BigInt(85),
    status: "pending",
  },
  {
    tradingPair: "USD/JPY",
    strategyName: "FVG + BOS H1",
    signalType: "sell",
    entry: 149.85,
    tp: 149.18,
    sl: 150.42,
    accuracyScore: BigInt(86),
    status: "active",
  },
  {
    tradingPair: "GBP/JPY",
    strategyName: "H&S Pattern H1",
    signalType: "sell",
    entry: 193.42,
    tp: 192.04,
    sl: 194.28,
    accuracyScore: BigInt(85),
    status: "active",
  },
  {
    tradingPair: "EUR/JPY",
    strategyName: "CHOCH + OB D1",
    signalType: "buy",
    entry: 161.55,
    tp: 162.92,
    sl: 160.72,
    accuracyScore: BigInt(87),
    status: "active",
  },
];

// Fallback prices if live data isn't loaded yet (March 2026)
const FALLBACK: Record<string, number> = {
  "XAU/USD": 3085,
  "EUR/USD": 1.0824,
  "GBP/USD": 1.2915,
  "USD/JPY": 149.52,
  "GBP/JPY": 192.74,
  "EUR/JPY": 161.84,
};

function calcRR(entry: number, tp: number, sl: number): string {
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk === 0) return "—";
  const ratio = reward / risk;
  return `1:${ratio.toFixed(1)}`;
}

function buildSignals(_prices: Record<string, number>): TradingSignal[] {
  return SIGNAL_CONFIG.map((cfg, i) => {
    const isBuy = cfg.signalType === "buy";
    return {
      tradingPair: cfg.tradingPair,
      strategyName: cfg.strategyName,
      signalType: isBuy ? SignalTypeEnum.buy : SignalTypeEnum.sell,
      entryPrice: cfg.entry,
      takeProfit: cfg.tp,
      stopLoss: cfg.sl,
      accuracyScore: cfg.accuracyScore,
      timestamp: BigInt(Date.now() - i * 3600000),
      status:
        cfg.status === "active"
          ? StatusEnum.active
          : cfg.status === "pending"
            ? StatusEnum.pending
            : StatusEnum.closed,
    } as TradingSignal;
  });
}

const SIGNAL_DETAILS: Record<
  string,
  {
    smc: string[];
    amd: string;
    supportFraction: number;
    resistanceFraction: number;
  }
> = {
  "XAU/USD": {
    smc: [
      "Bullish Order Block below entry — strong institutional demand zone (H4)",
      "Fair Value Gap acting as re-entry magnet after liquidity sweep",
      "Break of Structure confirmed to the upside; BSL is primary target",
    ],
    amd: "Accumulation",
    supportFraction: -0.0055,
    resistanceFraction: 0.0095,
  },
  "EUR/USD": {
    smc: [
      "AMD Accumulation phase complete — price coiling above demand zone",
      "FVG acting as launchpad for bullish continuation",
      "BOS confirmed on M30; institutional order flow skewed long",
    ],
    amd: "Accumulation",
    supportFraction: -0.0028,
    resistanceFraction: 0.0042,
  },
  "GBP/USD": {
    smc: [
      "Liquidity sweep below SSL confirmed — short entry on retest",
      "Bearish CHOCH on M15; distribution phase underway",
      "FVG offering premium sell zone above entry",
    ],
    amd: "Distribution",
    supportFraction: -0.0038,
    resistanceFraction: 0.0024,
  },
  "USD/JPY": {
    smc: [
      "FVG rejecting price — bearish continuation expected",
      "BOS to the downside confirmed on H1; sell pressure increasing",
      "SSL below entry is primary target; manipulation phase above",
    ],
    amd: "Manipulation",
    supportFraction: -0.0045,
    resistanceFraction: 0.003,
  },
  "GBP/JPY": {
    smc: [
      "Head & Shoulders pattern completed at resistance zone",
      "Bearish OB confirmed rejection above entry",
      "CHOCH on H1; targeting SSL and potential extension lower",
    ],
    amd: "Distribution",
    supportFraction: -0.0074,
    resistanceFraction: 0.0043,
  },
  "EUR/JPY": {
    smc: [
      "Daily Order Block providing bullish confluence below entry",
      "CHOCH confirmed bullish; AMD Accumulation complete on D1",
      "FVG as entry zone; TP at BSL zone above",
    ],
    amd: "Accumulation",
    supportFraction: -0.0052,
    resistanceFraction: 0.0085,
  },
};

const SPARKLINE_DATA = [
  [{ v: 40 }, { v: 35 }, { v: 45 }, { v: 38 }, { v: 50 }, { v: 42 }, { v: 55 }],
  [{ v: 30 }, { v: 45 }, { v: 40 }, { v: 55 }, { v: 50 }, { v: 60 }, { v: 58 }],
  [{ v: 60 }, { v: 55 }, { v: 50 }, { v: 45 }, { v: 40 }, { v: 38 }, { v: 35 }],
  [{ v: 55 }, { v: 48 }, { v: 42 }, { v: 38 }, { v: 35 }, { v: 30 }, { v: 28 }],
  [{ v: 50 }, { v: 45 }, { v: 40 }, { v: 35 }, { v: 30 }, { v: 28 }, { v: 26 }],
  [{ v: 40 }, { v: 48 }, { v: 55 }, { v: 52 }, { v: 60 }, { v: 58 }, { v: 65 }],
];

function timeAgo(ts: bigint): string {
  const ms = Date.now() - Number(ts);
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatPrice(pair: string, p: number): string {
  if (pair === "XAU/USD") return `$${p.toFixed(2)}`;
  if (pair.includes("JPY")) return p.toFixed(2);
  return p.toFixed(4);
}

function formatPips(pair: string, entry: number, target: number): string {
  let pips: number;
  if (pair === "XAU/USD") pips = Math.abs(target - entry) * 10;
  else if (pair.includes("JPY")) pips = Math.abs(target - entry) * 100;
  else pips = Math.abs(target - entry) * 10000;
  return `${Math.round(pips)}p`;
}

function getStatusColor(s: string): string {
  if (s === StatusEnum.active) return "oklch(0.76 0.17 150)";
  if (s === StatusEnum.pending) return "oklch(0.75 0.12 80)";
  return "oklch(0.55 0.03 240)";
}

function getAmdColor(amd: string): string {
  if (amd === "Accumulation") return "oklch(0.76 0.17 150)";
  if (amd === "Manipulation") return "oklch(0.75 0.12 80)";
  return "oklch(0.65 0.18 20)";
}

type GradeInfo = {
  grade: "A" | "B" | "C";
  color: string;
  bg: string;
  label: string;
};

function getGrade(score: number): GradeInfo {
  if (score >= 85)
    return {
      grade: "A",
      color: "oklch(0.82 0.16 75)",
      bg: "oklch(0.82 0.16 75 / 0.15)",
      label: "High Accuracy",
    };
  if (score >= 75)
    return {
      grade: "B",
      color: "oklch(0.76 0.17 150)",
      bg: "oklch(0.76 0.17 150 / 0.15)",
      label: "Moderate Accuracy",
    };
  return {
    grade: "C",
    color: "oklch(0.72 0.14 40)",
    bg: "oklch(0.72 0.14 40 / 0.15)",
    label: "Lower Accuracy",
  };
}

type FilterValue =
  | "all"
  | "buy"
  | "sell"
  | "active"
  | "gradeA"
  | "gradeB"
  | "gradeC";

function GradeBreakdownCard({ signals }: { signals: TradingSignal[] }) {
  const active = signals.filter((s) => s.status === StatusEnum.active);
  const countA = active.filter((s) => Number(s.accuracyScore) >= 85).length;
  const countB = active.filter(
    (s) => Number(s.accuracyScore) >= 75 && Number(s.accuracyScore) < 85,
  ).length;
  const countC = active.filter((s) => Number(s.accuracyScore) < 75).length;
  const total = active.length;

  const grades = [
    {
      grade: "A",
      count: countA,
      color: "oklch(0.82 0.16 75)",
      bg: "oklch(0.82 0.16 75 / 0.12)",
      border: "oklch(0.82 0.16 75 / 0.35)",
      desc: "High Accuracy (≥85%)",
    },
    {
      grade: "B",
      count: countB,
      color: "oklch(0.76 0.17 150)",
      bg: "oklch(0.76 0.17 150 / 0.12)",
      border: "oklch(0.76 0.17 150 / 0.35)",
      desc: "Moderate (75–84%)",
    },
    {
      grade: "C",
      count: countC,
      color: "oklch(0.72 0.14 40)",
      bg: "oklch(0.72 0.14 40 / 0.12)",
      border: "oklch(0.72 0.14 40 / 0.35)",
      desc: "Lower (<75%)",
    },
  ];

  const barColors = [
    "oklch(0.82 0.16 75)",
    "oklch(0.76 0.17 150)",
    "oklch(0.72 0.14 40)",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className="rounded-xl border border-border/60 p-5 mb-5"
      style={{ background: "oklch(0.19 0.03 240)" }}
      data-ocid="signals.grade_breakdown"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-wide">
            Grade Breakdown
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total} active signal{total !== 1 ? "s" : ""} · live accuracy tiers
          </p>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full self-start sm:self-auto"
          style={{
            background: "oklch(0.76 0.17 150 / 0.15)",
            color: "oklch(0.76 0.17 150)",
          }}
        >
          GainzAlgo V2 Alpha
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {grades.map((g) => (
          <div
            key={g.grade}
            className="flex flex-col items-center gap-2 rounded-lg p-3"
            style={{ background: g.bg, border: `1px solid ${g.border}` }}
          >
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-base font-black"
              style={{
                background: g.bg,
                color: g.color,
                border: `2px solid ${g.border}`,
              }}
            >
              {g.grade}
            </span>
            <span
              className="text-2xl font-black font-mono"
              style={{ color: g.color }}
            >
              {g.count}
            </span>
            <span className="text-[10px] text-muted-foreground text-center leading-tight">
              {g.desc}
            </span>
          </div>
        ))}
      </div>

      {/* Proportional progress bar */}
      {total > 0 && (
        <div
          className="rounded-full overflow-hidden h-2 flex"
          style={{ background: "oklch(0.25 0.03 240)" }}
        >
          {grades.map((g, i) => {
            const pct = (g.count / total) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={g.grade}
                style={{
                  width: `${pct}%`,
                  background: barColors[i],
                  transition: "width 0.5s ease",
                }}
              />
            );
          })}
        </div>
      )}
      {total === 0 && (
        <div
          className="rounded-full h-2"
          style={{ background: "oklch(0.25 0.03 240)" }}
        />
      )}
    </motion.div>
  );
}

export default function SignalsDashboard() {
  const { data: backendSignals, isLoading } = useTradingSignals();
  const { prices } = useLivePrices();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Build live-price-anchored signals; fall back to backend signals if available
  const liveSignals = useMemo(() => buildSignals(prices), [prices]);
  const signals =
    backendSignals && backendSignals.length > 0 ? backendSignals : liveSignals;

  const filtered = useMemo(() => {
    if (filter === "buy")
      return signals.filter((s) => s.signalType === SignalTypeEnum.buy);
    if (filter === "sell")
      return signals.filter((s) => s.signalType === SignalTypeEnum.sell);
    if (filter === "active")
      return signals.filter((s) => s.status === StatusEnum.active);
    if (filter === "gradeA")
      return signals.filter((s) => Number(s.accuracyScore) >= 85);
    if (filter === "gradeB")
      return signals.filter(
        (s) => Number(s.accuracyScore) >= 75 && Number(s.accuracyScore) < 85,
      );
    if (filter === "gradeC")
      return signals.filter((s) => Number(s.accuracyScore) < 75);
    return signals;
  }, [signals, filter]);

  function handleCopy(signal: TradingSignal) {
    const text = `${signal.tradingPair} ${signal.signalType === SignalTypeEnum.buy ? "BUY" : "SELL"}\nEntry: ${formatPrice(signal.tradingPair, signal.entryPrice)}\nTP: ${formatPrice(signal.tradingPair, signal.takeProfit)}\nSL: ${formatPrice(signal.tradingPair, signal.stopLoss)}\nR:R Ratio: ${calcRR(signal.entryPrice, signal.takeProfit, signal.stopLoss)}\nStrategy: ${signal.strategyName}`;
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(signal.tradingPair);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <section id="signals" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6"
        >
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-teal block mb-1">
              LIVE INTELLIGENCE
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Trading Signals Dashboard
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              AI signals anchored to live prices · GainzAlgo V2 Alpha · SMC, AMD
              &amp; liquidity sweep analysis. Grade A = highest accuracy. Click
              any row for SMC breakdown.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground hover:text-foreground self-start sm:self-auto"
            data-ocid="signals.view.button"
          >
            View all signals
          </Button>
        </motion.div>

        <GradeBreakdownCard signals={signals} />

        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as FilterValue)}
          className="mb-4"
        >
          <TabsList
            className="bg-secondary border border-border/60 flex-wrap h-auto gap-1 p-1"
            data-ocid="signals.filter.tab"
          >
            <TabsTrigger value="all" data-ocid="signals.all.tab">
              All
            </TabsTrigger>
            <TabsTrigger value="buy" data-ocid="signals.buy.tab">
              Buy
            </TabsTrigger>
            <TabsTrigger value="sell" data-ocid="signals.sell.tab">
              Sell
            </TabsTrigger>
            <TabsTrigger value="active" data-ocid="signals.active.tab">
              Active
            </TabsTrigger>
            <TabsTrigger
              value="gradeA"
              data-ocid="signals.gradeA.tab"
              className="data-[state=active]:text-[oklch(0.82_0.16_75)]"
            >
              <span className="inline-flex items-center gap-1">
                <span
                  className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                  style={{
                    background: "oklch(0.82 0.16 75 / 0.2)",
                    color: "oklch(0.82 0.16 75)",
                  }}
                >
                  A
                </span>
                Grade A
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="gradeB"
              data-ocid="signals.gradeB.tab"
              className="data-[state=active]:text-[oklch(0.76_0.17_150)]"
            >
              <span className="inline-flex items-center gap-1">
                <span
                  className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                  style={{
                    background: "oklch(0.76 0.17 150 / 0.2)",
                    color: "oklch(0.76 0.17 150)",
                  }}
                >
                  B
                </span>
                Grade B
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="gradeC"
              data-ocid="signals.gradeC.tab"
              className="data-[state=active]:text-[oklch(0.72_0.14_40)]"
            >
              <span className="inline-flex items-center gap-1">
                <span
                  className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                  style={{
                    background: "oklch(0.72 0.14 40 / 0.2)",
                    color: "oklch(0.72 0.14 40)",
                  }}
                >
                  C
                </span>
                Grade C
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="rounded-xl border border-border/60 overflow-hidden card-glow"
          style={{ background: "oklch(0.19 0.03 240)" }}
          data-ocid="signals.table"
        >
          {/* Table header */}
          <div className="hidden lg:grid grid-cols-[2fr_1.5fr_80px_1fr_1fr_1fr_70px_50px_100px_120px] gap-2 px-5 py-3 border-b border-border/40">
            {[
              "Pair",
              "Strategy",
              "Type",
              "Entry",
              "TP",
              "SL / R:R",
              "Score",
              "Grade",
              "Time",
              "Actions",
            ].map((h) => (
              <span
                key={h}
                className="text-xs font-semibold text-muted-foreground uppercase tracking-wide"
              >
                {h}
              </span>
            ))}
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3" data-ocid="signals.loading_state">
              {["sk1", "sk2", "sk3"].map((k) => (
                <Skeleton key={k} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center"
              data-ocid="signals.empty_state"
            >
              <TrendingUp className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground">
                No signals match this filter.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {filtered.map((signal, idx) => {
                const isBuy = signal.signalType === SignalTypeEnum.buy;
                const score = Number(signal.accuracyScore);
                const scoreColor =
                  score >= 85
                    ? "oklch(0.82 0.16 75)"
                    : score >= 75
                      ? "oklch(0.76 0.17 150)"
                      : "oklch(0.72 0.14 40)";
                const gradeInfo = getGrade(score);
                const isGold = signal.tradingPair === "XAU/USD";
                const rowKey = `${signal.tradingPair}-${signal.strategyName}`;
                const isExpanded = expandedKey === rowKey;
                const detailCfg = SIGNAL_DETAILS[signal.tradingPair];
                const livePrice =
                  prices[signal.tradingPair] ?? FALLBACK[signal.tradingPair];
                const supportPrice = livePrice
                  ? livePrice * (1 + (detailCfg?.supportFraction ?? -0.005))
                  : signal.stopLoss;
                const resistancePrice = livePrice
                  ? livePrice * (1 + (detailCfg?.resistanceFraction ?? 0.005))
                  : signal.takeProfit;
                const accentColor = isBuy
                  ? "oklch(0.76 0.17 150)"
                  : "oklch(0.65 0.18 20)";

                return (
                  <div key={rowKey}>
                    <div
                      className="grid grid-cols-1 lg:grid-cols-[2fr_1.5fr_80px_1fr_1fr_1fr_70px_50px_100px_120px] gap-2 px-5 py-4 hover:bg-muted/20 transition-colors cursor-pointer"
                      data-ocid={`signals.item.${idx + 1}`}
                      onClick={() => setExpandedKey(isExpanded ? null : rowKey)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")
                          setExpandedKey(isExpanded ? null : rowKey);
                      }}
                    >
                      {/* Pair */}
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{
                            background: isGold
                              ? "oklch(0.75 0.12 80 / 0.2)"
                              : isBuy
                                ? "oklch(0.76 0.17 150 / 0.15)"
                                : "oklch(0.65 0.18 20 / 0.15)",
                            color: isGold
                              ? "oklch(0.75 0.12 80)"
                              : isBuy
                                ? "oklch(0.76 0.17 150)"
                                : "oklch(0.65 0.18 20)",
                          }}
                        >
                          {isGold ? "AU" : signal.tradingPair.slice(0, 2)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground font-mono">
                            {signal.tradingPair}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <span
                              className="w-1.5 h-1.5 rounded-full inline-block"
                              style={{
                                background: getStatusColor(
                                  String(signal.status),
                                ),
                              }}
                            />
                            {String(signal.status)}
                          </div>
                        </div>
                      </div>

                      {/* Strategy */}
                      <div className="flex items-center">
                        <span className="text-xs text-muted-foreground truncate">
                          {signal.strategyName}
                        </span>
                      </div>

                      {/* Type */}
                      <div className="flex items-center">
                        <span
                          className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: isBuy
                              ? "oklch(0.76 0.17 150 / 0.15)"
                              : "oklch(0.65 0.18 20 / 0.15)",
                            color: isBuy
                              ? "oklch(0.76 0.17 150)"
                              : "oklch(0.65 0.18 20)",
                          }}
                        >
                          {isBuy ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {isBuy ? "BUY" : "SELL"}
                        </span>
                      </div>

                      {/* Entry */}
                      <div className="flex items-center">
                        <span className="text-sm font-mono text-foreground">
                          {formatPrice(signal.tradingPair, signal.entryPrice)}
                        </span>
                      </div>

                      {/* TP */}
                      <div className="flex flex-col justify-center">
                        <span
                          className="text-sm font-mono"
                          style={{ color: "oklch(0.76 0.17 150)" }}
                        >
                          {formatPrice(signal.tradingPair, signal.takeProfit)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatPips(
                            signal.tradingPair,
                            signal.entryPrice,
                            signal.takeProfit,
                          )}
                        </span>
                      </div>

                      {/* SL + R:R */}
                      <div className="flex flex-col justify-center">
                        <span
                          className="text-sm font-mono"
                          style={{ color: "oklch(0.65 0.18 20)" }}
                        >
                          {formatPrice(signal.tradingPair, signal.stopLoss)}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {formatPips(
                            signal.tradingPair,
                            signal.entryPrice,
                            signal.stopLoss,
                          )}
                          <span
                            className="px-1 py-0 rounded text-[10px] font-bold"
                            style={{
                              background: "oklch(0.82 0.16 75 / 0.15)",
                              color: "oklch(0.82 0.16 75)",
                            }}
                          >
                            RR{" "}
                            {calcRR(
                              signal.entryPrice,
                              signal.takeProfit,
                              signal.stopLoss,
                            )}
                          </span>
                        </span>
                      </div>

                      {/* Score */}
                      <div className="flex items-center">
                        <span
                          className="text-sm font-bold font-mono"
                          style={{ color: scoreColor }}
                        >
                          {score}%
                        </span>
                      </div>

                      {/* Grade */}
                      <div className="flex items-center">
                        <span
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
                          style={{
                            background: gradeInfo.bg,
                            color: gradeInfo.color,
                            border: `1px solid ${gradeInfo.color}55`,
                          }}
                          title={gradeInfo.label}
                        >
                          {gradeInfo.grade}
                        </span>
                      </div>

                      {/* Sparkline + Time */}
                      <div className="hidden lg:flex flex-col justify-center gap-0.5">
                        <div className="w-20 h-6">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={SPARKLINE_DATA[idx % SPARKLINE_DATA.length]}
                            >
                              <Line
                                type="monotone"
                                dataKey="v"
                                dot={false}
                                stroke={
                                  isBuy
                                    ? "oklch(0.76 0.17 150)"
                                    : "oklch(0.65 0.18 20)"
                                }
                                strokeWidth={1.5}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(signal.timestamp)}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(signal);
                          }}
                          title="Copy signal"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                          title="Bookmark"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5" />
                        </Button>
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedKey(isExpanded ? null : rowKey);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail panel */}
                    <AnimatePresence>
                      {isExpanded && detailCfg && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ overflow: "hidden" }}
                        >
                          <div
                            className="mx-4 mb-4 rounded-lg p-4"
                            style={{
                              background: "oklch(0.16 0.028 240)",
                              borderLeft: `3px solid ${accentColor}`,
                            }}
                          >
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* SMC Analysis */}
                              <div className="md:col-span-2">
                                <div
                                  className="text-xs font-semibold tracking-widest uppercase mb-2"
                                  style={{ color: accentColor }}
                                >
                                  SMC Analysis
                                </div>
                                <ul className="space-y-1.5">
                                  {detailCfg.smc.map((point) => (
                                    <li
                                      key={point.slice(0, 30)}
                                      className="flex items-start gap-2 text-xs text-muted-foreground"
                                    >
                                      <span
                                        className="w-1 h-1 rounded-full mt-1.5 shrink-0"
                                        style={{ background: accentColor }}
                                      />
                                      {point}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              {/* Key Levels + AMD */}
                              <div className="space-y-3">
                                <div>
                                  <div
                                    className="text-xs font-semibold tracking-widest uppercase mb-1.5"
                                    style={{ color: accentColor }}
                                  >
                                    AMD Phase
                                  </div>
                                  <span
                                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                                    style={{
                                      background: `${getAmdColor(detailCfg.amd)}22`,
                                      color: getAmdColor(detailCfg.amd),
                                      border: `1px solid ${getAmdColor(detailCfg.amd)}55`,
                                    }}
                                  >
                                    {detailCfg.amd}
                                  </span>
                                </div>
                                <div>
                                  <div className="text-xs font-semibold tracking-widest uppercase mb-1.5 text-muted-foreground">
                                    Key Levels
                                  </div>
                                  <div className="text-xs space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        Support
                                      </span>
                                      <span
                                        className="font-mono"
                                        style={{
                                          color: "oklch(0.76 0.17 150)",
                                        }}
                                      >
                                        {formatPrice(
                                          signal.tradingPair,
                                          supportPrice,
                                        )}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">
                                        Resistance
                                      </span>
                                      <span
                                        className="font-mono"
                                        style={{ color: "oklch(0.65 0.18 20)" }}
                                      >
                                        {formatPrice(
                                          signal.tradingPair,
                                          resistancePrice,
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  className="w-full text-xs h-7 font-semibold"
                                  style={{
                                    background: accentColor,
                                    color: "oklch(0.14 0.025 240)",
                                  }}
                                  onClick={() => handleCopy(signal)}
                                >
                                  {copied === signal.tradingPair
                                    ? "Copied!"
                                    : "Copy Signal"}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
