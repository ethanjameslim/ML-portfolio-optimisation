import os
import numpy as np
import pandas as pd

# ============================================================
# SETTINGS
# ============================================================

# Where the raw prices CSV is saved
RAW_PATH = "data/raw/prices.csv"

# Where we will save the processed ML dataset
OUT_PATH = "data/processed/features.csv"

# Stocks / ETFs we are using
TICKERS = ["AAPL", "MSFT", "GOOG", "SPY"]

# How many past days of returns we use as features
LAGS = [1, 2, 5]

# Rolling windows (in days) for mean / volatility features
ROLL_WINDOWS = [5, 20]

# Window size (in days) for the volatility target
TARGET_VOL_WINDOW = 20


def main():

    # index_col=0: first column (Date) becomes the index
    # parse_dates=True: convert strings to datetime objects
    prices = pd.read_csv(RAW_PATH, index_col=0, parse_dates=True)

    # Make sure dates are in correct time order
    prices = prices.sort_index()

    prices = prices[TICKERS]

    # rows = dates
    # columns = AAPL, MSFT, GOOG, SPY
    # values = adjusted closing prices

    # Daily return = (price_today / price_yesterday) - 1
    # This gives percentage change per day
    returns = prices.pct_change()

    # We will build features for each ticker separately,
    # then combine them into one big dataset
    rows = []

    for ticker in TICKERS:

        # Take the return series for one ticker
        r = returns[ticker].rename("ret").to_frame()


        # ----------------------------------------------------
        # LAG FEATURES (PAST RETURNS)
        # ----------------------------------------------------

        for k in LAGS:
            r[f"ret_lag_{k}"] = r["ret"].shift(k)

        # ----------------------------------------------------
        # ROLLING FEATURES (RECENT AVERAGE + VOLATILITY)
        # ----------------------------------------------------

        for w in ROLL_WINDOWS:
            r[f"roll_mean_{w}"] = r["ret"].rolling(w).mean()
            r[f"roll_std_{w}"] = r["ret"].rolling(w).std()


        # ----------------------------------------------------
        # TARGET: TOMORROW'S VOLATILITY
        # ----------------------------------------------------

        r["target_vol"] = (
            r["ret"]
            .rolling(TARGET_VOL_WINDOW)
            .std()
            .shift(-1)
        )


        # So we know which stock each row belongs to
        r["ticker"] = ticker

        # Name the index column
        r.index.name = "date"

        rows.append(r)

    # Stack all ticker tables into one big table
    df = pd.concat(rows)

    # Remove rows with missing values
    df = df.dropna()

    # Create the folder if it doesn’t exist
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

    # Save to CSV
    df.to_csv(OUT_PATH)

    print(f"Saved {len(df):,} rows to {OUT_PATH}")


# ============================================================
# RUN THE SCRIPT
# ============================================================

if __name__ == "__main__":
    main()