# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A volatility forecasting and risk-based portfolio optimization system. The Python backend runs an ML pipeline to forecast volatility, construct covariance matrices, and perform walk-forward backtesting. The React frontend visualizes the pre-computed results from CSV outputs.

**Core insight from backtest**: The rolling-volatility baseline outperformed Ridge/RF ML models (RMSE 0.000991 vs 0.001340), consistent with volatility clustering behavior.

## Commands

### Python Backend

```bash
# Run the full pipeline (all steps in order)
python scripts/run_pipeline.py

# Run individual steps
python scripts/download_data.py   # Fetch prices via yfinance → data/raw/prices.csv
python scripts/make_features.py   # Engineer features → data/processed/features.csv
python scripts/train_models.py    # Train Ridge + RF models → models/*.pkl
python scripts/get_weights.py     # Compute min-variance weights → data/processed/weights_minvar.csv
python scripts/run_backtest.py    # Walk-forward backtest → data/processed/backtest_curves.csv
python scripts/plot_curves.py     # Render equity curve → data/processed/equity_curve.png
```

### Frontend

```bash
cd frontend
npm install        # Install dependencies
npm run dev        # Start Vite dev server
npm run build      # Build to frontend/dist/
npm run preview    # Preview production build
```

## Architecture

### Python Pipeline (`src/ml_optimisation/`)

The pipeline flows through these modules in order:

1. **`data_fetch.py`** — Downloads adjusted close prices via `yfinance` for tickers in `src/config.py`
2. **`preprocess.py`** — Engineers features: return lags [1,2,5] + rolling stats over windows [5,20]
3. **`models_sklearn.py`** — Trains Ridge regression and Random Forest; evaluates against a rolling-vol baseline
4. **`portfolio.py`** — `min_variance_weights()`: constructs Σ_ij = σ_i × σ_j × ρ_ij and solves long-only minimum-variance optimization
5. **`backtest.py`** — Walk-forward backtest, rebalancing every 5 days; computes Sharpe, max drawdown, annualized return/vol
6. **`plot_backtest_curves.py`** — Matplotlib visualization of equity curves

All configuration (tickers, date range, windows, rebalance frequency, risk-free rate) lives in **`src/config.py`**.

### Frontend (`frontend/src/`)

- **Adapter pattern** for data access: `services/portfolioApi.ts` selects between `filePortfolioApi` (reads CSVs from `data/processed/` via Vite's publicDir) and `httpPortfolioApi` (HTTP backend, not yet implemented). Controlled by `VITE_PORTFOLIO_API_MODE` env var.
- **Single page**: `pages/PortfolioDashboardPage.tsx` renders the full dashboard; state managed by `hooks/usePortfolioDashboard.ts`
- **Charts** (Recharts): equity curve, drawdown, rolling risk, weights bar/donut
- **`utils/analytics.ts`** computes drawdown, volatility, and Sharpe ratio client-side from the CSV data
- Vite's `publicDir` is set to `../data` so the dev server can serve `data/processed/*.csv` directly

### Data Flow

```
yfinance → data/raw/prices.csv
         → data/processed/features.csv
         → models/ridge_*.pkl
         → data/processed/weights_minvar.csv
         → data/processed/backtest_curves.csv  ←── frontend reads this
         → data/processed/backtest_summary.csv ←── frontend reads this
```

There is no live backend API — the frontend is a static dashboard over pre-computed CSV outputs.

## README Update Rules

### ✅ DO update these sections when relevant code changes are merged:

- **Repository structure** – if new scripts, modules, or data files are added/removed/renamed
- **Model performance snapshot** – if train_models.py or evaluation logic changes and new metrics are logged
- **How to run** – if new scripts are added or the run order changes
- **Configuration** – if new config parameters are added to config.py
- **Limitations and future work** – if a listed item gets implemented, remove it from the list
- **Requirements / dependencies** – if requirements.txt changes significantly

### 🚫 DO NOT modify these sections:

- **Core concepts** (Prices vs returns, Volatility, Feature engineering, etc.) – these are intentional learning notes and should remain unchanged unless the underlying logic actually changes
- **Equity curve image reference** – do not change the image path or caption
- **Mathematical notation / LaTeX blocks** – only update if the formula itself changes in the code
- **Summary paragraph** – only rewrite if the overall strategy changes fundamentally
- **Walk-forward backtesting explanation** – stable educational content, leave unless logic changes

---

## Tone & Style

- Concise and technical — no marketing language
- Use code blocks for any new examples (Python, bash)
- Match existing heading depth and formatting style
- Preserve the casual/personal voice in the learning notes sections
- Do not add new top-level (##) sections without a strong reason

---

## When in Doubt

If the change is purely internal (refactoring, renaming internals, fixing bugs with no
behaviour change), make no README changes. Only update when something observable
from the outside changes — new features, changed metrics, new files, new usage steps.
EOF