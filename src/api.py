"""
Portfolio Optimiser API
-----------------------
Run from the project root:   python src/api.py
Or from src/:                cd src && python api.py

The server changes its working directory to the project root on startup so
that config.py's relative paths (data/raw, data/processed) resolve correctly.
"""

import json
import os
import sys
import threading
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

# ── resolve paths before any relative-path imports ──────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent
os.chdir(PROJECT_ROOT)
sys.path.insert(0, str(PROJECT_ROOT / "src"))

import pandas as pd
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config as cfg

# ── data directory constants (absolute) ─────────────────────────────────────
DATA_ROOT     = PROJECT_ROOT / "data"
PROCESSED_DIR = DATA_ROOT / "processed"
RAW_DIR       = DATA_ROOT / "raw"
STATE_FILE    = DATA_ROOT / "pipeline_state.json"


# ── pipeline state ───────────────────────────────────────────────────────────

_state_lock    = threading.Lock()
_pipeline_lock = threading.Lock()

DEFAULT_STATE: dict = {
    "status":      "idle",
    "stage":       "",
    "progress":    0,
    "message":     "No pipeline has been run yet.",
    "startedAt":   None,
    "completedAt": None,
    "error":       None,
    "tickers":     None,
    "startDate":   None,
}


def _load_state() -> dict:
    try:
        return json.loads(STATE_FILE.read_text())
    except Exception:
        return DEFAULT_STATE.copy()


def _save_state(state: dict) -> None:
    DATA_ROOT.mkdir(parents=True, exist_ok=True)
    STATE_FILE.write_text(json.dumps(state, indent=2))


def get_pipeline_state() -> dict:
    with _state_lock:
        return _load_state()


def update_pipeline_state(**kwargs) -> None:
    with _state_lock:
        state = _load_state()
        state.update(kwargs)
        _save_state(state)


# ── pydantic models (match TypeScript types exactly) ────────────────────────

class Allocation(BaseModel):
    ticker: str
    weight: float

class LatestWeightsSnapshot(BaseModel):
    date: str
    allocations: list[Allocation]

class WeightHistoryRow(BaseModel):
    date: str
    allocations: list[Allocation]
    topTicker: str
    topWeight: float
    turnoverToPrev: float

class PerformanceRow(BaseModel):
    key: str
    label: str
    nDays: int
    cagr: float
    annReturn: float
    annVol: float
    sharpe: float
    maxDrawdown: float
    avgTurnover: float

class BacktestSeriesPoint(BaseModel):
    date: str
    strategyEquity:     Optional[float] = None
    equalWeightEquity:  Optional[float] = None
    spyEquity:          Optional[float] = None
    staticMinvarEquity: Optional[float] = None
    strategyReturn:     Optional[float] = None
    equalWeightReturn:  Optional[float] = None
    spyReturn:          Optional[float] = None
    staticMinvarReturn: Optional[float] = None
    turnover:           Optional[float] = None
    costs:              Optional[float] = None
    # Computed client-side via utils/analytics.ts — always null from backend
    strategyDrawdown:   None = None
    spyDrawdown:        None = None
    rollingVolatility:  None = None
    rollingSharpe:      None = None

class TickerConfig(BaseModel):
    defaultTickers:   list[str]
    activeTickers:    list[str]
    persistedLocally: bool
    note:             str

class AdapterDescriptor(BaseModel):
    mode:   str
    label:  str
    detail: str

class DashboardSummary(BaseModel):
    totalReturn:        float
    annualizedReturn:   float
    volatility:         float
    sharpeRatio:        float
    maxDrawdown:        float
    assetCount:         int
    rebalanceFrequency: str
    avgTurnover:        float
    startDate:          str
    endDate:            str
    lastUpdated:        str

class PortfolioDashboardData(BaseModel):
    adapter:         AdapterDescriptor
    summary:         DashboardSummary
    performanceRows: list[PerformanceRow]
    backtestSeries:  list[BacktestSeriesPoint]
    latestWeights:   LatestWeightsSnapshot
    weightHistory:   list[WeightHistoryRow]
    tickerConfig:    TickerConfig

class ActionMessage(BaseModel):
    status:    str   # "success" | "warning" | "error"
    title:     str
    message:   str
    timestamp: str

class RunRequest(BaseModel):
    tickers:   list[str]
    startDate: str        # "YYYY-MM-DD"

class PipelineStatus(BaseModel):
    status:      str            # "idle" | "running" | "success" | "error"
    stage:       str
    progress:    int            # 0–100
    message:     str
    startedAt:   Optional[str]
    completedAt: Optional[str]
    error:       Optional[str]

class TickerMutationResult(BaseModel):
    tickerConfig: TickerConfig
    action:       ActionMessage

