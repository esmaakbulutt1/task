export type Attachment = {
  id: string;
  taskId: string;
  uploadedBy: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export type AttachmentListResponse = Attachment[];
export type UploadAttachmentResponse = Attachment;

export type DeleteAttachmentResponse = {
  message: string;
};
