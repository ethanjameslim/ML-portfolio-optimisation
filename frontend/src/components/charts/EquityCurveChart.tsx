import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BacktestSeriesPoint } from '@/types/portfolio';
import { formatAxisDate, formatDateLabel, formatNumber } from '@/utils/format';

interface EquityCurveChartProps {
  data: BacktestSeriesPoint[];
}

export function EquityCurveChart({ data }: EquityCurveChartProps) {
  return (
    <div className="panel p-6">
      <div className="mb-6">
        <p className="panel-title">Portfolio Equity Curve</p>
        <h3 className="mt-3 text-xl font-semibold text-ink">Strategy versus benchmarks</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Interactive line chart for the portfolio equity curve and benchmark comparison, using the existing backtest output as the source of truth.
        </p>
      </div>

      <div className="h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
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
              tickFormatter={(value) => formatNumber(Number(value), 2)}
              tickLine={false}
              width={72}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '20px',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                background: 'rgba(255, 255, 255, 0.96)',
                boxShadow: '0 24px 50px -24px rgba(15, 23, 42, 0.28)',
              }}
              formatter={(value: number | string) => formatNumber(Number(value), 3)}
              labelFormatter={formatDateLabel}
            />
            <Legend />
            <Line
              dataKey="strategyEquity"
              dot={false}
              name="Strategy"
              stroke="#0f766e"
              strokeLinecap="round"
              strokeWidth={3}
              type="monotone"
            />
            <Line
              dataKey="equalWeightEquity"
              dot={false}
              name="Equal Weight"
              stroke="#d97706"
              strokeLinecap="round"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="spyEquity"
              dot={false}
              name="SPY"
              stroke="#334155"
              strokeDasharray="6 6"
              strokeLinecap="round"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="staticMinvarEquity"
              dot={false}
              name="Static MinVar"
              stroke="#7c3aed"
              strokeLinecap="round"
              strokeOpacity={0.45}
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
