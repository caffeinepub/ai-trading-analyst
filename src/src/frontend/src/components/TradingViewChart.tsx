import { TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLivePrices } from "../hooks/useLivePrices";

const PAIRS = [
  "XAU/USD",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "GBP/JPY",
  "NIFTY FUT",
  "CRUDE OIL",
];
const TIMEFRAMES = ["M5", "M15", "H1", "H4", "D1"];
const TF_MINUTES: Record<string, number> = {
  M5: 5,
  M15: 15,
  H1: 60,
  H4: 240,
  D1: 1440,
};
const CANDLE_COUNT = 100;

// Canvas colors (hex - canvas cannot use oklch)
const C = {
  bg: "#0d1520",
  bgCard: "#131c2e",
  grid: "#1a2540",
  text: "#5a7090",
  textBright: "#9ab0cc",
  teal: "#26d7c6",
  bull: "#22c563",
  bear: "#e55060",
  ema9: "#00e5ff",
  ema21: "#d4a844",
  ema50: "#a855f7",
  crosshair: "#3060a0",
  border: "#1e2d44",
};

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

function srand(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function generateCandles(
  currentPrice: number,
  pair: string,
  tf: string,
): CandleData[] {
  const intervalSecs = (TF_MINUTES[tf] ?? 60) * 60;
  const now = Math.floor(Date.now() / 1000);
  const snapped = Math.floor(now / intervalSecs) * intervalSecs;
  const pairSeed =
    pair.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 1000 +
    (TF_MINUTES[tf] ?? 60);
  const rand = srand(pairSeed);

  const isGold = pair === "XAU/USD";
  const isJPY = pair.includes("JPY");
  const isNifty = pair === "NIFTY FUT";
  const isCrude = pair === "CRUDE OIL";
  const isNatGas = pair === "NATURAL GAS";
  const volPct = isGold
    ? 0.0025
    : isNifty
      ? 0.0035
      : isCrude
        ? 0.008
        : isNatGas
          ? 0.012
          : isJPY
            ? 0.0018
            : 0.0012;
  const vol = currentPrice * volPct;

  // Build random walk backward from currentPrice
  const closes = new Array<number>(CANDLE_COUNT);
  closes[CANDLE_COUNT - 1] = currentPrice;
  for (let i = CANDLE_COUNT - 2; i >= 0; i--) {
    closes[i] = closes[i + 1] + (rand() - 0.5) * vol * 2;
  }

  const candles: CandleData[] = [];
  for (let i = 0; i < CANDLE_COUNT; i++) {
    const time = snapped - (CANDLE_COUNT - 1 - i) * intervalSecs;
    const close = closes[i];
    const open = i === 0 ? close + (rand() - 0.5) * vol : closes[i - 1];
    const wick1 = vol * rand() * 0.9;
    const wick2 = vol * rand() * 0.9;
    const high = Math.max(open, close) + wick1;
    const low = Math.min(open, close) - wick2;
    candles.push({ time, open, high, low, close });
  }
  return candles;
}

function calcEMA(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i === 0) ema.push(values[0]);
    else ema.push(values[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

function calcRSI(closes: number[], period = 14): number[] {
  const rsi: number[] = [50];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (i <= period) {
      if (diff > 0) avgGain += diff;
      else avgLoss -= diff;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
      } else {
        rsi.push(50);
      }
    } else {
      avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
      rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
    }
  }
  return rsi;
}

function calcATR(candles: CandleData[], period = 14): number {
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    trs.push(
      Math.max(
        candles[i].high - candles[i].low,
        Math.abs(candles[i].high - candles[i - 1].close),
        Math.abs(candles[i].low - candles[i - 1].close),
      ),
    );
  }
  return trs.slice(-period).reduce((a, b) => a + b, 0) / period;
}