class WeightsRefreshResult(BaseModel):
    latestWeights: LatestWeightsSnapshot
    weightHistory: list[WeightHistoryRow]
    action:        ActionMessage

class BacktestRefreshResult(BaseModel):
    backtestSeries:  list[BacktestSeriesPoint]
    performanceRows: list[PerformanceRow]
    summary:         DashboardSummary
    action:          ActionMessage

class DashboardRefreshResult(BaseModel):
    dashboard: PortfolioDashboardData
    action:    ActionMessage


# ── CSV → JSON helpers ───────────────────────────────────────────────────────

PERF_LABEL_MAP = {
    "strategy_minvar": "Strategy Min Variance",
    "static_minvar":   "Static Min Variance",
    "equal_weight":    "Equal Weight",
    "buy_hold_spy":    "Buy & Hold SPY",
}


def _to_float(val) -> Optional[float]:
    try:
        f = float(val)
        return None if (f != f) else f  # NaN check
    except (TypeError, ValueError):
        return None


def _build_allocations(row: "pd.Series", tickers: list[str]) -> list[Allocation]:
    allocs = [Allocation(ticker=t, weight=float(row[t])) for t in tickers if t in row.index]
    return sorted(allocs, key=lambda a: a.weight, reverse=True)


def _build_weight_history(weights_df: "pd.DataFrame") -> list[WeightHistoryRow]:
    tickers = list(weights_df.columns)
    rows: list[WeightHistoryRow] = []
    prev_weights: Optional[list[float]] = None

    for date_val, row in weights_df.iterrows():
        allocs = _build_allocations(row, tickers)
        top = allocs[0] if allocs else Allocation(ticker="N/A", weight=0.0)
        cur_w = [float(row[t]) for t in tickers]
        turnover = (
            0.0 if prev_weights is None
            else sum(abs(c - p) for c, p in zip(cur_w, prev_weights))
        )
        rows.append(WeightHistoryRow(
            date=str(date_val)[:10],
            allocations=allocs,
            topTicker=top.ticker,
            topWeight=top.weight,
            turnoverToPrev=turnover,
        ))
        prev_weights = cur_w

    return rows


def _build_backtest_series(curves_df: "pd.DataFrame") -> list[BacktestSeriesPoint]:
    points: list[BacktestSeriesPoint] = []
    for date_val, row in curves_df.iterrows():
        points.append(BacktestSeriesPoint(
            date=str(date_val)[:10],
            strategyEquity=_to_float(row.get("strategy_equity")),
            equalWeightEquity=_to_float(row.get("equal_weight_equity")),
            spyEquity=_to_float(row.get("spy_equity")),
            staticMinvarEquity=_to_float(row.get("static_minvar_equity")),
            strategyReturn=_to_float(row.get("strategy_ret")),
            equalWeightReturn=_to_float(row.get("equal_weight_ret")),
            spyReturn=_to_float(row.get("spy_ret")),
            staticMinvarReturn=_to_float(row.get("static_minvar_ret")),
            turnover=_to_float(row.get("turnover")),
            costs=_to_float(row.get("costs")),
        ))
    return points


def _build_performance_rows(summary_df: "pd.DataFrame") -> list[PerformanceRow]:
    rows: list[PerformanceRow] = []
    for _, row in summary_df.iterrows():
        key = str(row["name"])
        rows.append(PerformanceRow(
            key=key,
            label=PERF_LABEL_MAP.get(key, key),
            nDays=int(row["n_days"]),
            cagr=_to_float(row["cagr"]) or 0.0,
            annReturn=_to_float(row["ann_return"]) or 0.0,
            annVol=_to_float(row["ann_vol"]) or 0.0,
            sharpe=_to_float(row["sharpe"]) or 0.0,
            maxDrawdown=_to_float(row["max_drawdown"]) or 0.0,
            avgTurnover=_to_float(row.get("avg_turnover", 0)) or 0.0,
        ))
    return rows


def _build_summary(
    perf_rows: list[PerformanceRow],
    backtest_series: list[BacktestSeriesPoint],
    latest_weights: LatestWeightsSnapshot,
) -> DashboardSummary:
    strategy = next((r for r in perf_rows if r.key == "strategy_minvar"), None)
    equity_vals = [p.strategyEquity for p in backtest_series if p.strategyEquity is not None]
    first_eq = equity_vals[0] if equity_vals else 1.0
    last_eq  = equity_vals[-1] if equity_vals else 1.0
    start_date = backtest_series[0].date if backtest_series else latest_weights.date
    end_date   = backtest_series[-1].date if backtest_series else latest_weights.date
    return DashboardSummary(
        totalReturn=last_eq / first_eq - 1,
        annualizedReturn=strategy.annReturn if strategy else 0.0,
        volatility=strategy.annVol if strategy else 0.0,
        sharpeRatio=strategy.sharpe if strategy else 0.0,
        maxDrawdown=strategy.maxDrawdown if strategy else 0.0,
        assetCount=len(latest_weights.allocations),
        rebalanceFrequency="5D",
        avgTurnover=strategy.avgTurnover if strategy else 0.0,
        startDate=start_date,
        endDate=end_date,
        lastUpdated=latest_weights.date,
    )


