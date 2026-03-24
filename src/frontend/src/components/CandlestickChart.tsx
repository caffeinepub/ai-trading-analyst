import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  label: string;
}

const PAIR_DATA: Record<string, Candle[]> = {
  "XAU/USD": [
    { open: 3021.4, high: 3028.0, low: 3018.5, close: 3025.8, label: "c1" },
    { open: 3025.8, high: 3032.5, low: 3022.2, close: 3030.1, label: "c2" },
    { open: 3030.1, high: 3035.0, low: 3027.6, close: 3028.9, label: "c3" },
    { open: 3028.9, high: 3030.4, low: 3020.0, close: 3023.4, label: "c4" },
    { open: 3023.4, high: 3025.2, low: 3014.8, close: 3017.2, label: "c5" },
    { open: 3017.2, high: 3021.6, low: 3011.5, close: 3015.8, label: "c6" },
    { open: 3015.8, high: 3024.3, low: 3013.4, close: 3022.7, label: "c7" },
    { open: 3022.7, high: 3031.0, low: 3020.5, close: 3029.5, label: "c8" },
    { open: 3029.5, high: 3045.8, low: 3027.2, close: 3042.4, label: "c9" },
    { open: 3042.4, high: 3051.0, low: 3039.6, close: 3048.7, label: "c10" },
    { open: 3048.7, high: 3066.2, low: 3046.1, close: 3061.9, label: "c11" },
    { open: 3061.9, high: 3068.4, low: 3048.5, close: 3051.2, label: "c12" },
    { open: 3051.2, high: 3055.8, low: 3040.4, close: 3044.6, label: "c13" },
    { open: 3044.6, high: 3048.2, low: 3034.1, close: 3037.9, label: "c14" },
    { open: 3037.9, high: 3042.5, low: 3030.7, close: 3032.4, label: "c15" },
    { open: 3032.4, high: 3040.8, low: 3029.5, close: 3038.6, label: "c16" },
    { open: 3038.6, high: 3052.0, low: 3036.3, close: 3049.8, label: "c17" },
    { open: 3049.8, high: 3061.5, low: 3047.2, close: 3058.3, label: "c18" },
    { open: 3058.3, high: 3069.7, low: 3055.8, close: 3065.6, label: "c19" },
    { open: 3065.6, high: 3078.4, low: 3062.1, close: 3057.5, label: "c20" },
  ],
  "EUR/USD": [
    { open: 1.0821, high: 1.0836, low: 1.0815, close: 1.0832, label: "c1" },
    { open: 1.0832, high: 1.0845, low: 1.0828, close: 1.084, label: "c2" },
    { open: 1.084, high: 1.0852, low: 1.0835, close: 1.0838, label: "c3" },
    { open: 1.0838, high: 1.0842, low: 1.0825, close: 1.0828, label: "c4" },
    { open: 1.0828, high: 1.0832, low: 1.0818, close: 1.0822, label: "c5" },
    { open: 1.0822, high: 1.0829, low: 1.0812, close: 1.0819, label: "c6" },
    { open: 1.0819, high: 1.0831, low: 1.0815, close: 1.0828, label: "c7" },
    { open: 1.0828, high: 1.0841, low: 1.0824, close: 1.0838, label: "c8" },
    { open: 1.0838, high: 1.0855, low: 1.0832, close: 1.0851, label: "c9" },
    { open: 1.0851, high: 1.0862, low: 1.0846, close: 1.0858, label: "c10" },
    { open: 1.0858, high: 1.0868, low: 1.0845, close: 1.0852, label: "c11" },
    { open: 1.0852, high: 1.0858, low: 1.084, close: 1.0844, label: "c12" },
    { open: 1.0844, high: 1.085, low: 1.0832, close: 1.0838, label: "c13" },
    { open: 1.0838, high: 1.0845, low: 1.0828, close: 1.0832, label: "c14" },
    { open: 1.0832, high: 1.0842, low: 1.0826, close: 1.0829, label: "c15" },
    { open: 1.0829, high: 1.084, low: 1.0824, close: 1.0837, label: "c16" },
    { open: 1.0837, high: 1.0848, low: 1.0832, close: 1.0845, label: "c17" },
    { open: 1.0845, high: 1.0858, low: 1.0841, close: 1.0854, label: "c18" },
    { open: 1.0854, high: 1.0862, low: 1.0848, close: 1.0859, label: "c19" },
    { open: 1.0859, high: 1.0865, low: 1.0848, close: 1.0852, label: "c20" },
  ],
  "GBP/USD": [
    { open: 1.2922, high: 1.2938, low: 1.2915, close: 1.2935, label: "c1" },
    { open: 1.2935, high: 1.2948, low: 1.2928, close: 1.2942, label: "c2" },
    { open: 1.2942, high: 1.2955, low: 1.2936, close: 1.2939, label: "c3" },
    { open: 1.2939, high: 1.2944, low: 1.2924, close: 1.2928, label: "c4" },
    { open: 1.2928, high: 1.2933, low: 1.2918, close: 1.2922, label: "c5" },
    { open: 1.2922, high: 1.293, low: 1.291, close: 1.2918, label: "c6" },
    { open: 1.2918, high: 1.2932, low: 1.2912, close: 1.2928, label: "c7" },
    { open: 1.2928, high: 1.2942, low: 1.2922, close: 1.2938, label: "c8" },
    { open: 1.2938, high: 1.2955, low: 1.2932, close: 1.295, label: "c9" },
    { open: 1.295, high: 1.2962, low: 1.2944, close: 1.2958, label: "c10" },
    { open: 1.2958, high: 1.2972, low: 1.2948, close: 1.2965, label: "c11" },
    { open: 1.2965, high: 1.297, low: 1.2948, close: 1.2952, label: "c12" },
    { open: 1.2952, high: 1.2958, low: 1.2938, close: 1.2942, label: "c13" },
    { open: 1.2942, high: 1.295, low: 1.2932, close: 1.2936, label: "c14" },
    { open: 1.2936, high: 1.2945, low: 1.2928, close: 1.2932, label: "c15" },
    { open: 1.2932, high: 1.2942, low: 1.2925, close: 1.2939, label: "c16" },
    { open: 1.2939, high: 1.2952, low: 1.2934, close: 1.2948, label: "c17" },
    { open: 1.2948, high: 1.296, low: 1.2942, close: 1.2956, label: "c18" },
    { open: 1.2956, high: 1.2965, low: 1.295, close: 1.2961, label: "c19" },
    { open: 1.2961, high: 1.2972, low: 1.2955, close: 1.2949, label: "c20" },
  ],
  "USD/JPY": [
    { open: 149.48, high: 149.82, low: 149.22, close: 149.65, label: "c1" },
    { open: 149.65, high: 149.95, low: 149.5, close: 149.88, label: "c2" },
    { open: 149.88, high: 150.12, low: 149.72, close: 149.92, label: "c3" },
    { open: 149.92, high: 150.05, low: 149.65, close: 149.72, label: "c4" },
    { open: 149.72, high: 149.82, low: 149.4, close: 149.52, label: "c5" },
    { open: 149.52, high: 149.68, low: 149.28, close: 149.42, label: "c6" },
    { open: 149.42, high: 149.62, low: 149.3, close: 149.58, label: "c7" },
    { open: 149.58, high: 149.82, low: 149.48, close: 149.78, label: "c8" },
    { open: 149.78, high: 150.12, low: 149.68, close: 150.05, label: "c9" },
    { open: 150.05, high: 150.32, low: 149.92, close: 150.25, label: "c10" },
    { open: 150.25, high: 150.48, low: 150.08, close: 150.38, label: "c11" },
    { open: 150.38, high: 150.45, low: 150.05, close: 150.12, label: "c12" },
    { open: 150.12, high: 150.22, low: 149.88, close: 149.95, label: "c13" },
    { open: 149.95, high: 150.08, low: 149.72, close: 149.78, label: "c14" },
    { open: 149.78, high: 149.92, low: 149.58, close: 149.68, label: "c15" },
    { open: 149.68, high: 149.85, low: 149.55, close: 149.8, label: "c16" },
    { open: 149.8, high: 150.02, low: 149.72, close: 149.98, label: "c17" },
    { open: 149.98, high: 150.22, low: 149.88, close: 150.15, label: "c18" },
    { open: 150.15, high: 150.38, low: 150.02, close: 150.28, label: "c19" },
    { open: 150.28, high: 150.42, low: 150.1, close: 150.18, label: "c20" },
  ],
  "GBP/JPY": [
    { open: 193.12, high: 193.68, low: 192.88, close: 193.45, label: "c1" },
    { open: 193.45, high: 193.95, low: 193.22, close: 193.82, label: "c2" },
    { open: 193.82, high: 194.15, low: 193.62, close: 193.88, label: "c3" },
    { open: 193.88, high: 194.02, low: 193.55, close: 193.68, label: "c4" },
    { open: 193.68, high: 193.78, low: 193.28, close: 193.42, label: "c5" },
    { open: 193.42, high: 193.58, low: 193.05, close: 193.22, label: "c6" },
    { open: 193.22, high: 193.48, low: 193.08, close: 193.38, label: "c7" },
    { open: 193.38, high: 193.72, low: 193.25, close: 193.62, label: "c8" },
    { open: 193.62, high: 194.05, low: 193.48, close: 193.95, label: "c9" },
    { open: 193.95, high: 194.32, low: 193.82, close: 194.22, label: "c10" },
    { open: 194.22, high: 194.58, low: 194.05, close: 194.45, label: "c11" },
    { open: 194.45, high: 194.62, low: 194.12, close: 194.22, label: "c12" },
    { open: 194.22, high: 194.35, low: 193.95, close: 194.05, label: "c13" },
    { open: 194.05, high: 194.18, low: 193.78, close: 193.88, label: "c14" },
    { open: 193.88, high: 194.02, low: 193.65, close: 193.72, label: "c15" },
    { open: 193.72, high: 193.92, low: 193.58, close: 193.85, label: "c16" },
    { open: 193.85, high: 194.12, low: 193.72, close: 194.02, label: "c17" },
    { open: 194.02, high: 194.28, low: 193.88, close: 194.18, label: "c18" },
    { open: 194.18, high: 194.42, low: 194.05, close: 194.35, label: "c19" },
    { open: 194.35, high: 194.55, low: 194.15, close: 194.22, label: "c20" },
  ],
};

