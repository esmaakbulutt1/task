import type { QueueOptions, WorkOptions } from 'pg-boss';

export const QUEUE_NAMES = {
  NOTIFICATION_CREATED: 'notification-created',
  SEND_EMAIL: 'send-email',
  TASK_DEADLINE_REMINDER: 'task-deadline-reminder',
  PARSE_TASK_CSV: 'parse-task-csv',
  INSERT_TASK_BATCH: 'insert-task-batch',
  AUDIT_LOG: 'audit-log',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const ONE_DAY_IN_SECONDS = 24 * 60 * 60;
const ONE_WEEK_IN_SECONDS = 7 * ONE_DAY_IN_SECONDS;

export const QUEUE_OPTIONS = {
  [QUEUE_NAMES.NOTIFICATION_CREATED]: {
    retryLimit: 3,
    retryDelay: 5,
    retryBackoff: true,
    retryDelayMax: 60,
    expireInSeconds: 60,
    retentionSeconds: ONE_WEEK_IN_SECONDS,
    deleteAfterSeconds: ONE_DAY_IN_SECONDS,
  },
  [QUEUE_NAMES.SEND_EMAIL]: {
    retryLimit: 5,
    retryDelay: 30,
    retryBackoff: true,
    retryDelayMax: 15 * 60,
    expireInSeconds: 2 * 60,
    retentionSeconds: ONE_WEEK_IN_SECONDS,
    deleteAfterSeconds: ONE_DAY_IN_SECONDS,
  },
  [QUEUE_NAMES.TASK_DEADLINE_REMINDER]: {
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
    retryDelayMax: 10 * 60,
    expireInSeconds: 5 * 60,
    retentionSeconds: ONE_WEEK_IN_SECONDS,
    deleteAfterSeconds: ONE_DAY_IN_SECONDS,
  },
  [QUEUE_NAMES.PARSE_TASK_CSV]: {
    retryLimit: 2,
    retryDelay: 30,
    retryBackoff: true,
    retryDelayMax: 5 * 60,
    expireInSeconds: 30 * 60,
    retentionSeconds: ONE_WEEK_IN_SECONDS,
    deleteAfterSeconds: ONE_DAY_IN_SECONDS,
  },
  [QUEUE_NAMES.INSERT_TASK_BATCH]: {
    retryLimit: 3,
    retryDelay: 10,
    retryBackoff: true,
    retryDelayMax: 5 * 60,
    expireInSeconds: 5 * 60,
    retentionSeconds: ONE_WEEK_IN_SECONDS,
    deleteAfterSeconds: ONE_DAY_IN_SECONDS,
  },
  [QUEUE_NAMES.AUDIT_LOG]: {
    retryLimit: 5,
    retryDelay: 5,
    retryBackoff: true,
    retryDelayMax: 2 * 60,
    expireInSeconds: 60,
    retentionSeconds: ONE_WEEK_IN_SECONDS,
    deleteAfterSeconds: ONE_DAY_IN_SECONDS,
  },
} satisfies Record<QueueName, QueueOptions>;

export const DEFAULT_WORK_OPTIONS = {
  localConcurrency: 1,
  batchSize: 1,
  pollingIntervalSeconds: 2,
} satisfies WorkOptions;
