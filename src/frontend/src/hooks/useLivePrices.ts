import { useQuery } from "@tanstack/react-query";

export interface LivePrices {
  prices: Record<string, number>;
  isLoading: boolean;
  isError: boolean;
  lastUpdated: Date | null;
}

async function fetchFxPrices(): Promise<Record<string, number>> {
  const res = await fetch(
    "https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY",
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
}

async function fetchGoldPrice(): Promise<number> {
  try {
    // Use allorigins proxy to bypass CORS on metals.live
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent("https://api.metals.live/v1/spot/gold")}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const wrapper = await res.json();
      const inner = JSON.parse(wrapper.contents as string);
      if (Array.isArray(inner) && inner[0]?.gold)
        return inner[0].gold as number;
    }
  } catch {
    // fall through to backup
  }
  try {
    const res2 = await fetch("https://api.gold-api.com/price/XAU");
    if (res2.ok) {
      const data2 = await res2.json();
      return data2.price as number;
    }
  } catch {
    // fall through to static fallback
  }
  return 3058;
}

const FUTURES_PRICES: Record<string, number> = {
  "NIFTY FUT": 22480,
  "BANKNIFTY FUT": 47850,
  "CRUDE OIL": 78.5,
  "NATURAL GAS": 1.87,
  "S&P 500 FUT": 5620,
  "NASDAQ FUT": 19750,
};

async function fetchAllPrices(): Promise<Record<string, number>> {
  const [fx, gold] = await Promise.all([fetchFxPrices(), fetchGoldPrice()]);
  return { ...fx, "XAU/USD": gold, ...FUTURES_PRICES };
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
