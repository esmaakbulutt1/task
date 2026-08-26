import { useFormatter, useTranslations } from "next-intl";

import type { DashboardTrendItem } from "@/types/dashboard.types";

type TaskTrendProps = {
  items: DashboardTrendItem[];
};

export default function TaskTrend({ items }: TaskTrendProps) {
  const t = useTranslations("Dashboard");
  const format = useFormatter();
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const maximum = Math.max(...items.map((item) => item.count), 1);

  function formatDate(value: string): string {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime())
      ? value
      : format.dateTime(date, {
          weekday: "short",
          day: "2-digit",
          month: "short",
          timeZone: "UTC",
        });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-950">{t("completedTasks")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("lastSevenDays")}</p>
        </div>
        <span className="text-sm font-medium text-slate-700">{t("total", {total})}</span>
      </div>

      <ul className="mt-6 space-y-4">
        {items.map((item) => {
          const width = item.count > 0 ? Math.max((item.count / maximum) * 100, 2) : 0;

          return (
            <li
              key={item.date}
              className="grid grid-cols-[6.5rem_minmax(0,1fr)_2rem] items-center gap-3"
            >
              <time dateTime={item.date} className="text-sm text-slate-500">
                {formatDate(item.date)}
              </time>
              <div
                className="h-2 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-label={t("completedOnDate", {date: formatDate(item.date)})}
                aria-valuemin={0}
                aria-valuemax={maximum}
                aria-valuenow={item.count}
              >
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="text-right text-sm font-medium text-slate-900">
                {item.count}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
