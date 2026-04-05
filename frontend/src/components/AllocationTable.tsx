import { useMemo, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import type { Allocation } from '@/types/portfolio';
import { formatPercent } from '@/utils/format';

interface AllocationTableProps {
  allocations: Allocation[];
  title: string;
  subtitle: string;
  limit?: number;
}

type SortKey = 'ticker' | 'weight';

export function AllocationTable({
  allocations,
  title,
  subtitle,
  limit,
}: AllocationTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('weight');
  const [direction, setDirection] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const rows = [...allocations].sort((left, right) => {
      const modifier = direction === 'asc' ? 1 : -1;
      if (sortKey === 'ticker') {
        return left.ticker.localeCompare(right.ticker) * modifier;
      }
      return (left.weight - right.weight) * modifier;
    });

    return limit ? rows.slice(0, limit) : rows;
  }, [allocations, direction, limit, sortKey]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setDirection(key === 'ticker' ? 'asc' : 'desc');
  };

  return (
    <div className="panel p-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="panel-title">Allocation Table</p>
          <h3 className="mt-3 text-xl font-semibold text-ink">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-stone-100 px-4 py-3 text-right">
          <p className="font-mono text-2xl font-semibold text-ink">{allocations.length}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Assets</p>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-stone-200">
        <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
          <thead className="bg-stone-100/80">
            <tr>
              <th className="px-4 py-3">
                <button
                  className="inline-flex items-center gap-2 font-semibold text-slate-500"
                  onClick={() => toggleSort('ticker')}
                  type="button"
                >
                  Ticker
                  <ArrowDownUp className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3">
                <button
                  className="inline-flex items-center gap-2 font-semibold text-slate-500"
                  onClick={() => toggleSort('weight')}
                  type="button"
                >
                  Weight
                  <ArrowDownUp className="h-4 w-4" />
                </button>
              </th>
              <th className="px-4 py-3 font-semibold text-slate-500">Allocation share</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200 bg-white/70">
            {sorted.map((allocation, index) => (
              <tr key={allocation.ticker}>
                <td className="px-4 py-3 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-ink">
                  {allocation.ticker}
                </td>
                <td className="px-4 py-3 font-mono text-sm text-ink">
                  {formatPercent(allocation.weight)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 w-full rounded-full bg-stone-200">
                    <div
                        className="h-2.5 rounded-full bg-gradient-to-r from-teal to-mint"
                        style={{ width: `${Math.max(allocation.weight * 100, 4)}%` }}
                      />
                    </div>
                    <span className="w-16 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      #{index + 1}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
