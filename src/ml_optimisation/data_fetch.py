import os
import yfinance as yf
import pandas as pd
from config import TICKERS, START_DATE, END_DATE, DATA_DIR

# Module for fetching raw price data from yfinance



def download_price_data(tickers=None, start_date=None, end_date=None):
    """
    Download adjusted close prices for selected tickers
    and save to data/raw/prices.csv.

    Parameters override config defaults when provided.
    """
    _tickers    = tickers    if tickers    is not None else TICKERS
    _start_date = start_date if start_date is not None else START_DATE
    _end_date   = end_date   if end_date   is not None else END_DATE

    os.makedirs(DATA_DIR, exist_ok=True)

    print(f"Downloading data for {_tickers} from {_start_date}...")

    data = yf.download(
        _tickers,
        start=_start_date,
        end=_end_date,
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