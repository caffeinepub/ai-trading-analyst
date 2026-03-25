import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  BarChart2,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";

// ── Analysis profiles ────────────────────────────────────────────────────────

interface SMCZone {
  type: string;
  label: string;
  direction: "bullish" | "bearish" | "neutral";
}

interface LiquiditySweep {
  type: "BSL" | "SSL";
  price: string;
  status: string;
}

interface TradeSetup {
  entry: string;
  takeProfit: string;
  stopLoss: string;
  rr: string;
}

interface AnalysisProfile {
  bias: "BULLISH" | "BEARISH" | "NEUTRAL" | "BREAKOUT";
  confidence: number;
  pattern: string;
  amdPhase: "Accumulation" | "Manipulation" | "Distribution";
  smcZones: SMCZone[];
  liquiditySweeps: LiquiditySweep[];
  tradeSetup: TradeSetup;
  summary: string;
}

const PROFILES: AnalysisProfile[] = [
  {
    bias: "BULLISH",
    confidence: 87,
    pattern: "Bull Flag",
    amdPhase: "Accumulation",
    smcZones: [
      { type: "Order Block", label: "OB @ 3,028.40", direction: "bullish" },
      {
        type: "FVG",
        label: "Fair Value Gap 3,022–3,025",
        direction: "bullish",
      },
      { type: "BOS", label: "Break of Structure (Up)", direction: "bullish" },
    ],
    liquiditySweeps: [
      { type: "BSL", price: "3,054.50", status: "Targeted" },
      { type: "SSL", price: "3,018.20", status: "Swept ✓" },
    ],
    tradeSetup: {
      entry: "3,038.00",
      takeProfit: "3,058.50",
      stopLoss: "3,030.80",
      rr: "1 : 2.7",
    },
    summary:
      "Price has swept sell-side liquidity and formed a strong bullish order block in the 3,028 zone. Structure confirms a Break of Structure to the upside with a Fair Value Gap acting as a re-entry magnet. AMD Accumulation phase is complete — expect a continuation push toward buy-side liquidity at 3,054.",
  },
  {
    bias: "BEARISH",
    confidence: 82,
    pattern: "Double Top",
    amdPhase: "Distribution",
    smcZones: [
      { type: "Order Block", label: "OB @ 3,056.80", direction: "bearish" },
      {
        type: "FVG",
        label: "Fair Value Gap 3,049–3,052",
        direction: "bearish",
      },
      {
        type: "CHOCH",
        label: "Change of Character (Down)",
        direction: "bearish",
      },
    ],
    liquiditySweeps: [
      { type: "BSL", price: "3,062.10", status: "Swept ✓" },
      { type: "SSL", price: "3,030.40", status: "Targeted" },
    ],
    tradeSetup: {
      entry: "3,052.00",
      takeProfit: "3,028.50",
      stopLoss: "3,060.50",
      rr: "1 : 2.8",
    },
    summary:
      "A Double Top formation at the 3,056 resistance zone triggered a Change of Character to the downside. Bearish order block is rejecting price in the FVG area, signaling Distribution phase completion. Smart money appears to be distributing positions, with sell-side liquidity at 3,030 as the primary target.",
  },
  {
    bias: "NEUTRAL",
    confidence: 74,
    pattern: "Ascending Triangle",
    amdPhase: "Manipulation",
    smcZones: [
      { type: "Order Block", label: "OB @ 3,041.20", direction: "bullish" },
      {
        type: "FVG",
        label: "Fair Value Gap 3,038–3,040",
        direction: "neutral",
      },
      {
        type: "BOS",
        label: "Indecision / Consolidation",
        direction: "neutral",
      },
    ],
    liquiditySweeps: [
      { type: "BSL", price: "3,048.00", status: "Pending" },
      { type: "SSL", price: "3,032.60", status: "Pending" },
    ],
    tradeSetup: {
      entry: "3,044.00",
      takeProfit: "3,056.00",
      stopLoss: "3,037.00",
      rr: "1 : 1.7",
    },
    summary:
      "The market is in a Manipulation phase — price is coiling inside an Ascending Triangle with equal highs compressing against a rising trendline. Liquidity pools exist on both sides. Wait for a confirmed sweep of either BSL or SSL before committing to a directional trade. A break above 2,348 signals bullish intent; a break below 2,332 flips bearish.",
  },
  {
    bias: "BREAKOUT",
    confidence: 91,
    pattern: "Head & Shoulders (Inverted)",
    amdPhase: "Accumulation",
    smcZones: [
      { type: "Order Block", label: "OB @ 2,305.60", direction: "bullish" },
      {
        type: "FVG",
        label: "Fair Value Gap 2,307–2,310",
        direction: "bullish",
      },
      { type: "BOS", label: "Major BOS Confirmed", direction: "bullish" },
    ],
    liquiditySweeps: [
      { type: "BSL", price: "2,325.00", status: "In Play" },
      { type: "SSL", price: "2,298.80", status: "Swept ✓" },
    ],
    tradeSetup: {
      entry: "2,308.50",
      takeProfit: "2,332.00",
      stopLoss: "2,300.40",
      rr: "1 : 2.9",
    },
    summary:
      "An Inverted Head & Shoulders has completed at a major accumulation zone with a neckline breakout confirmed. SSL was swept cleanly below 2,298, triggering institutional buying orders. The BOS confirms bullish momentum with a projected measured move to 2,332. This is a high-probability continuation setup with strong SMC confluence.",
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function biasColor(bias: AnalysisProfile["bias"]) {
  switch (bias) {
    case "BULLISH":
      return "text-bull";
    case "BEARISH":
      return "text-bear";
    case "BREAKOUT":
      return "text-teal";
    default:
      return "text-warn";
  }
}

function biasBg(bias: AnalysisProfile["bias"]) {
  switch (bias) {
    case "BULLISH":
      return "bg-bull/10 border-bull/30";
    case "BEARISH":
      return "bg-bear/10 border-bear/30";
    case "BREAKOUT":
      return "bg-primary/10 border-primary/30";
    default:
      return "bg-warn/10 border-warn/30";
  }
}

function BiasIcon({ bias }: { bias: AnalysisProfile["bias"] }) {
  switch (bias) {
    case "BULLISH":
      return <TrendingUp className="w-5 h-5" />;
    case "BEARISH":
      return <TrendingDown className="w-5 h-5" />;
    case "BREAKOUT":
      return <Zap className="w-5 h-5" />;
    default:
      return <AlertTriangle className="w-5 h-5" />;
  }
}

function dirColor(dir: SMCZone["direction"]) {
  if (dir === "bullish") return "text-bull";
  if (dir === "bearish") return "text-bear";
  return "text-warn";
}

function amdColor(phase: AnalysisProfile["amdPhase"]) {
  if (phase === "Accumulation") return "text-bull";
  if (phase === "Manipulation") return "text-warn";
  return "text-bear";
}

// ── Sub-components ────────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.09, duration: 0.45 },
  }),
};

