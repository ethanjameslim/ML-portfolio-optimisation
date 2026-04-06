import type { BacktestSeriesPoint, RangeKey } from '@/types/portfolio';

const TRADING_DAYS = 252;
const ROLLING_WINDOW = 63;

function isValidNumber(value: number | null | undefined): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}

export function computeDrawdownSeries(equityValues: Array<number | null | undefined>) {
  let peak = 0;

  return equityValues.map((equity) => {
    if (!isValidNumber(equity)) {
      return null;
    }

    peak = Math.max(peak, equity);
    if (peak === 0) {
      return null;
    }

    return equity / peak - 1;
  });
}

export function computeRollingAnnualizedVolatility(
  returns: Array<number | null | undefined>,
  window = ROLLING_WINDOW,
) {
  return returns.map((_, index) => {
    const slice = returns.slice(Math.max(0, index - window + 1), index + 1).filter(isValidNumber);
    if (slice.length < window) {
      return null;
    }

    const mean = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    const variance =
      slice.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(slice.length - 1, 1);

    return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS);
  });
}

export function computeRollingSharpe(
  returns: Array<number | null | undefined>,
  window = ROLLING_WINDOW,
) {
  return returns.map((_, index) => {
    const slice = returns.slice(Math.max(0, index - window + 1), index + 1).filter(isValidNumber);
    if (slice.length < window) {
      return null;
    }

    const mean = slice.reduce((sum, value) => sum + value, 0) / slice.length;
    const variance =
      slice.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(slice.length - 1, 1);
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) {
      return null;
    }

    return (mean / stdDev) * Math.sqrt(TRADING_DAYS);
  });
}

export function filterSeriesByRange(series: BacktestSeriesPoint[], range: RangeKey) {
  if (range === 'MAX' || series.length === 0) {
    return series;
  }

  const latestDate = new Date(series[series.length - 1].date);

  let minDate = new Date(latestDate);
  if (range === 'YTD') {
    minDate = new Date(latestDate.getFullYear(), 0, 1);
  }
  if (range === '1Y') {
    minDate = new Date(latestDate);
    minDate.setFullYear(latestDate.getFullYear() - 1);
  }
  if (range === '3Y') {
    minDate = new Date(latestDate);
    minDate.setFullYear(latestDate.getFullYear() - 3);
  }

  return series.filter((point) => new Date(point.date) >= minDate);
}

export function computeWeightTurnover(current: number[], previous: number[]) {
  return current.reduce((sum, value, index) => sum + Math.abs(value - (previous[index] ?? 0)), 0);
}
