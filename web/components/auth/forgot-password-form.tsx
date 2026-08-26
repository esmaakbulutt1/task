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
import { isValidEmail } from "@/lib/validation";
import type { ForgotPasswordRequest } from "@/types/auth.types";

type ForgotPasswordErrors = Partial<
  Record<keyof ForgotPasswordRequest, string>
>;

const initialValues: ForgotPasswordRequest = {
  email: "",
};

export default function ForgotPasswordForm() {
  const t = useTranslations("Auth.forgotPassword");
  const validationT = useTranslations("Common.validation");
  const [values, setValues] =
    useState<ForgotPasswordRequest>(initialValues);
  const [fieldErrors, setFieldErrors] =
    useState<ForgotPasswordErrors>({});
  const { forgotPasswordUser, loading, error, success, resetFeedback } =
    useAuth();

  function validate(currentValues: ForgotPasswordRequest): ForgotPasswordErrors {
    const errors: ForgotPasswordErrors = {};

    if (!currentValues.email.trim()) {
      errors.email = validationT("emailRequired");
    } else if (!isValidEmail(currentValues.email)) {
      errors.email = validationT("emailInvalid");
    }

    return errors;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const field = event.target.name as keyof ForgotPasswordRequest;

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
    const errors = validate(values);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    await forgotPasswordUser(values);
  }

  return (
    <div>
      <AuthFormHeader
        title={t("title")}
        description={t("description")}
      />

      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        {error && <FormMessage variant="error">{error}</FormMessage>}
        {success && <FormMessage variant="success">{success}</FormMessage>}

        <Input
          label={t("emailLabel")}
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange}
          error={fieldErrors.email}
          placeholder={t("emailPlaceholder")}
          autoComplete="email"
          inputMode="email"
          maxLength={254}
          required
          autoFocus
        />

        <Button
          type="submit"
          loading={loading}
          loadingText={t("submitting")}
        >
          {t("submit")}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        {t("rememberedPassword")}{" "}
        <Link
          href="/login"
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
