"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import type { ChangeEvent, FormEvent } from "react";
import { useState } from "react";

import AuthFormHeader from "@/components/auth/auth-form-header";
import Button from "@/components/ui/button";
import FormMessage from "@/components/ui/form-message";
import Input from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { isValidEmail } from "@/lib/validation";
import type { LoginRequest } from "@/types/auth.types";

type LoginErrors = Partial<Record<keyof LoginRequest, string>>;

type LoginFormProps = {
  notice?: string;
};

const initialValues: LoginRequest = {
  email: "",
  password: "",
};

export default function LoginForm({ notice }: LoginFormProps) {
  const t = useTranslations("Auth.login");
  const validationT = useTranslations("Common.validation");
  const [values, setValues] = useState<LoginRequest>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({});
  const { loginUser, loading, error, resetFeedback } = useAuth();

  function validate(currentValues: LoginRequest): LoginErrors {
    const errors: LoginErrors = {};

    if (!currentValues.email.trim()) {
      errors.email = validationT("emailRequired");
    } else if (!isValidEmail(currentValues.email)) {
      errors.email = validationT("emailInvalid");
    }

    if (!currentValues.password) {
      errors.password = t("passwordRequired");
    } else if (currentValues.password.length < 8) {
      errors.password = t("passwordMin");
    }

    return errors;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const field = event.target.name as keyof LoginRequest;

    setValues((current) => ({
      ...current,
      [field]: event.target.value,
    }));

    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    resetFeedback();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate(values);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    await loginUser(values);
  }

  return (
    <div>
      <AuthFormHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        {notice && <FormMessage variant="success">{notice}</FormMessage>}
        {error && <FormMessage variant="error">{error}</FormMessage>}

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

        <div>
          <div className="mb-2 flex justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {t("forgotPassword")}
            </Link>
          </div>

          <Input
            label={t("passwordLabel")}
            name="password"
            type="password"
            value={values.password}
            onChange={handleChange}
            error={fieldErrors.password}
            placeholder={t("passwordPlaceholder")}
            autoComplete="current-password"
            minLength={8}
            maxLength={72}
            required
          />
        </div>

        <Button type="submit" loading={loading} loadingText={t("submitting")}>
          {t("submit")}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-slate-500">
        {t("noAccount")}{" "}
        <Link
          href="/register"
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          {t("createAccount")}
        </Link>
      </p>
    </div>
  );
}
