import { computeDrawdownSeries, computeRollingAnnualizedVolatility, computeRollingSharpe, computeWeightTurnover } from '@/utils/analytics';
import { fetchCsvRecords, toNumber, type CsvRecord } from '@/services/csv';
import type {
  ActionMessage,
  Allocation,
  BacktestRefreshResult,
  BacktestSeriesPoint,
  DashboardRefreshResult,
  DashboardSummary,
  LatestWeightsSnapshot,
  PerformanceRow,
  PortfolioApi,
  PortfolioDashboardData,
  TickerConfig,
  TickerMutationResult,
  WeightHistoryRow,
  WeightsRefreshResult,
} from '@/types/portfolio';

const STATIC_TICKER_STORAGE_KEY = 'portfolio-optimiser.frontend-tickers.v1';
const STATIC_REBALANCE_FREQUENCY = '5D';

function timestamp() {
  return new Date().toISOString();
}

function createAction(
  status: ActionMessage['status'],
  title: string,
  message: string,
): ActionMessage {
  return {
    status,
    title,
    message,
    timestamp: timestamp(),
  };
}

function extractTickerColumns(record: CsvRecord | undefined) {
  if (!record) {
    return [];
  }

  return Object.keys(record).filter((key) => key.toLowerCase() !== 'date');
}

function getStoredTickers(defaultTickers: string[]) {
  const raw = window.localStorage.getItem(STATIC_TICKER_STORAGE_KEY);
  if (!raw) {
    return defaultTickers;
  }

  try {
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return defaultTickers;
    }

    return parsed.map((ticker) => ticker.toUpperCase());
  } catch {
    return defaultTickers;
  }
}

function buildTickerConfig(defaultTickers: string[]): TickerConfig {
  const activeTickers = getStoredTickers(defaultTickers);
  const persistedLocally = window.localStorage.getItem(STATIC_TICKER_STORAGE_KEY) !== null;

  return {
    defaultTickers,
    activeTickers,
    persistedLocally,
    note:
      'Static adapter mode is active. Ticker edits are stored in the browser only until real backend endpoints are wired in.',
  };
}

function mapPerformanceRows(records: CsvRecord[]) {
  const labelMap: Record<string, string> = {
    strategy_minvar: 'Strategy Min Variance',
    static_minvar: 'Static Min Variance',
    equal_weight: 'Equal Weight',
    buy_hold_spy: 'Buy & Hold SPY',
  };

  return records.map<PerformanceRow>((record) => ({
    key: record.name ?? 'unknown',
    label: labelMap[record.name ?? ''] ?? record.name ?? 'Unknown',
    nDays: toNumber(record.n_days) ?? 0,
    cagr: toNumber(record.cagr) ?? 0,
    annReturn: toNumber(record.ann_return) ?? 0,
    annVol: toNumber(record.ann_vol) ?? 0,
    sharpe: toNumber(record.sharpe) ?? 0,
    maxDrawdown: toNumber(record.max_drawdown) ?? 0,
    avgTurnover: toNumber(record.avg_turnover) ?? 0,
  }));
}

function buildBacktestSeries(records: CsvRecord[]) {
  const baseSeries = records.map<BacktestSeriesPoint>((record) => ({
    date: record.date,
    strategyEquity: toNumber(record.strategy_equity),
    equalWeightEquity: toNumber(record.equal_weight_equity),
    spyEquity: toNumber(record.spy_equity),
    staticMinvarEquity: toNumber(record.static_minvar_equity),
    strategyReturn: toNumber(record.strategy_ret),
    equalWeightReturn: toNumber(record.equal_weight_ret),
    spyReturn: toNumber(record.spy_ret),
    staticMinvarReturn: toNumber(record.static_minvar_ret),
    turnover: toNumber(record.turnover),
    costs: toNumber(record.costs),
    strategyDrawdown: null,
    spyDrawdown: null,
    rollingVolatility: null,
    rollingSharpe: null,
  }));

  const strategyDrawdown = computeDrawdownSeries(baseSeries.map((point) => point.strategyEquity));
  const spyDrawdown = computeDrawdownSeries(baseSeries.map((point) => point.spyEquity));
  const rollingVolatility = computeRollingAnnualizedVolatility(
    baseSeries.map((point) => point.strategyReturn),
  );
  const rollingSharpe = computeRollingSharpe(baseSeries.map((point) => point.strategyReturn));

  return baseSeries.map((point, index) => ({
    ...point,
    strategyDrawdown: strategyDrawdown[index],
    spyDrawdown: spyDrawdown[index],
    rollingVolatility: rollingVolatility[index],
    rollingSharpe: rollingSharpe[index],
  }));
}

function buildAllocations(record: CsvRecord | undefined): Allocation[] {
  if (!record) {
    return [];
  }

  return extractTickerColumns(record)
    .map((ticker) => ({
      ticker,
      weight: toNumber(record[ticker]) ?? 0,
    }))
    .sort((left, right) => right.weight - left.weight);
}

function buildWeightHistory(records: CsvRecord[]) {
  const tickerColumns = extractTickerColumns(records[0]);

  return records.map<WeightHistoryRow>((record, index) => {
    const allocations = buildAllocations(record);
    const topAllocation = allocations[0];
    const currentWeights = tickerColumns.map((ticker) => toNumber(record[ticker]) ?? 0);
    const previousRecord = records[index - 1];
    const previousWeights = tickerColumns.map((ticker) => toNumber(previousRecord?.[ticker]) ?? 0);

    return {
      date: record.date,
      allocations,
      topTicker: topAllocation?.ticker ?? 'N/A',
      topWeight: topAllocation?.weight ?? 0,
      turnoverToPrev: index === 0 ? 0 : computeWeightTurnover(currentWeights, previousWeights),
    };
  });
}

