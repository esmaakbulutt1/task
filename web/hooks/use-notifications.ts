"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { requireAccessToken } from "@/lib/client-session";
import { getErrorMessage } from "@/lib/errors";
import { showToast } from "@/components/ui/toast";
import {
  announceNotificationsUpdated,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/services/notification.service";
import type {
  Notification,
  NotificationListResponse,
} from "@/types/notification.types";

const PAGE_SIZE = 10;

type NotificationPagination = Omit<
  NotificationListResponse,
  "data" | "unreadCount"
>;

export function useNotifications() {
  const t = useTranslations("Feedback.notifications");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<NotificationPagination>({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyResponse = useCallback((response: NotificationListResponse) => {
    setNotifications(response.data);
    setPagination({
      page: response.page,
      limit: response.limit,
      total: response.total,
      totalPages: response.totalPages,
    });
    setUnreadCount(response.unreadCount);
  }, []);

  const loadNotifications = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      applyResponse(
        await getNotifications(
          { page, limit: PAGE_SIZE },
          requireAccessToken(),
        ),
      );
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, t("loadFailed")));
    } finally {
      setLoading(false);
    }
  }, [applyResponse, page, t]);

  useEffect(() => {
    let cancelled = false;

    void getNotifications({ page, limit: PAGE_SIZE }, requireAccessToken())
      .then((response) => {
        if (!cancelled) {
          applyResponse(response);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!cancelled) {
          setError(getErrorMessage(requestError, t("loadFailed")));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applyResponse, page, t]);

  async function readNotification(notificationId: string): Promise<void> {
    const existing = notifications.find((item) => item.id === notificationId);
    if (!existing || existing.isRead) return;

    setActionId(notificationId);
    setError(null);

    try {
      const updated = await markNotificationRead(
        notificationId,
        requireAccessToken(),
      );
      setNotifications((current) =>
        current.map((item) => (item.id === notificationId ? updated : item)),
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      announceNotificationsUpdated();
      showToast(t("readSuccess"), "success");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, t("readFailed")));
    } finally {
      setActionId(null);
    }
  }

  async function readAllNotifications(): Promise<void> {
    setActionId("all");
    setError(null);

    try {
      await markAllNotificationsRead(requireAccessToken());
      setNotifications((current) =>
        current.map((item) => ({ ...item, isRead: true })),
      );
      setUnreadCount(0);
      announceNotificationsUpdated();
      showToast(t("readAllSuccess"), "success");
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError, t("readAllFailed")));
    } finally {
      setActionId(null);
    }
  }

  function changePage(nextPage: number): void {
    setLoading(true);
    setPage(nextPage);
  }

  return {
    notifications,
    pagination,
    unreadCount,
    loading,
    actionId,
    error,
    readNotification,
    readAllNotifications,
    changePage,
    loadNotifications,
  };
}
