"use client";

import { useTranslations } from "next-intl";

import Button from "@/components/ui/button";

type PaginationProps = {
  page: number;
  totalPages: number;
  total?: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  page,
  totalPages,
  total,
  disabled = false,
  onPageChange,
}: PaginationProps) {
  const t = useTranslations("Common.pagination");

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      aria-label={t("ariaLabel")}
      className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row"
    >
      <p className="text-sm text-slate-500">
        {t("page", {page, totalPages})}
        {total !== undefined && ` · ${t("total", {total})}`}
      </p>
      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          fullWidth={false}
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t("previous")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          fullWidth={false}
          disabled={disabled || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("next")}
        </Button>
      </div>
    </nav>
  );
}
