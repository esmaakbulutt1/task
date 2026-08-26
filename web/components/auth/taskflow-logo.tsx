type TaskFlowLogoProps = {
  inverted?: boolean;
};

export default function TaskFlowLogo({
  inverted = false,
}: TaskFlowLogoProps) {
  return (
    <div className="flex items-center gap-3" aria-label="TaskFlow">
      <span className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
        TF
      </span>
      <span
        className={`text-xl font-semibold tracking-tight ${
          inverted ? "text-white" : "text-slate-950"
        }`}
      >
        TaskFlow
      </span>
    </div>
  );
}
