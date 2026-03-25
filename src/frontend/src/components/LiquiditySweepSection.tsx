import { Button } from "@/components/ui/button";
import { Bell, BellOff, Filter } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAlertNotifications } from "../hooks/useAlertNotifications";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useLivePrices } from "../hooks/useLivePrices";

type SweepEvent = {
  id: number;
  type: "BSL" | "SSL";
  pair: string;
  offsetPct: number;
  time: string;
  status: "Pending" | "Swept";
  pipDist: number;
};

const SWEEP_EVENTS: SweepEvent[] = [
  {
    id: 1,
    type: "BSL",
    pair: "XAU/USD",
    offsetPct: 0.0045,
    time: "2h ago",
    status: "Pending",
    pipDist: 14,
  },
  {
    id: 2,
    type: "SSL",
    pair: "XAU/USD",
    offsetPct: -0.0038,
    time: "4h ago",
    status: "Swept",
    pipDist: 12,
  },
  {
    id: 3,
    type: "BSL",
    pair: "EUR/USD",
    offsetPct: 0.0025,
    time: "1h ago",
    status: "Pending",
    pipDist: 28,
  },
  {
    id: 4,
    type: "SSL",
    pair: "EUR/USD",
    offsetPct: -0.0022,
    time: "3h ago",
    status: "Pending",
    pipDist: 22,
  },
  {
    id: 5,
    type: "BSL",
    pair: "GBP/USD",
    offsetPct: 0.003,
    time: "30m ago",
    status: "Swept",
    pipDist: 31,
  },
  {
    id: 6,
    type: "SSL",
    pair: "GBP/USD",
    offsetPct: -0.0035,
    time: "5h ago",
    status: "Pending",
    pipDist: 36,
  },
  {
    id: 7,
    type: "BSL",
    pair: "USD/JPY",
    offsetPct: 0.002,
    time: "6h ago",
    status: "Swept",
    pipDist: 30,
  },
  {
    id: 8,
    type: "SSL",
    pair: "USD/JPY",
    offsetPct: -0.0028,
    time: "2h ago",
    status: "Pending",
    pipDist: 42,
  },
  {
    id: 9,
    type: "BSL",
    pair: "GBP/JPY",
    offsetPct: 0.0032,
    time: "1h ago",
    status: "Pending",
    pipDist: 62,
  },
  {
    id: 10,
    type: "SSL",
    pair: "EUR/JPY",
    offsetPct: -0.0027,
    time: "3h ago",
    status: "Swept",
    pipDist: 45,
  },
];

type SweepFilter = "All" | "BSL" | "SSL" | "Swept" | "Pending";
const FILTERS: SweepFilter[] = ["All", "BSL", "SSL", "Swept", "Pending"];

const BULL = "oklch(0.76 0.17 150)";
const BEAR = "oklch(0.65 0.18 20)";

