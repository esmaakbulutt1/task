import type { ProjectStatus } from "@/types/project.types";

type ProjectStatusTone = "neutral" | "blue" | "green" | "yellow";

export const projectStatusTones: Record<ProjectStatus, ProjectStatusTone> = {
  planned: "neutral",
  active: "blue",
  completed: "green",
  archived: "yellow",
};

export function toDateInputValue(value: string | null): string {
  return value?.slice(0, 10) ?? "";
}
