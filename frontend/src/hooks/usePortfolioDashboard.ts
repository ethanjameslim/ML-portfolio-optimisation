import { useCallback, useEffect, useState } from 'react';
import { portfolioApi } from '@/services/portfolioApi';
import type {
  ActionMessage,
  BacktestRefreshResult,
  PortfolioDashboardData,
  TickerMutationResult,
  WeightsRefreshResult,
} from '@/types/portfolio';

function toActionError(error: unknown, fallbackTitle: string): ActionMessage {
  return {
    status: 'error',
    title: fallbackTitle,
    message: error instanceof Error ? error.message : 'Unknown error',
    timestamp: new Date().toISOString(),
  };
}

export function usePortfolioDashboard() {
  const [data, setData] = useState<PortfolioDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const dashboard = await portfolioApi.getDashboardData();
      setData(dashboard);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const applyTickerMutation = useCallback((result: TickerMutationResult) => {
    setData((current) =>
      current
        ? {
            ...current,
            tickerConfig: result.tickerConfig,
          }
        : current,
    );
    setActionMessage(result.action);
  }, []);

  const applyWeightsRefresh = useCallback((result: WeightsRefreshResult) => {
    setData((current) =>
      current
        ? {
            ...current,
            latestWeights: result.latestWeights,
            weightHistory: result.weightHistory,
            summary: {
              ...current.summary,
              assetCount: result.latestWeights.allocations.length,
              lastUpdated: result.latestWeights.date,
            },
          }
        : current,
    );
    setActionMessage(result.action);
  }, []);

  const applyBacktestRefresh = useCallback((result: BacktestRefreshResult) => {
    setData((current) =>
      current
        ? {
            ...current,
            backtestSeries: result.backtestSeries,
            performanceRows: result.performanceRows,
            summary: result.summary,
          }
        : current,
    );
    setActionMessage(result.action);
  }, []);

  const saveTickers = useCallback(async (tickers: string[]) => {
    setBusyAction('saveTickers');
    try {
      const result = await portfolioApi.saveTickers(tickers);
      applyTickerMutation(result);
    } catch (mutationError) {
      setActionMessage(toActionError(mutationError, 'Ticker save failed'));
    } finally {
      setBusyAction(null);
    }
  }, [applyTickerMutation]);

  const resetTickers = useCallback(async () => {
    setBusyAction('resetTickers');
    try {
      const result = await portfolioApi.resetTickers();
      applyTickerMutation(result);
    } catch (mutationError) {
      setActionMessage(toActionError(mutationError, 'Ticker reset failed'));
    } finally {
      setBusyAction(null);
    }
  }, [applyTickerMutation]);

  const runOptimisation = useCallback(async () => {
    setBusyAction('runOptimisation');
    try {
      const result = await portfolioApi.runOptimisation();
      setActionMessage(result);
    } catch (runError) {
      setActionMessage(toActionError(runError, 'Optimisation run failed'));
    } finally {
      setBusyAction(null);
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    setBusyAction('refreshDashboard');
    try {
      const result = await portfolioApi.refreshDashboard();
      setData(result.dashboard);
      setActionMessage(result.action);
    } catch (refreshError) {
      setActionMessage(toActionError(refreshError, 'Dashboard refresh failed'));
    } finally {
      setBusyAction(null);
    }
  }, []);

  const refreshWeights = useCallback(async () => {
    setBusyAction('refreshWeights');
    try {
      const result = await portfolioApi.loadLatestWeights();
      applyWeightsRefresh(result);
    } catch (refreshError) {
      setActionMessage(toActionError(refreshError, 'Weights refresh failed'));
    } finally {
      setBusyAction(null);
    }
  }, [applyWeightsRefresh]);

  const refreshBacktest = useCallback(async () => {
    setBusyAction('refreshBacktest');
    try {
      const result = await portfolioApi.loadBacktestData();
      applyBacktestRefresh(result);
    } catch (refreshError) {
      setActionMessage(toActionError(refreshError, 'Backtest refresh failed'));
    } finally {
      setBusyAction(null);
    }
  }, [applyBacktestRefresh]);

  return {
    data,
    isLoading,
    error,
    actionMessage,
    busyAction,
    loadDashboard,
    saveTickers,
    resetTickers,
    runOptimisation,
    refreshDashboard,
    refreshWeights,
    refreshBacktest,
  };
}
