import { Badge } from "@/components/ui/badge";
import {
  Bell,
  BellOff,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useAlertNotifications } from "../hooks/useAlertNotifications";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { useLivePrices } from "../hooks/useLivePrices";

const PAIRS = [
  "XAU/USD",
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "GBP/JPY",
  "EUR/JPY",
];
const TF_MINUTES: Record<string, number> = { M15: 15, H1: 60, H4: 240 };
const CANDLE_COUNT = 120;

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
  const volPct = isGold ? 0.0025 : isJPY ? 0.0018 : 0.0012;
  const vol = currentPrice * volPct;

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
  const slice = trs.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

type PatternDirection = "BULLISH" | "BEARISH" | "NEUTRAL";
type PatternStatus = "CONFIRMED" | "FORMING";

interface DetectedPattern {
  name: string;
  direction: PatternDirection;
  confidence: number;
  target: number;
  stop: number;
  status: PatternStatus;
  type: "chart" | "candle";
}

function findSwingHighs(candles: CandleData[], N = 3): number[] {
  const highs: number[] = [];
  for (let i = N; i < candles.length - N; i++) {
    let isHigh = true;
    for (let j = i - N; j <= i + N; j++) {
      if (j !== i && candles[j].high >= candles[i].high) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) highs.push(i);
  }
  return highs;
}

function findSwingLows(candles: CandleData[], N = 3): number[] {
  const lows: number[] = [];
  for (let i = N; i < candles.length - N; i++) {
    let isLow = true;
    for (let j = i - N; j <= i + N; j++) {
      if (j !== i && candles[j].low <= candles[i].low) {
        isLow = false;
        break;
      }
    }
    if (isLow) lows.push(i);
  }
  return lows;
}

