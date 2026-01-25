import os
import yfinance as yf
import pandas as pd
from .config import TICKERS, START_DATE, END_DATE, DATA_DIR


def download_price_data():
    """
    Download adjusted close prices for selected tickers
    and save to data/raw/prices.csv
    """
    os.makedirs(DATA_DIR, exist_ok=True)

    print(f"Downloading data for {TICKERS} from {START_DATE}...")

    data = yf.download(
        TICKERS,
        start=START_DATE,
        end=END_DATE,
        auto_adjust=True,
        progress=False
    )

    # We only keep adjusted close prices
    prices = data["Close"]

    path = os.path.join(DATA_DIR, "prices.csv")
    prices.to_csv(path)

    print(f"Saved price data to {path}")
    return prices


if __name__ == "__main__":
    download_price_data()