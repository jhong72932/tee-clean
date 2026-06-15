import { useEffect, useRef } from "react";
import { ALL_IDS, SC } from "../lib/constants";
import { unitStatus } from "../lib/utils";
import type { UnitsData } from "../lib/types";

const STORAGE_KEY = "atq_notified_v1";
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // re-check every 30 min while open

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  if (Notification.permission === "default") return Notification.requestPermission();
  return Notification.permission;
}

/** Notifies for units that are overdue or never-serviced. Re-checks on data
 *  change and on an interval so newly-overdue units get flagged while the
 *  app stays open. */
export function useOverdueNotifications(data: UnitsData, enabled: boolean) {
  const dataRef = useRef(data);
  dataRef.current = data;

  useEffect(() => {
    if (!enabled || !notificationsSupported() || Notification.permission !== "granted") return;

    function check() {
      const notified: Record<string, string> = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      let changed = false;
      const d = dataRef.current;

      ALL_IDS.forEach((id) => {
        const st = unitStatus(d[id]?.records);
        if (st === "overdue" || st === "never") {
          if (notified[id] !== st) {
            new Notification("Auto Tee 관리 알림", {
              body: `Unit ${id} — ${SC[st].label}. 관리가 필요합니다.`,
              tag: `atq-${id}`,
            });
            notified[id] = st;
            changed = true;
          }
        } else if (notified[id]) {
          delete notified[id];
          changed = true;
        }
      });

      if (changed) localStorage.setItem(STORAGE_KEY, JSON.stringify(notified));
    }

    check();
    const t = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(t);
  }, [data, enabled]);
}
