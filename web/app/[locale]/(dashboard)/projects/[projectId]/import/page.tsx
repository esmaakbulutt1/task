import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import ImportContent from "@/components/import/import-content";

type ImportPageProps = {
  params: Promise<{ locale: string; projectId: string }>;
  searchParams: Promise<{ jobId?: string | string[] }>;
};

export async function generateMetadata({
  params,
}: ImportPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata.import" });

  return { title: t("title"), description: t("description") };
}

export default async function ImportPage({
  params,
  searchParams,
}: ImportPageProps) {
  const [{ projectId }, query] = await Promise.all([params, searchParams]);
  const initialJobId =
    typeof query.jobId === "string" ? query.jobId : undefined;

  return (
    <ImportContent
      key={initialJobId ?? "new"}
      projectId={projectId}
      initialJobId={initialJobId}
    />
  );
}
