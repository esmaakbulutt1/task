"use client";

import { useTranslations } from "next-intl";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import Button from "@/components/ui/button";
import FormMessage from "@/components/ui/form-message";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import type {
  TaskListQuery,
  TaskPriority,
  TaskSort,
  TaskSortOrder,
  TaskStatus,
} from "@/types/task.types";
import type { WorkspaceMember } from "@/types/workspace.types";

type FilterValues = {
  search: string;
  status: TaskStatus | "";
  priority: TaskPriority | "";
  assignedTo: string;
  createdBy: string;
  dueDateFrom: string;
  dueDateTo: string;
  sort: TaskSort;
  order: TaskSortOrder;
};

type TaskFiltersProps = {
  query: TaskListQuery;
  members: WorkspaceMember[];
  disabled?: boolean;
  onChange: (changes: Partial<TaskListQuery>) => void;
};

function valuesFromQuery(query: TaskListQuery): FilterValues {
  return {
    search: query.search ?? "",
    status: query.status ?? "",
    priority: query.priority ?? "",
    assignedTo: query.assignedTo ?? "",
    createdBy: query.createdBy ?? "",
    dueDateFrom: query.dueDateFrom ?? "",
    dueDateTo: query.dueDateTo ?? "",
    sort: query.sort,
    order: query.order,
  };
}

export default function TaskFilters({
  query,
  members,
  disabled = false,
  onChange,
}: TaskFiltersProps) {
  const t = useTranslations("Tasks.filters");
  const commonT = useTranslations("Common");
  const validationT = useTranslations("Common.validation");
  const [values, setValues] = useState<FilterValues>(() =>
    valuesFromQuery(query),
  );
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ): void {
    const field = event.target.name as keyof FilterValues;

    setValues((current) => ({ ...current, [field]: event.target.value }));
    setError(null);
  }

  function applyFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();

    if (
      values.dueDateFrom &&
      values.dueDateTo &&
      values.dueDateTo < values.dueDateFrom
    ) {
      setError(validationT("endBeforeStart"));
      return;
    }

    onChange({
      search: values.search.trim() || undefined,
      status: values.status || undefined,
      priority: values.priority || undefined,
      assignedTo: values.assignedTo || undefined,
      createdBy: values.createdBy || undefined,
      dueDateFrom: values.dueDateFrom || undefined,
      dueDateTo: values.dueDateTo || undefined,
      sort: values.sort,
      order: values.order,
    });
  }

  function clearFilters(): void {
    const cleared: FilterValues = {
      search: "",
      status: "",
      priority: "",
      assignedTo: "",
      createdBy: "",
      dueDateFrom: "",
      dueDateTo: "",
      sort: "created_at",
      order: "desc",
    };

    setValues(cleared);
    setError(null);
    onChange({
      search: undefined,
      status: undefined,
      priority: undefined,
      assignedTo: undefined,
      createdBy: undefined,
      dueDateFrom: undefined,
      dueDateTo: undefined,
      sort: cleared.sort,
      order: cleared.order,
    });
  }

  return (
    <form
      className="space-y-4 rounded-xl border border-slate-200 bg-white p-5"
      noValidate
      onSubmit={applyFilters}
    >
      <div>
        <h2 className="font-semibold text-slate-950">{commonT("filters")}</h2>
        <p className="mt-1 text-sm text-slate-500">
          {t("description")}
        </p>
      </div>

      {error && <FormMessage variant="error">{error}</FormMessage>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Input
          label={t("searchLabel")}
          name="search"
          type="search"
          value={values.search}
          onChange={handleChange}
          placeholder={t("searchPlaceholder")}
          maxLength={100}
          disabled={disabled}
        />

        <Select
          label={commonT("status")}
          name="status"
          value={values.status}
          onChange={handleChange}
          disabled={disabled}
        >
          <option value="">{t("allStatuses")}</option>
          <option value="backlog">{commonT("taskStatus.backlog")}</option>
          <option value="todo">{commonT("taskStatus.todo")}</option>
          <option value="in_progress">{commonT("taskStatus.inProgress")}</option>
          <option value="review">{commonT("taskStatus.review")}</option>
          <option value="completed">{commonT("taskStatus.completed")}</option>
        </Select>

        <Select
          label={commonT("priority")}
          name="priority"
          value={values.priority}
          onChange={handleChange}
          disabled={disabled}
        >
          <option value="">{t("allPriorities")}</option>
          <option value="low">{commonT("priorityLabels.low")}</option>
          <option value="medium">{commonT("priorityLabels.medium")}</option>
          <option value="high">{commonT("priorityLabels.high")}</option>
          <option value="urgent">{commonT("priorityLabels.urgent")}</option>
        </Select>

        <Select
          label={t("assignee")}
          name="assignedTo"
          value={values.assignedTo}
          onChange={handleChange}
          disabled={disabled}
        >
          <option value="">{t("allMembers")}</option>
          {members.map((member) => (
            <option key={member.id} value={member.userId}>
              {member.email}
            </option>
          ))}
        </Select>

        <Select
          label={t("creator")}
          name="createdBy"
          value={values.createdBy}
          onChange={handleChange}
          disabled={disabled}
        >
          <option value="">{t("allMembers")}</option>
          {members.map((member) => (
            <option key={member.id} value={member.userId}>
              {member.email}
            </option>
          ))}
        </Select>

        <Select
          label={commonT("sortField")}
          name="sort"
          value={values.sort}
          onChange={handleChange}
          disabled={disabled}
        >
          <option value="created_at">{t("createdAt")}</option>
          <option value="updated_at">{t("updatedAt")}</option>
          <option value="title">{t("title")}</option>
          <option value="status">{t("status")}</option>
          <option value="priority">{t("priority")}</option>
          <option value="due_date">{t("dueDate")}</option>
        </Select>

        <Input
          label={t("dueDateFrom")}
          name="dueDateFrom"
          type="date"
          value={values.dueDateFrom}
          onChange={handleChange}
          disabled={disabled}
        />

        <Input
          label={t("dueDateTo")}
          name="dueDateTo"
          type="date"
          value={values.dueDateTo}
          onChange={handleChange}
          min={values.dueDateFrom || undefined}
          disabled={disabled}
        />

        <Select
          label={commonT("sortDirection")}
          name="order"
          value={values.order}
          onChange={handleChange}
          disabled={disabled}
        >
          <option value="desc">{commonT("descending")}</option>
          <option value="asc">{commonT("ascending")}</option>
        </Select>
      </div>

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          fullWidth={false}
          disabled={disabled}
          onClick={clearFilters}
        >
          {commonT("clear")}
        </Button>
        <Button type="submit" fullWidth={false} disabled={disabled}>
          {commonT("applyFilters")}
        </Button>
      </div>
    </form>
  );
}
