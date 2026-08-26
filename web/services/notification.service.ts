import { apiRequest } from "@/services/api.service";
import type {
  MarkAllNotificationsReadResponse,
  MarkNotificationReadResponse,
  NotificationListQuery,
  NotificationListResponse,
} from "@/types/notification.types";

export const NOTIFICATIONS_UPDATED_EVENT = "taskflow:notifications-updated";

export function getNotifications(
  query: NotificationListQuery,
  accessToken: string,
): Promise<NotificationListResponse> {
  const searchParams = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
  });

  return apiRequest<NotificationListResponse>(
    `/notifications?${searchParams.toString()}`,
    { method: "GET", token: accessToken },
  );
}

export function markNotificationRead(
  notificationId: string,
  accessToken: string,
): Promise<MarkNotificationReadResponse> {
  return apiRequest<MarkNotificationReadResponse>(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PATCH", token: accessToken },
  );
}

export function markAllNotificationsRead(
  accessToken: string,
): Promise<MarkAllNotificationsReadResponse> {
  return apiRequest<MarkAllNotificationsReadResponse>(
    "/notifications/read-all",
    { method: "PATCH", token: accessToken },
  );
}

export function announceNotificationsUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
  }
}
