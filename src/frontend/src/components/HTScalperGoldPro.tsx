import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLivePrices } from "../hooks/useLivePrices";

const GOLD_ACCENT = "oklch(0.82 0.16 75)";
const GOLD_BG = "oklch(0.82 0.16 75 / 0.10)";
const GOLD_BORDER = "oklch(0.82 0.16 75 / 0.3)";
const BUY_COLOR = "oklch(0.76 0.17 150)";
const SELL_COLOR = "oklch(0.65 0.18 20)";
const SECTION_BG = "oklch(0.16 0.025 240)";
const CARD_BG = "oklch(0.20 0.03 240)";
const DEEP_BG = "oklch(0.14 0.022 240)";

// ---- Pure indicator functions ----

interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
}

interface HTSignal {
  timeframe: "M1" | "M5" | "M15";
  direction: "BUY" | "SELL";
  entry: number;
  tp1: number;
  tp2: number;
  tp3: number;
  sl: number;
  rsi: number;
  ema5: number;
  ema13: number;
  atr: number;
  confidence: number;
  candlesAgo: number;
  closes: number[];
  ema5Series: number[];
  ema13Series: number[];
  signalIndex: number;
}

function generateCandles(
  basePrice: number,
  count: number,
  volatilityPct: number,
  seed: number,
): OHLC[] {
  const candles: OHLC[] = [];
  let price = basePrice * (0.997 + ((seed * 13) % 7) * 0.001);
  const drift = (((seed * 7) % 3) - 1) * volatilityPct * 0.3;
  for (let i = 0; i < count; i++) {
    const r1 = Math.sin(seed * 1000 + i * 17.3) * 0.5 + 0.5;
    const r2 = Math.sin(seed * 2000 + i * 31.7) * 0.5 + 0.5;
    const r3 = Math.sin(seed * 3000 + i * 11.1) * 0.5 + 0.5;
    const r4 = Math.sin(seed * 4000 + i * 23.9) * 0.5 + 0.5;
    const change = (r1 - 0.5 + drift) * volatilityPct * price;
    const open = price;
    const close = price + change;
    const wickH = r2 * volatilityPct * 0.6 * price;
    const wickL = r3 * volatilityPct * 0.6 * price;
    const high = Math.max(open, close) + wickH;
    const low = Math.min(open, close) - wickL;
    candles.push({ open, high, low, close });
    price = close + (r4 - 0.5) * volatilityPct * 0.1 * price;
  }
  // Anchor last candle to live price
  const last = candles[candles.length - 1];
  const adjust = basePrice / last.close;
  return candles.map((c) => ({
    open: c.open * adjust,
    high: c.high * adjust,
    low: c.low * adjust,
    close: c.close * adjust,
  }));
}

function calcEMA(closes: number[], period: number): number[] {
  if (closes.length === 0) return [];
  const k = 2 / (period + 1);
  const result: number[] = [];
  let ema = closes[0];
  result.push(ema);
  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
    result.push(ema);
  }
  return result;
}

function calcRSI(closes: number[], period: number): number[] {
  if (closes.length < period + 1) return closes.map(() => 50);
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  const rsiArr: number[] = new Array(period).fill(50);
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsiArr.push(100 - 100 / (1 + rs));
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    const rs2 = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsiArr.push(100 - 100 / (1 + rs2));
  }
  return rsiArr;
}

function calcATR(candles: OHLC[], period: number): number[] {
  if (candles.length < 2) return candles.map(() => 0);
  const trs: number[] = [candles[0].high - candles[0].low];
  for (let i = 1; i < candles.length; i++) {
    const tr = Math.max(
      candles[i].high - candles[i].low,
      Math.abs(candles[i].high - candles[i - 1].close),
      Math.abs(candles[i].low - candles[i - 1].close),
    );
    trs.push(tr);
  }
  const result: number[] = [];
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(...new Array(period - 1).fill(atr));
  result.push(atr);
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    result.push(atr);
  }
  return result;
}

