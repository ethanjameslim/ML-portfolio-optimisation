import { Activity, BarChart3, CandlestickChart, Database, LayoutDashboard, Play, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

const items = [
  { href: '#overview', label: 'Overview', icon: LayoutDashboard },
  { href: '#weights', label: 'Weights', icon: BarChart3 },
  { href: '#backtest', label: 'Backtest', icon: CandlestickChart },
];

interface SidebarNavProps {
  onRerun?: () => void;
  onRefresh?: () => void;
  onLoadWeights?: () => void;
  onLoadBacktest?: () => void;
  busyAction?: string | null;
}

export function SidebarNav({
  onRerun,
  onRefresh,
  onLoadWeights,
  onLoadBacktest,
  busyAction,
}: SidebarNavProps) {
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

          {(onRerun || onRefresh || onLoadWeights || onLoadBacktest) && (
            <div className="space-y-3 border-t border-white/10 pt-6">
              <p className="px-1 text-xs font-semibold uppercase tracking-[0.22em] text-white/50">
                Controls
              </p>
              <div className="flex flex-col gap-2">
                {onRerun && (
                  <Button
                    className="w-full justify-start"
                    icon={<Play className="h-4 w-4" />}
                    onClick={onRerun}
                    variant="primary"
                  >
                    New run
                  </Button>
                )}
                {onRefresh && (
                  <Button
                    className="w-full justify-start"
                    icon={<RefreshCw className="h-4 w-4" />}
                    loading={busyAction === 'refreshDashboard'}
                    onClick={onRefresh}
                    variant="secondary"
                  >
                    Refresh results
                  </Button>
                )}
                {onLoadWeights && (
                  <Button
                    className="w-full justify-start"
                    icon={<BarChart3 className="h-4 w-4" />}
                    loading={busyAction === 'refreshWeights'}
                    onClick={onLoadWeights}
                    variant="ghost"
                  >
                    Load latest weights
                  </Button>
                )}
                {onLoadBacktest && (
                  <Button
                    className="w-full justify-start"
                    icon={<Database className="h-4 w-4" />}
                    loading={busyAction === 'refreshBacktest'}
                    onClick={onLoadBacktest}
                    variant="ghost"
                  >
                    Load backtest data
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
