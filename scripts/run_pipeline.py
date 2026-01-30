"""
Master pipeline runner.

Executes the full portfolio workflow in order:

1. Download price data
2. Build features
3. Train volatility models
4. Compute portfolio weights
5. Run backtest
"""

from ml_optimisation.data_fetch import download_price_data
from ml_optimisation.preprocess import main as make_features
from ml_optimisation.models_sklearn import main as train_models
from ml_optimisation.portfolio import main as get_weights
from ml_optimisation.backtest import main as run_backtest
from ml_optimisation.plot_backtest_curves import main as plot_curves


def run_step(name, fn):
    print(f"\n{'='*50}")
    print(f"Running: {name}")
    print(f"{'='*50}")
    fn()
    print(f"Finished: {name}")


def main():

    run_step("Download price data", download_price_data)
    run_step("Build features", make_features)

    # Optional
    run_step("Train models", train_models)

    run_step("Compute portfolio weights", get_weights)
    run_step("Backtest strategy", run_backtest)
    run_step("Plot Equity Curves", plot_curves)

    print("\nPIPELINE COMPLETE")


if __name__ == "__main__":
    main()