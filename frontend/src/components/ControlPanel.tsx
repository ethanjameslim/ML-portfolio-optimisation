import { RefreshCw, Play, BarChart3, Database } from 'lucide-react';
import type { AdapterDescriptor } from '@/types/portfolio';
import { Button } from '@/components/ui/Button';

interface ControlPanelProps {
  adapter: AdapterDescriptor;
  onRun: () => void;
  onRefresh: () => void;
  onLoadWeights: () => void;
  onLoadBacktest: () => void;
  busyAction: string | null;
}

export function ControlPanel({
  adapter,
  onRun,
  onRefresh,
  onLoadWeights,
  onLoadBacktest,
  busyAction,
}: ControlPanelProps) {
  return (
    <div className="panel p-6">
      <div className="flex flex-col gap-5">
        <div>
          <p className="panel-title">Run / Control Panel</p>
          <h3 className="mt-3 text-xl font-semibold text-ink">Pipeline controls and result sync</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Buttons route through the front-end adapter only. The current adapter is
            {' '}
            <span className="font-semibold text-ink">{adapter.label}</span>
            .
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            icon={<Play className="h-4 w-4" />}
            loading={busyAction === 'runOptimisation'}
            onClick={onRun}
            variant="primary"
          >
            Run optimisation
          </Button>
          <Button
            icon={<RefreshCw className="h-4 w-4" />}
            loading={busyAction === 'refreshDashboard'}
            onClick={onRefresh}
            variant="secondary"
          >
            Refresh results
          </Button>
          <Button
            icon={<BarChart3 className="h-4 w-4" />}
            loading={busyAction === 'refreshWeights'}
            onClick={onLoadWeights}
            variant="ghost"
          >
            Load latest weights
          </Button>
          <Button
            icon={<Database className="h-4 w-4" />}
            loading={busyAction === 'refreshBacktest'}
            onClick={onLoadBacktest}
            variant="ghost"
          >
            Load backtest data
          </Button>
        </div>

        <div className="rounded-2xl bg-stone-100/80 px-4 py-3 text-sm leading-6 text-slate-600">
          {adapter.detail}
        </div>
      </div>
    </div>
  );
}
