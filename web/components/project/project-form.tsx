"use client";

import { useTranslations } from "next-intl";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import FormActions from "@/components/ui/form-actions";
import FormMessage from "@/components/ui/form-message";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import type {
  CreateProjectRequest,
  ProjectStatus,
} from "@/types/project.types";

type ProjectFormValues = {
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string;
  dueDate: string;
};

type ProjectFormErrors = Partial<Record<keyof ProjectFormValues, string>>;

type ProjectFormProps = {
  initialValues?: ProjectFormValues;
  submitLabel: string;
  loading: boolean;
  error?: string | null;
  onSubmit: (request: CreateProjectRequest) => Promise<boolean>;
  onCancel?: () => void;
  onInteract?: () => void;
};

const emptyValues: ProjectFormValues = {
  name: "",
  description: "",
  status: "planned",
  startDate: "",
  dueDate: "",
};

export default function ProjectForm({
  initialValues = emptyValues,
  submitLabel,
  loading,
  error,
  onSubmit,
  onCancel,
  onInteract,
}: ProjectFormProps) {
  const t = useTranslations("Projects.form");
  const commonT = useTranslations("Common");
  const validationT = useTranslations("Common.validation");
  const [values, setValues] = useState<ProjectFormValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<ProjectFormErrors>({});

  function validate(currentValues: ProjectFormValues): ProjectFormErrors {
    const errors: ProjectFormErrors = {};
    const name = currentValues.name.trim();

    if (!name) errors.name = t("nameRequired");
    else if (name.length > 200) errors.name = t("nameMax");

    if (currentValues.description.trim().length > 1000) {
      errors.description = validationT("descriptionMax", {max: 1000});
    }

    if (
      currentValues.startDate &&
      currentValues.dueDate &&
      currentValues.dueDate < currentValues.startDate
    ) {
      errors.dueDate = validationT("endBeforeStart");
    }

    return errors;
  }

  function handleChange(
    event: ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ): void {
    const field = event.target.name as keyof ProjectFormValues;

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
      status: values.status,
      ...(values.startDate ? { startDate: values.startDate } : {}),
      ...(values.dueDate ? { dueDate: values.dueDate } : {}),
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

      <Select
        label={commonT("status")}
        name="status"
        value={values.status}
        onChange={handleChange}
      >
        <option value="planned">{commonT("projectStatus.planned")}</option>
        <option value="active">{commonT("projectStatus.active")}</option>
        <option value="completed">{commonT("projectStatus.completed")}</option>
        <option value="archived">{commonT("projectStatus.archived")}</option>
      </Select>

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={commonT("startDate")}
          name="startDate"
          type="date"
          value={values.startDate}
          onChange={handleChange}
          error={fieldErrors.startDate}
        />
        <Input
          label={commonT("dueDate")}
          name="dueDate"
          type="date"
          value={values.dueDate}
          onChange={handleChange}
          error={fieldErrors.dueDate}
          min={values.startDate || undefined}
        />
      </div>

      <FormActions
        submitLabel={submitLabel}
        loading={loading}
        loadingText={commonT("saving")}
        onCancel={onCancel}
      />
    </form>
  );
}
