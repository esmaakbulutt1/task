import type { NotificationType } from './notifications.service';

export interface NotificationCreatedJobData {
  eventId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}
