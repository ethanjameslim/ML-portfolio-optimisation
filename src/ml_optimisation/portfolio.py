import os
import numpy as np
import pandas as pd
from scipy.optimize import minimize
import config

FEATURES_PATH = config.FEATURES_PATH
OUT_WEIGHTS_PATH = config.OUT_WEIGHTS_PATH
CORR_WINDOW = config.CORR_WINDOW
REBALANCE_EVERY = config.REBALANCE_EVERY

# Helpers
def min_variance_weights(cov, date=None, w_start=None):
    """
    Long-only (w_i > 0) min-variance weights with SLSQP.
    Returns w_start (or equal weights) on failure.
    """

    cov = np.asarray(cov, dtype=float)

    # A true covariance matrix should be symmetric, but estimates can be slightly asymmetric due to numeric noise or how we constructed it.
    # the variance formula assumes symmetry, and the gradient we provide later assumes symmetry too.
    cov = 0.5 * (cov + cov.T)

    # n = number of assets
    n = cov.shape[0]
    # Initial weights, Equal weights if no w_start
    w0 = np.ones(n) / n if w_start is None else np.asarray(w_start, dtype=float)

    #If cov isn’t n x n or contains NaN/Inf, it prints a debug message and returns the fallback w0.
    if cov.shape != (n, n) or (not np.isfinite(cov).all()):
        print(f"[{date}] Bad cov: shape={cov.shape}, finite={np.isfinite(cov).all()} -> fallback")
        return w0

    #f(w) = w^⊤Σw = portfolio variance
    def objective(w):
        return float(w @ cov @ w)

    # Gradient: ∇𝑓(𝑤)=2Σ𝑤 (this is correct when Σ is symmetric)
    def grad(w):
        return 2.0 * (cov @ w)

    # Equality constraint: sum of weights equals 1.
    # Constraint Jacobian is explicitly provided (vector of ones).
    constraints = [{
        "type": "eq",
        "fun": lambda w: np.sum(w) - 1.0,
        "jac": lambda w: np.ones_like(w),
    }]
    # Bounds enforce long-only.
    bounds = [(0.0, 1.0)] * n

    # Passing jac=grad makes it faster/more stable than numerical gradients.
    # maxiter and ftol make it work harder and stop only when improvements are tiny.
    res = minimize(
        objective,
        w0,
        method="SLSQP",
        jac=grad,
        bounds=bounds,
        constraints=constraints,
        options={"maxiter": 500, "ftol": 1e-12, "disp": False},
    )

    # If solver fails or returns NaNs/Infs, fallback.
    if not res.success or (not np.isfinite(res.x).all()):
        print(f"[{date}] SLSQP failed: {res.message} -> fallback")
        return w0
    # Clips tiny numerical violations (like -1e-12).
    # Renormalises to sum to 1 (since solvers can be off by tiny tolerances).
    w = np.clip(res.x, 0.0, 1.0)
    s = w.sum()
    # If weights somehow collapse to all zeros (extreme failure), fallback.
    if s <= 0:
        print(f"[{date}] Weights collapsed -> fallback")
        return w0
    return w / s


def estimate_correlation(returns_window):
    """
    Estimate correlation matrix from a window of past returns.
    """

    # Use pandas .corr() to compute correlation
    corr = returns_window.corr()
    # Convert to numpy array
    corr = corr.to_numpy(dtype=float)

    return corr


def build_covariance(sigmas, corr):
    """
    Build covariance matrix from volatilities and correlation.

    sigmas: array of predicted volatilities (one per asset)
    corr: correlation matrix
    """

    # Build diagonal matrix
    D = np.diag(sigmas)
    # cov = DpD
    cov = D @ corr @ D
    return cov


def main():

    # Loads features.csv into a DataFrame. Makes the date column real datetime objects
    df = pd.read_csv(FEATURES_PATH, parse_dates=["date"])

    #Gets all distinct tickers in the dataset. Sorts them so you have a consistent column order everywhere (important for weights aligning with assets).
    tickers = sorted(df["ticker"].unique())

    # rows = dates, columns = tickers
    returns = df.pivot(index="date", columns="ticker", values="ret").sort_index()
    vol = df.pivot(index="date", columns="ticker", values="roll_std_20").sort_index()

    # Keep only dates where all tickers have data Filters both matrices to the exact same set of “fully populated” dates. 
    # This guarantees that on any date you rebalance, you can compute a full correlation/covariance matrix with no NaNs.
    mask = returns.notna().all(axis=1) & vol.notna().all(axis=1)
    returns = returns.loc[mask]
    vol = vol.loc[mask]

    # Loop through time and compute weights
    weight_rows = []
    weight_dates = []

    for i in range(len(returns)):

        # rebalance every REBALANCE_EVERY days
        if i % REBALANCE_EVERY != 0:
            continue

        # Not enough history yet → use equal weights
        if i < CORR_WINDOW:
            w = np.ones(len(tickers)) / len(tickers)

        else:
            date = returns.index[i]

            # Get predicted volatilities for this date
            sigmas = vol.loc[date, tickers].values

            # Get last CORR_WINDOW days of returns
            window = returns.iloc[i - CORR_WINDOW + 1 : i + 1][tickers]

            corr = estimate_correlation(window)
            cov = build_covariance(sigmas, corr)
            w = min_variance_weights(cov)


        weight_rows.append(w)
        weight_dates.append(returns.index[i])

    # Save weights
    weights_df = pd.DataFrame(weight_rows, index=weight_dates, columns=tickers)
    weights_df.index.name = "date"

    os.makedirs(os.path.dirname(OUT_WEIGHTS_PATH), exist_ok=True)
    weights_df.to_csv(OUT_WEIGHTS_PATH)

    print(f"Saved weights to {OUT_WEIGHTS_PATH}")
    print(weights_df.tail())

if __name__ == "__main__":
    main()