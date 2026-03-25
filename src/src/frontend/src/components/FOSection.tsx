import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "motion/react";
import { useState } from "react";
import { useLivePrices } from "../hooks/useLivePrices";

interface FuturesInstrument {
  name: string;
  priceKey?: string;
  fallbackPrice: number;
  currency: string;
  changePercent: number;
  signal: "BUY" | "SELL";
  lotSize: string;
  margin: string;
  sparkPoints: number[];
}

const FUTURES: FuturesInstrument[] = [
  {
    name: "Nifty 50 Fut",
    priceKey: "NIFTY FUT",
    fallbackPrice: 22480,
    currency: "₹",
    changePercent: 0.42,
    signal: "BUY",
    lotSize: "50",
    margin: "₹1.12L",
    sparkPoints: [22100, 22200, 22050, 22300, 22250, 22400, 22350, 22480],
  },
  {
    name: "BankNifty Fut",
    priceKey: "BANKNIFTY FUT",
    fallbackPrice: 47850,
    currency: "₹",
    changePercent: -0.18,
    signal: "SELL",
    lotSize: "15",
    margin: "₹1.45L",
    sparkPoints: [48200, 48100, 48300, 48050, 47950, 48000, 47900, 47850],
  },
  {
    name: "Crude Oil WTI",
    priceKey: "CRUDE OIL",
    fallbackPrice: 78.5,
    currency: "$",
    changePercent: 1.2,
    signal: "BUY",
    lotSize: "100 bbl",
    margin: "$4,250",
    sparkPoints: [77.2, 77.5, 77.1, 77.8, 77.6, 78.0, 78.2, 78.5],
  },
  {
    name: "Natural Gas",
    priceKey: "NATURAL GAS",
    fallbackPrice: 1.87,
    currency: "$",
    changePercent: -2.1,
    signal: "SELL",
    lotSize: "10,000 MMBtu",
    margin: "$1,800",
    sparkPoints: [1.95, 1.92, 1.93, 1.91, 1.9, 1.89, 1.88, 1.87],
  },
  {
    name: "Gold GC",
    priceKey: "XAU/USD",
    fallbackPrice: 3058,
    currency: "$",
    changePercent: 0.6,
    signal: "BUY",
    lotSize: "100 oz",
    margin: "$8,500",
    sparkPoints: [3020, 3030, 3025, 3040, 3035, 3048, 3052, 3058],
  },
  {
    name: "Silver SI",
    fallbackPrice: 32.4,
    currency: "$",
    changePercent: 0.9,
    signal: "BUY",
    lotSize: "5,000 oz",
    margin: "$5,200",
    sparkPoints: [31.8, 31.9, 31.85, 32.0, 31.95, 32.1, 32.2, 32.4],
  },
  {
    name: "S&P 500 Fut",
    priceKey: "S&P 500 FUT",
    fallbackPrice: 5620,
    currency: "",
    changePercent: 0.3,
    signal: "BUY",
    lotSize: "50",
    margin: "$17,600",
    sparkPoints: [5580, 5590, 5585, 5600, 5595, 5608, 5612, 5620],
  },
  {
    name: "NASDAQ 100 Fut",
    priceKey: "NASDAQ FUT",
    fallbackPrice: 19750,
    currency: "",
    changePercent: 0.5,
    signal: "BUY",
    lotSize: "20",
    margin: "$19,800",
    sparkPoints: [19580, 19620, 19600, 19660, 19650, 19700, 19720, 19750],
  },
];

interface OptionRow {
  strike: number;
  callLtp: number;
  callOI: number;
  callIV: number;
  putLtp: number;
  putOI: number;
  putIV: number;
}

