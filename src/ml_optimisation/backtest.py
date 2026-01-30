import os
import numpy as np
import pandas as pd
import config
from ml_optimisation.portfolio import min_variance_weights

FEATURES_PATH = config.FEATURES_PATH
WEIGHTS_PATH = config.OUT_WEIGHTS_PATH 
OUT_DIR = "data/processed"
RF_ANNUAL = getattr(config, "RISK_FREE_RATE", 0.0)  # annual
TRADING_DAYS = 252
CORR_WINDOW = config.CORR_WINDOW
# transaction cost (set to 0 for now)
TC_BPS = 0.0


def annual_rf_to_daily(rf_annual: float) -> float:
    # We store the risk-free rate as a yearly number (e.g. 0.02 = 2% per year).
    # For daily backtesting, we need the equivalent "per day" rate.
    # This converts annual -> daily assuming compounding over 252 trading days.
    return (1.0 + rf_annual) ** (1.0 / TRADING_DAYS) - 1.0


def max_drawdown(equity: pd.Series) -> float:
    # "Equity" is your portfolio value over time (e.g. 1.00, 1.02, 0.99, ...).

    # peak = the highest portfolio value reached up to each day
    peak = equity.cummax()

    # drawdown = how far we are below the best point so far (as a percentage)
    # Example: if peak was 1.20 and we are now 1.00, dd = (1.00/1.20) - 1 = -0.166..
    dd = (equity / peak) - 1.0
    return float(dd.min())


def perf_metrics(daily_returns: pd.Series, rf_daily: float) -> dict:
    daily_returns = daily_returns.dropna()
    n = len(daily_returns)

    # If we have no data, return "empty" metrics.
    if n == 0:
        return {
            "n_days": 0,
            "cagr": np.nan,
            "ann_return": np.nan,
            "ann_vol": np.nan,
            "sharpe": np.nan,
            "max_drawdown": np.nan,
        }

    # Turn daily returns into a portfolio value curve starting at 1.0.
    # (1 + r).cumprod() means: keep compounding day by day.
    equity = (1.0 + daily_returns).cumprod()

    # Compound Annual Growth Rate is the smooth yearly growth rate that would turn 1.0 into the final value
    # TRADING_DAYS / n converts your backtest length into “years”.
    cagr = float(equity.iloc[-1] ** (TRADING_DAYS / n) - 1.0)

    # Average daily return (simple mean)
    mean_d = float(daily_returns.mean())

    # Daily volatility (how much daily returns bounce around)
    std_d = float(daily_returns.std(ddof=1))

    # Convert daily average return into an annual estimate (roughly 252 trading days).
    ann_return = mean_d * TRADING_DAYS

    # Convert daily volatility into annual volatility (scales by sqrt(252)).
    ann_vol = std_d * np.sqrt(TRADING_DAYS)

    # Sharpe ratio = “return per unit of risk”
    # Use daily risk-free rate (rf_daily) to measure “excess return”.
    # If volatility is 0, Sharpe is undefined, so set to NaN.
    sharpe = np.nan if std_d == 0 else float(((mean_d - rf_daily) / std_d) * np.sqrt(TRADING_DAYS))

    # Worst peak-to-trough drop in the equity curve
    mdd = max_drawdown(equity)

    return {
        "n_days": n,
        "cagr": cagr,
        "ann_return": float(ann_return),
        "ann_vol": float(ann_vol),
        "sharpe": sharpe,
        "max_drawdown": float(mdd),
    }


def load_returns_from_features(features_path: str) -> pd.DataFrame:
    """
    Uses features.csv and pivots into wide returns:
    rows = dates, columns = tickers, values = daily returns.
    """
    # Read the features file (long format: one row per date per ticker)
    df = pd.read_csv(features_path, parse_dates=["date"])

    # sorted so the column order is consistent everywhere
    tickers = sorted(df["ticker"].unique())

    # Pivot converts: (date, ticker, ret) rows to a table where each ticker is a column
    returns = df.pivot(index="date", columns="ticker", values="ret").sort_index()

    # Keep only dates where we have returns for every ticker.
    # This avoids NaNs later when we compute portfolio returns.
    returns = returns.loc[returns.notna().all(axis=1), tickers]
    return returns


def load_weights(weights_path: str) -> pd.DataFrame:
    """
    Loads weights_minvar.csv:
    rows = rebalance dates, columns = tickers
    """
    w = pd.read_csv(weights_path, parse_dates=["date"], index_col="date").sort_index()
    return w


def make_daily_weight_schedule(returns: pd.DataFrame, weights_rebal: pd.DataFrame) -> pd.DataFrame:
    """
    Converts “rebalance-only weights” into “daily weights”.

    - We only compute weights every REBALANCE_EVERY days.
    - But we need weights for every day to backtest daily returns.
    - So we forward-fill. We keep using the latest weights until the next rebalance.
    """
    tickers = list(returns.columns)

    # Make sure weight columns match return columns and are in the same order.
    # This prevents mixing up assets
    weights_rebal = weights_rebal.reindex(columns=tickers)

    # Expand weights to all dates in the returns index, then forward-fill.
    # This means: between rebalances, hold the same weights.
    w_daily = weights_rebal.reindex(returns.index).ffill()

    # If the very first dates are NaN (no weights yet), fall back to equal weights
    if w_daily.isna().any(axis=1).iloc[0]:
        w_daily.iloc[0] = np.ones(len(tickers)) / len(tickers)
        w_daily = w_daily.ffill()

    # Safety step: make sure weights sum to 1 each day (normalise).
    # This protects against tiny numerical drift or missing values.
    s = w_daily.sum(axis=1).replace(0.0, np.nan)
    w_daily = w_daily.div(s, axis=0).fillna(0.0)

    return w_daily


