export type Comment = {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateCommentRequest = {
  content: string;
};

export type UpdateCommentRequest = {
  content: string;
};

export type CommentListResponse = Comment[];
export type CreateCommentResponse = Comment;
export type UpdateCommentResponse = Comment;

export type DeleteCommentResponse = {
  message: string;
};