function detectChartPatterns(
  candles: CandleData[],
  atr: number,
): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];
  const swingHighs = findSwingHighs(candles);
  const swingLows = findSwingLows(candles);
  const last = candles[candles.length - 1];
  const _priceRange =
    candles.reduce((r, c) => Math.max(r, c.high - c.low), 0) *
    CANDLE_COUNT *
    0.15;

  // Double Top
  if (swingHighs.length >= 2) {
    const h1 = swingHighs[swingHighs.length - 2];
    const h2 = swingHighs[swingHighs.length - 1];
    const diff = Math.abs(candles[h1].high - candles[h2].high);
    if (diff < atr * 0.8 && h2 - h1 > 8) {
      const neckline = Math.min(...candles.slice(h1, h2 + 1).map((c) => c.low));
      const height = candles[h1].high - neckline;
      const conf = Math.min(92, 70 + Math.round((1 - diff / (atr * 0.8)) * 22));
      patterns.push({
        name: "Double Top",
        direction: "BEARISH",
        confidence: conf,
        target: neckline - height,
        stop: candles[h2].high + atr * 0.5,
        status: last.close < neckline ? "CONFIRMED" : "FORMING",
        type: "chart",
      });
    }
  }

  // Double Bottom
  if (swingLows.length >= 2) {
    const l1 = swingLows[swingLows.length - 2];
    const l2 = swingLows[swingLows.length - 1];
    const diff = Math.abs(candles[l1].low - candles[l2].low);
    if (diff < atr * 0.8 && l2 - l1 > 8) {
      const neckline = Math.max(
        ...candles.slice(l1, l2 + 1).map((c) => c.high),
      );
      const height = neckline - candles[l1].low;
      const conf = Math.min(92, 70 + Math.round((1 - diff / (atr * 0.8)) * 22));
      patterns.push({
        name: "Double Bottom",
        direction: "BULLISH",
        confidence: conf,
        target: neckline + height,
        stop: candles[l2].low - atr * 0.5,
        status: last.close > neckline ? "CONFIRMED" : "FORMING",
        type: "chart",
      });
    }
  }

  // Head and Shoulders / Inverse
  if (swingHighs.length >= 3) {
    const [ls, head, rs] = swingHighs.slice(-3);
    const lsH = candles[ls].high;
    const headH = candles[head].high;
    const rsH = candles[rs].high;
    if (headH > lsH && headH > rsH && Math.abs(lsH - rsH) < atr * 1.2) {
      const neckline = (candles[ls].low + candles[rs].low) / 2;
      const height = headH - neckline;
      const conf = Math.min(
        88,
        65 + Math.round((1 - Math.abs(lsH - rsH) / (atr * 1.2)) * 23),
      );
      patterns.push({
        name: "Head & Shoulders",
        direction: "BEARISH",
        confidence: conf,
        target: neckline - height,
        stop: headH + atr * 0.3,
        status: last.close < neckline ? "CONFIRMED" : "FORMING",
        type: "chart",
      });
    }
  }

  if (swingLows.length >= 3) {
    const [ls, head, rs] = swingLows.slice(-3);
    const lsL = candles[ls].low;
    const headL = candles[head].low;
    const rsL = candles[rs].low;
    if (headL < lsL && headL < rsL && Math.abs(lsL - rsL) < atr * 1.2) {
      const neckline = (candles[ls].high + candles[rs].high) / 2;
      const height = neckline - headL;
      const conf = Math.min(
        88,
        65 + Math.round((1 - Math.abs(lsL - rsL) / (atr * 1.2)) * 23),
      );
      patterns.push({
        name: "Inv. Head & Shoulders",
        direction: "BULLISH",
        confidence: conf,
        target: neckline + height,
        stop: headL - atr * 0.3,
        status: last.close > neckline ? "CONFIRMED" : "FORMING",
        type: "chart",
      });
    }
  }

  // Ascending Triangle
  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const recentHighs = swingHighs.slice(-3);
    const recentLows = swingLows.slice(-3);
    const highVariance = recentHighs.reduce(
      (acc, i) =>
        acc + Math.abs(candles[i].high - candles[recentHighs[0]].high),
      0,
    );
    const isFlat = highVariance < atr * recentHighs.length * 0.4;
    const lowsAscending =
      recentLows.length >= 2 &&
      candles[recentLows[recentLows.length - 1]].low >
        candles[recentLows[0]].low;
    if (isFlat && lowsAscending) {
      const resistance = candles[recentHighs[0]].high;
      const conf = 72;
      patterns.push({
        name: "Ascending Triangle",
        direction: "BULLISH",
        confidence: conf,
        target: resistance + (resistance - candles[recentLows[0]].low),
        stop: candles[recentLows[recentLows.length - 1]].low - atr * 0.3,
        status: last.close > resistance ? "CONFIRMED" : "FORMING",
        type: "chart",
      });
    }
  }

  // Descending Triangle
  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const recentHighs = swingHighs.slice(-3);
    const recentLows = swingLows.slice(-3);
    const lowVariance = recentLows.reduce(
      (acc, i) => acc + Math.abs(candles[i].low - candles[recentLows[0]].low),
      0,
    );
    const isFlat = lowVariance < atr * recentLows.length * 0.4;
    const highsDescending =
      recentHighs.length >= 2 &&
      candles[recentHighs[recentHighs.length - 1]].high <
        candles[recentHighs[0]].high;
    if (isFlat && highsDescending) {
      const support = candles[recentLows[0]].low;
      const conf = 72;
      patterns.push({
        name: "Descending Triangle",
        direction: "BEARISH",
        confidence: conf,
        target: support - (candles[recentHighs[0]].high - support),
        stop: candles[recentHighs[recentHighs.length - 1]].high + atr * 0.3,
        status: last.close < support ? "CONFIRMED" : "FORMING",
        type: "chart",
      });
    }
  }

  // Symmetrical Triangle
  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const h1i = swingHighs[swingHighs.length - 2];
    const h2i = swingHighs[swingHighs.length - 1];
    const l1i = swingLows[swingLows.length - 2];
    const l2i = swingLows[swingLows.length - 1];
    const highsDescending = candles[h2i].high < candles[h1i].high;
    const lowsAscending = candles[l2i].low > candles[l1i].low;
    const converging =
      (candles[h1i].high - candles[l1i].low) * 0.7 >
      candles[h2i].high - candles[l2i].low;
    if (highsDescending && lowsAscending && converging) {
      const mid = (candles[h2i].high + candles[l2i].low) / 2;
      const conf = 68;
      patterns.push({
        name: "Symmetrical Triangle",
        direction: "NEUTRAL",
        confidence: conf,
        target: mid + (candles[h1i].high - candles[l1i].low) * 0.6,
        stop: candles[l2i].low - atr * 0.3,
        status: "FORMING",
        type: "chart",
      });
    }
  }

  // Bull Flag
  if (swingHighs.length >= 1 && candles.length >= 20) {
    const recent20 = candles.slice(-20);
    const firstHalf = recent20.slice(0, 10);
    const secondHalf = recent20.slice(10);
    const impulse = firstHalf[firstHalf.length - 1].close - firstHalf[0].close;
    const consolidation =
      secondHalf[secondHalf.length - 1].close - secondHalf[0].close;
    if (
      impulse > atr * 2 &&
      consolidation < 0 &&
      Math.abs(consolidation) < impulse * 0.5
    ) {
      const conf = 75;
      patterns.push({
        name: "Bull Flag",
        direction: "BULLISH",
        confidence: conf,
        target: last.close + impulse,
        stop: Math.min(...secondHalf.map((c) => c.low)) - atr * 0.3,
        status:
          last.close > firstHalf[firstHalf.length - 1].high
            ? "CONFIRMED"
            : "FORMING",
        type: "chart",
      });
    }
  }

  // Bear Flag
  if (candles.length >= 20) {
    const recent20 = candles.slice(-20);
    const firstHalf = recent20.slice(0, 10);
    const secondHalf = recent20.slice(10);
    const impulse = firstHalf[0].close - firstHalf[firstHalf.length - 1].close;
    const consolidation =
      secondHalf[secondHalf.length - 1].close - secondHalf[0].close;
    if (
      impulse > atr * 2 &&
      consolidation > 0 &&
      consolidation < impulse * 0.5
    ) {
      const conf = 75;
      patterns.push({
        name: "Bear Flag",
        direction: "BEARISH",
        confidence: conf,
        target: last.close - impulse,
        stop: Math.max(...secondHalf.map((c) => c.high)) + atr * 0.3,
        status:
          last.close < firstHalf[firstHalf.length - 1].low
            ? "CONFIRMED"
            : "FORMING",
        type: "chart",
      });
    }
  }

  // Rising Wedge
  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const h1i = swingHighs[swingHighs.length - 2];
    const h2i = swingHighs[swingHighs.length - 1];
    const l1i = swingLows[swingLows.length - 2];
    const l2i = swingLows[swingLows.length - 1];
    const highsRising = candles[h2i].high > candles[h1i].high;
    const lowsRising = candles[l2i].low > candles[l1i].low;
    const highsSlope = (candles[h2i].high - candles[h1i].high) / (h2i - h1i);
    const lowsSlope = (candles[l2i].low - candles[l1i].low) / (l2i - l1i);
    if (highsRising && lowsRising && lowsSlope > highsSlope * 1.1) {
      const conf = 70;
      patterns.push({
        name: "Rising Wedge",
        direction: "BEARISH",
        confidence: conf,
        target: candles[l1i].low,
        stop: candles[h2i].high + atr * 0.5,
        status: "FORMING",
        type: "chart",
      });
    }
  }

  // Falling Wedge
  if (swingHighs.length >= 2 && swingLows.length >= 2) {
    const h1i = swingHighs[swingHighs.length - 2];
    const h2i = swingHighs[swingHighs.length - 1];
    const l1i = swingLows[swingLows.length - 2];
    const l2i = swingLows[swingLows.length - 1];
    const highsFalling = candles[h2i].high < candles[h1i].high;
    const lowsFalling = candles[l2i].low < candles[l1i].low;
    const highsSlope = (candles[h1i].high - candles[h2i].high) / (h2i - h1i);
    const lowsSlope = (candles[l1i].low - candles[l2i].low) / (l2i - l1i);
    if (highsFalling && lowsFalling && highsSlope > lowsSlope * 1.1) {
      const conf = 70;
      patterns.push({
        name: "Falling Wedge",
        direction: "BULLISH",
        confidence: conf,
        target: candles[h1i].high,
        stop: candles[l2i].low - atr * 0.5,
        status: "FORMING",
        type: "chart",
      });
    }
  }

  // Cup and Handle
  if (candles.length >= 40) {
    const cupSection = candles.slice(-40, -10);
    const handleSection = candles.slice(-10);
    const cupLeft = cupSection[0].close;
    const cupRight = cupSection[cupSection.length - 1].close;
    const cupBottom = Math.min(...cupSection.map((c) => c.low));
    const isRounded =
      Math.abs(cupLeft - cupRight) < atr * 2 && cupBottom < cupLeft - atr * 3;
    const handleDown =
      handleSection[handleSection.length - 1].close < handleSection[0].close;
    if (isRounded && handleDown) {
      const conf = 73;
      const height = cupLeft - cupBottom;
      patterns.push({
        name: "Cup & Handle",
        direction: "BULLISH",
        confidence: conf,
        target: cupLeft + height,
        stop: Math.min(...handleSection.map((c) => c.low)) - atr * 0.3,
        status: "FORMING",
        type: "chart",
      });
    }
  }

  // ----- Candlestick Patterns (last 3 candles) -----
  const c = candles.slice(-3);
  if (c.length < 3) return patterns;
  const [c1, c2, c3] = c;
  const bodySize = (cd: CandleData) => Math.abs(cd.close - cd.open);
  const totalRange = (cd: CandleData) => cd.high - cd.low;

  // Doji
  if (bodySize(c3) < atr * 0.15 && totalRange(c3) > atr * 0.4) {
    patterns.push({
      name: "Doji",
      direction: "NEUTRAL",
      confidence: 62,
      target: last.close + atr * 1.2,
      stop: last.low - atr * 0.5,
      status: "CONFIRMED",
      type: "candle",
    });
  }

  // Hammer
  const hammerBody = bodySize(c3);
  const hammerLowerWick = Math.min(c3.open, c3.close) - c3.low;
  const hammerUpperWick = c3.high - Math.max(c3.open, c3.close);
  if (
    hammerLowerWick > hammerBody * 2 &&
    hammerUpperWick < hammerBody * 0.5 &&
    c3.close >= c3.open
  ) {
    patterns.push({
      name: "Hammer",
      direction: "BULLISH",
      confidence: 76,
      target: c3.close + atr * 1.5,
      stop: c3.low - atr * 0.3,
      status: "CONFIRMED",
      type: "candle",
    });
  }

  // Shooting Star
  const ssBody = bodySize(c3);
  const ssUpperWick = c3.high - Math.max(c3.open, c3.close);
  const ssLowerWick = Math.min(c3.open, c3.close) - c3.low;
  if (
    ssUpperWick > ssBody * 2 &&
    ssLowerWick < ssBody * 0.5 &&
    c3.close <= c3.open
  ) {
    patterns.push({
      name: "Shooting Star",
      direction: "BEARISH",
      confidence: 76,
      target: c3.close - atr * 1.5,
      stop: c3.high + atr * 0.3,
      status: "CONFIRMED",
      type: "candle",
    });
  }

  // Bullish Engulfing
  if (
    c2.close < c2.open &&
    c3.close > c3.open &&
    c3.close > c2.open &&
    c3.open < c2.close
  ) {
    patterns.push({
      name: "Bullish Engulfing",
      direction: "BULLISH",
      confidence: 82,
      target: c3.close + atr * 1.8,
      stop: c3.low - atr * 0.4,
      status: "CONFIRMED",
      type: "candle",
    });
  }

  // Bearish Engulfing
  if (
    c2.close > c2.open &&
    c3.close < c3.open &&
    c3.close < c2.open &&
    c3.open > c2.close
  ) {
    patterns.push({
      name: "Bearish Engulfing",
      direction: "BEARISH",
      confidence: 82,
      target: c3.close - atr * 1.8,
      stop: c3.high + atr * 0.4,
      status: "CONFIRMED",
      type: "candle",
    });
  }

  // Morning Star
  if (
    c1.close < c1.open &&
    bodySize(c2) < atr * 0.3 &&
    c3.close > c3.open &&
    c3.close > (c1.open + c1.close) / 2
  ) {
    patterns.push({
      name: "Morning Star",
      direction: "BULLISH",
      confidence: 84,
      target: c3.close + Math.abs(c1.close - c1.open),
      stop: c2.low - atr * 0.3,
      status: "CONFIRMED",
      type: "candle",
    });
  }

  // Evening Star
  if (
    c1.close > c1.open &&
    bodySize(c2) < atr * 0.3 &&
    c3.close < c3.open &&
    c3.close < (c1.open + c1.close) / 2
  ) {
    patterns.push({
      name: "Evening Star",
      direction: "BEARISH",
      confidence: 84,
      target: c3.close - Math.abs(c1.close - c1.open),
      stop: c2.high + atr * 0.3,
      status: "CONFIRMED",
      type: "candle",
    });
  }

  // Bullish Harami
  if (
    c2.close < c2.open &&
    c3.close > c3.open &&
    c3.close < c2.open &&
    c3.open > c2.close &&
    bodySize(c3) < bodySize(c2) * 0.6
  ) {
    patterns.push({
      name: "Bullish Harami",
      direction: "BULLISH",
      confidence: 68,
      target: c3.close + atr * 1.2,
      stop: c3.low - atr * 0.3,
      status: "FORMING",
      type: "candle",
    });
  }

  // Bearish Harami
  if (
    c2.close > c2.open &&
    c3.close < c3.open &&
    c3.close > c2.open &&
    c3.open < c2.close &&
    bodySize(c3) < bodySize(c2) * 0.6
  ) {
    patterns.push({
      name: "Bearish Harami",
      direction: "BEARISH",
      confidence: 68,
      target: c3.close - atr * 1.2,
      stop: c3.high + atr * 0.3,
      status: "FORMING",
      type: "candle",
    });
  }

  return patterns;
}

