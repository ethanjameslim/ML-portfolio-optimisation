import os
import pandas as pd
import matplotlib.pyplot as plt

CURVES_PATH = "data/processed/backtest_curves.csv"
OUT_PATH = "data/processed/equity_curve.png"


def main():

    df = pd.read_csv(CURVES_PATH, parse_dates=["date"], index_col="date")

    plt.figure(figsize=(12, 6))

    plt.plot(df["strategy_equity"], label="Dynamic MinVar", linewidth=2)
    plt.plot(df["static_minvar_equity"], label="Static MinVar", linestyle="--")
    plt.plot(df["equal_weight_equity"], label="Equal Weight")
    plt.plot(df["spy_equity"], label="SPY")

    plt.title("Portfolio Equity Curves")
    plt.xlabel("Date")
    plt.ylabel("Growth of $1")
    plt.legend()
    plt.grid(alpha=0.3)

    # Start y-axis at 1 so the visual is not misleading
    plt.ylim(bottom=1)

    # Ensure directory exists
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)

    # Save image
    plt.savefig(OUT_PATH, dpi=300, bbox_inches="tight")

    print(f"Saved equity curve to: {OUT_PATH}")

    plt.close()


if __name__ == "__main__":
    main()