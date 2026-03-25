# AI Trading Analyst

## Current State
The app has 5 dedicated strategy sections: AMD, LiquiditySweep, OrderBlock, FVG, and HTScalperGoldPro. Live prices are fetched via `useLivePrices` hook which uses react-query with a 60s refetch interval. Sections display live-anchored signal levels but none have:
- A visible countdown/auto-refresh timer
- Browser notification alerts when signals change
- In-app toast notifications for signal events

## Requested Changes (Diff)

### Add
- A `useAutoRefresh` hook (or shared utility) that triggers data regeneration on a configurable interval and exposes a countdown timer
- Auto-refresh timer UI in each section header showing countdown to next refresh (e.g. "Refreshing in 42s")
- Alert notification system: when a signal flips direction, a new phase becomes Active, or a key level is crossed, fire:
  1. Browser push notification (via `Notification` API, request permission on first interaction)
  2. In-app toast via Sonner with signal details
- A small bell icon toggle in each section header to enable/disable alerts for that section
- "Last updated" timestamp in each section header

### Modify
- AMDSection: add refresh timer, last updated, bell toggle, toast/browser notify when phase changes
- LiquiditySweepSection: add refresh timer, last updated, bell toggle, notify on new sweep detected
- OrderBlockSection: add refresh timer, last updated, bell toggle, notify on new order block
- FVGSection: add refresh timer, last updated, bell toggle, notify on new FVG
- HTScalperGoldPro: already has manual refresh; add auto-refresh countdown, bell toggle, toast notify on new signal

### Remove
- Nothing removed

## Implementation Plan
1. Create `src/frontend/src/hooks/useAutoRefresh.ts` — interval timer hook returning countdown seconds and a forceRefresh callback
2. Create `src/frontend/src/hooks/useAlertNotifications.ts` — manages Notification API permission, enabled state per section, and a `sendAlert(title, body)` helper that fires both browser notification and Sonner toast
3. Update each of the 5 section components to:
   - Use `useAutoRefresh` to regenerate/re-derive signal data every 30s
   - Show countdown and last-updated in the section header
   - Show bell icon button that toggles alerts for that section
   - Call `sendAlert` on signal state changes using `useEffect` to detect changes
