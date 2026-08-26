import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("ErrorPages.notFound");

  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-blue-600">{t("code")}</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {t("description")}
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {t("backToDashboard")}
        </Link>
      </div>
    </main>
  );
}
