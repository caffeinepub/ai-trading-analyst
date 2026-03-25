import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bell, BellOff } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";
import { useAlertNotifications } from "../hooks/useAlertNotifications";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useLivePrices } from "../hooks/useLivePrices";

type FVGType = "Bullish FVG" | "Bearish FVG";
type FVGStatus = "Open" | "Partially Filled" | "Filled";

type FVG = {
  id: number;
  pair: string;
  timeframe: string;
  type: FVGType;
  topOffPct: number;
  bottomOffPct: number;
  fillPct: number;
  status: FVGStatus;
  age: string;
};

const BASE_FVG_DATA: FVG[] = [
  {
    id: 1,
    pair: "XAU/USD",
    timeframe: "H1",
    type: "Bullish FVG",
    topOffPct: -0.002,
    bottomOffPct: -0.006,
    fillPct: 0,
    status: "Open",
    age: "2h ago",
  },
  {
    id: 2,
    pair: "XAU/USD",
    timeframe: "H4",
    type: "Bearish FVG",
    topOffPct: 0.009,
    bottomOffPct: 0.005,
    fillPct: 45,
    status: "Partially Filled",
    age: "5h ago",
  },
  {
    id: 3,
    pair: "EUR/USD",
    timeframe: "M15",
    type: "Bullish FVG",
    topOffPct: -0.0012,
    bottomOffPct: -0.003,
    fillPct: 100,
    status: "Filled",
    age: "1h ago",
  },
  {
    id: 4,
    pair: "GBP/USD",
    timeframe: "H1",
    type: "Bearish FVG",
    topOffPct: 0.004,
    bottomOffPct: 0.0015,
    fillPct: 20,
    status: "Partially Filled",
    age: "3h ago",
  },
  {
    id: 5,
    pair: "USD/JPY",
    timeframe: "H4",
    type: "Bullish FVG",
    topOffPct: -0.003,
    bottomOffPct: -0.007,
    fillPct: 0,
    status: "Open",
    age: "4h ago",
  },
  {
    id: 6,
    pair: "GBP/JPY",
    timeframe: "H1",
    type: "Bearish FVG",
    topOffPct: 0.005,
    bottomOffPct: 0.002,
    fillPct: 75,
    status: "Partially Filled",
    age: "6h ago",
  },
  {
    id: 7,
    pair: "EUR/JPY",
    timeframe: "H1",
    type: "Bullish FVG",
    topOffPct: -0.0025,
    bottomOffPct: -0.006,
    fillPct: 0,
    status: "Open",
    age: "30m ago",
  },
  {
    id: 8,
    pair: "EUR/USD",
    timeframe: "H4",
    type: "Bearish FVG",
    topOffPct: 0.007,
    bottomOffPct: 0.004,
    fillPct: 10,
    status: "Open",
    age: "7h ago",
  },
];

const BULL = "oklch(0.76 0.17 150)";
const BEAR = "oklch(0.65 0.18 20)";

const STATUS_COLOR: Record<FVGStatus, { bg: string; text: string }> = {
  Open: { bg: "oklch(0.82 0.16 75 / 0.15)", text: "oklch(0.82 0.16 75)" },
  "Partially Filled": {
    bg: "oklch(0.68 0.14 220 / 0.15)",
    text: "oklch(0.68 0.14 220)",
  },
  Filled: { bg: "oklch(0.30 0.03 240)", text: "oklch(0.50 0.04 240)" },
};

