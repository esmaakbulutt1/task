import { useTranslations } from "next-intl";

type LoadingStateProps = {
  message?: string;
  className?: string;
};

export default function LoadingState({
  message,
  className = "",
}: LoadingStateProps) {
  const t = useTranslations("Common");

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex min-h-80 items-center justify-center text-sm text-slate-500 ${className}`}
    >
      {message ?? t("loading")}
    </div>
  );
}
