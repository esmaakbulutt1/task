export type ApiErrorResponse = {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
};