const OPTIONS_CHAIN: OptionRow[] = [
  {
    strike: 22000,
    callLtp: 572,
    callOI: 89,
    callIV: 22.4,
    putLtp: 28,
    putOI: 112,
    putIV: 21.8,
  },
  {
    strike: 22100,
    callLtp: 478,
    callOI: 76,
    callIV: 21.8,
    putLtp: 38,
    putOI: 98,
    putIV: 21.2,
  },
  {
    strike: 22200,
    callLtp: 385,
    callOI: 68,
    callIV: 21.2,
    putLtp: 52,
    putOI: 86,
    putIV: 20.9,
  },
  {
    strike: 22300,
    callLtp: 295,
    callOI: 102,
    callIV: 20.8,
    putLtp: 68,
    putOI: 144,
    putIV: 20.5,
  },
  {
    strike: 22400,
    callLtp: 210,
    callOI: 156,
    callIV: 20.3,
    putLtp: 90,
    putOI: 198,
    putIV: 20.1,
  },
  {
    strike: 22500,
    callLtp: 142,
    callOI: 242,
    callIV: 19.8,
    putLtp: 128,
    putOI: 286,
    putIV: 19.8,
  },
  {
    strike: 22600,
    callLtp: 88,
    callOI: 198,
    callIV: 20.2,
    putLtp: 178,
    putOI: 162,
    putIV: 20.4,
  },
  {
    strike: 22700,
    callLtp: 48,
    callOI: 178,
    callIV: 20.8,
    putLtp: 245,
    putOI: 132,
    putIV: 21.0,
  },
  {
    strike: 22800,
    callLtp: 22,
    callOI: 145,
    callIV: 21.5,
    putLtp: 322,
    putOI: 108,
    putIV: 21.6,
  },
  {
    strike: 22900,
    callLtp: 10,
    callOI: 112,
    callIV: 22.2,
    putLtp: 410,
    putOI: 88,
    putIV: 22.1,
  },
  {
    strike: 23000,
    callLtp: 5,
    callOI: 88,
    callIV: 23.0,
    putLtp: 502,
    putOI: 72,
    putIV: 22.8,
  },
];

