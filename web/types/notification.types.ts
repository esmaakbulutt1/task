export type NotificationType =
  | "workspace_member_added"
  | "task_assigned"
  | "task_commented"
  | "task_deadline_approaching"
  | "task_overdue"
  | "project_completed";

export type Notification = {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export type NotificationListQuery = {
  page: number;
  limit: number;
};

export type NotificationListResponse = {
  data: Notification[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  unreadCount: number;
};

export type MarkNotificationReadResponse = Notification;

export type MarkAllNotificationsReadResponse = {
  message: string;
};
