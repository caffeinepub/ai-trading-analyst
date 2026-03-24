import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { motion } from "motion/react";
import TradingViewChart from "./TradingViewChart";

export default function HeroSection() {
  return (
    <section
      id="markets"
      className="relative pt-16 pb-12 px-4 sm:px-6 lg:px-8 overflow-hidden"
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 40% at 50% -10%, oklch(0.75 0.12 80 / 0.07) 0%, oklch(0.78 0.12 190 / 0.05) 50%, transparent 70%)",
        }}
      />

      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-center gap-2 mb-5"
        >
          <Zap className="w-3 h-3 text-teal" />
          <span className="text-xs font-semibold tracking-widest uppercase text-teal">
            FOREX &amp; GOLD TRADING INTELLIGENCE · GAINZALGO V2 ALPHA
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="font-display font-bold text-center text-4xl sm:text-5xl lg:text-6xl text-foreground tracking-tight leading-tight mb-4 uppercase"
        >
          Dominate Forex &amp; Gold{" "}
          <span
            className="text-transparent bg-clip-text"
            style={{
              backgroundImage:
                "linear-gradient(90deg, oklch(0.75 0.12 80), oklch(0.78 0.12 190))",
            }}
          >
            With Precision AI
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-center text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto mb-4"
        >
          Real-time live prices · GainzAlgo V2 Alpha indicator · SMC, AMD cycle
          analysis and liquidity sweep detection on XAU/USD &amp; major forex
          pairs.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-center gap-3 mb-10"
        >
          <Button
            className="bg-primary text-primary-foreground hover:opacity-90 font-semibold gap-2"
            data-ocid="hero.cta.primary_button"
          >
            Start Analyzing <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            className="border-border text-foreground hover:bg-secondary"
            data-ocid="hero.cta.secondary_button"
          >
            View Live Signals
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          data-ocid="hero.chart_point"
        >
          <TradingViewChart />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8"
        >
          {[
            {
              label: "Signals Today",
              value: "52",
              sub: "+9 vs yesterday",
              color: "text-teal",
            },
            {
              label: "Accuracy Rate",
              value: "86.4%",
              sub: "30-day avg",
              color: "text-bull",
            },
            {
              label: "Active Pairs",
              value: "28",
              sub: "Forex + XAU/USD",
              color: "text-teal",
            },
            {
              label: "Avg Pip Target",
              value: "42 pips",
              sub: "Risk/Reward 1:3.1",
              color: "text-bull",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/60 p-4 text-center"
              style={{ background: "oklch(0.19 0.03 240)" }}
            >
              <div className={`font-display text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-xs font-semibold text-foreground mt-0.5">
                {stat.label}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {stat.sub}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
