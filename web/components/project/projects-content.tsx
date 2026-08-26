"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import ProjectCard from "@/components/project/project-card";
import ProjectFilters from "@/components/project/project-filters";
import ProjectForm from "@/components/project/project-form";
import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import EmptyState from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/error-state";
import FormMessage from "@/components/ui/form-message";
import LoadingState from "@/components/ui/loading-state";
import PageHeader from "@/components/ui/page-header";
import Pagination from "@/components/ui/pagination";
import { useProjects } from "@/hooks/use-projects";
import { Link } from "@/i18n/navigation";
import type { CreateProjectRequest } from "@/types/project.types";

type ProjectsContentProps = {
  workspaceId: string;
  notice?: string;
};

export default function ProjectsContent({
  workspaceId,
  notice,
}: ProjectsContentProps) {
  const t = useTranslations("Projects");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const {
    projects,
    workspaceRole,
    query,
    pagination,
    loading,
    actionLoading,
    loadError,
    actionError,
    createProjectItem,
    updateQuery,
    changePage,
    reloadProjects,
    resetError,
  } = useProjects(workspaceId);

  async function handleCreate(
    request: CreateProjectRequest,
  ): Promise<boolean> {
    const created = await createProjectItem(request);

    if (created) {
      setShowCreateForm(false);
    }

    return created;
  }

  if (loading) {
    return <LoadingState message={t("loading")} />;
  }

  if (loadError) {
    return (
      <ErrorState
        title={t("loadError")}
        message={loadError}
        onRetry={() => void reloadProjects()}
      />
    );
  }

  const canManage = workspaceRole === "owner" || workspaceRole === "admin";
  const hasActiveFilters = Boolean(
    query.search || query.status || query.dateFrom || query.dateTo,
  );

  return (
    <div className="space-y-8">
      <Link
        href={`/workspaces/${workspaceId}`}
        className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        {t("backToWorkspace")}
      </Link>

      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
          canManage ? (
            <Button
              type="button"
              fullWidth={false}
              onClick={() => {
                resetError();
                setShowCreateForm(true);
              }}
            >
              {t("new")}
            </Button>
          ) : undefined
        }
      />

      {notice && <FormMessage variant="success">{notice}</FormMessage>}

      {showCreateForm && canManage && (
        <Dialog
          open={showCreateForm}
          title={t("createTitle")}
          size="lg"
          dismissible={!actionLoading}
          onClose={() => {
            resetError();
            setShowCreateForm(false);
          }}
        >
          <ProjectForm
            submitLabel={t("create")}
            loading={actionLoading}
            error={actionError}
            onSubmit={handleCreate}
            onCancel={() => {
              resetError();
              setShowCreateForm(false);
            }}
            onInteract={resetError}
          />
        </Dialog>
      )}

      <ProjectFilters
        query={query}
        disabled={loading}
        onChange={updateQuery}
      />

      {projects.length === 0 ? (
        <EmptyState
          title={hasActiveFilters ? t("filteredEmptyTitle") : t("emptyTitle")}
          description={
            hasActiveFilters
              ? t("filteredEmptyDescription")
              : canManage
                ? t("ownerEmptyDescription")
                : t("emptyDescription")
          }
        />
      ) : (
        <section
          aria-label={t("listAriaLabel")}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </section>
      )}

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        disabled={loading}
        onPageChange={changePage}
      />
    </div>
  );
}
