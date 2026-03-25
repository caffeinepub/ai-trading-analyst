import { useCallback, useState } from "react";
import { toast } from "sonner";

export function useAlertNotifications() {
  const [alertsEnabled, setAlertsEnabled] = useState(false);

  const toggleAlerts = useCallback(async () => {
    if (!alertsEnabled) {
      if ("Notification" in window) {
        const perm = await Notification.requestPermission();
        if (perm === "granted" || perm === "denied") {
          setAlertsEnabled(true);
        } else {
          setAlertsEnabled(true);
        }
      } else {
        setAlertsEnabled(true);
      }
    } else {
      setAlertsEnabled(false);
    }
  }, [alertsEnabled]);

  const sendAlert = useCallback(
    (title: string, body: string) => {
      if (!alertsEnabled) return;
      // Sonner toast always
      toast(title, {
        description: body,
        duration: 5000,
      });
      // Browser notification if granted
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(title, { body, icon: "/favicon.ico" });
        } catch (_) {
          // ignore
        }
      }
    },
    [alertsEnabled],
  );

  return { alertsEnabled, toggleAlerts, sendAlert };
}
