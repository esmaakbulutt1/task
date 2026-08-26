"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { FormEvent } from "react";

import Button from "@/components/ui/button";
import FormMessage from "@/components/ui/form-message";
import Input from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

type PasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmation: string;
};

type PasswordErrors = Partial<Record<keyof PasswordValues, string>>;

export default function PasswordForm() {
  const t = useTranslations("Profile.password");
  const [values, setValues] = useState<PasswordValues>({
    currentPassword: "",
    newPassword: "",
    confirmation: "",
  });
  const [fieldErrors, setFieldErrors] = useState<PasswordErrors>({});
  const { loading, error, changePasswordUser, resetFeedback } = useAuth();

  function updateValue(field: keyof PasswordValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    resetFeedback();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: PasswordErrors = {};

    if (!values.currentPassword) {
      errors.currentPassword = t("currentRequired");
    }
    if (values.newPassword.length < 8 || values.newPassword.length > 72) {
      errors.newPassword = t("newLength");
    }
    if (values.confirmation !== values.newPassword) {
      errors.confirmation = t("mismatch");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    await changePasswordUser({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      {error && <FormMessage variant="error">{error}</FormMessage>}
      <Input
        type="password"
        label={t("currentLabel")}
        value={values.currentPassword}
        autoComplete="current-password"
        required
        disabled={loading}
        error={fieldErrors.currentPassword}
        onChange={(event) =>
          updateValue("currentPassword", event.target.value)
        }
      />
      <Input
        type="password"
        label={t("newLabel")}
        value={values.newPassword}
        autoComplete="new-password"
        minLength={8}
        maxLength={72}
        required
        disabled={loading}
        error={fieldErrors.newPassword}
        onChange={(event) => updateValue("newPassword", event.target.value)}
      />
      <Input
        type="password"
        label={t("confirmationLabel")}
        value={values.confirmation}
        autoComplete="new-password"
        required
        disabled={loading}
        error={fieldErrors.confirmation}
        onChange={(event) => updateValue("confirmation", event.target.value)}
      />
      <FormMessage>
        {t("sessionHint")}
      </FormMessage>
      <Button
        type="submit"
        variant="secondary"
        fullWidth={false}
        loading={loading}
        loadingText={t("submitting")}
      >
        {t("submit")}
      </Button>
    </form>
  );
}
