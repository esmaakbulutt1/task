import { apiRequest } from "@/services/api.service";
import type {
  AddWorkspaceMemberRequest,
  AddWorkspaceMemberResponse,
  CreateWorkspaceRequest,
  CreateWorkspaceResponse,
  DeleteWorkspaceMemberResponse,
  DeleteWorkspaceResponse,
  UpdateWorkspaceMemberRequest,
  UpdateWorkspaceMemberResponse,
  UpdateWorkspaceRequest,
  UpdateWorkspaceResponse,
  WorkspaceDetailResponse,
  WorkspaceListResponse,
  WorkspaceMembersResponse,
} from "@/types/workspace.types";

function workspacePath(workspaceId: string): string {
  return `/workspaces/${encodeURIComponent(workspaceId)}`;
}

export function getWorkspaces(
  accessToken: string,
): Promise<WorkspaceListResponse> {
  return apiRequest<WorkspaceListResponse>("/workspaces", {
    method: "GET",
    token: accessToken,
  });
}

export function getWorkspace(
  workspaceId: string,
  accessToken: string,
): Promise<WorkspaceDetailResponse> {
  return apiRequest<WorkspaceDetailResponse>(workspacePath(workspaceId), {
    method: "GET",
    token: accessToken,
  });
}

export function createWorkspace(
  request: CreateWorkspaceRequest,
  accessToken: string,
): Promise<CreateWorkspaceResponse> {
  return apiRequest<CreateWorkspaceResponse>("/workspaces", {
    method: "POST",
    body: request,
    token: accessToken,
  });
}

export function updateWorkspace(
  workspaceId: string,
  request: UpdateWorkspaceRequest,
  accessToken: string,
): Promise<UpdateWorkspaceResponse> {
  return apiRequest<UpdateWorkspaceResponse>(workspacePath(workspaceId), {
    method: "PATCH",
    body: request,
    token: accessToken,
  });
}

export function deleteWorkspace(
  workspaceId: string,
  accessToken: string,
): Promise<DeleteWorkspaceResponse> {
  return apiRequest<DeleteWorkspaceResponse>(workspacePath(workspaceId), {
    method: "DELETE",
    token: accessToken,
  });
}

export function getWorkspaceMembers(
  workspaceId: string,
  accessToken: string,
): Promise<WorkspaceMembersResponse> {
  return apiRequest<WorkspaceMembersResponse>(
    `${workspacePath(workspaceId)}/members`,
    {
      method: "GET",
      token: accessToken,
    },
  );
}

export function addWorkspaceMember(
  workspaceId: string,
  request: AddWorkspaceMemberRequest,
  accessToken: string,
): Promise<AddWorkspaceMemberResponse> {
  return apiRequest<AddWorkspaceMemberResponse>(
    `${workspacePath(workspaceId)}/members`,
    {
      method: "POST",
      body: request,
      token: accessToken,
    },
  );
}

export function updateWorkspaceMember(
  workspaceId: string,
  memberId: string,
  request: UpdateWorkspaceMemberRequest,
  accessToken: string,
): Promise<UpdateWorkspaceMemberResponse> {
  return apiRequest<UpdateWorkspaceMemberResponse>(
    `${workspacePath(workspaceId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "PATCH",
      body: request,
      token: accessToken,
    },
  );
}

export function deleteWorkspaceMember(
  workspaceId: string,
  memberId: string,
  accessToken: string,
): Promise<DeleteWorkspaceMemberResponse> {
  return apiRequest<DeleteWorkspaceMemberResponse>(
    `${workspacePath(workspaceId)}/members/${encodeURIComponent(memberId)}`,
    {
      method: "DELETE",
      token: accessToken,
    },
  );
}
