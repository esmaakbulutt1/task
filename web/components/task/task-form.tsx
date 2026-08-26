"use client";

import { useTranslations } from "next-intl";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import FormActions from "@/components/ui/form-actions";
import FormMessage from "@/components/ui/form-message";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import { dateTimeInputToIso, toDateTimeInputValue } from "@/lib/task";
import type {
  TaskFormPayload,
  TaskPriority,
  TaskStatus,
} from "@/types/task.types";
import type { WorkspaceMember } from "@/types/workspace.types";

type TaskFormValues = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  assignedTo: string;
};

type TaskFormErrors = Partial<Record<keyof TaskFormValues, string>>;

type TaskFormProps = {
  initialValues?: TaskFormPayload;
  members: WorkspaceMember[];
  canAssign?: boolean;
  submitLabel: string;
  loading: boolean;
  error?: string | null;
  onSubmit: (request: TaskFormPayload) => Promise<boolean>;
  onCancel?: () => void;
  onInteract?: () => void;
};

const emptyPayload: TaskFormPayload = {
  title: "",
  description: "",
  status: "backlog",
  priority: "medium",
  dueDate: null,
  assignedTo: null,
};

function formValuesFromPayload(payload: TaskFormPayload): TaskFormValues {
  return {
    title: payload.title,
    description: payload.description,
    status: payload.status,
    priority: payload.priority,
    dueDate: toDateTimeInputValue(payload.dueDate),
    assignedTo: payload.assignedTo ?? "",
  };
}

export default function TaskForm({
  initialValues = emptyPayload,
  members,
  canAssign = true,
  submitLabel,
  loading,
  error,
  onSubmit,
  onCancel,
  onInteract,
}: TaskFormProps) {
  const t = useTranslations("Tasks.form");
  const commonT = useTranslations("Common");
  const validationT = useTranslations("Common.validation");
  const roleLabels = {
    owner: commonT("workspaceRole.owner"),
    admin: commonT("workspaceRole.admin"),
    member: commonT("workspaceRole.member"),
  };
  const [values, setValues] = useState<TaskFormValues>(() =>
    formValuesFromPayload(initialValues),
  );
  const [fieldErrors, setFieldErrors] = useState<TaskFormErrors>({});

  function validate(currentValues: TaskFormValues): TaskFormErrors {
    const errors: TaskFormErrors = {};
    const title = currentValues.title.trim();

    if (!title) errors.title = t("titleRequired");
    else if (title.length > 200) errors.title = t("titleMax");

    if (currentValues.description.trim().length > 1000) {
      errors.description = validationT("descriptionMax", {max: 1000});
    }

    if (currentValues.dueDate && !dateTimeInputToIso(currentValues.dueDate)) {
      errors.dueDate = t("dueDateInvalid");
    }

    return errors;
  }

  function handleChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ): void {
    const field = event.target.name as keyof TaskFormValues;

    setValues((current) => ({ ...current, [field]: event.target.value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    onInteract?.();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    const errors = validate(values);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    await onSubmit({
      title: values.title.trim(),
      description: values.description.trim(),
      status: values.status,
      priority: values.priority,
      dueDate: dateTimeInputToIso(values.dueDate),
      assignedTo: values.assignedTo || null,
    });
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      {error && <FormMessage variant="error">{error}</FormMessage>}

      <Input
        label={t("titleLabel")}
        name="title"
        type="text"
        value={values.title}
        onChange={handleChange}
        error={fieldErrors.title}
        placeholder={t("titlePlaceholder")}
        maxLength={200}
        required
        autoFocus
      />

      <Textarea
        label={t("descriptionLabel")}
        name="description"
        value={values.description}
        onChange={handleChange}
        error={fieldErrors.description}
        placeholder={t("descriptionPlaceholder")}
        maxLength={1000}
        hint={commonT("characterCount", {count: values.description.length, max: 1000})}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label={commonT("status")}
          name="status"
          value={values.status}
          onChange={handleChange}
        >
          <option value="backlog">{commonT("taskStatus.backlog")}</option>
          <option value="todo">{commonT("taskStatus.todo")}</option>
          <option value="in_progress">{commonT("taskStatus.inProgress")}</option>
          <option value="review">{commonT("taskStatus.review")}</option>
          <option value="completed">{commonT("taskStatus.completed")}</option>
        </Select>

        <Select
          label={commonT("priority")}
          name="priority"
          value={values.priority}
          onChange={handleChange}
        >
          <option value="low">{commonT("priorityLabels.low")}</option>
          <option value="medium">{commonT("priorityLabels.medium")}</option>
          <option value="high">{commonT("priorityLabels.high")}</option>
          <option value="urgent">{commonT("priorityLabels.urgent")}</option>
        </Select>
      </div>

      <Input
        label={t("dueDateLabel")}
        name="dueDate"
        type="datetime-local"
        value={values.dueDate}
        onChange={handleChange}
        error={fieldErrors.dueDate}
      />

      {canAssign && (
        <Select
          label={t("assigneeLabel")}
          name="assignedTo"
          value={values.assignedTo}
          onChange={handleChange}
          hint={t("assigneeHint")}
        >
          <option value="">{commonT("unassigned")}</option>
          {members.map((member) => (
            <option key={member.id} value={member.userId}>
              {member.email} · {roleLabels[member.role]}
            </option>
          ))}
        </Select>
      )}

      <FormActions
        submitLabel={submitLabel}
        loading={loading}
        loadingText={commonT("saving")}
        onCancel={onCancel}
      />
    </form>
  );
}
