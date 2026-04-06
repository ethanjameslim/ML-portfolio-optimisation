import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Allocation } from '@/types/portfolio';
import { formatPercent } from '@/utils/format';

const barPalette = ['#0f766e', '#14b8a6', '#2dd4bf', '#5eead4', '#0f172a', '#475569', '#f59e0b', '#f97316'];

interface WeightsBarChartProps {
  allocations: Allocation[];
}

export function WeightsBarChart({ allocations }: WeightsBarChartProps) {
  return (
    <div className="panel p-6">
      <div className="mb-6">
        <p className="panel-title">Weight Breakdown</p>
      </div>

      <div className="h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={allocations} layout="vertical" margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" strokeDasharray="4 4" horizontal={false} />
            <XAxis
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => formatPercent(Number(value), 0)}
              tickLine={false}
              type="number"
            />
            <YAxis
              axisLine={false}
              dataKey="ticker"
              tick={{ fill: '#0f172a', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}
              tickLine={false}
              type="category"
              width={56}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '20px',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                background: 'rgba(255, 255, 255, 0.96)',
              }}
              formatter={(value: number | string) => formatPercent(Number(value))}
            />
            <Bar barSize={22} dataKey="weight" radius={[0, 14, 14, 0]}>
              {allocations.map((allocation, index) => (
                <Cell key={allocation.ticker} fill={barPalette[index % barPalette.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