const PAIR_CURRENT_PRICE: Record<
  string,
  { price: string; change: string; bull: boolean }
> = {
  "XAU/USD": { price: "3,058.40", change: "+0.42%", bull: true },
  "EUR/USD": { price: "1.0842", change: "-0.08%", bull: false },
  "GBP/USD": { price: "1.2948", change: "+0.15%", bull: true },
  "USD/JPY": { price: "149.78", change: "-0.22%", bull: false },
  "GBP/JPY": { price: "193.62", change: "+0.12%", bull: true },
};

const ANNOTATIONS = [
  {
    label: "ORDER BLOCK",
    startIdx: 8,
    endIdx: 10,
    color: "rgba(43, 180, 255, 0.15)",
    borderColor: "rgba(43, 180, 255, 0.6)",
    yPos: "top" as const,
  },
  {
    label: "LIQUIDITY SWEEP",
    startIdx: 10,
    endIdx: 12,
    color: "rgba(38, 215, 198, 0.15)",
    borderColor: "rgba(38, 215, 198, 0.6)",
    yPos: "top" as const,
  },
  {
    label: "MANIPULATION (M)",
    startIdx: 11,
    endIdx: 14,
    color: "rgba(214, 176, 76, 0.12)",
    borderColor: "rgba(214, 176, 76, 0.5)",
    yPos: "bottom" as const,
  },
  {
    label: "DISTRIBUTION (D)",
    startIdx: 13,
    endIdx: 16,
    color: "rgba(229, 91, 102, 0.12)",
    borderColor: "rgba(229, 91, 102, 0.5)",
    yPos: "bottom" as const,
  },
];

