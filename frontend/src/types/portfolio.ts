export type AdapterMode = 'static' | 'http';
export type ActionStatus = 'success' | 'warning' | 'error';
export type RangeKey = 'YTD' | '1Y' | '3Y' | 'MAX';

export interface AdapterDescriptor {
  mode: AdapterMode;
  label: string;
  detail: string;
}

export interface DashboardSummary {
  totalReturn: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  assetCount: number;
  rebalanceFrequency: string;
  avgTurnover: number;
  startDate: string;
  endDate: string;
  lastUpdated: string;
}

export interface Allocation {
  ticker: string;
  weight: number;
}

export interface LatestWeightsSnapshot {
  date: string;
  allocations: Allocation[];
}

export interface WeightHistoryRow {
  date: string;
  allocations: Allocation[];
  topTicker: string;
  topWeight: number;
  turnoverToPrev: number;
}

export interface PerformanceRow {
  key: string;
  label: string;
  nDays: number;
  cagr: number;
  annReturn: number;
  annVol: number;
  sharpe: number;
  maxDrawdown: number;
  avgTurnover: number;
}

export interface BacktestSeriesPoint {
  date: string;
  strategyEquity: number | null;
  equalWeightEquity: number | null;
  spyEquity: number | null;
  staticMinvarEquity: number | null;
  strategyReturn: number | null;
  equalWeightReturn: number | null;
  spyReturn: number | null;
  staticMinvarReturn: number | null;
  turnover: number | null;
  costs: number | null;
  strategyDrawdown: number | null;
  spyDrawdown: number | null;
  rollingVolatility: number | null;
  rollingSharpe: number | null;
}

export interface TickerConfig {
  defaultTickers: string[];
  activeTickers: string[];
  persistedLocally: boolean;
  note: string;
}

export interface PortfolioDashboardData {
  adapter: AdapterDescriptor;
  summary: DashboardSummary;
  performanceRows: PerformanceRow[];
  backtestSeries: BacktestSeriesPoint[];
  latestWeights: LatestWeightsSnapshot;
  weightHistory: WeightHistoryRow[];
  tickerConfig: TickerConfig;
}

export interface ActionMessage {
  status: ActionStatus;
  title: string;
  message: string;
  timestamp: string;
}

export interface TickerMutationResult {
  tickerConfig: TickerConfig;
  action: ActionMessage;
}

export interface WeightsRefreshResult {
  latestWeights: LatestWeightsSnapshot;
  weightHistory: WeightHistoryRow[];
  action: ActionMessage;
}

export interface BacktestRefreshResult {
  backtestSeries: BacktestSeriesPoint[];
  performanceRows: PerformanceRow[];
  summary: DashboardSummary;
  action: ActionMessage;
}

export interface DashboardRefreshResult {
  dashboard: PortfolioDashboardData;
  action: ActionMessage;
}

export interface PortfolioApi {
  getDashboardData(): Promise<PortfolioDashboardData>;
  saveTickers(tickers: string[]): Promise<TickerMutationResult>;
  resetTickers(): Promise<TickerMutationResult>;
  runOptimisation(): Promise<ActionMessage>;
  refreshDashboard(): Promise<DashboardRefreshResult>;
  loadLatestWeights(): Promise<WeightsRefreshResult>;
  loadBacktestData(): Promise<BacktestRefreshResult>;
}
