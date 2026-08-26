import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import ProfileContent from "@/components/profile/profile-content";

type ProfilePageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.profile" });

  return { title: t("title"), description: t("description") };
}

export default function ProfilePage() {
  return <ProfileContent />;
}
