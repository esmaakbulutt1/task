"use client";

import { useTranslations } from "next-intl";

import Button from "@/components/ui/button";

type GlobalErrorProps = {
  reset: () => void;
};

export default function ErrorPage({ reset }: GlobalErrorProps) {
  const t = useTranslations("ErrorPages.unexpected");

  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-8 text-center">
        <h1 className="text-2xl font-semibold text-slate-950">
          {t("title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          {t("description")}
        </p>
        <div className="mt-6 flex justify-center">
          <Button type="button" fullWidth={false} onClick={reset}>
            {t("retry")}
          </Button>
        </div>
      </div>
    </main>
  );
}
