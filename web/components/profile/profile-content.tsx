"use client";

import { useTranslations } from "next-intl";

import PasswordForm from "@/components/profile/password-form";
import ProfileForm from "@/components/profile/profile-form";
import ErrorState from "@/components/ui/error-state";
import FormMessage from "@/components/ui/form-message";
import LoadingState from "@/components/ui/loading-state";
import PageHeader from "@/components/ui/page-header";
import { useProfile } from "@/hooks/use-profile";

export default function ProfileContent() {
  const t = useTranslations("Profile");
  const {
    profile,
    loading,
    saving,
    error,
    success,
    saveProfile,
    loadProfile,
    resetFeedback,
  } = useProfile();

  if (loading) {
    return <LoadingState message={t("loading")} />;
  }

  if (!profile) {
    return (
      <ErrorState
        title={t("loadError")}
        message={error ?? t("notFound")}
        onRetry={() => void loadProfile()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
      />

      {error && <FormMessage variant="error">{error}</FormMessage>}
      {success && <FormMessage variant="success">{success}</FormMessage>}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-5 font-semibold text-slate-950">
          {t("informationTitle")}
        </h2>
        <ProfileForm
          key={profile.updatedAt}
          profile={profile}
          loading={saving}
          onSubmit={saveProfile}
          onInteract={resetFeedback}
        />
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-2 font-semibold text-slate-950">
          {t("securityTitle")}
        </h2>
        <p className="mb-5 text-sm text-slate-500">
          {t("securityDescription")}
        </p>
        <PasswordForm />
      </section>
    </div>
  );
}
