import { Database } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="panel-muted flex min-h-[220px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
      <div className="rounded-2xl bg-white p-4 text-teal shadow-card">
        <Database className="h-8 w-8" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-ink">{title}</h3>
        <p className="max-w-md text-sm leading-6 text-slate-600">{description}</p>
      </div>
    </div>
  );
}