function MiniSparkline({
  points,
  signal,
}: { points: number[]; signal: "BUY" | "SELL" }) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const W = 80;
  const H = 28;
  const pts = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * W;
      const y = H - ((p - min) / range) * H;
      return `${x},${y}`;
    })
    .join(" ");
  const color = signal === "BUY" ? "#22c563" : "#e55060";
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-20 h-7"
      preserveAspectRatio="none"
      aria-label={`${signal} trend`}
    >
      <title>{signal} Trend</title>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function fmtFutPrice(currency: string, price: number): string {
  if (price < 10) return `${currency}${price.toFixed(3)}`;
  if (price < 100) return `${currency}${price.toFixed(2)}`;
  if (price < 1000) return `${currency}${price.toFixed(2)}`;
  return `${currency}${price.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function FOSection() {
  const { prices } = useLivePrices();
  const [selectedStrike, setSelectedStrike] = useState(22500);
  return (
    <section id="fo" className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <span
            className="text-xs font-semibold tracking-widest uppercase block mb-1"
            style={{ color: "oklch(0.82 0.16 75)" }}
          >
            DERIVATIVES DESK
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Futures &amp; Options
          </h2>
          <p className="text-muted-foreground text-sm mt-1 max-w-lg">
            Advanced derivatives analysis with GainzAlgo signals — Nifty,
            BankNifty, commodities and global indices.
          </p>
        </motion.div>

        <Tabs defaultValue="futures">
          <TabsList
            className="mb-6"
            style={{
              background: "oklch(0.16 0.028 240)",
              border: "1px solid oklch(0.25 0.03 240)",
            }}
            data-ocid="fo.tab"
          >
            <TabsTrigger value="futures" data-ocid="fo.futures.tab">
              Futures
            </TabsTrigger>
            <TabsTrigger value="options" data-ocid="fo.options.tab">
              Options Chain
            </TabsTrigger>
          </TabsList>

          {/* ── FUTURES TAB ── */}
          <TabsContent value="futures">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {FUTURES.map((inst, idx) => {
                const livePrice = inst.priceKey
                  ? prices[inst.priceKey]
                  : undefined;
                const price = livePrice ?? inst.fallbackPrice;
                const isLive = !!livePrice;
                const bull = inst.changePercent >= 0;

                return (
                  <motion.div
                    key={inst.name}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.35, delay: idx * 0.04 }}
                    data-ocid={`fo.futures.item.${idx + 1}`}
                  >
                    <Card
                      className="border-border/60 overflow-hidden"
                      style={{ background: "oklch(0.19 0.03 240)" }}
                    >
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm font-semibold text-foreground">
                            {inst.name}
                          </CardTitle>
                          <Badge
                            className="text-xs font-bold px-2 py-0.5"
                            style={{
                              background:
                                inst.signal === "BUY"
                                  ? "oklch(0.76 0.17 150 / 0.15)"
                                  : "oklch(0.65 0.18 20 / 0.15)",
                              color:
                                inst.signal === "BUY" ? "#22c563" : "#e55060",
                              border: `1px solid ${inst.signal === "BUY" ? "oklch(0.76 0.17 150 / 0.4)" : "oklch(0.65 0.18 20 / 0.4)"}`,
                            }}
                          >
                            {inst.signal}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="flex items-end justify-between mb-1">
                          <div>
                            <div className="font-mono font-bold text-lg text-foreground">
                              {fmtFutPrice(inst.currency, price)}
                            </div>
                            <div
                              className="text-xs font-semibold mt-0.5"
                              style={{ color: bull ? "#22c563" : "#e55060" }}
                            >
                              {bull ? "+" : ""}
                              {inst.changePercent.toFixed(2)}%
                            </div>
                          </div>
                          <MiniSparkline
                            points={inst.sparkPoints}
                            signal={inst.signal}
                          />
                        </div>

                        <div
                          className="mt-3 pt-3 border-t grid grid-cols-2 gap-1 text-xs"
                          style={{ borderColor: "oklch(0.25 0.03 240)" }}
                        >
                          <div className="text-muted-foreground">Lot Size</div>
                          <div className="text-right font-medium text-foreground">
                            {inst.lotSize}
                          </div>
                          <div className="text-muted-foreground">Margin</div>
                          <div
                            className="text-right font-medium"
                            style={{ color: "oklch(0.82 0.16 75)" }}
                          >
                            {inst.margin}
                          </div>
                          {isLive && (
                            <>
                              <div className="text-muted-foreground">Feed</div>
                              <div
                                className="text-right font-semibold"
                                style={{ color: "oklch(0.76 0.17 150)" }}
                              >
                                LIVE
                              </div>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          </TabsContent>

          {/* ── OPTIONS CHAIN TAB ── */}
          <TabsContent value="options">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  {
                    label: "Put-Call Ratio",
                    value: "0.82",
                    note: "Neutral zone",
                    color: "oklch(0.82 0.16 75)",
                  },
                  {
                    label: "Max Pain",
                    value: "22,400",
                    note: "Strike consensus",
                    color: "oklch(0.75 0.12 80)",
                  },
                  {
                    label: "IV Percentile",
                    value: "42%",
                    note: "Moderate volatility",
                    color: "oklch(0.76 0.17 150)",
                  },
                  {
                    label: "OI Build-up",
                    value: "22,500 CE",
                    note: "Strong resistance",
                    color: "oklch(0.65 0.18 20)",
                  },
                ].map((stat) => (
                  <Card
                    key={stat.label}
                    className="border-border/60"
                    style={{ background: "oklch(0.19 0.03 240)" }}
                    data-ocid="fo.options.card"
                  >
                    <CardContent className="p-4">
                      <div className="text-xs text-muted-foreground mb-1">
                        {stat.label}
                      </div>
                      <div
                        className="font-mono font-bold text-lg"
                        style={{ color: stat.color }}
                      >
                        {stat.value}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {stat.note}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Greeks panel for selected strike */}
              <Card
                className="border-border/60 mb-4"
                style={{ background: "oklch(0.17 0.028 240)" }}
              >
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <span
                        className="text-xs font-semibold uppercase tracking-widest"
                        style={{ color: "oklch(0.82 0.16 75)" }}
                      >
                        Greeks · Strike {selectedStrike}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {[
                        { label: "Δ Delta", value: "0.52" },
                        { label: "Γ Gamma", value: "0.003" },
                        { label: "Θ Theta", value: "-45.2" },
                        { label: "ν Vega", value: "120.5" },
                      ].map((g) => (
                        <div key={g.label} className="text-center">
                          <div className="text-muted-foreground text-xs">
                            {g.label}
                          </div>
                          <div className="font-mono font-bold text-foreground">
                            {g.value}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="w-full sm:w-48">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>IV Percentile</span>
                        <span>42%</span>
                      </div>
                      <Progress value={42} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Options chain table */}
              <div
                className="rounded-xl border border-border/60 overflow-hidden"
                style={{ background: "oklch(0.15 0.025 240)" }}
                data-ocid="fo.options.table"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="text-xs font-semibold tracking-wide"
                        style={{
                          background: "oklch(0.18 0.028 240)",
                          color: "oklch(0.55 0.04 240)",
                        }}
                      >
                        <th className="px-3 py-3 text-right">CALL LTP</th>
                        <th className="px-3 py-3 text-right">OI (K)</th>
                        <th className="px-3 py-3 text-right">IV %</th>
                        <th
                          className="px-4 py-3 text-center font-bold text-xs uppercase tracking-widest"
                          style={{
                            color: "oklch(0.82 0.16 75)",
                            background: "oklch(0.20 0.032 240)",
                          }}
                        >
                          Strike
                        </th>
                        <th className="px-3 py-3 text-left">PUT LTP</th>
                        <th className="px-3 py-3 text-left">OI (K)</th>
                        <th className="px-3 py-3 text-left">IV %</th>
                        <th className="px-3 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {OPTIONS_CHAIN.map((row, idx) => {
                        const isATM = row.strike === 22500;
                        const isSelected = row.strike === selectedStrike;
                        return (
                          <tr
                            key={row.strike}
                            onClick={() => setSelectedStrike(row.strike)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ")
                                setSelectedStrike(row.strike);
                            }}
                            className="cursor-pointer transition-colors"
                            style={{
                              background: isSelected
                                ? "oklch(0.22 0.038 240)"
                                : isATM
                                  ? "oklch(0.20 0.034 80 / 0.3)"
                                  : idx % 2 === 0
                                    ? "oklch(0.16 0.025 240)"
                                    : "oklch(0.155 0.023 240)",
                              borderBottom: isATM
                                ? "1px solid oklch(0.75 0.12 80 / 0.4)"
                                : "1px solid oklch(0.2 0.025 240)",
                            }}
                            data-ocid={`fo.options.row.${idx + 1}`}
                          >
                            <td className="px-3 py-2.5 text-right font-mono font-semibold text-foreground">
                              {row.callLtp}
                            </td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground">
                              {row.callOI}
                            </td>
                            <td
                              className="px-3 py-2.5 text-right"
                              style={{ color: "oklch(0.82 0.16 75)" }}
                            >
                              {row.callIV.toFixed(1)}%
                            </td>
                            <td
                              className="px-4 py-2.5 text-center font-bold font-mono"
                              style={{
                                color: isATM
                                  ? "oklch(0.82 0.16 75)"
                                  : "oklch(0.7 0.03 240)",
                                background: isATM
                                  ? "oklch(0.22 0.036 80 / 0.2)"
                                  : "oklch(0.18 0.028 240)",
                              }}
                            >
                              {isATM ? (
                                <span className="flex items-center justify-center gap-1">
                                  {row.strike}
                                  <span
                                    className="text-[9px] font-bold tracking-widest uppercase"
                                    style={{ color: "oklch(0.82 0.16 75)" }}
                                  >
                                    ATM
                                  </span>
                                </span>
                              ) : (
                                row.strike
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-left font-mono font-semibold text-foreground">
                              {row.putLtp}
                            </td>
                            <td className="px-3 py-2.5 text-left text-muted-foreground">
                              {row.putOI}
                            </td>
                            <td
                              className="px-3 py-2.5 text-left"
                              style={{ color: "oklch(0.65 0.18 20)" }}
                            >
                              {row.putIV.toFixed(1)}%
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedStrike(row.strike);
                                }}
                                className="text-xs px-2 py-0.5 rounded transition-colors"
                                style={{
                                  background: isSelected
                                    ? "oklch(0.82 0.16 75 / 0.15)"
                                    : "oklch(0.22 0.03 240)",
                                  color: isSelected
                                    ? "oklch(0.82 0.16 75)"
                                    : "oklch(0.55 0.03 240)",
                                  border: `1px solid ${isSelected ? "oklch(0.82 0.16 75 / 0.35)" : "oklch(0.26 0.03 240)"}`,
                                }}
                                data-ocid={`fo.options.select.${idx + 1}`}
                              >
                                Select
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Selected option summary */}
              <div className="mt-4 text-xs text-muted-foreground text-center">
                Click any row to inspect Greeks for that strike ·
                <span className="ml-1" style={{ color: "oklch(0.82 0.16 75)" }}>
                  ATM = 22,500
                </span>{" "}
                ·
                <span className="ml-1" style={{ color: "oklch(0.65 0.18 20)" }}>
                  Max Pain = 22,400
                </span>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
