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
const TIMEFRAMES = ["M5", "M15", "H1", "H4", "D1"];
const TF_MINUTES: Record<string, number> = {
  M5: 5,
  M15: 15,
  H1: 60,
  H4: 240,
  D1: 1440,
};
const CANDLE_COUNT = 150;

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
}

function srand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function generateCandles(
  basePrice: number,
  pair: string,
  tf: string,
  refreshCycle: number,
): Candle[] {
  const pairHash = pair.split("").reduce((a, c) => a + c.charCodeAt(0) * 31, 0);
  const tfHash = (TF_MINUTES[tf] ?? 60) * 7;
  const seed = (pairHash + tfHash + refreshCycle * 997) >>> 0;
  const rand = srand(seed);

  const isGold = pair === "XAU/USD";
  const isJPY = pair.includes("JPY");
  const volPct = isGold ? 0.003 : isJPY ? 0.002 : 0.0015;
  const vol = basePrice * volPct;

  const closes: number[] = new Array(CANDLE_COUNT);
  closes[CANDLE_COUNT - 1] = basePrice;
  for (let i = CANDLE_COUNT - 2; i >= 0; i--) {
    closes[i] = closes[i + 1] + (rand() - 0.5) * vol * 2;
  }

  const candles: Candle[] = [];
  for (let i = 0; i < CANDLE_COUNT; i++) {
    const close = closes[i];
    const open = i === 0 ? close + (rand() - 0.5) * vol : closes[i - 1];
    const wickFactor = 0.8;
    const wick1 = vol * rand() * wickFactor;
    const wick2 = vol * rand() * wickFactor;
    const high = Math.max(open, close) + wick1;
    const low = Math.min(open, close) - wick2;
    candles.push({ open, high, low, close });
  }
  return candles;
}

function calcATR(candles: Candle[], period = 14): number {
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
  return slice.reduce((a, b) => a + b, 0) / Math.max(slice.length, 1);
}

type Bias = "Bullish" | "Bearish" | "Neutral";
type Category = "Single" | "Two-Candle" | "Three-Candle";

interface PatternDef {
  id: string;
  name: string;
  category: Category;
  bias: Bias;
  description: string;
  detect: (candles: Candle[], atr: number) => boolean;
  confidence: number;
}

const body = (c: Candle) => Math.abs(c.close - c.open);
const range = (c: Candle) => c.high - c.low;
const upperWick = (c: Candle) => c.high - Math.max(c.open, c.close);
const lowerWick = (c: Candle) => Math.min(c.open, c.close) - c.low;
const isBull = (c: Candle) => c.close >= c.open;
const isBear = (c: Candle) => c.close < c.open;
const mid = (c: Candle) => (c.open + c.close) / 2;

