import { useEffect, useMemo, useState } from 'react';
import { PencilLine, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import type { TickerConfig } from '@/types/portfolio';
import { Button } from '@/components/ui/Button';

interface EditableTickerTableProps {
  tickerConfig: TickerConfig;
  isSaving: boolean;
  isResetting: boolean;
  onSave: (tickers: string[]) => void;
  onReset: () => void;
}

function sanitiseTicker(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z.\-]/g, '').slice(0, 8);
}

function validateTickers(tickers: string[]) {
  if (tickers.length === 0) {
    return 'Add at least one ticker before saving.';
  }

  const hasInvalid = tickers.some((ticker) => !/^[A-Z.\-]{1,8}$/.test(ticker));
  if (hasInvalid) {
    return 'Tickers must use uppercase letters and optional . or - characters.';
  }

  const unique = new Set(tickers);
  if (unique.size !== tickers.length) {
    return 'Duplicate tickers are not allowed.';
  }

  return null;
}

export function EditableTickerTable({
  tickerConfig,
  isSaving,
  isResetting,
  onSave,
  onReset,
}: EditableTickerTableProps) {
  const [draftTickers, setDraftTickers] = useState(tickerConfig.activeTickers);
  const [newTicker, setNewTicker] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraftTickers(tickerConfig.activeTickers);
  }, [tickerConfig.activeTickers]);

  const hasChanges = useMemo(
    () => JSON.stringify(draftTickers) !== JSON.stringify(tickerConfig.activeTickers),
    [draftTickers, tickerConfig.activeTickers],
  );

  const handleExistingTickerChange = (index: number, value: string) => {
    setDraftTickers((current) =>
      current.map((ticker, tickerIndex) => (tickerIndex === index ? sanitiseTicker(value) : ticker)),
    );
  };

  const handleRemove = (index: number) => {
    setDraftTickers((current) => current.filter((_, tickerIndex) => tickerIndex !== index));
  };

  const handleAddTicker = () => {
    const clean = sanitiseTicker(newTicker);
    if (!clean) {
      setValidationMessage('Enter a valid ticker before adding it.');
      return;
    }

    setDraftTickers((current) => [...current, clean]);
    setNewTicker('');
    setValidationMessage(null);
  };

  const handleSave = () => {
    const cleaned = draftTickers.map((ticker) => sanitiseTicker(ticker)).filter(Boolean);
    const issue = validateTickers(cleaned);
    if (issue) {
      setValidationMessage(issue);
      return;
    }

    setValidationMessage(null);
    onSave(cleaned);
  };

  return (
    <div className="panel p-6">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="panel-title">Ticker Management</p>
            <h3 className="mt-3 text-xl font-semibold text-ink">Editable ticker universe</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{tickerConfig.note}</p>
          </div>
          <div className="rounded-2xl bg-stone-100 px-4 py-3 text-right">
            <p className="font-mono text-2xl font-semibold text-ink">{draftTickers.length}</p>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Active Tickers
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-stone-200">
          <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
            <thead className="bg-stone-100/80">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-500">#</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Ticker</th>
                <th className="px-4 py-3 font-semibold text-slate-500">Status</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 bg-white/70">
              {draftTickers.map((ticker, index) => (
                <tr key={`${ticker}-${index}`}>
                  <td className="px-4 py-3 font-mono text-xs uppercase tracking-[0.16em] text-slate-400">
                    {String(index + 1).padStart(2, '0')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <PencilLine className="h-4 w-4 text-slate-400" />
                      <input
                        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 font-mono text-sm font-medium uppercase tracking-[0.16em] text-ink"
                        onChange={(event) => handleExistingTickerChange(index, event.target.value)}
                        value={ticker}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {tickerConfig.defaultTickers.includes(ticker) ? 'Backend default' : 'Draft only'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="inline-flex rounded-xl p-2 text-slate-500 transition hover:bg-stone-100 hover:text-danger"
                      onClick={() => handleRemove(index)}
                      type="button"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-4 py-3">
            <Plus className="h-4 w-4 text-teal" />
            <input
              className="w-full bg-transparent font-mono text-sm uppercase tracking-[0.16em] text-ink placeholder:text-slate-400"
              onChange={(event) => setNewTicker(sanitiseTicker(event.target.value))}
              placeholder="Add ticker"
              value={newTicker}
            />
            <Button onClick={handleAddTicker} type="button" variant="ghost">
              Add ticker
            </Button>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              icon={<RotateCcw className="h-4 w-4" />}
              loading={isResetting}
              onClick={onReset}
              type="button"
              variant="ghost"
            >
              Reset defaults
            </Button>
            <Button
              icon={<Save className="h-4 w-4" />}
              loading={isSaving}
              onClick={handleSave}
              type="button"
              variant="secondary"
            >
              Save tickers
            </Button>
          </div>
        </div>

        {validationMessage ? (
          <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{validationMessage}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Default universe
          </span>
          {tickerConfig.defaultTickers.map((ticker) => (
            <span
              key={ticker}
              className="rounded-full border border-stone-200 bg-white px-3 py-1 font-mono text-xs font-medium uppercase tracking-[0.16em] text-slate-600"
            >
              {ticker}
            </span>
          ))}
          {hasChanges ? (
            <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
              Unsaved changes
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
