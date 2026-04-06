import {
  computeDrawdownSeries,
  computeRollingAnnualizedVolatility,
  computeRollingSharpe,
} from '@/utils/analytics';
import type {
  ActionMessage,
  BacktestRefreshResult,
  BacktestSeriesPoint,
  DashboardRefreshResult,
  PipelineStatus,
  PortfolioApi,
  PortfolioDashboardData,
  RunPipelineRequest,
  TickerMutationResult,
  WeightsRefreshResult,
} from '@/types/portfolio';

const ENDPOINTS = {
  dashboard:    '/api/portfolio/dashboard',
  tickers:      '/api/portfolio/tickers',
  run:          '/api/portfolio/run',
  status:       '/api/portfolio/status',
  latestWeights:'/api/portfolio/weights/latest',
  backtest:     '/api/portfolio/backtest',
} as const;

async function requestJson<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as T;
}

function toAction(
  status: ActionMessage['status'],
  title: string,
  message: string,
): ActionMessage {
  return {
    status,
    title,
    message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * The backend always returns null for the four derived fields.
 * Compute them client-side here, exactly as filePortfolioApi does.
 */
function applyAnalytics(series: BacktestSeriesPoint[]): BacktestSeriesPoint[] {
  const strategyDrawdown  = computeDrawdownSeries(series.map((p) => p.strategyEquity));
  const spyDrawdown       = computeDrawdownSeries(series.map((p) => p.spyEquity));
  const rollingVolatility = computeRollingAnnualizedVolatility(series.map((p) => p.strategyReturn));
  const rollingSharpe     = computeRollingSharpe(series.map((p) => p.strategyReturn));

  return series.map((point, i) => ({
    ...point,
    strategyDrawdown:  strategyDrawdown[i],
    spyDrawdown:       spyDrawdown[i],
    rollingVolatility: rollingVolatility[i],
    rollingSharpe:     rollingSharpe[i],
  }));
}

/*
  Centralised frontend assumptions for future backend integration:
  - GET  /api/portfolio/dashboard returns PortfolioDashboardData
  - PUT  /api/portfolio/tickers accepts { tickers: string[] } and returns TickerMutationResult
  - POST /api/portfolio/run triggers the existing backend pipeline and returns ActionMessage
  - GET  /api/portfolio/weights/latest returns WeightsRefreshResult
  - GET  /api/portfolio/backtest returns BacktestRefreshResult
*/
export const httpPortfolioApi: PortfolioApi = {
  async getDashboardData() {
    const data = await requestJson<PortfolioDashboardData>(ENDPOINTS.dashboard);
    return { ...data, backtestSeries: applyAnalytics(data.backtestSeries) };
  },

  saveTickers(tickers) {
    return requestJson<TickerMutationResult>(ENDPOINTS.tickers, {
      method: 'PUT',
      body: JSON.stringify({ tickers }),
    });
  },

  resetTickers() {
    return requestJson<TickerMutationResult>(ENDPOINTS.tickers, {
      method: 'DELETE',
    });
  },

  async runOptimisation(request: RunPipelineRequest) {
    try {
      return await requestJson<ActionMessage>(ENDPOINTS.run, {
        method: 'POST',
        body: JSON.stringify(request),
      });
    } catch (error) {
      return toAction(
        'error',
        'Run request failed',
        error instanceof Error ? error.message : 'Unknown backend error',
      );
    }
  },

  getPipelineStatus(): Promise<PipelineStatus> {
    return requestJson<PipelineStatus>(ENDPOINTS.status);
  },

  async refreshDashboard() {
    const data = await requestJson<PortfolioDashboardData>(ENDPOINTS.dashboard);
    const dashboard = { ...data, backtestSeries: applyAnalytics(data.backtestSeries) };
    return {
      dashboard,
      action: toAction('success', 'Dashboard refreshed', 'Loaded latest backend portfolio data.'),
    } satisfies DashboardRefreshResult;
  },

  loadLatestWeights() {
    return requestJson<WeightsRefreshResult>(ENDPOINTS.latestWeights);
  },

  async loadBacktestData() {
    const result = await requestJson<BacktestRefreshResult>(ENDPOINTS.backtest);
    return { ...result, backtestSeries: applyAnalytics(result.backtestSeries) };
  },
};
