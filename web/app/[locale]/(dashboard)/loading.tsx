import { useTranslations } from "next-intl";

import LoadingState from "@/components/ui/loading-state";

export default function DashboardLoading() {
  const t = useTranslations("Common");

  return <LoadingState message={t("pageLoading")} />;
}
