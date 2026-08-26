import { ApiError } from "@/services/api.service";

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError && error.kind === "network") {
    return fallback;
  }

  return error instanceof Error && error.message ? error.message : fallback;
}
