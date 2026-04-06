import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Allocation } from '@/types/portfolio';
import { formatPercent } from '@/utils/format';

const donutPalette = ['#0f766e', '#14b8a6', '#2dd4bf', '#99f6e4', '#0f172a', '#475569', '#f59e0b', '#fb923c'];

interface WeightsDonutChartProps {
  allocations: Allocation[];
}

export function WeightsDonutChart({ allocations }: WeightsDonutChartProps) {
  const dominant = allocations[0];

  return (
    <div className="panel p-6">
      <div className="mb-6">
        <p className="panel-title">Allocation Mix</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                cx="50%"
                cy="50%"
                data={allocations}
                dataKey="weight"
                innerRadius={70}
                outerRadius={106}
                paddingAngle={2}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={2}
              >
                {allocations.map((allocation, index) => (
                  <Cell key={allocation.ticker} fill={donutPalette[index % donutPalette.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  borderRadius: '20px',
                  border: '1px solid rgba(226, 232, 240, 0.9)',
                  background: 'rgba(255, 255, 255, 0.96)',
                }}
                formatter={(value: number | string) => formatPercent(Number(value))}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl bg-stone-100 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Largest allocation</p>
            <p className="mt-3 font-mono text-3xl font-semibold text-ink">{dominant?.ticker ?? 'N/A'}</p>
            <p className="mt-2 text-sm text-slate-600">{formatPercent(dominant?.weight ?? 0)}</p>
          </div>
          <div className="space-y-3">
            {allocations.slice(0, 5).map((allocation, index) => (
              <div key={allocation.ticker} className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: donutPalette[index % donutPalette.length] }}
                  />
                  <span className="font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink">
                    {allocation.ticker}
                  </span>
                </div>
                <span className="font-mono text-sm text-slate-600">{formatPercent(allocation.weight)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