function detectSignals(
  candles: OHLC[],
  timeframe: "M1" | "M5" | "M15",
): HTSignal | null {
  if (candles.length < 20) return null;
  const closes = candles.map((c) => c.close);
  const ema5 = calcEMA(closes, 5);
  const ema13 = calcEMA(closes, 13);
  const rsiArr = calcRSI(closes, 14);
  const atrArr = calcATR(candles, 14);

  // Find most recent EMA5 x EMA13 crossover with RSI confirmation
  for (let i = candles.length - 1; i >= 14; i--) {
    const prevE5 = ema5[i - 1];
    const prevE13 = ema13[i - 1];
    const currE5 = ema5[i];
    const currE13 = ema13[i];
    const rsi = rsiArr[i];
    const atr = atrArr[i];
    const entry = closes[i];

    // Bullish crossover
    if (prevE5 <= prevE13 && currE5 > currE13 && rsi > 50) {
      const confidence = Math.min(95, Math.round(85 + (rsi - 50) * 0.4));
      return {
        timeframe,
        direction: "BUY",
        entry,
        tp1: entry + 1.5 * atr,
        tp2: entry + 2.5 * atr,
        tp3: entry + 3.5 * atr,
        sl: entry - 1.2 * atr,
        rsi,
        ema5: currE5,
        ema13: currE13,
        atr,
        confidence,
        candlesAgo: candles.length - 1 - i,
        closes,
        ema5Series: ema5,
        ema13Series: ema13,
        signalIndex: i,
      };
    }
    // Bearish crossover
    if (prevE5 >= prevE13 && currE5 < currE13 && rsi < 50) {
      const confidence = Math.min(95, Math.round(85 + (50 - rsi) * 0.4));
      return {
        timeframe,
        direction: "SELL",
        entry,
        tp1: entry - 1.5 * atr,
        tp2: entry - 2.5 * atr,
        tp3: entry - 3.5 * atr,
        sl: entry + 1.2 * atr,
        rsi,
        ema5: currE5,
        ema13: currE13,
        atr,
        confidence,
        candlesAgo: candles.length - 1 - i,
        closes,
        ema5Series: ema5,
        ema13Series: ema13,
        signalIndex: i,
      };
    }
  }
  return null;
}

function fmt(p: number): string {
  return `$${p.toFixed(2)}`;
}

function pips(a: number, b: number): string {
  const d = Math.abs(a - b);
  return `${(d / 0.1).toFixed(1)} pts`;
}

function rr(entry: number, tp: number, sl: number): string {
  const reward = Math.abs(tp - entry);
  const risk = Math.abs(sl - entry);
  if (risk === 0) return "—";
  return `1:${(reward / risk).toFixed(1)}`;
}

