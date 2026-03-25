import { useCallback, useEffect, useRef, useState } from "react";

export function useAutoRefresh(intervalSeconds = 30) {
  const [countdown, setCountdown] = useState(intervalSeconds);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);
  const countdownRef = useRef(intervalSeconds);

  const tick = useCallback(() => {
    countdownRef.current -= 1;
    if (countdownRef.current <= 0) {
      countdownRef.current = intervalSeconds;
      setRefreshKey((k) => k + 1);
      setLastUpdated(new Date());
    }
    setCountdown(countdownRef.current);
  }, [intervalSeconds]);

  useEffect(() => {
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  const forceRefresh = useCallback(() => {
    countdownRef.current = intervalSeconds;
    setCountdown(intervalSeconds);
    setRefreshKey((k) => k + 1);
    setLastUpdated(new Date());
  }, [intervalSeconds]);

  return { countdown, lastUpdated, forceRefresh, refreshKey };
}
