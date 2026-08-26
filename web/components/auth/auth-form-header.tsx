type AuthFormHeaderProps = {
  title: string;
  description: string;
  eyebrow?: string;
};

export default function AuthFormHeader({
  title,
  description,
  eyebrow,
}: AuthFormHeaderProps) {
  return (
    <header className="mb-8">
      {eyebrow && (
        <p className="mb-3 text-sm font-semibold text-blue-600">{eyebrow}</p>
      )}
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
        {title}
      </h1>
      <p className="mt-3 leading-6 text-slate-500">{description}</p>
    </header>
  );
}
