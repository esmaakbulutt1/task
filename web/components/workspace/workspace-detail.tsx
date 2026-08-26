"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import ConfirmPanel from "@/components/ui/confirm-panel";
import Dialog from "@/components/ui/dialog";
import ErrorState from "@/components/ui/error-state";
import FormMessage from "@/components/ui/form-message";
import LoadingState from "@/components/ui/loading-state";
import WorkspaceForm from "@/components/workspace/workspace-form";
import WorkspaceMembers from "@/components/workspace/workspace-members";
import { useWorkspace } from "@/hooks/use-workspace";
import { Link } from "@/i18n/navigation";
import type { CreateWorkspaceRequest } from "@/types/workspace.types";

type WorkspaceDetailProps = {
  workspaceId: string;
};

export default function WorkspaceDetail({ workspaceId }: WorkspaceDetailProps) {
  const t = useTranslations("Workspaces");
  const commonT = useTranslations("Common");
  const roleLabels = {
    owner: commonT("workspaceRole.owner"),
    admin: commonT("workspaceRole.admin"),
    member: commonT("workspaceRole.member"),
  };
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const {
    workspace,
    members,
    loading,
    actionLoading,
    loadError,
    actionError,
    success,
    updateWorkspaceItem,
    deleteWorkspaceItem,
    addMember,
    changeMemberRole,
    removeMember,
    reloadWorkspace,
    resetFeedback,
  } = useWorkspace(workspaceId);

  async function handleUpdate(
    request: CreateWorkspaceRequest,
  ): Promise<boolean> {
    const updated = await updateWorkspaceItem(request);

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
        onRetry={() => void reloadWorkspace()}
      />
    );
  }

  if (!workspace) {
    return null;
  }

  const isOwner = workspace.role === "owner";

  return (
    <div className="space-y-6">
      <Link
        href="/workspaces"
        className="inline-flex text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        {t("detail.back")}
      </Link>

      <header className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                {workspace.name}
              </h1>
              <Badge>{roleLabels[workspace.role]}</Badge>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              {workspace.description || t("noDescription")}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/workspaces/${workspace.id}/projects`}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {t("detail.viewProjects")}
            </Link>
            {isOwner && (
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
      </header>

      {actionError && <FormMessage variant="error">{actionError}</FormMessage>}
      {success && <FormMessage variant="success">{success}</FormMessage>}

      {editing && (
        <Dialog
          open={editing}
          title={t("detail.editTitle")}
          size="md"
          dismissible={!actionLoading}
          onClose={() => {
            resetFeedback();
            setEditing(false);
          }}
        >
          <WorkspaceForm
            key={workspace.updatedAt}
            initialValues={{
              name: workspace.name,
              description: workspace.description ?? "",
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

      {confirmingDelete && (
        <ConfirmPanel
          title={t("detail.deleteTitle")}
          description={t("detail.deleteDescription")}
          confirmLabel={commonT("yesDelete")}
          loading={actionLoading}
          loadingText={commonT("deleting")}
          onConfirm={() => void deleteWorkspaceItem()}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}

      <WorkspaceMembers
        workspaceRole={workspace.role}
        members={members}
        actionLoading={actionLoading}
        actionError={actionError}
        onAdd={addMember}
        onRoleChange={changeMemberRole}
        onRemove={removeMember}
        onInteract={resetFeedback}
      />
    </div>
  );
}