const PATTERNS: PatternDef[] = [
  // ========== BULLISH SINGLE (5) ==========
  {
    id: "hammer",
    name: "Hammer",
    category: "Single",
    bias: "Bullish",
    description:
      "Small body at the top, long lower wick ≥ 2× body — bullish reversal after downtrend.",
    confidence: 78,
    detect: (cs, atr) => {
      const c = cs[cs.length - 1];
      const b = body(c);
      const lw = lowerWick(c);
      const uw = upperWick(c);
      return b > 0 && lw >= b * 2 && uw <= b * 0.5 && b < atr * 0.6;
    },
  },
  {
    id: "inverted_hammer",
    name: "Inverted Hammer",
    category: "Single",
    bias: "Bullish",
    description:
      "Small body at bottom, long upper wick ≥ 2× body, bullish candle — potential reversal up.",
    confidence: 72,
    detect: (cs, atr) => {
      const c = cs[cs.length - 1];
      const b = body(c);
      const uw = upperWick(c);
      const lw = lowerWick(c);
      return (
        b > 0 && uw >= b * 2 && lw <= b * 0.5 && isBull(c) && b < atr * 0.6
      );
    },
  },
  {
    id: "bullish_spinning_top",
    name: "Bullish Spinning Top",
    category: "Single",
    bias: "Bullish",
    description:
      "Small bullish body centered with equal wicks on both sides — bulls gaining control.",
    confidence: 65,
    detect: (cs, atr) => {
      const c = cs[cs.length - 1];
      const b = body(c);
      const r = range(c);
      const uw = upperWick(c);
      const lw = lowerWick(c);
      return (
        isBull(c) &&
        b < r * 0.35 &&
        uw >= atr * 0.15 &&
        lw >= atr * 0.15 &&
        Math.abs(uw - lw) < atr * 0.25
      );
    },
  },
  {
    id: "dragonfly_doji",
    name: "Dragonfly Doji",
    category: "Single",
    bias: "Bullish",
    description:
      "Open/close at the high, long lower shadow — strong bullish rejection from lows.",
    confidence: 76,
    detect: (cs, atr) => {
      const c = cs[cs.length - 1];
      const b = body(c);
      const r = range(c);
      return (
        r > atr * 0.3 &&
        b <= r * 0.1 &&
        lowerWick(c) >= r * 0.65 &&
        upperWick(c) <= atr * 0.08
      );
    },
  },
  {
    id: "bullish_marubozu",
    name: "Bullish Marubozu",
    category: "Single",
    bias: "Bullish",
    description:
      "Full bullish body with no wicks — relentless buying pressure throughout the entire session.",
    confidence: 82,
    detect: (cs, atr) => {
      const c = cs[cs.length - 1];
      const b = body(c);
      const r = range(c);
      return (
        isBull(c) &&
        b >= r * 0.9 &&
        upperWick(c) <= atr * 0.05 &&
        lowerWick(c) <= atr * 0.05
      );
    },
  },

  // ========== BEARISH SINGLE (5) ==========
  {
    id: "shooting_star",
    name: "Shooting Star",
    category: "Single",
    bias: "Bearish",
    description:
      "Long upper wick ≥ 2× body, small bearish body — rejection from highs, reversal signal.",
    confidence: 78,
    detect: (cs, atr) => {
      const c = cs[cs.length - 1];
      const b = body(c);
      const uw = upperWick(c);
      const lw = lowerWick(c);
      return (
        b > 0 && uw >= b * 2 && lw <= b * 0.5 && isBear(c) && b < atr * 0.6
      );
    },
  },
  {
    id: "hanging_man",
    name: "Hanging Man",
    category: "Single",
    bias: "Bearish",
    description:
      "Hammer shape appearing in an uptrend — bearish reversal warning, selling pressure lurking.",
    confidence: 70,
    detect: (cs, atr) => {
      if (cs.length < 6) return false;
      const c = cs[cs.length - 1];
      const b = body(c);
      const lw = lowerWick(c);
      const uw = upperWick(c);
      const prev5 = cs.slice(-6, -1);
      const isUptrend = prev5[prev5.length - 1].close > prev5[0].close;
      return (
        isUptrend && b > 0 && lw >= b * 2 && uw <= b * 0.5 && b < atr * 0.6
      );
    },
  },
  {
    id: "bearish_spinning_top",
    name: "Bearish Spinning Top",
    category: "Single",
    bias: "Bearish",
    description:
      "Small bearish body centered with equal wicks on both sides — bears taking control.",
    confidence: 65,
    detect: (cs, atr) => {
      const c = cs[cs.length - 1];
      const b = body(c);
      const r = range(c);
      const uw = upperWick(c);
      const lw = lowerWick(c);
      return (
        isBear(c) &&
        b < r * 0.35 &&
        uw >= atr * 0.15 &&
        lw >= atr * 0.15 &&
        Math.abs(uw - lw) < atr * 0.25
      );
    },
  },
  {
    id: "gravestone_doji",
    name: "Gravestone Doji",
    category: "Single",
    bias: "Bearish",
    description:
      "Open/close at the low, long upper shadow — strong bearish rejection, sellers in control.",
    confidence: 74,
    detect: (cs, atr) => {
      const c = cs[cs.length - 1];
      const b = body(c);
      const r = range(c);
      return (
        r > atr * 0.3 &&
        b <= r * 0.1 &&
        upperWick(c) >= r * 0.65 &&
        lowerWick(c) <= atr * 0.08
      );
    },
  },
  {
    id: "bearish_marubozu",
    name: "Bearish Marubozu",
    category: "Single",
    bias: "Bearish",
    description:
      "Full bearish body with no wicks — overwhelming selling pressure dominating the session.",
    confidence: 82,
    detect: (cs, atr) => {
      const c = cs[cs.length - 1];
      const b = body(c);
      const r = range(c);
      return (
        isBear(c) &&
        b >= r * 0.9 &&
        upperWick(c) <= atr * 0.05 &&
        lowerWick(c) <= atr * 0.05
      );
    },
  },

  // ========== BULLISH TWO-CANDLE (4) ==========
  {
    id: "bullish_engulfing",
    name: "Bullish Engulfing",
    category: "Two-Candle",
    bias: "Bullish",
    description:
      "Bearish candle fully engulfed by a larger bullish candle — high-probability bullish reversal.",
    confidence: 85,
    detect: (cs) => {
      if (cs.length < 2) return false;
      const [c1, c2] = cs.slice(-2);
      return (
        isBear(c1) && isBull(c2) && c2.open < c1.close && c2.close > c1.open
      );
    },
  },
  {
    id: "bullish_harami",
    name: "Bullish Harami",
    category: "Two-Candle",
    bias: "Bullish",
    description:
      "Small bullish candle inside a large bearish mother bar — bearish momentum slowing.",
    confidence: 68,
    detect: (cs) => {
      if (cs.length < 2) return false;
      const [c1, c2] = cs.slice(-2);
      return (
        isBear(c1) &&
        isBull(c2) &&
        c2.open > c1.close &&
        c2.close < c1.open &&
        body(c2) < body(c1) * 0.55
      );
    },
  },
  {
    id: "rising_sun",
    name: "Rising Sun",
    category: "Two-Candle",
    bias: "Bullish",
    description:
      "Bullish candle opens below prior low and closes above midpoint — dawn of a bullish reversal.",
    confidence: 75,
    detect: (cs) => {
      if (cs.length < 2) return false;
      const [c1, c2] = cs.slice(-2);
      return (
        isBear(c1) &&
        isBull(c2) &&
        c2.open < c1.low &&
        c2.close > mid(c1) &&
        c2.close < c1.open
      );
    },
  },
  {
    id: "tweezer_bottom",
    name: "Tweezer Bottom",
    category: "Two-Candle",
    bias: "Bullish",
    description:
      "Two candles share the same low — support zone confirmed, bullish reversal incoming.",
    confidence: 70,
    detect: (cs, atr) => {
      if (cs.length < 2) return false;
      const [c1, c2] = cs.slice(-2);
      return Math.abs(c1.low - c2.low) < atr * 0.12 && isBear(c1) && isBull(c2);
    },
  },

  // ========== BEARISH TWO-CANDLE (4) ==========
  {
    id: "bearish_engulfing",
    name: "Bearish Engulfing",
    category: "Two-Candle",
    bias: "Bearish",
    description:
      "Bullish candle fully engulfed by a larger bearish candle — high-probability bearish reversal.",
    confidence: 85,
    detect: (cs) => {
      if (cs.length < 2) return false;
      const [c1, c2] = cs.slice(-2);
      return (
        isBull(c1) && isBear(c2) && c2.open > c1.close && c2.close < c1.open
      );
    },
  },
  {
    id: "bearish_harami",
    name: "Bearish Harami",
    category: "Two-Candle",
    bias: "Bearish",
    description:
      "Small bearish candle inside a large bullish mother bar — bullish momentum weakening.",
    confidence: 68,
    detect: (cs) => {
      if (cs.length < 2) return false;
      const [c1, c2] = cs.slice(-2);
      return (
        isBull(c1) &&
        isBear(c2) &&
        c2.open < c1.close &&
        c2.close > c1.open &&
        body(c2) < body(c1) * 0.55
      );
    },
  },
  {
    id: "dark_cloud_cover",
    name: "Dark Cloud Cover",
    category: "Two-Candle",
    bias: "Bearish",
    description:
      "Bearish candle opens above prior high and closes below midpoint — dark omen for bulls.",
    confidence: 75,
    detect: (cs) => {
      if (cs.length < 2) return false;
      const [c1, c2] = cs.slice(-2);
      return (
        isBull(c1) &&
        isBear(c2) &&
        c2.open > c1.high &&
        c2.close < mid(c1) &&
        c2.close > c1.open
      );
    },
  },
  {
    id: "tweezer_top",
    name: "Tweezer Top",
    category: "Two-Candle",
    bias: "Bearish",
    description:
      "Two candles share the same high — resistance zone confirmed, bearish reversal incoming.",
    confidence: 70,
    detect: (cs, atr) => {
      if (cs.length < 2) return false;
      const [c1, c2] = cs.slice(-2);
      return (
        Math.abs(c1.high - c2.high) < atr * 0.12 && isBull(c1) && isBear(c2)
      );
    },
  },

  // ========== BULLISH THREE-CANDLE (4) ==========
  {
    id: "morning_star",
    name: "Morning Star",
    category: "Three-Candle",
    bias: "Bullish",
    description:
      "Bearish candle, small indecision star, strong bullish close — powerful bottom reversal.",
    confidence: 86,
    detect: (cs, atr) => {
      if (cs.length < 3) return false;
      const [c1, c2, c3] = cs.slice(-3);
      return (
        isBear(c1) &&
        body(c2) < atr * 0.4 &&
        isBull(c3) &&
        c3.close > mid(c1) &&
        body(c1) > atr * 0.5
      );
    },
  },
  {
    id: "three_white_soldiers",
    name: "Three White Soldiers",
    category: "Three-Candle",
    bias: "Bullish",
    description:
      "Three consecutive strong bullish candles, each closing higher — relentless bullish momentum.",
    confidence: 88,
    detect: (cs, atr) => {
      if (cs.length < 3) return false;
      const [c1, c2, c3] = cs.slice(-3);
      return (
        isBull(c1) &&
        isBull(c2) &&
        isBull(c3) &&
        c2.open > c1.open &&
        c2.open < c1.close &&
        c3.open > c2.open &&
        c3.open < c2.close &&
        body(c1) > atr * 0.4 &&
        body(c2) > atr * 0.4 &&
        body(c3) > atr * 0.4
      );
    },
  },
  {
    id: "three_inside_up",
    name: "Three Inside Up",
    category: "Three-Candle",
    bias: "Bullish",
    description:
      "Bearish candle, bullish harami, then bullish confirmation close — trend reversal confirmed.",
    confidence: 80,
    detect: (cs) => {
      if (cs.length < 3) return false;
      const [c1, c2, c3] = cs.slice(-3);
      return (
        isBear(c1) &&
        isBull(c2) &&
        c2.open > c1.close &&
        c2.close < c1.open &&
        isBull(c3) &&
        c3.close > c2.close
      );
    },
  },
  {
    id: "three_white_strike",
    name: "Three White Strike",
    category: "Three-Candle",
    bias: "Bullish",
    description:
      "Three consecutive bullish candles followed by a large bearish strike below c1 open — buy the dip signal.",
    confidence: 82,
    detect: (cs, atr) => {
      if (cs.length < 4) return false;
      const [c1, c2, c3, c4] = cs.slice(-4);
      return (
        isBull(c1) &&
        isBull(c2) &&
        isBull(c3) &&
        c2.close > c1.close &&
        c3.close > c2.close &&
        isBear(c4) &&
        c4.open > c3.close &&
        c4.close < c1.open &&
        body(c4) > atr * 0.5
      );
    },
  },

  // ========== BEARISH THREE-CANDLE (4) ==========
  {
    id: "evening_star",
    name: "Evening Star",
    category: "Three-Candle",
    bias: "Bearish",
    description:
      "Bullish candle, small indecision star, strong bearish close — powerful top reversal.",
    confidence: 86,
    detect: (cs, atr) => {
      if (cs.length < 3) return false;
      const [c1, c2, c3] = cs.slice(-3);
      return (
        isBull(c1) &&
        body(c2) < atr * 0.4 &&
        isBear(c3) &&
        c3.close < mid(c1) &&
        body(c1) > atr * 0.5
      );
    },
  },
  {
    id: "three_black_crows",
    name: "Three Black Crows",
    category: "Three-Candle",
    bias: "Bearish",
    description:
      "Three consecutive strong bearish candles, each closing lower — relentless bearish momentum.",
    confidence: 88,
    detect: (cs, atr) => {
      if (cs.length < 3) return false;
      const [c1, c2, c3] = cs.slice(-3);
      return (
        isBear(c1) &&
        isBear(c2) &&
        isBear(c3) &&
        c2.open < c1.open &&
        c2.open > c1.close &&
        c3.open < c2.open &&
        c3.open > c2.close &&
        body(c1) > atr * 0.4 &&
        body(c2) > atr * 0.4 &&
        body(c3) > atr * 0.4
      );
    },
  },
  {
    id: "three_inside_down",
    name: "Three Inside Down",
    category: "Three-Candle",
    bias: "Bearish",
    description:
      "Bullish candle, bearish harami, then bearish confirmation close — trend reversal confirmed.",
    confidence: 80,
    detect: (cs) => {
      if (cs.length < 3) return false;
      const [c1, c2, c3] = cs.slice(-3);
      return (
        isBull(c1) &&
        isBear(c2) &&
        c2.open < c1.close &&
        c2.close > c1.open &&
        isBear(c3) &&
        c3.close < c2.close
      );
    },
  },
  {
    id: "bearish_abandoned_baby",
    name: "Bearish Abandoned Baby",
    category: "Three-Candle",
    bias: "Bearish",
    description:
      "Bullish, isolated doji gap up, bearish gap down — rare, highly reliable top reversal.",
    confidence: 92,
    detect: (cs, atr) => {
      if (cs.length < 3) return false;
      const [c1, c2, c3] = cs.slice(-3);
      const dojiC2 = body(c2) <= range(c2) * 0.12;
      const gapUp = c2.low > Math.max(c1.open, c1.close);
      const gapDown = c3.high < Math.min(c2.open, c2.close);
      return (
        isBull(c1) &&
        dojiC2 &&
        gapUp &&
        isBear(c3) &&
        gapDown &&
        body(c1) > atr * 0.5
      );
    },
  },
];

