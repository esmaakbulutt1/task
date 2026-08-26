"use client";

import { useTranslations } from "next-intl";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import FormActions from "@/components/ui/form-actions";
import FormMessage from "@/components/ui/form-message";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import type { CreateWorkspaceRequest } from "@/types/workspace.types";

type WorkspaceFormValues = {
  name: string;
  description: string;
};

type WorkspaceFormErrors = Partial<Record<keyof WorkspaceFormValues, string>>;

type WorkspaceFormProps = {
  initialValues?: WorkspaceFormValues;
  submitLabel: string;
  loading: boolean;
  error?: string | null;
  onSubmit: (request: CreateWorkspaceRequest) => Promise<boolean>;
  onCancel?: () => void;
  onInteract?: () => void;
};

const emptyValues: WorkspaceFormValues = {
  name: "",
  description: "",
};

export default function WorkspaceForm({
  initialValues = emptyValues,
  submitLabel,
  loading,
  error,
  onSubmit,
  onCancel,
  onInteract,
}: WorkspaceFormProps) {
  const t = useTranslations("Workspaces.form");
  const commonT = useTranslations("Common");
  const validationT = useTranslations("Common.validation");
  const [values, setValues] = useState<WorkspaceFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<WorkspaceFormErrors>({});

  function validate(currentValues: WorkspaceFormValues): WorkspaceFormErrors {
    const errors: WorkspaceFormErrors = {};
    const name = currentValues.name.trim();

    if (!name) errors.name = t("nameRequired");
    else if (name.length > 100) errors.name = t("nameMax");

    if (currentValues.description.trim().length > 1000) {
      errors.description = validationT("descriptionMax", {max: 1000});
    }

    return errors;
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ): void {
    const field = event.target.name as keyof WorkspaceFormValues;

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
      name: values.name.trim(),
      description: values.description.trim(),
    });
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      {error && <FormMessage variant="error">{error}</FormMessage>}

      <Input
        label={t("nameLabel")}
        name="name"
        type="text"
        value={values.name}
        onChange={handleChange}
        error={fieldErrors.name}
        placeholder={t("namePlaceholder")}
        maxLength={100}
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

      <FormActions
        submitLabel={submitLabel}
        loading={loading}
        loadingText={commonT("saving")}
        onCancel={onCancel}
      />
    </form>
  );
}