function fmtPrice(pair: string, price: number): string {
  if (pair === "XAU/USD") return `$${price.toFixed(2)}`;
  if (pair === "CRUDE OIL") return `$${price.toFixed(2)}`;
  if (pair === "NATURAL GAS") return `$${price.toFixed(3)}`;
  if (pair === "NIFTY FUT") return price.toFixed(2);
  if (pair.includes("FUT")) return price.toFixed(0);
  if (pair.includes("JPY")) return price.toFixed(2);
  return price.toFixed(4);
}

function fmtTime(unixSec: number, tf: string): string {
  const d = new Date(unixSec * 1000);
  if (tf === "D1")
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

type CrosshairPos = { x: number; y: number } | null;

export default function TradingViewChart() {
  const [selectedPair, setSelectedPair] = useState("XAU/USD");
  const [selectedTF, setSelectedTF] = useState("H1");
  const [crosshair, setCrosshair] = useState<CrosshairPos>(null);
  const [canvasW, setCanvasW] = useState(900);
  const [canvasH, setCanvasH] = useState(420);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { prices, isLoading } = useLivePrices();
  const currentPrice =
    prices[selectedPair] ??
    (selectedPair === "XAU/USD"
      ? 3058
      : selectedPair === "USD/JPY"
        ? 149.8
        : 1.085);

  const candles = useMemo(
    () => generateCandles(currentPrice, selectedPair, selectedTF),
    [currentPrice, selectedPair, selectedTF],
  );
  const closes = useMemo(() => candles.map((c) => c.close), [candles]);
  const ema9 = useMemo(() => calcEMA(closes, 9), [closes]);
  const ema21 = useMemo(() => calcEMA(closes, 21), [closes]);
  const ema50 = useMemo(() => calcEMA(closes, 50), [closes]);
  const rsi = useMemo(() => calcRSI(closes), [closes]);
  const atr = useMemo(() => calcATR(candles), [candles]);

  const signals = useMemo(() => {
    const result: Array<{ index: number; type: "buy" | "sell" }> = [];
    for (let i = 1; i < candles.length; i++) {
      if (ema9[i] > ema21[i] && ema9[i - 1] <= ema21[i - 1] && rsi[i] < 45)
        result.push({ index: i, type: "buy" });
      if (ema9[i] < ema21[i] && ema9[i - 1] >= ema21[i - 1] && rsi[i] > 55)
        result.push({ index: i, type: "sell" });
    }
    return result;
  }, [candles, ema9, ema21, rsi]);

  const currentSignal = useMemo(() => {
    const lastEma9 = ema9[ema9.length - 1];
    const lastEma21 = ema21[ema21.length - 1];
    const lastRsi = rsi[rsi.length - 1];
    const isBuy = lastEma9 > lastEma21;
    const lastEma50 = ema50[ema50.length - 1];
    // GainzAlgo V2 confidence scoring
    let conf = 55;
    // EMA triple alignment: ema9 > ema21 > ema50 for bull, opposite for bear
    const tripleAligned = isBuy
      ? lastEma9 > lastEma21 && lastEma21 > lastEma50
      : lastEma9 < lastEma21 && lastEma21 < lastEma50;
    if (tripleAligned) conf += 12;
    // RSI extreme confirmation
    if (isBuy && lastRsi < 35) conf += 8;
    if (!isBuy && lastRsi > 65) conf += 8;
    // ATR momentum: last candle range > ATR * 1.1
    const lastCandle = candles[candles.length - 1];
    if (lastCandle && lastCandle.high - lastCandle.low > atr * 1.1) conf += 6;
    const confidence = Math.min(Math.max(conf, 54), 96);
    const direction = isBuy ? "BUY" : "SELL";
    const tp1 = isBuy ? currentPrice + atr * 1.2 : currentPrice - atr * 1.2;
    const tp2 = isBuy ? currentPrice + atr * 2.4 : currentPrice - atr * 2.4;
    const tp3 = isBuy ? currentPrice + atr * 3.8 : currentPrice - atr * 3.8;
    const sl = isBuy ? currentPrice - atr * 1.5 : currentPrice + atr * 1.5;
    const amdPhase =
      lastRsi < 40
        ? "Accumulation"
        : lastRsi > 60
          ? "Distribution"
          : "Manipulation";
    return { direction, tp1, tp2, tp3, sl, confidence, amdPhase };
  }, [ema9, ema21, ema50, rsi, atr, currentPrice, candles]);

  const drawChart = useCallback(
    (ctx: CanvasRenderingContext2D, W: number, H: number) => {
      const PAD = { top: 24, right: 82, bottom: 36, left: 10 };
      const chartW = W - PAD.left - PAD.right;
      const chartH = H - PAD.top - PAD.bottom;

      const allPrices = candles
        .flatMap((c) => [c.high, c.low])
        .concat(ema9, ema21, ema50);
      const minP = Math.min(...allPrices) - atr * 0.6;
      const maxP = Math.max(...allPrices) + atr * 0.6;
      const priceRange = maxP - minP;

      const toY = (p: number) =>
        PAD.top + chartH - ((p - minP) / priceRange) * chartH;
      const step = chartW / CANDLE_COUNT;
      const cw = step * 0.65;
      const toX = (i: number) => PAD.left + i * step + step * 0.175;

      // Background
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      // Horizontal grid lines + price labels
      ctx.setLineDash([3, 4]);
      ctx.lineWidth = 0.5;
      const levels = 7;
      for (let i = 0; i <= levels; i++) {
        const price = minP + (priceRange / levels) * i;
        const y = toY(price);
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(PAD.left, y);
        ctx.lineTo(W - PAD.right, y);
        ctx.stroke();
        ctx.fillStyle = C.text;
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillText(fmtPrice(selectedPair, price), W - PAD.right + 4, y + 3.5);
      }

      // Vertical grid lines + time labels
      const tlInterval = Math.max(Math.floor(CANDLE_COUNT / 8), 1);
      for (let i = 0; i < CANDLE_COUNT; i += tlInterval) {
        const x = toX(i) + cw / 2;
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(x, PAD.top);
        ctx.lineTo(x, PAD.top + chartH);
        ctx.stroke();
        ctx.fillStyle = C.text;
        ctx.font = "9px 'JetBrains Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText(fmtTime(candles[i].time, selectedTF), x, H - 8);
      }
      ctx.setLineDash([]);

      // EMA lines
      const drawEMALine = (vals: number[], color: string, lw: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineJoin = "round";
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        for (let i = 0; i < vals.length; i++) {
          const x = toX(i) + cw / 2;
          const y = toY(vals[i]);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      };
      drawEMALine(ema50, C.ema50, 1.2);
      drawEMALine(ema21, C.ema21, 1.5);
      drawEMALine(ema9, C.ema9, 1.8);

      // Candles
      for (let i = 0; i < candles.length; i++) {
        const c = candles[i];
        const x = toX(i);
        const midX = x + cw / 2;
        const isBull = c.close >= c.open;
        const color = isBull ? C.bull : C.bear;
        const bodyTop = toY(Math.max(c.open, c.close));
        const bodyBot = toY(Math.min(c.open, c.close));
        const bodyH = Math.max(bodyBot - bodyTop, 1);

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(midX, toY(c.high));
        ctx.lineTo(midX, toY(c.low));
        ctx.stroke();

        ctx.fillStyle = color;
        ctx.globalAlpha = isBull ? 0.9 : 0.8;
        ctx.fillRect(x, bodyTop, cw, bodyH);
        ctx.globalAlpha = 1;
      }

      // Signal arrows
      for (const sig of signals) {
        const x = toX(sig.index) + cw / 2;
        const c = candles[sig.index];
        if (sig.type === "buy") {
          const y = toY(c.low) + 14;
          ctx.fillStyle = C.bull;
          ctx.beginPath();
          ctx.moveTo(x, y - 9);
          ctx.lineTo(x - 5, y);
          ctx.lineTo(x + 5, y);
          ctx.closePath();
          ctx.fill();
          ctx.font = "bold 6px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("B", x, y + 8);
        } else {
          const y = toY(c.high) - 14;
          ctx.fillStyle = C.bear;
          ctx.beginPath();
          ctx.moveTo(x, y + 9);
          ctx.lineTo(x - 5, y);
          ctx.lineTo(x + 5, y);
          ctx.closePath();
          ctx.fill();
          ctx.font = "bold 6px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("S", x, y - 4);
        }
      }

      // Last price dashed line
      const lastClose = candles[CANDLE_COUNT - 1].close;
      const lastY = toY(lastClose);
      ctx.strokeStyle = C.teal;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(PAD.left, lastY);
      ctx.lineTo(W - PAD.right, lastY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Last price label box
      const lastLabel = fmtPrice(selectedPair, lastClose);
      const lblW = lastLabel.length * 7 + 10;
      ctx.fillStyle = C.teal;
      ctx.fillRect(W - PAD.right, lastY - 9, lblW, 18);
      ctx.fillStyle = "#0d1520";
      ctx.font = "bold 9.5px 'JetBrains Mono', monospace";
      ctx.textAlign = "left";
      ctx.fillText(lastLabel, W - PAD.right + 5, lastY + 4);

      // Crosshair
      if (crosshair) {
        ctx.strokeStyle = "rgba(48, 96, 160, 0.7)";
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(crosshair.x, PAD.top);
        ctx.lineTo(crosshair.x, PAD.top + chartH);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(PAD.left, crosshair.y);
        ctx.lineTo(W - PAD.right, crosshair.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Crosshair price label
        const crossP =
          minP + ((PAD.top + chartH - crosshair.y) / chartH) * priceRange;
        const crossLabel = fmtPrice(selectedPair, crossP);
        const clW = crossLabel.length * 7 + 10;
        ctx.fillStyle = "#1a2d50";
        ctx.fillRect(W - PAD.right, crosshair.y - 9, clW, 18);
        ctx.fillStyle = C.textBright;
        ctx.font = "9.5px 'JetBrains Mono', monospace";
        ctx.textAlign = "left";
        ctx.fillText(crossLabel, W - PAD.right + 5, crosshair.y + 4);

        // OHLC readout
        const ci = Math.max(
          0,
          Math.min(
            Math.floor((crosshair.x - PAD.left) / step),
            CANDLE_COUNT - 1,
          ),
        );
        if (ci >= 0) {
          const c = candles[ci];
          const items = [
            { t: `O ${fmtPrice(selectedPair, c.open)}`, col: C.textBright },
            { t: `H ${fmtPrice(selectedPair, c.high)}`, col: C.bull },
            { t: `L ${fmtPrice(selectedPair, c.low)}`, col: C.bear },
            { t: `C ${fmtPrice(selectedPair, c.close)}`, col: C.teal },
          ];
          let lx = PAD.left + 4;
          ctx.font = "10px 'JetBrains Mono', monospace";
          for (const item of items) {
            ctx.fillStyle = item.col;
            ctx.textAlign = "left";
            ctx.fillText(item.t, lx, PAD.top - 6);
            lx += item.t.length * 7 + 12;
          }
        }
      }

      // Chart border
      ctx.strokeStyle = C.border;
      ctx.lineWidth = 1;
      ctx.strokeRect(PAD.left, PAD.top, chartW, chartH);
    },
    [
      candles,
      ema9,
      ema21,
      ema50,
      signals,
      crosshair,
      selectedPair,
      selectedTF,
      atr,
    ],
  );

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(entry.contentRect.width, 400);
        const h = Math.min(Math.max(w * 0.46, 320), 480);
        setCanvasW(w);
        setCanvasH(h);
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Render to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasW * dpr;
    canvas.height = canvasH * dpr;
    canvas.style.width = `${canvasW}px`;
    canvas.style.height = `${canvasH}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);
    drawChart(ctx, canvasW, canvasH);
    ctx.restore();
  }, [drawChart, canvasW, canvasH]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCrosshair({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleMouseLeave = useCallback(() => setCrosshair(null), []);

  const isBuySignal = currentSignal.direction === "BUY";
  const amdColor =
    currentSignal.amdPhase === "Accumulation"
      ? C.bull
      : currentSignal.amdPhase === "Distribution"
        ? C.bear
        : C.ema21;

  return (
    <div
      className="w-full rounded-xl border border-border/60 overflow-hidden"
      style={{ background: C.bg }}
    >
      {/* Header row: GainzAlgo badge + TF selector */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
            style={{
              background: "oklch(0.75 0.12 80 / 0.12)",
              border: "1px solid oklch(0.75 0.12 80 / 0.35)",
            }}
          >
            <span
              className="text-xs font-bold tracking-wide"
              style={{ color: "oklch(0.82 0.16 75)" }}
            >
              ⚡ GainzAlgo V2 Alpha
            </span>
          </div>
          {isLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">
              Fetching live prices…
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setSelectedTF(tf)}
              className="text-xs px-2 py-0.5 rounded transition-colors"
              style={
                selectedTF === tf
                  ? {
                      background: "oklch(0.78 0.12 190 / 0.15)",
                      color: "oklch(0.78 0.12 190)",
                      border: "1px solid oklch(0.78 0.12 190 / 0.4)",
                    }
                  : {
                      color: "oklch(0.55 0.03 240)",
                      border: "1px solid transparent",
                    }
              }
              data-ocid={`chart.${tf.toLowerCase()}.tab`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Pair selector + current price */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-border/40">
        <div className="flex flex-wrap items-center gap-1.5">
          {PAIRS.map((pair) => (
            <button
              key={pair}
              type="button"
              onClick={() => setSelectedPair(pair)}
              className="text-xs font-semibold px-3 py-1 rounded-full border transition-all"
              style={
                selectedPair === pair
                  ? {
                      background: "oklch(0.75 0.12 80 / 0.18)",
                      borderColor: "oklch(0.75 0.12 80 / 0.55)",
                      color: "oklch(0.82 0.16 75)",
                    }
                  : {
                      background: "transparent",
                      borderColor: "oklch(0.27 0.04 240)",
                      color: "oklch(0.55 0.03 240)",
                    }
              }
              data-ocid={`chart.${pair.replace("/", "").toLowerCase()}.tab`}
            >
              {pair}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-display font-bold text-foreground text-sm">
            {selectedPair}
          </span>
          <span
            className="font-mono text-base font-bold"
            style={{ color: C.teal }}
          >
            {fmtPrice(selectedPair, currentPrice)}
          </span>
          {!isLoading && (
            <span
              className="text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{
                background: "oklch(0.76 0.17 150 / 0.12)",
                color: C.bull,
              }}
            >
              LIVE
            </span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative w-full cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        data-ocid="chart.canvas_target"
      >
        <canvas ref={canvasRef} style={{ display: "block", width: "100%" }} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-2.5 border-t border-border/40 text-xs">
        {[
          { label: "EMA9", color: C.ema9 },
          { label: "EMA21", color: C.ema21 },
          { label: "EMA50", color: C.ema50 },
        ].map((e) => (
          <div key={e.label} className="flex items-center gap-1.5">
            <span
              className="w-5 h-0.5 inline-block rounded-full"
              style={{ background: e.color }}
            />
            <span className="text-muted-foreground">{e.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span style={{ color: C.bull }}>▲</span>
          <span className="text-muted-foreground">Buy Signal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span style={{ color: C.bear }}>▼</span>
          <span className="text-muted-foreground">Sell Signal</span>
        </div>
      </div>

      {/* ── GainzAlgo V2 Signal Panel ── */}
      <div
        className="border-t px-4 py-4"
        style={{
          borderColor: "oklch(0.75 0.12 80 / 0.25)",
          background: "oklch(0.12 0.022 240)",
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <span
            className="text-xs font-bold tracking-widest uppercase"
            style={{ color: "oklch(0.82 0.16 75)" }}
          >
            ⚡ GainzAlgo V2 Alpha · Signal Panel
          </span>
          <div
            className="h-px flex-1"
            style={{ background: "oklch(0.75 0.12 80 / 0.25)" }}
          />
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{
              background: isBuySignal
                ? "oklch(0.76 0.17 150 / 0.12)"
                : "oklch(0.65 0.18 20 / 0.12)",
              color: isBuySignal ? C.bull : C.bear,
              border: `1px solid ${isBuySignal ? "oklch(0.76 0.17 150 / 0.35)" : "oklch(0.65 0.18 20 / 0.35)"}`,
            }}
          >
            {selectedPair} · {selectedTF}
          </span>
        </div>

        <motion.div
          key={`${selectedPair}-${selectedTF}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5"
        >
          {/* Signal direction */}
          <div
            className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center rounded-lg py-3 gap-1"
            style={{
              background: isBuySignal
                ? "oklch(0.76 0.17 150 / 0.1)"
                : "oklch(0.65 0.18 20 / 0.1)",
              border: `1px solid ${isBuySignal ? "oklch(0.76 0.17 150 / 0.35)" : "oklch(0.65 0.18 20 / 0.35)"}`,
            }}
            data-ocid="chart.signal.card"
          >
            {isBuySignal ? (
              <TrendingUp className="w-5 h-5" style={{ color: C.bull }} />
            ) : (
              <TrendingDown className="w-5 h-5" style={{ color: C.bear }} />
            )}
            <span
              className="text-xl font-bold"
              style={{ color: isBuySignal ? C.bull : C.bear }}
            >
              {currentSignal.direction}
            </span>
            <span className="text-xs" style={{ color: "oklch(0.55 0.03 240)" }}>
              Signal
            </span>
          </div>

          {/* Confidence */}
          <SignalCell
            label="Confidence"
            value={`${currentSignal.confidence}%`}
            color={"oklch(0.82 0.16 75)"}
          />

          {/* Entry Zone */}
          <SignalCell
            label="Entry Zone"
            value={fmtPrice(selectedPair, currentPrice)}
            color={"oklch(0.94 0.02 250)"}
          />

          {/* TP1 */}
          <SignalCell
            label="TP 1"
            value={fmtPrice(selectedPair, currentSignal.tp1)}
            color={C.bull}
          />

          {/* TP2 */}
          <SignalCell
            label="TP 2"
            value={fmtPrice(selectedPair, currentSignal.tp2)}
            color={C.bull}
          />

          {/* TP3 */}
          <SignalCell
            label="TP 3"
            value={fmtPrice(selectedPair, currentSignal.tp3)}
            color={C.bull}
          />

          {/* Stop Loss */}
          <SignalCell
            label="Stop Loss"
            value={fmtPrice(selectedPair, currentSignal.sl)}
            color={C.bear}
          />

          {/* AMD Phase */}
          <div
            className="flex flex-col items-center justify-center rounded-lg py-3 gap-1"
            style={{ background: "oklch(0.19 0.03 240)" }}
          >
            <span className="text-xs" style={{ color: "oklch(0.55 0.03 240)" }}>
              AMD Phase
            </span>
            <span className="text-sm font-bold" style={{ color: amdColor }}>
              {currentSignal.amdPhase}
            </span>
            <span className="text-xs" style={{ color: amdColor, opacity: 0.7 }}>
              {currentSignal.amdPhase === "Accumulation"
                ? "↑"
                : currentSignal.amdPhase === "Distribution"
                  ? "↓"
                  : "↕"}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SignalCell({
  label,
  value,
  color,
}: { label: string; value: string; color: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg py-3 gap-1"
      style={{ background: "oklch(0.19 0.03 240)" }}
    >
      <span className="text-xs" style={{ color: "oklch(0.55 0.03 240)" }}>
        {label}
      </span>
      <span className="font-mono font-bold text-sm" style={{ color }}>
        {value}
      </span>
    </div>
  );
}
