
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import RegisterForm from "@/components/auth/register-form";

type RegisterPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: RegisterPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.register" });

  return { title: t("title"), description: t("description") };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
