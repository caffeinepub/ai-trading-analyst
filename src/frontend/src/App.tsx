import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AMDSection from "./components/AMDSection";
import CandlestickPatterns from "./components/CandlestickPatterns";
import ChartAnalyzer from "./components/ChartAnalyzer";
import ChartPatternsSection from "./components/ChartPatternsSection";
import CryptoSection from "./components/CryptoSection";
import FOSection from "./components/FOSection";
import FVGSection from "./components/FVGSection";
import Footer from "./components/Footer";
import HTScalperGoldPro from "./components/HTScalperGoldPro";
import HeroSection from "./components/HeroSection";
import LiquiditySweepSection from "./components/LiquiditySweepSection";
import Navigation from "./components/Navigation";
import OrderBlockSection from "./components/OrderBlockSection";
import SMCAnalysisHub from "./components/SMCAnalysisHub";
import SignalsDashboard from "./components/SignalsDashboard";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div
        className="min-h-screen flex flex-col"
        style={{
          background:
            "linear-gradient(160deg, oklch(0.14 0.025 240) 0%, oklch(0.17 0.03 240) 100%)",
        }}
      >
        <Navigation />
        <main className="flex-1">
          <HeroSection />
          <ChartAnalyzer />
          <SMCAnalysisHub />
          <AMDSection />
          <LiquiditySweepSection />
          <OrderBlockSection />
          <FVGSection />
          <ChartPatternsSection />
          <CandlestickPatterns />
          <HTScalperGoldPro />
          <CryptoSection />
          <FOSection />
          <SignalsDashboard />
        </main>
        <Footer />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
