"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import WorkspaceCard from "@/components/workspace/workspace-card";
import WorkspaceForm from "@/components/workspace/workspace-form";
import Button from "@/components/ui/button";
import Dialog from "@/components/ui/dialog";
import EmptyState from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/error-state";
import FormMessage from "@/components/ui/form-message";
import LoadingState from "@/components/ui/loading-state";
import PageHeader from "@/components/ui/page-header";
import { useWorkspaces } from "@/hooks/use-workspaces";
import type { CreateWorkspaceRequest } from "@/types/workspace.types";

type WorkspacesContentProps = {
  notice?: string;
};

export default function WorkspacesContent({ notice }: WorkspacesContentProps) {
  const t = useTranslations("Workspaces");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const {
    workspaces,
    loading,
    actionLoading,
    loadError,
    actionError,
    createWorkspaceItem,
    reloadWorkspaces,
    resetError,
  } = useWorkspaces();

  async function handleCreate(
    request: CreateWorkspaceRequest,
  ): Promise<boolean> {
    const created = await createWorkspaceItem(request);

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
        onRetry={() => void reloadWorkspaces()}
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("description")}
        action={
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
        }
      />

      {notice && <FormMessage variant="success">{notice}</FormMessage>}

      {showCreateForm && (
        <Dialog
          open={showCreateForm}
          title={t("createTitle")}
          size="md"
          dismissible={!actionLoading}
          onClose={() => {
            resetError();
            setShowCreateForm(false);
          }}
        >
          <WorkspaceForm
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

      {workspaces.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <section
          aria-label={t("listAriaLabel")}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {workspaces.map((workspace) => (
            <WorkspaceCard key={workspace.id} workspace={workspace} />
          ))}
        </section>
      )}
    </div>
  );
}
