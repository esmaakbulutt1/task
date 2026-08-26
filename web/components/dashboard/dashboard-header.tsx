"use client";

import {useEffect, useState} from "react";
import {useTranslations} from "next-intl";

import TaskFlowLogo from "@/components/auth/taskflow-logo";
import DashboardSidebar from "@/components/dashboard/dashboard-sidebar";
import LanguageSwitcher from "@/components/ui/language-switcher";
import {Link} from "@/i18n/navigation";

export default function DashboardHeader() {
  const t = useTranslations("Navigation");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:justify-end lg:px-8">
        <div className="flex items-center gap-3 lg:hidden">
          <button
            type="button"
            aria-label={t("openMenu")}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            className="flex size-10 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={() => setMenuOpen(true)}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="size-5"
            >
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/dashboard" aria-label={t("dashboardAriaLabel")}>
            <TaskFlowLogo />
          </Link>
        </div>

        <LanguageSwitcher />
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMenuOpen(false)}
          />
          <DashboardSidebar
            variant="mobile"
            onClose={() => setMenuOpen(false)}
            onNavigate={() => setMenuOpen(false)}
          />
        </div>
      )}
    </header>
  );
}
