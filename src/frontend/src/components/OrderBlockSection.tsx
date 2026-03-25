import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bell, BellOff } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAlertNotifications } from "../hooks/useAlertNotifications";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useLivePrices } from "../hooks/useLivePrices";

type OBType = "Bullish OB" | "Bearish OB";
type OBStatus = "Unmitigated" | "Mitigated";

type OrderBlock = {
  id: number;
  pair: string;
  timeframe: string;
  type: OBType;
  status: OBStatus;
  highOffPct: number;
  lowOffPct: number;
  tpOffPct: number;
  slOffPct: number;
  strength: number;
  tested: number;
};

const BASE_ORDER_BLOCKS: OrderBlock[] = [
  {
    id: 1,
    pair: "XAU/USD",
    timeframe: "H1",
    type: "Bullish OB",
    status: "Unmitigated",
    highOffPct: -0.002,
    lowOffPct: -0.005,
    tpOffPct: 0.008,
    slOffPct: -0.007,
    strength: 91,
    tested: 0,
  },
  {
    id: 2,
    pair: "XAU/USD",
    timeframe: "H4",
    type: "Bearish OB",
    status: "Unmitigated",
    highOffPct: 0.012,
    lowOffPct: 0.008,
    tpOffPct: -0.015,
    slOffPct: 0.015,
    strength: 87,
    tested: 1,
  },
  {
    id: 3,
    pair: "EUR/USD",
    timeframe: "H1",
    type: "Bullish OB",
    status: "Unmitigated",
    highOffPct: -0.0015,
    lowOffPct: -0.004,
    tpOffPct: 0.007,
    slOffPct: -0.006,
    strength: 84,
    tested: 2,
  },
  {
    id: 4,
    pair: "GBP/USD",
    timeframe: "M15",
    type: "Bearish OB",
    status: "Mitigated",
    highOffPct: 0.003,
    lowOffPct: 0.001,
    tpOffPct: -0.008,
    slOffPct: 0.005,
    strength: 58,
    tested: 3,
  },
  {
    id: 5,
    pair: "USD/JPY",
    timeframe: "H4",
    type: "Bullish OB",
    status: "Unmitigated",
    highOffPct: -0.003,
    lowOffPct: -0.007,
    tpOffPct: 0.012,
    slOffPct: -0.009,
    strength: 79,
    tested: 0,
  },
  {
    id: 6,
    pair: "GBP/JPY",
    timeframe: "H1",
    type: "Bearish OB",
    status: "Unmitigated",
    highOffPct: 0.006,
    lowOffPct: 0.003,
    tpOffPct: -0.012,
    slOffPct: 0.009,
    strength: 76,
    tested: 1,
  },
];

type OBFilter = "All OBs" | "Bullish" | "Bearish" | "Unmitigated";
const FILTERS: OBFilter[] = ["All OBs", "Bullish", "Bearish", "Unmitigated"];

const BULL = "oklch(0.76 0.17 150)";
const BEAR = "oklch(0.65 0.18 20)";

