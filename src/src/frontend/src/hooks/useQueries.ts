import { useQuery } from "@tanstack/react-query";
import type {
  ChartPattern,
  LiquiditySweep,
  MarketSentiment,
  SmcZone,
  TradingSignal,
} from "../backend.d";
import { useActor } from "./useActor";

export function useTradingSignals() {
  const { actor, isFetching } = useActor();
  return useQuery<TradingSignal[]>({
    queryKey: ["tradingSignals"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getTradingSignals();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useChartPatterns() {
  const { actor, isFetching } = useActor();
  return useQuery<ChartPattern[]>({
    queryKey: ["chartPatterns"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getChartPatterns();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSmcZones() {
  const { actor, isFetching } = useActor();
  return useQuery<SmcZone[]>({
    queryKey: ["smcZones"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getSmcZones();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useLiquiditySweeps() {
  const { actor, isFetching } = useActor();
  return useQuery<LiquiditySweep[]>({
    queryKey: ["liquiditySweeps"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getLiquiditySweeps();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useMarketSentiment(asset: string) {
  const { actor, isFetching } = useActor();
  return useQuery<MarketSentiment | null>({
    queryKey: ["marketSentiment", asset],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMarketSentiment(asset);
    },
    enabled: !!actor && !isFetching,
  });
}
