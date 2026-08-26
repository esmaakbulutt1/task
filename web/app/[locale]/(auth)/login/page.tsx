import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import LoginForm from "@/components/auth/login-form";

type LoginPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    registered?: string;
    passwordChanged?: string;
    passwordReset?: string;
  }>;
};

export async function generateMetadata({
  params,
}: LoginPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.login" });

  return { title: t("title"), description: t("description") };
}

export default async function LoginPage({ params, searchParams }: LoginPageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const t = await getTranslations({
    locale,
    namespace: "Auth.login.notices",
  });
  let notice: string | undefined;

  if (query.registered === "1") {
    notice = t("registered");
  } else if (query.passwordChanged === "1") {
    notice = t("passwordChanged");
  } else if (query.passwordReset === "1") {
    notice = t("passwordReset");
  }

  return <LoginForm notice={notice} />;
}
