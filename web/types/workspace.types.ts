export type WorkspaceRole = "owner" | "admin" | "member";
export type ManageableWorkspaceRole = Exclude<WorkspaceRole, "owner">;

export type WorkspaceBase = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type Workspace = WorkspaceBase & {
  role: WorkspaceRole;
};

export type CreateWorkspaceRequest = {
  name: string;
  description?: string;
};

export type UpdateWorkspaceRequest = {
  name?: string;
  description?: string;
};

export type WorkspaceMember = {
  id: string;
  workspaceId: string;
  userId: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
};

export type AddWorkspaceMemberRequest = {
  email: string;
  role: ManageableWorkspaceRole;
};

export type UpdateWorkspaceMemberRequest = {
  role: ManageableWorkspaceRole;
};

export type WorkspaceListResponse = Workspace[];
export type WorkspaceDetailResponse = Workspace;
export type CreateWorkspaceResponse = Workspace;
export type UpdateWorkspaceResponse = WorkspaceBase;
export type WorkspaceMembersResponse = WorkspaceMember[];
export type AddWorkspaceMemberResponse = WorkspaceMember;
export type UpdateWorkspaceMemberResponse = WorkspaceMember;

export type DeleteWorkspaceResponse = {
  message: string;
};

export type DeleteWorkspaceMemberResponse = {
  message: string;
};
