import { useMemo, useState } from 'react';
import { Calendar, Database, Gauge, LayoutGrid, TrendingUp } from 'lucide-react';
import { SidebarNav } from '@/components/SidebarNav';
import { BacktestSummary } from '@/components/BacktestSummary';
import { ControlPanel } from '@/components/ControlPanel';
import { EditableTickerTable } from '@/components/EditableTickerTable';
import { AllocationTable } from '@/components/AllocationTable';
import { MetricsTable } from '@/components/MetricsTable';
import { MetricCard } from '@/components/MetricCard';
import { EquityCurveChart } from '@/components/charts/EquityCurveChart';
import { DrawdownChart } from '@/components/charts/DrawdownChart';
import { RollingRiskChart } from '@/components/charts/RollingRiskChart';
import { WeightsBarChart } from '@/components/charts/WeightsBarChart';
import { WeightsDonutChart } from '@/components/charts/WeightsDonutChart';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSkeleton } from '@/components/ui/LoadingSkeleton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { usePortfolioDashboard } from '@/hooks/usePortfolioDashboard';
import type { RangeKey } from '@/types/portfolio';
import { filterSeriesByRange } from '@/utils/analytics';
import { formatDateLabel, formatPercent } from '@/utils/format';

const rangeOptions: RangeKey[] = ['YTD', '1Y', '3Y', 'MAX'];

