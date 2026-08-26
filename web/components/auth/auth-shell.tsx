import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

import AuthBrandPanel from "@/components/auth/auth-brand-panel";
import LanguageSwitcher from "@/components/ui/language-switcher";

type AuthShellProps = {
  children: ReactNode;
};

export default function AuthShell({ children }: AuthShellProps) {
  const authT = useTranslations("Auth");
  const commonT = useTranslations("Common");

  return (
    <main className="flex min-h-svh items-center justify-center bg-slate-50 px-4 py-10">
      <section aria-label={authT("shellAriaLabel")} className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <LanguageSwitcher />
        </div>
        <AuthBrandPanel />

        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          {commonT("copyright", {year: new Date().getFullYear()})}
        </p>
      </section>
    </main>
  );
}
