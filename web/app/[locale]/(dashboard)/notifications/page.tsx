import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import NotificationsContent from "@/components/notification/notifications-content";

type NotificationsPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: NotificationsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "Metadata.notifications",
  });

  return { title: t("title"), description: t("description") };
}

export default function NotificationsPage() {
  return <NotificationsContent />;
}