export function PortfolioDashboardPage() {
  const {
    data,
    isLoading,
    error,
    actionMessage,
    busyAction,
    loadDashboard,
    saveTickers,
    resetTickers,
    runOptimisation,
    refreshDashboard,
    refreshWeights,
    refreshBacktest,
  } = usePortfolioDashboard();
  const [range, setRange] = useState<RangeKey>('3Y');
  const [riskMetric, setRiskMetric] = useState<'volatility' | 'sharpe'>('volatility');

  const filteredSeries = useMemo(
    () => filterSeriesByRange(data?.backtestSeries ?? [], range),
    [data?.backtestSeries, range],
  );

  const recentRebalances = useMemo(
    () => [...(data?.weightHistory ?? [])].slice(-8).reverse(),
    [data?.weightHistory],
  );

  if (isLoading && !data) {
    return (
      <div className="min-h-screen">
        <div className="mx-auto flex max-w-[1800px] gap-6 px-4 py-6 lg:px-6">
          <div className="hidden w-[280px] lg:block">
            <LoadingSkeleton className="h-[720px] rounded-[32px]" />
          </div>
          <div className="flex-1 space-y-6">
            <LoadingSkeleton className="h-44 rounded-[32px]" />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <LoadingSkeleton key={index} className="h-40 rounded-[32px]" />
              ))}
            </div>
            <LoadingSkeleton className="h-[360px] rounded-[32px]" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl items-center justify-center px-6">
        <div className="w-full space-y-4">
          <EmptyState
            description="The dashboard could not load the current portfolio outputs. Use the retry button below after checking the generated data files or adapter configuration."
            title="Unable to load dashboard data"
          />
          {error ? (
            <div className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
          ) : null}
          <div className="flex justify-center">
            <Button onClick={() => void loadDashboard()} variant="secondary">
              Retry load
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const dominantAllocation = data.latestWeights.allocations[0];

  return (
    <div className="min-h-screen">
      <div className="mx-auto flex max-w-[1800px] gap-6 px-4 py-6 lg:px-6">
        <SidebarNav adapter={data.adapter} />

        <main className="flex-1 space-y-6 pb-12">
          <section className="panel overflow-hidden bg-ink text-white">
            <div className="grid-lines absolute inset-0 opacity-15" />
            <div className="relative flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
              <div className="max-w-4xl space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                  <Gauge className="h-3.5 w-3.5" />
                  Portfolio Analytics Dashboard
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                    Modern front-end layer for your optimiser pipeline
                  </h1>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-white/70 md:text-base">
                    This interface sits on top of the current portfolio optimisation outputs, giving you a clean quant-style dashboard for weights, backtest analytics, ticker management, and run controls without touching the optimisation engine itself.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 lg:min-w-[420px]">
                <MetricCard
                  detail="Processed output range"
                  icon={<Calendar className="h-5 w-5" />}
                  label="Backtest Window"
                  value={`${data.summary.startDate.slice(0, 4)} - ${data.summary.endDate.slice(0, 4)}`}
                />
                <MetricCard
                  detail="Latest saved rebalance"
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="Last Weights Date"
                  value={formatDateLabel(data.latestWeights.date)}
                />
                <MetricCard
                  detail="Largest current allocation"
                  icon={<Database className="h-5 w-5" />}
                  label="Top Holding"
                  value={`${dominantAllocation?.ticker ?? 'N/A'} ${formatPercent(dominantAllocation?.weight ?? 0)}`}
                />
              </div>
            </div>
          </section>

          {actionMessage ? <StatusBanner message={actionMessage} /> : null}
          {error ? (
            <div className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>
          ) : null}

          <section className="space-y-6" id="overview">
            <SectionHeader
              description="High-signal snapshot of the current strategy run, centered on portfolio outcomes, benchmark comparison, and the latest allocation state."
              eyebrow="Overview"
              title="Dashboard and key metrics"
            />
            <BacktestSummary summary={data.summary} />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,0.9fr)]">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {rangeOptions.map((option) => (
                    <Button
                      key={option}
                      className="min-w-[72px]"
                      onClick={() => setRange(option)}
                      variant={range === option ? 'secondary' : 'ghost'}
                    >
                      {option}
                    </Button>
                  ))}
                </div>
                {filteredSeries.length > 0 ? (
                  <EquityCurveChart data={filteredSeries} />
                ) : (
                  <EmptyState
                    description="No backtest points are available for the selected range."
                    title="No equity data"
                  />
                )}
              </div>

              <AllocationTable
                allocations={data.latestWeights.allocations}
                limit={6}
                subtitle={`Latest snapshot from ${formatDateLabel(data.latestWeights.date)}.`}
                title="Recent weights preview"
              />
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]" id="controls">
            <ControlPanel
              adapter={data.adapter}
              busyAction={busyAction}
              onLoadBacktest={() => void refreshBacktest()}
              onLoadWeights={() => void refreshWeights()}
              onRefresh={() => void refreshDashboard()}
              onRun={() => void runOptimisation()}
            />
            <div className="panel p-6">
              <div>
                <p className="panel-title">At A Glance</p>
                <h3 className="mt-3 text-xl font-semibold text-ink">Current dashboard status</h3>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-stone-100 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Adapter mode</p>
                  <p className="mt-3 text-lg font-semibold text-ink">{data.adapter.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{data.adapter.detail}</p>
                </div>
                <div className="rounded-3xl bg-stone-100 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Latest update</p>
                  <p className="mt-3 text-lg font-semibold text-ink">{formatDateLabel(data.summary.lastUpdated)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Use the control buttons to refresh weights or backtest outputs from the latest processed files.
                  </p>
                </div>
                <div className="rounded-3xl bg-stone-100 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Ticker draft mode</p>
                  <p className="mt-3 text-lg font-semibold text-ink">
                    {data.tickerConfig.persistedLocally ? 'Local draft saved' : 'Backend defaults in view'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{data.tickerConfig.note}</p>
                </div>
                <div className="rounded-3xl bg-stone-100 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Coverage</p>
                  <p className="mt-3 text-lg font-semibold text-ink">{data.performanceRows.length} benchmark tracks</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Strategy, static min-var, equal weight, and buy-and-hold SPY are all surfaced in the summary table.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6" id="tickers">
            <SectionHeader
              description="Edit the ticker universe from the UI with validation, clean table interactions, and adapter-safe save behavior."
              eyebrow="Ticker Management"
              title="Ticker controls"
            />
            <EditableTickerTable
              isResetting={busyAction === 'resetTickers'}
              isSaving={busyAction === 'saveTickers'}
              onReset={() => void resetTickers()}
              onSave={(tickers) => void saveTickers(tickers)}
              tickerConfig={data.tickerConfig}
            />
          </section>

          <section className="space-y-6" id="weights">
            <SectionHeader
              description="Multiple views of the latest portfolio weights to make concentration, diversification, and sizing decisions immediately legible."
              eyebrow="Weights"
              title="Portfolio weights visualisation"
            />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
              <WeightsBarChart allocations={data.latestWeights.allocations} />
              <WeightsDonutChart allocations={data.latestWeights.allocations} />
            </div>
            <AllocationTable
              allocations={data.latestWeights.allocations}
              subtitle={`Sorted and responsive allocation table for the latest rebalance on ${formatDateLabel(data.latestWeights.date)}.`}
              title="Current weight allocations"
            />
          </section>

          <section className="space-y-6" id="backtest">
            <SectionHeader
              description="Backtest analytics from the current processed outputs, including drawdowns, rolling risk views, benchmark metrics, and recent rebalances."
              eyebrow="Backtest"
              title="Backtest results and diagnostics"
            />

            <div className="grid gap-6 xl:grid-cols-2">
              <DrawdownChart data={filteredSeries} />
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => setRiskMetric('volatility')}
                    variant={riskMetric === 'volatility' ? 'secondary' : 'ghost'}
                  >
                    Rolling volatility
                  </Button>
                  <Button
                    onClick={() => setRiskMetric('sharpe')}
                    variant={riskMetric === 'sharpe' ? 'secondary' : 'ghost'}
                  >
                    Rolling Sharpe
                  </Button>
                </div>
                <RollingRiskChart data={filteredSeries} metric={riskMetric} />
              </div>
            </div>

            <MetricsTable rows={data.performanceRows} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="panel p-6">
                <div>
                  <p className="panel-title">Portfolio Value</p>
                  <h3 className="mt-3 text-xl font-semibold text-ink">Portfolio value over time</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    The strategy equity curve already tracks portfolio value, so the headline card below acts as a fast read for the current endpoint.
                  </p>
                </div>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <MetricCard
                    detail="Latest equity multiple"
                    icon={<LayoutGrid className="h-5 w-5" />}
                    label="Portfolio Value"
                    tone="positive"
                    value={data.backtestSeries[data.backtestSeries.length - 1]?.strategyEquity?.toFixed(3) ?? 'N/A'}
                  />
                  <MetricCard
                    detail="Current benchmark reference"
                    icon={<TrendingUp className="h-5 w-5" />}
                    label="SPY Equity"
                    tone="neutral"
                    value={data.backtestSeries[data.backtestSeries.length - 1]?.spyEquity?.toFixed(3) ?? 'N/A'}
                  />
                </div>
              </div>

              <div className="panel p-6">
                <div>
                  <p className="panel-title">Rebalance History</p>
                  <h3 className="mt-3 text-xl font-semibold text-ink">Recent rebalances</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Recent weight snapshots with dominant allocation and turnover from the previous rebalance.
                  </p>
                </div>

                <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200">
                  <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                    <thead className="bg-stone-100/80">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-500">Date</th>
                        <th className="px-4 py-3 font-semibold text-slate-500">Top Allocation</th>
                        <th className="px-4 py-3 font-semibold text-slate-500">Top Weight</th>
                        <th className="px-4 py-3 font-semibold text-slate-500">Turnover</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 bg-white/70">
                      {recentRebalances.map((row) => (
                        <tr key={row.date}>
                          <td className="px-4 py-3 font-mono text-xs uppercase tracking-[0.16em] text-slate-500">
                            {formatDateLabel(row.date)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-ink">{row.topTicker}</td>
                          <td className="px-4 py-3 font-mono text-sm text-ink">
                            {formatPercent(row.topWeight)}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-ink">
                            {formatPercent(row.turnoverToPrev)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
