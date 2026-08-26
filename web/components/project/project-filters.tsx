"use client";

import { useTranslations } from "next-intl";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import Button from "@/components/ui/button";
import FormMessage from "@/components/ui/form-message";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import type {
  ProjectListQuery,
  ProjectSort,
  ProjectStatus,
  SortOrder,
} from "@/types/project.types";

type FilterValues = {
  search: string;
  status: ProjectStatus | "";
  dateFrom: string;
  dateTo: string;
  sort: ProjectSort;
  order: SortOrder;
};

type ProjectFiltersProps = {
  query: ProjectListQuery;
  disabled?: boolean;
  onChange: (changes: Partial<ProjectListQuery>) => void;
};

function valuesFromQuery(query: ProjectListQuery): FilterValues {
  return {
    search: query.search ?? "",
    status: query.status ?? "",
    dateFrom: query.dateFrom ?? "",
    dateTo: query.dateTo ?? "",
    sort: query.sort,
    order: query.order,
  };
}

export default function ProjectFilters({
  query,
  disabled = false,
  onChange,
}: ProjectFiltersProps) {
  const t = useTranslations("Projects.filters");
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

    if (values.dateFrom && values.dateTo && values.dateTo < values.dateFrom) {
      setError(validationT("endBeforeStart"));
      return;
    }

    onChange({
      search: values.search.trim() || undefined,
      status: values.status || undefined,
      dateFrom: values.dateFrom || undefined,
      dateTo: values.dateTo || undefined,
      sort: values.sort,
      order: values.order,
    });
  }

  function clearFilters(): void {
    const cleared: FilterValues = {
      search: "",
      status: "",
      dateFrom: "",
      dateTo: "",
      sort: "created_at",
      order: "desc",
    };

    setValues(cleared);
    setError(null);
    onChange({
      search: undefined,
      status: undefined,
      dateFrom: undefined,
      dateTo: undefined,
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
          <option value="planned">{commonT("projectStatus.planned")}</option>
          <option value="active">{commonT("projectStatus.active")}</option>
          <option value="completed">{commonT("projectStatus.completed")}</option>
          <option value="archived">{commonT("projectStatus.archived")}</option>
        </Select>

        <Select
          label={commonT("sortField")}
          name="sort"
          value={values.sort}
          onChange={handleChange}
          disabled={disabled}
        >
          <option value="created_at">{t("createdAt")}</option>
          <option value="name">{t("name")}</option>
          <option value="status">{t("status")}</option>
          <option value="start_date">{t("startDate")}</option>
          <option value="due_date">{t("dueDate")}</option>
        </Select>

        <Input
          label={t("createdFrom")}
          name="dateFrom"
          type="date"
          value={values.dateFrom}
          onChange={handleChange}
          disabled={disabled}
        />

        <Input
          label={t("createdTo")}
          name="dateTo"
          type="date"
          value={values.dateTo}
          onChange={handleChange}
          min={values.dateFrom || undefined}
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