export default function LiquiditySweepSection() {
  const [filter, setFilter] = useState<SweepFilter>("All");
  const { prices, isLoading } = useLivePrices();
  const { countdown, lastUpdated, refreshKey } = useAutoRefresh(30);
  const { alertsEnabled, toggleAlerts, sendAlert } = useAlertNotifications();

  const events = useMemo(() => {
    return SWEEP_EVENTS.map((e) => {
      const noise = Math.sin(refreshKey * 4.1 + e.id * 2.3) * 0.00005;
      return { ...e, offsetPct: e.offsetPct + noise };
    });
  }, [refreshKey]);

  const prevStatusRef = useRef(events.map((e) => e.status));
  useEffect(() => {
    events.forEach((e, i) => {
      const prev = prevStatusRef.current[i];
      if (prev !== e.status && e.status === "Swept") {
        const base = prices[e.pair] ?? 0;
        const level = base > 0 ? (base + base * e.offsetPct).toFixed(2) : "";
        sendAlert(
          `Liquidity Sweep – ${e.pair}`,
          `${e.pair} ${e.type === "BSL" ? "Bullish" : "Bearish"} sweep at ${level}`,
        );
      }
      prevStatusRef.current[i] = e.status;
    });
  });

  const getLevel = (pair: string, offsetPct: number) => {
    const base = prices[pair] ?? 0;
    return base > 0 ? base + base * offsetPct : null;
  };

  const getDecimals = (pair: string) => {
    if (pair === "XAU/USD") return 2;
    if (pair.includes("JPY")) return 2;
    return 4;
  };

  const filtered = events.filter((e) => {
    if (filter === "All") return true;
    if (filter === "BSL") return e.type === "BSL";
    if (filter === "SSL") return e.type === "SSL";
    if (filter === "Swept") return e.status === "Swept";
    if (filter === "Pending") return e.status === "Pending";
    return true;
  });

  const bslCount = events.filter((e) => e.type === "BSL").length;
  const sslCount = events.filter((e) => e.type === "SSL").length;
  const sweptCount = events.filter((e) => e.status === "Swept").length;

  const formattedTime = lastUpdated.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

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
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
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
                Real-time Buy-Side (BSL) and Sell-Side (SSL) liquidity levels
                with sweep detection across all major pairs.
              </p>
              {/* Refresh status row */}
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
            <div className="flex items-center gap-3">
              {[
                { label: "BSL Levels", value: bslCount, color: BULL },
                { label: "SSL Levels", value: sslCount, color: BEAR },
                {
                  label: "Swept Today",
                  value: sweptCount,
                  color: "oklch(0.68 0.14 220)",
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Depth chart */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-xl border border-border/60 p-4"
              style={{ background: "oklch(0.19 0.03 240)" }}
            >
              <h3 className="text-sm font-semibold text-foreground mb-4">
                Liquidity Depth (XAU/USD)
              </h3>
              <div className="relative w-full" style={{ height: 240 }}>
                <svg
                  width="100%"
                  height="240"
                  viewBox="0 0 200 240"
                  role="img"
                  aria-label="Liquidity depth chart showing BSL and SSL levels for XAU/USD"
                >
                  <title>Liquidity Depth Chart — XAU/USD</title>
                  <line
                    x1="0"
                    y1="120"
                    x2="200"
                    y2="120"
                    stroke="oklch(0.55 0.06 240)"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <text x="5" y="116" fontSize="8" fill="oklch(0.55 0.06 240)">
                    Current Price
                  </text>
                  {[0.0045, 0.0028, 0.007].map((pct, i) => {
                    const y = 120 - (pct / 0.01) * 80 - i * 12;
                    const lp = prices["XAU/USD"];
                    const lvl = lp ? (lp + lp * pct).toFixed(2) : "";
                    return (
                      <g key={`bsl-${pct}`}>
                        <line
                          x1="20"
                          y1={y}
                          x2="180"
                          y2={y}
                          stroke={BULL}
                          strokeWidth="1.5"
                          opacity={0.7}
                        />
                        <circle
                          cx="15"
                          cy={y}
                          r="3"
                          fill={BULL}
                          opacity={0.9}
                        />
                        <text
                          x="185"
                          y={y + 3}
                          fontSize="7"
                          fill={BULL}
                          textAnchor="start"
                        >
                          {lvl}
                        </text>
                        <text
                          x="20"
                          y={y - 3}
                          fontSize="7"
                          fill={BULL}
                          opacity={0.6}
                        >
                          BSL
                        </text>
                      </g>
                    );
                  })}
                  {[0.0038, 0.0022, 0.006].map((pct, i) => {
                    const y = 120 + (pct / 0.01) * 80 + i * 12;
                    const lp = prices["XAU/USD"];
                    const lvl = lp ? (lp - lp * pct).toFixed(2) : "";
                    return (
                      <g key={`ssl-${pct}`}>
                        <line
                          x1="20"
                          y1={y}
                          x2="180"
                          y2={y}
                          stroke={BEAR}
                          strokeWidth="1.5"
                          opacity={0.7}
                        />
                        <circle
                          cx="15"
                          cy={y}
                          r="3"
                          fill={BEAR}
                          opacity={0.9}
                        />
                        <text
                          x="185"
                          y={y + 3}
                          fontSize="7"
                          fill={BEAR}
                          textAnchor="start"
                        >
                          {lvl}
                        </text>
                        <text
                          x="20"
                          y={y + 10}
                          fontSize="7"
                          fill={BEAR}
                          opacity={0.6}
                        >
                          SSL
                        </text>
                      </g>
                    );
                  })}
                  <circle cx="100" cy="120" r="4" fill="oklch(0.78 0.12 190)" />
                  <text
                    x="110"
                    y="124"
                    fontSize="8"
                    fill="oklch(0.78 0.12 190)"
                  >
                    {prices["XAU/USD"]
                      ? `$${prices["XAU/USD"].toFixed(2)}`
                      : "\u2014"}
                  </text>
                </svg>
              </div>
            </motion.div>

            {/* Events table */}
            <div
              className="lg:col-span-2 rounded-xl border border-border/60 overflow-hidden"
              style={{ background: "oklch(0.19 0.03 240)" }}
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
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
                        "Distance",
                        "Time",
                        "Status",
                        "Alert",
                      ].map((h) => (
                        <th
                          key={h}
                          className="text-left px-4 py-2.5 text-muted-foreground font-semibold"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e, i) => {
                      const level = getLevel(e.pair, e.offsetPct);
                      const dec = getDecimals(e.pair);
                      const isGold = e.pair === "XAU/USD";
                      const isBsl = e.type === "BSL";
                      const typeColor = isBsl ? BULL : BEAR;
                      return (
                        <motion.tr
                          key={e.id}
                          initial={{ opacity: 0, x: 10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: 0.04 * i }}
                          className="border-b border-border/20 hover:bg-white/5 transition-colors"
                          data-ocid={`liquidity.item.${i + 1}`}
                        >
                          <td className="px-4 py-3">
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
                          <td className="px-4 py-3 font-mono font-semibold text-foreground">
                            {e.pair}
                          </td>
                          <td className="px-4 py-3 font-mono">
                            {level && !isLoading ? (
                              <span style={{ color: typeColor }}>
                                {isGold ? "$" : ""}
                                {level.toFixed(dec)}
                              </span>
                            ) : (
                              <span className="animate-pulse text-muted-foreground">
                                &mdash;
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">
                            {e.pipDist} pips
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {e.time}
                          </td>
                          <td className="px-4 py-3">
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
                          <td className="px-4 py-3">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-6 h-6 opacity-50 hover:opacity-100"
                              data-ocid={`liquidity.alert.button.${i + 1}`}
                            >
                              <Bell className="w-3 h-3" />
                            </Button>
                          </td>
                        </motion.tr>
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
