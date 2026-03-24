// AI Trading Analysis Backend
import Map "mo:core/Map";
import Order "mo:core/Order";
import Iter "mo:core/Iter";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  type TradingSignalType = {
    #buy;
    #sell;
  };

  type TradingSignalStatus = {
    #active;
    #closed;
    #pending;
  };

  type TradingSignal = {
    tradingPair : Text;
    strategyName : Text;
    signalType : TradingSignalType;
    entryPrice : Float;
    takeProfit : Float;
    stopLoss : Float;
    accuracyScore : Nat;
    timestamp : Time.Time;
    status : TradingSignalStatus;
  };

  type ChartPatternDirection = {
    #bullish;
    #bearish;
  };

  type ChartPattern = {
    patternName : Text;
    tradingPair : Text;
    timeframe : Text;
    detectionTimestamp : Time.Time;
    accuracyPercentage : Nat;
    direction : ChartPatternDirection;
    description : Text;
  };

  type SmcZoneType = {
    #orderBlock;
    #fairValueGap;
    #bos;
    #choch;
  };

  type SmcZone = {
    zoneType : SmcZoneType;
    tradingPair : Text;
    priceLevel : Float;
    timeframe : Text;
    strength : Nat;
    timestamp : Time.Time;
  };

  type LiquiditySweepType = {
    #bsl;
    #ssl;
  };

  type LiquiditySweep = {
    sweepType : LiquiditySweepType;
    tradingPair : Text;
    priceLevel : Float;
    timestamp : Time.Time;
    volume : Float;
  };

  type MarketSentiment = {
    asset : Text;
    bullishPercentage : Nat;
    bearishPercentage : Nat;
    timestamp : Time.Time;
  };

  public type UserProfile = {
    name : Text;
  };

  module TradingSignal {
    public func compare(a : TradingSignal, b : TradingSignal) : Order.Order {
      Int.compare(a.timestamp, b.timestamp);
    };
  };

  module ChartPattern {
    public func compare(a : ChartPattern, b : ChartPattern) : Order.Order {
      Int.compare(a.detectionTimestamp, b.detectionTimestamp);
    };
  };

  module SmcZone {
    public func compare(a : SmcZone, b : SmcZone) : Order.Order {
      Int.compare(a.timestamp, b.timestamp);
    };
  };

  module LiquiditySweep {
    public func compare(a : LiquiditySweep, b : LiquiditySweep) : Order.Order {
      Int.compare(a.timestamp, b.timestamp);
    };
  };

  module MarketSentiment {
    public func compare(a : MarketSentiment, b : MarketSentiment) : Order.Order {
      Int.compare(a.timestamp, b.timestamp);
    };
  };

  let tradingSignals = Map.empty<Nat, TradingSignal>();
  let chartPatterns = Map.empty<Nat, ChartPattern>();
  let smcZones = Map.empty<Nat, SmcZone>();
  let liquiditySweeps = Map.empty<Nat, LiquiditySweep>();
  let marketSentiments = Map.empty<Text, MarketSentiment>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  var tradingSignalId = 1;
  var chartPatternId = 1;
  var smcZoneId = 1;
  var liquiditySweepId = 1;

  // Seed data (simplified for illustration)
  let seedTimestamp : Time.Time = Time.now();

  // Example Trading Signal
  let btcSignal : TradingSignal = {
    tradingPair = "BTC/USDT";
    strategyName = "Breakout";
    signalType = #buy;
    entryPrice = 30000.5;
    takeProfit = 32000.0;
    stopLoss = 29500.0;
    accuracyScore = 85;
    timestamp = seedTimestamp - 60_000_000_000;
    status = #active;
  };

  tradingSignals.add(0, btcSignal);

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Trading Signal Functions
  public shared ({ caller }) func addTradingSignal(signal : TradingSignal) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add trading signals");
    };
    let id = tradingSignalId;
    tradingSignals.add(id, signal);
    tradingSignalId += 1;
    id;
  };

  public query ({ caller }) func getTradingSignals() : async [TradingSignal] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view trading signals");
    };
    tradingSignals.values().toArray().sort();
  };

  // Chart Pattern Functions
  public shared ({ caller }) func addChartPattern(pattern : ChartPattern) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add chart patterns");
    };
    let id = chartPatternId;
    chartPatterns.add(id, pattern);
    chartPatternId += 1;
    id;
  };

  public query ({ caller }) func getChartPatterns() : async [ChartPattern] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view chart patterns");
    };
    chartPatterns.values().toArray().sort();
  };

  // SMC Zone Functions
  public shared ({ caller }) func addSmcZone(zone : SmcZone) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add SMC zones");
    };
    let id = smcZoneId;
    smcZones.add(id, zone);
    smcZoneId += 1;
    id;
  };

  public query ({ caller }) func getSmcZones() : async [SmcZone] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view SMC zones");
    };
    smcZones.values().toArray().sort();
  };

  // Liquidity Sweep Functions
  public shared ({ caller }) func addLiquiditySweep(sweep : LiquiditySweep) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add liquidity sweeps");
    };
    let id = liquiditySweepId;
    liquiditySweeps.add(id, sweep);
    liquiditySweepId += 1;
    id;
  };

  public query ({ caller }) func getLiquiditySweeps() : async [LiquiditySweep] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view liquidity sweeps");
    };
    liquiditySweeps.values().toArray().sort();
  };

  // Market Sentiment Functions
  public shared ({ caller }) func updateMarketSentiment(sentiment : MarketSentiment) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update market sentiment");
    };
    marketSentiments.add(sentiment.asset, sentiment);
  };

  public query ({ caller }) func getMarketSentiment(asset : Text) : async ?MarketSentiment {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view market sentiment");
    };
    marketSentiments.get(asset);
  };
};
