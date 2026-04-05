import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface MetricCardProps {
  label: string;
  value: string;
  icon: ReactNode;
  detail: string;
  tone?: 'neutral' | 'positive' | 'negative';
}

export function MetricCard({
  label,
  value,
  icon,
  detail,
  tone = 'neutral',
}: MetricCardProps) {
  return (
    <div className="panel relative overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal/70 via-mint/60 to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="metric-value mt-4">{value}</p>
        </div>
        <div className="rounded-2xl bg-stone-100 p-3 text-teal">{icon}</div>
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
        {tone === 'positive' ? <ArrowUpRight className="h-4 w-4 text-success" /> : null}
        {tone === 'negative' ? <ArrowDownRight className="h-4 w-4 text-danger" /> : null}
        {tone === 'neutral' ? <Minus className="h-4 w-4 text-slate-400" /> : null}
        <span
          className={cn(
            tone === 'positive' && 'text-success',
            tone === 'negative' && 'text-danger',
            tone === 'neutral' && 'text-slate-500',
          )}
        >
          {detail}
        </span>
      </div>
    </div>
  );
}
