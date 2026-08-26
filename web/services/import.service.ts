import { apiRequest } from "@/services/api.service";
import type {
  ImportFailedRowsResponse,
  ImportJobStatusResponse,
  UploadImportResponse,
} from "@/types/import.types";

export function uploadTaskCsv(
  projectId: string,
  file: File,
  accessToken: string,
): Promise<UploadImportResponse> {
  const body = new FormData();
  body.append("file", file);

  return apiRequest<UploadImportResponse>(
    `/projects/${encodeURIComponent(projectId)}/import/upload`,
    { method: "POST", body, token: accessToken },
  );
}

export function getImportStatus(
  jobId: string,
  accessToken: string,
): Promise<ImportJobStatusResponse> {
  return apiRequest<ImportJobStatusResponse>(
    `/imports/${encodeURIComponent(jobId)}/status`,
    { method: "GET", token: accessToken },
  );
}

export function getImportFailedRows(
  jobId: string,
  page: number,
  accessToken: string,
): Promise<ImportFailedRowsResponse> {
  const searchParams = new URLSearchParams({
    page: String(page),
    limit: "20",
  });

  return apiRequest<ImportFailedRowsResponse>(
    `/imports/${encodeURIComponent(jobId)}/failed-rows?${searchParams.toString()}`,
    { method: "GET", token: accessToken },
  );
}
