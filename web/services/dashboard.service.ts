import { apiRequest } from "@/services/api.service";
import type { DashboardSummary } from "@/types/dashboard.types";

export function getDashboardSummary(
  accessToken: string,
): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>("/dashboard/summary", {
    method: "GET",
    token: accessToken,
  });
}
