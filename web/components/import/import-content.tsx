"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import Button from "@/components/ui/button";
import ErrorState from "@/components/ui/error-state";
import FormMessage from "@/components/ui/form-message";
import Input from "@/components/ui/input";
import LoadingState from "@/components/ui/loading-state";
import PageHeader from "@/components/ui/page-header";
import Pagination from "@/components/ui/pagination";
import { useImport } from "@/hooks/use-import";
import { useProject } from "@/hooks/use-project";
import { Link } from "@/i18n/navigation";
import type { ImportJobStatus } from "@/types/import.types";

const MAX_IMPORT_SIZE = 25 * 1024 * 1024;

type ImportContentProps = {
  projectId: string;
  initialJobId?: string;
};

export default function ImportContent({
  projectId,
  initialJobId,
}: ImportContentProps) {
  const format = useFormatter();
  const t = useTranslations("Import");
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [fieldError, setFieldError] = useState<string | undefined>();
  const {
    project,
    workspaceRole,
    loading: projectLoading,
    loadError,
    reloadProject,
  } = useProject(projectId);
  const {
    job,
    failedRows,
    loading,
    uploading,
    error,
    uploadCsv,
    startNewImport,
    changeFailedPage,
  } = useImport(projectId, initialJobId);
  const statusLabels: Record<ImportJobStatus, string> = {
    pending: t("status.pending"),
    parsing: t("status.parsing"),
    processing: t("status.processing"),
    completed: t("status.completed"),
    failed: t("status.failed"),
  };

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    setFile(event.target.files?.[0] ?? null);
    setFieldError(undefined);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setFieldError(t("selectRequired"));
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFieldError(t("invalidExtension"));
      return;
    }
    if (file.size > MAX_IMPORT_SIZE) {
      setFieldError(t("maxSize"));
      return;
    }

    if (await uploadCsv(file)) {
      setFile(null);
      setInputKey((current) => current + 1);
    }
  }

  if (projectLoading) {
    return <LoadingState message={t("projectLoading")} />;
  }

  if (loadError || !project) {
    return (
      <ErrorState
        title={t("projectLoadError")}
        message={loadError ?? t("projectNotFound")}
        onRetry={() => void reloadProject()}
      />
    );
  }

  const canImport = workspaceRole === "owner" || workspaceRole === "admin";

  if (!canImport) {
    return (
      <ErrorState
        title={t("forbiddenTitle")}
        message={t("forbiddenDescription")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/projects/${projectId}`}
        className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        {t("backToProject")}
      </Link>

      <PageHeader
        title={t("title")}
        description={t("description", { name: project.name })}
        action={
          job ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              fullWidth={false}
              onClick={startNewImport}
            >
              {t("new")}
            </Button>
          ) : undefined
        }
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold text-slate-950">{t("formatTitle")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {t("headersDescription")}
        </p>
        <code className="mt-3 block overflow-x-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
          title,description,status,priority,due_date,assigned_email
        </code>
        <p className="mt-3 text-sm text-slate-500">
          {t("formatHint")}
        </p>
      </section>

      {!job && !loading && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={handleSubmit}
            noValidate
          >
            <Input
              key={inputKey}
              type="file"
              label={t("fileLabel")}
              accept=".csv,text/csv,application/csv,application/vnd.ms-excel"
              error={fieldError}
              disabled={uploading}
              containerClassName="flex-1"
              onChange={handleFileChange}
            />
            <Button
              type="submit"
              size="sm"
              fullWidth={false}
              loading={uploading}
              loadingText={t("uploading")}
            >
              {t("start")}
            </Button>
          </form>
        </section>
      )}

      {error && <FormMessage variant="error">{error}</FormMessage>}

      {loading && <LoadingState message={t("statusLoading")} />}

      {job && (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-950">{job.fileName}</h2>
              <p className="mt-1 text-sm font-medium text-blue-600">
                {statusLabels[job.status]}
              </p>
            </div>
            <span className="text-2xl font-semibold text-slate-900">
              {format.number(job.progressPercentage / 100, {
                style: "percent",
                maximumFractionDigits: 0,
              })}
            </span>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${job.progressPercentage}%` }}
            />
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs text-slate-500">{t("totalRows")}</dt>
              <dd className="mt-1 text-xl font-semibold text-slate-900">
                {format.number(job.totalRows)}
              </dd>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <dt className="text-xs text-emerald-700">{t("successful")}</dt>
              <dd className="mt-1 text-xl font-semibold text-emerald-800">
                {format.number(job.successfulRows)}
              </dd>
            </div>
            <div className="rounded-xl bg-red-50 p-4">
              <dt className="text-xs text-red-700">{t("failed")}</dt>
              <dd className="mt-1 text-xl font-semibold text-red-800">
                {format.number(job.failedRows)}
              </dd>
            </div>
          </dl>

          {job.errorMessage && (
            <div className="mt-5">
              <FormMessage variant="error">{job.errorMessage}</FormMessage>
            </div>
          )}

          {job.status === "completed" && (
            <Link
              href={`/projects/${projectId}/tasks`}
              className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              {t("viewTasks")}
            </Link>
          )}
        </section>
      )}

      {failedRows && failedRows.data.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-semibold text-slate-950">{t("failedRows")}</h2>
          {failedRows.data.map((row) => (
            <article
              key={row.id}
              className="rounded-xl border border-red-200 bg-white p-5"
            >
              <p className="text-sm font-semibold text-red-700">
                {t("rowError", {
                  row: row.rowNumber,
                  message: row.errorMessage,
                })}
              </p>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
                {JSON.stringify(row.rawData, null, 2)}
              </pre>
            </article>
          ))}
          <Pagination
            page={failedRows.page}
            totalPages={failedRows.totalPages}
            total={failedRows.total}
            onPageChange={changeFailedPage}
          />
        </section>
      )}
    </div>
  );
}
