import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface MarketSentiment {
    asset: string;
    bearishPercentage: bigint;
    bullishPercentage: bigint;
    timestamp: Time;
}
export interface ChartPattern {
    direction: ChartPatternDirection;
    accuracyPercentage: bigint;
    timeframe: string;
    patternName: string;
    description: string;
    detectionTimestamp: Time;
    tradingPair: string;
}
export type Time = bigint;
export interface SmcZone {
    priceLevel: number;
    timeframe: string;
    strength: bigint;
    zoneType: SmcZoneType;
    timestamp: Time;
    tradingPair: string;
}
export interface LiquiditySweep {
    priceLevel: number;
    volume: number;
    timestamp: Time;
    sweepType: LiquiditySweepType;
    tradingPair: string;
}
export interface UserProfile {
    name: string;
}
export interface TradingSignal {
    status: TradingSignalStatus;
    takeProfit: number;
    stopLoss: number;
    timestamp: Time;
    entryPrice: number;
    accuracyScore: bigint;
    tradingPair: string;
    strategyName: string;
    signalType: TradingSignalType;
}
export enum ChartPatternDirection {
    bullish = "bullish",
    bearish = "bearish"
}
export enum LiquiditySweepType {
    bsl = "bsl",
    ssl = "ssl"
}
export enum SmcZoneType {
    bos = "bos",
    choch = "choch",
    fairValueGap = "fairValueGap",
    orderBlock = "orderBlock"
}
export enum TradingSignalStatus {
    closed = "closed",
    active = "active",
    pending = "pending"
}
export enum TradingSignalType {
    buy = "buy",
    sell = "sell"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addChartPattern(pattern: ChartPattern): Promise<bigint>;
    addLiquiditySweep(sweep: LiquiditySweep): Promise<bigint>;
    addSmcZone(zone: SmcZone): Promise<bigint>;
    addTradingSignal(signal: TradingSignal): Promise<bigint>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getChartPatterns(): Promise<Array<ChartPattern>>;
    getLiquiditySweeps(): Promise<Array<LiquiditySweep>>;
    getMarketSentiment(asset: string): Promise<MarketSentiment | null>;
    getSmcZones(): Promise<Array<SmcZone>>;
    getTradingSignals(): Promise<Array<TradingSignal>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateMarketSentiment(sentiment: MarketSentiment): Promise<void>;
}