// ============================================================
// Signal Generator
// ============================================================

interface TradeSignal {
  entry: number;
  sl: number;
  tp: number;
  rr: number;
  direction: "BUY" | "SELL";
}

function generateSignal(
  pattern: PatternDef,
  price: number,
  atr: number,
): TradeSignal | null {
  const isBullish = pattern.bias === "Bullish";
  const isBearish = pattern.bias === "Bearish";
  if (!isBullish && !isBearish) return null;

  const slMult =
    pattern.category === "Single"
      ? 1.2
      : pattern.category === "Two-Candle"
        ? 1.5
        : 1.8;
  const tpMult = slMult * 2;

  const entry = price;
  const sl = isBullish ? price - atr * slMult : price + atr * slMult;
  const tp = isBullish ? price + atr * tpMult : price - atr * tpMult;
  const rr = 2.0;

  return {
    entry,
    sl,
    tp,
    rr,
    direction: isBullish ? "BUY" : "SELL",
  };
}

// ============================================================
// Mini SVG Candle Illustrations
// ============================================================

const BULL_COLOR = "#26D7C6";
const BEAR_COLOR = "#e55060";
const NEUTRAL_COLOR = "#7a94b0";

function CandleSvg({ bodies }: { bodies: CandleShape[] }) {
  const W = 72;
  const H = 80;
  const n = bodies.length;
  const slotW = W / n;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {bodies.map((c, slotIdx) => {
        const cx = slotW * slotIdx + slotW / 2;
        const bw = Math.max(6, slotW * 0.5);
        const slotKey = `slot-${slotIdx}-${c.color.slice(1, 4)}`;
        return (
          <g key={slotKey}>
            <line
              x1={cx}
              y1={c.wickTopY}
              x2={cx}
              y2={c.bodyTopY}
              stroke={c.color}
              strokeWidth={1.5}
            />
            <line
              x1={cx}
              y1={c.bodyBotY}
              x2={cx}
              y2={c.wickBotY}
              stroke={c.color}
              strokeWidth={1.5}
            />
            <rect
              x={cx - bw / 2}
              y={c.bodyTopY}
              width={bw}
              height={Math.max(2, c.bodyBotY - c.bodyTopY)}
              fill={c.fill || c.color}
              stroke={c.color}
              strokeWidth={1}
              rx={1}
            />
          </g>
        );
      })}
    </svg>
  );
}

