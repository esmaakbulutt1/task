import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import DashboardContent from "@/components/dashboard/dashboard-content";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: DashboardPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.dashboard" });

  return { title: t("title"), description: t("description") };
}

export default function DashboardPage() {
  return <DashboardContent />;
}
