import { useFormatter } from "next-intl";

type SummaryCardProps = {
  label: string;
  value: number;
  description: string;
};

export default function SummaryCard({
  label,
  value,
  description,
}: SummaryCardProps) {
  const format = useFormatter();

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {format.number(value)}
      </p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{description}</p>
    </article>
  );
}