interface CandleShape {
  wickTopY: number;
  bodyTopY: number;
  bodyBotY: number;
  wickBotY: number;
  color: string;
  fill?: string;
}

function mkCandle(
  wickTop: number,
  bodyTop: number,
  bodyBot: number,
  wickBot: number,
  color: string,
  filled = true,
): CandleShape {
  return {
    wickTopY: wickTop,
    bodyTopY: bodyTop,
    bodyBotY: bodyBot,
    wickBotY: wickBot,
    color,
    fill: filled ? color : "transparent",
  };
}

function mkC(
  high: number,
  open: number,
  close: number,
  low: number,
  bull: boolean,
): CandleShape {
  const color = bull ? BULL_COLOR : BEAR_COLOR;
  const bodyTop = Math.min(open, close);
  const bodyBot = Math.max(open, close);
  return mkCandle(high, bodyTop, bodyBot, low, color);
}

const SVG_LIBRARY: Record<string, React.ReactNode> = {
  // ---- Bullish Single ----
  hammer: <CandleSvg bodies={[mkCandle(14, 12, 28, 70, BULL_COLOR)]} />,
  inverted_hammer: (
    <CandleSvg bodies={[mkCandle(10, 44, 58, 60, BULL_COLOR)]} />
  ),
  bullish_spinning_top: <CandleSvg bodies={[mkC(10, 32, 48, 70, true)]} />,
  dragonfly_doji: <CandleSvg bodies={[mkCandle(18, 18, 20, 72, BULL_COLOR)]} />,
  bullish_marubozu: (
    <CandleSvg bodies={[mkCandle(14, 14, 66, 66, BULL_COLOR)]} />
  ),

  // ---- Bearish Single ----
  shooting_star: (
    <CandleSvg bodies={[mkCandle(10, 44, 58, 60, BEAR_COLOR, true)]} />
  ),
  hanging_man: <CandleSvg bodies={[mkCandle(14, 12, 28, 70, BEAR_COLOR)]} />,
  bearish_spinning_top: <CandleSvg bodies={[mkC(10, 32, 48, 70, false)]} />,
  gravestone_doji: <CandleSvg bodies={[mkCandle(8, 60, 62, 62, BEAR_COLOR)]} />,
  bearish_marubozu: (
    <CandleSvg bodies={[mkCandle(14, 14, 66, 66, BEAR_COLOR)]} />
  ),

  // ---- Bullish Two-Candle ----
  bullish_engulfing: (
    <CandleSvg
      bodies={[mkC(16, 28, 56, 64, false), mkC(12, 14, 68, 72, true)]}
    />
  ),
  bullish_harami: (
    <CandleSvg
      bodies={[mkC(14, 16, 64, 68, false), mkC(28, 30, 50, 54, true)]}
    />
  ),
  rising_sun: (
    <CandleSvg
      bodies={[mkC(10, 14, 60, 65, false), mkC(48, 50, 22, 18, true)]}
    />
  ),
  tweezer_bottom: (
    <CandleSvg
      bodies={[mkC(20, 28, 60, 70, false), mkC(22, 40, 68, 70, true)]}
    />
  ),

  // ---- Bearish Two-Candle ----
  bearish_engulfing: (
    <CandleSvg
      bodies={[mkC(12, 14, 52, 60, true), mkC(8, 10, 66, 72, false)]}
    />
  ),
  bearish_harami: (
    <CandleSvg
      bodies={[mkC(14, 16, 64, 68, true), mkC(28, 30, 50, 54, false)]}
    />
  ),
  dark_cloud_cover: (
    <CandleSvg
      bodies={[mkC(10, 14, 60, 65, true), mkC(8, 10, 50, 70, false)]}
    />
  ),
  tweezer_top: (
    <CandleSvg
      bodies={[mkC(10, 12, 40, 50, true), mkC(10, 30, 56, 65, false)]}
    />
  ),

  // ---- Bullish Three-Candle ----
  morning_star: (
    <CandleSvg
      bodies={[
        mkC(8, 10, 50, 55, false),
        mkC(56, 58, 64, 68, true),
        mkC(18, 20, 32, 36, true),
      ]}
    />
  ),
  three_white_soldiers: (
    <CandleSvg
      bodies={[
        mkC(38, 40, 58, 60, true),
        mkC(24, 32, 48, 50, true),
        mkC(10, 18, 34, 36, true),
      ]}
    />
  ),
  three_inside_up: (
    <CandleSvg
      bodies={[
        mkC(8, 10, 60, 64, false),
        mkC(20, 24, 46, 50, true),
        mkC(10, 14, 32, 36, true),
      ]}
    />
  ),
  three_white_strike: (
    <CandleSvg
      bodies={[
        mkC(28, 32, 50, 52, true),
        mkC(18, 22, 40, 42, true),
        mkC(8, 12, 30, 32, true),
        mkC(4, 8, 68, 72, false),
      ]}
    />
  ),

  // ---- Bearish Three-Candle ----
  evening_star: (
    <CandleSvg
      bodies={[
        mkC(10, 12, 52, 56, true),
        mkC(6, 8, 14, 18, false),
        mkC(22, 28, 68, 72, false),
      ]}
    />
  ),
  three_black_crows: (
    <CandleSvg
      bodies={[
        mkC(12, 14, 32, 34, false),
        mkC(24, 28, 48, 50, false),
        mkC(38, 42, 62, 64, false),
      ]}
    />
  ),
  three_inside_down: (
    <CandleSvg
      bodies={[
        mkC(8, 10, 60, 64, true),
        mkC(20, 24, 46, 50, false),
        mkC(32, 38, 64, 68, false),
      ]}
    />
  ),
  bearish_abandoned_baby: (
    <CandleSvg
      bodies={[
        mkC(10, 12, 54, 58, true),
        mkCandle(6, 8, 10, 13, NEUTRAL_COLOR),
        mkC(32, 36, 68, 72, false),
      ]}
    />
  ),
};

