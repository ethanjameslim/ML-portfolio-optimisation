import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle, LoaderCircle } from 'lucide-react';
import { portfolioApi } from '@/services/portfolioApi';
import { Button } from '@/components/ui/Button';
import type { PipelineStatus, RunPipelineRequest } from '@/types/portfolio';

const PIPELINE_STEPS = [
  { label: 'Download price data',         threshold: 10 },
  { label: 'Engineer features',           threshold: 30 },
  { label: 'Train volatility models',     threshold: 50 },
  { label: 'Compute portfolio weights',   threshold: 70 },
  { label: 'Run walk-forward backtest',   threshold: 90 },
  { label: 'Plot equity curves',          threshold: 100 },
];

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

interface RunningPageProps {
  request: RunPipelineRequest;
  onComplete: () => void;
  onError: () => void;
}

export function RunningPage({ request, onComplete, onError }: RunningPageProps) {
  const [status, setStatus] = useState<PipelineStatus>({
    status: 'running',
    stage: 'Starting',
    progress: 0,
    message: 'Sending pipeline request…',
    startedAt: null,
    completedAt: null,
    error: null,
  });
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());
  const doneRef = useRef(false);

  useEffect(() => {
    let stopped = false;

    // Fire POST once to start the pipeline
    void portfolioApi.runOptimisation(request);

    // Poll status every 2 seconds
    const pollId = setInterval(async () => {
      if (stopped) return;
      try {
        const latest = await portfolioApi.getPipelineStatus();
        if (stopped) return;
        setStatus(latest);

        if (latest.status === 'success' && !doneRef.current) {
          doneRef.current = true;
          clearInterval(pollId);
          setTimeout(() => { if (!stopped) onComplete(); }, 1200);
        }
        if (latest.status === 'error') {
          clearInterval(pollId);
        }
      } catch {
        // Network hiccup during polling — keep trying
      }
    }, 2000);

    // Elapsed time counter (1s tick)
    const tickId = setInterval(() => {
      if (stopped) return;
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);

    return () => {
      stopped = true;
      clearInterval(pollId);
      clearInterval(tickId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isError   = status.status === 'error';
  const isSuccess = status.status === 'success';

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">

        {/* Status icon + heading */}
        <div className="panel p-8 text-center">
          <div className="flex justify-center">
            {isError ? (
              <AlertTriangle className="h-12 w-12 text-danger" />
            ) : isSuccess ? (
              <CheckCircle className="h-12 w-12 text-teal" />
            ) : (
              <LoaderCircle className="h-12 w-12 animate-spin text-teal" />
            )}
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            {isError ? 'Pipeline failed' : isSuccess ? 'Pipeline complete' : status.stage}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            {status.message}
          </p>

          {!isError && !isSuccess && (
            <p className="mt-1 text-xs text-slate-400">
              Elapsed: {formatElapsed(elapsed)}
            </p>
          )}

          {/* Progress bar */}
          {!isError && (
            <div className="mt-6">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal to-mint transition-all duration-700 ease-out"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
              <p className="mt-2 text-right font-mono text-xs font-semibold text-slate-500">
                {status.progress}%
              </p>
            </div>
          )}

          {/* Error detail */}
          {isError && status.error && (
            <div className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-left text-xs text-danger">
              <span className="font-semibold">Error: </span>{status.error}
            </div>
          )}

          {/* Back to setup on error */}
          {isError && (
            <div className="mt-6">
              <Button onClick={onError} variant="secondary">
                Back to setup
              </Button>
            </div>
          )}
        </div>

        {/* Step list */}
        <div className="panel divide-y divide-stone-100">
          {PIPELINE_STEPS.map((step) => {
            const done    = status.progress >= step.threshold;
            const current = !done && status.progress >= (step.threshold - 20) && !isError;
            return (
              <div key={step.label} className="flex items-center gap-3 px-5 py-3">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {done ? (
                    <CheckCircle className="h-4 w-4 text-teal" />
                  ) : current ? (
                    <LoaderCircle className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-stone-300" />
                  )}
                </div>
                <span className={`text-sm ${done ? 'font-medium text-ink' : 'text-slate-400'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Tickers summary */}
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Running for</span>
          {request.tickers.map((ticker) => (
            <span
              key={ticker}
              className="rounded-full border border-stone-200 bg-white px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-slate-600"
            >
              {ticker}
            </span>
          ))}
          <span className="text-xs text-slate-400">from {request.startDate}</span>
        </div>
      </div>
    </div>
  );
}
