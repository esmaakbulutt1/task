"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import type { FormEvent } from "react";

import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import type {
  UpdateProfileRequest,
  UserProfile,
} from "@/types/auth.types";

type ProfileValues = {
  email: string;
  name: string;
  surname: string;
  profileImage: string;
};

type ProfileErrors = Partial<Record<keyof ProfileValues, string>>;

type ProfileFormProps = {
  profile: UserProfile;
  loading: boolean;
  onSubmit: (request: UpdateProfileRequest) => Promise<boolean>;
  onInteract: () => void;
};

export default function ProfileForm({
  profile,
  loading,
  onSubmit,
  onInteract,
}: ProfileFormProps) {
  const t = useTranslations("Profile.form");
  const common = useTranslations("Common");
  const [values, setValues] = useState<ProfileValues>({
    email: profile.email,
    name: profile.name ?? "",
    surname: profile.surname ?? "",
    profileImage: profile.profileImage ?? "",
  });
  const [errors, setErrors] = useState<ProfileErrors>({});

  function updateValue(field: keyof ProfileValues, value: string): void {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    onInteract();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationErrors: ProfileErrors = {};

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      validationErrors.email = common("validation.emailInvalid");
    }
    if (values.name.trim().length < 2) {
      validationErrors.name = t("nameMin");
    }
    if (values.surname.trim().length < 2) {
      validationErrors.surname = t("surnameMin");
    }
    if (values.profileImage.trim().length > 500) {
      validationErrors.profileImage = t("imageMax");
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    await onSubmit({
      email: values.email.trim().toLowerCase(),
      name: values.name.trim(),
      surname: values.surname.trim(),
      ...(values.profileImage.trim()
        ? { profileImage: values.profileImage.trim() }
        : {}),
    });
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input
          label={t("nameLabel")}
          value={values.name}
          maxLength={50}
          required
          disabled={loading}
          error={errors.name}
          onChange={(event) => updateValue("name", event.target.value)}
        />
        <Input
          label={t("surnameLabel")}
          value={values.surname}
          maxLength={50}
          required
          disabled={loading}
          error={errors.surname}
          onChange={(event) => updateValue("surname", event.target.value)}
        />
      </div>
      <Input
        type="email"
        label={t("emailLabel")}
        value={values.email}
        maxLength={254}
        required
        autoComplete="email"
        disabled={loading}
        error={errors.email}
        onChange={(event) => updateValue("email", event.target.value)}
      />
      <Input
        type="url"
        label={t("imageLabel")}
        value={values.profileImage}
        maxLength={500}
        placeholder={t("imagePlaceholder")}
        disabled={loading}
        error={errors.profileImage}
        hint={t("imageHint")}
        onChange={(event) => updateValue("profileImage", event.target.value)}
      />
      <Button
        type="submit"
        fullWidth={false}
        loading={loading}
        loadingText={common("saving")}
      >
        {t("submit")}
      </Button>
    </form>
  );
}
