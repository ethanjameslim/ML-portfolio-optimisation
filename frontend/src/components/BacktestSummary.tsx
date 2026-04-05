import { Activity, ArrowDownToLine, Layers3, RefreshCw, Sigma, TrendingUp, Wallet } from 'lucide-react';
import type { DashboardSummary } from '@/types/portfolio';
import { formatNumber, formatPercent } from '@/utils/format';
import { MetricCard } from '@/components/MetricCard';

interface BacktestSummaryProps {
  summary: DashboardSummary;
}

export function BacktestSummary({ summary }: BacktestSummaryProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        detail="Compounded portfolio growth"
        icon={<TrendingUp className="h-5 w-5" />}
        label="Total Return"
        tone={summary.totalReturn >= 0 ? 'positive' : 'negative'}
        value={formatPercent(summary.totalReturn)}
      />
      <MetricCard
        detail="Annualised mean return"
        icon={<Activity className="h-5 w-5" />}
        label="Annualised Return"
        tone={summary.annualizedReturn >= 0 ? 'positive' : 'negative'}
        value={formatPercent(summary.annualizedReturn)}
      />
      <MetricCard
        detail="Risk scaled to yearly terms"
        icon={<Sigma className="h-5 w-5" />}
        label="Volatility"
        tone="neutral"
        value={formatPercent(summary.volatility)}
      />
      <MetricCard
        detail="Return per unit of risk"
        icon={<Wallet className="h-5 w-5" />}
        label="Sharpe Ratio"
        tone={summary.sharpeRatio >= 0 ? 'positive' : 'negative'}
        value={formatNumber(summary.sharpeRatio)}
      />
      <MetricCard
        detail="Worst peak-to-trough decline"
        icon={<ArrowDownToLine className="h-5 w-5" />}
        label="Max Drawdown"
        tone="negative"
        value={formatPercent(summary.maxDrawdown)}
      />
      <MetricCard
        detail="Assets represented in current weights"
        icon={<Layers3 className="h-5 w-5" />}
        label="Number of Assets"
        tone="neutral"
        value={String(summary.assetCount)}
      />
      <MetricCard
        detail="Every 5 trading days from current config assumptions"
        icon={<RefreshCw className="h-5 w-5" />}
        label="Rebalance Frequency"
        tone="neutral"
        value={summary.rebalanceFrequency}
      />
      <MetricCard
        detail="Average rebalance turnover"
        icon={<Activity className="h-5 w-5" />}
        label="Avg Turnover"
        tone="neutral"
        value={formatPercent(summary.avgTurnover)}
      />
    </div>
  );
}