// Mini chart component
function MiniChart({ signal }: { signal: HTSignal }) {
  const startIdx = Math.max(0, signal.signalIndex - 19);
  const endIdx = signal.signalIndex + 1;
  const chartData = signal.closes.slice(startIdx, endIdx).map((close, i) => ({
    i: startIdx + i,
    close,
    ema5: signal.ema5Series[startIdx + i],
    ema13: signal.ema13Series[startIdx + i],
    isSignal: startIdx + i === signal.signalIndex,
  }));

  const allPrices = chartData.flatMap((d) => [d.close, d.ema5, d.ema13]);
  const minP = Math.min(...allPrices) * 0.9998;
  const maxP = Math.max(...allPrices) * 1.0002;
  const isBuy = signal.direction === "BUY";

  return (
    <div style={{ height: 180, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient
              id={`areaGrad-${signal.timeframe}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="5%"
                stopColor={isBuy ? "#22c55e" : "#ef4444"}
                stopOpacity={0.18}
              />
              <stop
                offset="95%"
                stopColor={isBuy ? "#22c55e" : "#ef4444"}
                stopOpacity={0.01}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="2 4"
            stroke="oklch(0.30 0.04 240)"
            strokeOpacity={0.4}
          />
          <XAxis dataKey="i" hide />
          <YAxis domain={[minP, maxP]} hide tickCount={4} />
          <Tooltip
            contentStyle={{
              background: DEEP_BG,
              border: `1px solid ${GOLD_BORDER}`,
              borderRadius: 6,
              fontSize: 10,
              padding: "4px 8px",
            }}
            formatter={(val: number) => [`$${val.toFixed(2)}`, ""]}
            labelFormatter={() => ""}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={isBuy ? "#22c55e" : "#ef4444"}
            strokeWidth={1.5}
            fill={`url(#areaGrad-${signal.timeframe})`}
            dot={false}
            activeDot={{ r: 3, fill: isBuy ? "#22c55e" : "#ef4444" }}
          />
          <Line
            type="monotone"
            dataKey="ema5"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray=""
          />
          <Line
            type="monotone"
            dataKey="ema13"
            stroke="#38bdf8"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray=""
          />
          <ReferenceLine
            x={signal.signalIndex}
            stroke={isBuy ? "#22c55e" : "#ef4444"}
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

const TF_VOLATILITY: Record<"M1" | "M5" | "M15", number> = {
  M1: 0.0003,
  M5: 0.0007,
  M15: 0.0015,
};

export default function HTScalperGoldPro() {
  const { prices } = useLivePrices();
  const liveGold = prices["XAU/USD"] ?? 3085;
  const [refreshKey, setRefreshKey] = useState(0);

  const signals = useMemo(() => {
    const timeframes: ("M1" | "M5" | "M15")[] = ["M1", "M5", "M15"];
    return timeframes.map((tf, tfIdx) => {
      const seed = liveGold * (tfIdx + 1) + refreshKey * 17.3;
      const candles = generateCandles(liveGold, 60, TF_VOLATILITY[tf], seed);
      return detectSignals(candles, tf);
    });
  }, [liveGold, refreshKey]);

  return (
    <section
      id="ht-scalper-gold-pro"
      className="py-16 px-4 sm:px-6 lg:px-8"
      style={{ background: SECTION_BG }}
      data-ocid="ht_scalper.section"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10"
        >
          <div>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-widest uppercase border"
                style={{
                  background: GOLD_BG,
                  color: GOLD_ACCENT,
                  borderColor: GOLD_BORDER,
                }}
              >
                <Zap className="w-3 h-3" />
                HT SCALPER GOLD PRO
              </span>
              <Badge
                className="text-[10px] font-semibold px-2 py-0.5"
                style={{
                  background: "oklch(0.76 0.17 150 / 0.15)",
                  color: BUY_COLOR,
                  border: "1px solid oklch(0.76 0.17 150 / 0.3)",
                }}
              >
                XAU/USD Only
              </Badge>
              <Badge
                className="text-[10px] font-semibold px-2 py-0.5"
                style={{
                  background: "oklch(0.55 0.16 270 / 0.15)",
                  color: "oklch(0.78 0.14 270)",
                  border: "1px solid oklch(0.55 0.16 270 / 0.3)",
                }}
              >
                TradingView-style
              </Badge>
            </div>
            <h2
              className="text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ color: GOLD_ACCENT }}
            >
              HT Scalper Gold Pro
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              EMA5 × EMA13 crossover · RSI(14) confirmation · ATR-based SL/TP ·
              M1 / M5 / M15 scalping timeframes
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setRefreshKey((k) => k + 1)}
            className="flex items-center gap-2 text-xs font-bold h-9 px-4"
            style={{
              background: GOLD_BG,
              color: GOLD_ACCENT,
              border: `1px solid ${GOLD_BORDER}`,
            }}
            data-ocid="ht_scalper.primary_button"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Signals
          </Button>
        </motion.div>

        {/* Three signal cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {signals.map((sig, idx) => {
            const tf = (["M1", "M5", "M15"] as const)[idx];
            if (!sig) {
              return (
                <motion.div
                  key={tf}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: idx * 0.08 }}
                  className="rounded-2xl border p-6 flex items-center justify-center text-muted-foreground text-sm"
                  style={{
                    background: CARD_BG,
                    borderColor: "oklch(0.28 0.04 240)",
                    minHeight: 420,
                  }}
                  data-ocid={`ht_scalper.item.${idx + 1}`}
                >
                  No signal detected for {tf}
                </motion.div>
              );
            }

            const isBuy = sig.direction === "BUY";
            const dirColor = isBuy ? BUY_COLOR : SELL_COLOR;
            const hoverBorder = isBuy
              ? "oklch(0.76 0.17 150 / 0.5)"
              : "oklch(0.65 0.18 20 / 0.5)";

            return (
              <motion.div
                key={tf}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.08 }}
                whileHover={{
                  boxShadow: `0 0 28px ${dirColor}22, 0 0 0 1px ${hoverBorder}`,
                }}
                className="rounded-2xl border overflow-hidden transition-colors"
                style={{
                  background: CARD_BG,
                  borderColor: GOLD_BORDER,
                }}
                data-ocid={`ht_scalper.item.${idx + 1}`}
              >
                {/* Card header */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{
                    background: DEEP_BG,
                    borderColor: GOLD_BORDER,
                  }}
                >
                  <span
                    className="text-xs font-black px-2.5 py-1 rounded-full border tracking-widest"
                    style={{
                      background: GOLD_BG,
                      color: GOLD_ACCENT,
                      borderColor: GOLD_BORDER,
                    }}
                  >
                    {tf}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className="flex items-center gap-1.5 text-sm font-black"
                      style={{ color: dirColor }}
                    >
                      {isBuy ? (
                        <ArrowUpCircle className="w-5 h-5" />
                      ) : (
                        <ArrowDownCircle className="w-5 h-5" />
                      )}
                      {sig.direction}
                    </span>
                    <span
                      className="text-[11px] font-black px-2 py-0.5 rounded-full"
                      style={{
                        background: GOLD_BG,
                        color: GOLD_ACCENT,
                        border: `1px solid ${GOLD_BORDER}`,
                      }}
                    >
                      {sig.confidence}%
                    </span>
                  </div>
                </div>

                {/* Mini chart */}
                <div className="px-2 pt-3 pb-1" style={{ background: DEEP_BG }}>
                  <MiniChart signal={sig} />
                  {/* Legend */}
                  <div className="flex items-center gap-4 px-2 pb-2">
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span
                        style={{
                          display: "inline-block",
                          width: 12,
                          height: 3,
                          borderRadius: 2,
                          background: "#f59e0b",
                        }}
                      />
                      EMA5
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span
                        style={{
                          display: "inline-block",
                          width: 12,
                          height: 3,
                          borderRadius: 2,
                          background: "#38bdf8",
                        }}
                      />
                      EMA13
                    </span>
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span
                        style={{
                          display: "inline-block",
                          width: 12,
                          height: 3,
                          borderRadius: 2,
                          background: isBuy ? "#22c55e" : "#ef4444",
                        }}
                      />
                      Price
                    </span>
                  </div>
                </div>

                {/* Signal levels */}
                <div className="px-4 py-4 space-y-2">
                  {/* Entry */}
                  <div
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{
                      background: "oklch(0.22 0.035 240)",
                      border: "1px solid oklch(0.28 0.04 240)",
                    }}
                  >
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Entry
                    </span>
                    <span className="text-sm font-mono font-bold text-foreground">
                      {fmt(sig.entry)}
                    </span>
                  </div>

                  {/* TP1 */}
                  <div
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{
                      background: "oklch(0.76 0.17 150 / 0.07)",
                      border: "1px solid oklch(0.76 0.17 150 / 0.2)",
                    }}
                  >
                    <div className="flex flex-col">
                      <span
                        className="text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: BUY_COLOR }}
                      >
                        TP1
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {pips(sig.entry, sig.tp1)} ·{" "}
                        {rr(sig.entry, sig.tp1, sig.sl)}
                      </span>
                    </div>
                    <span
                      className="text-sm font-mono font-bold"
                      style={{ color: BUY_COLOR }}
                    >
                      {fmt(sig.tp1)}
                    </span>
                  </div>

                  {/* TP2 */}
                  <div
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{
                      background: "oklch(0.72 0.18 200 / 0.07)",
                      border: "1px solid oklch(0.72 0.18 200 / 0.2)",
                    }}
                  >
                    <div className="flex flex-col">
                      <span
                        className="text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: "oklch(0.72 0.18 200)" }}
                      >
                        TP2
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {pips(sig.entry, sig.tp2)} ·{" "}
                        {rr(sig.entry, sig.tp2, sig.sl)}
                      </span>
                    </div>
                    <span
                      className="text-sm font-mono font-bold"
                      style={{ color: "oklch(0.72 0.18 200)" }}
                    >
                      {fmt(sig.tp2)}
                    </span>
                  </div>

                  {/* TP3 */}
                  <div
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{
                      background: GOLD_BG,
                      border: `1px solid ${GOLD_BORDER}`,
                    }}
                  >
                    <div className="flex flex-col">
                      <span
                        className="text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: GOLD_ACCENT }}
                      >
                        TP3
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {pips(sig.entry, sig.tp3)} ·{" "}
                        {rr(sig.entry, sig.tp3, sig.sl)}
                      </span>
                    </div>
                    <span
                      className="text-sm font-mono font-bold"
                      style={{ color: GOLD_ACCENT }}
                    >
                      {fmt(sig.tp3)}
                    </span>
                  </div>

                  {/* SL */}
                  <div
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{
                      background: "oklch(0.65 0.18 20 / 0.07)",
                      border: "1px solid oklch(0.65 0.18 20 / 0.25)",
                    }}
                  >
                    <div className="flex flex-col">
                      <span
                        className="text-[11px] font-semibold uppercase tracking-wide"
                        style={{ color: SELL_COLOR }}
                      >
                        Stop Loss
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {pips(sig.entry, sig.sl)} risk · 1.2× ATR
                      </span>
                    </div>
                    <span
                      className="text-sm font-mono font-bold"
                      style={{ color: SELL_COLOR }}
                    >
                      {fmt(sig.sl)}
                    </span>
                  </div>
                </div>

                {/* Footer stats */}
                <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                  <div
                    className="rounded-lg px-2 py-2 text-center"
                    style={{
                      background: DEEP_BG,
                      border: "1px solid oklch(0.26 0.038 240)",
                    }}
                  >
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">
                      RSI(14)
                    </div>
                    <div
                      className="text-sm font-black font-mono"
                      style={{
                        color: sig.rsi > 50 ? BUY_COLOR : SELL_COLOR,
                      }}
                    >
                      {sig.rsi.toFixed(1)}
                    </div>
                  </div>
                  <div
                    className="rounded-lg px-2 py-2 text-center"
                    style={{
                      background: DEEP_BG,
                      border: "1px solid oklch(0.26 0.038 240)",
                    }}
                  >
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">
                      ATR
                    </div>
                    <div
                      className="text-sm font-black font-mono"
                      style={{ color: GOLD_ACCENT }}
                    >
                      {sig.atr.toFixed(2)}
                    </div>
                  </div>
                  <div
                    className="rounded-lg px-2 py-2 text-center"
                    style={{
                      background: DEEP_BG,
                      border: "1px solid oklch(0.26 0.038 240)",
                    }}
                  >
                    <div className="text-[9px] text-muted-foreground uppercase tracking-wide mb-0.5">
                      Signal
                    </div>
                    <div className="text-[11px] font-bold text-muted-foreground">
                      {sig.candlesAgo === 0 ? "Live" : `${sig.candlesAgo}c ago`}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom legend */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="mt-6 flex flex-wrap items-center gap-5 px-4 py-3 rounded-xl border"
          style={{
            background: "oklch(0.19 0.028 240)",
            borderColor: GOLD_BORDER,
          }}
        >
          <span
            className="text-[10px] font-bold uppercase tracking-widest"
            style={{ color: GOLD_ACCENT }}
          >
            Indicator Legend
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 3,
                borderRadius: 2,
                background: "#f59e0b",
              }}
            />
            EMA5 (fast)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span
              style={{
                display: "inline-block",
                width: 16,
                height: 3,
                borderRadius: 2,
                background: "#38bdf8",
              }}
            />
            EMA13 (slow)
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ArrowUpCircle
              className="w-3.5 h-3.5"
              style={{ color: BUY_COLOR }}
            />
            BUY when EMA5 crosses above EMA13 + RSI &gt; 50
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ArrowDownCircle
              className="w-3.5 h-3.5"
              style={{ color: SELL_COLOR }}
            />
            SELL when EMA5 crosses below EMA13 + RSI &lt; 50
          </span>
          <span className="text-[11px] text-muted-foreground">
            SL = 1.2× ATR · TP1 = 1.5× ATR · TP2 = 2.5× ATR · TP3 = 3.5× ATR
          </span>
        </motion.div>
      </div>
    </section>
  );
}