function fmtPrice(pair: string, price: number): string {
  if (pair === "XAU/USD") return `$${price.toFixed(2)}`;
  if (pair.includes("JPY")) return price.toFixed(2);
  return price.toFixed(4);
}

const BIAS_STYLE: Record<Bias, { color: string; bg: string; border: string }> =
  {
    Bullish: {
      color: "#26D7C6",
      bg: "rgba(38,215,198,0.1)",
      border: "rgba(38,215,198,0.3)",
    },
    Bearish: {
      color: "#e55060",
      bg: "rgba(229,80,96,0.1)",
      border: "rgba(229,80,96,0.3)",
    },
    Neutral: {
      color: "#9ab0cc",
      bg: "rgba(154,176,204,0.1)",
      border: "rgba(154,176,204,0.3)",
    },
  };

const CAT_STYLE: Record<Category, { color: string; bg: string }> = {
  Single: { color: "oklch(0.78 0.12 190)", bg: "oklch(0.78 0.12 190 / 0.1)" },
  "Two-Candle": {
    color: "oklch(0.78 0.14 60)",
    bg: "oklch(0.78 0.14 60 / 0.1)",
  },
  "Three-Candle": {
    color: "oklch(0.74 0.12 300)",
    bg: "oklch(0.74 0.12 300 / 0.1)",
  },
};

