import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-ink text-white hover:bg-slate-900 shadow-lg shadow-ink/10 disabled:bg-ink/60',
  secondary:
    'bg-teal text-white hover:bg-teal/90 shadow-lg shadow-teal/20 disabled:bg-teal/60',
  ghost:
    'bg-white/70 text-ink hover:bg-white disabled:bg-white/40 border border-stone-300',
  danger:
    'bg-danger text-white hover:bg-danger/90 disabled:bg-danger/60',
};

export function Button({
  children,
  className,
  variant = 'primary',
  loading,
  icon,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200',
        'disabled:cursor-not-allowed disabled:opacity-70',
        variantClasses[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : icon}
      <span>{children}</span>
    </button>
  );
}
