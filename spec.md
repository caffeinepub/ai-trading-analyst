# AI Trading Analyst

## Current State
App has dedicated sections for AMD, Liquidity Sweep, Order Block, FVG, HT Scalper Gold Pro, and a chart patterns overview card inside SMCAnalysisHub. Navigation has links for Markets, Analysis, SMC Tools, Signals, F&O, Academy. Chart patterns (V14) covers both chart and candlestick patterns in one section.

## Requested Changes (Diff)

### Add
- A completely new, dedicated **Candlestick Pattern Detection** section (`id="candlestick-patterns"`) as a standalone full-page section
- Detects ALL major candlestick patterns (35+), both single-candle and multi-candle:
  - Single: Doji, Gravestone Doji, Dragonfly Doji, Long-Legged Doji, Hammer, Inverted Hammer, Shooting Star, Hanging Man, Spinning Top, Marubozu (Bull/Bear), Belt Hold (Bull/Bear)
  - Two-candle: Bullish/Bearish Engulfing, Tweezer Top/Bottom, Bullish/Bearish Harami, Piercing Line, Dark Cloud Cover
  - Three-candle: Morning Star, Evening Star, Morning Doji Star, Evening Doji Star, Three White Soldiers, Three Black Crows, Three Inside Up/Down, Three Outside Up/Down, Abandoned Baby
- Each pattern card shows: pattern name, category (single/two/three candle), bias (Bullish/Bearish/Neutral), mini SVG candle illustration, confidence %, description of the setup, current pair/price where detected, timeframe
- Pair and timeframe selectors (XAU/USD, EUR/USD, GBP/USD, USD/JPY, GBP/JPY, EUR/JPY) × (M5, M15, H1, H4, D1)
- Auto-refresh every 30 seconds with countdown timer and "Last Updated" timestamp
- Bell icon for browser/in-app alert toggle
- Summary bar at top: total patterns detected, bullish count (green), bearish count (red), neutral count
- Nav link added: "Candles" → `#candlestick-patterns`

### Modify
- Navigation: add "Candles" link pointing to `#candlestick-patterns`
- App.tsx: import and render `<CandlestickPatterns />` between SMCAnalysisHub and FOSection

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/components/CandlestickPatterns.tsx` with full pattern detection logic, mini SVG candle illustrations for every pattern, pair/TF selectors, auto-refresh, alert bell
2. Update `Navigation.tsx` to add "Candles" nav link
3. Update `App.tsx` to include `<CandlestickPatterns />`