export default function FVGSection() {
  const { prices, isLoading } = useLivePrices();
  const { countdown, lastUpdated, refreshKey } = useAutoRefresh(30);
  const { alertsEnabled, toggleAlerts, sendAlert } = useAlertNotifications();

  const fvgData = useMemo(() => {
    return BASE_FVG_DATA.map((fvg) => {
      const noise = Math.sin(refreshKey * 3.3 + fvg.id * 1.9) * 1.5;
      const newFill = Math.min(
        100,
        Math.max(0, Math.round(fvg.fillPct + noise)),
      );
      const newStatus: FVGStatus =
        newFill >= 100 ? "Filled" : newFill > 0 ? "Partially Filled" : "Open";
      return { ...fvg, fillPct: newFill, status: newStatus };
    });
  }, [refreshKey]);

  const prevStatusRef = useRef(fvgData.map((f) => f.status));
  useEffect(() => {
    fvgData.forEach((fvg, i) => {
      if (prevStatusRef.current[i] !== fvg.status) {
        const base = prices[fvg.pair] ?? 0;
        const top = base > 0 ? (base + base * fvg.topOffPct).toFixed(4) : "";
        const bottom =
          base > 0 ? (base + base * fvg.bottomOffPct).toFixed(4) : "";
        sendAlert(
          `FVG Detected \u2013 ${fvg.pair}`,
          `${fvg.pair} ${fvg.type} ${top}\u2013${bottom}`,
        );
        prevStatusRef.current[i] = fvg.status;
      }
    });
  });

  const getDecimals = (pair: string) => {
    if (pair === "XAU/USD") return 2;
    if (pair.includes("JPY")) return 2;
    return 4;
  };

  const getLevel = (pair: string, offPct: number) => {
    const base = prices[pair] ?? 0;
    return base > 0 ? base + base * offPct : null;
  };

  const openCount = fvgData.filter((f) => f.status === "Open").length;
  const partialCount = fvgData.filter(
    (f) => f.status === "Partially Filled",
  ).length;
  const avgFill = Math.round(
    fvgData.reduce((acc, f) => acc + f.fillPct, 0) / fvgData.length,
  );

  const formattedTime = lastUpdated.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <section
      id="fvg"
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-1.5 h-6 rounded-full"
                  style={{ background: "oklch(0.82 0.16 75)" }}
                />
                <span
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: "oklch(0.82 0.16 75)" }}
                >
                  Imbalance Detection
                </span>
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground">
                Fair Value Gaps (FVG)
              </h2>
              <p className="text-muted-foreground mt-1 text-sm max-w-lg">
                Price imbalances where smart money is likely to return to fill.
                Track open, partially filled, and closed FVGs.
              </p>
              {/* Refresh status row */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                  style={{
                    background: "oklch(0.82 0.16 75 / 0.10)",
                    borderColor: "oklch(0.82 0.16 75 / 0.3)",
                    color: "oklch(0.82 0.16 75)",
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
                  data-ocid="fvg.toggle"
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

            {/* Stats */}
            <div className="flex items-center gap-3">
              {[
                {
                  label: "Open FVGs",
                  value: openCount,
                  color: "oklch(0.82 0.16 75)",
                },
                {
                  label: "Partial",
                  value: partialCount,
                  color: "oklch(0.68 0.14 220)",
                },
                {
                  label: "Avg Fill %",
                  value: `${avgFill}%`,
                  color: "oklch(0.78 0.12 190)",
                },
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

          {/* FVG Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {fvgData.map((fvg, i) => {
              const isBull = fvg.type === "Bullish FVG";
              const typeColor = isBull ? BULL : BEAR;
              const dec = getDecimals(fvg.pair);
              const isGold = fvg.pair === "XAU/USD";
              const top = getLevel(fvg.pair, fvg.topOffPct);
              const bottom = getLevel(fvg.pair, fvg.bottomOffPct);
              const currentPrice = prices[fvg.pair];
              const distPips =
                currentPrice && top
                  ? Math.abs(currentPrice - top) *
                    (fvg.pair.includes("JPY")
                      ? 100
                      : fvg.pair === "XAU/USD"
                        ? 1
                        : 10000)
                  : null;
              const statusStyle = STATUS_COLOR[fvg.status];
              const isFilled = fvg.status === "Filled";

              return (
                <motion.div
                  key={fvg.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.06 * i }}
                  className="rounded-xl border overflow-hidden"
                  style={{
                    background: "oklch(0.19 0.03 240)",
                    borderColor: !isFilled
                      ? `${typeColor}45`
                      : "oklch(0.25 0.02 240)",
                    opacity: isFilled ? 0.65 : 1,
                  }}
                  data-ocid={`fvg.item.${i + 1}`}
                >
                  {/* FVG zone visual */}
                  <div
                    className="h-2 w-full"
                    style={{
                      background: `linear-gradient(90deg, ${typeColor}60 ${fvg.fillPct}%, ${typeColor}20 ${fvg.fillPct}%)`,
                    }}
                  />

                  <div className="p-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-mono font-bold text-foreground text-sm">
                          {fvg.pair}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {fvg.timeframe} · {fvg.age}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          className="text-[10px] font-black"
                          style={{
                            background: `${typeColor}20`,
                            color: typeColor,
                            border: `1px solid ${typeColor}40`,
                          }}
                        >
                          {fvg.type}
                        </Badge>
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                          style={{
                            background: statusStyle.bg,
                            color: statusStyle.text,
                          }}
                        >
                          {fvg.status}
                        </span>
                      </div>
                    </div>

                    {/* Zone prices */}
                    <div
                      className="rounded-lg p-2 mb-3"
                      style={{ background: "oklch(0.16 0.022 240)" }}
                    >
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-muted-foreground">Top</span>
                        <span
                          className="font-mono"
                          style={{ color: typeColor }}
                        >
                          {top && !isLoading
                            ? `${isGold ? "$" : ""}${top.toFixed(dec)}`
                            : "\u2014"}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Bottom</span>
                        <span
                          className="font-mono"
                          style={{ color: typeColor }}
                        >
                          {bottom && !isLoading
                            ? `${isGold ? "$" : ""}${bottom.toFixed(dec)}`
                            : "\u2014"}
                        </span>
                      </div>
                    </div>

                    {/* Distance */}
                    {distPips && !isLoading && (
                      <div className="flex justify-between text-xs mb-3">
                        <span className="text-muted-foreground">Distance</span>
                        <span className="font-mono text-foreground">
                          {distPips.toFixed(1)}{" "}
                          {fvg.pair === "XAU/USD" ? "pts" : "pips"}
                        </span>
                      </div>
                    )}

                    {/* Fill progress */}
                    <div>
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="text-muted-foreground">Fill</span>
                        <span
                          className="font-bold"
                          style={{ color: typeColor }}
                        >
                          {fvg.fillPct}%
                        </span>
                      </div>
                      <Progress value={fvg.fillPct} className="h-1.5" />
                    </div>
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