interface DetectionResult {
  pattern: PatternDef;
  detected: boolean;
  confidence: number;
}

export default function CandlestickPatterns() {
  const [selectedPair, setSelectedPair] = useState("XAU/USD");
  const [selectedTF, setSelectedTF] = useState("H1");
  const [filterBias, setFilterBias] = useState<Bias | "All">("All");
  const [filterCat, setFilterCat] = useState<Category | "All">("All");
  const { prices } = useLivePrices();
  const { countdown, lastUpdated, refreshKey, forceRefresh } =
    useAutoRefresh(30);
  const { alertsEnabled, toggleAlerts, sendAlert } = useAlertNotifications();

  const basePrice =
    prices[selectedPair] ??
    (selectedPair === "XAU/USD"
      ? 3058
      : selectedPair.includes("JPY")
        ? 149.8
        : 1.085);

  const candles = useMemo(
    () => generateCandles(basePrice, selectedPair, selectedTF, refreshKey),
    [basePrice, selectedPair, selectedTF, refreshKey],
  );
  const atr = useMemo(() => calcATR(candles), [candles]);

  const results: DetectionResult[] = useMemo(
    () =>
      PATTERNS.map((p) => ({
        pattern: p,
        detected: p.detect(candles, atr),
        confidence: p.confidence + Math.round(Math.random() * 6 - 3),
      })),
    [candles, atr],
  );

  const detected = results.filter((r) => r.detected);
  const prevDetectedRef = useRef<string[]>([]);

  useEffect(() => {
    const names = detected.map((r) => r.pattern.id);
    const newOnes = names.filter((n) => !prevDetectedRef.current.includes(n));
    for (const id of newOnes) {
      const r = results.find((x) => x.pattern.id === id);
      if (r) {
        sendAlert(
          `Candlestick Pattern — ${selectedPair}`,
          `${r.pattern.name} (${r.pattern.bias}) detected on ${selectedTF}`,
        );
      }
    }
    prevDetectedRef.current = names;
  });

  const filteredResults = results.filter((r) => {
    if (filterBias !== "All" && r.pattern.bias !== filterBias) return false;
    if (filterCat !== "All" && r.pattern.category !== filterCat) return false;
    return true;
  });

  const bullCount = detected.filter((r) => r.pattern.bias === "Bullish").length;
  const bearCount = detected.filter((r) => r.pattern.bias === "Bearish").length;
  const neutCount = detected.filter((r) => r.pattern.bias === "Neutral").length;

  const lastUpdatedStr = lastUpdated.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return (
    <section
      id="candlestick-patterns"
      className="py-14 px-4"
      style={{ background: "oklch(0.15 0.026 240)" }}
    >
      <div className="max-w-7xl mx-auto">
        {/* ---- Header ---- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div
                className="w-2 h-7 rounded-full"
                style={{ background: "oklch(0.78 0.12 190)" }}
              />
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Candlestick Pattern Detection
                </h2>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: "oklch(0.55 0.07 240)" }}
                >
                  20 patterns · Matching standard candlestick reference ·{" "}
                  {selectedPair} {selectedTF}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex items-center gap-1.5 text-xs"
              style={{ color: "oklch(0.52 0.07 240)" }}
            >
              <RefreshCw
                className="w-3 h-3"
                style={{ animation: "spin 3s linear infinite" }}
              />
              <span>
                Refresh in{" "}
                <span className="text-white font-mono">{countdown}s</span>
              </span>
            </div>
            <button
              type="button"
              onClick={toggleAlerts}
              data-ocid="candlestick.toggle"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: alertsEnabled
                  ? "oklch(0.22 0.06 190)"
                  : "oklch(0.19 0.04 240)",
                border: `1px solid ${alertsEnabled ? "oklch(0.4 0.1 190)" : "oklch(0.26 0.05 240)"}`,
                color: alertsEnabled
                  ? "oklch(0.78 0.12 190)"
                  : "oklch(0.55 0.07 240)",
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
              data-ocid="candlestick.secondary_button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
              style={{
                background: "oklch(0.22 0.06 190)",
                border: "1px solid oklch(0.34 0.1 190)",
                color: "oklch(0.78 0.12 190)",
              }}
            >
              <RefreshCw className="w-3 h-3" />
              Refresh Now
            </button>
          </div>
        </motion.div>

        {/* ---- Controls ---- */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap items-center gap-3 mb-6"
        >
          {/* Pair selector */}
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{
              background: "oklch(0.17 0.03 240)",
              border: "1px solid oklch(0.22 0.04 240 / 0.6)",
            }}
          >
            {PAIRS.map((pair) => (
              <button
                key={pair}
                type="button"
                data-ocid="candlestick.tab"
                onClick={() => setSelectedPair(pair)}
                className="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                style={{
                  background:
                    selectedPair === pair
                      ? "oklch(0.26 0.08 190)"
                      : "transparent",
                  color:
                    selectedPair === pair
                      ? "oklch(0.88 0.1 190)"
                      : "oklch(0.55 0.07 240)",
                  border:
                    selectedPair === pair
                      ? "1px solid oklch(0.38 0.12 190)"
                      : "1px solid transparent",
                }}
              >
                {pair}
              </button>
            ))}
          </div>

          {/* Timeframe selector */}
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{
              background: "oklch(0.17 0.03 240)",
              border: "1px solid oklch(0.22 0.04 240 / 0.6)",
            }}
          >
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => setSelectedTF(tf)}
                className="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                style={{
                  background:
                    selectedTF === tf ? "oklch(0.26 0.08 190)" : "transparent",
                  color:
                    selectedTF === tf
                      ? "oklch(0.88 0.1 190)"
                      : "oklch(0.55 0.07 240)",
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Bias filter */}
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{
              background: "oklch(0.17 0.03 240)",
              border: "1px solid oklch(0.22 0.04 240 / 0.6)",
            }}
          >
            {(["All", "Bullish", "Bearish", "Neutral"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setFilterBias(b)}
                className="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                style={{
                  background:
                    filterBias === b ? "oklch(0.22 0.06 240)" : "transparent",
                  color: filterBias === b ? "white" : "oklch(0.55 0.07 240)",
                }}
              >
                {b}
              </button>
            ))}
          </div>

          {/* Category filter */}
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{
              background: "oklch(0.17 0.03 240)",
              border: "1px solid oklch(0.22 0.04 240 / 0.6)",
            }}
          >
            {(["All", "Single", "Two-Candle", "Three-Candle"] as const).map(
              (c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFilterCat(c)}
                  className="px-2.5 py-1 text-xs font-medium rounded-md transition-all"
                  style={{
                    background:
                      filterCat === c ? "oklch(0.22 0.06 240)" : "transparent",
                    color: filterCat === c ? "white" : "oklch(0.55 0.07 240)",
                  }}
                >
                  {c}
                </button>
              ),
            )}
          </div>

          <div
            className="ml-auto flex items-center gap-2 text-xs"
            style={{ color: "oklch(0.42 0.06 240)" }}
          >
            <span>
              Updated:{" "}
              <span className="text-white font-mono">{lastUpdatedStr}</span>
            </span>
            <span>·</span>
            <span>
              Price:{" "}
              <span
                style={{ color: "oklch(0.78 0.12 190)" }}
                className="font-mono"
              >
                {fmtPrice(selectedPair, basePrice)}
              </span>
            </span>
          </div>
        </motion.div>

        {/* ---- Summary pills ---- */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8"
        >
          {[
            {
              label: "Patterns Found",
              value: detected.length,
              color: "oklch(0.78 0.12 190)",
            },
            { label: "Bullish", value: bullCount, color: BULL_COLOR },
            { label: "Bearish", value: bearCount, color: BEAR_COLOR },
            { label: "Neutral", value: neutCount, color: NEUTRAL_COLOR },
          ].map((s, i) => (
            <div
              key={s.label}
              data-ocid={`candlestick.item.${i + 1}`}
              className="rounded-xl px-4 py-3 flex items-center justify-between"
              style={{
                background: "oklch(0.18 0.03 240)",
                border: "1px solid oklch(0.24 0.05 240 / 0.6)",
              }}
            >
              <span
                className="text-xs font-medium"
                style={{ color: "oklch(0.52 0.07 240)" }}
              >
                {s.label}
              </span>
              <span className="text-2xl font-bold" style={{ color: s.color }}>
                {s.value}
              </span>
            </div>
          ))}
        </motion.div>

        {/* ---- Pattern Grid ---- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredResults.map((result, i) => (
            <PatternCard
              key={result.pattern.id}
              result={result}
              pair={selectedPair}
              index={i + 1}
              atr={atr}
              price={basePrice}
            />
          ))}
        </div>

        {filteredResults.length === 0 && (
          <div
            data-ocid="candlestick.empty_state"
            className="text-center py-16 rounded-xl"
            style={{
              background: "oklch(0.17 0.03 240)",
              border: "1px solid oklch(0.22 0.04 240 / 0.6)",
            }}
          >
            <div className="text-4xl mb-3">🕯️</div>
            <p className="text-white font-semibold">
              No patterns match filters
            </p>
            <p
              className="text-sm mt-1"
              style={{ color: "oklch(0.52 0.07 240)" }}
            >
              Change filters or switch pair/timeframe
            </p>
          </div>
        )}

        {/* Footer timestamp */}
        <div
          className="mt-6 text-center text-xs"
          style={{ color: "oklch(0.38 0.05 240)" }}
        >
          Scanning {PATTERNS.length} candlestick patterns · {selectedPair} ·{" "}
          {selectedTF} · {detected.length} detected
        </div>
      </div>
    </section>
  );
}