const TIMEFRAMES = ["M5", "M15", "H1", "H4", "D1", "W1"];
const PAIRS = ["XAU/USD", "EUR/USD", "GBP/USD", "USD/JPY", "GBP/JPY"];

function formatOHLC(pair: string, price: number): string {
  if (pair === "XAU/USD") return price.toFixed(2);
  if (pair.includes("JPY")) return price.toFixed(2);
  return price.toFixed(4);
}

export default function CandlestickChart() {
  const [selectedPair, setSelectedPair] = useState("XAU/USD");
  const [selectedTF, setSelectedTF] = useState("H1");
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);

  const width = 900;
  const height = 320;
  const padding = { top: 40, right: 60, bottom: 30, left: 70 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Apply slight timeframe shift to vary appearance
  const tfShift: Record<string, number> = {
    M5: 0.0003,
    M15: 0.0006,
    H1: 0,
    H4: -0.0004,
    D1: -0.001,
    W1: -0.002,
  };
  const shift = tfShift[selectedTF] ?? 0;

  const CANDLE_DATA = useMemo(() => {
    const base = PAIR_DATA[selectedPair] ?? PAIR_DATA["XAU/USD"];
    if (shift === 0) return base;
    const factor = 1 + shift;
    return base.map((c) => ({
      ...c,
      open: c.open * factor,
      high: c.high * factor,
      low: c.low * factor,
      close: c.close * factor,
    }));
  }, [selectedPair, shift]);

  const { minPrice, maxPrice, candleWidth, gap } = useMemo(() => {
    const prices = CANDLE_DATA.flatMap((c) => [c.high, c.low]);
    const range = Math.max(...prices) - Math.min(...prices);
    const minP = Math.min(...prices) - range * 0.08;
    const maxP = Math.max(...prices) + range * 0.08;
    const total = CANDLE_DATA.length;
    const cw = (chartW / total) * 0.6;
    const g = (chartW / total) * 0.4;
    return { minPrice: minP, maxPrice: maxP, candleWidth: cw, gap: g };
  }, [CANDLE_DATA, chartW]);

  const priceToY = (price: number) =>
    padding.top +
    chartH -
    ((price - minPrice) / (maxPrice - minPrice)) * chartH;

  const candleX = (i: number) =>
    padding.left + i * (candleWidth + gap) + gap / 2;

  const gridPrices = useMemo(() => {
    const range = maxPrice - minPrice;
    const isJPY = selectedPair.includes("JPY");
    const isGold = selectedPair === "XAU/USD";
    let step = isGold
      ? Math.round(range / 5 / 5) * 5
      : isJPY
        ? Math.round((range / 5) * 10) / 10
        : Math.round((range / 5) * 10000) / 10000;
    if (step === 0) step = isGold ? 5 : isJPY ? 0.2 : 0.001;
    const lines: number[] = [];
    let p = Math.ceil(minPrice / step) * step;
    while (p <= maxPrice) {
      lines.push(p);
      p += step;
    }
    return lines;
  }, [minPrice, maxPrice, selectedPair]);

  const currentInfo = PAIR_CURRENT_PRICE[selectedPair];
  const hovered = hoveredCandle !== null ? CANDLE_DATA[hoveredCandle] : null;

  return (
    <div
      className="w-full overflow-x-auto rounded-xl border border-border/60"
      style={{ background: "oklch(0.15 0.025 240)" }}
    >
      {/* Pair selector */}
      <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-2">
        {PAIRS.map((pair) => (
          <button
            key={pair}
            type="button"
            onClick={() => setSelectedPair(pair)}
            className="text-xs font-semibold px-3 py-1 rounded-full border transition-all"
            style={
              selectedPair === pair
                ? {
                    background: "oklch(0.75 0.12 80 / 0.2)",
                    borderColor: "oklch(0.75 0.12 80 / 0.6)",
                    color: "oklch(0.75 0.12 80)",
                  }
                : {
                    background: "transparent",
                    borderColor: "oklch(0.27 0.04 240)",
                    color: "oklch(0.55 0.03 240)",
                  }
            }
          >
            {pair}
          </button>
        ))}
      </div>

      {/* Header bar */}
      <div className="flex items-center gap-4 px-5 py-3 border-b border-border/40">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedPair}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-3"
          >
            <span className="font-display font-bold text-foreground">
              {selectedPair}
            </span>
            <span
              className="font-mono text-lg font-bold"
              style={{
                color: currentInfo.bull
                  ? "oklch(0.76 0.17 150)"
                  : "oklch(0.65 0.18 20)",
              }}
            >
              {currentInfo.price}
            </span>
            <span
              className="text-xs font-semibold"
              style={{
                color: currentInfo.bull
                  ? "oklch(0.76 0.17 150)"
                  : "oklch(0.65 0.18 20)",
              }}
            >
              {currentInfo.bull ? "▲" : "▼"} {currentInfo.change}
            </span>
          </motion.div>
        </AnimatePresence>
        <div className="ml-auto flex items-center gap-1.5">
          {TIMEFRAMES.map((tf) => (
            <button
              type="button"
              key={tf}
              onClick={() => setSelectedTF(tf)}
              className="text-xs px-2 py-0.5 rounded transition-colors"
              style={
                selectedTF === tf
                  ? {
                      background: "oklch(0.78 0.12 190 / 0.15)",
                      color: "oklch(0.78 0.12 190)",
                      border: "1px solid oklch(0.78 0.12 190 / 0.4)",
                    }
                  : { color: "oklch(0.55 0.03 240)" }
              }
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* OHLC tooltip */}
      {hovered && (
        <div
          className="flex items-center gap-4 px-5 py-2 text-xs font-mono"
          style={{ borderBottom: "1px solid oklch(0.27 0.04 240)" }}
        >
          <span className="text-muted-foreground">
            O{" "}
            <span className="text-foreground">
              {formatOHLC(selectedPair, hovered.open)}
            </span>
          </span>
          <span className="text-muted-foreground">
            H{" "}
            <span style={{ color: "oklch(0.76 0.17 150)" }}>
              {formatOHLC(selectedPair, hovered.high)}
            </span>
          </span>
          <span className="text-muted-foreground">
            L{" "}
            <span style={{ color: "oklch(0.65 0.18 20)" }}>
              {formatOHLC(selectedPair, hovered.low)}
            </span>
          </span>
          <span className="text-muted-foreground">
            C{" "}
            <span className="text-foreground font-bold">
              {formatOHLC(selectedPair, hovered.close)}
            </span>
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={`${selectedPair}-${selectedTF}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            style={{ minWidth: 600 }}
            role="img"
            aria-label={`${selectedPair} candlestick chart`}
          >
            <title>{selectedPair} Candlestick Chart</title>

            {/* Grid lines */}
            {gridPrices.map((price) => (
              <g key={price}>
                <line
                  x1={padding.left}
                  y1={priceToY(price)}
                  x2={width - padding.right}
                  y2={priceToY(price)}
                  stroke="oklch(0.27 0.04 240)"
                  strokeWidth={0.5}
                  strokeDasharray="4,4"
                />
                <text
                  x={padding.left - 6}
                  y={priceToY(price) + 4}
                  textAnchor="end"
                  fontSize={9.5}
                  fill="oklch(0.55 0.03 240)"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {formatOHLC(selectedPair, price)}
                </text>
              </g>
            ))}

            {/* Annotations */}
            {ANNOTATIONS.map((ann) => {
              const x1 = candleX(ann.startIdx);
              const x2 = candleX(ann.endIdx) + candleWidth;
              const allPrices = CANDLE_DATA.slice(
                ann.startIdx,
                ann.endIdx + 1,
              ).flatMap((c) => [c.high, c.low]);
              const zoneH = Math.max(...allPrices);
              const zoneL = Math.min(...allPrices);
              const y1 = priceToY(zoneH);
              const y2 = priceToY(zoneL);
              const labelY = ann.yPos === "top" ? y1 - 6 : y2 + 14;
              return (
                <g key={ann.label}>
                  <rect
                    x={x1}
                    y={y1}
                    width={x2 - x1}
                    height={y2 - y1}
                    fill={ann.color}
                    stroke={ann.borderColor}
                    strokeWidth={1}
                    rx={2}
                  />
                  <text
                    x={x1 + 4}
                    y={labelY}
                    fontSize={9}
                    fill={ann.borderColor}
                    fontFamily="Plus Jakarta Sans, sans-serif"
                    fontWeight={600}
                    letterSpacing={0.5}
                  >
                    {ann.label}
                  </text>
                </g>
              );
            })}

            {/* Candles */}
            {CANDLE_DATA.map((candle, i) => {
              const x = candleX(i);
              const isBull = candle.close >= candle.open;
              const color = isBull
                ? "oklch(0.76 0.17 150)"
                : "oklch(0.65 0.18 20)";
              const bodyTop = priceToY(Math.max(candle.open, candle.close));
              const bodyBot = priceToY(Math.min(candle.open, candle.close));
              const bodyH = Math.max(bodyBot - bodyTop, 1);
              const midX = x + candleWidth / 2;
              const isHovered = hoveredCandle === i;
              return (
                <g
                  key={candle.label}
                  onMouseEnter={() => setHoveredCandle(i)}
                  onMouseLeave={() => setHoveredCandle(null)}
                  style={{ cursor: "crosshair" }}
                >
                  {/* Hover hit area */}
                  <rect
                    x={x - gap / 2}
                    y={padding.top}
                    width={candleWidth + gap}
                    height={chartH}
                    fill="transparent"
                  />
                  {isHovered && (
                    <rect
                      x={x - gap / 2}
                      y={padding.top}
                      width={candleWidth + gap}
                      height={chartH}
                      fill="oklch(0.27 0.04 240 / 0.3)"
                      rx={2}
                    />
                  )}
                  <line
                    x1={midX}
                    y1={priceToY(candle.high)}
                    x2={midX}
                    y2={priceToY(candle.low)}
                    stroke={color}
                    strokeWidth={1}
                  />
                  <rect
                    x={x}
                    y={bodyTop}
                    width={candleWidth}
                    height={bodyH}
                    fill={color}
                    rx={1}
                    fillOpacity={isBull ? 0.9 : 0.85}
                  />
                </g>
              );
            })}

            {/* EMA line */}
            <polyline
              points={CANDLE_DATA.map(
                (c, i) =>
                  `${candleX(i) + candleWidth / 2},${priceToY((c.open + c.close) / 2)}`,
              ).join(" ")}
              fill="none"
              stroke="oklch(0.73 0.14 220 / 0.6)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-5 py-3 border-t border-border/40 text-xs">
        {ANNOTATIONS.map((ann) => (
          <div key={ann.label} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-sm inline-block"
              style={{
                background: ann.color,
                border: `1px solid ${ann.borderColor}`,
              }}
            />
            <span className="text-muted-foreground">{ann.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span
            className="w-6 h-0.5 inline-block"
            style={{ background: "oklch(0.73 0.14 220 / 0.6)" }}
          />
          <span className="text-muted-foreground">EMA20</span>
        </div>
      </div>
    </div>
  );
}
