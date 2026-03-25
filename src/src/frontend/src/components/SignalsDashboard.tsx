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
import { useTradingSignals } from "../hooks/useQueries";

const STATIC_SIGNALS: TradingSignal[] = [
  {
    tradingPair: "XAU/USD",
    strategyName: "SMC + OB H4",
    signalType: SignalTypeEnum.buy,
    entryPrice: 3042.5,
    takeProfit: 3071.0,
    stopLoss: 3025.0,
    accuracyScore: BigInt(88),
    timestamp: BigInt(Date.now() - 600000),
    status: StatusEnum.active,
  },
  {
    tradingPair: "EUR/USD",
    strategyName: "AMD Cycle H1",
    signalType: SignalTypeEnum.buy,
    entryPrice: 1.0832,
    takeProfit: 1.0878,
    stopLoss: 1.0802,
    accuracyScore: BigInt(87),
    timestamp: BigInt(Date.now() - 3600000),
    status: StatusEnum.active,
  },
  {
    tradingPair: "GBP/USD",
    strategyName: "Liquidity Sweep M15",
    signalType: SignalTypeEnum.sell,
    entryPrice: 1.2938,
    takeProfit: 1.2984,
    stopLoss: 1.2908,
    accuracyScore: BigInt(86),
    timestamp: BigInt(Date.now() - 7200000),
    status: StatusEnum.pending,
  },
  {
    tradingPair: "USD/JPY",
    strategyName: "FVG + BOS H1",
    signalType: SignalTypeEnum.sell,
    entryPrice: 149.62,
    takeProfit: 150.28,
    stopLoss: 149.12,
    accuracyScore: BigInt(85),
    timestamp: BigInt(Date.now() - 10800000),
    status: StatusEnum.active,
  },
  {
    tradingPair: "GBP/JPY",
    strategyName: "H&S Pattern H1",
    signalType: SignalTypeEnum.sell,
    entryPrice: 193.45,
    takeProfit: 194.88,
    stopLoss: 192.62,
    accuracyScore: BigInt(89),
    timestamp: BigInt(Date.now() - 14400000),
    status: StatusEnum.active,
  },
  {
    tradingPair: "EUR/JPY",
    strategyName: "CHOCH + OB D1",
    signalType: SignalTypeEnum.buy,
    entryPrice: 162.34,
    takeProfit: 163.8,
    stopLoss: 161.5,
    accuracyScore: BigInt(85),
    timestamp: BigInt(Date.now() - 18000000),
    status: StatusEnum.closed,
  },
];

const SIGNAL_DETAILS: Record<
  string,
  { smc: string[]; amd: string; support: string; resistance: string }
> = {
  "XAU/USD": {
    smc: [
      "Bullish Order Block at 3,028 — strong institutional demand zone (H4)",
      "Fair Value Gap 3,022–3,025 acting as re-entry magnet after sweep",
      "Break of Structure confirmed to the upside; BSL at 3,071 is the target",
    ],
    amd: "Accumulation",
    support: "3,025.00",
    resistance: "3,071.00",
  },
  "EUR/USD": {
    smc: [
      "AMD Accumulation phase complete — price coiling above 1.0802 demand",
      "FVG at 1.0810–1.0815 acting as launchpad for bullish continuation",
      "BOS confirmed on M30; institutional order flow skewed long",
    ],
    amd: "Accumulation",
    support: "1.0802",
    resistance: "1.0878",
  },
  "GBP/USD": {
    smc: [
      "Liquidity sweep below 1.2908 SSL confirmed — short entry on retest",
      "Bearish CHOCH on M15; distribution phase underway",
      "FVG at 1.2948–1.2955 offering premium sell zone",
    ],
    amd: "Distribution",
    support: "1.2908",
    resistance: "1.2984",
  },
  "USD/JPY": {
    smc: [
      "FVG at 149.85–149.95 rejecting price — bearish continuation expected",
      "BOS to the downside confirmed on H1; sell pressure increasing",
      "SSL at 149.12 is primary target; manipulation phase at 150.42",
    ],
    amd: "Manipulation",
    support: "149.12",
    resistance: "150.42",
  },
  "GBP/JPY": {
    smc: [
      "Head & Shoulders pattern completed at 194.45 resistance zone",
      "Bearish OB at 193.88–194.05 confirmed rejection",
      "CHOCH on H1; targets 192.62 SSL and potential extension to 191.80",
    ],
    amd: "Distribution",
    support: "192.62",
    resistance: "194.45",
  },
  "EUR/JPY": {
    smc: [
      "Daily Order Block at 161.50 providing bullish confluence",
      "CHOCH confirmed bullish; AMD Accumulation complete on D1",
      "FVG 162.10–162.20 as entry; TP at 163.80 BSL zone",
    ],
    amd: "Accumulation",
    support: "161.50",
    resistance: "163.80",
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
  if (pair === "XAU/USD") {
    pips = Math.abs(target - entry) * 10;
  } else if (pair.includes("JPY")) {
    pips = Math.abs(target - entry) * 100;
  } else {
    pips = Math.abs(target - entry) * 10000;
  }
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
  if (score >= 85) {
    return {
      grade: "A",
      color: "oklch(0.82 0.16 75)",
      bg: "oklch(0.82 0.16 75 / 0.15)",
      label: "High Accuracy",
    };
  }
  if (score >= 75) {
    return {
      grade: "B",
      color: "oklch(0.76 0.17 150)",
      bg: "oklch(0.76 0.17 150 / 0.15)",
      label: "Moderate Accuracy",
    };
  }
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

export default function SignalsDashboard() {
  const { data: backendSignals, isLoading } = useTradingSignals();
  const [filter, setFilter] = useState<FilterValue>("gradeA");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const signals =
    backendSignals && backendSignals.length > 0
      ? backendSignals
      : STATIC_SIGNALS;

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
    const text = `${signal.tradingPair} ${signal.signalType === SignalTypeEnum.buy ? "BUY" : "SELL"}\nEntry: ${formatPrice(signal.tradingPair, signal.entryPrice)}\nTP: ${formatPrice(signal.tradingPair, signal.takeProfit)}\nSL: ${formatPrice(signal.tradingPair, signal.stopLoss)}\nStrategy: ${signal.strategyName}`;
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
              AI signals for Forex majors, minors &amp; XAU/USD with pip-precise
              targets. Grade A = highest accuracy. Click any row for SMC
              breakdown.
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
              "SL",
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
                const details = SIGNAL_DETAILS[signal.tradingPair];
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

                      {/* SL */}
                      <div className="flex flex-col justify-center">
                        <span
                          className="text-sm font-mono"
                          style={{ color: "oklch(0.65 0.18 20)" }}
                        >
                          {formatPrice(signal.tradingPair, signal.stopLoss)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatPips(
                            signal.tradingPair,
                            signal.entryPrice,
                            signal.stopLoss,
                          )}
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

                      {/* Grade badge */}
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
                      {isExpanded && details && (
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
                                  {details.smc.map((point) => (
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
                                      background: `${getAmdColor(details.amd)}22`,
                                      color: getAmdColor(details.amd),
                                      border: `1px solid ${getAmdColor(details.amd)}55`,
                                    }}
                                  >
                                    {details.amd}
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
                                        {details.support}
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
                                        {details.resistance}
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