function PatternCard({
  result,
  pair,
  index,
  atr,
  price,
}: {
  result: DetectionResult;
  pair: string;
  index: number;
  atr: number;
  price: number;
}) {
  const { pattern, detected, confidence } = result;
  const bs = BIAS_STYLE[pattern.bias];
  const cs = CAT_STYLE[pattern.category];
  const svgIllustration = SVG_LIBRARY[pattern.id];
  const signal = detected ? generateSignal(pattern, price, atr) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.5) }}
      data-ocid={`candlestick.item.${index}`}
      className="rounded-xl p-4 flex flex-col gap-3 transition-all duration-300"
      style={{
        background: detected ? "oklch(0.19 0.04 240)" : "oklch(0.17 0.03 240)",
        border: detected
          ? `1.5px solid ${bs.border}`
          : "1px solid oklch(0.22 0.04 240 / 0.55)",
        boxShadow: detected ? `0 0 18px ${bs.bg}, 0 0 4px ${bs.bg}` : "none",
      }}
    >
      {/* Top row: SVG + title */}
      <div className="flex items-start gap-3">
        {/* SVG illustration */}
        <div
          className="shrink-0 rounded-lg flex items-center justify-center"
          style={{
            width: 72,
            height: 80,
            background: "oklch(0.14 0.025 240)",
            border: detected
              ? `1px solid ${bs.border}`
              : "1px solid oklch(0.22 0.04 240 / 0.4)",
          }}
        >
          {svgIllustration ?? (
            <div className="text-2xl opacity-40">
              {pattern.category === "Single"
                ? "🕯"
                : pattern.category === "Two-Candle"
                  ? "🕯🕯"
                  : "🕯🕯🕯"}
            </div>
          )}
        </div>

        {/* Title & badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-sm font-bold text-white leading-tight">
              {pattern.name}
            </h3>
            {detected && (
              <span
                className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded"
                style={{
                  background: "rgba(38,215,198,0.15)",
                  color: "#26D7C6",
                }}
              >
                ✓
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: cs.bg, color: cs.color }}
            >
              {pattern.category}
            </span>
            <span
              className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{
                background: bs.bg,
                color: bs.color,
                border: `1px solid ${bs.border}`,
              }}
            >
              {pattern.bias === "Bullish" ? (
                <TrendingUp className="w-2.5 h-2.5" />
              ) : pattern.bias === "Bearish" ? (
                <TrendingDown className="w-2.5 h-2.5" />
              ) : null}
              {pattern.bias}
            </span>
          </div>

          <p
            className="text-[11px] mt-1.5 leading-snug"
            style={{ color: "oklch(0.52 0.07 240)" }}
          >
            {pattern.description}
          </p>
        </div>
      </div>

      {/* Status + signal details */}
      {detected ? (
        <div
          className="rounded-lg p-3 flex flex-col gap-2.5"
          style={{ background: "oklch(0.14 0.025 240)" }}
        >
          {/* DETECTED badge row + confidence */}
          <div className="flex items-center justify-between">
            <Badge
              className="text-xs px-2 py-0.5 font-bold"
              style={{
                background: "rgba(38,215,198,0.15)",
                color: "#26D7C6",
                border: "1px solid rgba(38,215,198,0.3)",
              }}
            >
              DETECTED
            </Badge>
            <div className="text-right">
              <div
                className="text-[10px]"
                style={{ color: "oklch(0.5 0.07 240)" }}
              >
                Confidence
              </div>
              <div
                className="text-base font-bold leading-none"
                style={{
                  color:
                    confidence >= 80
                      ? "#26D7C6"
                      : confidence >= 70
                        ? "oklch(0.82 0.16 60)"
                        : NEUTRAL_COLOR,
                }}
              >
                {confidence}%
              </div>
            </div>
          </div>

          {/* Signal block */}
          {signal && (
            <div
              className="rounded-md p-2.5 flex flex-col gap-2"
              style={{
                background:
                  signal.direction === "BUY"
                    ? "rgba(38,215,198,0.06)"
                    : "rgba(229,80,96,0.06)",
                border:
                  signal.direction === "BUY"
                    ? "1px solid rgba(38,215,198,0.2)"
                    : "1px solid rgba(229,80,96,0.2)",
              }}
            >
              {/* Direction + R:R row */}
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{
                    background:
                      signal.direction === "BUY"
                        ? "rgba(38,215,198,0.18)"
                        : "rgba(229,80,96,0.18)",
                    color: signal.direction === "BUY" ? "#26D7C6" : "#e55060",
                  }}
                >
                  {signal.direction}
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{
                    background: "rgba(245,171,53,0.15)",
                    color: "#f5ab35",
                    border: "1px solid rgba(245,171,53,0.25)",
                  }}
                >
                  R:R 1:{signal.rr.toFixed(1)}
                </span>
              </div>

              {/* Price levels grid */}
              <div className="grid grid-cols-3 gap-1">
                <div>
                  <div
                    className="text-[9px] font-semibold uppercase mb-0.5"
                    style={{ color: "oklch(0.5 0.07 240)" }}
                  >
                    Entry
                  </div>
                  <div
                    className="text-[11px] font-bold font-mono"
                    style={{ color: "white" }}
                  >
                    {fmtPrice(pair, signal.entry)}
                  </div>
                </div>
                <div>
                  <div
                    className="text-[9px] font-semibold uppercase mb-0.5"
                    style={{ color: "oklch(0.5 0.07 240)" }}
                  >
                    SL
                  </div>
                  <div
                    className="text-[11px] font-bold font-mono"
                    style={{ color: "#e55060" }}
                  >
                    {fmtPrice(pair, signal.sl)}
                  </div>
                </div>
                <div>
                  <div
                    className="text-[9px] font-semibold uppercase mb-0.5"
                    style={{ color: "oklch(0.5 0.07 240)" }}
                  >
                    TP
                  </div>
                  <div
                    className="text-[11px] font-bold font-mono"
                    style={{ color: "#26D7C6" }}
                  >
                    {fmtPrice(pair, signal.tp)}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px]">
            <span style={{ color: "oklch(0.52 0.07 240)" }}>
              📍 {pair} · {pattern.category}
            </span>
            <span style={{ color: bs.color }} className="font-semibold">
              {pattern.bias === "Bullish"
                ? "→ Buy signal"
                : pattern.bias === "Bearish"
                  ? "→ Sell signal"
                  : "→ Watch"}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <Badge
            className="text-[10px] px-2 py-0.5"
            style={{
              background: "oklch(0.17 0.03 240)",
              color: "oklch(0.42 0.06 240)",
              border: "1px solid oklch(0.26 0.04 240)",
            }}
          >
            NOT DETECTED
          </Badge>
          <span
            className="text-[10px]"
            style={{ color: "oklch(0.38 0.05 240)" }}
          >
            Monitoring…
          </span>
        </div>
      )}
    </motion.div>
  );
}
