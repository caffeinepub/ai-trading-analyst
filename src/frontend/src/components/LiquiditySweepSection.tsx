import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Filter,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAlertNotifications } from "../hooks/useAlertNotifications";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useLivePrices } from "../hooks/useLivePrices";

type Strength = "Weak" | "Moderate" | "Strong";

interface SweepDef {
  id: number;
  type: "BSL" | "SSL";
  pair: string;
  offsetPct: number;
  time: string;
  strength: Strength;
}

const SWEEP_DEFS: SweepDef[] = [
  {
    id: 1,
    type: "BSL",
    pair: "XAU/USD",
    offsetPct: 0.0055,
    time: "2h ago",
    strength: "Strong",
  },
  {
    id: 2,
    type: "SSL",
    pair: "XAU/USD",
    offsetPct: -0.0048,
    time: "4h ago",
    strength: "Strong",
  },
  {
    id: 3,
    type: "BSL",
    pair: "XAU/USD",
    offsetPct: 0.0092,
    time: "1d ago",
    strength: "Strong",
  },
  {
    id: 4,
    type: "SSL",
    pair: "XAU/USD",
    offsetPct: -0.0078,
    time: "1d ago",
    strength: "Strong",
  },
  {
    id: 5,
    type: "BSL",
    pair: "EUR/USD",
    offsetPct: 0.0022,
    time: "1h ago",
    strength: "Moderate",
  },
  {
    id: 6,
    type: "SSL",
    pair: "EUR/USD",
    offsetPct: -0.0019,
    time: "3h ago",
    strength: "Moderate",
  },
  {
    id: 7,
    type: "BSL",
    pair: "GBP/USD",
    offsetPct: 0.0028,
    time: "30m ago",
    strength: "Moderate",
  },
  {
    id: 8,
    type: "SSL",
    pair: "GBP/USD",
    offsetPct: -0.0024,
    time: "5h ago",
    strength: "Moderate",
  },
  {
    id: 9,
    type: "BSL",
    pair: "USD/JPY",
    offsetPct: 0.0031,
    time: "6h ago",
    strength: "Strong",
  },
  {
    id: 10,
    type: "SSL",
    pair: "USD/JPY",
    offsetPct: -0.0027,
    time: "2h ago",
    strength: "Moderate",
  },
  {
    id: 11,
    type: "BSL",
    pair: "GBP/JPY",
    offsetPct: 0.0038,
    time: "1h ago",
    strength: "Strong",
  },
  {
    id: 12,
    type: "SSL",
    pair: "GBP/JPY",
    offsetPct: -0.0033,
    time: "4h ago",
    strength: "Moderate",
  },
  {
    id: 13,
    type: "BSL",
    pair: "EUR/JPY",
    offsetPct: 0.0029,
    time: "3h ago",
    strength: "Moderate",
  },
  {
    id: 14,
    type: "SSL",
    pair: "EUR/JPY",
    offsetPct: -0.0025,
    time: "2h ago",
    strength: "Weak",
  },
];

const PAIRS_LIST = [
  "XAU/USD",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "GBP/JPY",
  "EUR/JPY",
];

type SweepFilter = "All" | "BSL" | "SSL" | "Swept" | "Pending";
const FILTERS: SweepFilter[] = ["All", "BSL", "SSL", "Swept", "Pending"];

const BULL = "oklch(0.76 0.17 150)";
const BEAR = "oklch(0.65 0.18 20)";
const GOLD = "oklch(0.82 0.16 75)";

function strengthColor(s: Strength): string {
  if (s === "Strong") return BULL;
  if (s === "Moderate") return GOLD;
  return "oklch(0.50 0.04 240)";
}

function getDecimals(pair: string): number {
  if (pair === "XAU/USD") return 2;
  if (pair.includes("JPY")) return 2;
  return 4;
}

function getATR(pair: string, price: number): number {
  if (pair === "XAU/USD") return price * 0.007;
  if (pair.includes("JPY")) return price * 0.003;
  return price * 0.0018;
}

