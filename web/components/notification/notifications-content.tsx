"use client";

import { useFormatter, useTranslations } from "next-intl";

import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import ErrorState from "@/components/ui/error-state";
import LoadingState from "@/components/ui/loading-state";
import PageHeader from "@/components/ui/page-header";
import Pagination from "@/components/ui/pagination";
import { useNotifications } from "@/hooks/use-notifications";
import type { NotificationType } from "@/types/notification.types";

export default function NotificationsContent() {
  const format = useFormatter();
  const t = useTranslations("Notifications");
  const {
    notifications,
    pagination,
    unreadCount,
    loading,
    actionId,
    error,
    readNotification,
    readAllNotifications,
    changePage,
    loadNotifications,
  } = useNotifications();
  const typeLabels: Record<NotificationType, string> = {
    workspace_member_added: t("type.workspaceMemberAdded"),
    task_assigned: t("type.taskAssigned"),
    task_commented: t("type.commentAdded"),
    task_deadline_approaching: t("type.dueDateApproaching"),
    task_overdue: t("type.taskOverdue"),
    project_completed: t("type.projectCompleted"),
  };

  if (loading && notifications.length === 0) {
    return <LoadingState message={t("loading")} />;
  }

  if (error && notifications.length === 0) {
    return (
      <ErrorState
        title={t("loadError")}
        message={error}
        onRetry={() => void loadNotifications()}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description", { count: unreadCount })}
        action={
          unreadCount > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              fullWidth={false}
              loading={actionId === "all"}
              loadingText={t("marking")}
              onClick={() => void readAllNotifications()}
            >
              {t("markAllRead")}
            </Button>
          ) : undefined
        }
      />

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {notifications.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <article
              key={notification.id}
              className={`rounded-xl border p-5 ${
                notification.isRead
                  ? "border-slate-200 bg-white"
                  : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      {typeLabels[notification.type]}
                    </span>
                    {!notification.isRead && (
                      <span className="size-2 rounded-full bg-blue-600" />
                    )}
                  </div>
                  <h2 className="mt-2 font-semibold text-slate-900">
                    {notification.title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {notification.message}
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {format.dateTime(new Date(notification.createdAt), {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                {!notification.isRead && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    fullWidth={false}
                    loading={actionId === notification.id}
                    loadingText={t("marking")}
                    onClick={() => void readNotification(notification.id)}
                  >
                    {t("markRead")}
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Pagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        disabled={loading}
        onPageChange={changePage}
      />
    </div>
  );
}
