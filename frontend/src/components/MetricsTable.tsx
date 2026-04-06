import { useMemo, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import type { PerformanceRow } from '@/types/portfolio';
import { formatNumber, formatPercent } from '@/utils/format';

type SortKey = keyof Pick<
  PerformanceRow,
  'label' | 'cagr' | 'annReturn' | 'annVol' | 'sharpe' | 'maxDrawdown' | 'avgTurnover'
>;

interface MetricsTableProps {
  rows: PerformanceRow[];
}

export function MetricsTable({ rows }: MetricsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('sharpe');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const sortedRows = useMemo(() => {
    const modifier = direction === 'asc' ? 1 : -1;

    return [...rows].sort((left, right) => {
      if (sortKey === 'label') {
        return left.label.localeCompare(right.label) * modifier;
      }

      return ((left[sortKey] as number) - (right[sortKey] as number)) * modifier;
    });
  }, [direction, rows, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setDirection(key === 'label' ? 'asc' : 'desc');
  };

  return (
    <div className="panel p-6">
      <div>
        <p className="panel-title">Performance Metrics</p>
        <h3 className="mt-3 text-xl font-semibold text-ink">Strategy and benchmark scorecard</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Backtest summary straight from the existing `backtest_summary.csv` output, formatted for quick comparison.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200">
        <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
          <thead className="bg-stone-100/80">
            <tr>
              {[
                ['label', 'Strategy'],
                ['cagr', 'CAGR'],
                ['annReturn', 'Ann. Return'],
                ['annVol', 'Volatility'],
                ['sharpe', 'Sharpe'],
                ['maxDrawdown', 'Max DD'],
                ['avgTurnover', 'Avg Turnover'],
              ].map(([key, label]) => (
                <th key={key} className="px-4 py-3">
                  <button
                    className="inline-flex items-center gap-2 font-semibold text-slate-500"
                    onClick={() => toggleSort(key as SortKey)}
                    type="button"
                  >
                    {label}
                    <ArrowDownUp className="h-4 w-4" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 bg-white/70">
            {sortedRows.map((row) => (
              <tr key={row.key}>
                <td className="px-4 py-3 font-semibold text-ink">{row.label}</td>
                <td className="px-4 py-3 font-mono text-sm text-ink">{formatPercent(row.cagr)}</td>
                <td className="px-4 py-3 font-mono text-sm text-ink">{formatPercent(row.annReturn)}</td>
                <td className="px-4 py-3 font-mono text-sm text-ink">{formatPercent(row.annVol)}</td>
                <td className="px-4 py-3 font-mono text-sm text-ink">{formatNumber(row.sharpe, 2)}</td>
                <td className="px-4 py-3 font-mono text-sm text-ink">{formatPercent(row.maxDrawdown)}</td>
                <td className="px-4 py-3 font-mono text-sm text-ink">{formatPercent(row.avgTurnover)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
