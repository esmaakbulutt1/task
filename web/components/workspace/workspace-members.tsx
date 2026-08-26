"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import ConfirmPanel from "@/components/ui/confirm-panel";
import Dialog from "@/components/ui/dialog";
import FormMessage from "@/components/ui/form-message";
import Input from "@/components/ui/input";
import { isValidEmail } from "@/lib/validation";
import type {
  AddWorkspaceMemberRequest,
  ManageableWorkspaceRole,
  UpdateWorkspaceMemberRequest,
  WorkspaceMember,
  WorkspaceRole,
} from "@/types/workspace.types";

type WorkspaceMembersProps = {
  workspaceRole: WorkspaceRole;
  members: WorkspaceMember[];
  actionLoading: boolean;
  actionError?: string | null;
  onAdd: (request: AddWorkspaceMemberRequest) => Promise<boolean>;
  onRoleChange: (
    memberId: string,
    request: UpdateWorkspaceMemberRequest,
  ) => Promise<boolean>;
  onRemove: (memberId: string) => Promise<boolean>;
  onInteract: () => void;
};

export default function WorkspaceMembers({
  workspaceRole,
  members,
  actionLoading,
  actionError,
  onAdd,
  onRoleChange,
  onRemove,
  onInteract,
}: WorkspaceMembersProps) {
  const t = useTranslations("Workspaces.members");
  const commonT = useTranslations("Common");
  const validationT = useTranslations("Common.validation");
  const format = useFormatter();
  const roleLabels = {
    owner: commonT("workspaceRole.owner"),
    admin: commonT("workspaceRole.admin"),
    member: commonT("workspaceRole.member"),
  };
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ManageableWorkspaceRole>("member");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [showAddForm, setShowAddForm] = useState(false);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const canManage = workspaceRole === "owner" || workspaceRole === "admin";

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setEmailError(validationT("emailRequired"));
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setEmailError(validationT("emailInvalid"));
      return;
    }

    const added = await onAdd({ email: normalizedEmail, role });

    if (added) {
      setEmail("");
      setRole("member");
      setShowAddForm(false);
    }
  }

  function closeAddForm(): void {
    setShowAddForm(false);
    setEmail("");
    setRole("member");
    setEmailError(undefined);
    onInteract();
  }

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>): void {
    setEmail(event.target.value);
    setEmailError(undefined);
    onInteract();
  }

  async function handleRemove(memberId: string): Promise<void> {
    const removed = await onRemove(memberId);

    if (removed) {
      setPendingRemovalId(null);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-950">{t("title")}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t("count", { count: members.length })}
          </p>
        </div>
        {canManage && (
          <Button
            type="button"
            size="sm"
            fullWidth={false}
            onClick={() => {
              onInteract();
              setShowAddForm(true);
            }}
          >
            {t("add")}
          </Button>
        )}
      </div>

      {canManage && showAddForm && (
        <Dialog
          open={showAddForm}
          title={t("add")}
          size="sm"
          dismissible={!actionLoading}
          onClose={closeAddForm}
        >
          <form className="space-y-5" noValidate onSubmit={handleSubmit}>
            <Input
              label={t("emailLabel")}
              name="email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              error={emailError}
              placeholder={t("emailPlaceholder")}
              autoComplete="email"
              maxLength={254}
              required
              disabled={actionLoading}
            />

            <div>
              <label
                htmlFor="new-member-role"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                {t("role")}
              </label>
              <select
                id="new-member-role"
                value={role}
                disabled={actionLoading}
                onChange={(event) => {
                  setRole(event.target.value as ManageableWorkspaceRole);
                  onInteract();
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
              >
                <option value="member">{roleLabels.member}</option>
                <option value="admin">{roleLabels.admin}</option>
              </select>
            </div>

            {actionError && (
              <FormMessage variant="error">{actionError}</FormMessage>
            )}

            <div className="flex flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                fullWidth={false}
                disabled={actionLoading}
                onClick={closeAddForm}
              >
                {commonT("cancel")}
              </Button>
              <Button
                type="submit"
                loading={actionLoading}
                loadingText={t("adding")}
                fullWidth={false}
              >
                {t("add")}
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      <ul className="mt-2 divide-y divide-slate-200">
        {members.map((member) => (
          <li key={member.id} className="py-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {member.email}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {t("joinedAt", {
                    date: format.dateTime(new Date(member.joinedAt), {dateStyle: "medium"}),
                  })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {canManage && member.role !== "owner" ? (
                  <select
                    aria-label={t("roleAriaLabel", {email: member.email})}
                    value={member.role}
                    disabled={actionLoading}
                    onChange={(event) => {
                      onInteract();
                      void onRoleChange(member.id, {
                        role: event.target.value as ManageableWorkspaceRole,
                      });
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 disabled:opacity-60"
                  >
                    <option value="member">{roleLabels.member}</option>
                    <option value="admin">{roleLabels.admin}</option>
                  </select>
                ) : (
                  <Badge>{roleLabels[member.role]}</Badge>
                )}

                {canManage && member.role !== "owner" && (
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    fullWidth={false}
                    disabled={actionLoading}
                    onClick={() => {
                      onInteract();
                      setPendingRemovalId(member.id);
                    }}
                  >
                    {t("remove")}
                  </Button>
                )}
              </div>
            </div>

            {pendingRemovalId === member.id && (
              <div className="mt-4">
                <ConfirmPanel
                  title={t("removeTitle")}
                  description={t("removeDescription", {email: member.email})}
                  confirmLabel={t("confirmRemove")}
                  loading={actionLoading}
                  loadingText={t("removing")}
                  onConfirm={() => void handleRemove(member.id)}
                  onCancel={() => setPendingRemovalId(null)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
