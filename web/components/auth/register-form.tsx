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
import type { RegisterRequest } from "@/types/auth.types";

type RegisterErrors = Partial<Record<keyof RegisterRequest, string>>;

const initialValues: RegisterRequest = {
  email: "",
  password: "",
  name: "",
  surname: "",
};

export default function RegisterForm() {
  const t = useTranslations("Auth.register");
  const validationT = useTranslations("Common.validation");
  const [values, setValues] = useState<RegisterRequest>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({});
  const { registerUser, loading, error, resetFeedback } = useAuth();

  function validate(currentValues: RegisterRequest): RegisterErrors {
    const errors: RegisterErrors = {};
    const name = currentValues.name.trim();
    const surname = currentValues.surname.trim();

    if (!name) errors.name = t("nameRequired");
    else if (name.length < 2 || name.length > 50) errors.name = t("nameLength");

    if (!surname) errors.surname = t("surnameRequired");
    else if (surname.length < 2 || surname.length > 50) {
      errors.surname = t("surnameLength");
    }

    if (!currentValues.email.trim()) errors.email = validationT("emailRequired");
    else if (!isValidEmail(currentValues.email)) {
      errors.email = validationT("emailInvalid");
    }

    if (!currentValues.password) errors.password = t("passwordRequired");
    else if (currentValues.password.length < 8 || currentValues.password.length > 72) {
      errors.password = t("passwordLength");
    }

    return errors;
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    const field = event.target.name as keyof RegisterRequest;

    setValues((current) => ({
      ...current,
      [field]: event.target.value,
    }));

    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    resetFeedback();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const errors = validate(values);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    await registerUser(values);
  }

  return (
    <div>
      <AuthFormHeader
        title={t("title")}
        description={t("description")}
      />

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
          autoComplete="given-name"
          maxLength={50}
          required
          autoFocus
        />

        <Input
          label={t("surnameLabel")}
          name="surname"
          type="text"
          value={values.surname}
          onChange={handleChange}
          error={fieldErrors.surname}
          placeholder={t("surnamePlaceholder")}
          autoComplete="family-name"
          maxLength={50}
          required
        />

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
        />

        <Input
          label={t("passwordLabel")}
          name="password"
          type="password"
          value={values.password}
          onChange={handleChange}
          error={fieldErrors.password}
          placeholder={t("passwordPlaceholder")}
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

      <p className="mt-8 text-center text-sm text-slate-500">
        {t("hasAccount")}{" "}
        <Link
          href="/login"
          className="font-semibold text-blue-600 hover:text-blue-700"
        >
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