function buildSummary(
  backtestSeries: BacktestSeriesPoint[],
  performanceRows: PerformanceRow[],
  latestWeights: LatestWeightsSnapshot,
): DashboardSummary {
  const strategy = performanceRows.find((row) => row.key === 'strategy_minvar');
  const firstEquity = backtestSeries.find((point) => point.strategyEquity !== null)?.strategyEquity ?? 1;
  const lastEquity =
    [...backtestSeries].reverse().find((point) => point.strategyEquity !== null)?.strategyEquity ?? 1;

  return {
    totalReturn: lastEquity / firstEquity - 1,
    annualizedReturn: strategy?.annReturn ?? 0,
    volatility: strategy?.annVol ?? 0,
    sharpeRatio: strategy?.sharpe ?? 0,
    maxDrawdown: strategy?.maxDrawdown ?? 0,
    assetCount: latestWeights.allocations.length,
    rebalanceFrequency: STATIC_REBALANCE_FREQUENCY,
    avgTurnover: strategy?.avgTurnover ?? 0,
    startDate: backtestSeries[0]?.date ?? latestWeights.date,
    endDate: backtestSeries[backtestSeries.length - 1]?.date ?? latestWeights.date,
    lastUpdated: latestWeights.date,
  };
}

async function loadArtifacts() {
  const [summaryRecords, curveRecords, weightRecords, priceRecords] = await Promise.all([
    fetchCsvRecords('/processed/backtest_summary.csv'),
    fetchCsvRecords('/processed/backtest_curves.csv'),
    fetchCsvRecords('/processed/weights_minvar.csv'),
    fetchCsvRecords('/raw/prices.csv'),
  ]);

  const defaultTickers =
    extractTickerColumns(priceRecords[0]).length > 0
      ? extractTickerColumns(priceRecords[0])
      : extractTickerColumns(weightRecords[0]);
  const tickerConfig = buildTickerConfig(defaultTickers);
  const latestWeightRecord = weightRecords[weightRecords.length - 1];
  const latestWeights: LatestWeightsSnapshot = {
    date: latestWeightRecord?.date ?? timestamp(),
    allocations: buildAllocations(latestWeightRecord),
  };

  const performanceRows = mapPerformanceRows(summaryRecords);
  const backtestSeries = buildBacktestSeries(curveRecords);
  const weightHistory = buildWeightHistory(weightRecords);
  const summary = buildSummary(backtestSeries, performanceRows, latestWeights);

  return {
    adapter: {
      mode: 'static' as const,
      label: 'Static File Adapter',
      detail:
        'The UI is currently reading generated CSV outputs from the existing Python pipeline. Hook the HTTP adapter up later when backend endpoints are available.',
    },
    summary,
    performanceRows,
    backtestSeries,
    latestWeights,
    weightHistory,
    tickerConfig,
  };
}

export const filePortfolioApi: PortfolioApi = {
  async getDashboardData() {
    return loadArtifacts();
  },

  async saveTickers(tickers) {
    window.localStorage.setItem(
      STATIC_TICKER_STORAGE_KEY,
      JSON.stringify(tickers.map((ticker) => ticker.toUpperCase())),
    );

    const { tickerConfig } = await loadArtifacts();
    return {
      tickerConfig,
      action: createAction(
        'warning',
        'Ticker draft saved locally',
        'Ticker edits are available in the front-end now, but the backend source of truth has not been changed because no write endpoint exists yet.',
      ),
    } satisfies TickerMutationResult;
  },

  async resetTickers() {
    window.localStorage.removeItem(STATIC_TICKER_STORAGE_KEY);
    const { tickerConfig } = await loadArtifacts();

    return {
      tickerConfig,
      action: createAction(
        'success',
        'Ticker list reset',
        'Reset back to the current backend-derived default universe from the project data files.',
      ),
    } satisfies TickerMutationResult;
  },

  async runOptimisation() {
    return createAction(
      'warning',
      'Run endpoint not connected',
      'The browser cannot execute the Python optimisation pipeline directly. Wire this button to a backend POST endpoint when you expose one.',
    );
  },

  async refreshDashboard() {
    const dashboard = await loadArtifacts();
    return {
      dashboard,
      action: createAction(
        'success',
        'Dashboard refreshed',
        'Reloaded the latest processed CSV artifacts from the existing project outputs.',
      ),
    } satisfies DashboardRefreshResult;
  },

  async loadLatestWeights() {
    const { latestWeights, weightHistory } = await loadArtifacts();
    return {
      latestWeights,
      weightHistory,
      action: createAction(
        'success',
        'Weights refreshed',
        'Loaded the latest saved rebalance weights from the processed output files.',
      ),
    } satisfies WeightsRefreshResult;
  },

  async loadBacktestData() {
    const { backtestSeries, performanceRows, summary } = await loadArtifacts();
    return {
      backtestSeries,
      performanceRows,
      summary,
      action: createAction(
        'success',
        'Backtest data refreshed',
        'Pulled the latest backtest curve and summary artifacts from the current pipeline outputs.',
      ),
    } satisfies BacktestRefreshResult;
  },
};
