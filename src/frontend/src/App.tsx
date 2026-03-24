import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ChartAnalyzer from "./components/ChartAnalyzer";
import FOSection from "./components/FOSection";
import Footer from "./components/Footer";
import HeroSection from "./components/HeroSection";
import Navigation from "./components/Navigation";
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
          <FOSection />
          <SignalsDashboard />
        </main>
        <Footer />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}