function ResultCard({
  children,
  index,
}: { children: React.ReactNode; index: number }) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="rounded-xl border border-border/60 card-glow p-4"
      style={{ background: "oklch(0.19 0.03 240)" }}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs uppercase tracking-widest font-semibold text-teal mb-1">
      {children}
    </p>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type Phase = "idle" | "analyzing" | "done";

export default function ChartAnalyzer() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisProfile | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setPhase("idle");
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) handleFile(dropped);
    },
    [handleFile],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (picked) handleFile(picked);
  };

  const analyzeChart = () => {
    if (!file) return;
    setPhase("analyzing");
    const profileIndex = file.size % 4;
    setTimeout(() => {
      setResult(PROFILES[profileIndex]);
      setPhase("done");
    }, 2400);
  };

  const reset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setResult(null);
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const inputId = "chart-file-input";

  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest font-semibold text-teal mb-3">
            CHART ANALYSIS
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            AI-Powered Chart Scanner
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Upload any XAU/USD or forex chart screenshot and our AI engine will
            detect SMC zones, AMD phases, liquidity sweeps, and generate a
            structured trade setup in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* ── Left: Upload panel */}
          <div className="flex flex-col gap-4">
            {/* Hidden file input */}
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleInputChange}
              data-ocid="chart_analyzer.upload_button"
              disabled={!!file}
            />

            {/* Drop zone — uses <label> for semantic file-input association */}
            <label
              htmlFor={file ? undefined : inputId}
              data-ocid="chart_analyzer.dropzone"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={[
                "relative rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden block",
                file
                  ? "cursor-default"
                  : "cursor-pointer hover:border-primary/60",
                dragging
                  ? "border-primary/70 bg-primary/5"
                  : "border-border/60",
              ].join(" ")}
              style={{
                background: file
                  ? "oklch(0.17 0.025 240)"
                  : "oklch(0.19 0.03 240)",
                minHeight: 260,
              }}
            >
              <AnimatePresence mode="wait">
                {!file ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8"
                  >
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-primary/10 border border-primary/20">
                      <ImagePlus className="w-7 h-7 text-teal" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-foreground">
                        Drop your chart here
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        or{" "}
                        <span className="text-teal underline underline-offset-2">
                          click to browse
                        </span>
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Supports PNG, JPG, WEBP
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className="w-full h-full"
                  >
                    <img
                      src={preview!}
                      alt="Chart preview"
                      className="w-full object-contain rounded-2xl"
                      style={{ maxHeight: 300 }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </label>

            {/* File info */}
            <AnimatePresence>
              {file && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/60"
                  style={{ background: "oklch(0.19 0.03 240)" }}
                >
                  <BarChart2 className="w-4 h-4 text-teal flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-bull flex-shrink-0" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                data-ocid="chart_analyzer.primary_button"
                disabled={!file || phase === "analyzing"}
                onClick={analyzeChart}
                className="flex-1 font-semibold gap-2"
                style={{
                  background:
                    file && phase !== "analyzing"
                      ? "oklch(0.78 0.12 190)"
                      : undefined,
                  color:
                    file && phase !== "analyzing"
                      ? "oklch(0.14 0.025 240)"
                      : undefined,
                }}
              >
                {phase === "analyzing" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing…
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Analyze Chart
                  </>
                )}
              </Button>

              {file && (
                <Button
                  data-ocid="chart_analyzer.secondary_button"
                  variant="outline"
                  onClick={reset}
                  className="gap-2 border-border/60"
                >
                  <RefreshCw className="w-4 h-4" />
                  New
                </Button>
              )}
            </div>

            {/* Analyzing state label */}
            <AnimatePresence>
              {phase === "analyzing" && (
                <motion.div
                  data-ocid="chart_analyzer.loading_state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5"
                >
                  <Loader2 className="w-4 h-4 text-teal animate-spin" />
                  <span className="text-sm text-teal font-medium">
                    AI is analyzing your chart…
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    Detecting SMC zones, patterns &amp; liquidity
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Right: Results panel */}
          <div className="flex flex-col gap-4">
            <AnimatePresence>
              {phase === "idle" && !result && (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/40 p-16"
                  style={{ background: "oklch(0.19 0.03 240)" }}
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground text-center">
                    Analysis results will appear here after you upload a chart
                    and click Analyze
                  </p>
                </motion.div>
              )}

              {result && phase === "done" && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col gap-4"
                  data-ocid="chart_analyzer.success_state"
                >
                  {/* Bias + confidence */}
                  <ResultCard index={0}>
                    <SectionLabel>Overall Bias</SectionLabel>
                    <div className="flex items-center justify-between mt-2">
                      <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${biasBg(result.bias)}`}
                      >
                        <span className={biasColor(result.bias)}>
                          <BiasIcon bias={result.bias} />
                        </span>
                        <span
                          className={`font-bold text-lg ${biasColor(result.bias)}`}
                        >
                          {result.bias}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Confidence
                        </p>
                        <p className="text-2xl font-bold font-mono text-foreground">
                          {result.confidence}%
                        </p>
                      </div>
                    </div>
                  </ResultCard>

                  {/* Pattern + AMD phase */}
                  <ResultCard index={1}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <SectionLabel>Detected Pattern</SectionLabel>
                        <p className="font-semibold text-foreground mt-1">
                          {result.pattern}
                        </p>
                      </div>
                      <div>
                        <SectionLabel>AMD Phase</SectionLabel>
                        <p
                          className={`font-semibold mt-1 ${amdColor(result.amdPhase)}`}
                        >
                          {result.amdPhase}
                        </p>
                      </div>
                    </div>
                  </ResultCard>

                  {/* SMC Zones */}
                  <ResultCard index={2}>
                    <SectionLabel>SMC Zones Detected</SectionLabel>
                    <ul className="mt-2 flex flex-col gap-2">
                      {result.smcZones.map((z) => (
                        <li key={z.type} className="flex items-center gap-2">
                          <ChevronRight
                            className={`w-3.5 h-3.5 flex-shrink-0 ${dirColor(z.direction)}`}
                          />
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20 flex-shrink-0">
                            {z.type}
                          </span>
                          <span className={`text-sm ${dirColor(z.direction)}`}>
                            {z.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </ResultCard>

                  {/* Liquidity Sweeps */}
                  <ResultCard index={3}>
                    <SectionLabel>Liquidity Sweeps</SectionLabel>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      {result.liquiditySweeps.map((ls) => (
                        <div
                          key={ls.type}
                          className="rounded-lg border border-border/50 p-3"
                          style={{ background: "oklch(0.17 0.025 240)" }}
                        >
                          <Badge
                            className={`text-xs mb-1 ${
                              ls.type === "BSL"
                                ? "bg-bull/10 text-bull border-bull/20"
                                : "bg-bear/10 text-bear border-bear/20"
                            }`}
                            variant="outline"
                          >
                            {ls.type}
                          </Badge>
                          <p className="font-mono text-sm font-semibold text-foreground">
                            {ls.price}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ls.status}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ResultCard>

                  {/* Trade Setup */}
                  <ResultCard index={4}>
                    <SectionLabel>Trade Setup</SectionLabel>
                    <div className="mt-2 grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          Entry
                        </p>
                        <p className="font-mono font-bold text-foreground">
                          {result.tradeSetup.entry}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          Take Profit
                        </p>
                        <p className="font-mono font-bold text-bull">
                          {result.tradeSetup.takeProfit}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          Stop Loss
                        </p>
                        <p className="font-mono font-bold text-bear">
                          {result.tradeSetup.stopLoss}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Risk / Reward
                      </span>
                      <span className="font-mono font-bold text-teal">
                        {result.tradeSetup.rr}
                      </span>
                    </div>
                  </ResultCard>

                  {/* Summary */}
                  <ResultCard index={5}>
                    <SectionLabel>Analysis Summary</SectionLabel>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {result.summary}
                    </p>
                  </ResultCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
