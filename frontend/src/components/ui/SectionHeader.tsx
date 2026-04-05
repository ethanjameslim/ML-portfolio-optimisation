interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
}

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="space-y-3">
      <p className="panel-title">{eyebrow}</p>
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">{title}</h2>
        <p className="max-w-3xl text-sm leading-7 text-slate-600 md:text-base">{description}</p>
      </div>
    </div>
  );
}
