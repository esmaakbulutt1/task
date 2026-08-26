"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import ProjectForm from "@/components/project/project-form";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import ConfirmPanel from "@/components/ui/confirm-panel";
import Dialog from "@/components/ui/dialog";
import ErrorState from "@/components/ui/error-state";
import FormMessage from "@/components/ui/form-message";
import LoadingState from "@/components/ui/loading-state";
import { useProject } from "@/hooks/use-project";
import { Link } from "@/i18n/navigation";
import {
  projectStatusTones,
  toDateInputValue,
} from "@/lib/project";
import type { CreateProjectRequest } from "@/types/project.types";

type ProjectDetailProps = {
  projectId: string;
};

export default function ProjectDetail({ projectId }: ProjectDetailProps) {
  const t = useTranslations("Projects");
  const commonT = useTranslations("Common");
  const format = useFormatter();
  const statusLabels = {
    planned: commonT("projectStatus.planned"),
    active: commonT("projectStatus.active"),
    completed: commonT("projectStatus.completed"),
    archived: commonT("projectStatus.archived"),
  };
  const formatDate = (value: string | null) =>
    value ? format.dateTime(new Date(value), {dateStyle: "medium"}) : commonT("notSpecified");
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const {
    project,
    workspaceRole,
    loading,
    actionLoading,
    loadError,
    actionError,
    success,
    updateProjectItem,
    deleteProjectItem,
    reloadProject,
    resetFeedback,
  } = useProject(projectId);

  async function handleUpdate(
    request: CreateProjectRequest,
  ): Promise<boolean> {
    const updated = await updateProjectItem(request);

    if (updated) {
      setEditing(false);
    }

    return updated;
  }

  if (loading) {
    return <LoadingState message={t("detail.loading")} />;
  }

  if (loadError) {
    return (
      <ErrorState
        title={t("detail.loadError")}
        message={loadError}
        onRetry={() => void reloadProject()}
      />
    );
  }

  if (!project) {
    return null;
  }

  const canManage = workspaceRole === "owner" || workspaceRole === "admin";

  return (
    <div className="space-y-6">
      <Link
        href={`/workspaces/${project.workspaceId}/projects`}
        className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        {t("detail.back")}
      </Link>

      <header className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                {project.name}
              </h1>
              <Badge tone={projectStatusTones[project.status]}>
                {statusLabels[project.status]}
              </Badge>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              {project.description || t("noDescription")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/projects/${project.id}/tasks`}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {t("detail.viewTasks")}
            </Link>
            <Link
              href={`/projects/${project.id}/kanban`}
              className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {t("detail.kanban")}
            </Link>
            {canManage && (
              <Link
                href={`/projects/${project.id}/import`}
                className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                {t("detail.importCsv")}
              </Link>
            )}
            {canManage && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  fullWidth={false}
                  onClick={() => {
                    resetFeedback();
                    setConfirmingDelete(false);
                    setEditing(true);
                  }}
                >
                  {commonT("edit")}
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  fullWidth={false}
                  onClick={() => {
                    resetFeedback();
                    setEditing(false);
                    setConfirmingDelete(true);
                  }}
                >
                  {commonT("delete")}
                </Button>
              </>
            )}
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("detail.start")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {formatDate(project.startDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {t("detail.end")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {formatDate(project.dueDate)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {commonT("createdAt")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {formatDate(project.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {commonT("updatedAt")}
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {formatDate(project.updatedAt)}
            </dd>
          </div>
        </dl>
      </header>

      {actionError && <FormMessage variant="error">{actionError}</FormMessage>}
      {success && <FormMessage variant="success">{success}</FormMessage>}

      {editing && canManage && (
        <Dialog
          open={editing}
          title={t("detail.editTitle")}
          size="lg"
          dismissible={!actionLoading}
          onClose={() => {
            resetFeedback();
            setEditing(false);
          }}
        >
          <ProjectForm
            key={project.updatedAt}
            initialValues={{
              name: project.name,
              description: project.description ?? "",
              status: project.status,
              startDate: toDateInputValue(project.startDate),
              dueDate: toDateInputValue(project.dueDate),
            }}
            submitLabel={commonT("saveChanges")}
            loading={actionLoading}
            error={actionError}
            onSubmit={handleUpdate}
            onCancel={() => {
              resetFeedback();
              setEditing(false);
            }}
            onInteract={resetFeedback}
          />
        </Dialog>
      )}

      {confirmingDelete && canManage && (
        <ConfirmPanel
          title={t("detail.deleteTitle")}
          description={t("detail.deleteDescription")}
          confirmLabel={commonT("yesDelete")}
          loading={actionLoading}
          loadingText={commonT("deleting")}
          onConfirm={() => void deleteProjectItem()}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}
