import { apiRequest } from "@/services/api.service";
import type {
  CommentListResponse,
  CreateCommentRequest,
  CreateCommentResponse,
  DeleteCommentResponse,
  UpdateCommentRequest,
  UpdateCommentResponse,
} from "@/types/comment.types";

function taskCommentsPath(taskId: string): string {
  return `/tasks/${encodeURIComponent(taskId)}/comments`;
}

function commentPath(commentId: string): string {
  return `/comments/${encodeURIComponent(commentId)}`;
}

export function getComments(
  taskId: string,
  accessToken: string,
): Promise<CommentListResponse> {
  return apiRequest<CommentListResponse>(taskCommentsPath(taskId), {
    method: "GET",
    token: accessToken,
  });
}

export function createComment(
  taskId: string,
  request: CreateCommentRequest,
  accessToken: string,
): Promise<CreateCommentResponse> {
  return apiRequest<CreateCommentResponse>(taskCommentsPath(taskId), {
    method: "POST",
    body: request,
    token: accessToken,
  });
}

export function updateComment(
  commentId: string,
  request: UpdateCommentRequest,
  accessToken: string,
): Promise<UpdateCommentResponse> {
  return apiRequest<UpdateCommentResponse>(commentPath(commentId), {
    method: "PATCH",
    body: request,
    token: accessToken,
  });
}

export function deleteComment(
  commentId: string,
  accessToken: string,
): Promise<DeleteCommentResponse> {
  return apiRequest<DeleteCommentResponse>(commentPath(commentId), {
    method: "DELETE",
    token: accessToken,
  });
}
