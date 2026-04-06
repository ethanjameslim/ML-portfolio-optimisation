import { RefreshCw, Play, BarChart3, Database } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ControlPanelProps {
  onRerun: () => void;
  onRefresh: () => void;
  onLoadWeights: () => void;
  onLoadBacktest: () => void;
  busyAction: string | null;
}

export function ControlPanel({
  onRerun,
  onRefresh,
  onLoadWeights,
  onLoadBacktest,
  busyAction,
}: ControlPanelProps) {
  return (
    <div className="panel p-6">
      <div className="flex flex-col gap-5">
        <div>
          <p className="panel-title">Controls</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            icon={<Play className="h-4 w-4" />}
            onClick={onRerun}
            variant="primary"
          >
            New run
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

      </div>
    </div>
  );
}