def apply_weights_walkforward(returns: pd.DataFrame, w_daily: pd.DataFrame, rf_daily: float, tc_bps: float = 0.0):
    """
    Walk-forward rule:
    - weights decided at end of day t apply to returns on day t+1
    => shift weights by 1 when applying to same-day returns.
    """
    tickers = list(returns.columns)

    w_apply = w_daily.shift(1)

    # For first day, use the first known weights (or equal) to avoid NaN
    if w_apply.isna().any(axis=1).iloc[0]:
        w_apply.iloc[0] = w_daily.iloc[0]

    # Portfolio daily returns
    port_ret = (w_apply[tickers] * returns[tickers]).sum(axis=1)

    # always compute turnover (even if you don't charge costs)
    turnover = w_apply.diff().abs().sum(axis=1).fillna(0.0)

    # Costs only if tc_bps > 0
    if tc_bps and tc_bps > 0:
        tc_rate = tc_bps / 10000.0
        costs = tc_rate * turnover
    else:
        costs = pd.Series(0.0, index=port_ret.index)

    port_ret_net = port_ret - costs
    equity = (1.0 + port_ret_net).cumprod()

    return port_ret_net, equity, turnover, costs, w_apply

# "What if i split all the money equally among assets"
def benchmark_equal_weight(returns: pd.DataFrame) -> pd.Series:
    n = returns.shape[1]

    # equivalent to equal weights if no NaNs (we filtered full rows)
    ew = returns.mean(axis=1) 

    return ew

# “What if I put 100% of my money into SPY and never touched it?”
def benchmark_buy_and_hold(returns: pd.DataFrame, ticker="SPY"):
    if ticker not in returns.columns:
        raise ValueError(f"{ticker} not found in returns")

    spy_ret = returns[ticker].fillna(0.0)
    return spy_ret

# "What if I optimised once and held without rebalancing"
def benchmark_static_minvar(returns: pd.DataFrame, corr_window: int, date=None) -> pd.Series:
    """
    Optimise once using the first corr_window days, then hold weights forever.
    Uses sample covariance directly for the benchmark (simple & standard).
    """
    if len(returns) <= corr_window:
        return pd.Series(np.nan, index=returns.index)

    tickers = list(returns.columns)

    # "Training" window: first corr_window days
    train = returns.iloc[:corr_window][tickers]

    # Sample covariance (simple benchmark)
    cov = train.cov().to_numpy(dtype=float)

    # Compute weights once
    w = min_variance_weights(cov, date=date)

    # Apply fixed weights to all subsequent days
    port_ret = (returns[tickers] * w).sum(axis=1)
    # walk-forward
    port_ret.iloc[:corr_window] = np.nan
    return port_ret

def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    rf_daily = annual_rf_to_daily(RF_ANNUAL)

    # Load returns and weights
    returns = load_returns_from_features(FEATURES_PATH)
    weights_rebal = load_weights(WEIGHTS_PATH)

    # Align weights to returns dates
    w_daily = make_daily_weight_schedule(returns, weights_rebal)

    # Strategy backtest (walk-forward apply)
    port_ret, equity, turnover, costs, w_apply = apply_weights_walkforward(
        returns, w_daily, rf_daily=rf_daily, tc_bps=TC_BPS
    )

    # Benchmarks
    ew_ret = benchmark_equal_weight(returns)
    spy_ret = benchmark_buy_and_hold(returns, "SPY")
    static_ret = benchmark_static_minvar(returns, corr_window=CORR_WINDOW)

    ew_equity = (1.0 + ew_ret).cumprod()
    spy_equity = (1.0 + spy_ret.fillna(0.0)).cumprod()
    static_equity = (1.0 + static_ret).cumprod()

    # Metrics
    strat_metrics = perf_metrics(port_ret, rf_daily)
    ew_metrics = perf_metrics(ew_ret, rf_daily)
    spy_metrics = perf_metrics(spy_ret.dropna(), rf_daily)
    static_metrics = perf_metrics(static_ret, rf_daily)

    # Save curves
    curves = pd.DataFrame({
        "strategy_equity": equity,
        "equal_weight_equity": ew_equity,
        "spy_equity": spy_equity,
        "static_minvar_equity": static_equity,
        "strategy_ret": port_ret,
        "equal_weight_ret": ew_ret,
        "spy_ret": spy_ret,
        "static_minvar_ret": static_ret,
        "turnover": turnover,
        "costs": costs,
    })
    curves_path = os.path.join(OUT_DIR, "backtest_curves.csv")
    curves.to_csv(curves_path, index_label="date")

    # Save summary
    summary = pd.DataFrame([
        {"name": "strategy_minvar", **strat_metrics, "avg_turnover": float(turnover.mean())},
        {"name": "static_minvar", **static_metrics, "avg_turnover": 0.0},
        {"name": "equal_weight", **ew_metrics, "avg_turnover": 0.0},
        {"name": "buy_hold_spy", **spy_metrics, "avg_turnover": 0.0},
    ])
    summary_path = os.path.join(OUT_DIR, "backtest_summary.csv")
    summary.to_csv(summary_path, index=False)

    print("=== Backtest complete ===")
    print(f"Saved curves:  {curves_path}")
    print(f"Saved summary: {summary_path}")
    print("\nSummary:")
    print(summary.to_string(index=False))


if __name__ == "__main__":
    main()
