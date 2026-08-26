import type { TaskPriority, TaskStatus } from '../tasks/tasks.service';

export interface ParseTaskCsvJobData {
  importJobId: string;
}

export interface ImportTaskRow {
  rowNumber: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assignedTo: string | null;
}

export interface InsertTaskBatchJobData {
  importJobId: string;
  projectId: string;
  userId: string;
  batchNumber: number;
  rows: ImportTaskRow[];
}
