import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BacktestSeriesPoint } from '@/types/portfolio';
import { formatAxisDate, formatDateLabel, formatPercent } from '@/utils/format';

interface DrawdownChartProps {
  data: BacktestSeriesPoint[];
}

export function DrawdownChart({ data }: DrawdownChartProps) {
  return (
    <div className="panel p-6">
      <div className="mb-6">
        <p className="panel-title">Drawdown Profile</p>
        <h3 className="mt-3 text-xl font-semibold text-ink">Peak-to-trough drawdown</h3>
      </div>

      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="drawdownGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#0f766e" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#0f766e" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148, 163, 184, 0.16)" strokeDasharray="4 4" />
            <XAxis
              axisLine={false}
              dataKey="date"
              minTickGap={32}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={formatAxisDate}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => formatPercent(Number(value), 0)}
              tickLine={false}
              width={72}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '20px',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                background: 'rgba(255, 255, 255, 0.96)',
              }}
              formatter={(value: number | string) => formatPercent(Number(value))}
              labelFormatter={formatDateLabel}
            />
            <Area
              dataKey="strategyDrawdown"
              fill="url(#drawdownGradient)"
              name="Strategy DD"
              stroke="#0f766e"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="spyDrawdown"
              dot={false}
              name="SPY DD"
              stroke="#334155"
              strokeDasharray="6 6"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
