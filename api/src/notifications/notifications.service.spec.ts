import type { DbService } from '../database/db.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const notification = {
    id: 'notification-id',
    userId: 'user-id',
    type: 'task_assigned',
    title: 'Yeni görev',
    message: 'Size yeni bir görev atandı.',
    isRead: false,
    createdAt: new Date('2026-08-14T09:00:00.000Z'),
  };
  const query = jest.fn().mockResolvedValue({ rows: [notification] });
  const service = new NotificationsService({
    query,
  } as unknown as DbService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stores queued notifications idempotently by event id', async () => {
    const result = await service.create(
      'user-id',
      'task_assigned',
      'Yeni görev',
      'Size yeni bir görev atandı.',
      undefined,
      'event-id',
    );

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('ON CONFLICT (event_id) DO UPDATE'),
      [
        'event-id',
        'user-id',
        'task_assigned',
        'Yeni görev',
        'Size yeni bir görev atandı.',
      ],
    );
    expect(result).toEqual(notification);
  });
});
