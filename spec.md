# AI Trading Analyst

## Current State
The app is a multi-section trading platform with forex (XAU/USD, EUR/USD, GBP/USD, USD/JPY, GBP/JPY, EUR/JPY) analytics, SMC tools, AMD cycles, liquidity sweep, order block, FVG, HT Scalper Gold Pro, candlestick patterns, chart patterns, F&O section, and live price ticker in nav. BTC/USD is not currently supported.

## Requested Changes (Diff)

### Add
- **Crypto section** (id="crypto") — dedicated page for BTC/USD with high-accuracy trading signals
  - Live BTC/USD price from CoinGecko API (https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd) with fallback to Binance (https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT)
  - BTC/USD added to nav ticker bar
  - Signals: AMD phase analysis anchored to live BTC price (A-grade, 85%+ accuracy)
  - Liquidity sweep levels for BTC/USD with approach badge
  - Order block detection for BTC/USD with entry/SL/TP/R:R
  - FVG detection for BTC/USD
  - 30s auto-refresh with countdown, "Last Updated" timestamp, bell alert toggle
  - GainzAlgo V2 Alpha signals for BTC/USD (EMA9/21 crossover + RSI)
  - Signal grade A badge (85%+ accuracy)
  - "Crypto" nav link pointing to #crypto

### Modify
- `useLivePrices.ts` — add BTC/USD fetching from CoinGecko/Binance
- `Navigation.tsx` — add BTC/USD to ticker meta array; add "Crypto" nav link
- `App.tsx` — render `<CryptoSection />` before or after `<FOSection />`

### Remove
- Nothing removed

## Implementation Plan
1. Update `useLivePrices.ts` to fetch BTC/USD from CoinGecko with Binance fallback
2. Update `Navigation.tsx` ticker + nav link for Crypto
3. Create `CryptoSection.tsx` with all sub-sections (AMD, Liquidity, Order Block, FVG, GainzAlgo signals) all live-price-anchored, 30s refresh, alert bell
4. Update `App.tsx` to include `<CryptoSection />`
5. Validate
