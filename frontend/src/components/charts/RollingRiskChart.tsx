import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BacktestSeriesPoint } from '@/types/portfolio';
import { formatAxisDate, formatDateLabel, formatNumber, formatPercent } from '@/utils/format';

interface RollingRiskChartProps {
  data: BacktestSeriesPoint[];
  metric: 'volatility' | 'sharpe';
}

export function RollingRiskChart({ data, metric }: RollingRiskChartProps) {
  const dataKey = metric === 'volatility' ? 'rollingVolatility' : 'rollingSharpe';
  const title = metric === 'volatility' ? 'Rolling Volatility' : 'Rolling Sharpe';

  return (
    <div className="panel p-6">
      <div className="mb-6">
        <p className="panel-title">Rolling Risk</p>
        <h3 className="mt-3 text-xl font-semibold text-ink">{title} over time</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Front-end derived analytics from the saved daily return series. No backend optimisation logic is altered.
        </p>
      </div>

      <div className="h-[300px]">
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
              tickFormatter={(value) =>
                metric === 'volatility'
                  ? formatPercent(Number(value), 0)
                  : formatNumber(Number(value), 2)
              }
              tickLine={false}
              width={72}
            />
            <Tooltip
              contentStyle={{
                borderRadius: '20px',
                border: '1px solid rgba(226, 232, 240, 0.9)',
                background: 'rgba(255, 255, 255, 0.96)',
              }}
              formatter={(value: number | string) =>
                metric === 'volatility'
                  ? formatPercent(Number(value))
                  : formatNumber(Number(value), 2)
              }
              labelFormatter={formatDateLabel}
            />
            <Line
              dataKey={dataKey}
              dot={false}
              name={title}
              stroke={metric === 'volatility' ? '#0f766e' : '#d97706'}
              strokeLinecap="round"
              strokeWidth={2.5}
              type="monotone"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
