"use client";

import { useLocale, useTranslations } from "next-intl";
import type { ChangeEvent } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";

type SupportedLocale = "tr" | "en";

export default function LanguageSwitcher() {
  const locale = useLocale() as SupportedLocale;
  const t = useTranslations("Common.languageSwitcher");
  const pathname = usePathname();
  const router = useRouter();

  function handleChange(event: ChangeEvent<HTMLSelectElement>): void {
    const nextLocale = event.target.value as SupportedLocale;

    if (nextLocale === locale) return;

    const suffix = `${window.location.search}${window.location.hash}`;
    router.replace(`${pathname}${suffix}`, { locale: nextLocale });
  }

  return (
    <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
      <span aria-hidden="true">🌐</span>
      <span className="sr-only">{t("label")}</span>
      <select
        value={locale}
        aria-label={t("label")}
        onChange={handleChange}
        className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        <option value="tr">Türkçe</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
