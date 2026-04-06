import { useState } from 'react';
import { Gauge, Play, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { RunPipelineRequest } from '@/types/portfolio';

const DEFAULT_TICKERS = ['AAPL', 'MSFT', 'GOOG', 'SPY', 'TLT', 'GLD', 'VNQ', 'IWM'];
const DEFAULT_START_DATE = '2018-01-01';
const MIN_TICKERS = 2;

function sanitiseTicker(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z.\-]/g, '').slice(0, 8);
}

interface SetupPageProps {
  onRun: (request: RunPipelineRequest) => void;
}

export function SetupPage({ onRun }: SetupPageProps) {
  const [tickers, setTickers] = useState<string[]>(DEFAULT_TICKERS);
  const [startDate, setStartDate] = useState(DEFAULT_START_DATE);
  const [newTicker, setNewTicker] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const addTicker = () => {
    const clean = sanitiseTicker(newTicker);
    if (!clean) {
      setValidationError('Enter a valid ticker symbol before adding.');
      return;
    }
    if (tickers.includes(clean)) {
      setValidationError(`${clean} is already in the list.`);
      return;
    }
    setTickers((prev) => [...prev, clean]);
    setNewTicker('');
    setValidationError(null);
  };

  const removeTicker = (ticker: string) => {
    setTickers((prev) => prev.filter((t) => t !== ticker));
    setValidationError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTicker();
    }
  };

  const handleRun = () => {
    if (tickers.length < MIN_TICKERS) {
      setValidationError(`Add at least ${MIN_TICKERS} tickers to build a diversified portfolio.`);
      return;
    }
    if (!startDate) {
      setValidationError('Select a start date for the backtest.');
      return;
    }
    setValidationError(null);
    onRun({ tickers, startDate });
  };

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="panel overflow-hidden bg-ink text-white">
        <div className="grid-lines absolute inset-0 opacity-15" />
        <div className="relative flex flex-col gap-4 p-8">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            <Gauge className="h-3.5 w-3.5" />
            Portfolio Analytics Dashboard
          </div>
          <div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Configure your portfolio
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70 md:text-base">
              Choose the assets you want to optimise and a start date for the backtest. The pipeline will download price data, forecast volatility, compute minimum-variance weights, and run a walk-forward backtest — then display the results here.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">

        {/* Ticker selection */}
        <div className="panel p-6">
          <p className="panel-title">Asset Universe</p>
          <h2 className="mt-3 text-xl font-semibold text-ink">Select tickers</h2>
          <p className="mt-1 text-sm text-slate-600">
            Minimum {MIN_TICKERS} tickers required. Include at least one benchmark (e.g. SPY) for comparison.
          </p>

          {/* Ticker chips */}
          <div className="mt-5 flex flex-wrap gap-2">
            {tickers.map((ticker) => (
              <div
                key={ticker}
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 font-mono text-sm font-semibold uppercase tracking-[0.14em] text-ink"
              >
                {ticker}
                <button
                  className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition hover:bg-stone-100 hover:text-danger"
                  onClick={() => removeTicker(ticker)}
                  type="button"
                  aria-label={`Remove ${ticker}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {tickers.length === 0 && (
              <p className="text-sm italic text-slate-400">No tickers added yet.</p>
            )}
          </div>

          {/* Add ticker row */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-4 py-2.5">
              <Plus className="h-4 w-4 shrink-0 text-teal" />
              <input
                className="w-full bg-transparent font-mono text-sm uppercase tracking-[0.16em] text-ink placeholder:text-slate-400 focus:outline-none"
                onChange={(e) => setNewTicker(sanitiseTicker(e.target.value))}
                onKeyDown={handleKeyDown}
                placeholder="e.g. NVDA"
                value={newTicker}
              />
            </div>
            <Button onClick={addTicker} type="button" variant="ghost">
              Add
            </Button>
          </div>

          {/* Quick-add defaults */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Defaults</span>
            {DEFAULT_TICKERS.map((ticker) => (
              <button
                key={ticker}
                className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 font-mono text-xs font-medium uppercase tracking-[0.14em] text-slate-600 transition hover:border-teal hover:bg-teal/5 hover:text-teal disabled:opacity-40"
                disabled={tickers.includes(ticker)}
                onClick={() => {
                  setTickers((prev) => (prev.includes(ticker) ? prev : [...prev, ticker]));
                  setValidationError(null);
                }}
                type="button"
              >
                {ticker}
              </button>
            ))}
          </div>
        </div>

        {/* Date selection */}
        <div className="panel p-6">
          <p className="panel-title">Backtest Period</p>
          <h2 className="mt-3 text-xl font-semibold text-ink">Start date</h2>
          <p className="mt-1 text-sm text-slate-600">
            Price data will be downloaded from this date to today. A longer period gives more reliable backtest results.
          </p>
          <div className="mt-5">
            <input
              className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-teal/40"
              max={new Date().toISOString().slice(0, 10)}
              min="2010-01-01"
              onChange={(e) => setStartDate(e.target.value)}
              type="date"
              value={startDate}
            />
          </div>
        </div>

        {/* Validation error */}
        {validationError ? (
          <div className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {validationError}
          </div>
        ) : null}

        {/* Run button */}
        <Button
          className="w-full justify-center py-3 text-base"
          icon={<Play className="h-5 w-5" />}
          onClick={handleRun}
          type="button"
          variant="primary"
        >
          Run optimisation pipeline
        </Button>

        <p className="text-center text-xs text-slate-400">
          The pipeline downloads data, trains models, and runs a walk-forward backtest. This typically takes 1–3 minutes.
        </p>
      </div>
    </div>
  );
}
