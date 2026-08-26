export type ImportJobStatus =
  | "pending"
  | "parsing"
  | "processing"
  | "completed"
  | "failed";

export type ImportJob = {
  id: string;
  workspaceId: string;
  projectId: string;
  userId: string;
  fileName: string;
  storedFileName: string;
  status: ImportJobStatus;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  parsingFinished: boolean;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ImportJobStatusResponse = ImportJob & {
  successfulRows: number;
  progressPercentage: number;
};

export type ImportFailedRow = {
  id: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  errorMessage: string;
  createdAt: string;
};

export type ImportFailedRowsResponse = {
  data: ImportFailedRow[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type UploadImportResponse = ImportJob;
