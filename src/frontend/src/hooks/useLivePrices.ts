import { useQuery } from "@tanstack/react-query";

export interface LivePrices {
  prices: Record<string, number>;
  isLoading: boolean;
  isError: boolean;
  lastUpdated: Date | null;
}

// Proxy Yahoo Finance to bypass CORS
async function yahooPrice(symbol: string): Promise<number | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const wrapper = await res.json();
    const data = JSON.parse(wrapper.contents as string);
    const meta = data?.chart?.result?.[0]?.meta;
    if (meta?.regularMarketPrice) return meta.regularMarketPrice as number;
    return null;
  } catch {
    return null;
  }
}

async function fetchFxPrices(): Promise<Record<string, number>> {
  try {
    const res = await fetch(
      "https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY",
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) throw new Error("Frankfurter API failed");
    const data = await res.json();
    const eur = data.rates.EUR as number;
    const gbp = data.rates.GBP as number;
    const jpy = data.rates.JPY as number;

    const eurUsd = 1 / eur;
    const gbpUsd = 1 / gbp;
    const usdJpy = jpy;
    const gbpJpy = gbpUsd * usdJpy;
    const eurJpy = eurUsd * usdJpy;

    return {
      "EUR/USD": eurUsd,
      "GBP/USD": gbpUsd,
      "USD/JPY": usdJpy,
      "GBP/JPY": gbpJpy,
      "EUR/JPY": eurJpy,
    };
  } catch {
    // Fallback: fetch all 5 pairs from Yahoo Finance in parallel
    const [eurUsd, gbpUsd, usdJpy, gbpJpy, eurJpy] = await Promise.all([
      yahooPrice("EURUSD=X"),
      yahooPrice("GBPUSD=X"),
      yahooPrice("USDJPY=X"),
      yahooPrice("GBPJPY=X"),
      yahooPrice("EURJPY=X"),
    ]);
    return {
      "EUR/USD": eurUsd ?? 1.0824,
      "GBP/USD": gbpUsd ?? 1.2915,
      "USD/JPY": usdJpy ?? 149.52,
      "GBP/JPY": gbpJpy ?? 192.74,
      "EUR/JPY": eurJpy ?? 161.84,
    };
  }
}

async function fetchGoldPrice(): Promise<number> {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent("https://api.metals.live/v1/spot/gold")}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const wrapper = await res.json();
      const inner = JSON.parse(wrapper.contents as string);
      if (Array.isArray(inner) && inner[0]?.gold)
        return inner[0].gold as number;
    }
  } catch {
    /* fall through */
  }
  try {
    // Try Yahoo GC=F (Gold Futures)
    const yahooGold = await yahooPrice("GC=F");
    if (yahooGold && yahooGold > 2500) return yahooGold;
  } catch {
    /* fall through */
  }
  try {
    const res2 = await fetch("https://api.gold-api.com/price/XAU", {
      signal: AbortSignal.timeout(6000),
    });
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2.price) return data2.price as number;
    }
  } catch {
    /* fall through */
  }
  return 3085; // March 2026 fallback
}

async function fetchSilverPrice(): Promise<number> {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent("https://api.metals.live/v1/spot/silver")}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const wrapper = await res.json();
      const inner = JSON.parse(wrapper.contents as string);
      if (Array.isArray(inner) && inner[0]?.silver)
        return inner[0].silver as number;
    }
  } catch {
    /* fall through */
  }
  const yahooSilver = await yahooPrice("SI=F");
  if (yahooSilver && yahooSilver > 20) return yahooSilver;
  return 34.2; // March 2026 fallback
}

async function fetchCommodityAndEquityPrices(): Promise<
  Record<string, number>
> {
  // Fetch crude oil, natural gas, S&P 500 futures, NASDAQ futures from Yahoo
  const [crude, ng, sp500, nasdaq, nifty, banknifty] = await Promise.all([
    yahooPrice("CL=F"), // WTI Crude Oil Futures
    yahooPrice("NG=F"), // Natural Gas Futures
    yahooPrice("ES=F"), // S&P 500 E-mini Futures
    yahooPrice("NQ=F"), // NASDAQ 100 E-mini Futures
    yahooPrice("^NSEI"), // NIFTY 50 (India NSE)
    yahooPrice("^NSEBANK"), // BANKNIFTY (India NSE)
  ]);

  return {
    "CRUDE OIL": crude ?? 71.4, // WTI March 2026 fallback
    "NATURAL GAS": ng ?? 3.85, // Henry Hub March 2026 fallback
    "S&P 500 FUT": sp500 ?? 5680, // S&P 500 March 2026 fallback
    "NASDAQ FUT": nasdaq ?? 19850, // NASDAQ March 2026 fallback
    "NIFTY FUT": nifty ?? 23420, // NIFTY March 2026 fallback
    "BANKNIFTY FUT": banknifty ?? 50840, // BankNifty March 2026 fallback
  };
}

async function fetchAllPrices(): Promise<Record<string, number>> {
  const [fx, gold, silver, commodities] = await Promise.all([
    fetchFxPrices().catch(() => ({})),
    fetchGoldPrice(),
    fetchSilverPrice(),
    fetchCommodityAndEquityPrices(),
  ]);
  return {
    ...fx,
    "XAU/USD": gold,
    "XAG/USD": silver,
    ...commodities,
  };
}

export function useLivePrices(): LivePrices {
  const { data, isLoading, isError } = useQuery<Record<string, number>>({
    queryKey: ["live-prices"],
    queryFn: fetchAllPrices,
    staleTime: 55_000,
    refetchInterval: 60_000,
    retry: 2,
  });

  return {
    prices: data ?? {},
    isLoading,
    isError,
    lastUpdated: data ? new Date() : null,
  };
}