export default function OrderBlockSection() {
  const [filter, setFilter] = useState<OBFilter>("All OBs");
  const { prices, isLoading } = useLivePrices();
  const { countdown, lastUpdated, refreshKey } = useAutoRefresh(30);
  const { alertsEnabled, toggleAlerts, sendAlert } = useAlertNotifications();

  const orderBlocks = useMemo(() => {
    return BASE_ORDER_BLOCKS.map((ob) => {
      const noise = Math.sin(refreshKey * 2.9 + ob.id * 1.7) * 0.5;
      return {
        ...ob,
        strength: Math.min(99, Math.max(50, Math.round(ob.strength + noise))),
      };
    });
  }, [refreshKey]);

  const prevStrengthRef = useRef(orderBlocks.map((o) => o.strength));
  useEffect(() => {
    orderBlocks.forEach((ob, i) => {
      if (
        Math.abs(prevStrengthRef.current[i] - ob.strength) >= 1 &&
        ob.status === "Unmitigated"
      ) {
        const base = prices[ob.pair] ?? 0;
        const obHigh = base > 0 ? (base + base * ob.highOffPct).toFixed(4) : "";
        sendAlert(
          `Order Block – ${ob.pair}`,
          `${ob.pair} ${ob.type} formed at ${obHigh}`,
        );
      }
      prevStrengthRef.current[i] = ob.strength;
    });
  });

  const getPrice = (pair: string, offPct: number) => {
    const base = prices[pair] ?? 0;
    return base > 0 ? base + base * offPct : null;
  };

  const getDecimals = (pair: string) => {
    if (pair === "XAU/USD") return 2;
    if (pair.includes("JPY")) return 2;
    return 4;
  };

  const filtered = orderBlocks.filter((ob) => {
    if (filter === "All OBs") return true;
    if (filter === "Bullish") return ob.type === "Bullish OB";
    if (filter === "Bearish") return ob.type === "Bearish OB";
    if (filter === "Unmitigated") return ob.status === "Unmitigated";
    return true;
  });

  const formattedTime = lastUpdated.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const ACCENT = "oklch(0.78 0.12 190)";

  return (
    <section
      id="order-block"
      className="py-16"
      style={{ background: "oklch(0.14 0.022 240)" }}
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
                  style={{ background: ACCENT }}
                />
                <span
                  className="text-xs font-bold tracking-widest uppercase"
                  style={{ color: ACCENT }}
                >
                  SMC
                </span>
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground">
                Order Block Analysis
              </h2>
              <p className="text-muted-foreground mt-1 text-sm max-w-lg">
                Institutional order blocks across major pairs and timeframes
                with entry, TP, and SL levels anchored to live prices.
              </p>
              {/* Refresh status row */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                  style={{
                    background: "oklch(0.78 0.12 190 / 0.10)",
                    borderColor: "oklch(0.78 0.12 190 / 0.3)",
                    color: ACCENT,
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
                  data-ocid="ob.toggle"
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
              {FILTERS.map((f) => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setFilter(f)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all"
                  style={{
                    background:
                      filter === f
                        ? "oklch(0.78 0.12 190 / 0.2)"
                        : "transparent",
                    color: filter === f ? ACCENT : "oklch(0.55 0.05 240)",
                    border:
                      filter === f
                        ? "1px solid oklch(0.78 0.12 190 / 0.4)"
                        : "1px solid transparent",
                  }}
                  data-ocid={`ob.${f.toLowerCase().replace(" ", "_")}.tab`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((ob, i) => {
              const isBull = ob.type === "Bullish OB";
              const typeColor = isBull ? BULL : BEAR;
              const isUnmitigated = ob.status === "Unmitigated";
              const dec = getDecimals(ob.pair);
              const isGold = ob.pair === "XAU/USD";
              const fmt = (v: number | null) =>
                v ? `${isGold ? "$" : ""}${v.toFixed(dec)}` : "\u2014";

              const obHigh = getPrice(ob.pair, ob.highOffPct);
              const obLow = getPrice(ob.pair, ob.lowOffPct);
              const tp = getPrice(ob.pair, ob.tpOffPct);
              const sl = getPrice(ob.pair, ob.slOffPct);
              const currentPrice = prices[ob.pair];
              const distPips =
                currentPrice && obHigh
                  ? Math.abs(currentPrice - obHigh) *
                    (ob.pair.includes("JPY")
                      ? 100
                      : ob.pair === "XAU/USD"
                        ? 1
                        : 10000)
                  : null;

              return (
                <motion.div
                  key={ob.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.08 * i }}
                  className="rounded-xl border overflow-hidden transition-all"
                  style={{
                    background: "oklch(0.19 0.03 240)",
                    borderColor: isUnmitigated
                      ? `${typeColor}50`
                      : "oklch(0.25 0.02 240)",
                    boxShadow: isUnmitigated
                      ? `0 0 20px ${typeColor}15`
                      : "none",
                  }}
                  data-ocid={`ob.item.${i + 1}`}
                >
                  <div
                    className="px-4 py-3 flex items-center justify-between"
                    style={{
                      background: isUnmitigated
                        ? `${typeColor}12`
                        : "oklch(0.17 0.025 240)",
                      borderBottom: `1px solid ${isUnmitigated ? `${typeColor}30` : "oklch(0.25 0.02 240)"}`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground text-sm">
                        {ob.pair}
                      </span>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: "oklch(0.25 0.03 240)",
                          color: ACCENT,
                        }}
                      >
                        {ob.timeframe}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        className="text-[10px] font-black"
                        style={{
                          background: `${typeColor}20`,
                          color: typeColor,
                          border: `1px solid ${typeColor}40`,
                        }}
                      >
                        {ob.type}
                      </Badge>
                      <Badge
                        className="text-[10px] font-semibold"
                        style={{
                          background: isUnmitigated
                            ? "oklch(0.82 0.16 75 / 0.15)"
                            : "oklch(0.25 0.02 240)",
                          color: isUnmitigated
                            ? "oklch(0.82 0.16 75)"
                            : "oklch(0.50 0.04 240)",
                          border: `1px solid ${isUnmitigated ? "oklch(0.82 0.16 75 / 0.3)" : "transparent"}`,
                        }}
                      >
                        {ob.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        OB Zone
                      </span>
                      <span
                        className="text-xs font-mono"
                        style={{ color: typeColor }}
                      >
                        {isLoading ? (
                          <span className="animate-pulse">&mdash;</span>
                        ) : (
                          `${fmt(obLow)} \u2013 ${fmt(obHigh)}`
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Entry", value: fmt(obHigh), color: ACCENT },
                        { label: "TP", value: fmt(tp), color: BULL },
                        { label: "SL", value: fmt(sl), color: BEAR },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded p-2 text-center"
                          style={{ background: "oklch(0.16 0.022 240)" }}
                        >
                          <div className="text-[9px] text-muted-foreground mb-0.5">
                            {item.label}
                          </div>
                          <div
                            className="text-[11px] font-mono font-bold"
                            style={{ color: item.color }}
                          >
                            {isLoading ? "\u2014" : item.value}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Dist:{" "}
                        <span className="font-mono text-foreground">
                          {distPips ? distPips.toFixed(1) : "\u2014"}{" "}
                          {ob.pair === "XAU/USD" ? "pts" : "pips"}
                        </span>
                      </span>
                      <span className="text-muted-foreground">
                        Tested:{" "}
                        <span className="font-mono text-foreground">
                          {ob.tested}x
                        </span>
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">
                          Strength
                        </span>
                        <span
                          className="text-xs font-bold"
                          style={{ color: typeColor }}
                        >
                          {ob.strength}%
                        </span>
                      </div>
                      <Progress value={ob.strength} className="h-1.5" />
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
