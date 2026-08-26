"use client";

import {useTranslations} from "next-intl";

import TaskFlowLogo from "@/components/auth/taskflow-logo";
import Button from "@/components/ui/button";
import {useAuth} from "@/hooks/use-auth";
import {useNotificationCount} from "@/hooks/use-notification-count";
import {Link, usePathname} from "@/i18n/navigation";

type DashboardSidebarProps = {
  variant?: "desktop" | "mobile";
  onClose?: () => void;
  onNavigate?: () => void;
};

export default function DashboardSidebar({
  variant = "desktop",
  onClose,
  onNavigate,
}: DashboardSidebarProps) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const {logoutUser, loading} = useAuth();
  const unreadCount = useNotificationCount();
  const mobile = variant === "mobile";

  const dashboardActive = pathname === "/dashboard";

  const workspacesActive =
    pathname.startsWith("/workspaces") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/tasks");

  const notificationsActive = pathname.startsWith("/notifications");
  const profileActive = pathname.startsWith("/profile");

  function linkClass(active: boolean): string {
    return `rounded-lg px-3 py-2.5 text-sm font-medium transition ${
      active
        ? "bg-blue-50 text-blue-700"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
    }`;
  }

  return (
    <aside
      id={mobile ? "mobile-navigation" : undefined}
      role={mobile ? "dialog" : undefined}
      aria-modal={mobile || undefined}
      aria-label={mobile ? t("mainMenu") : undefined}
      className={
        mobile
          ? "relative z-10 flex h-svh w-72 flex-col overflow-y-auto border-r border-slate-200 bg-white p-5 shadow-xl"
          : "hidden min-h-svh w-64 shrink-0 border-r border-slate-200 bg-white p-5 lg:flex lg:flex-col"
      }
    >
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/dashboard"
          aria-label={t("dashboardAriaLabel")}
          onClick={onNavigate}
        >
          <TaskFlowLogo />
        </Link>

        {mobile && (
          <button
            type="button"
            autoFocus
            aria-label={t("closeMenu")}
            className="flex size-10 items-center justify-center rounded-lg text-2xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            onClick={onClose}
          >
            <span aria-hidden="true">&times;</span>
          </button>
        )}
      </div>

      <nav
        aria-label={t("mainMenu")}
        className="mt-8 flex flex-1 flex-col gap-1"
      >
        <Link
          href="/dashboard"
          className={linkClass(dashboardActive)}
          aria-current={dashboardActive ? "page" : undefined}
          onClick={onNavigate}
        >
          {t("dashboard")}
        </Link>

        <Link
          href="/workspaces"
          className={linkClass(workspacesActive)}
          aria-current={workspacesActive ? "page" : undefined}
          onClick={onNavigate}
        >
          {t("workspaces")}
        </Link>

        <Link
          href="/notifications"
          className={linkClass(notificationsActive)}
          aria-current={notificationsActive ? "page" : undefined}
          onClick={onNavigate}
        >
          {t("notifications")}
          {unreadCount > 0 ? ` (${unreadCount})` : ""}
        </Link>

        <Link
          href="/profile"
          className={linkClass(profileActive)}
          aria-current={profileActive ? "page" : undefined}
          onClick={onNavigate}
        >
          {t("profile")}
        </Link>
      </nav>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={loading}
        loadingText={t("loggingOut")}
        onClick={() => {
          onNavigate?.();
          void logoutUser();
        }}
      >
        {t("logout")}
      </Button>
    </aside>
  );
}
