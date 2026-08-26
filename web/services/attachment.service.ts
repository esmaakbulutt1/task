import { apiRequest } from "@/services/api.service";
import type {
  AttachmentListResponse,
  DeleteAttachmentResponse,
  UploadAttachmentResponse,
} from "@/types/attachment.types";

function taskAttachmentsPath(taskId: string): string {
  return `/tasks/${encodeURIComponent(taskId)}/attachments`;
}

function attachmentPath(attachmentId: string): string {
  return `/attachments/${encodeURIComponent(attachmentId)}`;
}

export function getAttachments(
  taskId: string,
  accessToken: string,
): Promise<AttachmentListResponse> {
  return apiRequest<AttachmentListResponse>(taskAttachmentsPath(taskId), {
    method: "GET",
    token: accessToken,
  });
}

export function uploadAttachment(
  taskId: string,
  file: File,
  accessToken: string,
): Promise<UploadAttachmentResponse> {
  const body = new FormData();
  body.append("file", file);

  return apiRequest<UploadAttachmentResponse>(taskAttachmentsPath(taskId), {
    method: "POST",
    body,
    token: accessToken,
  });
}

export function deleteAttachment(
  attachmentId: string,
  accessToken: string,
): Promise<DeleteAttachmentResponse> {
  return apiRequest<DeleteAttachmentResponse>(attachmentPath(attachmentId), {
    method: "DELETE",
    token: accessToken,
  });
}
