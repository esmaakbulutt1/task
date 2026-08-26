"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { useRouter } from "@/i18n/navigation";
import { requireAccessToken } from "@/lib/client-session";
import { getErrorMessage } from "@/lib/errors";
import {
  addWorkspaceMember,
  deleteWorkspace,
  deleteWorkspaceMember,
  getWorkspace,
  getWorkspaceMembers,
  updateWorkspace,
  updateWorkspaceMember,
} from "@/services/workspace.service";
import type {
  AddWorkspaceMemberRequest,
  UpdateWorkspaceMemberRequest,
  UpdateWorkspaceRequest,
  Workspace,
  WorkspaceMember,
} from "@/types/workspace.types";

function requestWorkspaceData(
  workspaceId: string,
): Promise<[Workspace, WorkspaceMember[]]> {
  const accessToken = requireAccessToken();

  return Promise.all([
    getWorkspace(workspaceId, accessToken),
    getWorkspaceMembers(workspaceId, accessToken),
  ]);
}

export function useWorkspace(workspaceId: string) {
  const t = useTranslations("Feedback.workspace");
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const reloadWorkspace = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);

    try {
      const [workspaceResponse, membersResponse] =
        await requestWorkspaceData(workspaceId);
      setWorkspace(workspaceResponse);
      setMembers(membersResponse);
    } catch (error: unknown) {
      setWorkspace(null);
      setMembers([]);
      setLoadError(
        getErrorMessage(error, t("loadFailed")),
      );
    } finally {
      setLoading(false);
    }
  }, [t, workspaceId]);

  useEffect(() => {
    let cancelled = false;

    void Promise.resolve()
      .then(() => requestWorkspaceData(workspaceId))
      .then(([workspaceResponse, membersResponse]) => {
        if (!cancelled) {
          setWorkspace(workspaceResponse);
          setMembers(membersResponse);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setWorkspace(null);
          setMembers([]);
          setLoadError(
            getErrorMessage(error, t("loadFailed")),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [t, workspaceId]);

  async function updateWorkspaceItem(
    request: UpdateWorkspaceRequest,
  ): Promise<boolean> {
    setActionLoading(true);
    setActionError(null);
    setSuccess(null);

    try {
      const updated = await updateWorkspace(
        workspaceId,
        request,
        requireAccessToken(),
      );

      setWorkspace((current) =>
        current ? { ...updated, role: current.role } : current,
      );
      setSuccess(t("updateSuccess"));
      return true;
    } catch (error: unknown) {
      setActionError(
        getErrorMessage(error, t("updateFailed")),
      );
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteWorkspaceItem(): Promise<boolean> {
    setActionLoading(true);
    setActionError(null);
    setSuccess(null);

    try {
      await deleteWorkspace(workspaceId, requireAccessToken());
      router.replace("/workspaces?deleted=1");
      return true;
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, t("deleteFailed")));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function addMember(
    request: AddWorkspaceMemberRequest,
  ): Promise<boolean> {
    setActionLoading(true);
    setActionError(null);
    setSuccess(null);

    try {
      const member = await addWorkspaceMember(
        workspaceId,
        {
          email: request.email.trim().toLowerCase(),
          role: request.role,
        },
        requireAccessToken(),
      );
      setMembers((current) => [member, ...current]);
      setSuccess(t("memberAddSuccess"));
      return true;
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, t("memberAddFailed")));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function changeMemberRole(
    memberId: string,
    request: UpdateWorkspaceMemberRequest,
  ): Promise<boolean> {
    setActionLoading(true);
    setActionError(null);
    setSuccess(null);

    try {
      const member = await updateWorkspaceMember(
        workspaceId,
        memberId,
        request,
        requireAccessToken(),
      );
      setMembers((current) =>
        current.map((item) => (item.id === member.id ? member : item)),
      );
      setSuccess(t("memberRoleSuccess"));
      return true;
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, t("memberRoleFailed")));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function removeMember(memberId: string): Promise<boolean> {
    setActionLoading(true);
    setActionError(null);
    setSuccess(null);

    try {
      await deleteWorkspaceMember(
        workspaceId,
        memberId,
        requireAccessToken(),
      );
      setMembers((current) =>
        current.filter((member) => member.id !== memberId),
      );
      setSuccess(t("memberRemoveSuccess"));
      return true;
    } catch (error: unknown) {
      setActionError(getErrorMessage(error, t("memberRemoveFailed")));
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  function resetFeedback(): void {
    setActionError(null);
    setSuccess(null);
  }

  return {
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
  };
}
