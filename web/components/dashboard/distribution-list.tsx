"use client";

import { useFormatter, useTranslations } from "next-intl";

import type { DashboardDistributionItem } from "@/types/dashboard.types";

type DistributionListProps = {
  title: string;
  items: DashboardDistributionItem[];
  labels: Record<string, string>;
};

export default function DistributionList({
  title,
  items,
  labels,
}: DistributionListProps) {
  const format = useFormatter();
  const t = useTranslations("Common.pagination");
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-semibold text-slate-950">{title}</h2>
        <span className="text-sm text-slate-400">
          {t("total", { total })}
        </span>
      </div>

      <ul className="mt-5 space-y-4">
        {items.map((item) => {
          const label = labels[item.name] ?? item.name;
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          const width = item.count > 0 ? Math.max(percentage, 2) : 0;

          return (
            <li key={item.name}>
              <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                <span className="text-slate-600">{label}</span>
                <span className="font-medium text-slate-900">
                  {format.number(item.count)}
                </span>
              </div>

              <div
                className="h-2 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-label={label}
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={item.count}
              >
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
