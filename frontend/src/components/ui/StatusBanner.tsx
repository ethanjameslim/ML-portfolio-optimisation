import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { ActionMessage } from '@/types/portfolio';
import { formatDateLabel } from '@/utils/format';
import { cn } from '@/utils/cn';

const styles: Record<ActionMessage['status'], { icon: typeof Info; classes: string }> = {
  success: {
    icon: CheckCircle2,
    classes: 'border-success/20 bg-success/10 text-success',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'border-warning/20 bg-warning/10 text-warning',
  },
  error: {
    icon: AlertTriangle,
    classes: 'border-danger/20 bg-danger/10 text-danger',
  },
};

interface StatusBannerProps {
  message: ActionMessage;
}

export function StatusBanner({ message }: StatusBannerProps) {
  const Icon = styles[message.status].icon;

  return (
    <div className={cn('rounded-2xl border px-4 py-3', styles[message.status].classes)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">{message.title}</p>
            <p className="mt-1 text-sm leading-6 text-current/90">{message.message}</p>
          </div>
        </div>
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-current/70">
          {formatDateLabel(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
