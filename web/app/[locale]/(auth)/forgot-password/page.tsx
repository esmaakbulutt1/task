import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import ForgotPasswordForm from "@/components/auth/forgot-password-form";

type ForgotPasswordPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: ForgotPasswordPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "Metadata.forgotPassword",
  });

  return { title: t("title"), description: t("description") };
}

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