function fmtPrice(pair: string, price: number): string {
  if (pair === "XAU/USD") return `$${price.toFixed(2)}`;
  if (pair.includes("JPY")) return price.toFixed(2);
  return price.toFixed(4);
}

const DIRECTION_CONFIG: Record<
  PatternDirection,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  BULLISH: {
    label: "BULLISH",
    color: "#22c563",
    bg: "rgba(34,197,99,0.12)",
    icon: <TrendingUp className="w-3 h-3" />,
  },
  BEARISH: {
    label: "BEARISH",
    color: "#e55060",
    bg: "rgba(229,80,96,0.12)",
    icon: <TrendingDown className="w-3 h-3" />,
  },
  NEUTRAL: {
    label: "NEUTRAL",
    color: "#9ab0cc",
    bg: "rgba(154,176,204,0.12)",
    icon: null,
  },
};

export default function ChartPatternsSection() {
  const [selectedPair, setSelectedPair] = useState("XAU/USD");
  const [selectedTF, setSelectedTF] = useState("H1");
  const { prices } = useLivePrices();
  const {
    countdown,
    lastUpdated,
    refreshKey: _refreshKey,
    forceRefresh,
  } = useAutoRefresh(30);
  const { alertsEnabled, toggleAlerts, sendAlert } = useAlertNotifications();

  const currentPrice =
    prices[selectedPair] ??
    (selectedPair === "XAU/USD"
      ? 3058
      : selectedPair.includes("JPY")
        ? 149.8
        : 1.085);

  const candles = useMemo(
    () => generateCandles(currentPrice, selectedPair, selectedTF),
    [currentPrice, selectedPair, selectedTF],
  );
  const atr = useMemo(() => calcATR(candles), [candles]);
  const patterns = useMemo(
    () => detectChartPatterns(candles, atr),
    [candles, atr],
  );

  const prevPatternsRef = useRef<string[]>([]);
  useEffect(() => {
    const names = patterns
      .filter((p) => p.status === "CONFIRMED")
      .map((p) => p.name);
    const newPatterns = names.filter(
      (n) => !prevPatternsRef.current.includes(n),
    );
    for (const name of newPatterns) {
      const p = patterns.find((x) => x.name === name)!;
      sendAlert(
        `Pattern Detected – ${selectedPair}`,
        `${name} (${p.direction}) confirmed on ${selectedTF}`,
      );
    }
    prevPatternsRef.current = names;
  });

  const formattedTime = lastUpdated.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const chartPatterns = patterns.filter((p) => p.type === "chart");
  const candlePatterns = patterns.filter((p) => p.type === "candle");

  return (
    <section
      id="chart-patterns"
      style={{ background: "oklch(0.14 0.025 240)" }}
      className="py-12 px-4"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-1.5 h-6 rounded-full"
                style={{ background: "oklch(0.68 0.18 220)" }}
              />
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Chart Pattern Detection
              </h2>
            </div>
            <p style={{ color: "oklch(0.58 0.08 240)" }} className="text-sm">
              Real-time detection of {patterns.length} active pattern
              {patterns.length !== 1 ? "s" : ""} across chart &amp; candlestick
              formations
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 text-xs"
              style={{ color: "oklch(0.58 0.08 240)" }}
            >
              <RefreshCw
                className="w-3 h-3 animate-spin"
                style={{ animationDuration: "3s" }}
              />
              <span>
                Refreshing in{" "}
                <span className="text-white font-mono">{countdown}s</span>
              </span>
            </div>
            <button
              type="button"
              onClick={toggleAlerts}
              data-ocid="chart_patterns.toggle"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: alertsEnabled
                  ? "oklch(0.22 0.06 220)"
                  : "oklch(0.19 0.04 240)",
                border: `1px solid ${alertsEnabled ? "oklch(0.4 0.12 220)" : "oklch(0.26 0.05 240)"}`,
                color: alertsEnabled
                  ? "oklch(0.78 0.14 220)"
                  : "oklch(0.58 0.08 240)",
              }}
            >
              {alertsEnabled ? (
                <Bell className="w-3 h-3" fill="currentColor" />
              ) : (
                <BellOff className="w-3 h-3" />
              )}
              {alertsEnabled ? "Alerts On" : "Alerts Off"}
            </button>
            <button
              type="button"
              onClick={forceRefresh}
              data-ocid="chart_patterns.secondary_button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{
                background: "oklch(0.22 0.06 220)",
                border: "1px solid oklch(0.32 0.1 220)",
                color: "oklch(0.78 0.14 220)",
              }}
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{
              background: "oklch(0.17 0.03 240)",
              border: "1px solid oklch(0.22 0.04 240 / 0.6)",
            }}
          >
            {PAIRS.map((pair) => (
              <button
                type="button"
                key={pair}
                data-ocid="chart_patterns.tab"
                onClick={() => setSelectedPair(pair)}
                className="px-3 py-1 text-xs font-medium rounded-md transition-all"
                style={{
                  background:
                    selectedPair === pair
                      ? "oklch(0.26 0.1 220)"
                      : "transparent",
                  color:
                    selectedPair === pair
                      ? "oklch(0.88 0.12 220)"
                      : "oklch(0.58 0.08 240)",
                  border:
                    selectedPair === pair
                      ? "1px solid oklch(0.36 0.14 220)"
                      : "1px solid transparent",
                }}
              >
                {pair}
              </button>
            ))}
          </div>
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{
              background: "oklch(0.17 0.03 240)",
              border: "1px solid oklch(0.22 0.04 240 / 0.6)",
            }}
          >
            {Object.keys(TF_MINUTES).map((tf) => (
              <button
                type="button"
                key={tf}
                onClick={() => setSelectedTF(tf)}
                className="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                style={{
                  background:
                    selectedTF === tf ? "oklch(0.26 0.1 220)" : "transparent",
                  color:
                    selectedTF === tf
                      ? "oklch(0.88 0.12 220)"
                      : "oklch(0.58 0.08 240)",
                }}
              >
                {tf}
              </button>
            ))}
          </div>
          <div
            className="ml-auto flex items-center gap-2 text-xs"
            style={{ color: "oklch(0.45 0.06 240)" }}
          >
            <span>
              Last updated: <span className="text-white">{formattedTime}</span>
            </span>
            <span>·</span>
            <span>
              Price:{" "}
              <span
                className="font-mono"
                style={{ color: "oklch(0.78 0.14 220)" }}
              >
                {fmtPrice(selectedPair, currentPrice)}
              </span>
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            {
              label: "Total Patterns",
              value: patterns.length,
              color: "oklch(0.68 0.14 220)",
            },
            {
              label: "Bullish",
              value: patterns.filter((p) => p.direction === "BULLISH").length,
              color: "#22c563",
            },
            {
              label: "Bearish",
              value: patterns.filter((p) => p.direction === "BEARISH").length,
              color: "#e55060",
            },
            {
              label: "Confirmed",
              value: patterns.filter((p) => p.status === "CONFIRMED").length,
              color: "oklch(0.78 0.14 60)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl p-4 flex items-center justify-between"
              style={{
                background: "oklch(0.17 0.03 240)",
                border: "1px solid oklch(0.22 0.04 240 / 0.6)",
              }}
            >
              <span
                className="text-xs"
                style={{ color: "oklch(0.58 0.08 240)" }}
              >
                {stat.label}
              </span>
              <span
                className="text-2xl font-bold"
                style={{ color: stat.color }}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>

        {/* Chart Patterns */}
        {chartPatterns.length > 0 && (
          <div className="mb-8">
            <h3
              className="text-sm font-semibold uppercase tracking-widest mb-4"
              style={{ color: "oklch(0.58 0.08 240)" }}
            >
              Chart Patterns ({chartPatterns.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {chartPatterns.map((p, i) => (
                <PatternCard
                  key={p.name}
                  pattern={p}
                  pair={selectedPair}
                  index={i + 1}
                />
              ))}
            </div>
          </div>
        )}

        {/* Candlestick Patterns */}
        {candlePatterns.length > 0 && (
          <div>
            <h3
              className="text-sm font-semibold uppercase tracking-widest mb-4"
              style={{ color: "oklch(0.58 0.08 240)" }}
            >
              Candlestick Patterns ({candlePatterns.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {candlePatterns.map((p, i) => (
                <PatternCard
                  key={p.name}
                  pattern={p}
                  pair={selectedPair}
                  index={i + 1}
                />
              ))}
            </div>
          </div>
        )}

        {patterns.length === 0 && (
          <div
            data-ocid="chart_patterns.empty_state"
            className="text-center py-16 rounded-xl"
            style={{
              background: "oklch(0.17 0.03 240)",
              border: "1px solid oklch(0.22 0.04 240 / 0.6)",
            }}
          >
            <div className="text-4xl mb-3">📊</div>
            <p className="text-white font-semibold">No patterns detected</p>
            <p
              className="text-sm mt-1"
              style={{ color: "oklch(0.58 0.08 240)" }}
            >
              Switch timeframe or pair to scan for patterns
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function PatternCard({
  pattern,
  pair,
  index,
}: { pattern: DetectedPattern; pair: string; index: number }) {
  const dir = DIRECTION_CONFIG[pattern.direction];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      data-ocid={`chart_patterns.item.${index}`}
      className="rounded-xl p-4"
      style={{
        background: "oklch(0.17 0.03 240)",
        border: "1px solid oklch(0.22 0.04 240 / 0.6)",
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-white mb-1">
            {pattern.name}
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ color: dir.color, background: dir.bg }}
            >
              {dir.icon}
              {dir.label}
            </span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                color:
                  pattern.status === "CONFIRMED"
                    ? "oklch(0.88 0.14 150)"
                    : "oklch(0.78 0.12 60)",
                background:
                  pattern.status === "CONFIRMED"
                    ? "rgba(34,197,99,0.1)"
                    : "rgba(251,191,36,0.1)",
              }}
            >
              {pattern.status}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs" style={{ color: "oklch(0.58 0.08 240)" }}>
            Confidence
          </div>
          <div
            className="text-lg font-bold"
            style={{
              color:
                pattern.confidence >= 80
                  ? "#22c563"
                  : pattern.confidence >= 70
                    ? "oklch(0.82 0.16 60)"
                    : "oklch(0.58 0.08 240)",
            }}
          >
            {pattern.confidence}%
          </div>
        </div>
      </div>

      {/* Price targets */}
      <div className="grid grid-cols-2 gap-2">
        <div
          className="rounded-lg p-2"
          style={{ background: "oklch(0.14 0.025 240)" }}
        >
          <div
            className="text-xs mb-0.5"
            style={{ color: "oklch(0.58 0.08 240)" }}
          >
            Target
          </div>
          <div
            className="text-xs font-mono font-semibold"
            style={{ color: "#22c563" }}
          >
            {fmtPrice(pair, pattern.target)}
          </div>
        </div>
        <div
          className="rounded-lg p-2"
          style={{ background: "oklch(0.14 0.025 240)" }}
        >
          <div
            className="text-xs mb-0.5"
            style={{ color: "oklch(0.58 0.08 240)" }}
          >
            Stop
          </div>
          <div
            className="text-xs font-mono font-semibold"
            style={{ color: "#e55060" }}
          >
            {fmtPrice(pair, pattern.stop)}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