def _load_dashboard_data() -> PortfolioDashboardData:
    """Read the four output CSVs and assemble a full dashboard response."""
    curves_path  = PROCESSED_DIR / "backtest_curves.csv"
    summary_path = PROCESSED_DIR / "backtest_summary.csv"
    weights_path = PROCESSED_DIR / "weights_minvar.csv"
    prices_path  = RAW_DIR / "prices.csv"

    for p in (curves_path, summary_path, weights_path):
        if not p.exists():
            raise FileNotFoundError(f"Pipeline output not found: {p}. Run the pipeline first.")

    curves_df  = pd.read_csv(curves_path,  parse_dates=["date"], index_col="date")
    summary_df = pd.read_csv(summary_path)
    weights_df = pd.read_csv(weights_path, parse_dates=["date"], index_col="date")

    # Derive default tickers from prices columns (same logic as filePortfolioApi)
    default_tickers = cfg.TICKERS
    if prices_path.exists():
        try:
            prices_df     = pd.read_csv(prices_path, index_col=0, nrows=1)
            default_tickers = [c for c in prices_df.columns if c.lower() != "date"]
        except Exception:
            pass

    state = get_pipeline_state()
    active_tickers = state.get("tickers") or default_tickers

    ticker_config = TickerConfig(
        defaultTickers=default_tickers,
        activeTickers=active_tickers,
        persistedLocally=False,
        note="Tickers are persisted server-side in pipeline_state.json.",
    )

    backtest_series = _build_backtest_series(curves_df)
    perf_rows       = _build_performance_rows(summary_df)
    weight_history  = _build_weight_history(weights_df)
    latest_weights  = LatestWeightsSnapshot(
        date=str(weights_df.index[-1])[:10],
        allocations=weight_history[-1].allocations if weight_history else [],
    )
    summary = _build_summary(perf_rows, backtest_series, latest_weights)

    return PortfolioDashboardData(
        adapter=AdapterDescriptor(
            mode="http",
            label="HTTP Adapter",
            detail="Live data from FastAPI backend.",
        ),
        summary=summary,
        performanceRows=perf_rows,
        backtestSeries=backtest_series,
        latestWeights=latest_weights,
        weightHistory=weight_history,
        tickerConfig=ticker_config,
    )


# ── pipeline background thread ───────────────────────────────────────────────

def _run_pipeline_thread(tickers: list[str], start_date: str) -> None:
    """Runs each pipeline stage sequentially, updating state as it goes."""
    update_pipeline_state(
        status="running",
        stage="Starting",
        progress=0,
        startedAt=datetime.now(timezone.utc).isoformat(),
        completedAt=None,
        error=None,
        tickers=tickers,
        startDate=start_date,
        message=f"Pipeline started for {len(tickers)} tickers from {start_date}.",
    )
    try:
        from ml_optimisation.data_fetch import download_price_data
        from ml_optimisation.preprocess import main as make_features
        from ml_optimisation.models_sklearn import main as train_models
        from ml_optimisation.portfolio import main as get_weights
        from ml_optimisation.backtest import main as run_backtest
        from ml_optimisation.plot_backtest_curves import main as plot_curves

        update_pipeline_state(stage="Downloading price data", progress=5, message="Fetching prices from yfinance…")
        download_price_data(tickers=tickers, start_date=start_date)
        update_pipeline_state(progress=10)

        update_pipeline_state(stage="Engineering features", progress=15, message="Computing returns, lags and rolling statistics…")
        make_features(tickers=tickers)
        update_pipeline_state(progress=30)

        update_pipeline_state(stage="Training volatility models", progress=35, message="Training Ridge and Random Forest models…")
        train_models()
        update_pipeline_state(progress=50)

        update_pipeline_state(stage="Computing portfolio weights", progress=55, message="Running minimum-variance optimisation…")
        get_weights()
        update_pipeline_state(progress=70)

        update_pipeline_state(stage="Running walk-forward backtest", progress=75, message="Simulating portfolio vs benchmarks…")
        run_backtest()
        update_pipeline_state(progress=90)

        update_pipeline_state(stage="Plotting equity curves", progress=93, message="Saving equity curve chart…")
        plot_curves()

        update_pipeline_state(
            status="success",
            stage="Complete",
            progress=100,
            message="Pipeline completed successfully. Dashboard is ready.",
            completedAt=datetime.now(timezone.utc).isoformat(),
            error=None,
        )

    except Exception as exc:
        update_pipeline_state(
            status="error",
            stage="Failed",
            progress=0,
            message="Pipeline failed. See the error field for details.",
            completedAt=datetime.now(timezone.utc).isoformat(),
            error=str(exc),
        )


