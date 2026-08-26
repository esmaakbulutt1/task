import { resolve } from 'node:path';

export const IMPORT_UPLOAD_DIRECTORY = resolve(
  process.cwd(),
  'uploads',
  'imports',
);

export const MAX_IMPORT_FILE_SIZE = 25 * 1024 * 1024;
export const IMPORT_BATCH_SIZE = 500;

export const CSV_HEADERS = [
  'title',
  'description',
  'status',
  'priority',
  'due_date',
  'assigned_email',
] as const;

export const ALLOWED_IMPORT_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
]);