export default function LiquiditySweepSection() {
  const [filter, setFilter] = useState<SweepFilter>("All");
  const [chartPair, setChartPair] = useState("XAU/USD");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { prices, isLoading } = useLivePrices();
  const { countdown, lastUpdated } = useAutoRefresh(30);
  const { alertsEnabled, toggleAlerts, sendAlert } = useAlertNotifications();

  const events = useMemo(() => {
    return SWEEP_DEFS.map((def) => {
      const base = prices[def.pair] ?? 0;
      const level = base > 0 ? base * (1 + def.offsetPct) : null;
      const isBSL = def.type === "BSL";

      let status: "Pending" | "Swept" = "Pending";
      if (base > 0 && level !== null) {
        if (isBSL && base >= level) status = "Swept";
        else if (!isBSL && base <= level) status = "Swept";
      }

      const distancePct =
        base > 0 && level !== null ? Math.abs((base - level) / base) : 1;
      const isApproaching = status === "Pending" && distancePct < 0.001;

      const atr = base > 0 ? getATR(def.pair, base) : 0;
      const sweepDirection: "BUY" | "SELL" = isBSL ? "SELL" : "BUY";
      const sweepEntry =
        level !== null && atr > 0
          ? isBSL
            ? level + atr * 0.3
            : level - atr * 0.3
          : null;
      const sweepSL =
        sweepEntry !== null && atr > 0
          ? isBSL
            ? sweepEntry + atr * 1.5
            : sweepEntry - atr * 1.5
          : null;
      const sweepTP1 =
        sweepEntry !== null && atr > 0
          ? isBSL
            ? sweepEntry - atr * 2.0
            : sweepEntry + atr * 2.0
          : null;
      const sweepTP2 =
        sweepEntry !== null && atr > 0
          ? isBSL
            ? sweepEntry - atr * 3.5
            : sweepEntry + atr * 3.5
          : null;

      return {
        ...def,
        level,
        status,
        distancePct,
        isApproaching,
        sweepDirection,
        sweepEntry,
        sweepSL,
        sweepTP1,
        sweepTP2,
      };
    });
  }, [prices]);

  const prevStatusRef = useRef(events.map((e) => e.status));
  useEffect(() => {
    events.forEach((e, i) => {
      const prev = prevStatusRef.current[i];
      if (prev !== e.status && e.status === "Swept") {
        const lvl = e.level ? e.level.toFixed(getDecimals(e.pair)) : "";
        sendAlert(
          `Liquidity Swept — ${e.pair}`,
          `${e.pair} ${e.type} swept at ${lvl}`,
        );
      }
      prevStatusRef.current[i] = e.status;
    });
  });

  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = events.filter((e) => {
    if (filter === "BSL") return e.type === "BSL";
    if (filter === "SSL") return e.type === "SSL";
    if (filter === "Swept") return e.status === "Swept";
    if (filter === "Pending") return e.status === "Pending";
    return true;
  });

  const bslCount = events.filter((e) => e.type === "BSL").length;
  const sslCount = events.filter((e) => e.type === "SSL").length;
  const sweptCount = events.filter((e) => e.status === "Swept").length;
  const approachingCount = events.filter((e) => e.isApproaching).length;

  const formattedTime = lastUpdated.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const chartEvents = events.filter((e) => e.pair === chartPair);
  const chartLivePrice = prices[chartPair] ?? 0;
  const chartDec = getDecimals(chartPair);

  return (
    <section
      id="liquidity-sweep"
      className="py-16"
      style={{ background: "oklch(0.16 0.025 240)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-1.5 h-6 rounded-full"
                  style={{ background: BULL }}
                />
                <span
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: BULL }}
                >
                  Liquidity Detection
                </span>
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground">
                Liquidity Sweep Detector
              </h2>
              <p className="text-muted-foreground mt-1 text-sm max-w-lg">
                Buy-Side (BSL) and Sell-Side (SSL) levels computed from live
                price with dynamic sweep detection, proximity alerts, and
                post-sweep trade setups.
              </p>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                  style={{
                    background: `${BULL}10`,
                    borderColor: `${BULL}40`,
                    color: BULL,
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
                    background: alertsEnabled ? `${BULL}15` : "transparent",
                    borderColor: alertsEnabled
                      ? `${BULL}40`
                      : "oklch(0.30 0.03 240)",
                    color: alertsEnabled ? BULL : "oklch(0.50 0.05 240)",
                  }}
                  data-ocid="liquidity.toggle"
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

            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: "BSL Levels", value: bslCount, color: BULL },
                { label: "SSL Levels", value: sslCount, color: BEAR },
                {
                  label: "Swept",
                  value: sweptCount,
                  color: "oklch(0.68 0.14 220)",
                },
                { label: "Approaching", value: approachingCount, color: GOLD },
              ].map((s) => (
                <div
                  key={s.label}
                  className="text-center px-3 py-2 rounded-lg border border-border/40"
                  style={{ background: "oklch(0.19 0.03 240)" }}
                >
                  <div
                    className="text-xl font-black font-mono"
                    style={{ color: s.color }}
                  >
                    {s.value}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* ── Depth Chart ── */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-xl border border-border/60 p-4"
              style={{ background: "oklch(0.19 0.03 240)" }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Liquidity Depth
                </h3>
                <Select value={chartPair} onValueChange={setChartPair}>
                  <SelectTrigger
                    className="w-28 h-7 text-xs border-border/60"
                    data-ocid="liquidity.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAIRS_LIST.map((p) => (
                      <SelectItem key={p} value={p} className="text-xs">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative w-full" style={{ height: 260 }}>
                <svg
                  width="100%"
                  height="260"
                  viewBox="0 0 220 260"
                  role="img"
                  aria-label={`Liquidity depth chart for ${chartPair}`}
                >
                  <title>Liquidity Depth — {chartPair}</title>
                  <line
                    x1="0"
                    y1="130"
                    x2="220"
                    y2="130"
                    stroke="oklch(0.65 0.08 240)"
                    strokeWidth="1.5"
                    strokeDasharray="5,3"
                  />
                  <text
                    x="4"
                    y="125"
                    fontSize="7.5"
                    fill="oklch(0.70 0.08 240)"
                    fontWeight="bold"
                  >
                    {chartLivePrice > 0
                      ? `${chartPair === "XAU/USD" ? "$" : ""}${chartLivePrice.toFixed(chartDec)}`
                      : "Live Price"}
                  </text>

                  {chartEvents
                    .filter((e) => e.type === "BSL" && e.level !== null)
                    .map((e, i) => {
                      const pct = Math.abs(e.offsetPct);
                      const y = 130 - Math.min(90, (pct / 0.012) * 110) - i * 4;
                      return (
                        <g key={`bsl-${e.id}`}>
                          <line
                            x1="20"
                            y1={y}
                            x2="200"
                            y2={y}
                            stroke={e.status === "Swept" ? `${BULL}55` : BULL}
                            strokeWidth={e.status === "Swept" ? 1 : 1.8}
                            strokeDasharray={
                              e.status === "Swept" ? "3,3" : "none"
                            }
                            opacity={0.85}
                          />
                          <circle
                            cx="14"
                            cy={y}
                            r="3.5"
                            fill={BULL}
                            opacity={e.status === "Swept" ? 0.4 : 0.95}
                          />
                          <text
                            x="205"
                            y={y + 3}
                            fontSize="7"
                            fill={e.status === "Swept" ? `${BULL}80` : BULL}
                            textAnchor="start"
                          >
                            {e.level !== null ? e.level.toFixed(chartDec) : ""}
                          </text>
                          <text
                            x="22"
                            y={y - 3}
                            fontSize="6.5"
                            fill={BULL}
                            opacity={0.7}
                          >
                            BSL {e.status === "Swept" ? "✓" : ""}
                          </text>
                        </g>
                      );
                    })}

                  {chartEvents
                    .filter((e) => e.type === "SSL" && e.level !== null)
                    .map((e, i) => {
                      const pct = Math.abs(e.offsetPct);
                      const y = 130 + Math.min(90, (pct / 0.012) * 110) + i * 4;
                      return (
                        <g key={`ssl-${e.id}`}>
                          <line
                            x1="20"
                            y1={y}
                            x2="200"
                            y2={y}
                            stroke={e.status === "Swept" ? `${BEAR}55` : BEAR}
                            strokeWidth={e.status === "Swept" ? 1 : 1.8}
                            strokeDasharray={
                              e.status === "Swept" ? "3,3" : "none"
                            }
                            opacity={0.85}
                          />
                          <circle
                            cx="14"
                            cy={y}
                            r="3.5"
                            fill={BEAR}
                            opacity={e.status === "Swept" ? 0.4 : 0.95}
                          />
                          <text
                            x="205"
                            y={y + 3}
                            fontSize="7"
                            fill={e.status === "Swept" ? `${BEAR}80` : BEAR}
                            textAnchor="start"
                          >
                            {e.level !== null ? e.level.toFixed(chartDec) : ""}
                          </text>
                          <text
                            x="22"
                            y={y + 11}
                            fontSize="6.5"
                            fill={BEAR}
                            opacity={0.7}
                          >
                            SSL {e.status === "Swept" ? "✓" : ""}
                          </text>
                        </g>
                      );
                    })}

                  <circle cx="110" cy="130" r="5" fill="oklch(0.78 0.12 190)" />
                </svg>
              </div>
            </motion.div>

            {/* ── Events Table ── */}
            <div
              className="lg:col-span-2 rounded-xl border border-border/60 overflow-hidden"
              style={{ background: "oklch(0.19 0.03 240)" }}
            >
              <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border/40 flex-wrap">
                <Filter className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                {FILTERS.map((f) => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md transition-all"
                    style={{
                      background:
                        filter === f
                          ? "oklch(0.76 0.17 150 / 0.2)"
                          : "transparent",
                      color: filter === f ? BULL : "oklch(0.55 0.05 240)",
                      border:
                        filter === f
                          ? `1px solid ${BULL}40`
                          : "1px solid transparent",
                    }}
                    data-ocid={`liquidity.${f.toLowerCase()}.tab`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: "oklch(0.17 0.025 240)" }}>
                      {[
                        "Type",
                        "Pair",
                        "Level",
                        "Strength",
                        "Time",
                        "Status",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-3 py-2.5 text-muted-foreground font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e, i) => {
                      const dec = getDecimals(e.pair);
                      const isBsl = e.type === "BSL";
                      const typeColor = isBsl ? BULL : BEAR;
                      const isExpanded = expandedIds.has(e.id);

                      return (
                        <React.Fragment key={e.id}>
                          <motion.tr
                            initial={{ opacity: 0, x: 10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.3, delay: 0.03 * i }}
                            className="border-b border-border/20 hover:bg-white/5 transition-colors"
                            data-ocid={`liquidity.item.${i + 1}`}
                          >
                            <td className="px-3 py-3">
                              <span
                                className="px-2 py-0.5 rounded text-[10px] font-black"
                                style={{
                                  background: `${typeColor}20`,
                                  color: typeColor,
                                }}
                              >
                                {e.type}
                              </span>
                            </td>
                            <td className="px-3 py-3 font-mono font-semibold text-foreground">
                              {e.pair}
                            </td>
                            <td className="px-3 py-3 font-mono">
                              {e.level && !isLoading ? (
                                <div className="flex items-center gap-1">
                                  <span style={{ color: typeColor }}>
                                    {e.pair === "XAU/USD" ? "$" : ""}
                                    {e.level.toFixed(dec)}
                                  </span>
                                  {e.isApproaching && (
                                    <span
                                      className="flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded animate-pulse"
                                      style={{
                                        background: `${GOLD}25`,
                                        color: GOLD,
                                      }}
                                    >
                                      <Zap className="w-2.5 h-2.5" />
                                      Near
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="animate-pulse text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                                style={{
                                  background: `${strengthColor(e.strength)}15`,
                                  color: strengthColor(e.strength),
                                  borderColor: `${strengthColor(e.strength)}30`,
                                }}
                              >
                                {e.strength}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-muted-foreground">
                              {e.time}
                            </td>
                            <td className="px-3 py-3">
                              <span
                                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                style={{
                                  background:
                                    e.status === "Swept"
                                      ? "oklch(0.68 0.14 220 / 0.2)"
                                      : "oklch(0.82 0.16 75 / 0.2)",
                                  color:
                                    e.status === "Swept"
                                      ? "oklch(0.68 0.14 220)"
                                      : "oklch(0.82 0.16 75)",
                                }}
                              >
                                {e.status}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              {e.status === "Swept" && e.sweepEntry ? (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(e.id)}
                                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded border transition-all"
                                  style={{
                                    background: isExpanded
                                      ? `${GOLD}20`
                                      : "transparent",
                                    borderColor: isExpanded
                                      ? `${GOLD}40`
                                      : "oklch(0.30 0.03 240)",
                                    color: isExpanded
                                      ? GOLD
                                      : "oklch(0.50 0.05 240)",
                                  }}
                                  data-ocid={`liquidity.edit_button.${i + 1}`}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="w-3 h-3" />
                                  ) : (
                                    <ChevronDown className="w-3 h-3" />
                                  )}
                                  Setup
                                </button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-6 h-6 opacity-40 hover:opacity-80"
                                  data-ocid={`liquidity.secondary_button.${i + 1}`}
                                >
                                  <Bell className="w-3 h-3" />
                                </Button>
                              )}
                            </td>
                          </motion.tr>

                          <AnimatePresence>
                            {isExpanded &&
                              e.sweepEntry &&
                              e.sweepSL &&
                              e.sweepTP1 &&
                              e.sweepTP2 && (
                                <tr key={`setup-${e.id}`}>
                                  <td
                                    colSpan={7}
                                    className="px-3 pb-3"
                                    style={{
                                      background:
                                        e.sweepDirection === "BUY"
                                          ? "oklch(0.13 0.04 150)"
                                          : "oklch(0.13 0.04 20)",
                                    }}
                                  >
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: "auto" }}
                                      exit={{ opacity: 0, height: 0 }}
                                      transition={{ duration: 0.25 }}
                                      className="rounded-lg border p-3 mt-1"
                                      style={{
                                        borderColor:
                                          e.sweepDirection === "BUY"
                                            ? "oklch(0.76 0.17 150 / 0.3)"
                                            : "oklch(0.65 0.18 20 / 0.3)",
                                      }}
                                    >
                                      <div className="flex items-center gap-2 mb-3">
                                        <span
                                          className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded"
                                          style={{
                                            background:
                                              e.sweepDirection === "BUY"
                                                ? "oklch(0.76 0.17 150 / 0.25)"
                                                : "oklch(0.65 0.18 20 / 0.25)",
                                            color:
                                              e.sweepDirection === "BUY"
                                                ? BULL
                                                : BEAR,
                                          }}
                                        >
                                          {e.sweepDirection === "BUY" ? (
                                            <TrendingUp className="w-3 h-3" />
                                          ) : (
                                            <TrendingDown className="w-3 h-3" />
                                          )}
                                          POST-SWEEP {e.sweepDirection}
                                        </span>
                                        <span
                                          className="text-[10px] font-bold px-2 py-0.5 rounded"
                                          style={{
                                            background: `${GOLD}20`,
                                            color: GOLD,
                                          }}
                                        >
                                          RR 1:2.0
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                          {e.pair} — {e.type} sweep reversal
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-4 gap-2 text-[10px]">
                                        {[
                                          {
                                            label: "Entry",
                                            val: e.sweepEntry,
                                            color: "text-foreground",
                                          },
                                          {
                                            label: "SL",
                                            val: e.sweepSL,
                                            color: BEAR,
                                          },
                                          {
                                            label: "TP1",
                                            val: e.sweepTP1,
                                            color: BULL,
                                          },
                                          {
                                            label: "TP2",
                                            val: e.sweepTP2,
                                            color: BULL,
                                          },
                                        ].map((item) => (
                                          <div
                                            key={item.label}
                                            className="text-center p-2 rounded"
                                            style={{
                                              background:
                                                "oklch(0.17 0.02 240)",
                                            }}
                                          >
                                            <div className="text-muted-foreground mb-0.5">
                                              {item.label}
                                            </div>
                                            <div
                                              className="font-mono font-bold"
                                              style={{
                                                color:
                                                  item.label === "Entry"
                                                    ? undefined
                                                    : item.color,
                                              }}
                                            >
                                              {e.pair === "XAU/USD" ? "$" : ""}
                                              {(item.val as number).toFixed(
                                                dec,
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  </td>
                                </tr>
                              )}
                          </AnimatePresence>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
