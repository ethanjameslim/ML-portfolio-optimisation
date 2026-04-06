import { Activity, BarChart3, CandlestickChart, LayoutDashboard, ListTree, PlayCircle } from 'lucide-react';
import type { AdapterDescriptor } from '@/types/portfolio';
import { cn } from '@/utils/cn';

const items = [
  { href: '#overview', label: 'Overview', icon: LayoutDashboard },
  { href: '#controls', label: 'Controls', icon: PlayCircle },
  { href: '#tickers', label: 'Tickers', icon: ListTree },
  { href: '#weights', label: 'Weights', icon: BarChart3 },
  { href: '#backtest', label: 'Backtest', icon: CandlestickChart },
];

interface SidebarNavProps {
  adapter: AdapterDescriptor;
}

export function SidebarNav({ adapter }: SidebarNavProps) {
  return (
    <aside className="hidden w-[280px] shrink-0 lg:block">
      <div className="sticky top-6 panel overflow-hidden bg-ink text-white">
        <div className="grid-lines absolute inset-0 opacity-20" />
        <div className="relative space-y-8 p-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/80">
              <Activity className="h-3.5 w-3.5" />
              Quant UI
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Portfolio Optimiser</h1>
              <p className="mt-3 text-sm leading-6 text-white/70">
                Production-style analytics shell for weights, backtests, and ticker controls.
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white',
                  )}
                  href={item.href}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </nav>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">
              Adapter Mode
            </p>
            <p className="mt-3 text-sm font-semibold text-white">{adapter.label}</p>
            <p className="mt-2 text-sm leading-6 text-white/65">{adapter.detail}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
