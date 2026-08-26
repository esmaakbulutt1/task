"use client";

import { useTranslations } from "next-intl";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import AuthFormHeader from "@/components/auth/auth-form-header";
import Button from "@/components/ui/button";
import FormMessage from "@/components/ui/form-message";
import Input from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "@/i18n/navigation";

type ResetPasswordFormProps = {
  token: string;
};

type ResetPasswordValues = {
  newPassword: string;
  confirmPassword: string;
};

type ResetPasswordErrors = Partial<
  Record<keyof ResetPasswordValues, string>
>;

const initialValues: ResetPasswordValues = {
  newPassword: "",
  confirmPassword: "",
};

export default function ResetPasswordForm({
  token,
}: ResetPasswordFormProps) {
  const t = useTranslations("Auth.resetPassword");
  const [values, setValues] = useState<ResetPasswordValues>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<ResetPasswordErrors>({});
  const { resetPasswordUser, loading, error, resetFeedback } = useAuth();
  const hasToken = token.trim().length > 0;

  function validate(currentValues: ResetPasswordValues): ResetPasswordErrors {
    const errors: ResetPasswordErrors = {};

    if (!currentValues.newPassword) {
      errors.newPassword = t("passwordRequired");
    } else if (
      currentValues.newPassword.length < 8 ||
      currentValues.newPassword.length > 72
    ) {
      errors.newPassword = t("passwordLength");
    }

    if (!currentValues.confirmPassword) {
      errors.confirmPassword = t("confirmationRequired");
    } else if (currentValues.confirmPassword !== currentValues.newPassword) {
      errors.confirmPassword = t("passwordMismatch");
    }

    return errors;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const field = event.target.name as keyof ResetPasswordValues;

    setValues((current) => ({
      ...current,
      [field]: event.target.value,
    }));

    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    resetFeedback();
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!hasToken) {
      return;
    }

    const errors = validate(values);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    await resetPasswordUser({
      token,
      newPassword: values.newPassword,
    });
  }

  return (
    <div>
      <AuthFormHeader
        title={t("title")}
        description={t("description")}
      />

      {!hasToken ? (
        <FormMessage variant="error">
          {t("invalidToken")}
        </FormMessage>
      ) : (
        <form className="space-y-5" noValidate onSubmit={handleSubmit}>
          {error && <FormMessage variant="error">{error}</FormMessage>}

          <Input
            label={t("newPasswordLabel")}
            name="newPassword"
            type="password"
            value={values.newPassword}
            onChange={handleChange}
            error={fieldErrors.newPassword}
            placeholder={t("newPasswordPlaceholder")}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
            autoFocus
          />

          <Input
            label={t("confirmPasswordLabel")}
            name="confirmPassword"
            type="password"
            value={values.confirmPassword}
            onChange={handleChange}
            error={fieldErrors.confirmPassword}
            placeholder={t("confirmPasswordPlaceholder")}
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            required
          />

          <Button
            type="submit"
            loading={loading}
            loadingText={t("submitting")}
          >
            {t("submit")}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-slate-500">
        <Link
          href={hasToken ? "/login" : "/forgot-password"}
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          {hasToken ? t("backToLogin") : t("requestNewLink")}
        </Link>
      </p>
    </div>
  );
}
