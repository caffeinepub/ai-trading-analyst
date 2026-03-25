import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bell, ChevronDown, Menu, Search, TrendingUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useLivePrices } from "../hooks/useLivePrices";

const NAV_LINKS = [
  { label: "Markets", href: "#markets" },
  { label: "SMC Hub", href: "#smc" },
  { label: "AMD", href: "#amd" },
  { label: "Liquidity", href: "#liquidity-sweep" },
  { label: "Order Block", href: "#order-block" },
  { label: "FVG", href: "#fvg" },
  { label: "HT Scalper", href: "#ht-scalper-gold-pro" },
  { label: "Signals", href: "#signals" },
  { label: "F&O", href: "#fo" },
];

const TICKER_META: Array<{ pair: string; decimals: number }> = [
  { pair: "XAU/USD", decimals: 2 },
  { pair: "EUR/USD", decimals: 4 },
  { pair: "GBP/USD", decimals: 4 },
  { pair: "USD/JPY", decimals: 2 },
  { pair: "GBP/JPY", decimals: 2 },
  { pair: "EUR/JPY", decimals: 2 },
];

export default function Navigation() {
  const [activeLink, setActiveLink] = useState("Markets");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [blink, setBlink] = useState(true);
  const [driftedPrices, setDriftedPrices] = useState<Record<string, number>>(
    {},
  );
  const { login, clear, loginStatus, identity } = useInternetIdentity();
  const isLoggedIn = loginStatus === "success" && !!identity;
  const principal = identity?.getPrincipal().toString();
  const shortPrincipal = principal ? `${principal.slice(0, 6)}…` : "Guest";

  const { prices, isLoading } = useLivePrices();

  // Apply live prices to drifted state once loaded
  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      setDriftedPrices(prices);
    }
  }, [prices]);

  // Tiny drift effect on top of live prices for live feel
  useEffect(() => {
    const interval = setInterval(() => {
      setDriftedPrices((prev) => {
        if (Object.keys(prev).length === 0) return prev;
        const next: Record<string, number> = {};
        for (const [k, v] of Object.entries(prev)) {
          const drift = (Math.random() - 0.5) * 0.00012 * v;
          next[k] = v + drift;
        }
        return next;
      });
    }, 8000);
    const blinkInterval = setInterval(() => setBlink((b) => !b), 1000);
    return () => {
      clearInterval(interval);
      clearInterval(blinkInterval);
    };
  }, []);

  return (
    <header
      className="sticky top-0 z-50 border-b border-border/60 backdrop-blur-sm"
      style={{ background: "oklch(0.16 0.028 240 / 0.95)" }}
    >
      {/* Live price ticker strip */}
      <div
        className="border-b border-border/40 overflow-hidden"
        style={{ background: "oklch(0.13 0.025 240)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-5 py-1 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: blink ? "oklch(0.76 0.17 150)" : "transparent",
                  transition: "background 0.3s",
                  boxShadow: blink ? "0 0 4px oklch(0.76 0.17 150)" : "none",
                }}
              />
              <span
                className="text-xs font-semibold tracking-widest uppercase"
                style={{
                  color: blink
                    ? "oklch(0.76 0.17 150)"
                    : "oklch(0.55 0.06 150)",
                }}
              >
                {isLoading ? "LOADING" : "LIVE"}
              </span>
            </div>

            {TICKER_META.map(({ pair, decimals }) => {
              const price = driftedPrices[pair];
              if (!price && !isLoading) return null;
              const prev = prices[pair] ?? price;
              const isBull = price ? price >= prev - price * 0.0001 : true;
              const color = isBull
                ? "oklch(0.76 0.17 150)"
                : "oklch(0.65 0.18 20)";

              return (
                <div key={pair} className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-semibold text-muted-foreground">
                    {pair}
                  </span>
                  {isLoading || !price ? (
                    <span className="text-xs font-mono text-muted-foreground animate-pulse">
                      —
                    </span>
                  ) : (
                    <>
                      <span className="text-xs font-mono font-bold text-foreground">
                        {pair === "XAU/USD" && "$"}
                        {price.toFixed(decimals)}
                      </span>
                      <span className="text-xs font-semibold" style={{ color }}>
                        {isBull ? "▲" : "▼"}
                      </span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-lg text-foreground tracking-tight leading-none">
                Apex <span className="text-teal">AI</span>
              </span>
              <span className="text-[10px] text-muted-foreground tracking-wider uppercase leading-none mt-0.5">
                Forex &amp; Gold
              </span>
            </div>
          </div>

          <nav
            className="hidden md:flex items-center gap-0.5 overflow-x-auto"
            data-ocid="nav.section"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setActiveLink(link.label)}
                className={`px-3 py-2 text-xs font-medium rounded-md transition-colors relative whitespace-nowrap ${
                  activeLink === link.label
                    ? "text-teal"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-ocid={`nav.${link.label.toLowerCase().replace(" ", "_")}.link`}
              >
                {link.label}
                {activeLink === link.label && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-teal rounded-full" />
                )}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex text-muted-foreground hover:text-foreground"
              data-ocid="nav.search_input"
            >
              <Search className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:flex text-muted-foreground hover:text-foreground relative"
              data-ocid="nav.bell.button"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-bear rounded-full" />
            </Button>
            {isLoggedIn ? (
              <Button
                type="button"
                variant="ghost"
                className="flex items-center gap-2 h-auto py-1 px-2"
                onClick={() => clear()}
                data-ocid="nav.user.button"
              >
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="bg-secondary text-xs font-mono text-teal">
                    {shortPrincipal.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium text-foreground">
                  {shortPrincipal}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:opacity-90 font-semibold text-xs px-3"
                onClick={() => login()}
                disabled={loginStatus === "logging-in"}
                data-ocid="nav.login.button"
              >
                {loginStatus === "logging-in" ? "Connecting…" : "Connect"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-ocid="nav.menu.button"
            >
              {mobileOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 px-4 py-2">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => {
                setActiveLink(link.label);
                setMobileOpen(false);
              }}
              className={`block px-3 py-2 text-sm rounded-md ${
                activeLink === link.label
                  ? "text-teal bg-secondary"
                  : "text-muted-foreground"
              }`}
              data-ocid={`nav.mobile.${link.label.toLowerCase()}.link`}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