# ── FastAPI app ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(_app):
    # Reset any stale 'running' state left over from a previous server crash
    state = _load_state()
    if state.get("status") == "running":
        update_pipeline_state(
            status="idle",
            stage="",
            progress=0,
            message="Previous run was interrupted (server restarted). Run again to continue.",
            completedAt=None,
            error=None,
        )
    yield  # server runs here


app = FastAPI(title="Portfolio Optimiser API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/portfolio/dashboard", response_model=PortfolioDashboardData)
def get_dashboard():
    try:
        return _load_dashboard_data()
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.post("/api/portfolio/run", status_code=202, response_model=ActionMessage)
def run_pipeline(body: RunRequest):
    if not body.tickers:
        raise HTTPException(status_code=422, detail="tickers list must not be empty")

    acquired = _pipeline_lock.acquire(blocking=False)
    if not acquired:
        return ActionMessage(
            status="warning",
            title="Pipeline already running",
            message="A pipeline run is already in progress. Check /api/portfolio/status for updates.",
            timestamp=datetime.now(timezone.utc).isoformat(),
        )

    def _release_and_run():
        try:
            _run_pipeline_thread(body.tickers, body.startDate)
        finally:
            _pipeline_lock.release()

    threading.Thread(target=_release_and_run, daemon=True).start()

    return ActionMessage(
        status="success",
        title="Pipeline started",
        message=f"Running optimisation for {len(body.tickers)} tickers from {body.startDate}.",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.get("/api/portfolio/status", response_model=PipelineStatus)
def get_status():
    state = get_pipeline_state()
    return PipelineStatus(
        status=state.get("status", "idle"),
        stage=state.get("stage", ""),
        progress=state.get("progress", 0),
        message=state.get("message", ""),
        startedAt=state.get("startedAt"),
        completedAt=state.get("completedAt"),
        error=state.get("error"),
    )


@app.put("/api/portfolio/tickers", response_model=TickerMutationResult)
def save_tickers(body: dict):
    tickers = body.get("tickers", [])
    if not tickers:
        raise HTTPException(status_code=422, detail="tickers list must not be empty")
    update_pipeline_state(tickers=tickers)
    ticker_config = TickerConfig(
        defaultTickers=cfg.TICKERS,
        activeTickers=tickers,
        persistedLocally=False,
        note="Tickers persisted server-side.",
    )
    return TickerMutationResult(
        tickerConfig=ticker_config,
        action=ActionMessage(
            status="success",
            title="Tickers saved",
            message=f"Saved {len(tickers)} tickers. Re-run the pipeline to apply changes.",
            timestamp=datetime.now(timezone.utc).isoformat(),
        ),
    )


@app.delete("/api/portfolio/tickers", response_model=TickerMutationResult)
def reset_tickers():
    update_pipeline_state(tickers=cfg.TICKERS, startDate=cfg.START_DATE)
    ticker_config = TickerConfig(
        defaultTickers=cfg.TICKERS,
        activeTickers=cfg.TICKERS,
        persistedLocally=False,
        note="Reset to config.py defaults.",
    )
    return TickerMutationResult(
        tickerConfig=ticker_config,
        action=ActionMessage(
            status="success",
            title="Tickers reset",
            message="Active tickers restored to the defaults in config.py.",
            timestamp=datetime.now(timezone.utc).isoformat(),
        ),
    )


@app.get("/api/portfolio/weights/latest", response_model=WeightsRefreshResult)
def get_latest_weights():
    try:
        data = _load_dashboard_data()
        return WeightsRefreshResult(
            latestWeights=data.latestWeights,
            weightHistory=data.weightHistory,
            action=ActionMessage(
                status="success",
                title="Weights refreshed",
                message="Loaded latest rebalance weights.",
                timestamp=datetime.now(timezone.utc).isoformat(),
            ),
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@app.get("/api/portfolio/backtest", response_model=BacktestRefreshResult)
def get_backtest():
    try:
        data = _load_dashboard_data()
        return BacktestRefreshResult(
            backtestSeries=data.backtestSeries,
            performanceRows=data.performanceRows,
            summary=data.summary,
            action=ActionMessage(
                status="success",
                title="Backtest data refreshed",
                message="Loaded latest backtest curves and summary.",
                timestamp=datetime.now(timezone.utc).isoformat(),
            ),
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


if __name__ == "__main__":
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=False)
