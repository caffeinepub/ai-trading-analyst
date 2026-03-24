import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  ArrowUpRight,
  BarChart2,
  Bell,
  Droplets,
  Layers,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useLivePrices } from "../hooks/useLivePrices";
import { useMarketSentiment } from "../hooks/useQueries";

const MINI_SPARKLINE = [
  { x: 0, y: 60 },
  { x: 10, y: 45 },
  { x: 20, y: 55 },
  { x: 30, y: 35 },
  { x: 40, y: 50 },
  { x: 50, y: 30 },
  { x: 60, y: 45 },
  { x: 70, y: 25 },
  { x: 80, y: 40 },
  { x: 90, y: 20 },
  { x: 100, y: 35 },
];

const LIQUIDITY_DATA = [
  {
    type: "BSL",
    pair: "XAU/USD",
    price: "3,068.40",
    time: "5m ago",
    bull: true,
  },
  {
    type: "SSL",
    pair: "EUR/USD",
    price: "1.0812",
    time: "22m ago",
    bull: false,
  },
  { type: "BSL", pair: "GBP/USD", price: "1.2945", time: "1h ago", bull: true },
];

const PATTERN_DATA = [
  {
    name: "Ascending Triangle EUR/USD H4",
    acc: 88,
    color: "oklch(0.76 0.17 150)",
  },
  { name: "H&S GBP/JPY H1", acc: 81, color: "oklch(0.75 0.12 80)" },
  { name: "Bull Flag XAU/USD M15", acc: 84, color: "oklch(0.76 0.17 150)" },
];

const AMD_PHASES = [
  { phase: "Accumulation", status: "Active", color: "oklch(0.76 0.17 150)" },
  { phase: "Manipulation", status: "Alert", color: "oklch(0.75 0.12 80)" },
  { phase: "Distribution", status: "Watch", color: "oklch(0.65 0.18 20)" },
];

