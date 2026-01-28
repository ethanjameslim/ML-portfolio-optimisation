
TICKERS = ["AAPL", "MSFT", "GOOG", "SPY", "TLT", "GLD", "VNQ", "IWM"]
START_DATE = "2018-01-01"
END_DATE = None          # None = today

DATA_DIR = "data/raw"

RISK_FREE_RATE = 0.02    # annual

# Feature engineering
LAGS = [1, 2, 5]
ROLL_WINDOWS = [5, 20]

# Paths
RAW_PATH = f"{DATA_DIR}/prices.csv"
FEATURES_PATH = "data/processed/features.csv"
OUT_WEIGHTS_PATH = "data/processed/weights_minvar.csv"

# Optimiser
CORR_WINDOW = 60
REBALANCE_EVERY = 5
TARGET_VOL_WINDOW = 20