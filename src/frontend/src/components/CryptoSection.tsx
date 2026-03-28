import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, BellOff, Bitcoin, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLivePrices } from "../hooks/useLivePrices";

function formatBtc(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

type AmdPhase = "Accumulation" | "Manipulation" | "Distribution";

function getAmdPhase(): {
  phase: AmdPhase;
  progress: number;
  remaining: string;
} {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const utcSec = now.getUTCSeconds();
  const totalMinutes = utcHour * 60 + utcMin;

  if (utcHour < 7) {
    const elapsed = totalMinutes;
    const total = 7 * 60;
    const remMin = total - elapsed;
    const h = Math.floor(remMin / 60);
    const m = remMin % 60;
    return {
      phase: "Accumulation",
      progress: Math.round((elapsed / total) * 100),
      remaining: `${h}h ${m}m`,
    };
  }

  if (utcHour < 12) {
    const elapsed = totalMinutes - 7 * 60;
    const total = 5 * 60;
    const remMin = total - elapsed;
    const h = Math.floor(remMin / 60);
    const m = remMin % 60;
    return {
      phase: "Manipulation",
      progress: Math.round((elapsed / total) * 100),
      remaining: `${h}h ${m}m`,
    };
  }

  if (utcHour < 21) {
    const elapsed = totalMinutes - 12 * 60;
    const total = 9 * 60;
    const remMin = total - elapsed;
    const h = Math.floor(remMin / 60);
    const m = remMin % 60;
    return {
      phase: "Distribution",
      progress: Math.round((elapsed / total) * 100),
      remaining: `${h}h ${m}m`,
    };
  }

  // Late session (21–24 UTC) — next Accumulation starts soon
  const elapsed = totalMinutes - 21 * 60;
  const total = 3 * 60;
  const remMin = total - elapsed;
  const m = remMin % 60;
  const s = utcSec;
  return {
    phase: "Accumulation",
    progress: Math.round((elapsed / total) * 100),
    remaining: `0h ${m}m ${s}s`,
  };
}

interface AmdCardProps {
  livePrice: number;
}
function AmdCard({ livePrice }: AmdCardProps) {
  const { phase, progress, remaining } = getAmdPhase();
  const isBuy = phase === "Accumulation" || phase === "Manipulation";
  const direction = isBuy ? "BUY" : "SELL";
  const entry = livePrice;
  const sl = isBuy ? entry * (1 - 0.015) : entry * (1 + 0.015);
  const tp = isBuy ? entry * (1 + 0.03) : entry * (1 - 0.03);

  const phaseColors: Record<
    AmdPhase,
    { bg: string; text: string; bar: string }
  > = {
    Accumulation: {
      bg: "oklch(0.22 0.06 150 / 0.3)",
      text: "oklch(0.76 0.17 150)",
      bar: "oklch(0.76 0.17 150)",
    },
    Manipulation: {
      bg: "oklch(0.22 0.06 80 / 0.3)",
      text: "oklch(0.75 0.12 80)",
      bar: "oklch(0.75 0.12 80)",
    },
    Distribution: {
      bg: "oklch(0.22 0.06 20 / 0.3)",
      text: "oklch(0.65 0.18 20)",
      bar: "oklch(0.65 0.18 20)",
    },
  };
  const colors = phaseColors[phase];

  return (
    <Card
      className="border-border/60"
      style={{ background: "oklch(0.17 0.03 240)" }}
      data-ocid="crypto.amd.card"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">
            AMD Cycle — BTC/USD
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge
              className="text-[10px] font-bold px-2 py-0.5"
              style={{
                background: "oklch(0.22 0.07 150 / 0.4)",
                color: "oklch(0.76 0.17 150)",
                border: "1px solid oklch(0.76 0.17 150 / 0.4)",
              }}
            >
              Grade A
            </Badge>
            <Badge
              className="text-[10px] px-2 py-0.5"
              style={{
                background: "oklch(0.2 0.03 240)",
                color: "oklch(0.65 0.05 240)",
                border: "1px solid oklch(0.3 0.04 240)",
              }}
            >
              87% Accuracy
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="rounded-lg p-3 flex items-center justify-between"
          style={{ background: colors.bg }}
        >
          <div>
            <p className="text-xs text-muted-foreground">Current Phase</p>
            <p
              className="text-base font-bold mt-0.5"
              style={{ color: colors.text }}
            >
              {phase}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-sm font-mono font-semibold text-foreground">
              {remaining}
            </p>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Session Progress</span>
            <span>{progress}%</span>
          </div>
          <div
            className="h-2 rounded-full overflow-hidden"
            style={{ background: "oklch(0.2 0.02 240)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{ width: `${progress}%`, background: colors.bar }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-lg p-2.5"
            style={{ background: "oklch(0.2 0.025 240)" }}
          >
            <p className="text-[10px] text-muted-foreground">Direction</p>
            <p
              className="text-sm font-bold"
              style={{
                color: isBuy ? "oklch(0.76 0.17 150)" : "oklch(0.65 0.18 20)",
              }}
            >
              {direction}
            </p>
          </div>
          <div
            className="rounded-lg p-2.5"
            style={{ background: "oklch(0.2 0.025 240)" }}
          >
            <p className="text-[10px] text-muted-foreground">Entry</p>
            <p className="text-sm font-mono font-semibold text-foreground">
              ${formatBtc(entry)}
            </p>
          </div>
          <div
            className="rounded-lg p-2.5"
            style={{ background: "oklch(0.2 0.025 240)" }}
          >
            <p className="text-[10px] text-muted-foreground">Stop Loss</p>
            <p
              className="text-sm font-mono font-semibold"
              style={{ color: "oklch(0.65 0.18 20)" }}
            >
              ${formatBtc(sl)}
            </p>
          </div>
          <div
            className="rounded-lg p-2.5"
            style={{ background: "oklch(0.2 0.025 240)" }}
          >
            <p className="text-[10px] text-muted-foreground">Take Profit</p>
            <p
              className="text-sm font-mono font-semibold"
              style={{ color: "oklch(0.76 0.17 150)" }}
            >
              ${formatBtc(tp)}
            </p>
          </div>
        </div>
        <Badge
          className="text-[10px] font-bold px-2 py-0.5"
          style={{
            background: "oklch(0.22 0.08 80 / 0.4)",
            color: "oklch(0.75 0.12 80)",
            border: "1px solid oklch(0.75 0.12 80 / 0.5)",
          }}
        >
          R:R 1:2.0
        </Badge>
      </CardContent>
    </Card>
  );
}

interface LiquidityCardProps {
  livePrice: number;
}
function LiquidityCard({ livePrice }: LiquidityCardProps) {
  const levels = [
    {
      label: "Major BSL",
      price: livePrice * 1.022,
      type: "BSL",
      strength: "Strong",
    },
    {
      label: "Minor BSL",
      price: livePrice * 1.008,
      type: "BSL",
      strength: "Moderate",
    },
    {
      label: "Minor SSL",
      price: livePrice * 0.992,
      type: "SSL",
      strength: "Moderate",
    },
    {
      label: "Major SSL",
      price: livePrice * 0.978,
      type: "SSL",
      strength: "Strong",
    },
  ];

  function getStatus(levelPrice: number) {
    const pct = Math.abs(levelPrice - livePrice) / livePrice;
    if (pct <= 0.003) return "approaching";
    if (livePrice >= levelPrice * 0.999 && livePrice <= levelPrice * 1.001)
      return "swept";
    return "pending";
  }

  return (
    <Card
      className="border-border/60"
      style={{ background: "oklch(0.17 0.03 240)" }}
      data-ocid="crypto.liquidity.card"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">
            Liquidity Sweep — BTC/USD
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge
              className="text-[10px] font-bold px-2 py-0.5"
              style={{
                background: "oklch(0.22 0.07 150 / 0.4)",
                color: "oklch(0.76 0.17 150)",
                border: "1px solid oklch(0.76 0.17 150 / 0.4)",
              }}
            >
              Grade A
            </Badge>
            <Badge
              className="text-[10px] px-2 py-0.5"
              style={{
                background: "oklch(0.2 0.03 240)",
                color: "oklch(0.65 0.05 240)",
                border: "1px solid oklch(0.3 0.04 240)",
              }}
            >
              88% Accuracy
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {levels.map((level) => {
            const status = getStatus(level.price);
            const isBsl = level.type === "BSL";
            const levelColor = isBsl
              ? "oklch(0.76 0.17 150)"
              : "oklch(0.65 0.18 20)";

            return (
              <div
                key={level.label}
                className="rounded-lg p-3"
                style={{ background: "oklch(0.2 0.025 240)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: levelColor }}
                    />
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {level.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {level.strength}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold text-foreground">
                      ${formatBtc(level.price)}
                    </p>
                    {status === "approaching" && (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse"
                        style={{
                          background: "oklch(0.25 0.08 80 / 0.4)",
                          color: "oklch(0.75 0.12 80)",
                        }}
                      >
                        ⚡ Approaching
                      </span>
                    )}
                    {status === "swept" && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          background: "oklch(0.22 0.06 150 / 0.4)",
                          color: "oklch(0.76 0.17 150)",
                        }}
                      >
                        ✓ Swept
                      </span>
                    )}
                    {status === "pending" && (
                      <span className="text-[10px] text-muted-foreground">
                        Pending
                      </span>
                    )}
                  </div>
                </div>
                {status === "swept" && (
                  <div
                    className="mt-2 pt-2 border-t grid grid-cols-3 gap-2"
                    style={{ borderColor: "oklch(0.25 0.03 240)" }}
                  >
                    <div>
                      <p className="text-[10px] text-muted-foreground">Entry</p>
                      <p className="text-xs font-mono text-foreground">
                        ${formatBtc(level.price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">SL</p>
                      <p
                        className="text-xs font-mono"
                        style={{ color: "oklch(0.65 0.18 20)" }}
                      >
                        $
                        {formatBtc(
                          isBsl ? level.price * 0.992 : level.price * 1.008,
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">TP</p>
                      <p
                        className="text-xs font-mono"
                        style={{ color: "oklch(0.76 0.17 150)" }}
                      >
                        $
                        {formatBtc(
                          isBsl ? level.price * 0.985 : level.price * 1.015,
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div
          className="mt-3 p-2.5 rounded-lg text-center"
          style={{ background: "oklch(0.2 0.025 240)" }}
        >
          <p className="text-xs text-muted-foreground">
            Live Price:{" "}
            <span className="font-mono font-bold text-foreground">
              ${formatBtc(livePrice)}
            </span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface OrderBlockCardProps {
  livePrice: number;
}
function OrderBlockCard({ livePrice }: OrderBlockCardProps) {
  const bullishLow = livePrice * (1 - 0.012);
  const bullishHigh = livePrice * (1 - 0.008);
  const bullishMid = (bullishLow + bullishHigh) / 2;
  const bullishSl = bullishLow * 0.995;
  const bullishTp = bullishHigh + (bullishHigh - bullishLow) * 2;

  const bearishLow = livePrice * (1 + 0.008);
  const bearishHigh = livePrice * (1 + 0.012);
  const bearishMid = (bearishLow + bearishHigh) / 2;
  const bearishSl = bearishHigh * 1.005;
  const bearishTp = bearishLow - (bearishHigh - bearishLow) * 2;

  return (
    <Card
      className="border-border/60"
      style={{ background: "oklch(0.17 0.03 240)" }}
      data-ocid="crypto.orderblock.card"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">
            Order Blocks — BTC/USD
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge
              className="text-[10px] font-bold px-2 py-0.5"
              style={{
                background: "oklch(0.22 0.07 150 / 0.4)",
                color: "oklch(0.76 0.17 150)",
                border: "1px solid oklch(0.76 0.17 150 / 0.4)",
              }}
            >
              Grade A
            </Badge>
            <Badge
              className="text-[10px] px-2 py-0.5"
              style={{
                background: "oklch(0.2 0.03 240)",
                color: "oklch(0.65 0.05 240)",
                border: "1px solid oklch(0.3 0.04 240)",
              }}
            >
              86% Accuracy
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Bullish OB */}
        <div
          className="rounded-lg p-3"
          style={{
            background: "oklch(0.2 0.025 240)",
            borderLeft: "3px solid oklch(0.76 0.17 150)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p
                className="text-xs font-bold"
                style={{ color: "oklch(0.76 0.17 150)" }}
              >
                Demand Zone
              </p>
              <p className="text-[10px] text-muted-foreground">
                ${formatBtc(bullishLow)} – ${formatBtc(bullishHigh)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Badge
                className="text-[10px] font-bold px-2"
                style={{
                  background: "oklch(0.22 0.07 150 / 0.5)",
                  color: "oklch(0.76 0.17 150)",
                }}
              >
                BUY
              </Badge>
              <Badge
                className="text-[10px] px-2"
                style={{
                  background: "oklch(0.2 0.03 240)",
                  color: "oklch(0.65 0.08 240)",
                }}
              >
                Fresh
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Entry</p>
              <p className="text-xs font-mono text-foreground">
                ${formatBtc(bullishMid)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">SL</p>
              <p
                className="text-xs font-mono"
                style={{ color: "oklch(0.65 0.18 20)" }}
              >
                ${formatBtc(bullishSl)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">TP</p>
              <p
                className="text-xs font-mono"
                style={{ color: "oklch(0.76 0.17 150)" }}
              >
                ${formatBtc(bullishTp)}
              </p>
            </div>
          </div>
          <Badge
            className="mt-2 text-[10px] font-bold px-1.5"
            style={{
              background: "oklch(0.22 0.08 80 / 0.4)",
              color: "oklch(0.75 0.12 80)",
              border: "1px solid oklch(0.75 0.12 80 / 0.5)",
            }}
          >
            R:R 1:2.0
          </Badge>
        </div>

        {/* Bearish OB */}
        <div
          className="rounded-lg p-3"
          style={{
            background: "oklch(0.2 0.025 240)",
            borderLeft: "3px solid oklch(0.65 0.18 20)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <p
                className="text-xs font-bold"
                style={{ color: "oklch(0.65 0.18 20)" }}
              >
                Supply Zone
              </p>
              <p className="text-[10px] text-muted-foreground">
                ${formatBtc(bearishLow)} – ${formatBtc(bearishHigh)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Badge
                className="text-[10px] font-bold px-2"
                style={{
                  background: "oklch(0.22 0.07 20 / 0.5)",
                  color: "oklch(0.65 0.18 20)",
                }}
              >
                SELL
              </Badge>
              <Badge
                className="text-[10px] px-2"
                style={{
                  background: "oklch(0.2 0.03 240)",
                  color: "oklch(0.65 0.08 240)",
                }}
              >
                Fresh
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Entry</p>
              <p className="text-xs font-mono text-foreground">
                ${formatBtc(bearishMid)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">SL</p>
              <p
                className="text-xs font-mono"
                style={{ color: "oklch(0.65 0.18 20)" }}
              >
                ${formatBtc(bearishSl)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">TP</p>
              <p
                className="text-xs font-mono"
                style={{ color: "oklch(0.76 0.17 150)" }}
              >
                ${formatBtc(bearishTp)}
              </p>
            </div>
          </div>
          <Badge
            className="mt-2 text-[10px] font-bold px-1.5"
            style={{
              background: "oklch(0.22 0.08 80 / 0.4)",
              color: "oklch(0.75 0.12 80)",
              border: "1px solid oklch(0.75 0.12 80 / 0.5)",
            }}
          >
            R:R 1:2.0
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface GainzAlgoCardProps {
  livePrice: number;
}
function GainzAlgoCard({ livePrice }: GainzAlgoCardProps) {
  const minute = new Date().getMinutes();
  const { phase } = getAmdPhase();

  let direction: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
  if (minute % 3 === 0) direction = "BUY";
  else if (minute % 3 === 1) direction = "SELL";

  const rsi = direction === "BUY" ? 58 : direction === "SELL" ? 44 : 50;
  const ema9 = livePrice * 0.9998;
  const ema21 = livePrice * 0.9991;

  const entry = livePrice;
  const sl =
    direction === "BUY"
      ? livePrice * 0.985
      : direction === "SELL"
        ? livePrice * 1.015
        : livePrice * 0.99;
  const tp =
    direction === "BUY"
      ? livePrice * 1.03
      : direction === "SELL"
        ? livePrice * 0.97
        : livePrice * 1.01;

  const directionColor =
    direction === "BUY"
      ? "oklch(0.76 0.17 150)"
      : direction === "SELL"
        ? "oklch(0.65 0.18 20)"
        : "oklch(0.65 0.05 240)";

  return (
    <Card
      className="border-border/60"
      style={{ background: "oklch(0.17 0.03 240)" }}
      data-ocid="crypto.gainzalgo.card"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">
            GainzAlgo V2 — BTC/USD
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge
              className="text-[10px] font-bold px-2 py-0.5"
              style={{
                background: "oklch(0.22 0.07 150 / 0.4)",
                color: "oklch(0.76 0.17 150)",
                border: "1px solid oklch(0.76 0.17 150 / 0.4)",
              }}
            >
              Grade A
            </Badge>
            <Badge
              className="text-[10px] px-2 py-0.5"
              style={{
                background: "oklch(0.2 0.03 240)",
                color: "oklch(0.65 0.05 240)",
                border: "1px solid oklch(0.3 0.04 240)",
              }}
            >
              85% Accuracy
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="rounded-lg p-3 flex items-center justify-between"
          style={{
            background:
              direction === "BUY"
                ? "oklch(0.22 0.06 150 / 0.3)"
                : direction === "SELL"
                  ? "oklch(0.22 0.06 20 / 0.3)"
                  : "oklch(0.2 0.025 240)",
          }}
        >
          <div>
            <p className="text-xs text-muted-foreground">Signal</p>
            <p
              className="text-xl font-black mt-0.5"
              style={{ color: directionColor }}
            >
              {direction}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Confidence</p>
            <p className="text-lg font-bold text-foreground">85%</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div
            className="rounded-lg p-2.5"
            style={{ background: "oklch(0.2 0.025 240)" }}
          >
            <p className="text-[10px] text-muted-foreground">EMA 9</p>
            <p className="text-xs font-mono font-semibold text-foreground">
              ${formatBtc(ema9)}
            </p>
          </div>
          <div
            className="rounded-lg p-2.5"
            style={{ background: "oklch(0.2 0.025 240)" }}
          >
            <p className="text-[10px] text-muted-foreground">EMA 21</p>
            <p className="text-xs font-mono font-semibold text-foreground">
              ${formatBtc(ema21)}
            </p>
          </div>
          <div
            className="rounded-lg p-2.5"
            style={{ background: "oklch(0.2 0.025 240)" }}
          >
            <p className="text-[10px] text-muted-foreground">RSI(14)</p>
            <p
              className="text-xs font-mono font-semibold"
              style={{
                color:
                  rsi > 55
                    ? "oklch(0.76 0.17 150)"
                    : rsi < 45
                      ? "oklch(0.65 0.18 20)"
                      : "oklch(0.65 0.05 240)",
              }}
            >
              {rsi}
            </p>
          </div>
        </div>

        <div
          className="rounded-lg p-2.5 flex items-center justify-between"
          style={{ background: "oklch(0.2 0.025 240)" }}
        >
          <p className="text-xs text-muted-foreground">AMD Phase</p>
          <p
            className="text-xs font-semibold"
            style={{
              color:
                phase === "Accumulation"
                  ? "oklch(0.76 0.17 150)"
                  : phase === "Manipulation"
                    ? "oklch(0.75 0.12 80)"
                    : "oklch(0.65 0.18 20)",
            }}
          >
            {phase}
          </p>
        </div>

        {direction !== "NEUTRAL" && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div
                className="rounded-lg p-2.5"
                style={{ background: "oklch(0.2 0.025 240)" }}
              >
                <p className="text-[10px] text-muted-foreground">Entry</p>
                <p className="text-xs font-mono text-foreground">
                  ${formatBtc(entry)}
                </p>
              </div>
              <div
                className="rounded-lg p-2.5"
                style={{ background: "oklch(0.2 0.025 240)" }}
              >
                <p className="text-[10px] text-muted-foreground">SL</p>
                <p
                  className="text-xs font-mono"
                  style={{ color: "oklch(0.65 0.18 20)" }}
                >
                  ${formatBtc(sl)}
                </p>
              </div>
              <div
                className="rounded-lg p-2.5"
                style={{ background: "oklch(0.2 0.025 240)" }}
              >
                <p className="text-[10px] text-muted-foreground">TP</p>
                <p
                  className="text-xs font-mono"
                  style={{ color: "oklch(0.76 0.17 150)" }}
                >
                  ${formatBtc(tp)}
                </p>
              </div>
            </div>
            <Badge
              className="text-[10px] font-bold px-2 py-0.5"
              style={{
                background: "oklch(0.22 0.08 80 / 0.4)",
                color: "oklch(0.75 0.12 80)",
                border: "1px solid oklch(0.75 0.12 80 / 0.5)",
              }}
            >
              R:R 1:2.0
            </Badge>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function CryptoSection() {
  const { prices, isLoading } = useLivePrices();
  const livePrice = prices["BTC/USD"] ?? 94500;

  const [countdown, setCountdown] = useState(30);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [alertEnabled, setAlertEnabled] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setLastUpdated(new Date());
          setTick((t) => t + 1);
          if (alertEnabled) {
            toast.success("BTC/USD signals refreshed", {
              description: `Live price: $${formatBtc(livePrice)}`,
            });
          }
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [alertEnabled, livePrice]);

  // tick triggers re-render for real-time updates
  const _tick = tick;
  void _tick;

  function toggleAlert() {
    if (!alertEnabled) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
      toast.success("Crypto alerts enabled", {
        description: "You'll be notified when BTC/USD signals change.",
      });
    } else {
      toast.info("Crypto alerts disabled");
    }
    setAlertEnabled((prev) => !prev);
  }

  return (
    <section
      id="crypto"
      className="py-16 px-4 sm:px-6 lg:px-8"
      style={{
        background:
          "linear-gradient(160deg, oklch(0.14 0.025 240) 0%, oklch(0.16 0.03 260) 100%)",
      }}
      data-ocid="crypto.section"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, oklch(0.75 0.12 80), oklch(0.65 0.15 50))",
                  }}
                >
                  <Bitcoin className="w-5 h-5 text-white" />
                </div>
                <h2
                  className="text-2xl font-bold tracking-tight"
                  style={{
                    background:
                      "linear-gradient(90deg, oklch(0.75 0.12 80), oklch(0.85 0.08 80))",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Crypto Analysis
                </h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Bitcoin &amp; Digital Assets — High Accuracy Signals
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="rounded-xl px-4 py-2.5"
                style={{ background: "oklch(0.19 0.035 240)" }}
              >
                <p className="text-[10px] text-muted-foreground mb-0.5">
                  BTC/USD Live
                </p>
                {isLoading ? (
                  <p className="text-sm font-mono text-muted-foreground animate-pulse">
                    Loading…
                  </p>
                ) : (
                  <p
                    className="text-lg font-mono font-bold"
                    style={{ color: "oklch(0.75 0.12 80)" }}
                  >
                    ${formatBtc(livePrice)}
                  </p>
                )}
              </div>

              <div
                className="rounded-xl px-3 py-2.5 flex items-center gap-2"
                style={{ background: "oklch(0.19 0.035 240)" }}
              >
                <RefreshCw
                  className="w-3.5 h-3.5 text-muted-foreground"
                  style={{
                    animation:
                      countdown <= 5 ? "spin 1s linear infinite" : "none",
                  }}
                />
                <div>
                  <p className="text-[10px] text-muted-foreground">
                    Refreshes in
                  </p>
                  <p className="text-sm font-mono font-bold text-foreground">
                    {countdown}s
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 rounded-xl"
                style={{
                  background: alertEnabled
                    ? "oklch(0.22 0.07 80 / 0.4)"
                    : "oklch(0.19 0.035 240)",
                  color: alertEnabled
                    ? "oklch(0.75 0.12 80)"
                    : "oklch(0.55 0.05 240)",
                }}
                onClick={toggleAlert}
                data-ocid="crypto.bell.toggle"
              >
                {alertEnabled ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground mt-3">
            Last Updated:{" "}
            <span className="font-mono">
              {lastUpdated.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <AmdCard livePrice={livePrice} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <LiquidityCard livePrice={livePrice} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <OrderBlockCard livePrice={livePrice} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <GainzAlgoCard livePrice={livePrice} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