function MiniSparkline({ color = "#26D7C6" }: { color?: string }) {
  const points = MINI_SPARKLINE.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPoints = `0,70 ${points} 100,70`;
  return (
    <svg
      viewBox="0 0 100 70"
      className="w-full h-10"
      preserveAspectRatio="none"
      role="img"
      aria-label="AMD cycle trend sparkline"
    >
      <title>AMD Cycle Trend</title>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill="url(#sparkGrad)" />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function SMCAnalysisHub() {
  const { data: sentiment } = useMarketSentiment("XAU");
  const { prices: livePrices } = useLivePrices();
  const goldPrice = livePrices["XAU/USD"];
  const bullish = sentiment ? Number(sentiment.bullishPercentage) : 68;
  const bearish = sentiment ? Number(sentiment.bearishPercentage) : 32;

  return (
    <section id="smc" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8"
        >
          <div>
            <span className="text-xs font-semibold tracking-widest uppercase text-teal block mb-1">
              SMART MONEY ANALYSIS
            </span>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              SMC Analysis Hub
            </h2>
            <p className="text-muted-foreground text-sm mt-1 max-w-lg">
              Real-time Smart Money Concepts detection across forex majors,
              minors and XAU/USD.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-border text-muted-foreground hover:text-foreground self-start sm:self-auto"
            data-ocid="smc.view.button"
          >
            View details
          </Button>
        </motion.div>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
        >
          <div
            className="rounded-xl border border-border/60 p-5 card-glow"
            style={{ background: "oklch(0.19 0.03 240)" }}
            data-ocid="smc.market.card"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Current Market
              </span>
              <Badge
                variant="outline"
                className="border-teal/40 text-teal text-xs"
              >
                LIVE
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: "oklch(0.75 0.12 80 / 0.2)",
                  color: "oklch(0.75 0.12 80)",
                }}
              >
                XAU
              </span>
              <div className="font-display font-bold text-2xl text-foreground">
                XAU/USD
              </div>
            </div>
            <div
              className="font-mono text-xl font-bold mt-1"
              style={{ color: "oklch(0.75 0.12 80)" }}
            >
              {goldPrice ? `$${goldPrice.toFixed(2)}` : "$3,058.00"}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUpRight className="w-3 h-3 text-bull" />
              <span className="text-xs text-bull">
                Gold Spot · Session High $2,361.20
              </span>
            </div>
          </div>

          <div
            className="rounded-xl border border-border/60 p-5 card-glow"
            style={{ background: "oklch(0.19 0.03 240)" }}
            data-ocid="smc.sentiment.card"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Gold Sentiment
              </span>
              <ArrowUpRight className="w-4 h-4 text-bull" />
            </div>
            <div className="font-display font-bold text-2xl text-bull">
              {bullish}%
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Bullish bias — safe haven demand
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-bull">Bull {bullish}%</span>
                <span className="text-bear">Bear {bearish}%</span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "oklch(0.65 0.18 20 / 0.3)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${bullish}%`,
                    background: "oklch(0.76 0.17 150)",
                  }}
                />
              </div>
            </div>
          </div>

          <div
            className="rounded-xl border border-border/60 p-5 card-glow"
            style={{ background: "oklch(0.19 0.03 240)" }}
            data-ocid="smc.modules.card"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Detection Modules
              </span>
              <Layers className="w-4 h-4 text-teal" />
            </div>
            <div className="font-display font-bold text-2xl text-foreground">
              12{" "}
              <span className="text-sm font-normal text-muted-foreground">
                active
              </span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Scanning M5 · M15 · H1 · H4 · D1
            </div>
            <div className="mt-3">
              <Progress value={85} className="h-1.5 [&>div]:bg-primary" />
            </div>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-xl border border-border/60 p-5 card-glow flex flex-col gap-3"
            style={{ background: "oklch(0.19 0.03 240)" }}
            data-ocid="smc.smc_card.card"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "oklch(0.78 0.12 190 / 0.15)" }}
            >
              <TrendingUp className="w-5 h-5 text-teal" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-sm">
                Smart Money Concepts
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Order Blocks, Fair Value Gaps, BOS/CHOCH on forex &amp; gold.
              </p>
            </div>
            <div className="flex flex-col gap-1 mt-1">
              {[
                "Order Blocks (OB)",
                "Fair Value Gaps (FVG)",
                "BOS / CHOCH",
              ].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal inline-block" />
                  <span className="text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/40">
              <span className="text-xs text-muted-foreground">Show Alerts</span>
              <Switch data-ocid="smc.alerts.switch" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-xl border border-border/60 p-5 card-glow flex flex-col gap-3"
            style={{ background: "oklch(0.19 0.03 240)" }}
            data-ocid="smc.amd_card.card"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "oklch(0.73 0.14 220 / 0.15)" }}
            >
              <RotateCcw
                className="w-5 h-5"
                style={{ color: "oklch(0.73 0.14 220)" }}
              />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-sm">
                AMD Cycles
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Accumulation, Manipulation &amp; Distribution on M15, H1, H4,
                D1.
              </p>
            </div>
            <div className="mt-1">
              <MiniSparkline color="oklch(0.73 0.14 220)" />
            </div>
            <div className="flex flex-col gap-1">
              {AMD_PHASES.map((p) => (
                <div
                  key={p.phase}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-muted-foreground">{p.phase}</span>
                  <Badge
                    variant="outline"
                    className="text-xs px-1.5 py-0"
                    style={{
                      borderColor: `${p.color.slice(0, -1)} / 0.5)`,
                      color: p.color,
                    }}
                  >
                    {p.status}
                  </Badge>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-xl border border-border/60 p-5 card-glow flex flex-col gap-3"
            style={{ background: "oklch(0.19 0.03 240)" }}
            data-ocid="smc.patterns_card.card"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "oklch(0.76 0.17 150 / 0.15)" }}
            >
              <BarChart2 className="w-5 h-5 text-bull" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-sm">
                Chart Patterns
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                AI-detected on M15, H1, H4, D1 across all forex pairs.
              </p>
            </div>
            <div className="flex flex-col gap-2 mt-1">
              {PATTERN_DATA.map((p) => (
                <div key={p.name}>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-muted-foreground truncate pr-1">
                      {p.name}
                    </span>
                    <span className="shrink-0" style={{ color: p.color }}>
                      {p.acc}%
                    </span>
                  </div>
                  <div
                    className="h-1 rounded-full"
                    style={{ background: "oklch(0.27 0.04 240)" }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${p.acc}%`, background: p.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="rounded-xl border border-border/60 p-5 card-glow flex flex-col gap-3"
            style={{ background: "oklch(0.19 0.03 240)" }}
            data-ocid="smc.liquidity_card.card"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "oklch(0.78 0.12 190 / 0.15)" }}
            >
              <Droplets className="w-5 h-5 text-teal" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-sm">
                Liquidity Sweeps
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                BSL/SSL zones on XAU/USD, EUR/USD &amp; GBP/USD.
              </p>
            </div>
            <div className="flex flex-col gap-2 mt-1">
              {LIQUIDITY_DATA.map((s) => (
                <div
                  key={`${s.type}-${s.pair}`}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded"
                      style={{
                        background: s.bull
                          ? "oklch(0.76 0.17 150 / 0.15)"
                          : "oklch(0.65 0.18 20 / 0.15)",
                        color: s.bull
                          ? "oklch(0.76 0.17 150)"
                          : "oklch(0.65 0.18 20)",
                      }}
                    >
                      {s.type}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        {s.pair}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {s.price}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {s.time}
                  </span>
                </div>
              ))}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-auto border-border text-xs text-muted-foreground hover:text-foreground"
              data-ocid="smc.liquidity.button"
            >
              <Bell className="w-3 h-3 mr-1" /> Set Alert
            </Button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
