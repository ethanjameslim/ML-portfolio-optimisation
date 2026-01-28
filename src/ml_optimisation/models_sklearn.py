import pandas as pd
import numpy as np

from sklearn.linear_model import Ridge
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error
from sklearn.preprocessing import StandardScaler

import joblib
import os

"""
Train size: 5,614
Val size:   2,406

Baseline (rolling vol) performance:
  RMSE: 0.000991
  MAE:  0.000449

Ridge performance:
  RMSE: 0.001340
  MAE:  0.000640

Saved:
  models/ridge_vol_model.pkl
  models/ridge_scaler.pkl

RandomForest performance:
  RMSE: 0.001358
  MAE:  0.000625

This data shows that our models work well for the features we have used and shows that the signal is mostly linear and low dimensional. 
However, the baseline rolling volitility outperforms the ML models, highlighting the strength of classical volatility estimators and the 
importance of proper baselines in financial ML.

I benchmarked Ridge and Random Forest volatility forecasts against a rolling-volatility baseline and found that the baseline achieved lower RMSE and MAE,
consistent with volatility persistence in financial time series. I therefore used the baseline estimator in the portfolio optimisation stage and retained 
ML models as experimental comparisons
"""

FEATURES_PATH = "data/processed/features.csv"
TARGET_COL = "target_vol"


def load_data():
    df = pd.read_csv(FEATURES_PATH, parse_dates=["date"])

    # Drop non-numeric / ID columns
    X = df.drop(columns=["date", "ticker", TARGET_COL])
    y = df[TARGET_COL]

    return df, X, y


def time_split(df, X, y, train_frac=0.7):
    # Sort by date
    order = np.argsort(df["date"].values)
    df = df.iloc[order]
    X = X.iloc[order]
    y = y.iloc[order]

    split_idx = int(len(df) * train_frac)

    X_train = X.iloc[:split_idx]
    y_train = y.iloc[:split_idx]
    X_val = X.iloc[split_idx:]
    y_val = y.iloc[split_idx:]

    return X_train, X_val, y_train, y_val, split_idx


def evaluate(y_true, y_pred, name="model"):
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mae = mean_absolute_error(y_true, y_pred)

    print(f"\n{name} performance:")
    print(f"  RMSE: {rmse:.6f}")
    print(f"  MAE:  {mae:.6f}")

    return rmse, mae


def train_ridge(X_train, y_train, X_val, y_val):
    scaler = StandardScaler()

    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)

    model = Ridge(alpha=1.0)
    model.fit(X_train_scaled, y_train)

    y_pred = model.predict(X_val_scaled)

    evaluate(y_val, y_pred, name="Ridge")

    # Save Model
    os.makedirs("models", exist_ok=True)

    joblib.dump(model, "models/ridge_vol_model.pkl")
    joblib.dump(scaler, "models/ridge_scaler.pkl")

    print("\nSaved:")
    print("  models/ridge_vol_model.pkl")
    print("  models/ridge_scaler.pkl")

    return model, scaler


def train_random_forest(X_train, y_train, X_val, y_val):
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=6,
        random_state=42,
        n_jobs=-1,
    )

    model.fit(X_train, y_train)
    y_pred = model.predict(X_val)

    evaluate(y_val, y_pred, name="RandomForest")

    return model


def evaluate_baseline(df, split_idx):
    # Baseline: predict tomorrow vol = today's rolling 20-day vol
    y_true = df.iloc[split_idx:]["target_vol"]
    y_pred = df.iloc[split_idx:]["roll_std_20"]

    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mae = mean_absolute_error(y_true, y_pred)

    print("\nBaseline (rolling vol) performance:")
    print(f"  RMSE: {rmse:.6f}")
    print(f"  MAE:  {mae:.6f}")

    return rmse, mae


def main():
    df, X, y = load_data()
    X_train, X_val, y_train, y_val, split_idx = time_split(df, X, y)

    print(f"Train size: {len(X_train):,}")
    print(f"Val size:   {len(X_val):,}")

    evaluate_baseline(df, split_idx)
    ridge_model, ridge_scaler = train_ridge(X_train, y_train, X_val, y_val)
    rf_model = train_random_forest(X_train, y_train, X_val, y_val)


if __name__ == "__main__":
    main()
