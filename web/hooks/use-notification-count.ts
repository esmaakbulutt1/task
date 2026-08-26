"use client";

import { useEffect, useState } from "react";

import { requireAccessToken } from "@/lib/client-session";
import {
  getNotifications,
  NOTIFICATIONS_UPDATED_EVENT,
} from "@/services/notification.service";

export function useNotificationCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadCount = (): void => {
      void getNotifications({ page: 1, limit: 1 }, requireAccessToken())
        .then((response) => {
          if (!cancelled) setCount(response.unreadCount);
        })
        .catch(() => {
          if (!cancelled) setCount(0);
        });
    };

    loadCount();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, loadCount);

    return () => {
      cancelled = true;
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, loadCount);
    };
  }, []);

  return count;
}
