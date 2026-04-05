import type {
  ActionMessage,
  BacktestRefreshResult,
  DashboardRefreshResult,
  PortfolioApi,
  PortfolioDashboardData,
  TickerMutationResult,
  WeightsRefreshResult,
} from '@/types/portfolio';

const ENDPOINTS = {
  dashboard: '/api/portfolio/dashboard',
  tickers: '/api/portfolio/tickers',
  run: '/api/portfolio/run',
  latestWeights: '/api/portfolio/weights/latest',
  backtest: '/api/portfolio/backtest',
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

/*
  Centralised frontend assumptions for future backend integration:
  - GET  /api/portfolio/dashboard returns PortfolioDashboardData
  - PUT  /api/portfolio/tickers accepts { tickers: string[] } and returns TickerMutationResult
  - POST /api/portfolio/run triggers the existing backend pipeline and returns ActionMessage
  - GET  /api/portfolio/weights/latest returns WeightsRefreshResult
  - GET  /api/portfolio/backtest returns BacktestRefreshResult
*/
export const httpPortfolioApi: PortfolioApi = {
  getDashboardData() {
    return requestJson<PortfolioDashboardData>(ENDPOINTS.dashboard);
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

  async runOptimisation() {
    try {
      return await requestJson<ActionMessage>(ENDPOINTS.run, {
        method: 'POST',
      });
    } catch (error) {
      return toAction(
        'error',
        'Run request failed',
        error instanceof Error ? error.message : 'Unknown backend error',
      );
    }
  },

  async refreshDashboard() {
    const dashboard = await this.getDashboardData();
    return {
      dashboard,
      action: toAction('success', 'Dashboard refreshed', 'Loaded latest backend portfolio data.'),
    } satisfies DashboardRefreshResult;
  },

  loadLatestWeights() {
    return requestJson<WeightsRefreshResult>(ENDPOINTS.latestWeights);
  },

  loadBacktestData() {
    return requestJson<BacktestRefreshResult>(ENDPOINTS.backtest);
  },
};
